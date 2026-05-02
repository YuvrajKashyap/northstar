import type {
  ContextPacket,
  DemoSeed,
  MemoryDiffItem,
  MemoryGraph,
  MemoryGraphNode,
  MemoryToolCall,
  OnboardingAnswers,
} from '@calmvest/shared';
import { createOpenRouterClient, getOpenRouterRequestDefaults } from './openrouter.js';

interface StructuredMemoryProfile {
  user: {
    name: string;
    age: number;
    investor_level: string;
    communication_style: string;
    household?: string;
    occupation?: string;
    income_stability?: string;
  };
  goals: Array<{
    type: string;
    target_amount: number;
    target_date: string;
    priority: string;
    notes?: string;
  }>;
  risk_profile: {
    risk_comfort: string;
    panic_response: string;
    liquidity_need: string;
    time_horizon?: string;
  };
  tax_profile: {
    taxable_account: boolean;
    tax_sensitivity: string;
    notes: string;
  };
  values: string[];
  preferences: {
    explanation_style: string;
    decision_style: string;
    constraints: string[];
  };
  life_context: {
    near_term_events: string[];
    cash_flow_notes: string;
    open_questions: string[];
  };
  memory_markdown: string;
  tool_calls: MemoryToolCall[];
}

export function buildMemoryFromOnboarding(
  answers: OnboardingAnswers,
  baseContext: ContextPacket,
): { memoryMarkdown: string; contextPacket: ContextPacket; diff: MemoryDiffItem[] } {
  const normalized = normalizeAnswers(answers);
  const contextPacket: ContextPacket = {
    ...baseContext,
    goals: [
      {
        type: normalized.goal,
        target_amount: normalized.targetAmount,
        target_date: normalized.targetDate,
        priority: 'high',
      },
    ],
    risk_profile: {
      risk_comfort: normalized.drawdownFeeling.toLowerCase().includes('worried')
        ? 'moderate_cautious'
        : 'moderate',
      panic_response: normalized.drawdownFeeling,
      liquidity_need: normalized.withdrawalNeed,
    },
    accounts_summary: {
      ...baseContext.accounts_summary,
      taxable: normalized.taxableAccount,
    },
    constraints: {
      ...baseContext.constraints,
      prefer_tax_aware: normalized.taxableAccount,
    },
    user: {
      ...baseContext.user,
      communication_style: normalized.communicationStyle,
    },
  };

  const memoryMarkdown = `# Northstar Memory: ${contextPacket.user.name}

## Identity
- Beginner investor
- Prefers ${normalized.communicationStyle} explanations

## Goals
- ${normalized.goal}: $${normalized.targetAmount.toLocaleString()} target by ${normalized.targetDate}

## Risk and Liquidity
- Drawdown feeling: ${normalized.drawdownFeeling}
- Liquidity note: ${normalized.withdrawalNeed}

## Tax and Constraints
- Taxable account: ${normalized.taxableAccount ? 'yes' : 'no'}
- No automatic trading
- Explain cost, tax, confidence, and approval status for recommendations

## Values
- ${normalized.values || 'No special values preference captured yet'}

## Open Questions
- Confirm income stability
- Confirm exact house purchase timing
`;

  return {
    memoryMarkdown,
    contextPacket,
    diff: [
      { kind: 'added', label: 'Goal', value: `${normalized.goal} by ${normalized.targetDate}` },
      { kind: 'updated', label: 'Risk comfort', value: contextPacket.risk_profile.risk_comfort },
      { kind: 'created', label: 'Liquidity need', value: normalized.withdrawalNeed },
      { kind: 'set', label: 'Communication preference', value: normalized.communicationStyle },
    ],
  };
}

export async function buildComprehensiveMemoryFromOnboarding(
  answers: OnboardingAnswers,
  seed: DemoSeed,
): Promise<{
  memoryMarkdown: string;
  contextPacket: ContextPacket;
  diff: MemoryDiffItem[];
  toolCalls: MemoryToolCall[];
  source: 'llm' | 'deterministic';
}> {
  const profile = await createStructuredMemoryProfile(answers, seed);
  const usedLlm = Boolean(createOpenRouterClient() && answers.profileText?.trim());
  const contextPacket = profileToContextPacket(profile, seed.contextPacket);
  return {
    memoryMarkdown: profile.memory_markdown,
    contextPacket,
    diff: profileToDiff(profile, contextPacket),
    toolCalls: profile.tool_calls,
    source: usedLlm ? 'llm' : 'deterministic',
  };
}

async function createStructuredMemoryProfile(
  answers: OnboardingAnswers,
  seed: DemoSeed,
): Promise<StructuredMemoryProfile> {
  const client = createOpenRouterClient();
  if (!client || !answers.profileText?.trim()) {
    return deterministicProfile(answers, seed);
  }

  const prompt = `You are Northstar's onboarding memory compiler.

Convert the user's full natural-language onboarding intake into an official durable financial memory.

Respond with ONLY valid JSON in this exact shape:
{
  "user": {
    "name": "string",
    "age": 0,
    "investor_level": "string",
    "communication_style": "string",
    "household": "string",
    "occupation": "string",
    "income_stability": "string"
  },
  "goals": [
    {
      "type": "string",
      "target_amount": 0,
      "target_date": "YYYY-MM or unknown",
      "priority": "high|medium|low",
      "notes": "string"
    }
  ],
  "risk_profile": {
    "risk_comfort": "string",
    "panic_response": "string",
    "liquidity_need": "string",
    "time_horizon": "string"
  },
  "tax_profile": {
    "taxable_account": true,
    "tax_sensitivity": "string",
    "notes": "string"
  },
  "values": ["string"],
  "preferences": {
    "explanation_style": "string",
    "decision_style": "string",
    "constraints": ["string"]
  },
  "life_context": {
    "near_term_events": ["string"],
    "cash_flow_notes": "string",
    "open_questions": ["string"]
  },
  "memory_markdown": "A complete memory.md document with sections: Identity, Household and Work, Goals, Accounts, Risk and Behavior, Liquidity, Tax, Values, Communication, Constraints, Agent Usage, Open Questions.",
  "tool_calls": [
    {
      "tool": "create_user_profile|create_goal|create_life_event|create_user_value|create_risk_profile|create_tax_profile|set_communication_preferences|commit_onboarding_profile",
      "args": {},
      "result": "string"
    }
  ]
}

Rules:
- Use the existing user as the base person: ${JSON.stringify(seed.user)}.
- Use account facts as known facts: ${JSON.stringify(seed.contextPacket.accounts_summary)}.
- Include multiple goals if the user mentions them.
- Do not invent precise facts where the user was vague; write "unknown" or add an open question.
- Include tool calls that represent the profile setup work.
- memory_markdown must be comprehensive, plain-English, and suitable to save as the official memory.md.

User intake:
${answers.profileText}`;

  const completion = await client.chat.completions.create({
    ...getOpenRouterRequestDefaults(),
    messages: [
      { role: 'system', content: 'You return strict JSON only. No markdown fences.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return deterministicProfile(answers, seed);

  try {
    return normalizeProfile(JSON.parse(content) as Partial<StructuredMemoryProfile>, seed, answers);
  } catch {
    return deterministicProfile(answers, seed);
  }
}

function deterministicProfile(answers: OnboardingAnswers, seed: DemoSeed): StructuredMemoryProfile {
  const normalized = normalizeAnswers(answers);
  const values = splitList(normalized.values || 'Avoid unnecessary complexity, explain tradeoffs before action');
  const profile: StructuredMemoryProfile = {
    user: {
      ...seed.user,
      communication_style: normalized.communicationStyle,
      household: 'unknown',
      occupation: 'unknown',
      income_stability: 'unknown',
    },
    goals: [
      {
        type: normalized.goal,
        target_amount: normalized.targetAmount,
        target_date: normalized.targetDate,
        priority: 'high',
        notes: 'Captured from onboarding intake.',
      },
    ],
    risk_profile: {
      risk_comfort: normalized.drawdownFeeling.toLowerCase().includes('worried')
        ? 'moderate_cautious'
        : 'moderate',
      panic_response: normalized.drawdownFeeling,
      liquidity_need: normalized.withdrawalNeed,
      time_horizon: normalized.targetDate,
    },
    tax_profile: {
      taxable_account: normalized.taxableAccount,
      tax_sensitivity: normalized.taxableAccount ? 'tax-aware' : 'unknown',
      notes: normalized.taxableAccount
        ? 'Taxable account should be considered before sales or withdrawals.'
        : 'Taxable account not confirmed.',
    },
    values,
    preferences: {
      explanation_style: normalized.communicationStyle,
      decision_style: 'Show clear options and require approval before action.',
      constraints: ['No automatic trading', 'Explain costs', 'Explain tax impact', 'Show confidence'],
    },
    life_context: {
      near_term_events: [normalized.withdrawalNeed],
      cash_flow_notes: 'Monthly cash-flow details not fully captured yet.',
      open_questions: ['Confirm income stability', 'Confirm household obligations', 'Confirm emergency fund target'],
    },
    memory_markdown: '',
    tool_calls: [],
  };

  profile.memory_markdown = renderMemoryMarkdown(profile, seed);
  profile.tool_calls = createMemoryToolCalls(profile, seed.user.id);
  return profile;
}

function normalizeProfile(
  profile: Partial<StructuredMemoryProfile>,
  seed: DemoSeed,
  answers: OnboardingAnswers,
): StructuredMemoryProfile {
  const fallback = deterministicProfile(answers, seed);
  const normalized: StructuredMemoryProfile = {
    ...fallback,
    ...profile,
    user: { ...fallback.user, ...(profile.user ?? {}) },
    goals: profile.goals?.length ? profile.goals : fallback.goals,
    risk_profile: { ...fallback.risk_profile, ...(profile.risk_profile ?? {}) },
    tax_profile: { ...fallback.tax_profile, ...(profile.tax_profile ?? {}) },
    preferences: { ...fallback.preferences, ...(profile.preferences ?? {}) },
    life_context: { ...fallback.life_context, ...(profile.life_context ?? {}) },
    values: profile.values?.length ? profile.values : fallback.values,
    tool_calls: profile.tool_calls?.length ? profile.tool_calls : fallback.tool_calls,
  };
  normalized.memory_markdown = profile.memory_markdown?.trim()
    ? profile.memory_markdown
    : renderMemoryMarkdown(normalized, seed);
  return normalized;
}

function profileToContextPacket(profile: StructuredMemoryProfile, baseContext: ContextPacket): ContextPacket {
  return {
    ...baseContext,
    user: {
      ...baseContext.user,
      name: profile.user.name || baseContext.user.name,
      age: Number(profile.user.age || baseContext.user.age),
      investor_level: profile.user.investor_level || baseContext.user.investor_level,
      communication_style: profile.user.communication_style || profile.preferences.explanation_style,
    },
    goals: profile.goals.map((goal) => ({
      type: goal.type,
      target_amount: Number(goal.target_amount || 0),
      target_date: goal.target_date || 'unknown',
      priority: goal.priority || 'medium',
    })),
    risk_profile: {
      risk_comfort: profile.risk_profile.risk_comfort,
      panic_response: profile.risk_profile.panic_response,
      liquidity_need: profile.risk_profile.liquidity_need,
    },
    accounts_summary: {
      ...baseContext.accounts_summary,
      taxable: Boolean(profile.tax_profile.taxable_account),
    },
    constraints: {
      no_auto_trade: true,
      prefer_tax_aware: Boolean(profile.tax_profile.taxable_account),
      explain_costs: true,
    },
  };
}

function profileToDiff(profile: StructuredMemoryProfile, contextPacket: ContextPacket): MemoryDiffItem[] {
  return [
    { kind: 'set', label: 'Full memory profile', value: `${profile.user.name} profile compiled` },
    { kind: 'added', label: 'Goals', value: `${contextPacket.goals.length} goal${contextPacket.goals.length === 1 ? '' : 's'} captured` },
    { kind: 'updated', label: 'Risk and liquidity', value: contextPacket.risk_profile.liquidity_need },
    { kind: 'set', label: 'Values and preferences', value: profile.values.join(', ') || 'Captured' },
  ];
}

function normalizeAnswers(answers: OnboardingAnswers): Required<OnboardingAnswers> {
  return {
    userId: answers.userId,
    profileText: answers.profileText ?? '',
    goal: answers.goal || 'unknown',
    targetAmount: Number(answers.targetAmount || 0),
    targetDate: answers.targetDate || 'unknown',
    withdrawalNeed: answers.withdrawalNeed || 'unknown',
    drawdownFeeling: answers.drawdownFeeling || 'unknown',
    taxableAccount: answers.taxableAccount ?? false,
    communicationStyle: answers.communicationStyle || 'Plain English with clear next steps',
    values: answers.values || '',
  };
}

function renderMemoryMarkdown(profile: StructuredMemoryProfile, seed: DemoSeed): string {
  const goals = profile.goals
    .map((goal) => `- ${goal.type}: $${goal.target_amount.toLocaleString()} by ${goal.target_date} (${goal.priority}). ${goal.notes ?? ''}`)
    .join('\n');
  return `# Northstar Memory: ${profile.user.name}

## Identity
- Name: ${profile.user.name}
- Age: ${profile.user.age}
- Investor level: ${profile.user.investor_level}
- Communication style: ${profile.user.communication_style}
- Work: ${profile.user.occupation ?? 'unknown'}
- Household: ${profile.user.household ?? 'unknown'}
- Income stability: ${profile.user.income_stability ?? 'unknown'}

## Goals
${goals}

## Accounts
- Brokerage count: ${seed.contextPacket.accounts_summary.brokerage_count}
- Portfolio value: $${seed.contextPacket.accounts_summary.portfolio_value.toLocaleString()}
- Cash available: $${seed.contextPacket.accounts_summary.cash_available.toLocaleString()}
- Taxable account: ${profile.tax_profile.taxable_account ? 'yes' : 'no'}

## Risk and Behavior
- Risk comfort: ${profile.risk_profile.risk_comfort}
- Panic response: ${profile.risk_profile.panic_response}
- Time horizon: ${profile.risk_profile.time_horizon ?? 'unknown'}

## Liquidity
- Liquidity need: ${profile.risk_profile.liquidity_need}
- Cash-flow notes: ${profile.life_context.cash_flow_notes}

## Tax
- Tax sensitivity: ${profile.tax_profile.tax_sensitivity}
- Notes: ${profile.tax_profile.notes}

## Values
${profile.values.map((value) => `- ${value}`).join('\n')}

## Communication
- Explanation style: ${profile.preferences.explanation_style}
- Decision style: ${profile.preferences.decision_style}

## Constraints
${profile.preferences.constraints.map((constraint) => `- ${constraint}`).join('\n')}

## Agent Usage
- Goal Agent uses Goals, Cash Flow, and Liquidity.
- Scenario Agent uses Goals, Risk, Accounts, and Life Context.
- Tax Agent uses Tax Profile, Accounts, Holdings, and Cost Basis.
- Rebalance Agent uses Goals, Liquidity, Risk, Tax, and Portfolio Features.
- Communication Agent uses Values, Communication, and Decision Style.

## Open Questions
${profile.life_context.open_questions.map((question) => `- ${question}`).join('\n')}
`;
}

function createMemoryToolCalls(profile: StructuredMemoryProfile, userId: string): MemoryToolCall[] {
  const calls: MemoryToolCall[] = [
    { tool: 'create_user_profile', args: { user: profile.user }, result: 'User profile created' },
    { tool: 'create_risk_profile', args: profile.risk_profile, result: 'Risk profile created' },
    { tool: 'create_tax_profile', args: profile.tax_profile, result: 'Tax profile created' },
    {
      tool: 'set_communication_preferences',
      args: profile.preferences,
      result: 'Communication preferences set',
    },
  ];
  for (const goal of profile.goals) {
    calls.push({ tool: 'create_goal', args: goal, result: `Goal created: ${goal.type}` });
  }
  for (const value of profile.values) {
    calls.push({ tool: 'create_user_value', args: { value }, result: `Value created: ${value}` });
  }
  calls.push({
    tool: 'commit_onboarding_profile',
    args: { userId },
    result: 'Official memory.md and context_packet.json committed',
  });
  return calls;
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n.]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
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
    value: formatPersonValue(contextPacket),
    source: 'User profile',
    usedBy: ['Orchestrator', 'Communication Agent'],
  };

  const nodes: MemoryGraphNode[] = [
    center,
    {
      id: 'goals',
      label: 'Goals',
      kind: 'goal',
      value: formatGoalsValue(contextPacket.goals),
      source: 'Onboarding',
      usedBy: ['Goal Agent', 'Scenario Agent', 'Rebalance Agent'],
    },
    {
      id: 'risk',
      label: 'Risk Comfort',
      kind: 'risk',
      value: formatRiskValue(contextPacket),
      source: 'Onboarding',
      usedBy: ['Scenario Agent', 'Communication Agent'],
    },
    {
      id: 'accounts',
      label: 'Accounts',
      kind: 'account',
      value: formatAccountsValue(contextPacket),
      source: 'Account link',
      usedBy: ['Portfolio Agent', 'Tax Agent', 'Rebalance Agent'],
    },
    {
      id: 'tax',
      label: 'Tax Profile',
      kind: 'tax',
      value: contextPacket.accounts_summary.taxable ? 'Taxable brokerage detected' : 'Taxable account not confirmed yet',
      source: 'Account link + onboarding',
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
      value: formatCashFlowValue(contextPacket),
      source: 'Account link',
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

function formatPersonValue(contextPacket: ContextPacket) {
  const details = [
    contextPacket.user.age > 0 ? `${contextPacket.user.age}` : '',
    cleanMemoryText(contextPacket.user.investor_level),
  ].filter(Boolean);
  return details.length ? details.join(', ') : 'Active memory profile';
}

function formatGoalsValue(goals: ContextPacket['goals']) {
  if (!goals.length) return 'No committed goals yet';
  return goals
    .map((goal) => {
      const parts = [
        Number(goal.target_amount) > 0 ? `$${Number(goal.target_amount).toLocaleString()}` : 'target amount TBD',
        isKnown(goal.target_date) ? `by ${goal.target_date}` : 'timeline TBD',
      ];
      return `${cleanMemoryText(goal.type)}: ${parts.join(', ')}`;
    })
    .join('; ');
}

function formatRiskValue(contextPacket: ContextPacket) {
  const parts = [
    cleanMemoryText(contextPacket.risk_profile.risk_comfort),
    cleanMemoryText(contextPacket.risk_profile.panic_response),
  ].filter((part) => isKnown(part));
  return parts.length ? parts.join('; ') : 'Risk profile not filled in yet';
}

function formatAccountsValue(contextPacket: ContextPacket) {
  const summary = contextPacket.accounts_summary;
  if (summary.brokerage_count === 0 && summary.portfolio_value === 0) {
    return 'No account context loaded yet';
  }
  return `${summary.brokerage_count} brokerage account${summary.brokerage_count === 1 ? '' : 's'}; $${summary.portfolio_value.toLocaleString()} portfolio`;
}

function formatCashFlowValue(contextPacket: ContextPacket) {
  const cash = contextPacket.accounts_summary.cash_available;
  const coverage = Math.round(contextPacket.portfolio_features.liquidity_coverage * 100);
  if (cash === 0 && coverage === 0) return 'Cash flow not filled in yet';
  return `Cash available: $${cash.toLocaleString()}; liquidity coverage ${coverage}%`;
}

function cleanMemoryText(value: string) {
  return value.trim().replace(/_/g, ' ');
}

function isKnown(value: string) {
  return Boolean(value.trim()) && !/^unknown$/i.test(value.trim());
}
