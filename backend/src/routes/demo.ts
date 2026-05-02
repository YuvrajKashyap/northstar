import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import type { DemoSeed, PlaidLinkResult } from '@calmvest/shared';
import { persistDemoSeed } from '../lib/demo-persistence.js';

export const demoRouter = Router();

export async function readDemoSeed(): Promise<DemoSeed> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const distPath = join(currentDir, '..', 'data', 'demo-seed.json');
  const sourcePath = join(currentDir, '..', '..', 'src', 'data', 'demo-seed.json');
  const raw = await readFile(distPath, 'utf-8').catch(() => readFile(sourcePath, 'utf-8'));
  return JSON.parse(raw) as DemoSeed;
}

demoRouter.get('/seed', async (_req, res, next) => {
  try {
    res.json(await readDemoSeed());
  } catch (error) {
    next(error);
  }
});

demoRouter.post('/simulate-plaid-link', async (_req, res, next) => {
  try {
    const seed = await readDemoSeed();
    await persistDemoSeed(seed);

    const result: PlaidLinkResult = {
      ok: true,
      userId: seed.user.id,
      institution: 'Connected financial institutions',
      imported: {
        accounts: seed.accounts.length,
        holdings: seed.holdings.length,
        taxLots: seed.taxLots.length,
        transactions: seed.transactions.length,
      },
      accounts: seed.accounts,
      holdings: seed.holdings,
      transactions: seed.transactions,
    };
    res.json(result);
  } catch (error) {
    next(error);
  }
});

demoRouter.post('/seed/supabase', async (_req, res, next) => {
  try {
    const seed = await readDemoSeed();
    await persistDemoSeed(seed);
    res.json({ ok: true, userId: seed.user.id });
  } catch (error) {
    next(error);
  }
});
