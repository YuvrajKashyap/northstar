import { Router } from 'express';
import { z } from 'zod';
import { readDemoSeed } from './demo.js';
import { supabase } from '../lib/supabase.js';
import { buildMemoryGraph } from '../lib/memory-builder.js';
import { mirrorMemory } from '../lib/local-mirror.js';
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

function parseGoalDescription(description: string): ContextPacket['goals'][number] {
  const clean = description.replace(/\s+/g, ' ').trim();
  return {
    type: inferGoalType(clean),
    target_amount: inferTargetAmount(clean),
    target_date: inferTargetDate(clean),
    priority: inferPriority(clean),
  };
}

function inferGoalType(description: string) {
  const firstSentence = description.split(/[.!?]/)[0] ?? description;
  const withoutAmounts = firstSentence
    .replace(/\$?\d[\d,]*(?:\.\d+)?\s*(?:k|m|thousand|million)?/gi, '')
    .replace(/\b(?:by|before|around|about|approximately|roughly|target|goal|save|saved|need|needs|want|wants|i|my|to|for)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const fallback = description.match(/\b(home|house|emergency fund|retirement|retire|travel|wedding|car|education|college|business|startup)\b/i)?.[0];
  const label = withoutAmounts || fallback || 'Financial goal';
  return titleCase(label.split(' ').slice(0, 6).join(' '));
}

function inferTargetAmount(description: string) {
  const match = description.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|m|thousand|million)?/i);
  if (!match) return 0;
  const base = Number(match[1].replace(/,/g, ''));
  const multiplier = /^(k|thousand)$/i.test(match[2] ?? '') ? 1000 : /^(m|million)$/i.test(match[2] ?? '') ? 1000000 : 1;
  return Math.round(base * multiplier);
}

function inferTargetDate(description: string) {
  const monthYear = description.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i);
  if (monthYear) return `${monthYear[2]}-${String(monthIndex(monthYear[1]) + 1).padStart(2, '0')}`;
  const year = description.match(/\b(20\d{2})\b/);
  if (year) return `${year[1]}-12`;
  if (/\bnext year\b/i.test(description)) return `${new Date().getFullYear() + 1}-12`;
  if (/\bthis year\b/i.test(description)) return `${new Date().getFullYear()}-12`;
  return 'unknown';
}

function inferPriority(description: string) {
  if (/\b(high|urgent|primary|main|most important|top priority|critical|must)\b/i.test(description)) return 'high';
  if (/\b(low|someday|nice to have|eventually|optional)\b/i.test(description)) return 'low';
  return 'medium';
}

function appendGoalToMemory(memoryMarkdown: string, goal: ContextPacket['goals'][number], description: string) {
  const target = goal.target_amount > 0 ? `$${goal.target_amount.toLocaleString()}` : 'target amount TBD';
  const date = goal.target_date && goal.target_date !== 'unknown' ? goal.target_date : 'timeline TBD';
  const line = `- ${goal.type}: ${target} by ${date} (${goal.priority}). User description: ${description.trim()}`;
  const updateBlock = `\n\n## Goal Updates\n${line}\n`;
  if (!memoryMarkdown.includes('## Goal Updates')) return `${memoryMarkdown.trim()}${updateBlock}`;
  return memoryMarkdown.replace(/(## Goal Updates\n)/, `$1${line}\n`);
}

function monthIndex(month: string) {
  return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    .findIndex((candidate) => month.toLowerCase().startsWith(candidate));
}

function titleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
