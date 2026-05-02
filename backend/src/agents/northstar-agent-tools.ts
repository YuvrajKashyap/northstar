import { z } from 'zod';
import { config } from '../config.js';
import { supabase } from '../lib/supabase.js';

const FINANCIAL_DATASETS_BASE_URL = 'https://api.financialdatasets.ai';

export interface NorthstarToolContext {
  userId: string;
  runId: string;
  toolCounts: Map<string, number>;
  queryCounts: Map<string, number>;
}

export interface NorthstarToolDefinition {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  jsonSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: NorthstarToolContext) => Promise<Record<string, unknown>>;
}

const emptySchema = z.object({});
const querySchema = z.object({
  query: z.string().min(1).describe('Natural language research query.'),
  ticker: z.string().optional().describe('Optional public market ticker when known.'),
});
const filingSchema = z.object({
  query: z.string().min(1).describe('Natural language SEC filing question.'),
  ticker: z.string().optional().describe('Optional public company ticker when known.'),
  filingType: z.enum(['10-K', '10-Q', '8-K']).optional().describe('Optional SEC filing type.'),
});

const emptyJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {},
  required: [],
};

const queryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    query: { type: 'string' },
    ticker: { type: 'string' },
  },
  required: ['query'],
};

const filingJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    query: { type: 'string' },
    ticker: { type: 'string' },
    filingType: { type: 'string', enum: ['10-K', '10-Q', '8-K'] },
  },
  required: ['query'],
};

export const northstarTools: NorthstarToolDefinition[] = [
  {
    name: 'get_memory_context',
    description:
      'Load the current user memory markdown, structured context packet, and compact graph summary. Use this first for personal context.',
    schema: emptySchema,
    jsonSchema: emptyJsonSchema,
    execute: async (_args, context) => {
      const [{ data: memory, error: memoryError }, { data: packet, error: packetError }] = await Promise.all([
        supabase.from('memory_documents').select('content, updated_at').eq('user_id', context.userId).maybeSingle(),
        supabase.from('context_packets').select('packet, updated_at').eq('user_id', context.userId).maybeSingle(),
      ]);

      return {
        status: memoryError || packetError ? 'partial' : 'ok',
        userId: context.userId,
        memoryMarkdown: memory?.content ?? null,
        contextPacket: packet?.packet ?? null,
        graphSummary: summarizeGraph(packet?.packet),
        errors: [memoryError?.message, packetError?.message].filter(Boolean),
      };
    },
  },
  {
    name: 'get_portfolio_context',
    description:
      'Load the user accounts, holdings, tax lots, and recent transactions from Supabase. Use when the answer depends on actual portfolio context.',
    schema: emptySchema,
    jsonSchema: emptyJsonSchema,
    execute: async (_args, context) => {
      const [accounts, holdings, taxLots, transactions] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', context.userId).order('created_at', { ascending: true }),
        supabase.from('holdings').select('*').eq('user_id', context.userId).order('value', { ascending: false }),
        supabase.from('tax_lots').select('*').eq('user_id', context.userId).order('acquired_at', { ascending: true }),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', context.userId)
          .order('posted_at', { ascending: false })
          .limit(50),
      ]);

      return {
        status: [accounts.error, holdings.error, taxLots.error, transactions.error].some(Boolean) ? 'partial' : 'ok',
        userId: context.userId,
        accounts: accounts.data ?? [],
        holdings: holdings.data ?? [],
        taxLots: taxLots.data ?? [],
        recentTransactions: transactions.data ?? [],
        errors: [accounts.error?.message, holdings.error?.message, taxLots.error?.message, transactions.error?.message].filter(Boolean),
      };
    },
  },
  {
    name: 'web_search',
    description:
      'Search the current web with Exa. Use for current facts that are not in user memory, portfolio data, or Financial Datasets.',
    schema: querySchema,
    jsonSchema: queryJsonSchema,
    execute: async (args) => {
      if (!config.EXASEARCH_API_KEY) {
        return unavailable('web_search', 'EXASEARCH_API_KEY is not configured.');
      }
      const query = String(args.query ?? '');
      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.EXASEARCH_API_KEY,
        },
        body: JSON.stringify({
          query,
          numResults: 5,
          contents: { highlights: true, text: true },
        }),
      });
      return parseExternalResponse('web_search', response);
    },
  },
  {
    name: 'get_market_data',
    description:
      'Use Financial Datasets for market prices, historical prices, and company/broad market news. Prefer ticker when known.',
    schema: querySchema,
    jsonSchema: queryJsonSchema,
    execute: async (args) => {
      if (!config.FINANCIAL_DATASETS_API_KEY) {
        return unavailable('get_market_data', 'FINANCIAL_DATASETS_API_KEY is not configured.');
      }
      const ticker = optionalTicker(args.ticker);
      if (!ticker) {
        return {
          status: 'needs_ticker',
          query: args.query,
          message: 'Financial Datasets market endpoints need a ticker for deterministic retrieval. Use web_search for broad market news.',
        };
      }
      const [snapshot, news] = await Promise.all([
        financialDatasetsGet('/prices/snapshot/', { ticker }),
        financialDatasetsGet('/news/', { ticker, limit: 5 }),
      ]);
      return { status: 'ok', ticker, snapshot, news };
    },
  },
  {
    name: 'get_financials',
    description:
      'Use Financial Datasets for company fundamentals, statements, ratios, metrics, estimates, and earnings. Requires a ticker.',
    schema: querySchema,
    jsonSchema: queryJsonSchema,
    execute: async (args) => {
      if (!config.FINANCIAL_DATASETS_API_KEY) {
        return unavailable('get_financials', 'FINANCIAL_DATASETS_API_KEY is not configured.');
      }
      const ticker = optionalTicker(args.ticker);
      if (!ticker) {
        return { status: 'needs_ticker', query: args.query, message: 'A ticker is required for company financials.' };
      }
      const [financials, metrics] = await Promise.all([
        financialDatasetsGet('/financials/', { ticker, limit: 4, period: 'annual' }),
        financialDatasetsGet('/financial-metrics/snapshot/', { ticker }),
      ]);
      return { status: 'ok', ticker, financials, metrics };
    },
  },
  {
    name: 'read_filings',
    description:
      'Use Financial Datasets to retrieve SEC filing metadata and targeted filing text. Requires a ticker; filing type is optional.',
    schema: filingSchema,
    jsonSchema: filingJsonSchema,
    execute: async (args) => {
      if (!config.FINANCIAL_DATASETS_API_KEY) {
        return unavailable('read_filings', 'FINANCIAL_DATASETS_API_KEY is not configured.');
      }
      const ticker = optionalTicker(args.ticker);
      if (!ticker) {
        return { status: 'needs_ticker', query: args.query, message: 'A ticker is required for SEC filing lookup.' };
      }
      const filingType = typeof args.filingType === 'string' ? args.filingType : undefined;
      const filings = await financialDatasetsGet('/filings/', {
        ticker,
        filing_type: filingType,
        limit: 3,
      });
      return { status: 'ok', ticker, filingType: filingType ?? 'latest', filings };
    },
  },
];

export async function executeNorthstarTool(
  name: string,
  args: Record<string, unknown>,
  context: NorthstarToolContext,
): Promise<Record<string, unknown>> {
  const definition = northstarTools.find((toolDefinition) => toolDefinition.name === name);
  if (!definition) {
    return { status: 'error', error: `Unknown tool: ${name}` };
  }

  const toolCount = (context.toolCounts.get(name) ?? 0) + 1;
  context.toolCounts.set(name, toolCount);

  const fingerprint = `${name}:${JSON.stringify(args)}`;
  const queryCount = (context.queryCounts.get(fingerprint) ?? 0) + 1;
  context.queryCounts.set(fingerprint, queryCount);

  const warning =
    toolCount > 3 || queryCount > 1
      ? {
          kind: 'soft_limit',
          message: `Repeated ${name} call detected. Continue only if the new call adds information.`,
          toolCount,
          repeatedQueryCount: queryCount,
        }
      : undefined;

  const parsed = definition.schema.safeParse(args);
  if (!parsed.success) {
    return {
      status: 'error',
      error: 'Invalid tool arguments.',
      issues: parsed.error.issues,
      warning,
    };
  }

  try {
    const result = await definition.execute(parsed.data as Record<string, unknown>, context);
    return warning ? { ...result, warning } : result;
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      warning,
    };
  }
}

function summarizeGraph(packet: unknown): Record<string, unknown> | null {
  if (!packet || typeof packet !== 'object') return null;
  const record = packet as Record<string, unknown>;
  return {
    user: record.user,
    goals: record.goals,
    riskProfile: record.risk_profile,
    accountsSummary: record.accounts_summary,
    constraints: record.constraints,
  };
}

function optionalTicker(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().toUpperCase();
  return cleaned.length > 0 ? cleaned : undefined;
}

function unavailable(tool: string, reason: string): Record<string, unknown> {
  return { status: 'unavailable', tool, reason };
}

async function financialDatasetsGet(endpoint: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${FINANCIAL_DATASETS_BASE_URL}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { 'x-api-key': config.FINANCIAL_DATASETS_API_KEY ?? '' },
  });
  return parseExternalResponse(endpoint, response, url.toString());
}

async function parseExternalResponse(label: string, response: Response, url?: string): Promise<Record<string, unknown>> {
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    return {
      status: 'error',
      source: label,
      url,
      statusCode: response.status,
      error: typeof data === 'string' ? data : response.statusText,
      data,
    };
  }
  return { status: 'ok', source: label, url, data };
}
