# OSCII_MS

OSCII_MS is a full-stack OSCE and clinical assessment system.

- Frontend: vanilla JavaScript, Webpack 5, and browser-rendered dashboards
- Backend: Express, PostgreSQL, and token-based authentication
- Use case: manage stations, users, questions, procedure checklists, and assessment results for student and moderator workflows

## What The App Does

- Admins can create and manage users, stations, procedure items, and questions
- Students can take question-based assessments
- Moderators/examiners can run procedure-based assessments
- Results can be viewed and exported as CSV per station
- The frontend hydrates from the backend snapshot on load and keeps the auth token in browser storage

## Project Layout

- [`src/`](./src) contains the frontend application
- [`src/app/`](./src/app) contains the data layer, API client, CSV import helpers, and auth token handling
- [`src/dashboard/`](./src/dashboard) contains the page-level UI flows
- [`backend/`](./backend) contains the Express + PostgreSQL API

## Tech Stack

- JavaScript ES modules
- Webpack 5 and webpack-dev-server
- `html-webpack-plugin`, `html-loader`, `style-loader`, `css-loader`
- `papaparse` for CSV imports
- `notyf` for toast notifications
- Express and PostgreSQL on the backend

## Prerequisites

- Node.js 20 or newer
- PostgreSQL running locally or reachable over the network

## Installation

Install frontend dependencies from the repo root:

```bash
npm install
```

Install backend dependencies separately:

```bash
cd backend
npm install
```

## Environment Setup

Copy the backend example env file and update it for your machine:

```bash
cp backend/.env.example backend/.env
```

Important variables:

- `DATABASE_URL` points to PostgreSQL
- `HOST` controls the backend bind address
- `PORT` defaults to `4000`
- `ALLOWED_ORIGIN` controls CORS
- `AUTH_SECRET` signs bearer tokens
- `BOOTSTRAP_ADMIN_PASSWORD` sets the first admin password if the database is empty

The frontend does not require its own `.env` file for the current setup.

## Running Locally

Open two terminals:

1. Start the backend:

   ```bash
   npm run backend:dev
   ```

2. Start the frontend:

   ```bash
   npm run dev
   ```

Then open the frontend dev server at `http://localhost:your_port`.

The frontend dev server proxies `/api` requests to `http://127.0.0.1:4000`.

## Production-Style Run

If you want the backend to serve the built frontend, build the frontend first:

```bash
npm run build
```

Then start the backend:

```bash
npm run backend:start
```

If `dist/` exists, the backend serves the compiled frontend automatically.

## Application Flow

### Frontend Boot

- [`src/index.js`](./src/index.js) loads the app
- The app hydrates stations, users, and results from `GET /api/bootstrap`
- If the backend is unavailable, the UI falls back to an empty in-memory state

### Authentication

- Login is handled by the backend at `POST /api/auth/login`
- The returned token is stored in browser local storage under `oscii_auth_token`
- Admin access is guarded in the UI and on the backend

### Assessments

- Student assessments use station questions and timed submission when enabled
- Procedure assessments use checklist items and optional timers
- Result totals and percentages are recorded in the backend and exported per station

### Admin Workflows

- Station, question, procedure item, and user changes are sent to the backend API
- CSV imports for users, questions, and procedure items are handled in the frontend and saved through API calls
- Station results can be downloaded as CSV from the backend

## Main Screens

- Home page: [`src/dashboard/homePage.js`](./src/dashboard/homePage.js)
- Station selection: [`src/dashboard/mainMenu.js`](./src/dashboard/mainMenu.js)
- Login: [`src/dashboard/loginPage.js`](./src/dashboard/loginPage.js)
- Student question assessment: [`src/dashboard/assessmentInfo.js`](./src/dashboard/assessmentInfo.js), [`src/dashboard/studentDashboard.js`](./src/dashboard/studentDashboard.js)
- Moderator procedure assessment: [`src/dashboard/procedureAssessmentInfo.js`](./src/dashboard/procedureAssessmentInfo.js), [`src/dashboard/examinerDashboard.js`](./src/dashboard/examinerDashboard.js)
- Admin dashboard: [`src/dashboard/adminDashboard.js`](./src/dashboard/adminDashboard.js)

## Data Model Overview

### Users

- `id`
- `surname`
- `firstname`
- `username`
- `role`
- `admissionNo`
- `image`

### Stations

- `id`
- `name`
- `description`
- `procedureItems`
- `questions`
- `questionTimer`
- `procedureTimer`

### Results

- `id`
- `studentId`
- `stationId`
- `procedureResults`
- `questionResults`
- `procedureTotal`
- `questionTotal`
- `procedurePercentage`
- `questionPercentage`
- `status`
- `studentAnswers`
- `currentQuestionIndex`
- `timeRemaining`
- `procedureTimeRemaining`
- `procedureScores`

## CSV Imports

The admin UI imports CSV data with these shapes:

- Users: `surname, firstname, admissionNo, username, password, role`
- Questions: `description, option1, option2, option3, option4, answer, mark`
- Procedure items: `description, mark`

## Useful Backend Endpoints

- `GET /api/health`
- `GET /api/bootstrap`
- `POST /api/bootstrap`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/stations`
- `POST /api/stations`
- `PATCH /api/stations/:id`
- `DELETE /api/stations/:id`
- `POST /api/stations/:id/questions`
- `PATCH /api/stations/:stationId/questions/:questionId`
- `DELETE /api/stations/:stationId/questions/:questionId`
- `POST /api/stations/:id/procedure-items`
- `PATCH /api/stations/:stationId/procedure-items/:itemId`
- `DELETE /api/stations/:stationId/procedure-items/:itemId`
- `GET /api/stations/:id/results`
- `GET /api/stations/:id/results.csv`
- `POST /api/results`
- `PATCH /api/results/:id`

## Notes

- The backend is the source of truth for persistent data
- Passwords are hashed before storage in PostgreSQL
- The backend seeds a default admin account when the database is empty
- Station names are normalized in the UI, but backend APIs use IDs
- The frontend is still using some legacy in-memory helper names, but current login and persistence flows are backend-backed

