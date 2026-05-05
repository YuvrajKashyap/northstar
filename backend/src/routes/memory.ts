import { Router } from 'express';
import { z } from 'zod';
import { readDemoSeed } from './demo.js';
import { supabase } from '../lib/supabase.js';
import { buildMemoryGraph } from '../lib/memory-builder.js';
import { mirrorMemory } from '../lib/local-mirror.js';
import { applyGoalInstruction, parseGoalDescription, type GoalActionKind } from '../lib/goal-actions.js';
import type {
  ContextPacket,
  GoalMemoryUpdateResponse,
  MemoryStatusResponse,
  RawMemoryDocument,
} from '@calmvest/shared';

export const memoryRouter = Router();

const goalUpdateSchema = z.object({
  userId: z.string().min(1),
  description: z.string().trim().min(8).max(2000),
});

memoryRouter.get('/status', async (req, res, next) => {
  try {
    const seed = await readDemoSeed();
    const userId = typeof req.query.userId === 'string' ? req.query.userId : seed.user.id;

    const [{ data: contextRow, error: contextError }, { data: memoryRow, error: memoryError }] =
      await Promise.all([
        supabase.from('context_packets').select('user_id').eq('user_id', userId).maybeSingle(),
        supabase.from('memory_documents').select('user_id').eq('user_id', userId).maybeSingle(),
      ]);

    if (contextError) throw contextError;
    if (memoryError) throw memoryError;

    const response: MemoryStatusResponse = {
      ok: true,
      userId,
      hasContext: Boolean(contextRow),
      hasMemory: Boolean(memoryRow),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

memoryRouter.get('/graph', async (req, res, next) => {
  try {
    const seed = await readDemoSeed();
    const userId = typeof req.query.userId === 'string' ? req.query.userId : seed.user.id;

    const { data: contextRow } = await supabase
      .from('context_packets')
      .select('packet')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: memoryRow } = await supabase
      .from('memory_documents')
      .select('content')
      .eq('user_id', userId)
      .maybeSingle();

    const contextPacket = await resolveContextIdentity(
      userId,
      (contextRow?.packet as ContextPacket | undefined) ?? emptyContextPacket(userId),
      seed.user.id,
    );
    const memoryMarkdown = memoryRow?.content ?? `# Northstar Memory\n\nNo memory has been committed for this user yet.`;

    res.json(buildMemoryGraph(userId, memoryMarkdown, contextPacket));
  } catch (error) {
    next(error);
  }
});

memoryRouter.get('/raw', async (req, res, next) => {
  try {
    const seed = await readDemoSeed();
    const userId = typeof req.query.userId === 'string' ? req.query.userId : seed.user.id;

    const [{ data: contextRow }, { data: memoryRow }] = await Promise.all([
      supabase
        .from('context_packets')
        .select('packet, updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('memory_documents')
        .select('content, updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const contextPacket = await resolveContextIdentity(
      userId,
      (contextRow?.packet as ContextPacket | undefined) ?? emptyContextPacket(userId),
      seed.user.id,
    );
    const result: RawMemoryDocument = {
      userId,
      memoryMarkdown: memoryRow?.content ?? `# Northstar Memory\n\nNo memory has been committed for this user yet.`,
      contextPacket,
      updatedAt: (memoryRow?.updated_at as string | undefined) ?? (contextRow?.updated_at as string | undefined) ?? null,
    };

    res.json(result);
  } catch (error) {
    next(error);
  }
});

memoryRouter.post('/goals', async (req, res, next) => {
  try {
    const seed = await readDemoSeed();
    const { userId, description } = goalUpdateSchema.parse(req.body);

    const [{ data: contextRow, error: contextError }, { data: memoryRow, error: memoryError }] =
      await Promise.all([
        supabase.from('context_packets').select('packet').eq('user_id', userId).maybeSingle(),
        supabase.from('memory_documents').select('content').eq('user_id', userId).maybeSingle(),
      ]);
    if (contextError) throw contextError;
    if (memoryError) throw memoryError;

    const existingContext = await resolveContextIdentity(
      userId,
      (contextRow?.packet as ContextPacket | undefined) ?? emptyContextPacket(userId),
      seed.user.id,
    );
    const goal = parseGoalDescription(description);
    const contextPacket: ContextPacket = {
      ...existingContext,
      goals: [...existingContext.goals, goal],
    };
    const memoryMarkdown = appendGoalToMemory(
      memoryRow?.content ?? `# Northstar Memory: ${contextPacket.user.name || 'Northstar user'}\n\nNo memory has been committed for this user yet.`,
      goal,
      description,
    );

    const [{ error: upsertContextError }, { error: upsertMemoryError }] = await Promise.all([
      supabase.from('context_packets').upsert({
        user_id: userId,
        packet: contextPacket,
        updated_at: new Date().toISOString(),
      }),
      supabase.from('memory_documents').upsert({
        user_id: userId,
        content: memoryMarkdown,
        updated_at: new Date().toISOString(),
      }),
    ]);
    if (upsertContextError) throw upsertContextError;
    if (upsertMemoryError) throw upsertMemoryError;

    await mirrorMemory(userId, memoryMarkdown, contextPacket);

    const response: GoalMemoryUpdateResponse = {
      ok: true,
      userId,
      goal,
      memoryMarkdown,
      contextPacket,
      graph: buildMemoryGraph(userId, memoryMarkdown, contextPacket),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

memoryRouter.post('/goals/apply', async (req, res, next) => {
  try {
    const seed = await readDemoSeed();
    const { userId, description } = goalUpdateSchema.parse(req.body);

    const [{ data: contextRow, error: contextError }, { data: memoryRow, error: memoryError }] =
      await Promise.all([
        supabase.from('context_packets').select('packet').eq('user_id', userId).maybeSingle(),
        supabase.from('memory_documents').select('content').eq('user_id', userId).maybeSingle(),
      ]);
    if (contextError) throw contextError;
    if (memoryError) throw memoryError;

    const existingContext = await resolveContextIdentity(
      userId,
      (contextRow?.packet as ContextPacket | undefined) ?? emptyContextPacket(userId),
      seed.user.id,
    );
    let action: ReturnType<typeof applyGoalInstruction>;
    try {
      action = applyGoalInstruction(existingContext.goals, description);
    } catch (caught) {
      if (caught instanceof Error && caught.message.includes('matching saved goal')) {
        res.status(404).json({ ok: false, message: caught.message });
        return;
      }
      throw caught;
    }
    const contextPacket: ContextPacket = {
      ...existingContext,
      goals: action.goals,
    };
    const memoryMarkdown = appendGoalActionToMemory(
      memoryRow?.content ?? `# Northstar Memory: ${contextPacket.user.name || 'Northstar user'}\n\nNo memory has been committed for this user yet.`,
      action.goal,
      description,
      action.kind,
    );

    const [{ error: upsertContextError }, { error: upsertMemoryError }] = await Promise.all([
      supabase.from('context_packets').upsert({
        user_id: userId,
        packet: contextPacket,
        updated_at: new Date().toISOString(),
      }),
      supabase.from('memory_documents').upsert({
        user_id: userId,
        content: memoryMarkdown,
        updated_at: new Date().toISOString(),
      }),
    ]);
    if (upsertContextError) throw upsertContextError;
    if (upsertMemoryError) throw upsertMemoryError;

    await mirrorMemory(userId, memoryMarkdown, contextPacket);

    const response: GoalMemoryUpdateResponse & { action: GoalActionKind } = {
      ok: true,
      userId,
      goal: action.goal,
      action: action.kind,
      memoryMarkdown,
      contextPacket,
      graph: buildMemoryGraph(userId, memoryMarkdown, contextPacket),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

async function resolveContextIdentity(userId: string, contextPacket: ContextPacket, demoUserId: string): Promise<ContextPacket> {
  if (userId === demoUserId) return contextPacket;

  const { data: authRow, error: authError } = await supabase
    .from('demo_auth_users')
    .select('name')
    .eq('user_id', userId)
    .maybeSingle();
  if (authError) throw authError;

  const profileName = typeof authRow?.name === 'string' ? authRow.name.trim() : '';
  if (!profileName) return contextPacket;

  return {
    ...contextPacket,
    user: {
      ...contextPacket.user,
      id: userId,
      name: profileName,
    },
  };
}

function emptyContextPacket(userId: string): ContextPacket {
  return {
    user: {
      id: userId,
      name: '',
      age: 0,
      investor_level: 'unknown',
      communication_style: '',
    },
    goals: [],
    risk_profile: {
      risk_comfort: '',
      panic_response: '',
      liquidity_need: '',
    },
    accounts_summary: {
      taxable: false,
      brokerage_count: 0,
      cash_available: 0,
      portfolio_value: 0,
    },
    portfolio_features: {
      top3_concentration: 0,
      equity_weight: 0,
      cash_weight: 0,
      growth_tech_overlap: '',
      liquidity_coverage: 0,
    },
    constraints: {
      no_auto_trade: true,
      prefer_tax_aware: false,
      explain_costs: true,
    },
  };
}

function appendGoalToMemory(memoryMarkdown: string, goal: ContextPacket['goals'][number], description: string) {
  return appendGoalActionToMemory(memoryMarkdown, goal, description, 'added');
}

function appendGoalActionToMemory(
  memoryMarkdown: string,
  goal: ContextPacket['goals'][number],
  description: string,
  kind: GoalActionKind,
) {
  const target = goal.target_amount > 0 ? `$${goal.target_amount.toLocaleString()}` : 'target amount TBD';
  const date = goal.target_date && goal.target_date !== 'unknown' ? goal.target_date : 'timeline TBD';
  const verb = kind === 'updated' ? 'Updated' : kind === 'removed' ? 'Removed' : 'Added';
  const line = `- ${verb} ${goal.type}: ${target} by ${date} (${goal.priority}). User description: ${description.trim()}`;
  const updateBlock = `\n\n## Goal Updates\n${line}\n`;
  if (!memoryMarkdown.includes('## Goal Updates')) return `${memoryMarkdown.trim()}${updateBlock}`;
  return memoryMarkdown.replace(/(## Goal Updates\n)/, (heading) => `${heading}${line}\n`);
}
