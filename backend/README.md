# OSCII_MS Backend

This folder contains the Express and PostgreSQL backend for OSCII_MS.

It is the current source of truth for persistent application data:

- authentication
- users
- stations
- questions
- procedure items
- results
- CSV export for station results

## What It Provides

- Express server with LAN-friendly CORS headers
- Bearer-token authentication
- Password hashing with Node `crypto`
- PostgreSQL persistence via `DATABASE_URL`
- Auto-bootstrap of a default admin account on first launch
- Snapshot endpoints for the frontend hydration flow
- CSV export for a station's assessment results
- Static serving of the built frontend from `dist/` when available

## Installation

From the repository root:

```bash
npm install
```

Then install backend dependencies:

```bash
cd backend
npm install
```

## Configuration

Copy the example env file:

```bash
cp .env.example .env
```

Edit `.env` to match your PostgreSQL setup.

Important variables:

- `PORT` defaults to `4000`
- `HOST` defaults to `0.0.0.0`
- `DATABASE_URL` points to your PostgreSQL instance
- `AUTH_SECRET` signs bearer tokens
- `ALLOWED_ORIGIN` controls CORS
- `BOOTSTRAP_ADMIN_PASSWORD` sets the password for the auto-seeded admin user

The default example points to:

```bash
postgres://postgres:postgres@127.0.0.1:5432/oscii_ms
```

If the database does not exist yet and the PostgreSQL user has permission to create it, the backend will try to create it automatically.

## Run

From the repository root:

```bash
npm run backend:dev
```

Or from this folder:

```bash
npm run dev
```

For a normal start instead of watch mode:

```bash
npm run start
```

## Frontend Integration

- During frontend development, the root Webpack dev server proxies `/api` to `http://127.0.0.1:4000`
- When `dist/` exists, the backend serves the compiled frontend automatically
- The frontend hydrates its app state from `GET /api/bootstrap`

## Authentication

- Login endpoint: `POST /api/auth/login`
- Current user endpoint: `GET /api/auth/me`
- Requests to protected routes must include `Authorization: Bearer <token>`
- Admin-only routes are checked on the backend with role-based guards

The backend stores password hashes in PostgreSQL using this shape:

- `salt`
- `hash`
- `iterations`
- `digest`

## Database Tables

### `users`

Fields include:

- `id`
- `surname`
- `firstname`
- `username`
- `role`
- `admission_no`
- `image`
- `password_hash`
- timestamps

### `stations`

Fields include:

- `id`
- `name`
- `description`
- `procedure_items`
- `questions`
- `question_timer`
- `procedure_timer`
- timestamps

### `results`

Fields include:

- `id`
- `student_id`
- `station_id`
- `procedure_results`
- `question_results`
- `procedure_total`
- `question_total`
- `procedure_percentage`
- `question_percentage`
- `status`
- `student_answers`
- `current_question_index`
- `time_remaining`
- `procedure_time_remaining`
- `procedure_scores`
- timestamps

The `results` table also enforces one result per student/station pair.

## API Summary

All routes are mounted under `/api`.

### Health and Snapshot

- `GET /health`
- `GET /bootstrap`
- `POST /bootstrap`

### Auth

- `POST /auth/login`
- `GET /auth/me`

### Users

- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `POST /users/snapshot`

### Stations

- `GET /stations`
- `POST /stations`
- `GET /stations/:id`
- `PATCH /stations/:id`
- `DELETE /stations/:id`
- `POST /stations/snapshot`

### Questions

- `POST /stations/:id/questions`
- `PATCH /stations/:stationId/questions/:questionId`
- `DELETE /stations/:stationId/questions/:questionId`

### Procedure Items

- `POST /stations/:id/procedure-items`
- `PATCH /stations/:stationId/procedure-items/:itemId`
- `DELETE /stations/:stationId/procedure-items/:itemId`

### Results

- `GET /stations/:id/results`
- `GET /stations/:id/results.csv`
- `POST /results`
- `PATCH /results/:id`

## Default Admin Account

On first launch, if the database is empty, the backend seeds one admin user:

- username: `admin`
- password: `admin123`

Set `BOOTSTRAP_ADMIN_PASSWORD` before first launch if you want a different seed password.

## Notes

- The backend returns sanitized user records without password hashes
- Station and question CRUD is ID-based
- Results are stored and exported per station
- CSV export is generated server-side from the current database state
- The backend is compatible with the frontend's current backend-backed login and persistence flow

