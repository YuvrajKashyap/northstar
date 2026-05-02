import { useCallback, useEffect, useMemo, useState } from 'react'
import gsap from 'gsap'
import type { AgentTraceEvent, MemoryGraph, OnboardingAnswers, PlaidLinkResult } from '@calmvest/shared'
import { defaultAnswers, userId } from '../data/workspaceContent'
import { apiJson, postJson, streamAgentRun, streamScenarioTrace } from '../lib/api'
import type { HealthResponse, Screen } from '../types/screens'

const activeUserKey = 'northstar.activeUserId'

const fallbackGraph: MemoryGraph = {
  userId,
  memoryMarkdown: '# Northstar Memory\n\nLocal fallback memory graph.',
  contextPacket: {
    user: {
      id: userId,
      name: 'Kushagra Bharti',
      age: 24,
      investor_level: 'beginner',
      communication_style: 'plain_english',
    },
    goals: [{ type: 'home_down_payment', target_amount: 80000, target_date: '2029-05', priority: 'high' }],
    risk_profile: {
      risk_comfort: 'moderate_cautious',
      panic_response: 'willing_to_take_risk_for_long_term_money',
      liquidity_need: 'cash_available_for_near_term_flexibility',
    },
    accounts_summary: {
      taxable: true,
      brokerage_count: 4,
      cash_available: 2150,
      portfolio_value: 60688,
    },
    portfolio_features: {
      top3_concentration: 0.81,
      equity_weight: 0.86,
      cash_weight: 0.04,
      growth_tech_overlap: 'high',
      liquidity_coverage: 0.4,
    },
    constraints: {
      no_auto_trade: true,
      prefer_tax_aware: true,
      explain_costs: true,
    },
  },
  nodes: [
    {
      id: 'maya',
      label: 'Kushagra Bharti',
      kind: 'person',
      value: '24, beginner',
      source: 'User profile',
      usedBy: ['Orchestrator', 'Communication Agent'],
    },
    {
      id: 'goals',
      label: 'Goals',
      kind: 'goal',
      value: 'emergency_cash: $0 by unknown',
      source: 'Onboarding',
      usedBy: ['Goal Agent', 'Scenario Agent', 'Rebalance Agent'],
    },
    {
      id: 'risk',
      label: 'Risk Comfort',
      kind: 'risk',
      value: 'Willing to take risk for long-term money',
      source: 'Onboarding',
      usedBy: ['Scenario Agent', 'Communication Agent'],
    },
    {
      id: 'accounts',
      label: 'Accounts',
      kind: 'account',
      value: '4 brokerage accounts, $60,688 portfolio',
      source: 'Account link',
      usedBy: ['Portfolio Agent', 'Tax Agent', 'Rebalance Agent'],
    },
    {
      id: 'tax',
      label: 'Tax Profile',
      kind: 'tax',
      value: 'Taxable brokerage detected',
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
      value: 'Cash available: $2,150; liquidity coverage 40%',
      source: 'Account link',
      usedBy: ['Goal Agent', 'Scenario Agent'],
    },
    {
      id: 'communication',
      label: 'Communication Style',
      kind: 'communication',
      value: 'plain_english, direct, practical',
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

function graphOrFallback(graph: MemoryGraph | null | undefined): MemoryGraph {
  return graph?.nodes?.length ? graph : fallbackGraph
}

export function useCalmVestWorkspace() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem(activeUserKey) ?? userId)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [plaid, setPlaid] = useState<PlaidLinkResult | null>(null)
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers)
  const [graph, setGraph] = useState<MemoryGraph | null>(fallbackGraph)
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
    const resolvedGraph = graphOrFallback(nextGraph)
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
        const resolvedGraph = graphOrFallback(nextGraph)
        setGraph(resolvedGraph)
        setSelectedNodeId((current) =>
          resolvedGraph.nodes.some((node) => node.id === current) ? current : resolvedGraph.nodes[0]?.id ?? 'maya',
        )
      })
      .catch(() => {
        if (cancelled) return
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
      const result = await postJson<PlaidLinkResult>('/api/demo/simulate-plaid-link')
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
