import { useEffect, useMemo, useState } from 'react'
import type {
  AgentTraceEvent,
  MemoryDiffItem,
  MemoryGraph,
  MemoryGraphNode,
  OnboardingAnswers,
  PlaidLinkResult,
} from '@calmvest/shared'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const userId = 'maya-patel-demo'

type HealthResponse = {
  ok: boolean
  service: string
  supabase: { connected: boolean; message?: string }
  openrouter: { configured: boolean }
}

const defaultAnswers: OnboardingAnswers = {
  userId,
  goal: 'home_down_payment',
  targetAmount: 80000,
  targetDate: '2029-05',
  withdrawalNeed: 'may_withdraw_20pct_next_year',
  drawdownFeeling: 'very_worried_at_20pct_drop',
  taxableAccount: true,
  communicationStyle: 'plain_english',
  values: 'Avoid complexity and explain tradeoffs before any action.',
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json() as Promise<T>
}

async function readSse(response: Response, onEvent: (event: AgentTraceEvent) => void) {
  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const data = part
        .split('\n')
        .find((line) => line.startsWith('data: '))
        ?.slice(6)
      if (!data) continue
      const parsed = JSON.parse(data)
      if ('type' in parsed) onEvent(parsed as AgentTraceEvent)
    }
  }
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [plaid, setPlaid] = useState<PlaidLinkResult | null>(null)
  const [answers, setAnswers] = useState(defaultAnswers)
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

  async function refreshGraph() {
    const nextGraph = await apiJson<MemoryGraph>(`/api/memory/graph?userId=${userId}`)
    setGraph(nextGraph)
    setSelectedNodeId((current) => nextGraph.nodes.some((node) => node.id === current) ? current : 'maya')
  }

  async function simulatePlaidLink() {
    setError(null)
    setBusyStep('plaid')
    try {
      const result = await apiJson<PlaidLinkResult>('/api/demo/simulate-plaid-link', {
        method: 'POST',
      })
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
      const result = await apiJson<{
        diff: MemoryDiffItem[]
        trace: AgentTraceEvent[]
      }>('/api/onboarding/commit', {
        method: 'POST',
        body: JSON.stringify(answers),
      })
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
      const response = await fetch(`${API_BASE}/api/agent/scenario/stream`, { method: 'POST' })
      await readSse(response, (event) => setScenarioTrace((previous) => [...previous, event]))
    } finally {
      setBusyStep(null)
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Goldman Sachs Hackathon Prototype</p>
          <h1>CalmVest Agent OS</h1>
        </div>
        <div className="status-panel">
          <span className={health?.supabase.connected ? 'status-dot good' : 'status-dot'} />
          <div>
            <strong>{health?.service ?? 'CalmVest API'}</strong>
            <p>Supabase {health?.supabase.connected ? 'connected' : 'pending'} · OpenRouter backend-only</p>
          </div>
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="flow-grid">
        <PlaidPanel plaid={plaid} busy={busyStep === 'plaid'} onConnect={simulatePlaidLink} />
        <OnboardingPanel
          answers={answers}
          setAnswers={setAnswers}
          busy={busyStep === 'onboarding'}
          diff={memoryDiff}
          trace={onboardingTrace}
          onCommit={commitOnboarding}
        />
        <MemoryGraphPanel graph={graph} selectedNode={selectedNode} onSelectNode={setSelectedNodeId} />
        <TracePanel
          busy={busyStep === 'scenario'}
          trace={scenarioTrace}
          onRunScenario={runScenario}
        />
      </section>
    </main>
  )
}

function PlaidPanel(props: {
  plaid: PlaidLinkResult | null
  busy: boolean
  onConnect: () => void
}) {
  return (
    <article className="panel plaid-panel">
      <div className="panel-heading">
        <p className="eyebrow">1 · Simulated Plaid</p>
        <h2>Seed account link</h2>
      </div>
      <div className="fake-modal">
        <div>
          <strong>{props.plaid?.institution ?? 'Northstar Demo Brokerage'}</strong>
          <p>{props.plaid ? 'Brokerage linked successfully' : 'Plaid-style sandbox connection'}</p>
        </div>
        <button type="button" onClick={props.onConnect} disabled={props.busy}>
          {props.busy ? 'Linking...' : 'Connect accounts'}
        </button>
      </div>
      <div className="metric-row">
        <Metric label="Accounts" value={props.plaid?.imported.accounts ?? 0} />
        <Metric label="Holdings" value={props.plaid?.imported.holdings ?? 0} />
        <Metric label="Tax lots" value={props.plaid?.imported.taxLots ?? 0} />
      </div>
      <ul className="holding-list">
        {(props.plaid?.holdings ?? []).slice(0, 5).map((holding) => (
          <li key={holding.symbol}>
            <span>{holding.symbol}</span>
            <strong>${Math.round(holding.value).toLocaleString()}</strong>
          </li>
        ))}
      </ul>
    </article>
  )
}

function OnboardingPanel(props: {
  answers: OnboardingAnswers
  setAnswers: (answers: OnboardingAnswers) => void
  busy: boolean
  diff: MemoryDiffItem[]
  trace: AgentTraceEvent[]
  onCommit: () => void
}) {
  function update<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    props.setAnswers({ ...props.answers, [key]: value })
  }

  return (
    <article className="panel onboarding-panel">
      <div className="panel-heading">
        <p className="eyebrow">2 · Onboarding Memory</p>
        <h2>Commit profile</h2>
      </div>
      <div className="form-grid">
        <label>
          Goal
          <input value={props.answers.goal} onChange={(event) => update('goal', event.target.value)} />
        </label>
        <label>
          Target
          <input
            type="number"
            value={props.answers.targetAmount}
            onChange={(event) => update('targetAmount', Number(event.target.value))}
          />
        </label>
        <label>
          Timeline
          <input value={props.answers.targetDate} onChange={(event) => update('targetDate', event.target.value)} />
        </label>
        <label>
          Style
          <input
            value={props.answers.communicationStyle}
            onChange={(event) => update('communicationStyle', event.target.value)}
          />
        </label>
      </div>
      <label>
        Withdrawal need
        <input
          value={props.answers.withdrawalNeed}
          onChange={(event) => update('withdrawalNeed', event.target.value)}
        />
      </label>
      <label>
        Drawdown feeling
        <input
          value={props.answers.drawdownFeeling}
          onChange={(event) => update('drawdownFeeling', event.target.value)}
        />
      </label>
      <label>
        Values
        <textarea value={props.answers.values} onChange={(event) => update('values', event.target.value)} />
      </label>
      <button type="button" onClick={props.onCommit} disabled={props.busy}>
        {props.busy ? 'Committing memory...' : 'Commit onboarding profile'}
      </button>
      <div className="diff-list">
        {props.diff.map((item) => (
          <p key={`${item.kind}-${item.label}`}>
            <span>{item.kind}</span> {item.label}: {item.value}
          </p>
        ))}
      </div>
      <TraceList trace={props.trace} compact />
    </article>
  )
}

function MemoryGraphPanel(props: {
  graph: MemoryGraph | null
  selectedNode: MemoryGraphNode | null
  onSelectNode: (id: string) => void
}) {
  return (
    <article className="panel graph-panel">
      <div className="panel-heading">
        <p className="eyebrow">3 · Memory Graph Studio</p>
        <h2>{props.graph?.nodes[0]?.label ?? 'Maya Patel'}</h2>
      </div>
      <div className="graph-stage">
        {(props.graph?.nodes ?? []).map((node) => (
          <button
            key={node.id}
            type="button"
            className={`memory-node ${node.kind}`}
            onClick={() => props.onSelectNode(node.id)}
          >
            {node.label}
          </button>
        ))}
      </div>
      {props.selectedNode ? (
        <div className="node-detail">
          <p className="eyebrow">{props.selectedNode.source}</p>
          <h3>{props.selectedNode.label}</h3>
          <p>{props.selectedNode.value}</p>
          <div className="used-by">
            {props.selectedNode.usedBy.map((agent) => (
              <span key={agent}>{agent}</span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}

function TracePanel(props: {
  busy: boolean
  trace: AgentTraceEvent[]
  onRunScenario: () => void
}) {
  return (
    <article className="panel trace-panel">
      <div className="panel-heading">
        <p className="eyebrow">Agent Trace Replay</p>
        <h2>Chronological tool calls</h2>
      </div>
      <p className="muted">Hidden reasoning is excluded. Tool calls, summaries, handoffs, and results stay in order.</p>
      <button type="button" onClick={props.onRunScenario} disabled={props.busy}>
        {props.busy ? 'Running agents...' : 'Run fresh check'}
      </button>
      <TraceList trace={props.trace} />
    </article>
  )
}

function TraceList(props: { trace: AgentTraceEvent[]; compact?: boolean }) {
  return (
    <ol className={props.compact ? 'trace-list compact' : 'trace-list'}>
      {props.trace.map((event) => (
        <li key={event.id}>
          <span>{event.agent}</span>
          <strong>{event.label}</strong>
          <small>{event.type}</small>
        </li>
      ))}
    </ol>
  )
}

function Metric(props: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{props.value}</strong>
      <span>{props.label}</span>
    </div>
  )
}

export default App
