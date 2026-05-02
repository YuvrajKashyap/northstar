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

  const sdkState = { finalAnswer: '' };
  let sdkEmitted = false;
  try {
    for await (const event of runWithAgentsSdk(request, toolContext, runContext, sdkState)) {
      sdkEmitted = true;
      yield event;
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

  const result = await runner.run(agent, request.message, {
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
): AsyncGenerator<AgentTraceEvent> {
  const client = createOpenRouterClient();
  if (!client) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildAgentInstructions(request.userId, runContext) },
    { role: 'user', content: request.message },
  ];

  for (let turn = 0; turn < 8; turn += 1) {
    const stream = (await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      stream: true,
      tools: northstarTools.map((definition) => ({
        type: 'function',
        function: {
          name: definition.name,
          description: definition.description,
          parameters: definition.jsonSchema,
        },
      })),
      tool_choice: 'auto',
      parallel_tool_calls: false,
      reasoning: appConfig.openRouter.reasoning,
    } as never)) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

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
    { data: accounts, error: accountsError },
    { data: holdings, error: holdingsError },
    { data: taxLots, error: taxLotsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase.from('memory_documents').select('content, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('context_packets').select('packet, updated_at').eq('user_id', userId).maybeSingle(),
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
  const hasDatabasePortfolio =
    !accountsError &&
    !holdingsError &&
    !taxLotsError &&
    !transactionsError &&
    Boolean((accounts?.length ?? 0) + (holdings?.length ?? 0) + (taxLots?.length ?? 0) + (transactions?.length ?? 0));

  return {
    memoryMarkdown: typeof memory?.content === 'string' ? memory.content : seed.memoryTemplate,
    contextPacket: (packet?.packet as ContextPacket | undefined) ?? seed.contextPacket,
    portfolio: hasDatabasePortfolio
      ? {
          accounts: accounts ?? [],
          holdings: mapHoldings(holdings ?? []),
          taxLots: taxLots ?? [],
          recentTransactions: transactions ?? [],
        }
      : {
          accounts: seed.accounts,
          holdings: seed.holdings,
          taxLots: seed.taxLots,
          recentTransactions: seed.transactions.slice(0, 20),
        },
    source: hasDatabaseMemory && hasDatabasePortfolio ? 'database' : hasDatabaseMemory || hasDatabasePortfolio ? 'mixed' : 'seed',
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
    `Memory loaded for ${context.contextPacket.user.name}. Primary goals: ${goals || 'not captured yet'}.`,
    `Portfolio snapshot: ${money(context.contextPacket.accounts_summary.portfolio_value)} total, ${money(context.contextPacket.accounts_summary.cash_available)} cash, top holding ${topHolding?.symbol ?? 'unknown'}.`,
    'What matters: keep near-term goal money liquid, avoid tax-sensitive moves without approval, and review concentration before reacting to market news.',
  ].join('\n');
}

function money(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function buildAgentInstructions(userId: string, context: NorthRunContext): string {
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
    '',
    'Always-loaded memory.md:',
    context.memoryMarkdown,
    '',
    'Always-loaded context_packet.json and portfolio snapshot:',
    contextJson,
    '',
    'Operating rules:',
    '- Memory, context_packet.json, and portfolio context are already loaded. Use get_memory_context or get_portfolio_context only when you need to verify persisted data.',
    '- Use get_market_data, get_financials, and read_filings for market/company/filing facts when needed.',
    '- Use web_search for current web research that Financial Datasets does not cover. Keep live search/news calls to at most 3 per run.',
    '- If a tool reports unavailable, missing, stale, or partial data, say that plainly and continue with what is known.',
    '- Separate education or recommendations from execution.',
    '- Never claim you placed trades, moved money, filed taxes, changed accounts, or contacted institutions.',
    '- Do not expose hidden chain-of-thought. Provide concise user-visible rationale and next steps only.',
  ].join('\n');
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
