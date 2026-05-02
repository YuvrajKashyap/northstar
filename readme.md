# CalmVest Agent OS

Flat hackathon scaffold for the Goldman Sachs project.

## Structure

- `frontend/` - Vite React app
- `backend/` - Express API, Supabase client, OpenRouter adapter, trace stream
- `shared/` - shared TypeScript domain types
- `scripts/` - Python demo-data generator
- `supabase/` - CLI config and SQL migrations

## Run Locally

```bash
npm install
npm run seed:demo
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:8787`

## Supabase

The repo is prepared for project `pvwekqquowgmdmknthes`.

```bash
npx supabase login
npx supabase link --project-ref pvwekqquowgmdmknthes
npx supabase db push
```

`npx supabase status` requires Docker Desktop for the local stack. Remote migration push does not need the local stack once the CLI is logged in and linked.

## Environment

There are exactly two env example files:

- `backend/.env.example`
- `frontend/.env.example`

Copy each one to `.env` in the same folder.

Backend env is only for runtime values and secrets:

```bash
PORT=8787
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
OPENROUTER_API_KEY=
FINANCIAL_DATASETS_API_KEY=
EXASEARCH_API_KEY=
```

Frontend env is only:

```bash
VITE_API_BASE_URL=http://localhost:8787
```

Model IDs, OpenRouter site metadata, and reasoning effort live in backend code config, not env.
