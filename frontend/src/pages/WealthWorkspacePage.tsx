import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bank,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Database,
  FileText,
  FlowArrow,
  Graph,
  Lock,
  Pulse,
  ShieldCheck,
  Sparkle,
  Target,
  TrendUp,
  Wallet,
} from '@phosphor-icons/react'
import type {
  AgentTraceEvent,
  MemoryDiffItem,
  MemoryGraph,
  MemoryGraphNode,
  OnboardingAnswers,
  PlaidLinkResult,
} from '@calmvest/shared'
import {
  commitOnboarding,
  getMemoryGraph,
  linkAccounts,
  streamScenarioTrace,
} from '../lib/wealthApi'
import landingBackground from '../assets/northstar-landing-bg.png'
import northstarLogo from '../assets/northstar-logo.svg'

const userId = 'maya-patel-demo'

const defaultAnswers: OnboardingAnswers = {
  userId,
  goal: 'Retire comfortably',
  targetAmount: 80000,
  targetDate: '2029-05',
  withdrawalNeed: 'May need to withdraw 20% next year',
  drawdownFeeling: 'Very worried at a 20% drop',
  taxableAccount: true,
  communicationStyle: 'Plain English with clear next steps',
  values: 'Avoid complexity. Explain tradeoffs before any action.',
}

const onboardingFields = [
  { key: 'goal', label: 'Goal', type: 'text' },
  { key: 'targetAmount', label: 'Target annual amount', type: 'number' },
  { key: 'targetDate', label: 'Target date', type: 'month' },
  { key: 'withdrawalNeed', label: 'Liquidity need', type: 'text' },
  { key: 'drawdownFeeling', label: 'Drawdown anxiety', type: 'text' },
  { key: 'communicationStyle', label: 'Communication style', type: 'text' },
] as const

export function WealthWorkspacePage() {
  const [activeFlow, setActiveFlow] = useState<'seed' | 'onboarding' | 'graph'>('seed')
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers)
  const [plaid, setPlaid] = useState<PlaidLinkResult | null>(null)
  const [diff, setDiff] = useState<MemoryDiffItem[]>([])
  const [onboardingTrace, setOnboardingTrace] = useState<AgentTraceEvent[]>([])
  const [scenarioTrace, setScenarioTrace] = useState<AgentTraceEvent[]>([])
  const [graph, setGraph] = useState<MemoryGraph | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState('maya')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const selectedNode = useMemo(() => {
    return graph?.nodes.find((node) => node.id === selectedNodeId) ?? graph?.nodes[0] ?? null
  }, [graph, selectedNodeId])

  useEffect(() => {
    void refreshGraph()
  }, [])

  async function refreshGraph() {
    const nextGraph = await getMemoryGraph(userId)
    setGraph(nextGraph)
    setSelectedNodeId((current) =>
      nextGraph.nodes.some((node) => node.id === current) ? current : nextGraph.nodes[0]?.id ?? 'maya',
    )
  }

  async function runSeedFlow() {
    setError('')
    setBusy('seed')
    try {
      const result = await linkAccounts()
      setPlaid(result)
      await refreshGraph()
      setActiveFlow('onboarding')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not run seed flow.')
    } finally {
      setBusy(null)
    }
  }

  async function runOnboardingCommit() {
    setError('')
    setBusy('onboarding')
    try {
      const result = await commitOnboarding(answers)
      setDiff(result.diff)
      setOnboardingTrace(result.trace)
      await refreshGraph()
      setActiveFlow('graph')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not commit onboarding memory.')
    } finally {
      setBusy(null)
    }
  }

  async function runTraceReplay() {
    setError('')
    setScenarioTrace([])
    setBusy('trace')
    try {
      await streamScenarioTrace((event) => setScenarioTrace((current) => [...current, event]))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not stream scenario trace.')
    } finally {
      setBusy(null)
    }
  }

  function updateAnswer<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  return (
    <section className="workspace-surface">
      <img className="workspace-surface__bg" src={landingBackground} alt="" aria-hidden="true" />
      <div className="workspace-surface__wash" aria-hidden="true" />

      <header className="workspace-topbar">
        <a className="workspace-brand" href="/">
          <img src={northstarLogo} alt="" aria-hidden="true" />
          <span>Northstar</span>
        </a>
        <nav className="workspace-flow-tabs" aria-label="Workspace flows">
          <button className={activeFlow === 'seed' ? 'active' : ''} type="button" onClick={() => setActiveFlow('seed')}>
            Connect accounts
          </button>
          <button
            className={activeFlow === 'onboarding' ? 'active' : ''}
            type="button"
            onClick={() => setActiveFlow('onboarding')}
          >
            Commit memory
          </button>
          <button className={activeFlow === 'graph' ? 'active' : ''} type="button" onClick={() => setActiveFlow('graph')}>
            Memory graph
          </button>
        </nav>
        <a className="workspace-topbar__link" href="/">
          Landing
        </a>
      </header>

      <main className="workspace-grid">
        <section className="workspace-hero-panel">
          <div className="workspace-eyebrow">
            <Sparkle size={14} weight="fill" />
            Account intelligence workspace
          </div>
          <h1>Three flows, one memory-backed investing context.</h1>
          <p>
            Run the simulated Plaid import, commit onboarding answers into memory, then inspect the
            source-aware graph and chronological agent trace.
          </p>

          <div className="workspace-actions">
            <button className="workspace-primary" type="button" disabled={busy === 'seed'} onClick={runSeedFlow}>
              {busy === 'seed' ? 'Connecting...' : 'Run seed flow'} <ArrowRight size={18} />
            </button>
            <button className="workspace-secondary" type="button" disabled={busy === 'trace'} onClick={runTraceReplay}>
              {busy === 'trace' ? 'Streaming...' : 'Replay trace'} <FlowArrow size={18} />
            </button>
          </div>

          <div className="workspace-status-row">
            <StatusPill done={Boolean(plaid)} label="Accounts seeded" />
            <StatusPill done={diff.length > 0} label="Memory committed" />
            <StatusPill done={Boolean(graph)} label="Graph loaded" />
          </div>

          {error ? <div className="workspace-error">{error}</div> : null}
        </section>

        <section className="workspace-panel">
          {activeFlow === 'seed' ? (
            <SeedFlowPanel plaid={plaid} busy={busy === 'seed'} onRun={runSeedFlow} />
          ) : null}
          {activeFlow === 'onboarding' ? (
            <OnboardingPanel
              answers={answers}
              diff={diff}
              busy={busy === 'onboarding'}
              onCommit={runOnboardingCommit}
              onUpdate={updateAnswer}
            />
          ) : null}
          {activeFlow === 'graph' ? (
            <GraphPanel
              graph={graph}
              selectedNode={selectedNode}
              selectedNodeId={selectedNodeId}
              onSelect={setSelectedNodeId}
              onRefresh={refreshGraph}
            />
          ) : null}
        </section>

        <aside className="workspace-side">
          <TracePanel title="Onboarding trace" events={onboardingTrace} empty="Commit onboarding to create tool events." />
          <TracePanel title="Scenario trace" events={scenarioTrace} empty="Replay trace to stream agent handoffs." />
        </aside>
      </main>
    </section>
  )
}

function SeedFlowPanel({
  plaid,
  busy,
  onRun,
}: {
  plaid: PlaidLinkResult | null
  busy: boolean
  onRun: () => void
}) {
  return (
    <article className="workspace-card seed-card">
      <header className="workspace-card__header">
        <div>
          <span className="workspace-kicker">Account link</span>
          <h2>Connect Maya's brokerage data</h2>
        </div>
        <Bank size={28} />
      </header>

      <div className="plaid-flow">
        {['Choose institution', 'Authorize account link', 'Import holdings'].map((label, index) => (
          <div className={`plaid-step ${plaid || index === 0 ? 'done' : ''}`} key={label}>
            <span>{plaid || index === 0 ? <Check size={16} weight="bold" /> : index + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>

      <div className="institution-card">
        <Wallet size={26} />
        <div>
          <strong>{plaid?.institution ?? 'Northstar Brokerage'}</strong>
          <p>Loads accounts, holdings, tax lots, and transactions through Express only.</p>
        </div>
      </div>

      <button className="workspace-primary wide" type="button" disabled={busy} onClick={onRun}>
        {busy ? 'Importing...' : 'Connect accounts'} <ArrowRight size={18} />
      </button>

      {plaid ? (
        <div className="import-grid">
          <Metric label="Accounts" value={plaid.imported.accounts} />
          <Metric label="Holdings" value={plaid.imported.holdings} />
          <Metric label="Tax lots" value={plaid.imported.taxLots} />
          <Metric label="Transactions" value={plaid.imported.transactions} />
        </div>
      ) : null}
    </article>
  )
}

function OnboardingPanel({
  answers,
  diff,
  busy,
  onCommit,
  onUpdate,
}: {
  answers: OnboardingAnswers
  diff: MemoryDiffItem[]
  busy: boolean
  onCommit: () => void
  onUpdate: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void
}) {
  return (
    <article className="workspace-card onboarding-card-lite">
      <header className="workspace-card__header">
        <div>
          <span className="workspace-kicker">Onboarding memory</span>
          <h2>Commit the context packet</h2>
        </div>
        <FileText size={28} />
      </header>

      <div className="answer-grid">
        {onboardingFields.map((field) => (
          <label className="answer-field" key={field.key}>
            <span>{field.label}</span>
            <input
              type={field.type}
              value={String(answers[field.key])}
              onChange={(event) => {
                const value =
                  field.key === 'targetAmount' ? Number(event.target.value) : event.target.value
                onUpdate(field.key, value as never)
              }}
            />
          </label>
        ))}
        <label className="answer-field wide-field">
          <span>Values and constraints</span>
          <textarea value={answers.values} onChange={(event) => onUpdate('values', event.target.value)} />
        </label>
        <button
          className={`tax-toggle ${answers.taxableAccount ? 'active' : ''}`}
          type="button"
          onClick={() => onUpdate('taxableAccount', !answers.taxableAccount)}
        >
          <ShieldCheck size={18} />
          Taxable account enabled
        </button>
      </div>

      <button className="workspace-primary wide" type="button" disabled={busy} onClick={onCommit}>
        {busy ? 'Committing...' : 'Commit memory and context'} <Database size={18} />
      </button>

      <div className="diff-strip">
        {(diff.length ? diff : previewDiff).map((item) => (
          <div className="diff-item" key={`${item.kind}-${item.label}`}>
            <span>{item.kind}</span>
            <strong>{item.label}</strong>
            <p>{item.value}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

function GraphPanel({
  graph,
  selectedNode,
  selectedNodeId,
  onSelect,
  onRefresh,
}: {
  graph: MemoryGraph | null
  selectedNode: MemoryGraphNode | null
  selectedNodeId: string
  onSelect: (id: string) => void
  onRefresh: () => void
}) {
  const nodes = graph?.nodes ?? []

  return (
    <article className="workspace-card graph-card">
      <header className="workspace-card__header">
        <div>
          <span className="workspace-kicker">Memory Graph Studio</span>
          <h2>Maya plus reusable agent context</h2>
        </div>
        <button className="workspace-secondary compact" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </header>

      <div className="graph-studio">
        <div className="graph-orbit">
          <div className="maya-node">
            <img src={northstarLogo} alt="" aria-hidden="true" />
            <strong>Maya</strong>
            <span>center node</span>
          </div>
          {nodes.map((node, index) => (
            <button
              className={`memory-node memory-node-${index % 8} ${node.id === selectedNodeId ? 'active' : ''}`}
              type="button"
              key={node.id}
              onClick={() => onSelect(node.id)}
            >
              <NodeIcon kind={node.kind} />
              <strong>{node.label}</strong>
            </button>
          ))}
        </div>

        <div className="node-detail">
          {selectedNode ? (
            <>
              <div className="node-detail__top">
                <NodeIcon kind={selectedNode.kind} />
                <div>
                  <span>{selectedNode.source}</span>
                  <h3>{selectedNode.label}</h3>
                </div>
              </div>
              <p>{selectedNode.value}</p>
              <div className="used-by">
                {selectedNode.usedBy.map((agent) => (
                  <span key={agent}>{agent}</span>
                ))}
              </div>
            </>
          ) : (
            <p>Run onboarding or refresh the graph to load memory nodes.</p>
          )}
        </div>
      </div>
    </article>
  )
}

function TracePanel({ title, events, empty }: { title: string; events: AgentTraceEvent[]; empty: string }) {
  return (
    <article className="trace-card">
      <header>
        <h2>{title}</h2>
        <span>{events.length}</span>
      </header>
      <div className="trace-list-lite">
        {events.length ? (
          events.map((event) => (
            <div className="trace-row-lite" key={event.id}>
              <span>{event.type}</span>
              <strong>{event.agent}</strong>
              <p>{event.label}</p>
            </div>
          ))
        ) : (
          <p className="empty-copy">{empty}</p>
        )}
      </div>
    </article>
  )
}

function StatusPill({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`workspace-status-pill ${done ? 'done' : ''}`}>
      {done ? <CheckCircle size={16} weight="fill" /> : <Clock size={16} />}
      {label}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="import-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function NodeIcon({ kind }: { kind: MemoryGraphNode['kind'] }) {
  const Icon =
    kind === 'goal'
      ? Target
      : kind === 'risk'
        ? Pulse
        : kind === 'account'
          ? Wallet
          : kind === 'tax'
            ? Copy
            : kind === 'cash_flow'
              ? TrendUp
              : kind === 'communication'
                ? FlowArrow
                : kind === 'values'
                  ? Lock
                  : Graph

  return <Icon size={18} />
}

const previewDiff: MemoryDiffItem[] = [
  { kind: 'added', label: 'Goal', value: 'Retire comfortably by 2029-05' },
  { kind: 'updated', label: 'Risk comfort', value: 'Very worried at a 20% drop' },
  { kind: 'created', label: 'Liquidity need', value: 'May need to withdraw 20% next year' },
  { kind: 'set', label: 'Communication', value: 'Plain English with clear next steps' },
]
