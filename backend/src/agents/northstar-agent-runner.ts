import { Agent, OpenAIProvider, Runner, tool, type RunStreamEvent } from '@openai/agents';
import type { AgentTraceEvent, AgentRunRequest, ContextPacket, Holding } from '@calmvest/shared';
import { randomUUID } from 'node:crypto';
import type OpenAI from 'openai';
import { config } from '../config.js';
import { appConfig } from '../lib/app-config.js';
import { createOpenRouterClient } from '../lib/openrouter.js';
import { supabase } from '../lib/supabase.js';
import { readDemoSeed } from '../routes/demo.js';
import { appendTraceEvent, createTraceEvent } from './trace-store.js';
import {
  executeNorthstarTool,
  northstarTools,
  type NorthstarToolContext,
} from './northstar-agent-tools.js';

const DEFAULT_AGENT = 'North';
const DEFAULT_MODEL = appConfig.openRouter.models.default;

type NorthRunContext = {
  memoryMarkdown: string;
  contextPacket: ContextPacket;
  portfolio: {
    accounts: unknown[];
    holdings: Holding[];
    taxLots: unknown[];
    recentTransactions: unknown[];
  };
  source: 'database' | 'seed' | 'mixed';
};

export const freshCheckPrompt = [
  'Run a fresh check for this user.',
  'Use memory first, then portfolio context.',
  'If market, company, filing, or web data is needed, use the available read-only tools.',
  'Return a concise summary of what changed, what matters, and what the user should review next.',
].join(' ');

export async function* streamNorthstarAgentRun(request: AgentRunRequest): AsyncGenerator<AgentTraceEvent> {
  const runId = randomUUID();
  const runContext = await loadNorthRunContext(request.userId);
  const toolContext: NorthstarToolContext = {
    userId: request.userId,
    runId,
    toolCounts: new Map(),
    queryCounts: new Map(),
  };

  yield emit(runId, 'run_started', DEFAULT_AGENT, 'North run started', {
    userId: request.userId,
    mode: request.mode ?? 'general',
    model: DEFAULT_MODEL,
    reasoning: appConfig.openRouter.reasoning.effort,
  });

  yield emit(runId, 'memory_loaded', DEFAULT_AGENT, 'Loaded memory.md and context_packet.json', {
    userId: request.userId,
    memoryBytes: runContext.memoryMarkdown.length,
    goals: runContext.contextPacket.goals.length,
    holdings: runContext.portfolio.holdings.length,
    source: runContext.source,
  });

  if (!config.OPENROUTER_API_KEY) {
    const fallbackAnswer = deterministicNorthAnswer(request, runContext);
    yield emit(runId, 'message_delta', DEFAULT_AGENT, 'Assistant response delta', {
      userId: request.userId,
      delta: fallbackAnswer,
      fallback: 'missing_openrouter_key',
    });
    yield emit(runId, 'run_completed', DEFAULT_AGENT, 'North run complete', {
      userId: request.userId,
      finalAnswer: fallbackAnswer,
      runner: 'deterministic-fallback',
    });
    return;
  }

  if ((request.mode ?? 'general') === 'general') {
    const quickState = { finalAnswer: '' };
    const quickTake = quickGeneralAnswer(request, runContext);
    if (quickTake) {
      quickState.finalAnswer = quickTake;
      yield emit(runId, 'message_delta', DEFAULT_AGENT, 'Immediate Northstar response', {
        userId: request.userId,
        delta: quickTake,
        immediate: true,
      });
    }
    for await (const event of streamWithChatCompletions(request, toolContext, runContext, quickState, false)) {
      yield event;
    }
    if (!quickState.finalAnswer.trim()) {
      quickState.finalAnswer = deterministicNorthAnswer(request, runContext);
      yield emit(runId, 'message_delta', DEFAULT_AGENT, 'Assistant response delta', {
        userId: request.userId,
        delta: quickState.finalAnswer,
        fallback: 'empty_general_chat_output',
      });
    }
    yield emit(runId, 'run_completed', DEFAULT_AGENT, 'North run complete', {
      userId: request.userId,
      finalAnswer: quickState.finalAnswer,
      runner: 'openai-chat-completions-fast',
    });
    return;
  }

  const sdkState = { finalAnswer: '' };
  let sdkEmitted = false;
  try {
    for await (const event of runWithAgentsSdk(request, toolContext, runContext, sdkState)) {
      sdkEmitted = true;
      yield event;
    }
    if (!sdkState.finalAnswer.trim()) {
      sdkState.finalAnswer = deterministicNorthAnswer(request, runContext);
      yield emit(runId, 'message_delta', DEFAULT_AGENT, 'Assistant response delta', {
        userId: request.userId,
        delta: sdkState.finalAnswer,
        fallback: 'empty_agents_sdk_output',
      });
    }
    yield emit(runId, 'run_completed', DEFAULT_AGENT, 'North run complete', {
      userId: request.userId,
      finalAnswer: sdkState.finalAnswer,
      runner: 'openai-agents-sdk',
    });
    return;
  } catch (error) {
    if (sdkEmitted) {
      yield emit(runId, 'error', DEFAULT_AGENT, 'Agents SDK stream failed', {
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error),
        runner: 'openai-agents-sdk',
      });
      return;
    }

    yield emit(runId, 'handoff', DEFAULT_AGENT, 'Using Chat Completions fallback', {
      userId: request.userId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  const fallbackState = { finalAnswer: '' };
  for await (const event of streamWithChatCompletions(request, toolContext, runContext, fallbackState)) {
    yield event;
  }

  if (!fallbackState.finalAnswer.trim()) {
    fallbackState.finalAnswer = deterministicNorthAnswer(request, runContext);
    yield emit(runId, 'message_delta', DEFAULT_AGENT, 'Assistant response delta', {
      userId: request.userId,
      delta: fallbackState.finalAnswer,
      fallback: 'empty_chat_completions_output',
    });
  }

  yield emit(runId, 'run_completed', DEFAULT_AGENT, 'North run complete', {
    userId: request.userId,
    finalAnswer: fallbackState.finalAnswer,
    runner: 'openai-chat-completions',
  });
}

async function* runWithAgentsSdk(
  request: AgentRunRequest,
  toolContext: NorthstarToolContext,
  runContext: NorthRunContext,
  state: { finalAnswer: string },
): AsyncGenerator<AgentTraceEvent> {
  const openAIClient = createOpenRouterClient();
  if (!openAIClient) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }
  const modelProvider = new OpenAIProvider({
    baseURL: appConfig.openRouter.baseURL,
    useResponses: false,
    openAIClient: openAIClient as never,
  });
  const runner = new Runner({
    model: DEFAULT_MODEL,
    modelProvider,
    tracingDisabled: true,
    traceIncludeSensitiveData: false,
    modelSettings: {
      parallelToolCalls: false,
      store: false,
      reasoning: { effort: appConfig.openRouter.reasoning.effort },
      providerData: {
        extra_body: { reasoning: appConfig.openRouter.reasoning },
      },
    },
  });

  const agent = new Agent<NorthstarToolContext>({
    name: DEFAULT_AGENT,
    instructions: buildAgentInstructions(request.userId, runContext),
    tools: northstarTools.map((definition) =>
      tool({
        name: definition.name,
        description: definition.description,
        parameters: definition.schema as never,
        execute: async (args) => JSON.stringify(await executeNorthstarTool(definition.name, args as Record<string, unknown>, toolContext)),
      }),
    ),
    model: DEFAULT_MODEL,
  });

  const result = await runner.run(agent, buildUserMessage(request, runContext), {
    stream: true,
    maxTurns: 8,
    context: toolContext,
  });

  for await (const sdkEvent of result) {
    const mapped = mapAgentsSdkEvent(sdkEvent, toolContext.runId, request.userId);
    for (const event of mapped) {
      if (event.type === 'message_delta') {
        const delta = typeof event.payload.delta === 'string' ? event.payload.delta : '';
        state.finalAnswer += delta;
      }
      await appendTraceEvent(event);
      yield event;
    }
  }

  await result.completed;
  const finalOutput = typeof result.finalOutput === 'string' ? result.finalOutput : '';
  if (finalOutput && !state.finalAnswer) state.finalAnswer = finalOutput;
}

async function* streamWithChatCompletions(
  request: AgentRunRequest,
  toolContext: NorthstarToolContext,
  runContext: NorthRunContext,
  state: { finalAnswer: string },
  allowTools = true,
): AsyncGenerator<AgentTraceEvent> {
  const client = createOpenRouterClient();
  if (!client) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildAgentInstructions(request.userId, runContext) },
    { role: 'user', content: buildUserMessage(request, runContext) },
  ];

  for (let turn = 0; turn < 8; turn += 1) {
    const requestBody: Record<string, unknown> = {
      model: DEFAULT_MODEL,
      messages,
      stream: true,
      reasoning: appConfig.openRouter.reasoning,
    };
    if (allowTools) {
      requestBody.tools = northstarTools.map((definition) => ({
        type: 'function',
        function: {
          name: definition.name,
          description: definition.description,
          parameters: definition.jsonSchema,
        },
      }));
      requestBody.tool_choice = 'auto';
      requestBody.parallel_tool_calls = false;
    }

    const stream = (await client.chat.completions.create(requestBody as never)) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

    let assistantContent = '';
    const pendingToolCalls = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const content = typeof delta?.content === 'string' ? delta.content : '';
      if (content) {
        assistantContent += content;
        state.finalAnswer += content;
        yield emit(toolContext.runId, 'message_delta', DEFAULT_AGENT, 'Assistant response delta', {
          userId: request.userId,
          delta: content,
        });
      }

      for (const toolCall of delta?.tool_calls ?? []) {
        const index = toolCall.index;
        const current = pendingToolCalls.get(index) ?? { id: '', name: '', arguments: '' };
        pendingToolCalls.set(index, {
          id: toolCall.id ?? current.id,
          name: toolCall.function?.name ?? current.name,
          arguments: `${current.arguments}${toolCall.function?.arguments ?? ''}`,
        });
      }
    }

    if (pendingToolCalls.size === 0) {
      messages.push({ role: 'assistant', content: assistantContent || state.finalAnswer });
      break;
    }

    const toolCalls = [...pendingToolCalls.values()].filter((call) => call.id && call.name);
    messages.push({
      role: 'assistant',
      content: assistantContent || null,
      tool_calls: toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments || '{}' },
      })),
    });

    for (const call of toolCalls) {
      const args = parseToolArguments(call.arguments);
      yield emit(toolContext.runId, 'tool_call', DEFAULT_AGENT, call.name, {
        userId: request.userId,
        args,
        visibleToUser: true,
      });

      const result = await executeNorthstarTool(call.name, args, toolContext);
      if (result.warning) {
        yield emit(toolContext.runId, 'tool_warning', DEFAULT_AGENT, `${call.name} warning`, {
          userId: request.userId,
          warning: result.warning,
        });
      }
      yield emit(toolContext.runId, 'tool_result', DEFAULT_AGENT, `${call.name} complete`, {
        userId: request.userId,
        toolName: call.name,
        result,
        visibleToUser: true,
      });

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }

    yield emit(toolContext.runId, 'handoff', DEFAULT_AGENT, 'Returned tool context to agent', {
      userId: request.userId,
      toolCount: toolCalls.length,
    });
  }
}

function mapAgentsSdkEvent(sdkEvent: RunStreamEvent, runId: string, userId: string): AgentTraceEvent[] {
  const raw = sdkEvent as unknown as Record<string, unknown>;
  if (raw.type === 'raw_model_stream_event') {
    const delta = extractTextDelta(raw.data);
    return delta
      ? [createTraceEvent(runId, 'message_delta', DEFAULT_AGENT, 'Assistant response delta', { userId, delta })]
      : [];
  }

  if (raw.type !== 'run_item_stream_event') return [];

  const name = String(raw.name ?? '');
  const item = raw.item as Record<string, unknown> | undefined;
  const rawItem = (item?.rawItem as Record<string, unknown> | undefined) ?? item ?? {};

  if (name === 'tool_called') {
    const toolName = String(rawItem.name ?? rawItem.toolName ?? 'tool_call');
    return [
      createTraceEvent(runId, 'tool_call', DEFAULT_AGENT, toolName, {
        userId,
        args: parseToolArguments(rawItem.arguments),
        visibleToUser: true,
      }),
    ];
  }

  if (name === 'tool_output') {
    const toolName = String(rawItem.name ?? rawItem.toolName ?? 'tool_result');
    const result = rawItem.output ?? rawItem.result ?? rawItem;
    return [
      createTraceEvent(runId, 'tool_result', DEFAULT_AGENT, `${toolName} complete`, {
        userId,
        toolName,
        result,
        visibleToUser: true,
      }),
    ];
  }

  if (name === 'handoff_requested' || name === 'handoff_occurred') {
    return [
      createTraceEvent(runId, 'handoff', DEFAULT_AGENT, name === 'handoff_occurred' ? 'Handoff occurred' : 'Handoff requested', {
        userId,
      }),
    ];
  }

  return [];
}

function extractTextDelta(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const record = data as Record<string, unknown>;
  if (typeof record.delta === 'string') return record.delta;
  if (typeof record.text === 'string') return record.text;
  const choices = record.choices;
  if (Array.isArray(choices)) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const delta = first?.delta as Record<string, unknown> | undefined;
    if (typeof delta?.content === 'string') return delta.content;
  }
  const nested = record.data ?? record.event ?? record.response;
  return nested === data ? '' : extractTextDelta(nested);
}

function parseToolArguments(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return { raw: value };
  }
}

async function loadNorthRunContext(userId: string): Promise<NorthRunContext> {
  const seed = await readDemoSeed();
  const [
    { data: memory, error: memoryError },
    { data: packet, error: packetError },
    { data: profile, error: profileError },
    { data: accounts, error: accountsError },
    { data: holdings, error: holdingsError },
    { data: taxLots, error: taxLotsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase.from('memory_documents').select('content, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('context_packets').select('packet, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('demo_auth_users').select('name, email').eq('user_id', userId).maybeSingle(),
    supabase.from('accounts').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('holdings').select('*').eq('user_id', userId).order('value', { ascending: false }),
    supabase.from('tax_lots').select('*').eq('user_id', userId).order('acquired_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('posted_at', { ascending: false })
      .limit(20),
  ]);

  const hasDatabaseMemory = !memoryError && !packetError && (memory?.content || packet?.packet);
  const profileName = !profileError && typeof profile?.name === 'string' && profile.name.trim()
    ? profile.name.trim()
    : userId === seed.user.id
      ? seed.user.name
      : 'Northstar user';
  const fallbackContext = userId === seed.user.id ? seed.contextPacket : emptyRunContextPacket(userId, profileName);
  const contextPacket = (packet?.packet as ContextPacket | undefined) ?? fallbackContext;
  const memoryMarkdown =
    typeof memory?.content === 'string'
      ? memory.content
      : userId === seed.user.id
        ? seed.memoryTemplate
        : emptyRunMemoryMarkdown(contextPacket);
  const hasDatabasePortfolio =
    !accountsError &&
    !holdingsError &&
    !taxLotsError &&
    !transactionsError &&
    Boolean((accounts?.length ?? 0) + (holdings?.length ?? 0) + (taxLots?.length ?? 0) + (transactions?.length ?? 0));

  return {
    memoryMarkdown,
    contextPacket,
    portfolio: hasDatabasePortfolio
      ? {
          accounts: accounts ?? [],
          holdings: mapHoldings(holdings ?? []),
          taxLots: taxLots ?? [],
          recentTransactions: transactions ?? [],
        }
      : userId === seed.user.id
        ? {
          accounts: seed.accounts,
          holdings: seed.holdings,
          taxLots: seed.taxLots,
          recentTransactions: seed.transactions.slice(0, 20),
        }
        : {
          accounts: [],
          holdings: [],
          taxLots: [],
          recentTransactions: [],
        },
    source: hasDatabaseMemory && hasDatabasePortfolio ? 'database' : hasDatabaseMemory || hasDatabasePortfolio || userId !== seed.user.id ? 'mixed' : 'seed',
  };
}

function mapHoldings(rows: Array<Record<string, unknown>>): Holding[] {
  return rows.map((holding) => ({
    symbol: String(holding.symbol ?? ''),
    name: String(holding.name ?? holding.symbol ?? ''),
    assetClass: String(holding.asset_class ?? holding.assetClass ?? 'stock') as Holding['assetClass'],
    quantity: Number(holding.quantity ?? 0),
    price: Number(holding.price ?? 0),
    value: Number(holding.value ?? 0),
    costBasis: Number(holding.cost_basis ?? holding.costBasis ?? 0),
    sector: typeof holding.sector === 'string' ? holding.sector : undefined,
  }));
}

function deterministicNorthAnswer(request: AgentRunRequest, context: NorthRunContext): string {
  const userName = displayUserName(context.contextPacket);
  const northStar = inferNorthStar(context);
  const risk = cleanContextText(context.contextPacket.risk_profile.risk_comfort) || 'risk comfort not fully captured';
  const liquidity = cleanContextText(context.contextPacket.risk_profile.liquidity_need) || 'liquidity needs still need confirmation';
  const goals = context.contextPacket.goals
    .map((goal) => `${goal.type.replace(/_/g, ' ')} (${money(goal.target_amount)} by ${goal.target_date})`)
    .join(', ');
  const topHolding = context.portfolio.holdings[0];
  const modeLine =
    request.mode === 'fresh_check'
      ? 'Fresh check fallback: live model access is unavailable, so I used the loaded memory, context packet, and deterministic portfolio snapshot.'
      : 'Local fallback: live model access is unavailable, so I used the loaded memory, context packet, and deterministic portfolio snapshot.';
  return [
    modeLine,
    '',
    `${firstName(userName)}, based on your Northstar memory, I would optimize this around: ${northStar}.`,
    `Your saved context says risk comfort is ${risk}, liquidity context is ${liquidity}, and primary goals are: ${goals || 'not captured yet'}.`,
    `Portfolio snapshot available to North: ${money(context.contextPacket.accounts_summary.portfolio_value)} total, ${money(context.contextPacket.accounts_summary.cash_available)} cash${topHolding ? `, top holding ${topHolding.symbol}` : ''}.`,
    deterministicDecisionLine(request.message, northStar),
  ].join('\n');
}

function deterministicDecisionLine(message: string, northStar: string) {
  const vacation = message.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)?\s+(?:vacation|trip)/i);
  if (vacation) {
    const raw = Number(vacation[1].replace(/,/g, ''));
    const amount = raw * (/^(k|thousand)$/i.test(vacation[2] ?? '') ? 1000 : 1);
    return `For the ${money(amount)} vacation question: I would not call it smart by default until the Porsche 911 timeline, emergency fund, and cash runway are protected. Treat it as approval-ready only if it does not slow ${northStar}; otherwise cap it, delay it, or fund it from money already reserved for discretionary spending.`;
  }
  return `For your question "${message}", the personalized default is: protect near-term cash first, avoid tax-sensitive moves without approval, and only say yes to spending or investing decisions that do not weaken ${northStar}.`;
}

function quickGeneralAnswer(request: AgentRunRequest, context: NorthRunContext) {
  const message = request.message;
  const northStar = inferNorthStar(context);
  const userName = firstName(displayUserName(context.contextPacket));
  const vacation = message.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)?\s+(?:vacation|trip)/i);
  if (vacation) {
    const raw = Number(vacation[1].replace(/,/g, ''));
    const amount = raw * (/^(k|thousand)$/i.test(vacation[2] ?? '') ? 1000 : 1);
    return `${userName}, quick take: I would not treat a ${money(amount)} vacation as smart right now unless it is already funded from surplus discretionary cash and does not slow ${northStar}. I am checking the fuller context now.\n\n`;
  }
  if (/\b(can i|should i|is it smart|would it be smart|buy|spend|vacation|trip)\b/i.test(message)) {
    return `${userName}, quick take: I will judge this against your saved goals, cash flexibility, and approval boundaries first. I am checking the fuller context now.\n\n`;
  }
  return '';
}

function money(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function buildAgentInstructions(userId: string, context: NorthRunContext): string {
  const userName = displayUserName(context.contextPacket);
  const userFirstName = firstName(userName);
  const northStar = inferNorthStar(context);
  const contextJson = JSON.stringify(
    {
      contextPacket: context.contextPacket,
      portfolio: {
        accounts: context.portfolio.accounts,
        holdings: context.portfolio.holdings.slice(0, 12),
        taxLots: context.portfolio.taxLots,
        recentTransactions: context.portfolio.recentTransactions,
      },
    },
    null,
    2,
  );
  return [
    'You are North, the single local financial guidance agent running inside the Northstar backend.',
    `Active userId: ${userId}. Do not use fallback personas when this userId is present.`,
    `Active user name: ${userName}. Preferred first-name address: ${userFirstName}.`,
    `This user's North Star: ${northStar}. Every answer must be optimized toward this North Star.`,
    '',
    'Always-loaded memory.md:',
    context.memoryMarkdown,
    '',
    'Always-loaded context_packet.json and portfolio snapshot:',
    contextJson,
    '',
    'Personalization contract:',
    '- Every answer must use the loaded memory.md and context_packet.json before answering. Never give a generic answer when memory exists.',
    `- Address the user naturally by name when it fits, especially for personal decisions. The user is ${userName}, not Maya unless that is the active context name.`,
    '- Tie recommendations to the user-specific goals, cash/liquidity, risk comfort, tax constraints, values, and approval boundaries.',
    '- If the user asks “Can I buy X?”, “Should I do Y?”, or any broad life/financial question, evaluate it against their goals, liquidity, risk capacity, timeline, and North Star.',
    '- If exact data is missing, say what is missing and give a conditional answer using the known memory. Do not invent account values, goals, dates, income, or preferences.',
    '- Finish with the best next step for this specific user, not a generic checklist.',
    '',
    'Operating rules:',
    '- Memory, context_packet.json, and portfolio context are already loaded in this prompt. Use get_memory_context or get_portfolio_context when you need to verify persisted data or retrieve fuller rows.',
    '- Use get_market_data, get_financials, and read_filings for market/company/filing facts when needed.',
    '- Use web_search for current web research that Financial Datasets does not cover. Keep live search/news calls to at most 3 per run.',
    '- If a tool reports unavailable, missing, stale, or partial data, say that plainly and continue with what is known.',
    '- If the user asks to add or update a saved goal, acknowledge the requested memory change plainly. The app may apply saved-goal memory edits after this response.',
    '- Separate education or recommendations from financial execution.',
    '- Never claim you placed trades, moved money, filed taxes, changed accounts, or contacted institutions.',
    '- Do not expose hidden chain-of-thought. Provide concise user-visible rationale and next steps only.',
  ].join('\n');
}

function buildUserMessage(request: AgentRunRequest, context: NorthRunContext): string {
  const modeInstruction =
    request.mode === 'fresh_check'
      ? freshCheckPrompt
      : request.mode === 'demo_scenario'
        ? 'Run this as a scenario-style planning question, using the user memory and requiring approval before any action.'
        : 'Answer this as a personalized Northstar chat message.';
  return [
    modeInstruction,
    `User name: ${displayUserName(context.contextPacket)}`,
    `North Star to optimize for: ${inferNorthStar(context)}`,
    `User message: ${request.message}`,
  ].join('\n');
}

function emptyRunContextPacket(userId: string, name: string): ContextPacket {
  return {
    user: {
      id: userId,
      name,
      age: 0,
      investor_level: '',
      communication_style: 'Plain English with clear next steps',
    },
    goals: [],
    risk_profile: {
      risk_comfort: '',
      panic_response: '',
      liquidity_need: '',
    },
    accounts_summary: {
      taxable: false,
      brokerage_count: 0,
      cash_available: 0,
      portfolio_value: 0,
    },
    portfolio_features: {
      top3_concentration: 0,
      equity_weight: 0,
      cash_weight: 0,
      growth_tech_overlap: '',
      liquidity_coverage: 0,
    },
    constraints: {
      no_auto_trade: true,
      prefer_tax_aware: false,
      explain_costs: true,
    },
  };
}

function emptyRunMemoryMarkdown(contextPacket: ContextPacket) {
  return [
    `# Northstar Memory: ${displayUserName(contextPacket)}`,
    '',
    '## Status',
    '- No committed memory questionnaire has been found for this user yet.',
    '- North must ask for missing details instead of using sample or demo memory.',
    '',
    '## North Usage',
    '- North must keep answers scoped to this signed-in user id.',
    '- North must not borrow goals, risk profile, or account facts from another person.',
  ].join('\n');
}

function displayUserName(contextPacket: ContextPacket) {
  return cleanContextText(contextPacket.user.name) || 'Northstar user';
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there';
}

function inferNorthStar(context: NorthRunContext) {
  const goals = context.contextPacket.goals.filter((goal) => cleanContextText(goal.type));
  const primaryGoal = goals.find((goal) => goal.priority === 'high') ?? goals[0];
  const goalText = primaryGoal
    ? `${cleanContextText(primaryGoal.type).replace(/_/g, ' ')}${primaryGoal.target_amount > 0 ? ` (${money(primaryGoal.target_amount)})` : ''}`
    : '';
  const memoryGoal = context.memoryMarkdown.match(/(?:most important goal|primary goal|north star|financial flexibility)[^\n.]*/i)?.[0];
  const liquidity = cleanContextText(context.contextPacket.risk_profile.liquidity_need);
  if (memoryGoal) return memoryGoal.replace(/^[-*\s]+/, '').trim();
  if (goalText && liquidity) return `${goalText} while preserving ${liquidity.replace(/_/g, ' ')}`;
  if (goalText) return goalText;
  return 'building durable financial flexibility without losing control or taking actions without approval';
}

function cleanContextText(value: string | undefined) {
  if (!value) return '';
  const clean = value.replace(/_/g, ' ').trim();
  return /^(unknown|not filled in yet|null|undefined)$/i.test(clean) ? '' : clean;
}

async function emit(
  runId: string,
  type: AgentTraceEvent['type'],
  agent: string,
  label: string,
  payload: Record<string, unknown>,
): Promise<AgentTraceEvent> {
  const event = createTraceEvent(runId, type, agent, label, payload);
  await appendTraceEvent(event);
  return event;
}
