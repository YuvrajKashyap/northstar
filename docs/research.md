# Research notes

Northstar's implementation and product boundaries were checked against primary and official sources.

## Financial-agent safety

- The SEC's [AI and Investment Fraud investor alert](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/artificial-intelligence-fraud) warns that AI-generated investment information may be inaccurate, incomplete, misleading, or fabricated. Northstar therefore labels synthetic/model output, exposes assumptions, and does not present a scenario as a prediction.
- FINRA's [2026 GenAI risk discussion](https://www.finra.org/rules-guidance/guidance/reports/2026-finra-annual-regulatory-oversight-report/gen-ai) identifies autonomy, scope, auditability, data sensitivity, and domain knowledge as material agent risks. Northstar keeps execution out of scope, scopes private rows to the authenticated user, and exposes a tool trace and receipt.
- FINRA's [AI applications report](https://www.finra.org/rules-guidance/key-topics/fintech/report/artificial-intelligence-in-the-securities-industry/ai-apps-in-the-industry) describes cautious use of AI for direct retail recommendations. This repository calls Northstar a prototype and not regulated advice.

## Authentication and data access

- Supabase's [securing your API guidance](https://supabase.com/docs/guides/api/securing-your-api) recommends RLS for tables exposed through the Data API and explains the combined role of grants and policies.
- Supabase's [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) documents `auth.uid()` policies and warns that privileged service keys bypass RLS and must not be exposed. Northstar uses only the publishable key in public configuration and forwards the signed-in user's access token to a request-scoped client.

## Agent implementation

- The OpenAI [Agents SDK quickstart](https://developers.openai.com/api/docs/guides/agents/quickstart) informed the optional server-side agent path.
- OpenAI's [guardrails and approvals guide](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals) distinguishes input/output/tool guardrails from human approval for sensitive tools. Northstar does not claim SDK-enforced trade approval because it has no trade tool; `approval_required` is an application planning state.
- OpenAI's [observability guide](https://developers.openai.com/api/docs/guides/agents/integrations-observability) describes SDK tracing. Northstar's JSONL/Supabase event trace is a separate application-level trace and is documented as such.

## Account data

Plaid's [Sandbox overview](https://plaid.com/docs/sandbox/) supports rich test data and simulated scenarios. Northstar currently does **not** call Plaid Sandbox or Production; its “connect” action loads a local synthetic fixture. A future Plaid integration should use Sandbox first and must replace the current simulator only after consent, security, and data-retention design are complete.
