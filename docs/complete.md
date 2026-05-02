# Northstar Complete Demo Narrative

Last updated: 2026-05-02

This document is written like an eight-slide PowerPoint deck with expanded speaker notes. Each slide has a short title, the core visual/message, the product story, implementation details, and demo talking points. It captures the full Northstar/CalmVest project direction, the Dexter-inspired agent plan, the code that now exists in this repository, and the demo experience we are trying to show end to end.

The current product name in the repository is still `CalmVest Agent OS` in the README and older docs, but the working product/demo framing has moved toward **Northstar** with one visible local agent named **North**. In the live UI, the important product language is:

- The app is not a generic portfolio dashboard.
- The app is not a chatbot bolted onto charts.
- The app is a memory-first financial agent experience.
- The user goes through onboarding, creates durable `memory.md` and `context_packet.json`, connects or simulates accounts, and then North uses that durable context whenever it answers or runs a demo scenario.
- The best demo proof is: **user context becomes memory, memory powers North, North uses tools, tool runs produce traces, and traces/receipts make the recommendations inspectable.**

---

# Slide 1: The Thesis

## Slide headline

**Northstar turns personal financial context into a working local agent.**

## One-line pitch

Most investing apps show beginners more data. Northstar gives them one calm, context-aware agent that remembers their goals, understands their portfolio, uses specialist tools, and explains what matters before the user takes action.

## What this project is

Northstar is an agent-first wealth management demo for beginner investors and early-career users who do not want to manually interpret every market headline, portfolio chart, tax implication, and account-level tradeoff. The product’s core idea is that good financial guidance depends on more than balances and tickers. It depends on the user’s goals, time horizon, liquidity needs, risk comfort, values, communication preferences, tax context, and household reality.

The product therefore starts with memory, not charts. The user answers a detailed natural-language onboarding questionnaire. The backend compiles those answers into two durable artifacts:

- `memory.md`: a readable, transparent memory document that the user can inspect.
- `context_packet.json`: a compact structured packet that North can reliably load before every run.

The user can then talk to **North**, the single local agent. North loads the user’s memory, context packet, and portfolio snapshot server-side before answering. It can use specialist tools for portfolio context, search/research, market data, financial data, filings, deterministic scenario analysis, and trace/receipt generation.

## What this project is not

Northstar is not trying to be a production brokerage or robo-advisor in the demo. It does not execute trades. It does not move money. It does not pretend that an LLM can predict markets. It is a decision-support and explanation layer. The demo should emphasize that Northstar helps users understand tradeoffs and prepare decisions, while keeping sensitive financial execution under explicit user control.

It is also not a multi-agent theatrical UI anymore. Earlier docs explored a visible agent team: Goal Agent, Scenario Agent, Tax Agent, Rebalance Agent, Research Agent, and Communication Agent. That language was useful architecturally, but it made the product look more complicated than it needed to be. The demo direction has now collapsed that into one visible agent:

> **North using specialist tools.**

Internally, the app can still label tool work as specialist capabilities. But the user experience should feel like ChatGPT/Codex: one input, one transcript, one agent, one trace panel, and clear controls.

## Why the thesis is strong

The biggest wedge is that financial guidance is context-heavy. A simple portfolio dashboard can say a user is 86% equities. It cannot know whether that is good or bad unless it also knows:

- Whether the user needs cash soon.
- Whether the user is saving for a home.
- Whether the account is taxable.
- Whether selling would create a tax bill.
- Whether the user panics during drawdowns.
- Whether the user prefers plain English.
- Whether an emergency fund is underbuilt.
- Whether a recommendation creates stress or complexity.

Northstar’s core product claim is that memory makes every subsequent agent action more useful and safer. The memory file is not a side feature. It is the operating layer.

## Demo line

> “The point is not to show another investing dashboard. The point is to show a financial agent that knows what matters to this person before it ever answers.”

## Current implementation highlights

The repository now supports the key pieces of this thesis:

- A React/Vite frontend with a workspace/onboarding flow.
- An Express backend with typed shared models.
- A simulated account-linking path.
- A full memory questionnaire.
- A markdown sample file at `docs/memory-questionnaire-sample.md`.
- A memory compiler route that creates memory artifacts.
- A graph-first Home page.
- A chat-first North page.
- A memory viewer for `memory.md` and `context_packet.json`.
- Agent run routes with OpenRouter/OpenAI-compatible model usage and deterministic fallbacks.
- Dexter-style traces and tool events.
- A deterministic demo scenario stream.

---

# Slide 2: The Product Loop

## Slide headline

**Onboarding -> Memory -> Portfolio Context -> North -> Tools -> Trace -> Decision**

## Product loop overview

The core Northstar loop is:

1. The user signs in or creates a profile.
2. The user links or simulates financial accounts.
3. The user answers a detailed memory questionnaire.
4. The backend compiles the questionnaire into structured memory.
5. The UI shows the memory graph as the default app home.
6. The user asks North a question or triggers a demo action.
7. North loads the current memory, context packet, and portfolio snapshot.
8. North uses specialist tools when needed.
9. The app streams JSONL-style trace events.
10. The final answer is rendered as markdown.
11. The user can inspect memory, context, tool calls, and receipts.

This loop is the reason the product feels different. It is not “chat first, context later.” It is “context first, chat second.” North does not start as a blank assistant. It starts with a known person and a known financial situation.

## Onboarding as the memory creation moment

The onboarding flow is intentionally detailed. The current sample questionnaire includes 44 natural-language prompts across identity, household, income, cash flow, accounts, assets, liabilities, goals, liquidity needs, risk behavior, taxes, protection, estate planning, values, approvals, boundaries, worries, and open questions.

The current code has now been updated so this questionnaire can be auto-filled from the actual markdown source file:

- Source file: `docs/memory-questionnaire-sample.md`
- Frontend import: raw markdown import with `?raw`
- Parsed by question number.
- Mapped into the questionnaire fields in `WealthWorkspacePage.tsx`.
- Used as the default base for the questionnaire.
- Existing localStorage with blank values no longer wipes the sample.
- The UI includes an `Autofill sample.md` button so the demo can force-repopulate the entire questionnaire.

This matters because demo reliability matters. The presenter should not have to type all 44 answers live. The app should open with rich, realistic answers ready to commit.

## Memory artifacts

The memory commit produces:

- Human-readable `memory.md`.
- Machine-readable `context_packet.json`.
- A memory graph.
- A memory diff.
- Onboarding trace events.

The memory should contain facts like:

- The profile belongs to Kushagra Bharti in the current sample.
- The user prefers direct, practical guidance.
- The user wants reasoning before recommendations.
- The user is early-career and building a durable financial foundation.
- The user wants flexibility for relocation, home buying, career changes, entrepreneurship, and family support.
- The user wants at least six months of core expenses in emergency cash.
- The user may need cash soon for relocation, housing, taxes, family support, or a major purchase.
- The user is willing to take risk for long-term money but not near-term money.
- Tax-sensitive actions require explicit approval.
- The agent should never place trades or move money automatically.

The context packet is the machine-facing version of the same idea. It should be compact, structured, and suitable for every North run.

## Portfolio context

The demo uses simulated Plaid-style account linking rather than production Plaid. That is intentional. The product is showing the integration pattern and downstream agent experience, not trying to pass real account aggregation certification during the demo.

The backend seed flow can create accounts, holdings, tax lots, transactions, Supabase rows, and local mirrors. Those portfolio details become available to North through tools and context-loading functions. The product should explain that production would swap the simulated adapter for real Plaid/Financial Datasets integrations, while preserving the same downstream architecture.

## North run

When a user asks North a question, the backend should preload:

- `memory.md`
- `context_packet.json`
- portfolio snapshot
- tool availability
- demo safety rules

The answer is then generated from that context. This is the technical proof that North has continuity. The UI makes this visible by showing a trace panel, memory access controls, and markdown-rendered final answers.

## Demo line

> “The user’s answers are not trapped in onboarding. They become the operating context for every future run.”

---

# Slide 3: The Interface

## Slide headline

**Graph home, chat-first North, transparent memory.**

## Main UI structure

The app now has a clearer split between the default home view and the agent view:

- `/dashboard`: default Home view with the memory graph.
- `/north`: chat-first North agent view.
- `/workspace/memory`: onboarding memory questionnaire.
- `/memory`: memory document and memory-related surface.
- `/goals`, `/plans`, `/scenarios`, `/insights`, `/agents/workspace`: supporting workspace surfaces.

The navigation was updated so **Home** appears as the default first item and **North** appears as the agent/chat surface. This is important because the product should not open directly into a dense agent dashboard. It should open into the user’s memory graph, then allow the user to ask North or run demo actions.

## Home memory graph

The Home page brings back the memory graph as the default app surface. This was specifically restored because the graph is the best visual representation of the product thesis. The graph shows the user and the memory nodes around them. It makes the demo feel like the agent knows a person, not just a brokerage account.

The graph should communicate:

- The center of the product is the user.
- Financial context is connected, not siloed.
- Goals, risk comfort, tax context, values, account context, cash flow, communication style, and preferences are all part of the same operating memory.
- Agent outputs are grounded in memory nodes.

## North chat-first UI

The old North Star agent-heavy dashboard was simplified. The new direction is closer to ChatGPT/Codex:

- A transcript.
- A bottom input.
- Compact action buttons.
- A trace side panel.
- A memory viewer modal.
- Markdown-rendered answers.

The point is to make the agent experience immediate and understandable. The user should not have to decode multiple agents, cards, drawers, and dashboards before asking a question. North is the visible agent. Specialist functionality appears through tool calls and trace events.

The quick actions in the North surface include:

- Run onboarding again.
- View `memory.md`.
- Run demo scenario.
- Daily market check.

These are the demo controls. They make it possible to present the full system quickly:

- Onboarding creates memory.
- Memory can be inspected.
- Scenario runs show tools/traces.
- Daily market check shows the agent using context and live/fallback data.

## Markdown rendering

Markdown rendering was added across the agent-facing surfaces so North’s answers and memory content look like polished AI outputs instead of raw text blobs.

The current implementation includes:

- `MarkdownRenderer.tsx`
- `14-markdown.css`
- Dashboard/North messages rendered through the markdown renderer.
- Agent rail answers rendered through the markdown renderer.
- Memory page `memory.md` rendered through the markdown renderer.
- Memory modal `memory.md` rendered through the markdown renderer.
- Context packet still shown as JSON in a `pre` block.

This matters for demo quality because North’s answers often include headings, bullet lists, numbered steps, emphasis, and structured reasoning. The UI should make those answers readable.

## Memory transparency

The app includes a memory transparency surface. The user can view:

- `memory.md`
- `context_packet.json`
- updated timestamp where available

This is central to trust. Users should be able to see what the agent remembers and what it loads. It also helps judges understand the architecture. Rather than saying “the agent has memory,” the demo can show the actual memory document and context packet.

## Demo line

> “The default page is the memory graph because the product is about context. The chat page is where North uses that context.”

---

# Slide 4: The Agent Runtime

## Slide headline

**One agent named North, backed by specialist tools and deterministic fallbacks.**

## Why one agent

Earlier planning explored multiple visible agents. That made sense as an architecture sketch, but the demo is stronger with one visible agent:

- Users understand one agent faster.
- The app feels more like ChatGPT/Codex.
- The implementation is simpler.
- The trace panel can still show specialist tool work.
- The product avoids fake “agent team” theater.

The current framing is:

> North is one local financial agent using specialist tools.

The specialist tools can include memory, portfolio, market data, search, filings, deterministic scenario analysis, and receipts. But the user should feel like they are talking to North.

## Dexter-inspired patterns

The project intentionally took the Dexter direction rather than integrating the Codex Rust app-server for this demo. Codex app-server may be interesting long term, especially for local computer control, but it is too large and too architecture-heavy for the immediate demo. Dexter’s useful patterns are smaller and directly applicable:

- TypeScript-first implementation.
- OpenRouter/OpenAI-compatible model gateway.
- Simple tool-call loops.
- JSONL-shaped traces.
- Thin streaming tool events.
- Exa/search style research tools.
- Financial Datasets-style market/financial tools.
- Deterministic fallback data.
- Simple local run primitives.
- Cron/heartbeat shape for scheduled checks.

The current Northstar codebase keeps the existing Express backend and uses Dexter-like patterns where they help the demo.

## Runtime behavior

For every North run, the backend should:

1. Identify the active user.
2. Load raw memory.
3. Load the context packet.
4. Load portfolio context.
5. Build instructions that include the memory and portfolio summary.
6. Run the model with tools available.
7. Stream trace events.
8. Cap live search/research calls.
9. Fall back deterministically if API keys are missing or live calls fail.
10. Return a final markdown answer.

The current code includes a search/research cap so live external research does not spiral during the demo. The plan says live news/search should be capped to three calls per run. If API keys are missing or calls fail, trace events should still show what happened, and the app should return deterministic demo data rather than breaking.

## Tool categories

North’s tool surface is conceptually divided into:

- Memory tools: load memory, write memory, create goals, create values, set communication style, set risk comfort.
- Portfolio tools: get accounts, holdings, transactions, tax lots, portfolio snapshot.
- Research tools: web search, Exa/search, market data, financials, filings.
- Scenario tools: parse scenario, run stress test, compare paths, estimate liquidity gap.
- Receipt tools: create trust receipt, log data used, record confidence and approval status.

The onboarding-specific tool plan includes:

- `create_goal`
- `set_communication_style`
- `set_risk_comfort`
- `create_value`
- `write_memory_markdown`

The intended behavior is that the LLM can call multiple tools in a single onboarding run, including multiple `create_goal` and `create_value` calls. The deterministic fallback should use the same local handlers so the UI always shows realistic results.

## Trace events

The trace event vocabulary was standardized toward Dexter-style JSONL objects. Important event types include:

- `run_started`
- `memory_loaded`
- `model_delta`
- `tool_call`
- `tool_result`
- `receipt_created`
- `run_completed`
- `run_failed`

These events are useful for three reasons:

1. They make the UI feel alive.
2. They let the demo keep working even when live LLM/API behavior changes.
3. They create an audit trail that can become trust receipts.

## Demo line

> “North is one agent. The sophistication is in what it loads, what tools it can use, and what trace it leaves behind.”

---

# Slide 5: Onboarding and Memory

## Slide headline

**The questionnaire creates the memory file that powers the whole app.**

## Questionnaire scope

The full questionnaire is intentionally broad because financial advice needs personal context. The sample covers:

- Identity and household.
- Age or life stage.
- Location and relocation flexibility.
- Dependents and family support.
- Major life events.
- Work and income.
- Income stability.
- Take-home income.
- Spending and fixed bills.
- Savings and investing capacity.
- Current cash buffer.
- Emergency cash target.
- Bank accounts.
- Investment and retirement accounts.
- Employer benefits.
- Real estate goals.
- Debt.
- Credit profile.
- Primary financial goal.
- Target amount.
- Target timeline.
- Secondary goals.
- Goal priority.
- Near-term liquidity needs.
- Non-negotiable tradeoffs.
- Market-drop reaction.
- Risk preference.
- Risk capacity.
- Investing experience.
- Stress behavior.
- Taxable accounts.
- Tax sensitivity.
- Filing context.
- Gains, losses, and concentrated positions.
- Tax-sensitive approval rules.
- Insurance.
- Beneficiaries and estate documents.
- Family support.
- Values.
- Communication style.
- Explicit approval requirements.
- Agent boundaries.
- Worries to monitor.
- Open questions to ask later.

This is a much better demo input than a short signup form. It proves the product can convert messy human context into structured financial memory.

## Current autofill behavior

The questionnaire autofill has now been restored and improved:

- `docs/memory-questionnaire-sample.md` is the content source.
- The frontend imports the markdown file raw.
- The parser reads the numbered questions and bullet answers.
- The parsed answers are mapped to the existing `questionnaireFields` order.
- The sample is used as the default base for new questionnaire state.
- Existing localStorage can override the sample only when values are non-empty.
- Blank/stale stored answers no longer erase the sample.
- The `Autofill sample.md` button forces a complete refill from the markdown sample.

This solves the demo problem where a previously created user or stale blank localStorage could make the questionnaire appear empty.

## Memory compiler

After the questionnaire is filled, the user commits memory. The backend compiles the full natural-language profile into:

- Structured goals.
- Values.
- Risk comfort.
- Communication style.
- Tax context.
- Approval boundaries.
- `memory.md`.
- `context_packet.json`.
- Memory diff.
- Tool events.

The desired onboarding experience is not just “submit a form.” It should look like an agent/tool run:

- The LLM reads all answers.
- The LLM calls structured tools.
- Tool calls create goals, values, risk comfort, communication style, and memory markdown.
- The UI shows trace events.
- The UI shows final structured fields.
- The user can inspect the final `memory.md`.

## Example memory facts from the current sample

Important sample facts include:

- The memory belongs to Kushagra Bharti.
- The user prefers direct, practical guidance.
- The user wants reasoning behind recommendations.
- The user is early-career and building a foundation.
- The user wants a durable system for cash flow, investing, goals, tax awareness, and decision-making.
- The user may relocate, change jobs, buy a home, start a company, or support family.
- Income is reasonably stable but should be modeled conservatively.
- Cash buffer is a first-class planning object.
- Six months of core expenses is an appropriate emergency target.
- A working target of $80,000 is reasonable for a major housing/flexibility goal.
- The user wants to evaluate 3-month, 12-month, 3-year, and 5-year possibilities.
- Safety and flexibility come before long-term compounding and lifestyle upgrades.
- Near-term money should not be put at meaningful market risk.
- The user wants calm, concrete guidance during market drops.
- Long-term money can tolerate volatility; near-term money cannot.
- Tax impact should be part of recommendations involving sales, withdrawals, harvesting, contributions, or asset movement.
- Financial actions, trades, withdrawals, tax-sensitive moves, account changes, and beneficiary changes require explicit approval.
- North should never place trades, move money, sell assets, change beneficiaries, modify account settings, submit tax actions, or contact institutions without approval.

## Demo line

> “The questionnaire is not just onboarding. It is how Northstar creates the operating memory that every later tool call depends on.”

---

# Slide 6: The Demo Scenario

## Slide headline

**North answers market stress questions with memory, tools, and receipts.**

## Central demo question

The hero scenario remains:

> “What if markets drop 20% and I need 20% next year?”

This is the strongest demo because it combines:

- Market risk.
- Liquidity need.
- Goal timeline.
- Behavioral risk.
- Tax awareness.
- Portfolio concentration.
- Plain-English explanation.
- Human approval boundaries.

It also directly uses the user memory. The same portfolio can produce a different answer depending on whether the user needs cash soon, has a short-term home goal, is comfortable with drawdowns, or has taxable-account constraints.

## What North should do

North should not simply answer from intuition. It should:

1. Load memory.
2. Load context packet.
3. Load portfolio snapshot.
4. Translate the user question into scenario assumptions.
5. Run or simulate a stress test.
6. Check liquidity coverage.
7. Check concentration risk.
8. Consider tax implications.
9. Compare possible paths.
10. Produce a markdown answer.
11. Emit trace events.
12. Create a trust receipt.

## Current deterministic scenario

The current repository has a deterministic demo scenario stream. This is important because live LLM/tool behavior can fail during demos due to missing keys, API latency, rate limits, or unpredictable model output. The deterministic path preserves the story:

- Scenario starts.
- Memory/context is loaded.
- Tool calls appear.
- Tool results appear.
- Scenario metrics are returned.
- Receipt event is emitted.
- Run completes.

The demo docs include example numbers:

- Portfolio about $60,688.
- Stressed portfolio about $47,094.
- Stress loss around -22.4%.
- Liquidity gap around $9,988.
- Goal delay around +11 months.

The recommended path is not “sell everything.” The recommendation is to protect near-term cash while preserving long-term growth. The plan comparison should ideally show:

- Do nothing.
- Balanced protection.
- Maximum safety.

The balanced protection path can show:

- Stress loss improves from around -22.4% to around -14.8%.
- Top-three concentration improves from around 48% to around 29%.
- Liquidity coverage improves from around 40% to 100%.

## Scenario Canvas direction

The docs still call for a dedicated Scenario Canvas. The current app has scenario trace and supporting pages, but the ideal visual demo would parse the trace into:

- User prompt.
- Assumptions.
- Data used.
- Tools called.
- Stress result.
- Plan paths.
- Recommended path.
- Receipt.

This is still one of the highest-impact future UI improvements. For now, the North chat and trace panel can carry the demo.

## Daily market check

The North page includes a **Daily market check** action. This action should ask North to get the latest market news, use the user’s memory and portfolio context, and explain what matters for that specific user’s goals and risk comfort. Live news/search calls should be capped. If live APIs are not configured, deterministic fallback data should produce a convincing answer and trace.

The daily run is the bridge from reactive chat to proactive financial monitoring. Longer term, it should become a scheduled cron/heartbeat flow:

1. Pull latest market/macro/news data.
2. Refresh portfolio features.
3. Run lightweight scenario checks.
4. Compare results to memory.
5. Create a daily brief.
6. Surface decision cards only when needed.

## Demo line

> “North is not predicting markets. It is using this person’s memory to decide what a market move actually means for them.”

---

# Slide 7: Trust, Safety, and Inspectability

## Slide headline

**Every recommendation should show what happened, why, and what requires approval.**

## Why trust matters

Financial AI cannot be a black box. Users need to know:

- What data was used.
- Which assumptions were made.
- Which tools were called.
- What the model is uncertain about.
- What the tax impact might be.
- What the user must approve.
- What the agent is not allowed to do.

This is especially important because the target user is a beginner investor. Beginners do not only need optimal outputs. They need understandable outputs that reduce panic and prevent bad decisions under stress.

## Trust receipts

The product direction includes trust receipts for every meaningful agent action. A trust receipt should include:

- What happened.
- Why it happened.
- Data used.
- Tools used.
- Cost estimate.
- Tax impact.
- Confidence.
- Human approval status.
- Before/after impact.
- Trace ID.

The deterministic scenario already emits a `receipt_created` event and attempts receipt persistence. The UI should continue improving toward a dedicated receipt card/panel rather than forcing the presenter to read raw trace rows.

## Agent trace replay

The trace panel and JSONL-style events are the proof layer. They show:

- Run started.
- Memory loaded.
- Model deltas.
- Tool calls.
- Tool results.
- Receipts.
- Run completed or failed.

This is one of the most important Dexter-inspired patterns. It gives the agent run shape and makes the model/tool process visible. It also creates replay/debug value for developers.

## Approval boundaries

The sample memory explicitly says North should never automatically:

- Place trades.
- Move money.
- Sell assets.
- Change beneficiaries.
- Modify account settings.
- Submit tax actions.
- Contact institutions.

North can prepare recommendations, drafts, explanations, and decision cards. Execution stays user-approved. This should be repeated in the demo because it makes the product feel controlled and credible.

## Memory transparency

Memory transparency is a trust feature. Users should not have to guess what North remembers. They can open memory and inspect:

- The human-readable memory markdown.
- The structured context packet.
- The latest generated memory details.

This also helps reviewers understand that the app has real architecture behind it.

## Markdown answer quality

Markdown rendering improves trust because structured answers are easier to audit. North should answer in a format like:

- What matters.
- What changed.
- What did not change.
- Recommended next step.
- Risks.
- Data used.
- What needs approval.

The UI now supports markdown rendering across major agent/memory surfaces.

## Demo line

> “The LLM explains, the tools calculate, the trace proves what happened, and the user stays in control.”

---

# Slide 8: What Exists, What Changed, and What Comes Next

## Slide headline

**The demo now has the right primitives; the next work is packaging the story.**

## What exists now

The current repository includes:

- Vite React frontend.
- Express TypeScript backend.
- Shared TypeScript domain types.
- Supabase-ready structure.
- Simulated Plaid/account linking route.
- Seeded account/holding/transaction/tax-lot data paths.
- Onboarding memory commit route.
- Full natural-language memory questionnaire.
- Markdown questionnaire sample.
- Sample-based questionnaire autofill.
- `memory.md` generation.
- `context_packet.json` generation.
- Memory graph rendering.
- Home page restored as the default graph surface.
- North chat page separated onto `/north`.
- Chat-first transcript UI.
- Bottom input composer.
- Compact quick actions.
- Trace side panel.
- Memory viewer modal.
- Raw memory API.
- Markdown renderer component.
- Markdown styling.
- Agent rail markdown rendering.
- Memory page markdown rendering.
- OpenRouter/OpenAI-compatible agent runner.
- Chat Completions fallback.
- Research/tool call cap.
- Dexter-style trace events.
- Deterministic scenario stream.
- Trust receipt event.
- Build/typecheck passing after recent changes.

## Important recent changes

Recent implementation work included:

1. Markdown rendering was added so North answers and memory output look polished.
2. The Home memory graph page was restored and made the default nav view.
3. `/north` was introduced as the simplified chat-first North agent surface.
4. Multi-agent visible language was reduced in favor of one agent named North.
5. The onboarding questionnaire was wired to `docs/memory-questionnaire-sample.md`.
6. The questionnaire now auto-fills from the markdown sample.
7. A forced `Autofill sample.md` button was added.
8. Stale blank localStorage no longer wipes out sample answers.
9. The project was pulled, rebased, conflict-resolved, committed, and pushed previously.

## What is still partial

The strongest remaining work is presentation polish, not core architecture:

- A first-class Decision Inbox is still partial.
- A dedicated Scenario Canvas is still partial.
- A visual Trust Receipt panel is still partial.
- A scheduled daily cron run is not fully implemented as a durable backend schedule.
- Account-link demo counts should be aligned with the spoken script.
- The demo persona should be made consistent: older docs use Maya Patel, current sample uses Kushagra Bharti.
- Scenario outputs could be made more visual with cards for assumptions, stress result, plan comparison, and receipt.

## Recommended next implementation order

If continuing the build, the highest-impact order is:

1. Add a Decision Inbox panel with one central “Scenario worth reviewing” card.
2. Add a visual receipt card in the North trace panel.
3. Parse deterministic scenario trace into human-friendly cards.
4. Add a dedicated Scenario Canvas route or improve the current scenarios page.
5. Align persona and seed data across docs, sample memory, and backend mirrors.
6. Add a lightweight scheduled daily run record.
7. Add final demo screenshots once the UI stops changing.

## Demo structure

The eight-minute demo should roughly follow:

1. Cold open: most apps show data; Northstar creates memory and uses it.
2. Account link: simulated accounts import portfolio context.
3. Questionnaire: sample answers auto-filled from markdown.
4. Commit memory: backend creates `memory.md`, context packet, diff, and trace.
5. Home graph: memory becomes the default app surface.
6. North chat: ask a contextual financial question.
7. Demo scenario or daily market check: show tools/traces/fallback reliability.
8. Trust close: memory, tools, trace, and approval boundaries make the agent inspectable.

## Final positioning

Northstar should be described as:

> A memory-first local financial agent demo for beginner investors.

The most important product sentence is:

> **Northstar turns a user’s life context and portfolio context into durable memory, then gives them one agent, North, that can use specialist tools to explain what matters and what requires approval.**

The most important technical sentence is:

> **The backend preloads `memory.md`, `context_packet.json`, and portfolio context for every run, streams Dexter-style tool events, and falls back deterministically so the demo remains reliable.**

The most important trust sentence is:

> **North can explain and prepare decisions, but financial execution remains explicit and user-approved.**

## Closing demo line

> “Northstar is not trying to predict the market. It is trying to make financial decisions calmer by making the agent remember the person, use the right tools, and show its work.”
