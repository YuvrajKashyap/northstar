export type ModelId = 'openai/gpt-5.4-mini' | 'openai/gpt-5.4' | 'openai/gpt-5.5';

export type AgentEventType =
  | 'agent_started'
  | 'model_stream'
  | 'tool_call'
  | 'tool_result'
  | 'handoff'
  | 'receipt_created'
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
    type: 'brokerage' | 'mutual_fund' | 'cash';
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
