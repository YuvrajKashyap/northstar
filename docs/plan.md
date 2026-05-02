# 1. Project brief

## Project name

# **CalmVest Agent OS**

## Project description

**CalmVest Agent OS is an agent-first wealth management platform for beginner investors.** It does not behave like a traditional portfolio dashboard. It behaves like a calm financial operating system: the user connects/simulates accounts, answers life-first onboarding questions, and CalmVest turns that into a persistent memory graph that every agent uses.

The core thesis stays the same from the earlier strategy docs: the product should not be “a better dashboard”; it should be a controlled, explainable, scenario-driven system that converts market uncertainty into plain-English decisions. The previous spec already identified the strongest modules: life-aware onboarding, portfolio X-ray, scenario-driven rebalancing, and trust receipts. 

The new framing is sharper:

> **CalmVest is not a chatbot. It is an agentic financial memory system.**

An agent, in the practical product sense, is a model connected to persistent context, tools, state, scheduling, and guardrails. OpenAI’s Agents SDK describes agentic apps as systems where a model can use context and tools, hand off to specialized agents, stream results, and preserve a full trace of what happened. ([OpenAI][1]) OpenClaw’s docs make the chatbot-vs-agent distinction even more explicit: agents maintain state, use tools, execute multi-step workflows, and can act proactively through scheduling or events. ([OpenClaw][2])

So the product should be built as:

> **Onboarding → Memory Graph → Simulated Accounts → Agent Runs → Decision Inbox → Scenario Canvas → Trust Receipts**

Not:

> Dashboard → Chart → Chatbot.

---

## Core product loop

The user signs up and goes through onboarding. For the hackathon, we simulate Plaid rather than actually integrate production Plaid. That is defensible because Plaid’s Sandbox is explicitly meant for app development and testing, supports Plaid Link, and provides test accounts/institutions. ([Plaid][3]) Plaid’s Investments API also maps well to the real version because it exposes holdings and investment transactions endpoints. ([Plaid][4])

For demo purposes, “Connect brokerage” creates **Maya Patel** with seeded holdings, mutual funds, cash, fake transactions, fake tax lots, and fake account metadata. Then the onboarding agent asks life questions and creates structured memory.

The app stores two things:

1. **Human-readable memory**
   `memory.md` or `life.md`, readable in the UI.

2. **Machine-readable context**
   `context_packet.json`, compact and optimized for every LLM/tool call.

The LLM should not receive raw database dumps. It should receive a clean context packet.

Example:

```json
{
  "user": {
    "name": "Maya Patel",
    "age": 24,
    "investor_level": "beginner",
    "communication_style": "plain_english"
  },
  "goals": [
    {
      "type": "home_down_payment",
      "target_amount": 80000,
      "target_date": "2027-12",
      "priority": "high"
    }
  ],
  "risk_profile": {
    "risk_comfort": "moderate",
    "panic_response": "very_worried_at_20pct_drop",
    "liquidity_need": "may_withdraw_20pct_next_year"
  },
  "accounts_summary": {
    "taxable": true,
    "brokerage_count": 2,
    "cash_available": 2000,
    "portfolio_value": 25000
  },
  "portfolio_features": {
    "top3_concentration": 0.48,
    "equity_weight": 0.86,
    "cash_weight": 0.08,
    "growth_tech_overlap": "high",
    "liquidity_coverage": 0.40
  },
  "constraints": {
    "no_auto_trade": true,
    "prefer_tax_aware": true,
    "explain_costs": true
  }
}
```

This packet gets attached to every important agent call.

---

## Feature 1: Simulated Plaid onboarding

The first onboarding step should look like account linking. The user clicks **Connect accounts**, sees a Plaid-like modal, and selects a fake institution. We do not need real Plaid certification for the hackathon. We simulate the flow and create seeded accounts.

The point is not to trick anyone. The point is to show how the real integration would work.

Seeded data should include:

* Brokerage account
* Mutual fund account
* Cash account
* Holdings
* Cost basis / fake tax lots
* Recent transactions
* Account type: taxable
* Monthly contribution estimate
* Cash-flow assumptions

This lets us show real analytics without waiting on live account aggregation.

---

## Feature 2: Life-first onboarding agent

This is the first real “agentic” moment. The onboarding agent asks beginner-friendly questions, then converts answers into structured objects using tool calls.

Questions:

* What are you investing for?
* When might you need this money?
* Could you need to withdraw money in the next 12 months?
* How would you feel if the portfolio dropped 20%?
* Do you have stable income?
* Are these taxable accounts?
* Do you prefer aggressive growth, balance, or stability?
* Do you want plain-English explanations or detailed numbers?
* Are there values we should respect, like sustainability or avoiding complexity?

The LLM then creates structured memory. Use Structured Outputs for reliability because OpenAI’s structured-output feature is designed to force model outputs to match developer-supplied JSON schemas. ([OpenAI][5])

Important implementation point: do **not** rely on unlimited parallel tool calls. If using strict structured outputs, parallel function calls can cause schema issues, so use one batch tool like `commit_onboarding_profile` that writes goals, risk profile, values, accounts, and preferences in one transaction. ([OpenAI][5])

---

## Feature 3: Memory Graph Studio

This is the main UI direction from the latest design. The user does not land on a chart dashboard. They land on a **memory graph**.

The center node is Maya. Around her are cards:

* Goals
* Risk Comfort
* Accounts
* Tax Profile
* Life Events
* Values
* Communication Style
* Cash Flow Pattern

This is the product’s strongest visual metaphor. It says: “Your agents know you, not just your holdings.”

Each memory node is editable, source-backed, and connected to agent actions. For example:

> Scenario Agent used: Risk Comfort + Goals + Accounts
> Tax Agent used: Tax Profile + Holdings + Cost Basis
> Rebalance Agent used: Goals + Liquidity Need + Portfolio Drift

That makes the AI feel concrete.

---

## Feature 4: Agent activity rail

The right side of the app should show live agent work, but not as fake chat.

Agents:

* **Goal Agent** — checks whether goals are still on track.
* **Scenario Agent** — stress-tests market and life events.
* **Tax Agent** — finds tax-loss harvesting or tax-aware withdrawal moves.
* **Rebalance Agent** — detects drift and drafts plans.
* **Research Agent** — reads market/news/macro signals and maps them to holdings.
* **Communication Agent** — explains actions in Maya’s preferred style.

OpenAI’s Agents SDK supports handoffs, where one agent can delegate part of the task to another specialized agent; in the SDK, handoffs are represented as tools. ([OpenAI][6]) That gives us a real architecture for the UI: the app can show “Scenario Agent handed off tax impact to Tax Agent.”

---

## Feature 5: Daily agent run

This is the long-running agent idea.

At 8:00 AM, a scheduled job runs:

1. Pull latest market/macro/news data.
2. Refresh portfolio features.
3. Run lightweight scenario checks.
4. Compare results to Maya’s memory/context.
5. Generate a daily brief.
6. Create decision cards only if action is needed.

This is not a model running forever. It is scheduled jobs + persisted state + tool-using agents. For long model tasks, OpenAI background mode can run tasks asynchronously and be polled later, which is exactly the pattern for deeper agent runs. ([OpenAI][7])

Manual refresh should trigger the same pipeline.

---

## Feature 6: Scenario Canvas

Scenario testing is still the hero feature, but the UI should feel like an agentic canvas, not a dashboard.

User types:

> “What if markets drop 20% and I need 20% next year?”

The system creates:

* Translated assumptions
* Stress-test result
* Do-nothing path
* Recommended path
* Conservative path
* Agent reasoning trace
* Trust receipt

The older demo spec already has the right dramatic scenario: Maya has a $25K portfolio, a house goal in three years, a possible 20% withdrawal next year, and hidden tech/growth concentration. 

---

## Feature 7: Decision Inbox

Do not make users hunt through dashboards. Agents should surface decisions.

Decision Inbox sections:

* **Needs approval**
* **Handled for you**
* **Receipts**
* **Saved ideas**
* **Worth reviewing**

Example cards:

* “Rebalance draft ready”
* “Tax savings found”
* “Scenario worth reviewing”
* “No action needed”
* “Market moved, your plan still works”

This makes the product feel relaxed. The user only sees what requires attention.

---

## Feature 8: Trust receipts

Every agent action produces a receipt.

Receipt fields:

* What happened
* Why it happened
* Data used
* Tools used
* Cost estimate
* Tax impact
* Confidence
* Human approval status
* Before/after impact
* Agent trace ID

This is non-negotiable. Earlier docs already identified the trust receipt as a major differentiator and the transparency moment of the demo. 

---

## Tool calls we should expose

Use these as actual backend tools available to agents.

### Onboarding and memory tools

* `create_user_profile`
* `update_memory_node`
* `create_goal`
* `create_life_event`
* `create_user_value`
* `create_risk_profile`
* `create_tax_profile`
* `set_communication_preferences`
* `commit_onboarding_profile`

### Simulated Plaid / account tools

* `simulate_plaid_link`
* `seed_demo_accounts`
* `get_accounts`
* `get_holdings`
* `get_transactions`
* `get_tax_lots`
* `refresh_account_snapshot`

### Portfolio analytics tools

* `compute_asset_allocation`
* `compute_concentration_risk`
* `compute_fund_overlap`
* `compute_liquidity_coverage`
* `compute_goal_readiness`
* `compute_portfolio_health`
* `compute_behavioral_panic_risk`

### Scenario and stress tools

* `parse_scenario`
* `create_scenario`
* `run_stress_test`
* `run_monte_carlo_projection`
* `compare_plan_paths`
* `estimate_goal_delay`
* `estimate_liquidity_gap`

### Rebalancing and tax tools

* `generate_rebalance_plan`
* `estimate_transaction_costs`
* `estimate_tax_impact`
* `find_tax_loss_harvest`
* `optimize_withdrawal_order`
* `draft_trade_plan`

### Agent orchestration tools

* `start_agent_run`
* `schedule_agent_run`
* `get_agent_status`
* `handoff_to_agent`
* `pause_agent_run`
* `resume_agent_run`
* `write_agent_activity`
* `create_decision_card`

### Trust and governance tools

* `create_trust_receipt`
* `log_tool_call`
* `run_guardrail_check`
* `require_user_approval`
* `mark_action_approved`
* `mark_action_rejected`

OpenAI’s function-calling flow is exactly this pattern: the model requests a tool call, the app executes it, returns the tool output, and the model continues from there. ([OpenAI][8]) Tool guardrails should wrap sensitive actions like `draft_trade_plan`, `estimate_tax_impact`, and `mark_action_approved`; OpenAI’s guardrail docs specifically describe tool guardrails that validate or block custom function-tool calls before or after execution. ([OpenAI][9])

---

## Tech stack

Frontend:

* Vite
* React
* TypeScript
* Tailwind
* shadcn/ui only where useful
* Framer Motion for graph/card transitions
* D3 or React Flow for Memory Graph Studio
* Recharts only for tiny support charts

Backend:

* TypeScript
* Node.js
* Express
* OpenAI Agents SDK TypeScript for orchestration, tools, handoffs, streaming, and traces
* OpenRouter as the primary LLM gateway
* Models: `openai/gpt-5.4-mini`, `openai/gpt-5.4`, and `openai/gpt-5.5`
* Default reasoning: `medium` for every reasoning-model call
* PostgreSQL through Supabase
* Supabase client + SQL migrations instead of Prisma
* Local JSON files for hackathon context/cache/state where that is faster than database work
* Regular cron jobs for daily crawl and manual refresh parity
* Vercel hosting for the frontend when deployment matters
* Alpha Vantage or Finnhub for market/news data
* FRED for macro data
* Simulated Plaid adapter

ML / quant:

* TypeScript analytics service for hackathon speed
* Optional Python script for precomputed XGBoost / clustering model artifacts
* ONNX Runtime in Node if we want to load trained models cleanly
* Deterministic scoring functions for portfolio health, liquidity, concentration, and drift

Agent memory:

* Store durable product data in Supabase Postgres when needed
* Store `context_packet.json` as a local JSON file during the hackathon
* Store user-readable `memory.md` locally and render it in Memory Graph Studio
* Store seed accounts, seeded holdings, saved scenarios, and daily run snapshots as local JSON files first
* Store agent traces and trust receipts as JSONL/JSON locally first, then move to Postgres if time allows
* Use vector search later if needed, but for the hackathon, structured memory is enough

OpenRouter's API is OpenAI-compatible, supports streaming, tool calling, structured outputs, and a normalized `reasoning` parameter, so the backend should keep one LLM adapter that always sends `reasoning: { effort: "medium" }` unless a specific call opts down. The Agents SDK session model supports persistent memory by fetching stored conversation items, prepending them to future turns, and persisting new user/assistant outputs after each run; it can also be backed by custom stores like Redis, DynamoDB, or SQLite. ([OpenAI][10]) Tracing is also built into the SDK and records LLM generations, tool calls, handoffs, guardrails, and custom events, which maps directly to our trust receipt / agent trace UI. ([OpenAI][11]) Agent Trace Replay should be on by default: every run stores prompt/context summary, streamed output chunks, tool calls, handoffs, outputs, final decision, and receipt.

---

## System prompt skeleton

Use this for the orchestrator agent:

```text
You are CalmVest Orchestrator, the control agent for an educational portfolio-management prototype.

You help beginner investors understand risk, goals, scenarios, and tradeoffs in plain English.

You always receive:
1. user memory summary
2. structured context packet
3. current portfolio snapshot
4. available tools
5. safety and approval rules

Rules:
- Never claim certainty about future market returns.
- Never execute or imply execution of real trades.
- Never recommend individual stocks as “good buys.”
- Use tools for all calculations, account data, portfolio analytics, tax estimates, and scenario results.
- If a user describes goals, values, tax facts, or preferences, call the appropriate memory/profile tools.
- If multiple profile objects must be created, prefer one batch commit tool.
- For scenario questions, call parse_scenario, run_stress_test, compare_plan_paths, and create_trust_receipt.
- For recommendations, explain reason, cost, tradeoff, confidence, and approval status.
- Speak at the user’s comprehension level from memory.
- Surface uncertainty clearly.
```

---

