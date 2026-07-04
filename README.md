# OSCII_MS

OSCII_MS is a frontend-first OSCE/clinical assessment system built with vanilla JavaScript and Webpack. The repository now includes a backend starter under [`backend/`](./backend) for offline LAN use, and the frontend has been wired to it for login, persistence sync, and station result export.

## Project Goal

The app supports three main workflows:

1. Admin management of users, stations, questions, procedure checklists, and results.
2. Student question-based assessments.
3. Moderator/examiner procedure-based assessments.

The backend developer should treat the current frontend as the contract for the data model and user flows.

## Tech Stack

- Vanilla JavaScript ES modules
- Webpack 5
- `html-webpack-plugin`
- `style-loader` and `css-loader`
- `papaparse` for CSV imports
- `notyf` for toast notifications
- Backend starter: Express + PostgreSQL persistence + Node `crypto`

## How The App Starts

- Entry point: [`src/index.js`](./src/index.js)
- HTML template: [`src/template.html`](./src/template.html)
- Webpack config: [`webpack.config.js`](./webpack.config.js)
- Global styles: [`src/style/default.css`](./src/style/default.css)

On load, the app restores stations, users, and results from the backend/local cache, then renders the home page.

## Current Architecture

The app is split into two layers:

- `src/app/`: in-memory data models, API client, and persistence helpers
- `src/dashboard/`: page rendering and user interaction flows

The browser still keeps a local cache for offline resilience, but the backend is the source of truth.

## Data Stores In Use Today

These `localStorage` keys are used as a local cache and fallback:

- `allStations`
- `allUsers`
- `allResults`

Important:

- Data is stored as JSON strings.
- The app hydrates state from the backend first, then falls back to these keys.
- CRUD updates still update the local cache for resilience.
- Passwords are now authenticated by the backend and stored as password hashes in PostgreSQL.

## Backend Starter

Files:

- [`backend/package.json`](./backend/package.json)
- [`backend/src/server.js`](./backend/src/server.js)
- [`backend/src/app.js`](./backend/src/app.js)
- [`backend/src/routes/index.js`](./backend/src/routes/index.js)
- [`backend/src/store/db.js`](./backend/src/store/db.js)

What it does now:

- Starts an Express server on `0.0.0.0:4000` by default
- Seeds a default admin user on first launch if the database is empty
- Exposes `/api/health`, `/api/auth/login`, `/api/users`, `/api/stations`, `/api/results`, and `/api/stations/:id/results.csv`
- Stores data in PostgreSQL
- Serves the built frontend from `dist/` when the build exists

Connection note:

- Put your Postgres connection string in `backend/.env` as `DATABASE_URL=...`
- The backend loads that file automatically if it exists

Default admin credentials for the starter:

- username: `admin`
- password: `admin123`

Change `BOOTSTRAP_ADMIN_PASSWORD` before first launch if you want a different starter password.

## Frontend To Backend Flow

- Student and moderator login now go through the backend.
- Admin access now opens an admin login screen before the dashboard.
- Station changes, item edits, and result snapshots are synced back to the backend.
- The admin result button now downloads CSV from the backend.
- User edits and deletes now hit the backend directly.

## Core Data Models

### User

Defined in [`src/app/users.js`](./src/app/users.js).

Fields:

- `id`
- `surname`
- `firstname`
- `username`
- `password`
- `role`
- `admissionNo`
- `image`

Notes:

- `role` is used for access control in the UI.
- `admissionNo` is only required for students.
- The password is kept private in the class but is still serialized into `localStorage` through `toJSON()`.

### Station

Defined in [`src/app/stationManager.js`](./src/app/stationManager.js).

Fields:

- `id`
- `name`
- `description`
- `procedureItems`
- `questions`
- `procedureTimer`
- `questionTimer`

Notes:

- Stations are keyed by a normalized version of their name.
- `procedureTimer.enabled` and `questionTimer.enabled` control whether timers are used.
- Timer durations are stored in minutes in the UI, then converted to seconds when assessments start.

### Procedure Item

Fields:

- `id`
- `description`
- `scoreOptions`

Notes:

- Each item is a checklist/rubric item for a procedure assessment.
- `scoreOptions` is an array of numeric scoring choices.

### Question

Fields:

- `id`
- `description`
- `options`
- `answer`
- `mark`

Notes:

- Used by the student question flow.
- `answer` is the expected correct option.

### Result

Defined in [`src/app/result.js`](./src/app/result.js).

Fields:

- `id`
- `studentId`
- `stationId`
- `procedureResults`
- `questionResults`
- `procedureTotal`
- `questionTotal`
- `procedurePercentage`
- `questionPercentage`
- `status.procedure`
- `status.question`
- `studentAnswers`
- `currentQuestionIndex`
- `timeRemaining`
- `procedureTimeRemaining`
- `procedureScores`

Notes:

- A single result record tracks both assessment modes for the same student/station pair.
- The result object also stores in-progress timer and answer state.
- Final totals are computed client-side from the captured scores.

## Frontend Flow Map

### Home

Files:

- [`src/dashboard/homePage.js`](./src/dashboard/homePage.js)

Behavior:

- Displays the landing page.
- Routes to Admin Dashboard or Main Menu.

Note: extra layer of security should be used so only the admin can have access to Admin Dashboard

### Main Menu

Files:

- [`src/dashboard/mainMenu.js`](./src/dashboard/mainMenu.js)

Behavior:

- Lists available stations.
- Opens either the procedure login flow or the question login flow for the selected station.

### Login Flow

Files:

- [`src/dashboard/loginPage.js`](./src/dashboard/loginPage.js)

Behavior:

- Authenticates users against the local in-memory user list.
- Blocks unauthorized role/station combinations.
- Routes students to assessment info.
- Routes moderators to the procedure examiner screen.

### Student Question Assessment

Files:

- [`src/dashboard/assessmentInfo.js`](./src/dashboard/assessmentInfo.js)
- [`src/dashboard/studentDashboard.js`](./src/dashboard/studentDashboard.js)

Behavior:

- Shows user and station details before the assessment starts.
- Creates or resumes a result record.
- Runs the question timer if enabled.
- Captures answers in `result.studentAnswers`.
- Scores answers when the student submits or time expires.
- Marks the question assessment as completed.

### Moderator Procedure Assessment

Files:

- [`src/dashboard/procedureAssessmentInfo.js`](./src/dashboard/procedureAssessmentInfo.js)
- [`src/dashboard/examinerDashboard.js`](./src/dashboard/examinerDashboard.js)

Behavior:

- Lets a moderator search for a student by admission number.
- Confirms the selected student before starting.
- Creates or resumes a result record.
- Runs the procedure timer if enabled.
- Captures rubric selections in `result.procedureScores`.
- Scores checklist items when submitted or when time expires.
- Marks the procedure assessment as completed.

### Admin Dashboard

Files:

- [`src/dashboard/adminDashboard.js`](./src/dashboard/adminDashboard.js)

Behavior:

- Create, view, and delete stations.
- Add and edit procedure items.
- Add and edit questions.
- Add, list, and delete users.
- Import users, questions, and procedure items from CSV.
- View station results.

Notes:
for now, the button on station result (download result) is not active.
the download button should be active and be able to download station result in a CSV format

## CSV Import Formats

CSV parsing is handled in [`src/app/csvImporter.js`](./src/app/csvImporter.js).

Expected column shapes:

- Users: `surname, firstname, admissionNo, username, password, role`
- Questions: `description, option1, option2, option3, option4, answer, mark`
- Procedure items: `description, mark`

Notes:

- The first line is treated as a header and skipped.
- Imports re-render the relevant admin view after completion.
- Invalid row lengths are rejected with a toast error.

## Backend Handoff Requirements

The backend should eventually own the following responsibilities:

1. Authentication.
2. Role-based authorization.
3. Station CRUD.
4. Question CRUD.
5. Procedure item CRUD.
6. User CRUD.
7. Result creation, updates, and final submission.
8. CSV import endpoints or bulk-create support.
9. Persistence for all assessment state.
10. Secure password handling.

## Suggested API Shape

The current frontend does not call an API yet, but the backend can be designed around these resources:

- `POST /auth/login`
- `POST /auth/logout` if server-side sessions are used
- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /stations`
- `POST /stations`
- `PATCH /stations/:id`
- `DELETE /stations/:id`
- `POST /stations/:id/questions`
- `PATCH /stations/:id/questions/:questionId`
- `DELETE /stations/:id/questions/:questionId`
- `POST /stations/:id/procedure-items`
- `PATCH /stations/:id/procedure-items/:itemId`
- `DELETE /stations/:id/procedure-items/:itemId`
- `GET /results`
- `POST /results`
- `PATCH /results/:id`
- `GET /results?stationId=...`
- `GET /results?studentId=...&stationId=...`

## Important Backend Notes

- The frontend currently generates IDs with `crypto.randomUUID()`. The backend can keep this or replace it with server-generated IDs.
- Station names are normalized in the current UI before lookup. A backend should prefer ID-based access instead of name-based access.
- Timer countdowns are currently client-driven. If you need tamper-resistant timing, move the authoritative timer state to the backend.
- Result totals are currently computed on the client. The backend should recompute or validate them before accepting a final submission.
- There is no upload validation beyond basic row length checks. Backend import endpoints should validate types and required fields.
- There is no token/session implementation yet. The frontend is only doing local credential checks.
- Procedure scoring currently treats `0` as "not selected" in the UI code path. If zero is a valid rubric score, that logic should be corrected when the backend scoring contract is implemented.

## Known Limitations In The Current Frontend

- Plain-text credentials in `localStorage`.
- No server-side validation.
- No persistent backend storage.
- No audit trail for edits or submissions.
- No concurrency control when multiple clients edit the same station.
- Assessment timing can be manipulated from the browser.

## File Guide For The Backend Developer

- [`src/app/users.js`](./src/app/users.js): user model, login validation, and user CRUD helpers.
- [`src/app/stationManager.js`](./src/app/stationManager.js): station model, procedure/question item helpers, timer settings, and station deletion.
- [`src/app/result.js`](./src/app/result.js): result creation, score collection, and aggregation.
- [`src/app/localStorage.js`](./src/app/localStorage.js): browser persistence wrapper that should be replaced by API calls later.
- [`src/app/csvImporter.js`](./src/app/csvImporter.js): CSV parsing logic and row expectations.
- [`src/dashboard/*.js`](./src/dashboard): all UI flows that consume the data layer.

## Run Scripts

From `package.json`:

- `npm run dev` starts the Webpack dev server.
- `npm run build` creates the production bundle in `dist/`.

## Local Setup

To get the project on your machine:

1. Download or clone the source code from GitHub.
2. Install Node.js on your computer if it is not already installed.
3. Open a terminal in the project directory.
4. Run `npm install` to install all required packages.
5. Run `npm run dev` to start the development server.

If you want the production build instead, run `npm run build`.
