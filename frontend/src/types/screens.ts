import type {
  AgentTraceEvent,
  MemoryDiffItem,
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
  | 'onboarding'
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

export type OnboardingStep = {
  id: keyof OnboardingAnswers | 'review'
  label: string
  helper: string
}

export type ScreenProps = {
  health: HealthResponse | null
  plaid: PlaidLinkResult | null
  answers: OnboardingAnswers
  setAnswers: (answers: OnboardingAnswers) => void
  activeOnboardingStep: number
  setActiveOnboardingStep: (step: number) => void
  memoryDiff: MemoryDiffItem[]
  onboardingTrace: AgentTraceEvent[]
  graph: MemoryGraph | null
  selectedNode: MemoryGraphNode | null
  selectedNodeId: string
  setSelectedNodeId: (id: string) => void
  scenarioTrace: AgentTraceEvent[]
  busyStep: string | null
  simulatePlaidLink: () => void
  commitOnboarding: () => void
  runScenario: () => void
  setScreen: (screen: Screen) => void
}
