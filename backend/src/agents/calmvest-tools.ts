import type { DemoSeed } from '@calmvest/shared';

export type CalmVestToolName =
  | 'parse_scenario'
  | 'run_stress_test'
  | 'estimate_tax_impact'
  | 'compare_plan_paths'
  | 'create_trust_receipt';

export interface ToolExecutionRecord {
  tool: CalmVestToolName;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

type ToolHandler = (args: Record<string, unknown>, seed: DemoSeed) => Record<string, unknown>;

const shockSensitivity: Record<DemoSeed['holdings'][number]['assetClass'], number> = {
  stock: 1,
  etf: 0.85,
  mutual_fund: 0.7,
  cash: 0,
};

const toolHandlers: Record<CalmVestToolName, ToolHandler> = {
  parse_scenario(args, seed) {
    const marketShockPct = clamp(numberOr(args.marketShockPct, -20), -100, 100);
    const withdrawalPct = clamp(numberOr(args.withdrawalPct, 20), 0, 100);
    const horizonMonths = clamp(Math.round(numberOr(args.horizonMonths, 12)), 1, 120);
    return {
      marketShockPct,
      withdrawalPct,
      horizonMonths,
      plainEnglish: `${seed.user.name.split(' ')[0]} tests a ${Math.abs(marketShockPct)}% market drop and a ${withdrawalPct}% withdrawal within ${horizonMonths} months.`,
    };
  },

  run_stress_test(args, seed) {
    const marketShockPct = clamp(numberOr(args.marketShockPct, -20), -100, 100);
    const withdrawalPct = clamp(numberOr(args.withdrawalPct, 20), 0, 100);
    const startingValue = round(seed.holdings.reduce((total, holding) => total + holding.value, 0));
    const shockedValue = round(seed.holdings.reduce((total, holding) => {
      const sensitivity = shockSensitivity[holding.assetClass] ?? 0.8;
      return total + holding.value * (1 + (marketShockPct / 100) * sensitivity);
    }, 0));
    const stressLossPct = startingValue ? round(((shockedValue - startingValue) / startingValue) * 100, 1) : 0;
    const withdrawalNeed = round(startingValue * (withdrawalPct / 100));
    const cashAvailable = round(seed.contextPacket.accounts_summary.cash_available);
    const liquidityGap = round(Math.max(0, withdrawalNeed - cashAvailable));
    const monthlyGoalPace = Math.max(1, seed.contextPacket.goals[0]?.target_amount / 48 || 1);

    return {
      methodology: 'asset-class shock sensitivity v1',
      startingValue,
      shockedValue,
      stressLossPct,
      withdrawalNeed,
      cashAvailable,
      liquidityGap,
      liquidityCoverage: withdrawalNeed ? round(Math.min(1, cashAvailable / withdrawalNeed), 2) : 1,
      goalDelayMonths: Math.ceil(liquidityGap / monthlyGoalPace),
      assumptions: {
        stockSensitivity: shockSensitivity.stock,
        etfSensitivity: shockSensitivity.etf,
        mutualFundSensitivity: shockSensitivity.mutual_fund,
        cashSensitivity: shockSensitivity.cash,
        goalPaceMonths: 48,
      },
    };
  },

  estimate_tax_impact(_args, seed) {
    const unrealizedGain = seed.holdings.reduce((total, holding) => {
      return total + Math.max(0, holding.value - holding.costBasis);
    }, 0);

    return {
      impact: unrealizedGain > 10_000 ? 'high' : unrealizedGain > 2_500 ? 'medium' : 'low',
      taxableAccount: seed.contextPacket.accounts_summary.taxable,
      illustrativeUnrealizedGain: round(unrealizedGain),
      note: 'This is cost-basis arithmetic, not a tax liability estimate. Tax rate, filing status, holding period, and jurisdiction are not modeled.',
    };
  },

  compare_plan_paths(args, seed) {
    const stress = record(args.stress);
    const baseLoss = numberOr(stress.stressLossPct, 0);
    const baseCoverage = clamp(numberOr(stress.liquidityCoverage, 0), 0, 1);
    const baseConcentration = clamp(seed.contextPacket.portfolio_features.top3_concentration, 0, 1);
    return {
      recommendation: 'Balanced protection',
      selectionRule: 'Prefer a middle path that reduces modeled loss and concentration while preserving more growth exposure than the maximum-safety path.',
      paths: [
        planPath('Do nothing', baseLoss, baseCoverage, baseConcentration),
        planPath('Balanced protection', baseLoss * 0.7, Math.min(1, baseCoverage + 0.4), baseConcentration * 0.75),
        planPath('Maximum safety', baseLoss * 0.45, 1, baseConcentration * 0.55),
      ],
    };
  },

  create_trust_receipt(args, seed) {
    const stress = record(args.stress);
    const tax = record(args.tax);
    const paths = record(args.paths);
    return {
      why: `${seed.user.name.split(' ')[0]} may need near-term cash and wants to understand a modeled drawdown before acting.`,
      recommendation: paths.recommendation ?? 'Balanced protection',
      modeledLiquidityGap: stress.liquidityGap ?? null,
      taxImpact: tax.impact ?? 'unknown',
      confidence: {
        liquidityMath: 'high',
        marketShockAssumptions: 'medium',
        returnForecast: 'not_modeled',
        taxLiability: 'not_modeled',
      },
      humanControl: 'approval_required',
      limitation: 'Synthetic scenario output for product evaluation; no trade, transfer, or tax action is executed.',
    };
  },
};

export function runCalmVestTool(
  tool: CalmVestToolName,
  args: Record<string, unknown>,
  seed: DemoSeed,
): ToolExecutionRecord {
  return {
    tool,
    args,
    result: toolHandlers[tool](args, seed),
  };
}

function planPath(name: string, stressLossPct: number, liquidityCoverage: number, top3Concentration: number) {
  return {
    name,
    stressLossPct: round(stressLossPct, 1),
    liquidityCoverage: round(clamp(liquidityCoverage, 0, 1), 2),
    top3Concentration: round(clamp(top3Concentration, 0, 1), 2),
  };
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function numberOr(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 2) {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}
