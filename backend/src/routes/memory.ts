import { Router } from 'express';
import { readDemoSeed } from './demo.js';
import { supabase } from '../lib/supabase.js';
import { buildMemoryGraph } from '../lib/memory-builder.js';
import type { ContextPacket } from '@calmvest/shared';

export const memoryRouter = Router();

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

    const contextPacket = (contextRow?.packet as ContextPacket | undefined) ?? seed.contextPacket;
    const memoryMarkdown = memoryRow?.content ?? seed.memoryTemplate;

    res.json(buildMemoryGraph(userId, memoryMarkdown, contextPacket));
  } catch (error) {
    next(error);
  }
});
