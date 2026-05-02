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
  | 'dashboard'

export type HealthResponse = {
  ok: boolean
  service: string
  supabase: { connected: boolean; message?: string }
  openrouter: { configured: boolean }
}

export type ScreenProps = {
  health: HealthResponse | null
  plaid: PlaidLinkResult | null
  answers: OnboardingAnswers
  setAnswers: (answers: OnboardingAnswers) => void
  graph: MemoryGraph | null
  selectedNode: MemoryGraphNode | null
  selectedNodeId: string
  setSelectedNodeId: (id: string) => void
  scenarioTrace: AgentTraceEvent[]
  busyStep: string | null
  simulatePlaidLink: () => void
  runScenario: () => void
  setScreen: (screen: Screen) => void
}
