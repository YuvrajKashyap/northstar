import type {
  ContextPacket,
  MemoryDiffItem,
  MemoryGraph,
  MemoryGraphNode,
  OnboardingAnswers,
} from '@calmvest/shared';

export function buildMemoryFromOnboarding(
  answers: OnboardingAnswers,
  baseContext: ContextPacket,
): { memoryMarkdown: string; contextPacket: ContextPacket; diff: MemoryDiffItem[] } {
  const contextPacket: ContextPacket = {
    ...baseContext,
    goals: [
      {
        type: answers.goal,
        target_amount: answers.targetAmount,
        target_date: answers.targetDate,
        priority: 'high',
      },
    ],
    risk_profile: {
      risk_comfort: answers.drawdownFeeling.toLowerCase().includes('worried')
        ? 'moderate_cautious'
        : 'moderate',
      panic_response: answers.drawdownFeeling,
      liquidity_need: answers.withdrawalNeed,
    },
    accounts_summary: {
      ...baseContext.accounts_summary,
      taxable: answers.taxableAccount,
    },
    constraints: {
      ...baseContext.constraints,
      prefer_tax_aware: answers.taxableAccount,
    },
    user: {
      ...baseContext.user,
      communication_style: answers.communicationStyle,
    },
  };

  const memoryMarkdown = `# CalmVest Memory: ${contextPacket.user.name}

## Identity
- Beginner investor
- Prefers ${answers.communicationStyle} explanations

## Goals
- ${answers.goal}: $${answers.targetAmount.toLocaleString()} target by ${answers.targetDate}

## Risk and Liquidity
- Drawdown feeling: ${answers.drawdownFeeling}
- Liquidity note: ${answers.withdrawalNeed}

## Tax and Constraints
- Taxable account: ${answers.taxableAccount ? 'yes' : 'no'}
- No automatic trading
- Explain cost, tax, confidence, and approval status for recommendations

## Values
- ${answers.values || 'No special values preference captured yet'}

## Open Questions
- Confirm income stability
- Confirm exact house purchase timing
`;

  return {
    memoryMarkdown,
    contextPacket,
    diff: [
      { kind: 'added', label: 'Goal', value: `${answers.goal} by ${answers.targetDate}` },
      { kind: 'updated', label: 'Risk comfort', value: contextPacket.risk_profile.risk_comfort },
      { kind: 'created', label: 'Liquidity need', value: answers.withdrawalNeed },
      { kind: 'set', label: 'Communication preference', value: answers.communicationStyle },
    ],
  };
}

export function buildMemoryGraph(
  userId: string,
  memoryMarkdown: string,
  contextPacket: ContextPacket,
): MemoryGraph {
  const center: MemoryGraphNode = {
    id: 'maya',
    label: contextPacket.user.name,
    kind: 'person',
    value: `${contextPacket.user.age}, ${contextPacket.user.investor_level}`,
    source: 'Demo user profile',
    usedBy: ['Orchestrator', 'Communication Agent'],
  };

  const nodes: MemoryGraphNode[] = [
    center,
    {
      id: 'goals',
      label: 'Goals',
      kind: 'goal',
      value: contextPacket.goals
        .map((goal) => `${goal.type}: $${goal.target_amount.toLocaleString()} by ${goal.target_date}`)
        .join(', '),
      source: 'Onboarding',
      usedBy: ['Goal Agent', 'Scenario Agent', 'Rebalance Agent'],
    },
    {
      id: 'risk',
      label: 'Risk Comfort',
      kind: 'risk',
      value: `${contextPacket.risk_profile.risk_comfort}; ${contextPacket.risk_profile.panic_response}`,
      source: 'Onboarding',
      usedBy: ['Scenario Agent', 'Communication Agent'],
    },
    {
      id: 'accounts',
      label: 'Accounts',
      kind: 'account',
      value: `${contextPacket.accounts_summary.brokerage_count} brokerage accounts, $${contextPacket.accounts_summary.portfolio_value.toLocaleString()} portfolio`,
      source: 'Simulated Plaid',
      usedBy: ['Portfolio Agent', 'Tax Agent', 'Rebalance Agent'],
    },
    {
      id: 'tax',
      label: 'Tax Profile',
      kind: 'tax',
      value: contextPacket.accounts_summary.taxable ? 'Taxable brokerage detected' : 'Taxable account not confirmed',
      source: 'Simulated Plaid + onboarding',
      usedBy: ['Tax Agent', 'Rebalance Agent'],
    },
    {
      id: 'values',
      label: 'Values',
      kind: 'values',
      value: contextPacket.constraints.explain_costs ? 'Explain costs and tradeoffs' : 'No values captured',
      source: 'Onboarding',
      usedBy: ['Communication Agent'],
    },
    {
      id: 'cash-flow',
      label: 'Cash Flow',
      kind: 'cash_flow',
      value: `Cash available: $${contextPacket.accounts_summary.cash_available.toLocaleString()}; liquidity coverage ${Math.round(contextPacket.portfolio_features.liquidity_coverage * 100)}%`,
      source: 'Simulated Plaid',
      usedBy: ['Goal Agent', 'Scenario Agent'],
    },
    {
      id: 'communication',
      label: 'Communication Style',
      kind: 'communication',
      value: contextPacket.user.communication_style,
      source: 'Onboarding',
      usedBy: ['Communication Agent'],
    },
  ];

  return {
    userId,
    nodes,
    edges: nodes.slice(1).map((node) => ({
      from: center.id,
      to: node.id,
      label: 'informs',
    })),
    memoryMarkdown,
    contextPacket,
  };
}
