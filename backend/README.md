# Backend Starter

This folder is the offline-first backend starter for OSCII_MS.

## What It Gives You

- Express server with LAN-friendly CORS headers
- PostgreSQL persistence via `DATABASE_URL`
- Password hashing with Node `crypto`
- Signed bearer-token auth
- CRUD starter routes for users, stations, results
- CSV export for station results

## Run It

From the repo root:

```bash
npm run backend:dev
```

Or from this folder:

```bash
npm run dev
```

Copy [`.env.example`](./.env.example) to `.env` and set `DATABASE_URL` before starting if your local PostgreSQL settings are different from the default.
If your Postgres server is already running with another username, password, host, or database name, update `DATABASE_URL` accordingly.
If the target database does not exist yet, the backend will try to create it automatically when the credentials have permission to do so.

## Default Login

On first start, the backend seeds one admin account if the database is empty:

- username: `admin`
- password: `admin123`

Set `BOOTSTRAP_ADMIN_PASSWORD` before starting if you want a different password.

## Important For LAN Use

- Bind the server to `0.0.0.0` so other PCs on the ICT-centre network can reach it.
- Set `ALLOWED_ORIGIN` to the frontend host if you do not want wildcard CORS.
- Back up the PostgreSQL database regularly.

## Next Backend Work

- Wire the frontend to `POST /api/auth/login`
- Replace browser `localStorage` state with API calls
- Add edit/delete endpoints for questions and procedure items
- Add result-finalization endpoints so scoring happens server-side
