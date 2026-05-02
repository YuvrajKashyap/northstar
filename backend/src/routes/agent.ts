import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { createTraceEvent, appendTraceEvent } from '../agents/trace-store.js';
import { runCalmVestTool, type CalmVestToolName } from '../agents/calmvest-tools.js';
import { readDemoSeed } from './demo.js';

export const agentRouter = Router();

const toolPlan: Array<{ agent: string; tool: CalmVestToolName; args: Record<string, unknown> }> = [
  {
    agent: 'Scenario Agent',
    tool: 'parse_scenario',
    args: { marketShockPct: -20, withdrawalPct: 20, horizonMonths: 12 },
  },
  { agent: 'Scenario Agent', tool: 'run_stress_test', args: {} },
  { agent: 'Tax Agent', tool: 'estimate_tax_impact', args: {} },
  { agent: 'Rebalance Agent', tool: 'compare_plan_paths', args: {} },
  { agent: 'Communication Agent', tool: 'create_trust_receipt', args: {} },
];

agentRouter.post('/scenario/stream', async (_req, res) => {
  const runId = randomUUID();
  const seed = await readDemoSeed();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  const started = createTraceEvent(runId, 'agent_started', 'Orchestrator', 'Started scenario run', {
    userId: seed.user.id,
  });
  await writeTrace(res, started);

  const thought = createTraceEvent(
    runId,
    'model_stream',
    'Scenario Agent',
    'Translating user scenario into tool-ready assumptions',
    { visibleToUser: 'summary_only' },
  );
  await writeTrace(res, thought);

  for (const step of toolPlan) {
    await writeTrace(
      res,
      createTraceEvent(runId, 'tool_call', step.agent, step.tool, {
        args: step.args,
        visibleToUser: true,
      }),
    );

    const execution = runCalmVestTool(step.tool, step.args, seed);
    await writeTrace(
      res,
      createTraceEvent(runId, 'tool_result', step.agent, `${step.tool} complete`, {
        result: execution.result,
        visibleToUser: true,
      }),
    );

    if (step.tool === 'run_stress_test') {
      await writeTrace(
        res,
        createTraceEvent(runId, 'handoff', 'Scenario Agent', 'Handed tax impact to Tax Agent'),
      );
    }

    if (step.tool === 'estimate_tax_impact') {
      await writeTrace(
        res,
        createTraceEvent(runId, 'handoff', 'Tax Agent', 'Returned findings to Rebalance Agent'),
      );
    }
  }

  await writeTrace(
    res,
    createTraceEvent(runId, 'agent_completed', 'Orchestrator', 'Scenario recommendation ready'),
  );

  res.write('event: done\n');
  res.write(`data: ${JSON.stringify({ runId })}\n\n`);
  res.end();
});

async function writeTrace(res: { write: (chunk: string) => void }, event: ReturnType<typeof createTraceEvent>) {
  await appendTraceEvent(event);
  res.write('event: trace\n');
  res.write(`data: ${JSON.stringify(event)}\n\n`);
  await new Promise((resolve) => setTimeout(resolve, 180));
}
