import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bank,
  Check,
  CheckCircle,
  Clock,
  Database,
  Eye,
  EyeSlash,
  FileText,
  FlowArrow,
  Graph,
  HouseLine,
  Lock,
  Pulse,
  ShieldCheck,
  Target,
  TrendUp,
  UserCircle,
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

const mayaUserId = 'maya-patel-demo'

const defaultProfileText = `Maya Patel is 24 and a beginner investor. She wants CalmVest to explain decisions in plain English with clear tradeoffs and no jargon.

Her main goal is buying a home. She wants an $80,000 down payment around May 2029, but she may need to withdraw about 20% of her portfolio in the next year if her housing timeline moves up.

She is very worried about a 20% market drop and wants help staying calm instead of panic selling. She has taxable brokerage assets, wants tax-aware recommendations, and does not want any automatic trading.

Her values are simplicity, control, transparency, and avoiding unnecessary complexity. She wants to see why an agent recommends something, what data it used, what the cost might be, and whether she needs to approve it.`

const defaultAnswers: OnboardingAnswers = {
  userId: mayaUserId,
  profileText: defaultProfileText,
  goal: 'Home down payment',
  targetAmount: 80000,
  targetDate: '2029-05',
  withdrawalNeed: 'May need to withdraw 20% next year',
  drawdownFeeling: 'Very worried at a 20% market drop',
  taxableAccount: true,
  communicationStyle: 'Plain English with clear next steps',
  values: 'Simplicity, control, transparency, and avoiding unnecessary complexity',
}

type WorkspaceRoute = 'connect' | 'memory' | 'home'
type ConnectedAccount = PlaidLinkResult['accounts'][number]
type ConnectedTransaction = PlaidLinkResult['transactions'][number]
type QuestionnaireAnswers = Record<string, string>

const routeMeta: Record<WorkspaceRoute, { label: string; eyebrow: string; title: string; copy: string }> = {
  connect: {
    label: 'Connect',
    eyebrow: 'Step 1',
    title: 'Connect accounts before anything else.',
    copy: 'This page owns the account-link moment. It imports accounts, holdings, tax lots, and transactions before memory is committed.',
  },
  memory: {
    label: 'Commit memory',
    eyebrow: 'Step 2',
    title: 'Answer the full memory questionnaire.',
    copy: 'Twenty-four onboarding answers become one structured LLM input. The backend compiles goals, values, risk, tax context, preferences, and the official memory.md.',
  },
  home: {
    label: 'Home',
    eyebrow: 'Dashboard home',
    title: 'Memory graph is the app home.',
    copy: 'The core app opens on reusable context: who Maya is, what she wants, what she fears, and what every agent can use.',
  },
}

export function WealthWorkspacePage() {
  const [route, setRoute] = useState<WorkspaceRoute>(() => getWorkspaceRoute())
  const [answers] = useState<OnboardingAnswers>(defaultAnswers)
  const [plaid, setPlaid] = useState<PlaidLinkResult | null>(null)
  const [enabledAccounts, setEnabledAccounts] = useState<Record<string, boolean>>({})
  const [visibleTransactions, setVisibleTransactions] = useState<Record<string, boolean>>({})
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireAnswers>(() => buildDefaultQuestionnaire())
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
    const syncRoute = () => setRoute(getWorkspaceRoute())
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    void refreshGraph()
  }, [])

  async function refreshGraph() {
    const nextGraph = await getMemoryGraph(mayaUserId)
    setGraph(nextGraph)
    setSelectedNodeId((current) =>
      nextGraph.nodes.some((node) => node.id === current) ? current : nextGraph.nodes[0]?.id ?? 'maya',
    )
  }

  function go(nextRoute: WorkspaceRoute) {
    window.location.hash = `workspace/${nextRoute}`
  }

  const enabledAccountCount = Object.values(enabledAccounts).filter(Boolean).length
  const visibleTransactionCount = Object.values(visibleTransactions).filter(Boolean).length

  async function runAccountLink() {
    setError('')
    setBusy('connect')
    try {
      const result = await linkAccounts()
      setPlaid(result)
      setEnabledAccounts(Object.fromEntries(result.accounts.map((account) => [account.id, true])))
      setVisibleTransactions(Object.fromEntries(result.transactions.map((transaction) => [transaction.id, true])))
      await refreshGraph()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not connect accounts.')
    } finally {
      setBusy(null)
    }
  }

  async function runMemoryCommit() {
    setError('')
    setBusy('memory')
    try {
      const profileText = buildProfileText(questionnaire)
      const result = await commitOnboarding({
        ...answers,
        profileText,
        goal: questionnaire.primary_goal || answers.goal,
        targetAmount: Number(questionnaire.primary_goal_amount || answers.targetAmount),
        targetDate: questionnaire.primary_goal_date || answers.targetDate,
        withdrawalNeed: questionnaire.near_term_liquidity || answers.withdrawalNeed,
        drawdownFeeling: questionnaire.market_drop_response || answers.drawdownFeeling,
        taxableAccount: questionnaire.taxable_accounts.toLowerCase().includes('yes'),
        communicationStyle: questionnaire.communication_style || answers.communicationStyle,
        values: questionnaire.values || answers.values,
      })
      setDiff(result.diff)
      setOnboardingTrace(result.trace)
      await refreshGraph()
      go('home')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not commit memory.')
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

  const meta = routeMeta[route]

  return (
    <section className="workspace-surface">
      <img className="workspace-surface__bg" src={landingBackground} alt="" aria-hidden="true" />
      <div className="workspace-surface__wash" aria-hidden="true" />

      <header className="workspace-topbar">
        <a className="workspace-brand" href="/">
          <img src={northstarLogo} alt="" aria-hidden="true" />
          <span>Northstar</span>
        </a>
        <a className="workspace-topbar__link" href="/">
          Landing
        </a>
      </header>

      <main className={`workspace-page workspace-page--${route}`}>
        <section className="workspace-page-copy">
          <div className="workspace-eyebrow">
            <FlowArrow size={14} weight="bold" />
            {meta.eyebrow}
          </div>
          <h1>{meta.title}</h1>
          <p>{meta.copy}</p>
          <div className="workspace-status-row">
            <StatusPill done={Boolean(plaid)} label="Accounts connected" />
            <StatusPill done={diff.length > 0} label="Memory committed" />
            <StatusPill done={Boolean(graph)} label="Graph ready" />
          </div>
          {error ? <div className="workspace-error">{error}</div> : null}
        </section>

        {route === 'connect' ? (
          <ConnectAccountsPage
            plaid={plaid}
            busy={busy === 'connect'}
            enabledAccounts={enabledAccounts}
            visibleTransactions={visibleTransactions}
            onRun={runAccountLink}
            onContinue={() => go('memory')}
            onToggleAccount={(accountId) =>
              setEnabledAccounts((current) => ({ ...current, [accountId]: !current[accountId] }))
            }
            onToggleTransaction={(transactionId) =>
              setVisibleTransactions((current) => ({ ...current, [transactionId]: !current[transactionId] }))
            }
          />
        ) : null}

        {route === 'memory' ? (
          <CommitMemoryPage
            questionnaire={questionnaire}
            diff={diff}
            trace={onboardingTrace}
            busy={busy === 'memory'}
            onUpdate={(key, value) => setQuestionnaire((current) => ({ ...current, [key]: value }))}
            onCommit={runMemoryCommit}
          />
        ) : null}

        {route === 'home' ? (
          <HomeGraphPage
            graph={graph}
            diff={diff}
            onboardingTrace={onboardingTrace}
            scenarioTrace={scenarioTrace}
            selectedNode={selectedNode}
            selectedNodeId={selectedNodeId}
            busyTrace={busy === 'trace'}
            onSelect={setSelectedNodeId}
            onRefresh={refreshGraph}
            onTrace={runTraceReplay}
            statusCopy={`${enabledAccountCount} accounts enabled, ${visibleTransactionCount} transactions visible`}
          />
        ) : null}
      </main>
    </section>
  )
}

function ConnectAccountsPage({
  plaid,
  busy,
  enabledAccounts,
  visibleTransactions,
  onRun,
  onContinue,
  onToggleAccount,
  onToggleTransaction,
}: {
  plaid: PlaidLinkResult | null
  busy: boolean
  enabledAccounts: Record<string, boolean>
  visibleTransactions: Record<string, boolean>
  onRun: () => void
  onContinue: () => void
  onToggleAccount: (accountId: string) => void
  onToggleTransaction: (transactionId: string) => void
}) {
  const accounts = plaid?.accounts ?? []
  const transactions = plaid?.transactions ?? []
  const groupedAccounts = groupAccounts(accounts)

  return (
    <section className="workspace-stage connect-stage">
      <article className="workspace-card connect-console">
        <header className="workspace-card__header">
          <div>
            <span className="workspace-kicker">Account connection</span>
            <h2>Secure brokerage import</h2>
          </div>
          <Bank size={30} />
        </header>

        <div className="institution-card institution-card--large">
          <Wallet size={32} />
          <div>
            <strong>{plaid?.institution ?? 'Connect your financial accounts'}</strong>
            <p>Review linked banks, brokerages, funds, and transaction visibility before continuing.</p>
          </div>
        </div>

        {!plaid ? (
          <div className="plaid-flow plaid-flow--vertical">
            {[
              ['Choose institutions', 'Connect checking, savings, brokerage, and mutual fund accounts.'],
              ['Review permissions', 'Toggle which accounts and transactions CalmVest can use.'],
              ['Confirm import', 'Continue only after the user approves the connected context.'],
            ].map(([label, copy], index) => (
              <div className={`plaid-step ${index === 0 ? 'done' : ''}`} key={label}>
                <span>{index === 0 ? <Check size={16} weight="bold" /> : index + 1}</span>
                <div>
                  <strong>{label}</strong>
                  <p>{copy}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="account-review">
            {groupedAccounts.map((group) => (
              <section className="account-group" key={group.label}>
                <header>
                  <span>{group.label}</span>
                  <strong>{group.accounts.length}</strong>
                </header>
                <div className="account-list">
                  {group.accounts.map((account) => (
                    <AccountRow
                      account={account}
                      transactions={transactions.filter((transaction) => transaction.accountId === account.id)}
                      enabled={enabledAccounts[account.id] ?? true}
                      visibleTransactions={visibleTransactions}
                      key={account.id}
                      onToggleAccount={onToggleAccount}
                      onToggleTransaction={onToggleTransaction}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <button className="workspace-primary wide" type="button" disabled={busy} onClick={onRun}>
          {busy ? 'Connecting accounts...' : plaid ? 'Refresh connection' : 'Connect accounts'} <ArrowRight size={18} />
        </button>
        {plaid ? (
          <button className="workspace-secondary wide" type="button" onClick={onContinue}>
            Continue to memory questions <ArrowRight size={18} />
          </button>
        ) : null}
      </article>

      <aside className="workspace-card import-summary">
        <span className="workspace-kicker">Connection summary</span>
        <h2>Approved data</h2>
        <div className="import-grid import-grid--stacked">
          <Metric label="Enabled accounts" value={Object.values(enabledAccounts).filter(Boolean).length} />
          <Metric label="Holdings" value={plaid?.imported.holdings ?? 0} />
          <Metric label="Tax lots" value={plaid?.imported.taxLots ?? 0} />
          <Metric label="Visible transactions" value={Object.values(visibleTransactions).filter(Boolean).length} />
        </div>
      </aside>
    </section>
  )
}

function AccountRow({
  account,
  transactions,
  enabled,
  visibleTransactions,
  onToggleAccount,
  onToggleTransaction,
}: {
  account: ConnectedAccount
  transactions: ConnectedTransaction[]
  enabled: boolean
  visibleTransactions: Record<string, boolean>
  onToggleAccount: (accountId: string) => void
  onToggleTransaction: (transactionId: string) => void
}) {
  return (
    <article className={`account-row ${enabled ? 'enabled' : ''}`}>
      <div className="account-row__top">
        <button className="account-toggle" type="button" onClick={() => onToggleAccount(account.id)}>
          {enabled ? <CheckCircle size={18} weight="fill" /> : <Clock size={18} />}
          {enabled ? 'Enabled' : 'Disabled'}
        </button>
        <div>
          <strong>{account.institution ?? 'Institution'}</strong>
          <span>{account.name}</span>
        </div>
        <p>{formatMoney(account.balance)}</p>
      </div>
      <div className="transaction-list">
        {transactions.slice(0, 4).map((transaction) => {
          const visible = visibleTransactions[transaction.id] ?? true
          return (
            <button
              className={`transaction-row ${visible ? 'visible' : ''}`}
              type="button"
              key={transaction.id}
              onClick={() => onToggleTransaction(transaction.id)}
            >
              {visible ? <Eye size={16} /> : <EyeSlash size={16} />}
              <span>{transaction.description}</span>
              <strong>{formatMoney(transaction.amount)}</strong>
            </button>
          )
        })}
      </div>
    </article>
  )
}

function CommitMemoryPage({
  questionnaire,
  diff,
  trace,
  busy,
  onUpdate,
  onCommit,
}: {
  questionnaire: QuestionnaireAnswers
  diff: MemoryDiffItem[]
  trace: AgentTraceEvent[]
  busy: boolean
  onUpdate: (key: string, value: string) => void
  onCommit: () => void
}) {
  return (
    <section className="workspace-stage memory-stage">
      <article className="workspace-card memory-editor-card">
        <header className="workspace-card__header">
          <div>
            <span className="workspace-kicker">Natural-language intake</span>
            <h2>Write the whole profile once</h2>
          </div>
          <FileText size={30} />
        </header>

        <div className="questionnaire-grid">
          {questionnaireFields.map((field, index) => (
            <label className={'kind' in field && field.kind === 'long' ? 'question-field question-field--long' : 'question-field'} key={field.key}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{field.label}</strong>
              {'kind' in field && field.kind === 'long' ? (
                <textarea value={questionnaire[field.key] ?? ''} onChange={(event) => onUpdate(field.key, event.target.value)} />
              ) : (
                <input value={questionnaire[field.key] ?? ''} onChange={(event) => onUpdate(field.key, event.target.value)} />
              )}
            </label>
          ))}
        </div>

        <button className="workspace-primary wide" type="button" disabled={busy} onClick={onCommit}>
          {busy ? 'Compiling official memory...' : `Commit ${questionnaireFields.length} answers to memory`} <Database size={18} />
        </button>
      </article>

      <aside className="workspace-side memory-output-side">
        <DiffPanel diff={diff} />
        <TracePanel title="Memory setup trace" events={trace} empty="Commit memory to create profile tool calls." />
      </aside>
    </section>
  )
}

function HomeGraphPage({
  graph,
  diff,
  onboardingTrace,
  scenarioTrace,
  selectedNode,
  selectedNodeId,
  busyTrace,
  onSelect,
  onRefresh,
  onTrace,
  statusCopy,
}: {
  graph: MemoryGraph | null
  diff: MemoryDiffItem[]
  onboardingTrace: AgentTraceEvent[]
  scenarioTrace: AgentTraceEvent[]
  selectedNode: MemoryGraphNode | null
  selectedNodeId: string
  busyTrace: boolean
  onSelect: (id: string) => void
  onRefresh: () => void
  onTrace: () => void
  statusCopy: string
}) {
  return (
    <section className="workspace-stage home-stage">
      <article className="workspace-card graph-card graph-card--home">
        <header className="workspace-card__header">
          <div>
            <span className="workspace-kicker">Memory Graph Studio</span>
            <h2>Official app home</h2>
            <p className="home-status-copy">{statusCopy}</p>
          </div>
          <div className="workspace-actions inline-actions">
            <button className="workspace-secondary compact" type="button" onClick={onRefresh}>
              Refresh
            </button>
            <button className="workspace-primary compact" type="button" disabled={busyTrace} onClick={onTrace}>
              {busyTrace ? 'Running...' : 'Run trace'}
            </button>
          </div>
        </header>

        <GraphStudio
          graph={graph}
          selectedNode={selectedNode}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
        />
      </article>

      <aside className="workspace-side">
        <DiffPanel diff={diff} />
        <TracePanel title="Memory trace" events={onboardingTrace} empty="Memory setup trace will appear after commit." />
        <TracePanel title="Scenario trace" events={scenarioTrace} empty="Run trace to stream agent handoffs." />
      </aside>
    </section>
  )
}

function GraphStudio({
  graph,
  selectedNode,
  selectedNodeId,
  onSelect,
}: {
  graph: MemoryGraph | null
  selectedNode: MemoryGraphNode | null
  selectedNodeId: string
  onSelect: (id: string) => void
}) {
  const nodes = graph?.nodes ?? []

  return (
    <div className="graph-studio">
      <div className="graph-orbit">
        <div className="maya-node">
          <UserCircle size={28} weight="duotone" />
          <strong>Maya</strong>
          <span>home context</span>
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
          <p>Connect accounts or commit memory to load graph context.</p>
        )}
      </div>
    </div>
  )
}

function DiffPanel({ diff }: { diff: MemoryDiffItem[] }) {
  const items = diff.length ? diff : previewDiff
  return (
    <article className="trace-card">
      <header>
        <h2>Memory diff</h2>
        <span>{items.length}</span>
      </header>
      <div className="diff-strip diff-strip--stacked">
        {items.map((item) => (
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
            ? ShieldCheck
            : kind === 'cash_flow'
              ? TrendUp
              : kind === 'communication'
                ? FlowArrow
                : kind === 'values'
                  ? Lock
                  : kind === 'person'
                    ? HouseLine
                    : Graph

  return <Icon size={18} />
}

function getWorkspaceRoute(): WorkspaceRoute {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash === 'workspace/memory') return 'memory'
  if (hash === 'workspace/home') return 'home'
  if (hash === 'workspace/connect') return 'connect'
  return 'connect'
}

function groupAccounts(accounts: ConnectedAccount[]) {
  const groups = [
    { label: 'Bank accounts', types: ['checking', 'savings', 'credit'], accounts: [] as ConnectedAccount[] },
    { label: 'Brokerage accounts', types: ['brokerage', 'cash'], accounts: [] as ConnectedAccount[] },
    { label: 'Mutual funds', types: ['mutual_fund'], accounts: [] as ConnectedAccount[] },
  ]
  for (const account of accounts) {
    const group = groups.find((item) => item.types.includes(account.type))
    group?.accounts.push(account)
  }
  return groups.filter((group) => group.accounts.length > 0)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function buildDefaultQuestionnaire(): QuestionnaireAnswers {
  return Object.fromEntries(questionnaireFields.map((field) => [field.key, field.defaultValue]))
}

function buildProfileText(answers: QuestionnaireAnswers) {
  return questionnaireFields
    .map((field, index) => `${index + 1}. ${field.label}\n${answers[field.key] || 'Not answered yet'}`)
    .join('\n\n')
}

const questionnaireFields = [
  { key: 'full_name', label: 'What is your full name?', defaultValue: 'Maya Patel' },
  { key: 'age', label: 'How old are you?', defaultValue: '24' },
  { key: 'household', label: 'Who depends on you financially, if anyone?', defaultValue: 'No dependents right now.' },
  { key: 'work', label: 'What do you do for work?', defaultValue: 'Early-career product designer.' },
  { key: 'income_stability', label: 'How stable does your income feel over the next year?', defaultValue: 'Mostly stable, but I want a larger buffer.' },
  { key: 'primary_goal', label: 'What is your most important financial goal?', defaultValue: 'Buy a home.' },
  { key: 'primary_goal_amount', label: 'How much money does that goal need?', defaultValue: '80000' },
  { key: 'primary_goal_date', label: 'When do you want to reach that goal?', defaultValue: '2029-05' },
  { key: 'secondary_goals', label: 'What other goals should CalmVest remember?', defaultValue: 'Build an emergency fund and keep investing for retirement.' },
  { key: 'goal_priority', label: 'How should these goals be prioritized?', defaultValue: 'Home down payment first, emergency fund second, retirement third.' },
  { key: 'near_term_liquidity', label: 'Could you need to withdraw money in the next 12 months?', defaultValue: 'I may need to withdraw 20% next year if the home timeline moves up.' },
  { key: 'emergency_fund', label: 'How much emergency cash do you want available?', defaultValue: 'At least six months of expenses.' },
  { key: 'monthly_savings', label: 'How much can you usually save or invest monthly?', defaultValue: 'Around $500 when expenses are normal.' },
  { key: 'debt', label: 'Do you have debt CalmVest should consider?', defaultValue: 'Credit card is paid monthly; no major debt.' },
  { key: 'market_drop_response', label: 'How would you react if investments dropped 20%?', defaultValue: 'I would be very worried and would need plain-English guidance before acting.' },
  { key: 'risk_preference', label: 'Do you prefer growth, balance, or stability?', defaultValue: 'Balanced, with protection for near-term cash.' },
  { key: 'investment_experience', label: 'How experienced are you with investing?', defaultValue: 'Beginner. I know basic terms but need help with tradeoffs.' },
  { key: 'taxable_accounts', label: 'Do you have taxable investment accounts?', defaultValue: 'Yes, I have taxable brokerage assets.' },
  { key: 'tax_sensitivity', label: 'How important is tax-aware decision making?', defaultValue: 'Important. I want tax impact explained before selling anything.' },
  { key: 'values', label: 'What values or constraints should guide recommendations?', defaultValue: 'Simplicity, control, transparency, and avoiding unnecessary complexity.' },
  { key: 'communication_style', label: 'How should CalmVest explain decisions?', defaultValue: 'Plain English, clear next steps, no jargon.' },
  { key: 'approval_style', label: 'What should require your approval?', defaultValue: 'Any financial action, trade plan, withdrawal, or tax-sensitive decision.' },
  { key: 'worries', label: 'What financial worries should the agents watch for?', defaultValue: 'Market drops, not having enough cash, and delaying my home goal.' },
  { key: 'open_questions', label: 'What is still uncertain or worth asking later?', defaultValue: 'Exact home timing, income changes, and whether sustainability preferences matter.', kind: 'long' },
] as const

const previewDiff: MemoryDiffItem[] = [
  { kind: 'set', label: 'Full memory profile', value: 'Waiting for official commit' },
  { kind: 'added', label: 'Goals', value: 'Goals will be extracted from the intake' },
  { kind: 'updated', label: 'Risk and liquidity', value: 'Risk behavior and liquidity needs will be structured' },
  { kind: 'set', label: 'Values and preferences', value: 'Communication, constraints, and values will be saved' },
]
