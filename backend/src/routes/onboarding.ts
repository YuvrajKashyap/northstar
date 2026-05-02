import { Router, type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AgentTraceEvent, ContextPacket, DemoSeed, OnboardingAnswers, OnboardingCommitResult } from '@calmvest/shared';
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
  targetAmount: z.coerce.number().nonnegative().optional(),
  targetDate: z.string().optional(),
  withdrawalNeed: z.string().optional(),
  drawdownFeeling: z.string().optional(),
  taxableAccount: z.boolean().optional(),
  communicationStyle: z.string().optional(),
  values: z.string().optional(),
});

onboardingRouter.post('/commit', commitOnboardingHandler);
onboardingRouter.post('/run/stream', commitOnboardingHandler);

async function commitOnboardingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const answers = onboardingSchema.parse(req.body) as OnboardingAnswers;
    const seed = await readOnboardingSeed(answers.userId);
    const { memoryMarkdown, contextPacket, diff, toolCalls, source } =
      await buildComprehensiveMemoryFromOnboarding(answers, seed);

    const runId = randomUUID();
    const trace: AgentTraceEvent[] = [];
    const started = createTraceEvent(runId, 'run_started', 'North', 'Compiled onboarding intake into structured memory', {
      userId: answers.userId,
      source,
      visibleToUser: 'summary_only',
    });
    trace.push(started);
    await appendTraceEvent(started);

    for (const call of toolCalls) {
      const callEvent = createTraceEvent(runId, 'tool_call', 'North', call.tool, {
        userId: answers.userId,
        visibleToUser: true,
        args: call.args,
      });
      trace.push(callEvent);
      await appendTraceEvent(callEvent);

      const resultEvent = createTraceEvent(runId, 'tool_result', 'North', call.result, {
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

    const completed = createTraceEvent(runId, 'run_completed', 'North', 'Onboarding memory committed', {
      userId: answers.userId,
      memoryBytes: memoryMarkdown.length,
      goals: contextPacket.goals.length,
    });
    trace.push(completed);
    await appendTraceEvent(completed);

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
}

async function readOnboardingSeed(userId: string): Promise<DemoSeed> {
  const demoSeed = await readDemoSeed();
  if (!userId || userId === demoSeed.user.id) return demoSeed;

  const [
    { data: userRow, error: userError },
    { data: authRow, error: authError },
    { data: contextRow, error: contextError },
    { data: accountRows, error: accountsError },
    { data: holdingRows, error: holdingsError },
    { data: taxLotRows, error: taxLotsError },
    { data: transactionRows, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from('demo_users')
      .select('id,name,age,investor_level,communication_style')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('demo_auth_users')
      .select('user_id,name,email')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('context_packets')
      .select('packet')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('accounts')
      .select('id,institution,name,account_type,taxable,balance')
      .eq('user_id', userId),
    supabase
      .from('holdings')
      .select('symbol,name,asset_class,quantity,price,value,cost_basis,sector')
      .eq('user_id', userId),
    supabase
      .from('tax_lots')
      .select('id,symbol,acquired_at,quantity,cost_basis')
      .eq('user_id', userId),
    supabase
      .from('transactions')
      .select('id,posted_at,account_id,description,amount,transaction_type')
      .eq('user_id', userId),
  ]);

  if (userError) throw userError;
  if (authError) throw authError;
  if (contextError) throw contextError;
  if (accountsError) throw accountsError;
  if (holdingsError) throw holdingsError;
  if (taxLotsError) throw taxLotsError;
  if (transactionsError) throw transactionsError;

  const accounts = (accountRows ?? []).map((account) => ({
    id: account.id as string,
    institution: (account.institution as string | null) ?? undefined,
    name: account.name as string,
    type: account.account_type as DemoSeed['accounts'][number]['type'],
    taxable: Boolean(account.taxable),
    balance: Number(account.balance),
  }));
  const holdings = (holdingRows ?? []).map((holding) => ({
    symbol: holding.symbol as string,
    name: holding.name as string,
    assetClass: holding.asset_class as DemoSeed['holdings'][number]['assetClass'],
    quantity: Number(holding.quantity),
    price: Number(holding.price),
    value: Number(holding.value),
    costBasis: Number(holding.cost_basis),
    sector: (holding.sector as string | null) ?? undefined,
  }));
  const taxLots = (taxLotRows ?? []).map((lot) => ({
    id: lot.id as string,
    symbol: lot.symbol as string,
    acquiredAt: lot.acquired_at as string,
    quantity: Number(lot.quantity),
    costBasis: Number(lot.cost_basis),
  }));
  const transactions = (transactionRows ?? []).map((transaction) => ({
    id: transaction.id as string,
    postedAt: transaction.posted_at as string,
    accountId: transaction.account_id as string,
    description: transaction.description as string,
    amount: Number(transaction.amount),
    type: transaction.transaction_type as string,
  }));

  const existingContext = contextRow?.packet as ContextPacket | undefined;
  const displayName =
    normalizeName((authRow?.name as string | undefined) ?? (userRow?.name as string | undefined)) ||
    existingContext?.user.name ||
    'Northstar user';
  const user = {
    id: userId,
    name: displayName,
    age: Number((userRow?.age as number | undefined) ?? existingContext?.user.age ?? 0),
    investor_level:
      (userRow?.investor_level as string | undefined) ??
      existingContext?.user.investor_level ??
      'unknown',
    communication_style:
      (userRow?.communication_style as string | undefined) ??
      existingContext?.user.communication_style ??
      'Plain English with clear next steps',
  };

  const accountSummary = summarizeAccounts(accounts);
  const contextPacket: ContextPacket = {
    ...(existingContext ?? demoSeed.contextPacket),
    user,
    goals: existingContext?.goals ?? [],
    risk_profile: existingContext?.risk_profile ?? {
      risk_comfort: 'unknown',
      panic_response: 'unknown',
      liquidity_need: 'unknown',
    },
    accounts_summary: accountSummary,
    portfolio_features: summarizePortfolio(accountSummary, holdings),
    constraints: {
      no_auto_trade: true,
      prefer_tax_aware: accountSummary.taxable,
      explain_costs: true,
    },
  };

  return {
    ...demoSeed,
    user,
    contextPacket,
    memoryTemplate: `# Northstar Memory: ${displayName}\n\nNo memory has been committed for this user yet.\n`,
    accounts,
    holdings,
    taxLots,
    transactions,
  };
}

function normalizeName(name: string | undefined) {
  return name?.trim().replace(/\s+/g, ' ') ?? '';
}

function summarizeAccounts(accounts: DemoSeed['accounts']): ContextPacket['accounts_summary'] {
  const brokerageTypes = new Set(['brokerage', 'mutual_fund']);
  const cashTypes = new Set(['checking', 'savings', 'cash']);
  return {
    taxable: accounts.some((account) => account.taxable),
    brokerage_count: accounts.filter((account) => brokerageTypes.has(account.type)).length,
    cash_available: accounts
      .filter((account) => cashTypes.has(account.type))
      .reduce((total, account) => total + Math.max(account.balance, 0), 0),
    portfolio_value: accounts
      .filter((account) => brokerageTypes.has(account.type) || account.type === 'cash')
      .reduce((total, account) => total + Math.max(account.balance, 0), 0),
  };
}

function summarizePortfolio(
  accountsSummary: ContextPacket['accounts_summary'],
  holdings: DemoSeed['holdings'],
): ContextPacket['portfolio_features'] {
  const portfolioValue =
    holdings.reduce((total, holding) => total + Number(holding.value), 0) ||
    accountsSummary.portfolio_value;
  const top3 = holdings
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .reduce((total, holding) => total + holding.value, 0);
  const equityValue = holdings
    .filter((holding) => holding.assetClass === 'stock' || holding.assetClass === 'etf')
    .reduce((total, holding) => total + holding.value, 0);
  const cashWeight = portfolioValue > 0 ? accountsSummary.cash_available / portfolioValue : 0;

  return {
    top3_concentration: portfolioValue > 0 ? top3 / portfolioValue : 0,
    equity_weight: portfolioValue > 0 ? equityValue / portfolioValue : 0,
    cash_weight: cashWeight,
    growth_tech_overlap: holdings.some((holding) => holding.sector?.toLowerCase().includes('technology'))
      ? 'detected'
      : 'unknown',
    liquidity_coverage: Math.min(1, cashWeight),
  };
}
