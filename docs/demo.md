# Demo flow

## Demo thesis

> **CalmVest turns onboarding answers and simulated account data into a persistent financial memory graph, then uses agents to monitor, stress-test, and explain only the decisions that matter.**

This is stronger than the old dashboard demo because the “magic” is now the agent system.

---

## 0. Cold open — 15 seconds

Say:

> “Most investing apps show beginners more data. CalmVest gives them an agent team that remembers their life, watches their portfolio, and only interrupts when there is a decision worth making.”

---

## 1. Simulated account link — 25 seconds

Show the fake Plaid flow.

Click:

> Connect accounts

Then:

> Simulated brokerage linked
> 2 accounts found
> 7 holdings imported
> Taxable account detected

This establishes technical feasibility without real Plaid.

---

## 2. Agentic onboarding — 45 seconds

Show Maya answering life questions.

Key answers:

* House down payment in 3 years
* May need 20% next year
* Very worried about a 20% drop
* Taxable account
* Prefers plain English
* Beginner investor

Then show the agent creating structured memory.

Visible tool-call style animation:

* `create_goal`
* `create_risk_profile`
* `create_tax_profile`
* `set_communication_preferences`
* `commit_onboarding_profile`

Demo line:

> “Every answer becomes structured memory. It is not trapped in a chat transcript.”

---

## 3. Memory Graph Studio — 40 seconds

Show the current green UI.

Center: Maya Patel.
Nodes: Goals, Risk Comfort, Accounts, Tax Profile, Values, Cash Flow, Communication Style.

Click a node:

> Risk Comfort: worried by sharp drawdowns
> Used by: Scenario Agent, Rebalance Agent, Communication Agent

Demo line:

> “This is the core interface. The product is built around what the agents know about Maya.”

---

## 4. Daily agent run — 35 seconds

Show Agent Activity.

* Research Agent scanned market/news
* Portfolio Agent detected growth/tech concentration
* Tax Agent checked taxable lots
* Scenario Agent prepared stress test
* Rebalance Agent drafted plan

Demo line:

> “These are long-running agents. They run on schedule, update state, and create decisions only when needed.”

---

## 5. Decision Inbox — 35 seconds

Show one card:

> **Scenario worth reviewing**
> Market drop + withdrawal need may affect house goal.

Click Review.

This avoids dashboard wandering.

---

## 6. Scenario Canvas — 60 seconds

User prompt:

> “What if markets drop 20% and I need 20% next year?”

Show:

* LLM translates assumptions
* Tool call runs stress test
* Quant engine computes impact
* Tax Agent checks lots
* Rebalance Agent drafts plan

Old demo numbers still work:

* Portfolio: $25,000 → $19,400
* Stress loss: -22.4%
* Liquidity gap: $3,000
* Goal delay: +11 months

The previous demo flow already nailed this scenario as the central winning interaction. 

---

## 7. Recommended plan — 45 seconds

Show three paths:

* Do nothing
* Balanced protection
* Maximum safety

Default recommendation:

> Protect near-term cash while preserving long-term growth.

Show impact:

* Stress loss: -22.4% → -14.8%
* Top-3 concentration: 48% → 29%
* Liquidity coverage: 40% → 100%

---

## 8. Trust receipt — 35 seconds

Show receipt:

> Why: Maya may need cash soon.
> Cost: low.
> Tax impact: medium.
> Confidence: high for liquidity, medium for market assumptions.
> Human control: approval required.

Demo line:

> “The LLM explains. The quant engine recommends. The audit layer verifies.”

This line already exists in the earlier architecture reveal and should remain the closing technical line. 

---

## 9. Architecture close — 25 seconds

Show a simple system diagram:

> Simulated Plaid → Memory Graph → Context Packet → Agents → Tools → Quant Engine → Decision Inbox → Trust Receipt

Close with:

> “CalmVest is not predicting markets. It is helping beginners make calmer, context-aware decisions when markets and life change.”

---