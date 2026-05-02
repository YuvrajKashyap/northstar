import { useCallback, useEffect, useMemo, useState } from 'react'
import gsap from 'gsap'
import type { AgentTraceEvent, MemoryGraph, OnboardingAnswers, PlaidLinkResult } from '@calmvest/shared'
import { defaultAnswers, userId } from '../data/workspaceContent'
import { apiJson, postJson, streamAgentRun, streamScenarioTrace } from '../lib/api'
import type { HealthResponse, Screen } from '../types/screens'

const activeUserKey = 'northstar.activeUserId'
const activeUserNameKey = 'northstar.activeUserName'

const initialPathScreens: Record<string, Screen> = {
  '/landing': 'landing',
  '/how-it-works': 'how-it-works',
  '/beginners': 'beginners',
  '/agents': 'agents',
  '/safety': 'safety',
  '/pricing': 'pricing',
  '/login': 'signin',
  '/auth': 'signin',
  '/workspace': 'workspace',
  '/workspace/connect': 'workspace',
  '/profile': 'profile',
  '/memory': 'memory',
  '/goals': 'goals',
  '/dashboard': 'dashboard',
}

function readActiveUserName() {
  return localStorage.getItem(activeUserNameKey)?.trim() || 'Northstar user'
}

function buildFallbackGraph(fallbackUserId: string, fallbackUserName = readActiveUserName()): MemoryGraph {
  return {
  userId: fallbackUserId,
  memoryMarkdown: '# Northstar Memory\n\nLocal fallback memory graph.',
  contextPacket: {
    user: {
      id: fallbackUserId,
      name: fallbackUserName,
      age: 0,
      investor_level: 'unknown',
      communication_style: 'Plain English with clear next steps',
    },
    goals: [],
    risk_profile: {
      risk_comfort: 'unknown',
      panic_response: 'unknown',
      liquidity_need: 'unknown',
    },
    accounts_summary: {
      taxable: false,
      brokerage_count: 0,
      cash_available: 0,
      portfolio_value: 0,
    },
    portfolio_features: {
      top3_concentration: 0,
      equity_weight: 0,
      cash_weight: 0,
      growth_tech_overlap: 'unknown',
      liquidity_coverage: 0,
    },
    constraints: {
      no_auto_trade: true,
      prefer_tax_aware: false,
      explain_costs: true,
    },
  },
  nodes: [
    {
      id: 'maya',
      label: fallbackUserName,
      kind: 'person',
      value: 'unknown',
      source: 'User profile',
      usedBy: ['Orchestrator', 'Communication Agent'],
    },
    {
      id: 'goals',
      label: 'Goals',
      kind: 'goal',
      value: 'No committed goals yet',
      source: 'Onboarding',
      usedBy: ['Goal Agent', 'Scenario Agent', 'Rebalance Agent'],
    },
    {
      id: 'risk',
      label: 'Risk Comfort',
      kind: 'risk',
      value: 'No committed risk profile yet',
      source: 'Onboarding',
      usedBy: ['Scenario Agent', 'Communication Agent'],
    },
    {
      id: 'accounts',
      label: 'Accounts',
      kind: 'account',
      value: 'No account context loaded yet',
      source: 'Account link',
      usedBy: ['Portfolio Agent', 'Tax Agent', 'Rebalance Agent'],
    },
    {
      id: 'tax',
      label: 'Tax Profile',
      kind: 'tax',
      value: 'Taxable account not confirmed',
      source: 'Account link + onboarding',
      usedBy: ['Tax Agent', 'Rebalance Agent'],
    },
    {
      id: 'values',
      label: 'Values',
      kind: 'values',
      value: 'Explain costs and tradeoffs',
      source: 'Onboarding',
      usedBy: ['Communication Agent'],
    },
    {
      id: 'cash-flow',
      label: 'Cash Flow',
      kind: 'cash_flow',
      value: 'Cash flow not committed yet',
      source: 'Account link',
      usedBy: ['Goal Agent', 'Scenario Agent'],
    },
    {
      id: 'communication',
      label: 'Communication Style',
      kind: 'communication',
      value: 'Plain English with clear next steps',
      source: 'Onboarding',
      usedBy: ['Communication Agent'],
    },
  ],
  edges: [
    'goals',
    'risk',
    'accounts',
    'tax',
    'values',
    'cash-flow',
    'communication',
  ].map((id) => ({ from: 'maya', to: id, label: 'informs' })),
}
}

function graphOrFallback(graph: MemoryGraph | null | undefined, fallbackUserId: string): MemoryGraph {
  return graph?.nodes?.length ? graph : buildFallbackGraph(fallbackUserId)
}

export function useCalmVestWorkspace() {
  const [screen, setScreen] = useState<Screen>(() => initialPathScreens[window.location.pathname] ?? 'landing')
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem(activeUserKey) ?? userId)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [plaid, setPlaid] = useState<PlaidLinkResult | null>(null)
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers)
  const [graph, setGraph] = useState<MemoryGraph | null>(() => buildFallbackGraph(currentUserId))
  const [selectedNodeId, setSelectedNodeId] = useState('maya')
  const [scenarioTrace, setScenarioTrace] = useState<AgentTraceEvent[]>([])
  const [agentAnswer, setAgentAnswer] = useState('')
  const [busyStep, setBusyStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedNode = useMemo(() => {
    return graph?.nodes.find((node) => node.id === selectedNodeId) ?? graph?.nodes[0] ?? null
  }, [graph, selectedNodeId])

  const refreshGraph = useCallback(async () => {
    const nextGraph = await apiJson<MemoryGraph>(`/api/memory/graph?userId=${currentUserId}`)
    const resolvedGraph = graphOrFallback(nextGraph, currentUserId)
    setGraph(resolvedGraph)
    setSelectedNodeId((current) =>
      resolvedGraph.nodes.some((node) => node.id === current) ? current : resolvedGraph.nodes[0]?.id ?? 'maya',
    )
  }, [currentUserId])

  useEffect(() => {
    let cancelled = false
    void apiJson<MemoryGraph>(`/api/memory/graph?userId=${currentUserId}`)
      .then((nextGraph) => {
        if (cancelled) return
        const resolvedGraph = graphOrFallback(nextGraph, currentUserId)
        setGraph(resolvedGraph)
        setSelectedNodeId((current) =>
          resolvedGraph.nodes.some((node) => node.id === current) ? current : resolvedGraph.nodes[0]?.id ?? 'maya',
        )
      })
      .catch(() => {
        if (cancelled) return
        const fallbackGraph = buildFallbackGraph(currentUserId)
        setGraph(fallbackGraph)
        setSelectedNodeId((current) =>
          fallbackGraph.nodes.some((node) => node.id === current) ? current : fallbackGraph.nodes[0]?.id ?? 'maya',
        )
      })
    void apiJson<HealthResponse>('/api/health').then(setHealth).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [currentUserId])

  useEffect(() => {
    const syncAuthUser = () => {
      const nextUserId = localStorage.getItem(activeUserKey) ?? userId
      setCurrentUserId(nextUserId)
      setAnswers((current) => ({ ...current, userId: nextUserId }))
    }
    window.addEventListener('northstar-auth', syncAuthUser)
    window.addEventListener('storage', syncAuthUser)
    return () => {
      window.removeEventListener('northstar-auth', syncAuthUser)
      window.removeEventListener('storage', syncAuthUser)
    }
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
  }, [screen, graph, plaid])

  async function simulatePlaidLink() {
    setError(null)
    setBusyStep('plaid')
    try {
      const result = await postJson<PlaidLinkResult>('/api/demo/simulate-plaid-link', { userId: currentUserId })
      setPlaid(result)
      await refreshGraph()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not seed simulated accounts')
    } finally {
      setBusyStep(null)
    }
  }

  async function runAgent(message: string, mode: 'general' | 'fresh_check' = 'general') {
    setScenarioTrace([])
    setAgentAnswer('')
    setBusyStep('scenario')
    try {
      await streamAgentRun({ userId: currentUserId, message, mode }, handleAgentEvent)
    } finally {
      setBusyStep(null)
    }
  }

  async function runScenario() {
    setScenarioTrace([])
    setAgentAnswer('')
    setBusyStep('scenario')
    try {
      await streamScenarioTrace(currentUserId, handleAgentEvent)
    } finally {
      setBusyStep(null)
    }
  }

  function handleAgentEvent(event: AgentTraceEvent) {
    if (event.type === 'message_delta' && typeof event.payload.delta === 'string') {
      setAgentAnswer((previous) => `${previous}${event.payload.delta}`)
      return
    }
    setScenarioTrace((previous) => [...previous, event])
    if (event.type === 'agent_completed' && typeof event.payload.finalAnswer === 'string') {
      setAgentAnswer((previous) => previous || String(event.payload.finalAnswer))
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
      graph,
      selectedNode,
      selectedNodeId,
      setSelectedNodeId,
      scenarioTrace,
      agentAnswer,
      busyStep,
      simulatePlaidLink,
      runAgent,
      runScenario,
      setScreen,
    },
  }
}
