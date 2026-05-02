import { Router } from 'express';
import { readDemoSeed } from './demo.js';
import { supabase } from '../lib/supabase.js';
import { buildMemoryGraph } from '../lib/memory-builder.js';
import type { ContextPacket, MemoryStatusResponse, RawMemoryDocument } from '@calmvest/shared';

export const memoryRouter = Router();

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
