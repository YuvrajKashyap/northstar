# Data provenance

## What is checked in

`backend/src/data/demo-seed.json` is wholly synthetic. It is generated from source code in this repository and contains no scraped user records, bank credentials, real account identifiers, contact data, or production telemetry.

The JSON carries a `provenance` object with its generator path, synthetic label, seed, and as-of date. Account balances, transactions, goals, and preferences are invented for a stable demo narrative.

## Reproduction

```bash
npm run seed:demo
npm run seed:check
```

The first command rewrites the fixture from the canonical parameters. The second compares the generated content to the tracked file and exits non-zero on drift.

Authenticated registrations receive a synthetic variant derived from a stable hash of the Supabase user UUID. The generated file is stored only in ignored local runtime directories before owner-scoped rows are written to Supabase.

## External data modes

The backend can call optional search and financial-data services when keys are present. When they are absent, the tool result says that live retrieval is unavailable and returns a deterministic fixture. A fallback must never be described as current market data.

## Retention and privacy

Local traces, mirrors, generated auth fixtures, `.env` files, and Supabase CLI state are ignored. Public screenshots must show only the synthetic persona. No production data export belongs in this repository.
