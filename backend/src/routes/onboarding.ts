import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AgentTraceEvent, OnboardingAnswers, OnboardingCommitResult } from '@calmvest/shared';
import { readDemoSeed } from './demo.js';
import { buildComprehensiveMemoryFromOnboarding } from '../lib/memory-builder.js';
import { mirrorMemory } from '../lib/local-mirror.js';
import { supabase } from '../lib/supabase.js';
import { createTraceEvent, appendTraceEvent } from '../agents/trace-store.js';

export const onboardingRouter = Router();

const onboardingSchema = z.object({
  userId: z.string().default('maya-patel-demo'),
  profileText: z.string().default(''),
  goal: z.string().optional(),
  targetAmount: z.coerce.number().positive().optional(),
  targetDate: z.string().optional(),
  withdrawalNeed: z.string().optional(),
  drawdownFeeling: z.string().optional(),
  taxableAccount: z.boolean().optional(),
  communicationStyle: z.string().optional(),
  values: z.string().optional(),
});

onboardingRouter.post('/commit', async (req, res, next) => {
  try {
    const answers = onboardingSchema.parse(req.body) as OnboardingAnswers;
    const seed = await readDemoSeed();
    const { memoryMarkdown, contextPacket, diff, toolCalls, source } =
      await buildComprehensiveMemoryFromOnboarding(answers, seed);

    const runId = randomUUID();
    const trace: AgentTraceEvent[] = [];
    const started = createTraceEvent(runId, 'model_stream', 'Memory Compiler', 'Compiled onboarding intake into structured memory', {
      userId: answers.userId,
      source,
      visibleToUser: 'summary_only',
    });
    trace.push(started);
    await appendTraceEvent(started);

    for (const call of toolCalls) {
      const callEvent = createTraceEvent(runId, 'tool_call', 'Onboarding Agent', call.tool, {
        userId: answers.userId,
        visibleToUser: true,
        args: call.args,
      });
      trace.push(callEvent);
      await appendTraceEvent(callEvent);

      const resultEvent = createTraceEvent(runId, 'tool_result', 'Onboarding Agent', call.result, {
        userId: answers.userId,
        visibleToUser: true,
      });
      trace.push(resultEvent);
      await appendTraceEvent(resultEvent);
    }

    const { error: contextError } = await supabase.from('context_packets').upsert({
      user_id: answers.userId,
      packet: contextPacket,
      updated_at: new Date().toISOString(),
    });
    if (contextError) throw contextError;

    const { error: memoryError } = await supabase.from('memory_documents').upsert({
      user_id: answers.userId,
      content: memoryMarkdown,
      updated_at: new Date().toISOString(),
    });
    if (memoryError) throw memoryError;

    await mirrorMemory(answers.userId, memoryMarkdown, contextPacket);

    const result: OnboardingCommitResult = {
      ok: true,
      userId: answers.userId,
      memoryMarkdown,
      contextPacket,
      diff,
      trace,
    };
    res.json(result);
  } catch (error) {
    next(error);
  }
});
