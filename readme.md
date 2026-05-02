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

Copy `.env.example` to `.env` and fill in:

```bash
OPENROUTER_API_KEY=
```

The Supabase project URL and publishable key are already included for local hackathon development.
