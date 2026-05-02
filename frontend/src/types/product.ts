import type {
  AgentTraceEvent,
  MemoryDiffItem,
  MemoryGraph,
  OnboardingAnswers,
  PlaidLinkResult,
} from '@calmvest/shared'

export type Screen = 'signin' | 'onboarding' | 'profile' | 'memory' | 'goals' | 'dashboard'

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

export type ProductScreenProps = {
  answers: OnboardingAnswers
  busy: boolean
  commitOnboarding: (answers?: OnboardingAnswers) => Promise<void>
  graph: MemoryGraph | null
  health: HealthResponse | null
  memoryDiff: MemoryDiffItem[]
  memoryMarkdown: string
  onHome: () => void
  plaid: PlaidLinkResult | null
  runScenario: () => Promise<void>
  setAnswers: React.Dispatch<React.SetStateAction<OnboardingAnswers>>
  setScreen: (screen: Screen) => void
  simulatePlaid: () => Promise<void>
  trace: AgentTraceEvent[]
}
