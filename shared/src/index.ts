export type ModelId = 'openai/gpt-5.4-mini' | 'openai/gpt-5.4' | 'openai/gpt-5.5';

export type AgentEventType =
  | 'run_started'
  | 'memory_loaded'
  | 'agent_started'
  | 'message_delta'
  | 'model_stream'
  | 'tool_call'
  | 'tool_result'
  | 'tool_warning'
  | 'handoff'
  | 'receipt_created'
  | 'run_completed'
  | 'run_failed'
  | 'agent_completed'
  | 'error';

export interface AgentTraceEvent {
  id: string;
  runId: string;
  type: AgentEventType;
  agent: string;
  label: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface AgentRunRequest {
  userId: string;
  message: string;
  mode?: 'general' | 'fresh_check' | 'demo_scenario';
}

export interface ContextPacket {
  user: {
    id: string;
    name: string;
    age: number;
    investor_level: string;
    communication_style: string;
  };
  goals: Array<{
    type: string;
    target_amount: number;
    target_date: string;
    priority: string;
  }>;
  risk_profile: {
    risk_comfort: string;
    panic_response: string;
    liquidity_need: string;
  };
  accounts_summary: {
    taxable: boolean;
    brokerage_count: number;
    cash_available: number;
    portfolio_value: number;
  };
  portfolio_features: {
    top3_concentration: number;
    equity_weight: number;
    cash_weight: number;
    growth_tech_overlap: string;
    liquidity_coverage: number;
  };
  constraints: {
    no_auto_trade: boolean;
    prefer_tax_aware: boolean;
    explain_costs: boolean;
  };
}

export interface Holding {
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'mutual_fund' | 'cash';
  quantity: number;
  price: number;
  value: number;
  costBasis: number;
  sector?: string;
}

export interface DemoSeed {
  user: ContextPacket['user'];
  contextPacket: ContextPacket;
  memoryTemplate: string;
  accounts: Array<{
    id: string;
    name: string;
    institution?: string;
    type: 'checking' | 'savings' | 'credit' | 'brokerage' | 'mutual_fund' | 'cash';
    taxable: boolean;
    balance: number;
  }>;
  holdings: Holding[];
  taxLots: Array<{
    id: string;
    symbol: string;
    acquiredAt: string;
    quantity: number;
    costBasis: number;
  }>;
  transactions: Array<{
    id: string;
    postedAt: string;
    accountId: string;
    description: string;
    amount: number;
    type: string;
  }>;
}

export interface PlaidLinkResult {
  ok: boolean;
  userId: string;
  institution: string;
  imported: {
    accounts: number;
    holdings: number;
    taxLots: number;
    transactions: number;
  };
  accounts: DemoSeed['accounts'];
  holdings: Holding[];
  transactions: DemoSeed['transactions'];
}

export interface OnboardingAnswers {
  userId: string;
  profileText?: string;
  goal: string;
  targetAmount: number;
  targetDate: string;
  withdrawalNeed: string;
  drawdownFeeling: string;
  taxableAccount: boolean;
  communicationStyle: string;
  values: string;
}

export interface MemoryToolCall {
  tool:
    | 'create_goal'
    | 'set_communication_style'
    | 'set_risk_comfort'
    | 'create_value'
    | 'write_memory_markdown';
  args: Record<string, unknown>;
  result: string;
}

export interface MemoryDiffItem {
  kind: 'added' | 'updated' | 'created' | 'set';
  label: string;
  value: string;
}

export interface OnboardingCommitResult {
  ok: boolean;
  userId: string;
  memoryMarkdown: string;
  contextPacket: ContextPacket;
  diff: MemoryDiffItem[];
  trace: AgentTraceEvent[];
}

export interface MemoryGraphNode {
  id: string;
  label: string;
  kind: 'person' | 'goal' | 'risk' | 'account' | 'tax' | 'values' | 'cash_flow' | 'communication';
  value: string;
  source: string;
  usedBy: string[];
}

export interface MemoryGraphEdge {
  from: string;
  to: string;
  label: string;
}

export interface MemoryGraph {
  userId: string;
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
  memoryMarkdown: string;
  contextPacket: ContextPacket;
}

export interface MemoryStatusResponse {
  ok: true;
  userId: string;
  hasMemory: boolean;
  hasContext: boolean;
}

export interface RawMemoryDocument {
  userId: string;
  memoryMarkdown: string;
  contextPacket: ContextPacket;
  updatedAt: string | null;
}

export interface GoalMemoryUpdateResponse {
  ok: true;
  userId: string;
  goal: ContextPacket['goals'][number];
  memoryMarkdown: string;
  contextPacket: ContextPacket;
  graph: MemoryGraph;
}

export interface AuthUserSession {
  ok: true;
  userId: string;
  email: string;
  name: string;
  accessToken?: string;
}

export interface AuthRegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRecoverRequest {
  email: string;
}

export interface AuthRecoverResponse {
  ok: true;
  found: boolean;
  message: string;
}
