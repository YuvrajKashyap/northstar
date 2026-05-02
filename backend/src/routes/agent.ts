import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AgentTraceEvent } from '@calmvest/shared';
import { streamNorthstarAgentRun } from '../agents/northstar-agent-runner.js';
import { appendTraceEvent, createTraceEvent } from '../agents/trace-store.js';
import { runCalmVestTool, type CalmVestToolName } from '../agents/calmvest-tools.js';
import { supabase } from '../lib/supabase.js';
import { readDemoSeed } from './demo.js';

export const agentRouter = Router();

const runSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  mode: z.enum(['general', 'fresh_check', 'demo_scenario']).optional().default('general'),
});

agentRouter.post('/run/stream', async (req, res, next) => {
  try {
    const request = runSchema.parse(req.body);
    await streamToResponse(res, request);
  } catch (error) {
    next(error);
  }
});

agentRouter.post('/scenario/stream', async (req, res, next) => {
  try {
    const seed = await readDemoSeed();
    const userId = typeof req.body?.userId === 'string' && req.body.userId.trim() ? req.body.userId.trim() : seed.user.id;
    await streamDemoScenarioToResponse(res, userId);
  } catch (error) {
    next(error);
  }
});

async function streamToResponse(
  res: { writeHead: (status: number, headers: Record<string, string>) => void; write: (chunk: string) => void; end: () => void },
  request: z.infer<typeof runSchema>,
) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  let runId: string | null = null;
  for await (const event of streamNorthstarAgentRun(request)) {
    runId = event.runId;
    writeSse(res, event.type, event);
  }

  writeSse(res, 'done', { runId });
  res.end();
}

function writeSse(res: { write: (chunk: string) => void }, eventName: string, payload: AgentTraceEvent | { runId: string | null }) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function streamDemoScenarioToResponse(
  res: { writeHead: (status: number, headers: Record<string, string>) => void; write: (chunk: string) => void; end: () => void },
  userId: string,
) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  const runId = randomUUID();
  const seed = await readDemoSeed();
  const scenarioArgs = {
    marketShockPct: -20,
    withdrawalPct: 20,
    horizonMonths: 12,
    userPrompt: 'What if markets drop 20% and I need 20% next year?',
  };

  for (const event of [
    trace(runId, 'run_started', 'North', 'Scenario canvas opened', {
      userId,
      prompt: scenarioArgs.userPrompt,
      source: 'deterministic-demo-run',
    }),
    trace(runId, 'memory_loaded', 'North', 'Loaded memory graph and portfolio snapshot', {
      userId,
      memoryNodes: ['Goals', 'Risk Comfort', 'Accounts', 'Tax Profile', 'Cash Flow'],
      portfolioValue: seed.contextPacket.accounts_summary.portfolio_value,
    }),
  ]) {
    await emitScenarioEvent(res, event);
  }

  const parse = await emitTool(res, runId, userId, 'North', 'parse_scenario', scenarioArgs);
  const stress = await emitTool(res, runId, userId, 'North', 'run_stress_test', parse.result);
  await emitScenarioEvent(
    res,
    trace(runId, 'tool_result', 'North', 'Tax specialist checked taxable lots', {
      userId,
      reason: 'Scenario recommends selling or reserving appreciated positions.',
    }),
  );
  const tax = await emitTool(res, runId, userId, 'North', 'estimate_tax_impact', stress.result);
  await emitScenarioEvent(
    res,
    trace(runId, 'tool_result', 'North', 'Portfolio specialist drafted plan paths', {
      userId,
      taxImpact: tax.result.impact,
    }),
  );
  const paths = await emitTool(res, runId, userId, 'North', 'compare_plan_paths', {
    stress: stress.result,
    tax: tax.result,
  });
  const receipt = await emitTool(res, runId, userId, 'North', 'create_trust_receipt', {
    scenario: parse.result,
    stress: stress.result,
    tax: tax.result,
    paths: paths.result,
  });

  await persistTrustReceipt(userId, runId, receipt.result);
  await emitScenarioEvent(
    res,
    trace(runId, 'receipt_created', 'North', 'Trust receipt created', {
      userId,
      receipt: receipt.result,
      approvalStatus: 'approval_required',
    }),
  );
  await emitScenarioEvent(
    res,
    trace(runId, 'run_completed', 'North', 'Scenario complete', {
      userId,
      finalAnswer:
        'Balanced protection is the default path: stress loss improves from -22.4% to -14.8%, top-3 concentration falls from 48% to 29%, and liquidity coverage reaches 100%. Approval is required before any action.',
    }),
  );

  writeSse(res, 'done', { runId });
  res.end();
}

async function emitTool(
  res: { write: (chunk: string) => void },
  runId: string,
  userId: string,
  agent: string,
  tool: CalmVestToolName,
  args: Record<string, unknown>,
) {
  await emitScenarioEvent(
    res,
    trace(runId, 'tool_call', agent, tool, {
      userId,
      args,
      visibleToUser: true,
    }),
  );

  const seed = await readDemoSeed();
  const record = runCalmVestTool(tool, args, seed);
  await emitScenarioEvent(
    res,
    trace(runId, 'tool_result', agent, `${tool} complete`, {
      userId,
      toolName: tool,
      result: record.result,
      visibleToUser: true,
    }),
  );
  return record;
}

async function emitScenarioEvent(res: { write: (chunk: string) => void }, event: AgentTraceEvent) {
  await appendTraceEvent(event);
  writeSse(res, event.type, event);
}

function trace(
  runId: string,
  type: AgentTraceEvent['type'],
  agent: string,
  label: string,
  payload: Record<string, unknown>,
) {
  return createTraceEvent(runId, type, agent, label, payload);
}

async function persistTrustReceipt(userId: string, runId: string, receipt: Record<string, unknown>) {
  await supabase.from('trust_receipts').insert({
    user_id: userId,
    run_id: runId,
    title: 'Market drop + withdrawal scenario',
    content: receipt,
    approval_status: 'approval_required',
  });
}
