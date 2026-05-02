import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { readDemoSeed } from './demo.js';
import type {
  ContextPacket,
  Plan,
  PlanApprovalResponse,
  PlanApprovalStatus,
  PlanGenerateResponse,
  PlanImpact,
  PlansResponse,
  PlanStep,
  PlanStepCategory,
  PlanStepTiming,
} from '@calmvest/shared';

export const plansRouter = Router();

const userQuerySchema = z.object({
  userId: z.string().min(1),
});

const generateSchema = z.object({
  userId: z.string().min(1),
});

const approvalSchema = z.object({
  userId: z.string().min(1),
  approvalStatus: z.enum(['approved', 'rejected']),
});

plansRouter.get('/', async (req, res, next) => {
  try {
    const { userId } = userQuerySchema.parse(req.query);
    const plans = await loadPlans(userId);
    const response: PlansResponse = { ok: true, userId, plans };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

plansRouter.post('/generate', async (req, res, next) => {
  try {
    const { userId } = generateSchema.parse(req.body);
    const plan = await generatePlan(userId);
    const response: PlanGenerateResponse = { ok: true, userId, plan };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

plansRouter.post('/:planId/steps/:stepId/approval', async (req, res, next) => {
  try {
    const planId = z.string().uuid().parse(req.params.planId);
    const stepId = z.string().uuid().parse(req.params.stepId);
    const { userId, approvalStatus } = approvalSchema.parse(req.body);

    const { error } = await supabase
      .from('plan_steps')
      .update({ approval_status: approvalStatus, updated_at: new Date().toISOString() })
      .eq('id', stepId)
      .eq('plan_id', planId)
      .eq('user_id', userId);
    if (error) throw error;

    const plan = (await loadPlans(userId)).find((candidate) => candidate.id === planId);
    if (!plan) {
      res.status(404).json({ ok: false, message: 'Plan not found.' });
      return;
    }

    const response: PlanApprovalResponse = { ok: true, userId, plan };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

async function generatePlan(userId: string): Promise<Plan> {
  const now = new Date().toISOString();
  const source = await loadPlanSource(userId);
  await ensurePlanUser(userId, source.contextPacket);
  const draft = buildPlanDraft(userId, source, now);

  const { error: archiveError } = await supabase
    .from('plans')
    .update({ status: 'archived', updated_at: now })
    .eq('user_id', userId)
    .eq('status', 'active');
  if (archiveError) throw archiveError;

  const { data: planRow, error: planError } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      title: draft.title,
      summary: draft.summary,
      status: 'active',
      horizon: draft.horizon,
      target_date: draft.targetDate,
      score: draft.score,
      confidence: draft.confidence,
      source_metadata: draft.sourceMetadata,
      content: draft.content,
      updated_at: now,
    })
    .select('*')
    .single();
  if (planError) throw planError;

  const planId = String(planRow.id);
  const stepRows = draft.steps.map((step) => ({
    plan_id: planId,
    user_id: userId,
    position: step.position,
    category: step.category,
    timing: step.timing,
    title: step.title,
    description: step.description,
    rationale: step.rationale,
    memory_drivers: step.memoryDrivers,
    impact: step.impact,
    approval_required: step.approvalRequired,
    approval_status: step.approvalStatus,
    trust_receipt_id: step.trustReceiptId,
    changes_if: step.changesIf,
    updated_at: now,
  }));

  const { error: stepsError } = await supabase.from('plan_steps').insert(stepRows);
  if (stepsError) throw stepsError;

  if (source.latestReceiptId) {
    await supabase.from('trust_receipts').update({ plan_id: planId }).eq('id', source.latestReceiptId);
  }

  const plan = (await loadPlans(userId)).find((candidate) => candidate.id === planId);
  if (!plan) throw new Error('Plan was created but could not be loaded.');
  return plan;
}

async function loadPlans(userId: string): Promise<Plan[]> {
  const { data: planRows, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (planError) throw planError;

  const planIds = (planRows ?? []).map((row) => String(row.id));
  const { data: stepRows, error: stepError } = planIds.length
    ? await supabase.from('plan_steps').select('*').in('plan_id', planIds).order('position', { ascending: true })
    : { data: [], error: null };
  if (stepError) throw stepError;

  return (planRows ?? []).map((row) => {
    const steps = (stepRows ?? [])
      .filter((step) => String(step.plan_id) === String(row.id))
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map(toPlanStep);
    return toPlan(row, steps);
  });
}

async function ensurePlanUser(userId: string, contextPacket: ContextPacket) {
  const user = contextPacket.user;
  const { error } = await supabase.from('demo_users').upsert(
    {
      id: userId,
      name: user.name || 'Northstar user',
      age: Number.isFinite(Number(user.age)) && Number(user.age) > 0 ? Number(user.age) : 30,
      investor_level: user.investor_level || 'beginner',
      communication_style: user.communication_style || 'Plain English with clear next steps',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

async function loadPlanSource(userId: string) {
  const [{ data: contextRow }, { data: memoryRow }, accounts, holdings, taxLots, transactions, receipts, seed] =
    await Promise.all([
      supabase.from('context_packets').select('packet, updated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('memory_documents').select('content, updated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('holdings').select('*').eq('user_id', userId),
      supabase.from('tax_lots').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId).order('posted_at', { ascending: false }).limit(50),
      supabase.from('trust_receipts').select('id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      readDemoSeed(),
    ]);

  const contextPacket = (contextRow?.packet as ContextPacket | undefined) ?? emptyContextPacket(userId, seed.contextPacket);
  return {
    contextPacket,
    memoryMarkdown: (memoryRow?.content as string | undefined) ?? '',
    memoryUpdatedAt: (memoryRow?.updated_at as string | undefined) ?? null,
    contextUpdatedAt: (contextRow?.updated_at as string | undefined) ?? null,
    accounts: accounts.data ?? [],
    holdings: holdings.data ?? [],
    taxLots: taxLots.data ?? [],
    transactions: transactions.data ?? [],
    trustReceipts: receipts.data ?? [],
    latestReceiptId: receipts.data?.[0]?.id ? String(receipts.data[0].id) : null,
  };
}

function buildPlanDraft(userId: string, source: Awaited<ReturnType<typeof loadPlanSource>>, generatedAt: string) {
  const context = source.contextPacket;
  const primaryGoal = context.goals[0];
  const goalLabel = formatGoalLabel(primaryGoal);
  const targetDate = normalizeTargetDate(primaryGoal?.target_date);
  const accountsCount = source.accounts.length;
  const holdingsCount = source.holdings.length;
  const taxLotsCount = source.taxLots.length;
  const portfolioValue = numberOr(
    context.accounts_summary.portfolio_value,
    sumBy(source.holdings, 'value') || sumBy(source.accounts, 'balance'),
  );
  const cashAvailable = numberOr(
    context.accounts_summary.cash_available,
    sumBy(source.accounts.filter((account) => ['cash', 'checking', 'savings'].includes(String(account.account_type ?? account.type))), 'balance'),
  );
  const targetAmount = numberOr(primaryGoal?.target_amount, 80000);
  const liquidityCoverage = clamp(numberOr(context.portfolio_features.liquidity_coverage, targetAmount ? cashAvailable / targetAmount : 0), 0, 1.4);
  const top3Concentration = clamp(numberOr(context.portfolio_features.top3_concentration, 0), 0, 1);
  const equityWeight = clamp(numberOr(context.portfolio_features.equity_weight, 0), 0, 1);
  const hasTaxableContext = Boolean(context.accounts_summary.taxable || taxLotsCount > 0);
  const missingInputs = [
    accountsCount ? '' : 'Connected account balances',
    holdingsCount ? '' : 'Portfolio holdings',
    taxLotsCount || !hasTaxableContext ? '' : 'Tax lots and cost basis',
    source.memoryMarkdown ? '' : 'Committed memory.md',
  ].filter(Boolean);
  const score = clamp(
    Math.round(
      58 +
        Math.min(liquidityCoverage, 1) * 18 +
        (1 - Math.min(top3Concentration, 0.65)) * 14 +
        (targetDate ? 7 : 0) -
        missingInputs.length * 4,
    ),
    42,
    94,
  );
  const approvalSummary = 'Recommendations only. Trades, withdrawals, tax actions, and account changes require explicit approval.';
  const confidence = {
    liquidityMath: accountsCount ? 'high' : 'low',
    goalPace: primaryGoal ? 'medium' : 'low',
    marketAssumptions: 'medium',
    taxSpecificity: taxLotsCount ? 'high' : hasTaxableContext ? 'medium' : 'low',
  } as const;
  const baseMetadata = {
    memoryUpdatedAt: source.memoryUpdatedAt,
    contextUpdatedAt: source.contextUpdatedAt,
    accounts: accountsCount,
    holdings: holdingsCount,
    taxLots: taxLotsCount,
    trustReceipts: source.trustReceipts.length,
    generatedAt,
  };

  const steps = buildSteps({
    context,
    goalLabel,
    targetAmount,
    targetDate,
    liquidityCoverage,
    top3Concentration,
    equityWeight,
    accountsCount,
    holdingsCount,
    taxLotsCount,
    hasTaxableContext,
    latestReceiptId: source.latestReceiptId,
  });

  return {
    title: goalLabel.toLowerCase().includes('home') || goalLabel.toLowerCase().includes('house')
      ? 'Home-readiness plan'
      : 'Flexibility-first plan',
    summary: `Prioritize cash flexibility, keep ${goalLabel.toLowerCase()} on pace, and gate risk or tax-sensitive moves behind approval.`,
    horizon: targetDate ? `Now through ${targetDate.slice(0, 7)}` : 'Now through the next 12 months',
    targetDate,
    score,
    confidence,
    sourceMetadata: baseMetadata,
    content: {
      primaryGoal: goalLabel,
      riskPosture: context.risk_profile.risk_comfort?.replace(/_/g, ' ') || 'not specified',
      liquidityCoverage,
      approvalSummary,
      missingInputs,
      toolsUsed: ['get_memory_context', 'get_portfolio_context', 'compute_liquidity_coverage', 'compute_goal_readiness', 'create_trust_receipt'],
    },
    steps,
  };
}

function buildSteps(input: {
  context: ContextPacket;
  goalLabel: string;
  targetAmount: number;
  targetDate: string | null;
  liquidityCoverage: number;
  top3Concentration: number;
  equityWeight: number;
  accountsCount: number;
  holdingsCount: number;
  taxLotsCount: number;
  hasTaxableContext: boolean;
  latestReceiptId: string | null;
}) {
  const riskComfort = input.context.risk_profile.risk_comfort?.replace(/_/g, ' ') || 'risk comfort';
  const needsAccounts = input.accountsCount === 0;
  const needsHoldings = input.holdingsCount === 0;

  return [
    draftStep(1, 'protect_cash', 'now', {
      title: needsAccounts ? 'Connect cash accounts before making money moves' : 'Protect the cash reserve first',
      description: needsAccounts
        ? 'Load checking, savings, and cash balances so Northstar can separate spendable cash from money reserved for safety.'
        : `Keep near-term money protected before adding risk. Current liquidity coverage is ${Math.round(input.liquidityCoverage * 100)}%.`,
      rationale: 'Northstar should not optimize returns before it knows whether the user can absorb a cash shock.',
      memoryDrivers: ['Liquidity need', 'Panic response', 'No auto-trade constraint'],
      impact: { liquidity: 88, goalFit: 62, riskReduction: 71, taxAwareness: 30 },
      approvalRequired: false,
      trustReceiptId: null,
      changesIf: 'This changes if income stability improves, fixed costs fall, or a larger near-term cash need appears.',
    }),
    draftStep(2, 'fund_goals', 'next_30_days', {
      title: `Set the funding lane for ${input.goalLabel}`,
      description: input.targetDate
        ? `Use the ${input.targetDate.slice(0, 7)} target date to define the monthly contribution needed for the goal.`
        : `Set a target date and contribution range for ${input.goalLabel.toLowerCase()}.`,
      rationale: 'A plan is only useful if the goal has a visible pace, not just a target amount.',
      memoryDrivers: ['Primary goal', 'Target amount', 'Communication preference'],
      impact: { liquidity: 55, goalFit: 91, riskReduction: 45, taxAwareness: 35 },
      approvalRequired: false,
      trustReceiptId: null,
      changesIf: 'This changes if the target date, income, rent, or goal amount changes.',
    }),
    draftStep(3, 'reduce_risk', 'next_90_days', {
      title: needsHoldings ? 'Load holdings before drafting a risk change' : 'Draft a concentration and risk review',
      description: needsHoldings
        ? 'Connect holdings so Northstar can see overlap, concentration, and time-horizon mismatch before suggesting allocation changes.'
        : `Review concentration and equity exposure against ${riskComfort}. No trades happen without approval.`,
      rationale: 'Portfolio risk should be reduced only after checking the goal horizon and user comfort with drawdowns.',
      memoryDrivers: ['Risk comfort', 'Drawdown response', 'Portfolio features'],
      impact: { liquidity: 44, goalFit: 66, riskReduction: input.top3Concentration > 0.35 || input.equityWeight > 0.75 ? 86 : 64, taxAwareness: 48 },
      approvalRequired: !needsHoldings,
      trustReceiptId: !needsHoldings ? input.latestReceiptId : null,
      changesIf: 'This changes if market exposure, concentration, or the goal horizon changes materially.',
    }),
    draftStep(4, 'tax_review', 'longer_term', {
      title: input.hasTaxableContext ? 'Run a tax-aware review before any sale' : 'Add tax context before tax-sensitive advice',
      description: input.hasTaxableContext
        ? `Use ${input.taxLotsCount || 'available'} tax-lot records and account type to estimate impact before any rebalancing or withdrawal.`
        : 'Confirm taxable accounts, cost basis, and realized-gain context before Northstar recommends sale or withdrawal paths.',
      rationale: 'Tax impact belongs in the plan before approval, not after the user has already decided.',
      memoryDrivers: ['Taxable account flag', 'Explain costs constraint', 'Approval-first rule'],
      impact: { liquidity: 36, goalFit: 52, riskReduction: 54, taxAwareness: input.taxLotsCount ? 92 : 68 },
      approvalRequired: input.hasTaxableContext,
      trustReceiptId: input.hasTaxableContext ? input.latestReceiptId : null,
      changesIf: 'This changes if cost basis, holding period, income, filing context, or location changes.',
    }),
  ];
}

function draftStep(
  position: number,
  category: PlanStepCategory,
  timing: PlanStepTiming,
  input: {
    title: string;
    description: string;
    rationale: string;
    memoryDrivers: string[];
    impact: PlanImpact;
    approvalRequired: boolean;
    trustReceiptId: string | null;
    changesIf: string;
  },
) {
  return {
    position,
    category,
    timing,
    ...input,
    approvalStatus: (input.approvalRequired ? 'approval_required' : 'not_required') as PlanApprovalStatus,
  };
}

function toPlan(row: Record<string, unknown>, steps: PlanStep[]): Plan {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    summary: String(row.summary),
    status: String(row.status) as Plan['status'],
    horizon: String(row.horizon),
    targetDate: row.target_date ? String(row.target_date) : null,
    score: Number(row.score),
    confidence: row.confidence as Plan['confidence'],
    sourceMetadata: row.source_metadata as Plan['sourceMetadata'],
    content: row.content as Plan['content'],
    steps,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toPlanStep(row: Record<string, unknown>): PlanStep {
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    position: Number(row.position),
    category: String(row.category) as PlanStepCategory,
    timing: String(row.timing) as PlanStepTiming,
    title: String(row.title),
    description: String(row.description),
    rationale: String(row.rationale),
    memoryDrivers: Array.isArray(row.memory_drivers) ? row.memory_drivers.map(String) : [],
    impact: row.impact as PlanImpact,
    approvalRequired: Boolean(row.approval_required),
    approvalStatus: String(row.approval_status) as PlanApprovalStatus,
    trustReceiptId: row.trust_receipt_id ? String(row.trust_receipt_id) : null,
    changesIf: String(row.changes_if),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function emptyContextPacket(userId: string, fallback: ContextPacket): ContextPacket {
  return {
    ...fallback,
    user: { ...fallback.user, id: userId },
    goals: [],
    accounts_summary: { taxable: false, brokerage_count: 0, cash_available: 0, portfolio_value: 0 },
    portfolio_features: { top3_concentration: 0, equity_weight: 0, cash_weight: 0, growth_tech_overlap: 'unknown', liquidity_coverage: 0 },
  };
}

function formatGoalLabel(goal: ContextPacket['goals'][number] | undefined) {
  if (!goal) return 'Financial flexibility';
  const kind = goal.type?.replace(/_/g, ' ') || 'Goal';
  const amount = numberOr(goal.target_amount, 0);
  return amount ? `${titleCase(kind)} (${formatMoney(amount)})` : titleCase(kind);
}

function normalizeTargetDate(value: string | undefined) {
  if (!value) return null;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

function numberOr(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sumBy(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce((total, row) => total + numberOr(row[key], 0), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}
