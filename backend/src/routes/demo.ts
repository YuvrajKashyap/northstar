import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import type { DemoSeed } from '@calmvest/shared';
import { supabase } from '../lib/supabase.js';

export const demoRouter = Router();

export async function readDemoSeed(): Promise<DemoSeed> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const path = join(currentDir, '..', 'data', 'demo-seed.json');
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as DemoSeed;
}

demoRouter.get('/seed', async (_req, res, next) => {
  try {
    res.json(await readDemoSeed());
  } catch (error) {
    next(error);
  }
});

demoRouter.post('/seed/supabase', async (_req, res, next) => {
  try {
    const seed = await readDemoSeed();

    const { error: userError } = await supabase.from('demo_users').upsert({
      id: seed.user.id,
      name: seed.user.name,
      age: seed.user.age,
      investor_level: seed.user.investor_level,
      communication_style: seed.user.communication_style,
    });

    if (userError) throw userError;

    await supabase.from('accounts').upsert(
      seed.accounts.map((account) => ({
        id: account.id,
        user_id: seed.user.id,
        name: account.name,
        account_type: account.type,
        taxable: account.taxable,
        balance: account.balance,
      })),
    );

    await supabase.from('context_packets').upsert({
      user_id: seed.user.id,
      packet: seed.contextPacket,
    });

    await supabase.from('memory_documents').upsert({
      user_id: seed.user.id,
      content: seed.memoryTemplate,
    });

    res.json({ ok: true, userId: seed.user.id });
  } catch (error) {
    next(error);
  }
});
