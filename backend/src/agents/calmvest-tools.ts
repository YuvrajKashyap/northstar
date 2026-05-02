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

const toolHandlers: Record<CalmVestToolName, ToolHandler> = {
  parse_scenario(args) {
    return {
      marketShockPct: Number(args.marketShockPct ?? -20),
      withdrawalPct: Number(args.withdrawalPct ?? 20),
      horizonMonths: Number(args.horizonMonths ?? 12),
      plainEnglish: 'Markets drop 20% and Maya needs to withdraw 20% within the next year.',
    };
  },

  run_stress_test(_args, seed) {
    const startingValue = seed.contextPacket.accounts_summary.portfolio_value;
    const stressedValue = Math.round(startingValue * 0.776);
    const withdrawalNeed = Math.round(startingValue * 0.2);
    const cashAvailable = seed.contextPacket.accounts_summary.cash_available;

    return {
      startingValue,
      stressedValue,
      stressLossPct: -22.4,
      withdrawalNeed,
      liquidityGap: Math.max(0, withdrawalNeed - cashAvailable),
      goalDelayMonths: 11,
    };
  },

  estimate_tax_impact(_args, seed) {
    const unrealizedGain = seed.holdings.reduce((total, holding) => {
      return total + Math.max(0, holding.value - holding.costBasis);
    }, 0);

    return {
      impact: 'medium',
      taxableAccount: seed.contextPacket.accounts_summary.taxable,
      estimatedUnrealizedGain: Math.round(unrealizedGain),
      note: 'Tax impact should be reviewed before selling appreciated positions.',
    };
  },

  compare_plan_paths() {
    return {
      recommendation: 'Balanced protection',
      paths: [
        {
          name: 'Do nothing',
          stressLossPct: -22.4,
          liquidityCoverage: 0.4,
          top3Concentration: 0.48,
        },
        {
          name: 'Balanced protection',
          stressLossPct: -14.8,
          liquidityCoverage: 1,
          top3Concentration: 0.29,
        },
        {
          name: 'Maximum safety',
          stressLossPct: -9.2,
          liquidityCoverage: 1,
          top3Concentration: 0.18,
        },
      ],
    };
  },

  create_trust_receipt() {
    return {
      why: 'Maya may need cash soon and is worried about a sharp drawdown.',
      cost: 'low',
      taxImpact: 'medium',
      confidence: {
        liquidityMath: 'high',
        marketShockAssumptions: 'medium',
        returnForecast: 'low',
      },
      humanControl: 'approval_required',
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
