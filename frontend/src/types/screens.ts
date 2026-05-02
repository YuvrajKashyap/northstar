import type {
  AgentTraceEvent,
  MemoryGraph,
  MemoryGraphNode,
  OnboardingAnswers,
  PlaidLinkResult,
} from '@calmvest/shared'

export type Screen =
  | 'landing'
  | 'how-it-works'
  | 'beginners'
  | 'agents'
  | 'safety'
  | 'pricing'
  | 'signin'
  | 'workspace'
  | 'profile'
  | 'memory'
  | 'goals'
  | 'agent-runs'
  | 'plans'
  | 'scenarios'
  | 'insights'
  | 'dashboard'
  | 'north'

export type HealthResponse = {
  ok: boolean
  service: string
  supabase: { connected: boolean; message?: string }
  openrouter: { configured: boolean }
}

export type ScreenProps = {
  currentUserId: string
  health: HealthResponse | null
  plaid: PlaidLinkResult | null
  answers: OnboardingAnswers
  setAnswers: (answers: OnboardingAnswers) => void
  graph: MemoryGraph | null
  selectedNode: MemoryGraphNode | null
  selectedNodeId: string
  setSelectedNodeId: (id: string) => void
  scenarioTrace: AgentTraceEvent[]
  agentAnswer: string
  busyStep: string | null
  simulatePlaidLink: () => void
  runAgent: (message: string, mode?: 'general' | 'fresh_check' | 'demo_scenario') => void
  runScenario: () => void
  submitGoal: (description: string) => Promise<void>
  setScreen: (screen: Screen) => void
}
