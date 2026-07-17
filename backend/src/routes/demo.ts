import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import type { DemoSeed, PlaidLinkResult } from '@calmvest/shared';
import { supabase } from '../lib/supabase.js';
import { HttpError } from '../http/errors.js';
import { requireAuth, requireOwnedUserId } from '../middleware/auth.js';

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

demoRouter.post('/simulate-plaid-link', requireAuth, async (req, res, next) => {
  try {
    const requestedUserId = typeof req.body?.userId === 'string' ? req.body.userId : undefined;
    const userId = requireOwnedUserId(req, requestedUserId);
    const existing = await readPersistedUserSeed(userId);
    if (existing) {
      res.json(existing);
      return;
    }
    throw new HttpError(404, 'No synthetic account fixture exists for this user. Sign in again to reprovision it.', 'FIXTURE_NOT_FOUND');
  } catch (error) {
    next(error);
  }
});

async function readPersistedUserSeed(userId: string): Promise<PlaidLinkResult | null> {
  const { data: userRow, error: userError } = await supabase
    .from('demo_users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (userError) throw userError;
  if (!userRow) return null;

  const [
    { data: accounts, error: accountsError },
    { data: holdings, error: holdingsError },
    { data: taxLots, error: taxLotsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('id,institution,name,account_type,taxable,balance')
      .eq('user_id', userId)
      .order('name'),
    supabase
      .from('holdings')
      .select('symbol,name,asset_class,quantity,price,value,cost_basis,sector')
      .eq('user_id', userId)
      .order('value', { ascending: false }),
    supabase
      .from('tax_lots')
      .select('id,symbol,acquired_at,quantity,cost_basis')
      .eq('user_id', userId),
    supabase
      .from('transactions')
      .select('id,posted_at,account_id,description,amount,transaction_type')
      .eq('user_id', userId)
      .order('posted_at', { ascending: false }),
  ]);
  if (accountsError) throw accountsError;
  if (holdingsError) throw holdingsError;
  if (taxLotsError) throw taxLotsError;
  if (transactionsError) throw transactionsError;

  const mappedAccounts = (accounts ?? []).map((account) => ({
    id: account.id as string,
    institution: (account.institution as string | null) ?? undefined,
    name: account.name as string,
    type: account.account_type as PlaidLinkResult['accounts'][number]['type'],
    taxable: Boolean(account.taxable),
    balance: Number(account.balance),
  }));

  const mappedHoldings = (holdings ?? []).map((holding) => ({
    symbol: holding.symbol as string,
    name: holding.name as string,
    assetClass: holding.asset_class as PlaidLinkResult['holdings'][number]['assetClass'],
    quantity: Number(holding.quantity),
    price: Number(holding.price),
    value: Number(holding.value),
    costBasis: Number(holding.cost_basis),
    sector: (holding.sector as string | null) ?? undefined,
  }));

  const mappedTransactions = (transactions ?? []).map((transaction) => ({
    id: transaction.id as string,
    postedAt: transaction.posted_at as string,
    accountId: transaction.account_id as string,
    description: transaction.description as string,
    amount: Number(transaction.amount),
    type: transaction.transaction_type as string,
  }));

  return {
    ok: true,
    userId,
    institution: 'Connected financial institutions',
    imported: {
      accounts: mappedAccounts.length,
      holdings: mappedHoldings.length,
      taxLots: taxLots?.length ?? 0,
      transactions: mappedTransactions.length,
    },
    accounts: mappedAccounts,
    holdings: mappedHoldings,
    transactions: mappedTransactions,
  };
}

demoRouter.post('/seed/supabase', requireAuth, async (_req, _res, next) => {
  try {
    throw new HttpError(
      410,
      'The public database seeding endpoint was retired. Use the checked-in deterministic generator and an authenticated provisioning flow.',
      'PUBLIC_SEED_RETIRED',
    );
  } catch (error) {
    next(error);
  }
});
