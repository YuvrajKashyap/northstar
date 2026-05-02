# Additional features worth adding

## 1. Agent Trace Replay

Judges should be able to click “View trace” and see exactly how the recommendation happened.

Show:

* Prompt
* Context used
* Tool calls
* Agent handoffs
* Outputs
* Final decision
* Receipt

This makes the system feel real, not like a black-box demo.

---

## 2. Memory Diff

When onboarding updates memory, show a before/after diff.

Example:

> Added: possible 20% withdrawal next year
> Updated: risk comfort from “moderate” to “moderate-cautious”
> Created: house down payment goal

This is excellent for trust.

---

## 3. Context Budget View

Show “what the agent saw.”

Not raw tokens, but a simple panel:

* User goals
* Risk profile
* Account summary
* Portfolio features
* Recent agent findings

This proves the system is context-aware.

---

## 4. Manual “Run My Agents” button

Have a button:

> Run fresh check

It triggers the same pipeline as the 8 AM cron job.

This is demo-friendly because you can show the agent system working live.

---

## 5. Panic Mode

If Maya asks “Should I sell everything?”, CalmVest enters a calm decision mode.

It shows:

* Your plan horizon
* What changed
* What did not change
* What action is actually needed
* Cooling-off recommendation

This hits UX/empathy hard.

---

## 6. Scenario Watchlist

Let users save scenarios:

* Market drops 20%
* Need cash next year
* Inflation stays high
* Job loss
* Buy home sooner

Agents rerun saved scenarios when conditions change.

---

## 7. Recommendation Confidence Decomposition

Instead of one confidence score, show why confidence is high/medium/low.

Example:

* High confidence: liquidity math
* Medium confidence: market shock assumptions
* Low confidence: exact return forecast

This is more honest and more Goldman-friendly.

---

## 8. Agent Permissions

Each agent should have permissions.

Example:

* Research Agent: can read market data
* Tax Agent: can estimate, not execute
* Rebalance Agent: can draft, not trade
* Communication Agent: can message user
* All financial actions require approval

This makes the product look controlled.

---

## 9. Hackathon build priority

Build in this order:

1. Simulated Plaid seed flow
2. Onboarding → `memory.md` + `context_packet.json`
3. Memory Graph Studio
4. Agent Activity rail
5. Scenario Canvas
6. Stress-test/rebalance engine
7. Trust Receipt
8. Daily cron/manual refresh

Cut anything else if time gets tight. The winning proof is:

> **User context becomes memory. Memory powers agents. Agents produce transparent decisions.**

[1]: https://platform.openai.com/docs/guides/agents-sdk/?utm_source=chatgpt.com "Agents SDK | OpenAI API"
[2]: https://openclawdoc.com/docs/agents/overview/?utm_source=chatgpt.com "What Are Agents? | OpenClaw"
[3]: https://plaid.com/docs/sandbox/?utm_source=chatgpt.com "Sandbox - Overview | Plaid Docs"
[4]: https://plaid.com/docs/api/products/investments/?utm_source=chatgpt.com "API - Investments | Plaid Docs"
[5]: https://openai.com/index/introducing-structured-outputs-in-the-api/?utm_source=chatgpt.com "Introducing Structured Outputs in the API | OpenAI"
[6]: https://openai.github.io/openai-agents-js/guides/handoffs?utm_source=chatgpt.com "Handoffs | OpenAI Agents SDK"
[7]: https://platform.openai.com/docs/guides/background?utm_source=chatgpt.com "Background mode | OpenAI API"
[8]: https://platform.openai.com/docs/guides/function-calling/example-use-cases?api-mode=responses&utm_source=chatgpt.com "Function calling - OpenAI API"
[9]: https://openai.github.io/openai-agents-js/guides/guardrails/?utm_source=chatgpt.com "Guardrails | OpenAI Agents SDK"
[10]: https://openai.github.io/openai-agents-js/guides/sessions/?utm_source=chatgpt.com "Sessions | OpenAI Agents SDK"
[11]: https://openai.github.io/openai-agents-js/guides/tracing/?utm_source=chatgpt.com "Tracing | OpenAI Agents SDK"
