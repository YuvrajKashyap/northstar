import { useEffect, useMemo, useState } from 'react'
import gsap from 'gsap'
import type {
  AgentTraceEvent,
  MemoryDiffItem,
  MemoryGraph,
  OnboardingAnswers,
  PlaidLinkResult,
} from '@calmvest/shared'
import { defaultAnswers, userId } from '../data/workspaceContent'
import { apiJson, postJson, streamScenarioTrace } from '../lib/api'
import type { HealthResponse, Screen } from '../types/screens'

export function useCalmVestWorkspace() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [plaid, setPlaid] = useState<PlaidLinkResult | null>(null)
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers)
  const [activeOnboardingStep, setActiveOnboardingStep] = useState(0)
  const [memoryDiff, setMemoryDiff] = useState<MemoryDiffItem[]>([])
  const [onboardingTrace, setOnboardingTrace] = useState<AgentTraceEvent[]>([])
  const [graph, setGraph] = useState<MemoryGraph | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState('maya')
  const [scenarioTrace, setScenarioTrace] = useState<AgentTraceEvent[]>([])
  const [busyStep, setBusyStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedNode = useMemo(() => {
    return graph?.nodes.find((node) => node.id === selectedNodeId) ?? graph?.nodes[0] ?? null
  }, [graph, selectedNodeId])

  useEffect(() => {
    void refreshGraph()
    void apiJson<HealthResponse>('/api/health').then(setHealth).catch(() => undefined)
  }, [])

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(
        '.screen-enter',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' },
      )
      gsap.fromTo(
        '.stagger-in',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.045, ease: 'power2.out' },
      )
    })
    return () => context.revert()
  }, [screen, graph, plaid, memoryDiff.length])

  async function refreshGraph() {
    const nextGraph = await apiJson<MemoryGraph>(`/api/memory/graph?userId=${userId}`)
    setGraph(nextGraph)
    setSelectedNodeId((current) =>
      nextGraph.nodes.some((node) => node.id === current) ? current : 'maya',
    )
  }

  async function simulatePlaidLink() {
    setError(null)
    setBusyStep('plaid')
    try {
      const result = await postJson<PlaidLinkResult>('/api/demo/simulate-plaid-link')
      setPlaid(result)
      await refreshGraph()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not seed simulated accounts')
    } finally {
      setBusyStep(null)
    }
  }

  async function commitOnboarding() {
    setError(null)
    setBusyStep('onboarding')
    try {
      const result = await postJson<{ diff: MemoryDiffItem[]; trace: AgentTraceEvent[] }>(
        '/api/onboarding/commit',
        answers,
      )
      setMemoryDiff(result.diff)
      setOnboardingTrace(result.trace)
      await refreshGraph()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not commit onboarding memory')
    } finally {
      setBusyStep(null)
    }
  }

  async function runScenario() {
    setScenarioTrace([])
    setBusyStep('scenario')
    try {
      await streamScenarioTrace((event) => setScenarioTrace((previous) => [...previous, event]))
    } finally {
      setBusyStep(null)
    }
  }

  return {
    screen,
    setScreen,
    error,
    screenProps: {
      health,
      plaid,
      answers,
      setAnswers,
      activeOnboardingStep,
      setActiveOnboardingStep,
      memoryDiff,
      onboardingTrace,
      graph,
      selectedNode,
      selectedNodeId,
      setSelectedNodeId,
      scenarioTrace,
      busyStep,
      simulatePlaidLink,
      commitOnboarding,
      runScenario,
      setScreen,
    },
  }
}
