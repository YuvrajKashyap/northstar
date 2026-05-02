import { Agent, OpenAIProvider, Runner, tool, type RunStreamEvent } from '@openai/agents';
import type { AgentTraceEvent, AgentRunRequest } from '@calmvest/shared';
import { randomUUID } from 'node:crypto';
import type OpenAI from 'openai';
import { config } from '../config.js';
import { appConfig } from '../lib/app-config.js';
import { createOpenRouterClient } from '../lib/openrouter.js';
import { appendTraceEvent, createTraceEvent } from './trace-store.js';
import {
  executeNorthstarTool,
  northstarTools,
  type NorthstarToolContext,
} from './northstar-agent-tools.js';

const DEFAULT_AGENT = 'Northstar Agent';
const DEFAULT_MODEL = appConfig.openRouter.models.default;

export const freshCheckPrompt = [
  'Run a fresh check for this user.',
  'Use memory first, then portfolio context.',
  'If market, company, filing, or web data is needed, use the available read-only tools.',
  'Return a concise summary of what changed, what matters, and what the user should review next.',
].join(' ');

export async function* streamNorthstarAgentRun(request: AgentRunRequest): AsyncGenerator<AgentTraceEvent> {
  const runId = randomUUID();
  const toolContext: NorthstarToolContext = {
    userId: request.userId,
    runId,
    toolCounts: new Map(),
    queryCounts: new Map(),
  };

  if (!config.OPENROUTER_API_KEY) {
    yield emit(runId, 'error', DEFAULT_AGENT, 'OpenRouter key missing', {
      userId: request.userId,
      error: 'OPENROUTER_API_KEY is not configured.',
    });
    return;
  }

  yield emit(runId, 'agent_started', DEFAULT_AGENT, 'Started local agent run', {
    userId: request.userId,
    mode: request.mode ?? 'general',
    model: DEFAULT_MODEL,
    reasoning: appConfig.openRouter.reasoning.effort,
  });

  const sdkState = { finalAnswer: '' };
  let sdkEmitted = false;
  try {
    for await (const event of runWithAgentsSdk(request, toolContext, sdkState)) {
      sdkEmitted = true;
      yield event;
    }
    yield emit(runId, 'agent_completed', DEFAULT_AGENT, 'Agent run complete', {
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
  for await (const event of streamWithChatCompletions(request, toolContext, fallbackState)) {
    yield event;
  }

  yield emit(runId, 'agent_completed', DEFAULT_AGENT, 'Agent run complete', {
    userId: request.userId,
    finalAnswer: fallbackState.finalAnswer,
    runner: 'openai-chat-completions',
  });
}

async function* runWithAgentsSdk(
  request: AgentRunRequest,
  toolContext: NorthstarToolContext,
  state: { finalAnswer: string },
): AsyncGenerator<AgentTraceEvent> {
  const openAIClient = createOpenRouterClient();
  if (!openAIClient) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }
  const modelProvider = new OpenAIProvider({
    apiKey: config.OPENROUTER_API_KEY,
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
    instructions: buildAgentInstructions(request.userId),
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
  state: { finalAnswer: string },
): AsyncGenerator<AgentTraceEvent> {
  const client = createOpenRouterClient();
  if (!client) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildAgentInstructions(request.userId) },
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

function buildAgentInstructions(userId: string): string {
  return [
    'You are Northstar, a local financial guidance agent running inside the Northstar backend.',
    `Active userId: ${userId}. Do not use fallback personas when this userId is present.`,
    '',
    'Operating rules:',
    '- Use get_memory_context first when the question depends on user preferences, goals, risk, values, or prior context.',
    '- Use get_portfolio_context when the answer depends on accounts, holdings, tax lots, or transactions.',
    '- Use get_market_data, get_financials, and read_filings for market/company/filing facts.',
    '- Use web_search for current web research that Financial Datasets does not cover.',
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
