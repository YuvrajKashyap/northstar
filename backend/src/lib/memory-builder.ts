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

interface OnboardingDraft {
  user: StructuredMemoryProfile['user'];
  goals: StructuredMemoryProfile['goals'];
  risk_profile: StructuredMemoryProfile['risk_profile'];
  tax_profile: StructuredMemoryProfile['tax_profile'];
  values: string[];
  preferences: StructuredMemoryProfile['preferences'];
  life_context: StructuredMemoryProfile['life_context'];
  memory_markdown: string;
}

const onboardingToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Create one durable financial goal from onboarding intake. Call once per distinct goal.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          target_amount: { type: 'number' },
          target_date: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          notes: { type: 'string' },
        },
        required: ['type', 'target_amount', 'target_date', 'priority', 'notes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_communication_style',
      description: 'Set how North should explain decisions to this user.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          communication_style: { type: 'string' },
          explanation_style: { type: 'string' },
          decision_style: { type: 'string' },
        },
        required: ['communication_style', 'explanation_style', 'decision_style'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_risk_comfort',
      description: 'Set the user risk comfort, panic response, liquidity need, and time horizon.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          risk_comfort: { type: 'string' },
          panic_response: { type: 'string' },
          liquidity_need: { type: 'string' },
          time_horizon: { type: 'string' },
        },
        required: ['risk_comfort', 'panic_response', 'liquidity_need', 'time_horizon'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_value',
      description: 'Create one durable user value or preference from onboarding. Call once per distinct value.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          value: { type: 'string' },
        },
        required: ['value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_memory_markdown',
      description: 'Write the final durable memory.md body for North to load on every run.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          markdown: { type: 'string' },
        },
        required: ['markdown'],
      },
    },
  },
] as const;

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

  const normalized = normalizeAnswers(answers);
  const draft = createOnboardingDraft(answers, seed);
  const prompt = [
    'Compile this onboarding intake by calling tools. Do not return JSON.',
    '',
    'Required behavior:',
    '- Call create_goal once for every distinct goal you infer.',
    '- Call create_value once for every durable value or preference you infer.',
    '- Call set_communication_style exactly once.',
    '- Call set_risk_comfort exactly once.',
    '- Call write_memory_markdown exactly once with a complete memory.md.',
    '- You may call multiple tools in parallel.',
    '- Do not invent precise facts. Use "unknown" or include open questions when needed.',
    '- The memory.md must describe one agent named North using specialist tools, not multiple agents.',
    '',
    `Base user: ${JSON.stringify(seed.user)}`,
    `Known accounts summary: ${JSON.stringify(seed.contextPacket.accounts_summary)}`,
    `Fallback goal: ${normalized.goal}, ${normalized.targetAmount}, ${normalized.targetDate}`,
    '',
    `User intake:\n${answers.profileText}`,
  ].join('\n');

  try {
    const completion = await client.chat.completions.create({
      ...getOpenRouterRequestDefaults(),
      messages: [
        {
          role: 'system',
          content:
            'You are Northstar onboarding. Use the supplied tools to write the durable user memory for North. Tool calls are the output.',
        },
        { role: 'user', content: prompt },
      ],
      tools: onboardingToolDefinitions as never,
      tool_choice: 'auto',
      parallel_tool_calls: true,
    } as never);

    const toolCalls = completion.choices[0]?.message?.tool_calls ?? [];
    if (toolCalls.length === 0) return deterministicProfile(answers, seed);

    const executed: MemoryToolCall[] = [];
    for (const call of toolCalls) {
      const functionCall = 'function' in call ? call.function : undefined;
      const name = functionCall?.name ?? '';
      const args = parseToolArgs(functionCall?.arguments);
      const result = applyOnboardingTool(draft, name, args);
      if (result) executed.push(result);
    }

    const profile = draftToProfile(draft, seed, answers);
    profile.tool_calls = completeRequiredToolCalls(profile, executed);
    return normalizeProfile(profile, seed, answers);
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
  profile.tool_calls = createMemoryToolCalls(profile);
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

function createOnboardingDraft(answers: OnboardingAnswers, seed: DemoSeed): OnboardingDraft {
  const normalized = normalizeAnswers(answers);
  return {
    user: {
      ...seed.user,
      communication_style: normalized.communicationStyle,
      household: 'unknown',
      occupation: 'unknown',
      income_stability: 'unknown',
    },
    goals: [],
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
    values: [],
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
  };
}

function applyOnboardingTool(
  draft: OnboardingDraft,
  name: string,
  args: Record<string, unknown>,
): MemoryToolCall | null {
  if (name === 'create_goal') {
    const goal = {
      type: stringArg(args.type, 'Build long-term financial security'),
      target_amount: numberArg(args.target_amount, 0),
      target_date: stringArg(args.target_date, 'unknown'),
      priority: priorityArg(args.priority),
      notes: stringArg(args.notes, 'Captured from onboarding intake.'),
    };
    draft.goals.push(goal);
    return { tool: 'create_goal', args: goal, result: `Goal created: ${goal.type}` };
  }

  if (name === 'set_communication_style') {
    const communicationStyle = stringArg(args.communication_style, draft.user.communication_style);
    draft.user.communication_style = communicationStyle;
    draft.preferences.explanation_style = stringArg(args.explanation_style, communicationStyle);
    draft.preferences.decision_style = stringArg(args.decision_style, draft.preferences.decision_style);
    return {
      tool: 'set_communication_style',
      args: {
        communication_style: draft.user.communication_style,
        explanation_style: draft.preferences.explanation_style,
        decision_style: draft.preferences.decision_style,
      },
      result: 'Communication style set',
    };
  }

  if (name === 'set_risk_comfort') {
    draft.risk_profile = {
      risk_comfort: stringArg(args.risk_comfort, draft.risk_profile.risk_comfort),
      panic_response: stringArg(args.panic_response, draft.risk_profile.panic_response),
      liquidity_need: stringArg(args.liquidity_need, draft.risk_profile.liquidity_need),
      time_horizon: stringArg(args.time_horizon, draft.risk_profile.time_horizon ?? 'unknown'),
    };
    return {
      tool: 'set_risk_comfort',
      args: draft.risk_profile,
      result: 'Risk comfort set',
    };
  }

  if (name === 'create_value') {
    const value = stringArg(args.value, '').trim();
    if (!value) return null;
    if (!draft.values.includes(value)) draft.values.push(value);
    return { tool: 'create_value', args: { value }, result: `Value created: ${value}` };
  }

  if (name === 'write_memory_markdown') {
    draft.memory_markdown = stringArg(args.markdown, '').trim();
    return {
      tool: 'write_memory_markdown',
      args: { bytes: draft.memory_markdown.length },
      result: 'memory.md written',
    };
  }

  return null;
}

function draftToProfile(draft: OnboardingDraft, seed: DemoSeed, answers: OnboardingAnswers): StructuredMemoryProfile {
  const fallback = deterministicProfile(answers, seed);
  const profile: StructuredMemoryProfile = {
    ...fallback,
    ...draft,
    goals: draft.goals.length ? draft.goals : fallback.goals,
    values: draft.values.length ? draft.values : fallback.values,
    memory_markdown: draft.memory_markdown,
    tool_calls: [],
  };
  if (!profile.memory_markdown) profile.memory_markdown = renderMemoryMarkdown(profile, seed);
  return profile;
}

function parseToolArgs(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function stringArg(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberArg(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function priorityArg(value: unknown): 'high' | 'medium' | 'low' {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium';
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

## North Usage
- North always loads this memory.md and the current context_packet.json before answering.
- North uses specialist tools for goals, portfolio data, tax context, market data, filings, search, and receipts.
- North must explain assumptions, costs, tax considerations, confidence, and approval status before any recommendation.
- North never trades, moves money, changes accounts, files taxes, or contacts institutions without explicit approval.

## Open Questions
${profile.life_context.open_questions.map((question) => `- ${question}`).join('\n')}
`;
}

function createMemoryToolCalls(profile: StructuredMemoryProfile): MemoryToolCall[] {
  const calls: MemoryToolCall[] = [
    {
      tool: 'set_communication_style',
      args: {
        communication_style: profile.user.communication_style,
        explanation_style: profile.preferences.explanation_style,
        decision_style: profile.preferences.decision_style,
      },
      result: 'Communication style set',
    },
    { tool: 'set_risk_comfort', args: profile.risk_profile, result: 'Risk comfort set' },
  ];
  for (const goal of profile.goals) {
    calls.push({ tool: 'create_goal', args: goal, result: `Goal created: ${goal.type}` });
  }
  for (const value of profile.values) {
    calls.push({ tool: 'create_value', args: { value }, result: `Value created: ${value}` });
  }
  calls.push({
    tool: 'write_memory_markdown',
    args: { bytes: profile.memory_markdown.length },
    result: 'memory.md written',
  });
  return calls;
}

function completeRequiredToolCalls(
  profile: StructuredMemoryProfile,
  executed: MemoryToolCall[],
): MemoryToolCall[] {
  const calls = executed.length ? [...executed] : createMemoryToolCalls(profile);
  const hasTool = (tool: MemoryToolCall['tool']) => calls.some((call) => call.tool === tool);

  if (!hasTool('create_goal')) {
    for (const goal of profile.goals) {
      calls.push({ tool: 'create_goal', args: goal, result: `Goal created: ${goal.type}` });
    }
  }
  if (!hasTool('create_value')) {
    for (const value of profile.values) {
      calls.push({ tool: 'create_value', args: { value }, result: `Value created: ${value}` });
    }
  }
  if (!hasTool('set_communication_style')) {
    calls.push({
      tool: 'set_communication_style',
      args: {
        communication_style: profile.user.communication_style,
        explanation_style: profile.preferences.explanation_style,
        decision_style: profile.preferences.decision_style,
      },
      result: 'Communication style set',
    });
  }
  if (!hasTool('set_risk_comfort')) {
    calls.push({ tool: 'set_risk_comfort', args: profile.risk_profile, result: 'Risk comfort set' });
  }
  if (!hasTool('write_memory_markdown')) {
    calls.push({
      tool: 'write_memory_markdown',
      args: { bytes: profile.memory_markdown.length },
      result: 'memory.md written',
    });
  }

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
    usedBy: ['North', 'Memory tools'],
  };

  const nodes: MemoryGraphNode[] = [
    center,
    {
      id: 'goals',
      label: 'Goals',
      kind: 'goal',
      value: formatGoalsValue(contextPacket.goals),
      source: 'Onboarding',
      usedBy: ['North', 'Goal tools', 'Scenario tools'],
    },
    {
      id: 'risk',
      label: 'Risk Comfort',
      kind: 'risk',
      value: formatRiskValue(contextPacket),
      source: 'Onboarding',
      usedBy: ['North', 'Risk tools'],
    },
    {
      id: 'accounts',
      label: 'Accounts',
      kind: 'account',
      value: formatAccountsValue(contextPacket),
      source: 'Account link',
      usedBy: ['North', 'Portfolio tools', 'Tax tools'],
    },
    {
      id: 'tax',
      label: 'Tax Profile',
      kind: 'tax',
      value: contextPacket.accounts_summary.taxable ? 'Taxable brokerage detected' : 'Taxable account not confirmed yet',
      source: 'Account link + onboarding',
      usedBy: ['North', 'Tax tools'],
    },
    {
      id: 'values',
      label: 'Values',
      kind: 'values',
      value: contextPacket.constraints.explain_costs ? 'Explain costs and tradeoffs' : 'No values captured',
      source: 'Onboarding',
      usedBy: ['North', 'Communication tools'],
    },
    {
      id: 'cash-flow',
      label: 'Cash Flow',
      kind: 'cash_flow',
      value: formatCashFlowValue(contextPacket),
      source: 'Account link',
      usedBy: ['North', 'Scenario tools'],
    },
    {
      id: 'communication',
      label: 'Communication Style',
      kind: 'communication',
      value: contextPacket.user.communication_style,
      source: 'Onboarding',
      usedBy: ['North', 'Communication tools'],
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
