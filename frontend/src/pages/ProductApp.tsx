import { useEffect, useState } from 'react'
import type { AgentTraceEvent, MemoryDiffItem, MemoryGraph, PlaidLinkResult } from '@calmvest/shared'
import { Sidebar } from '../components/product/Sidebar'
import { defaultAnswers, demoUserId } from '../data/product'
import { fetchJson } from '../lib/api'
import type { HealthResponse, Screen } from '../types/product'
import { DashboardScreen } from './product/DashboardScreen'
import { GoalsScreen } from './product/GoalsScreen'
import { MemoryScreen } from './product/MemoryScreen'
import { OnboardingScreen } from './product/OnboardingScreen'
import { ProfileScreen } from './product/ProfileScreen'
import { SignInScreen } from './product/SignInScreen'

type ProductAppProps = {
  initialScreen?: Screen
  onHome: () => void
}

export function ProductApp({ initialScreen = 'dashboard', onHome }: ProductAppProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [answers, setAnswers] = useState(defaultAnswers)
  const [memoryMarkdown, setMemoryMarkdown] = useState('')
  const [memoryDiff, setMemoryDiff] = useState<MemoryDiffItem[]>([])
  const [trace, setTrace] = useState<AgentTraceEvent[]>([])
  const [graph, setGraph] = useState<MemoryGraph | null>(null)
  const [plaid, setPlaid] = useState<PlaidLinkResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchJson<HealthResponse>('/api/health').then(setHealth).catch(() => undefined)
    fetchGraph().catch(() => undefined)
  }, [])

  async function fetchGraph() {
    const nextGraph = await fetchJson<MemoryGraph>(`/api/memory/graph?userId=${demoUserId}`)
    setGraph(nextGraph)
    setMemoryMarkdown(nextGraph.memoryMarkdown)
  }

  async function commitOnboarding(nextAnswers = answers) {
    setBusy(true)
    setError('')
    try {
      const result = await fetchJson<{
        ok: boolean
        memoryMarkdown: string
        diff: MemoryDiffItem[]
        trace: AgentTraceEvent[]
      }>('/api/onboarding/commit', {
        method: 'POST',
        body: JSON.stringify(nextAnswers),
      })
      setMemoryMarkdown(result.memoryMarkdown)
      setMemoryDiff(result.diff)
      setTrace((current) => [...result.trace, ...current].slice(0, 12))
      await fetchGraph()
      setScreen('dashboard')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not save onboarding.')
    } finally {
      setBusy(false)
    }
  }

  async function simulatePlaid() {
    setBusy(true)
    setError('')
    try {
      const result = await fetchJson<PlaidLinkResult>('/api/demo/simulate-plaid-link', {
        method: 'POST',
      })
      setPlaid(result)
      await fetchGraph()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not import demo accounts.')
    } finally {
      setBusy(false)
    }
  }

  async function runScenario() {
    setBusy(true)
    setError('')
    try {
      const result = await fetchJson<{ trace: AgentTraceEvent[] }>('/api/agent/scenario/stream', {
        method: 'POST',
      })
      setTrace((current) => [...result.trace, ...current].slice(0, 16))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not run scenario.')
    } finally {
      setBusy(false)
    }
  }

  const screenProps = {
    answers,
    busy,
    commitOnboarding,
    graph,
    health,
    memoryDiff,
    memoryMarkdown,
    onHome,
    plaid,
    runScenario,
    setAnswers,
    setScreen,
    simulatePlaid,
    trace,
  }

  if (screen === 'signin') {
    return (
      <div className="product-shell screen-enter">
        {error ? <div className="error-toast">{error}</div> : null}
        <SignInScreen {...screenProps} />
      </div>
    )
  }

  if (screen === 'onboarding') {
    return (
      <div className="product-shell screen-enter">
        {error ? <div className="error-toast">{error}</div> : null}
        <OnboardingScreen {...screenProps} />
      </div>
    )
  }

  return (
    <div className="product-shell screen-enter">
      {error ? <div className="error-toast">{error}</div> : null}
      <div className="os-shell">
        <Sidebar current={screen} setScreen={setScreen} onHome={onHome} health={health} />
        <main className="os-main">
          {screen === 'profile' ? <ProfileScreen {...screenProps} /> : null}
          {screen === 'memory' ? <MemoryScreen {...screenProps} /> : null}
          {screen === 'goals' ? <GoalsScreen {...screenProps} /> : null}
          {screen === 'dashboard' ? <DashboardScreen {...screenProps} /> : null}
        </main>
      </div>
    </div>
  )
}

export type { Screen }
