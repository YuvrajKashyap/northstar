import { Router } from 'express';
import { z } from 'zod';
import type { AgentTraceEvent } from '@calmvest/shared';
import { freshCheckPrompt, streamNorthstarAgentRun } from '../agents/northstar-agent-runner.js';

export const agentRouter = Router();

const runSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  mode: z.enum(['general', 'fresh_check']).optional().default('general'),
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
    const userId = typeof req.body?.userId === 'string' && req.body.userId.trim() ? req.body.userId.trim() : 'northstar-local-user';
    await streamToResponse(res, {
      userId,
      message: freshCheckPrompt,
      mode: 'fresh_check',
    });
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
