# CalmVest Demo Gap Map

Last updated: 2026-05-02

## Dexter Reference Surface

Dexter is a TypeScript financial research agent with these reusable patterns:

- OpenRouter/OpenAI-compatible model gateway with model defaults in code.
- Typed streaming agent events for UI progress.
- Tool-call loop with Financial Datasets, Exa search, filings, and market data.
- JSONL scratchpad/traces for replay and debugging.
- Simple cron/heartbeat shape for scheduled work.
- Skill-based workflows such as DCF research.

Do not copy Dexter's CLI/TUI, WhatsApp gateway, filesystem/browser tools, multi-provider routing, Ollama, or broad autonomous research loop into CalmVest. CalmVest needs a narrower, user-memory-first wealth demo.

## Already In Northstar

- Simulated Plaid-style import: `POST /api/demo/simulate-plaid-link` seeds accounts, holdings, tax lots, transactions, Supabase rows, and local mirrors.
- Memory commit: `POST /api/onboarding/commit` compiles onboarding answers into `memory.md`, `context_packet.json`, memory diff, and visible tool events.
- Memory Graph Studio: dashboard graph renders person, goals, risk, accounts, tax, values, cash flow, and communication nodes with "used by" agent metadata.
- Agent stream: `POST /api/agent/run/stream` uses OpenAI Agents SDK through OpenRouter with Chat Completions fallback.
- Dexter-style research tools: `get_memory_context`, `get_portfolio_context`, `web_search`, `get_market_data`, `get_financials`, and `read_filings`.
- Trace mirrors: agent events append to local JSONL and attempt Supabase persistence.
- Demo scenario stream: `POST /api/agent/scenario/stream` now runs the central scenario deterministically, emits tool calls/handoffs, and writes a trust receipt event without requiring an OpenRouter key.
- Env shape matches docs: only backend and frontend env examples are present.

## Demo Storyboard Status

| Demo step | Status | Notes |
| --- | --- | --- |
| Cold open | Ready | Product thesis is clear in docs and landing copy. |
| Simulated account link | Mostly ready | Flow exists. Current seed imports 13 accounts and 72 transactions, while demo script says 3 accounts and 16 transactions. Either update the spoken script or reduce the seed. |
| Agentic onboarding | Ready | Full questionnaire, deterministic fallback, LLM JSON compiler, diff, and tool trace exist. |
| Memory Graph Studio | Ready | Dashboard is graph-first and node details show source/agent usage. |
| Daily agent run | Partial | Manual "Run fresh check" exists. Scheduled/cron backend route is not implemented in this repo. |
| Decision Inbox | Partial | Static agent cards exist, but no first-class inbox sections for "Needs approval", "Receipts", or "Worth reviewing". |
| Scenario Canvas | Partial | Deterministic backend scenario exists and streams traces. The visible frontend still presents it mostly as trace output rather than a dedicated canvas with assumptions, paths, and metrics. |
| Recommended plan | Partial | Deterministic tool returns do-nothing, balanced, and maximum-safety paths. The app needs a dedicated visual comparison. |
| Trust receipt | Partial | Deterministic route emits `receipt_created` and inserts a receipt best-effort. The frontend needs a receipt panel with why/cost/tax/confidence/approval. |
| Architecture close | Ready in docs | The code has the named layers; a final architecture panel would make this easier to present live. |

## Highest-Impact Remaining Work

1. Add a dedicated Decision Inbox panel to the dashboard with the central "Scenario worth reviewing" card and explicit approval status.
2. Add a Scenario Canvas view that parses the deterministic trace into assumptions, stress result, plan paths, and trust receipt.
3. Add a Trust Receipt card to the agent drawer so judges can see data used, tools used, tax impact, confidence, and human approval without reading raw trace rows.
4. Decide whether the demo persona is Maya Patel or Kushagra Bharti. The docs and seed use Maya; workspace questionnaire defaults currently use Kushagra.
5. Align the account-link script with the seed count or adjust the seed to the exact demo numbers.
6. Implement a lightweight scheduled daily-run record if the demo needs to prove cron beyond a manual refresh button.
7. Add browser verification screenshots for `/workspace/connect`, `/workspace/memory`, and `/dashboard` before final demo rehearsal.

