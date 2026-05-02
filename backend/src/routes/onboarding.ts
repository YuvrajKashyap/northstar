import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AgentTraceEvent, OnboardingAnswers, OnboardingCommitResult } from '@calmvest/shared';
import { readDemoSeed } from './demo.js';
import { buildMemoryFromOnboarding } from '../lib/memory-builder.js';
import { mirrorMemory } from '../lib/local-mirror.js';
import { supabase } from '../lib/supabase.js';
import { createTraceEvent, appendTraceEvent } from '../agents/trace-store.js';

export const onboardingRouter = Router();

const onboardingSchema = z.object({
  userId: z.string().default('maya-patel-demo'),
  goal: z.string().min(1),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.string().min(1),
  withdrawalNeed: z.string().min(1),
  drawdownFeeling: z.string().min(1),
  taxableAccount: z.boolean(),
  communicationStyle: z.string().min(1),
  values: z.string().default(''),
});

onboardingRouter.post('/commit', async (req, res, next) => {
  try {
    const answers = onboardingSchema.parse(req.body) as OnboardingAnswers;
    const seed = await readDemoSeed();
    const { memoryMarkdown, contextPacket, diff } = buildMemoryFromOnboarding(
      answers,
      seed.contextPacket,
    );

    const runId = randomUUID();
    const tracePlan = [
      ['tool_call', 'Onboarding Agent', 'create_goal', { goal: answers.goal }],
      ['tool_result', 'Onboarding Agent', 'Goal created', { targetDate: answers.targetDate }],
      ['tool_call', 'Onboarding Agent', 'create_risk_profile', { drawdownFeeling: answers.drawdownFeeling }],
      ['tool_result', 'Onboarding Agent', 'Risk profile updated', { riskComfort: contextPacket.risk_profile.risk_comfort }],
      ['tool_call', 'Onboarding Agent', 'create_tax_profile', { taxableAccount: answers.taxableAccount }],
      ['tool_result', 'Onboarding Agent', 'Tax profile created', { taxable: answers.taxableAccount }],
      ['tool_call', 'Onboarding Agent', 'set_communication_preferences', { style: answers.communicationStyle }],
      ['tool_result', 'Onboarding Agent', 'Communication preference set', { style: answers.communicationStyle }],
      ['tool_call', 'Onboarding Agent', 'commit_onboarding_profile', { userId: answers.userId }],
      ['tool_result', 'Onboarding Agent', 'Memory and context committed', { diff }],
    ] as const;

    const trace: AgentTraceEvent[] = [];
    for (const [type, agent, label, payload] of tracePlan) {
      const event = createTraceEvent(runId, type, agent, label, {
        userId: answers.userId,
        visibleToUser: true,
        ...payload,
      });
      trace.push(event);
      await appendTraceEvent(event);
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
