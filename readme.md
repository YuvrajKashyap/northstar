# Northstar

Northstar is a hackathon-built personal finance agent that turns a user's goals, risk posture, cash needs, and portfolio context into traceable planning guidance. It was designed for a demo setting where determinism matters: the app can show memory loading, tool calls, scenario reasoning, and trust receipts without depending on a perfect live-model run every time.

The project is more than a chat box. It has a 44-question memory compiler, a 7-query memory/context preload path, three runtime modes, tool-backed financial reasoning, JSONL trace logging, and a deterministic demo scenario engineered for repeatable judging.

## Technical Architecture

The repo is a TypeScript workspace:

- `frontend/`: Vite React app for onboarding, memory, goals, dashboard, insights, scenario canvas, plans, and the wealth workspace.
- `backend/`: Express API with Supabase persistence, OpenRouter integration, agent streaming, deterministic fallbacks, and trace storage.
- `shared/`: shared domain types for agent events, context packets, holdings, plans, memory graphs, and onboarding results.
- `scripts/`: Python demo seed generation.
- `supabase/`: project config and migrations.

Northstar has three agent runtime modes:

- `general`: fast Chat Completions path with memory loaded first.
- `fresh_check`: fuller agent run with market/search tools available.
- `demo_scenario`: deterministic scenario run for the market-drop/withdrawal demo.

The agent stack has 6 Northstar tools and 5 deterministic scenario tools, plus 5 onboarding memory-compiler tools. The Northstar tools load memory, load portfolio context, search the web, fetch market data, fetch financials, and read filings. The deterministic scenario tools parse a scenario, run a stress test, estimate tax impact, compare plan paths, and create a trust receipt. The onboarding compiler writes structured memory from the intake flow.

Tracing is dual-write: every agent event is appended locally as JSONL under backend trace storage and also inserted into Supabase `agent_traces`. That makes the demo inspectable even when the live model path falls back. The runtime also includes explicit deterministic fallbacks when OpenRouter keys are missing or a model path returns no usable output.

Prototype boundaries are clear: this is a hackathon product scaffold, not regulated financial advice or an autonomous trading system. The code is built to explain and stage recommendations, not execute trades.

## Setup And Run

Install dependencies and generate the demo seed:

```bash
cd northstar
npm install
npm run seed:demo
```

Copy the environment examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend env:

```env
PORT=8787
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
OPENROUTER_API_KEY=
FINANCIAL_DATASETS_API_KEY=
EXASEARCH_API_KEY=
```

Frontend env:

```env
VITE_API_BASE_URL=http://localhost:8787
```

Run both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:8787`

Supabase is prepared for project `pvwekqquowgmdmknthes`:

```bash
npx supabase login
npx supabase link --project-ref pvwekqquowgmdmknthes
npx supabase db push
```

`npx supabase status` requires Docker Desktop for the local stack. Remote migration push does not need the local stack once the CLI is logged in and linked.
