import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bank,
  Check,
  CheckCircle,
  Clock,
  Database,
  Eye,
  EyeSlash,
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

const fallbackUserId = 'maya-patel-demo'
const activeUserKey = 'northstar.activeUserId'
const activeUserNameKey = 'northstar.activeUserName'

const defaultAnswers: OnboardingAnswers = {
  userId: fallbackUserId,
  profileText: '',
  goal: '',
  targetAmount: 0,
  targetDate: '',
  withdrawalNeed: '',
  drawdownFeeling: '',
  taxableAccount: false,
  communicationStyle: '',
  values: '',
}

type WorkspaceRoute = 'connect' | 'memory' | 'home'
type ConnectedAccount = PlaidLinkResult['accounts'][number]
type ConnectedTransaction = PlaidLinkResult['transactions'][number]
type QuestionnaireAnswers = Record<string, string>

const questionnaireSampleAnswers: QuestionnaireAnswers = {
  full_name:
    'My name is Kushagra Bharti. I usually go by Kushagra, and this profile should treat me as the primary decision-maker for all financial planning. I want Northstar to remember that I prefer direct, practical guidance and that I care about seeing the reasoning behind recommendations before taking action.',
  age:
    'I am in my early career and still building the foundation of my financial life. I am not trying to optimize every small detail yet; I want a durable system for cash flow, investing, goals, tax awareness, and long-term decision-making that can scale as my income and responsibilities grow.',
  location:
    'I currently live in the United States and expect my location to stay flexible over the next few years. I may move for work, lifestyle, or housing reasons, so Northstar should avoid assuming that my rent, tax situation, or cost of living will stay fixed forever.',
  household:
    'I am currently planning primarily for myself. I do not have formal dependents right now, but I may occasionally support family or cover one-off expenses. Northstar should treat family support as a possible future cash-flow need, not as a current fixed obligation.',
  life_events:
    'I may change jobs, increase income, relocate, buy a home, start a company or side project, and take on more family responsibility over time. I want my plan to stay flexible enough that I can make big moves without constantly rebuilding everything from scratch.',
  work:
    'I earn money primarily through work income, with the possibility of bonuses, side income, or project-based income later. Northstar should distinguish stable recurring income from uncertain upside and should not build a plan that depends on variable income unless I explicitly say so.',
  income_stability:
    'My income feels reasonably stable, but I still want to plan conservatively because early-career income can change quickly. If there is uncertainty around job changes, bonuses, or side income, Northstar should keep enough cash flexibility before recommending aggressive investing.',
  monthly_income:
    'My monthly take-home income can vary depending on taxes, benefits, and any extra work. For planning, Northstar should ask for exact numbers when needed, but in the meantime it should model take-home income separately from gross income and avoid confusing salary with spendable cash.',
  monthly_spending:
    'My spending includes housing, food, transportation, subscriptions, insurance, personal expenses, and occasional larger purchases. I want Northstar to separate required fixed costs from flexible lifestyle spending so it can identify where savings can realistically improve without making the plan feel unrealistic.',
  monthly_savings:
    'I want to save and invest consistently, but the exact amount may change month to month. Northstar should look at average monthly surplus, recurring transfers, and one-off expenses, then recommend a realistic baseline contribution that I can maintain without constantly stopping and restarting.',
  cash_buffer_current:
    'I want Northstar to treat cash buffer as a first-class planning object. If my current buffer is below target, North should prioritize building it before suggesting investments that would make me feel locked in or exposed during an emergency.',
  cash_buffer_target:
    'A target of at least six months of core expenses feels right for now. If my income becomes less stable, I relocate, or I take on more responsibility, Northstar should consider increasing that target before recommending more aggressive long-term investments.',
  bank_accounts:
    'Northstar should understand checking for bills, high-yield savings for emergency cash, goal-specific savings for near-term plans, and credit cards used for normal spending. It should avoid treating all cash as available for investing because some cash is reserved for safety, bills, taxes, or specific goals.',
  investment_accounts:
    'I may have a taxable brokerage, retirement accounts, employer-sponsored plans, or fund holdings. Northstar should understand account type, tax treatment, time horizon, liquidity, and purpose. It should not recommend selling, reallocating, or withdrawing without explaining tax impact and goal impact.',
  employer_benefits:
    'Employer benefits may include retirement match, health insurance, HSA or FSA options, equity compensation, bonuses, and other benefits. Northstar should consider benefits as part of total compensation and should flag when I may be missing obvious value, like an employer match.',
  real_estate_assets:
    'I do not want Northstar to assume real estate is automatically good or bad. If I pursue buying a home, it should evaluate down payment, closing costs, maintenance, cash reserves, mortgage readiness, opportunity cost, location flexibility, and whether the purchase would make my life less flexible.',
  debt:
    'Debt should be evaluated by interest rate, minimum payment, payoff timeline, psychological burden, and whether it affects future borrowing. High-interest debt should generally be prioritized, while low-interest debt should be evaluated against liquidity and investing tradeoffs.',
  credit_profile:
    'Credit matters because it can affect housing, financing, and financial flexibility. Northstar should help protect credit health by watching utilization, payment behavior, account changes, and any actions that could hurt future mortgage or loan readiness.',
  primary_goal:
    'My most important goal is to build enough financial flexibility to make a major life move without feeling trapped. That could mean buying a home, relocating, starting something entrepreneurial, or taking a better opportunity. If the goal becomes home buying, assume I may need something like $80,000 for down payment, closing costs, moving costs, and a post-purchase cash buffer, but Northstar should refine that number instead of blindly accepting it.',
  primary_goal_amount:
    'A working target of $80,000 is reasonable for a major housing or flexibility goal, but I want Northstar to break that into components: minimum required amount, safer target, ideal target, and the amount that should remain untouched as emergency cash.',
  primary_goal_date:
    'I want to understand what is possible over the next 3 months, 12 months, 3 years, and 5 years. If a date is too aggressive, Northstar should say so clearly and show what monthly savings rate or risk tradeoff would be required.',
  secondary_goals:
    'Other goals include building emergency cash, investing for long-term wealth, keeping optionality for relocation or career changes, avoiding unnecessary tax mistakes, and having enough liquidity to take advantage of opportunities. Northstar should allow multiple goals to coexist rather than forcing everything into one target.',
  goal_priority:
    'Safety and flexibility come first, then high-confidence goals, then long-term compounding, then lifestyle upgrades. If two goals conflict, Northstar should show the tradeoff clearly and recommend the path that preserves the most future optionality.',
  near_term_liquidity:
    'Yes, I could need cash on short notice for relocation, a housing opportunity, taxes, family support, or a major purchase. Northstar should classify money by time horizon and avoid putting near-term money into strategies that could force selling at a bad time.',
  non_negotiables:
    'I do not want to sacrifice emergency safety, tax awareness, or long-term flexibility for a slightly better expected return. I also do not want recommendations that look optimal on paper but would create stress, lock me into a rigid plan, or require constant manual maintenance.',
  market_drop_response:
    'If markets dropped sharply, I would want calm, concrete guidance. I do not want generic reassurance. I want Northstar to show what changed, which goals are affected, what actions are available, what actions are unnecessary, and what should wait until emotions settle.',
  risk_preference:
    'I am willing to take risk for long-term goals if the money truly has a long time horizon. I am not comfortable taking meaningful market risk with money that might be needed soon. Northstar should separate risk tolerance from risk capacity.',
  risk_capacity:
    'Long-term retirement or wealth-building money can support more volatility. Near-term goal money should be more conservative. If a goal is within three years, Northstar should heavily consider cash, short-duration options, or lower-volatility approaches.',
  investment_experience:
    'I understand the basics, but I want help making decisions across accounts, taxes, liquidity, and risk. I do not want the system to assume I understand every term. It should explain the important parts without oversimplifying the tradeoffs.',
  decision_behavior:
    'Under stress, I may over-check balances, overthink decisions, delay action, or want to make a sudden change to feel in control. Northstar should slow down high-impact decisions, summarize options, and separate urgent actions from emotional reactions.',
  taxable_accounts:
    'If I have taxable brokerage assets, Northstar should treat them differently from retirement accounts. It should track cost basis, unrealized gains and losses, holding period, dividend exposure, and tax consequences before recommending trades or withdrawals.',
  tax_sensitivity:
    'Tax impact should be part of every recommendation involving selling, rebalancing, withdrawing, harvesting losses, changing contributions, or moving assets. I want tax explanations in plain English with the estimated impact and the reason for acting now versus waiting.',
  filing_context:
    'My tax situation may be mostly W-2 income now, but it could become more complex if I add side income, equity compensation, investing gains, or relocation. Northstar should ask for updated tax context before making sensitive recommendations.',
  realized_gains:
    'Northstar should check for unrealized gains, unrealized losses, concentrated positions, overlapping funds, high-fee funds, and positions that are not aligned with my goals. If the data is missing, it should mark the uncertainty instead of guessing.',
  tax_permissions:
    'Any sale, realized gain, tax-loss harvesting decision, withdrawal, retirement contribution change, account transfer, or tax assumption needs explicit approval. Northstar can recommend and explain, but it should not execute or imply execution without consent.',
  insurance:
    'Northstar should remember health insurance, disability coverage, life insurance needs, renters or homeowners insurance, and umbrella coverage if relevant. It should identify obvious gaps, especially if dependents, home ownership, or income reliance changes.',
  estate_documents:
    'Beneficiaries, estate documents, emergency contacts, and account access should be reviewed periodically. I may not have everything set up yet, so Northstar should flag this as a planning gap without treating it as urgent unless my responsibilities change.',
  family_support:
    'Family support is not a fixed monthly obligation right now, but it could become relevant. Northstar should preserve flexibility for one-off family help and should ask before assuming money is unavailable for my own goals.',
  values:
    'Recommendations should prioritize clarity, control, transparency, flexibility, and low unnecessary complexity. I prefer systems that are easy to understand and maintain over strategies that are theoretically optimal but fragile or confusing.',
  communication_style:
    'Northstar should explain decisions in plain English with clear next steps, assumptions, data used, risks, tax considerations, and what would change the recommendation. It should be direct and not hide uncertainty.',
  approval_style:
    'Any financial action, trade plan, withdrawal, tax-sensitive move, account setting change, beneficiary change, data-sharing change, or recommendation that materially changes risk should require explicit approval.',
  advisor_boundaries:
    'Northstar should never place trades, move money, sell assets, change beneficiaries, modify account settings, submit tax actions, or contact institutions without explicit approval. It can prepare recommendations and drafts, but execution must stay user-approved.',
  worries:
    'North should monitor insufficient cash, overexposure to market risk, tax mistakes, goal delays, overspending, loss of flexibility, hidden fees, concentrated positions, and recommendations that are too complex for the benefit they provide.',
  open_questions:
    'Northstar should ask later about exact income, account balances, cost basis, employer benefits, future location, home-buying timeline, insurance needs, family support expectations, values-based investing preferences, and whether my risk comfort changes after seeing real account data.',
}

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
    copy: 'The onboarding answers become one structured LLM input. The backend compiles goals, values, risk, tax context, preferences, and the official memory.md.',
  },
  home: {
    label: 'Home',
    eyebrow: 'Dashboard home',
    title: 'Memory graph is the app home.',
    copy: 'The core app opens on reusable context: who the user is, what they want, what they fear, and what North can load.',
  },
}

export function WealthWorkspacePage() {
  const activeUserId = localStorage.getItem(activeUserKey) ?? fallbackUserId
  const activeUserName = formatPersonName(localStorage.getItem(activeUserNameKey) ?? '')
  const activeUserFirstName = firstNameFrom(activeUserName)
  const [route, setRoute] = useState<WorkspaceRoute>(() => getWorkspaceRoute())
  const [answers] = useState<OnboardingAnswers>({ ...defaultAnswers, userId: activeUserId })
  const [plaid, setPlaid] = useState<PlaidLinkResult | null>(null)
  const [enabledAccounts, setEnabledAccounts] = useState<Record<string, boolean>>({})
  const [visibleTransactions, setVisibleTransactions] = useState<Record<string, boolean>>({})
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireAnswers>(() => buildDefaultQuestionnaire(activeUserId, activeUserName))
  const [activeQuestionSection, setActiveQuestionSection] = useState(questionnaireSections[0].id)
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
    window.addEventListener('popstate', syncRoute)
    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  const refreshGraph = useCallback(async () => {
    const nextGraph = await getMemoryGraph(activeUserId)
    setGraph(nextGraph)
    setSelectedNodeId((current) =>
      nextGraph.nodes.some((node) => node.id === current) ? current : nextGraph.nodes[0]?.id ?? 'maya',
    )
  }, [activeUserId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshGraph()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshGraph])

  useEffect(() => {
    if (activeUserId === fallbackUserId) return
    const graphName = formatPersonName(graph?.contextPacket.user.name ?? '')
    if (!graphName) return
    const timer = window.setTimeout(() => {
      setQuestionnaire((current) => {
        if (current.full_name?.trim() && current.full_name !== questionnaireSampleAnswers.full_name) return current
        return { ...current, full_name: graphName }
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeUserId, graph])

  useEffect(() => {
    if (activeUserId === fallbackUserId) return
    const timer = window.setTimeout(() => {
      setQuestionnaire((current) => removeSampleAnswers(current, activeUserName))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeUserId, activeUserName])

  useEffect(() => {
    localStorage.setItem(questionnaireStorageKey(activeUserId), JSON.stringify(questionnaire))
  }, [activeUserId, questionnaire])

  function go(nextRoute: WorkspaceRoute) {
    window.history.pushState({}, '', `/workspace/${nextRoute}`)
    setRoute(nextRoute)
  }

  function openDashboard() {
    window.history.pushState({}, '', '/dashboard')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const enabledAccountCount = Object.values(enabledAccounts).filter(Boolean).length
  const visibleTransactionCount = Object.values(visibleTransactions).filter(Boolean).length

  async function runAccountLink() {
    setError('')
    setBusy('connect')
    try {
      const result = await linkAccounts(activeUserId)
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
        targetAmount: parseCurrencyAmount(questionnaire.primary_goal_amount) ?? parseCurrencyAmount(questionnaire.primary_goal) ?? 0,
        targetDate: questionnaire.primary_goal_date || answers.targetDate,
        withdrawalNeed: questionnaire.near_term_liquidity || answers.withdrawalNeed,
        drawdownFeeling: questionnaire.market_drop_response || answers.drawdownFeeling,
        taxableAccount: hasTaxableAccount(questionnaire.taxable_accounts),
        communicationStyle: questionnaire.communication_style || answers.communicationStyle,
        values: questionnaire.values || answers.values,
      })
      setDiff(result.diff)
      setOnboardingTrace(result.trace)
      await refreshGraph()
      openDashboard()
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
      await streamScenarioTrace(activeUserId, (event) => setScenarioTrace((current) => [...current, event]))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not stream scenario trace.')
    } finally {
      setBusy(null)
    }
  }

  const meta = routeMeta[route]
  const showWorkspaceCopy = route === 'home'

  return (
    <section className="workspace-surface">
      <img className="workspace-surface__bg" src={landingBackground} alt="" aria-hidden="true" />
      <div className="workspace-surface__wash" aria-hidden="true" />

      <header className="workspace-topbar">
        <button className="workspace-brand" type="button" onClick={() => window.location.reload()}>
          <img src={northstarLogo} alt="" aria-hidden="true" />
          <span>Northstar</span>
        </button>
      </header>

      <main className={`workspace-page workspace-page--${route}`}>
        {showWorkspaceCopy ? (
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
        ) : null}

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
            error={error}
            firstName={activeUserFirstName}
          />
        ) : null}

        {route === 'memory' ? (
          <CommitMemoryPage
            questionnaire={questionnaire}
            busy={busy === 'memory'}
            activeSection={activeQuestionSection}
            onSelectSection={setActiveQuestionSection}
            onUpdate={(key, value) => setQuestionnaire((current) => ({ ...current, [key]: value }))}
            onCommit={runMemoryCommit}
            error={error}
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
  error,
  firstName,
}: {
  plaid: PlaidLinkResult | null
  busy: boolean
  enabledAccounts: Record<string, boolean>
  visibleTransactions: Record<string, boolean>
  onRun: () => void
  onContinue: () => void
  onToggleAccount: (accountId: string) => void
  onToggleTransaction: (transactionId: string) => void
  error: string
  firstName: string
}) {
  const greetingTarget = firstName ? `Welcome ${firstName}` : ''
  const [typedGreeting, setTypedGreeting] = useState('')
  const accounts = plaid?.accounts ?? []
  const transactions = plaid?.transactions ?? []
  const groupedAccounts = groupAccounts(accounts)
  const enabledAccountCount = Object.values(enabledAccounts).filter(Boolean).length
  const visibleTransactionCount = Object.values(visibleTransactions).filter(Boolean).length

  useEffect(() => {
    if (!greetingTarget) return
    let cancelled = false
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    async function animateGreeting() {
      for (let index = 1; index <= greetingTarget.length; index += 1) {
        if (cancelled) return
        setTypedGreeting(greetingTarget.slice(0, index))
        await sleep(52)
      }
      await sleep(2000)
      for (let index = greetingTarget.length - 1; index >= 0; index -= 1) {
        if (cancelled) return
        setTypedGreeting(greetingTarget.slice(0, index))
        await sleep(30)
      }
    }

    void animateGreeting()
    return () => {
      cancelled = true
    }
  }, [greetingTarget])

  return (
    <section className="workspace-stage workspace-stage--full connect-stage">
      {greetingTarget ? (
        <span className={`workspace-welcome-type ${typedGreeting ? '' : 'is-empty'}`} aria-label={greetingTarget}>
          {typedGreeting}
        </span>
      ) : null}
      <article className="workspace-card connect-product-card">
        <header className="workspace-card__header connect-hero-header">
          <div>
            <span className="workspace-kicker">Account connection</span>
            <h1>Choose what Northstar can see.</h1>
            <p>
              Connect financial accounts, review permissions, and approve the exact balances and transactions used to
              build your memory.
            </p>
          </div>
          <div className="connect-secure-mark">
            <ShieldCheck size={24} weight="duotone" />
            <span>Encrypted import</span>
          </div>
        </header>

        {!plaid ? (
          <div className="connection-start-panel">
            <div className="connection-start-panel__copy">
              <Bank size={36} weight="duotone" />
              <div>
                <strong>Start with account visibility</strong>
                <p>
                  Northstar will generate a user-specific financial workspace with bank accounts, brokerages, funds,
                  tax lots, holdings, and transactions. You approve what continues into onboarding.
                </p>
              </div>
            </div>
            <div className="plaid-flow plaid-flow--product">
            {[
              ['Connect institutions', 'Checking, savings, credit, brokerage, retirement, and fund accounts.'],
              ['Review permissions', 'Toggle account-level and transaction-level access before continuing.'],
              ['Approve memory context', 'Only approved financial context moves into the questionnaire.'],
            ].map(([label, copy], index) => (
              <div className="plaid-step" key={label}>
                <span>{index === 0 ? <Check size={16} weight="bold" /> : index + 1}</span>
                <div>
                  <strong>{label}</strong>
                  <p>{copy}</p>
                </div>
              </div>
            ))}
            </div>
          </div>
        ) : (
          <>
          <div className="connect-summary-bar">
            <Metric label="Enabled accounts" value={enabledAccountCount} />
            <Metric label="Holdings" value={plaid.imported.holdings} />
            <Metric label="Tax lots" value={plaid.imported.taxLots} />
            <Metric label="Visible transactions" value={visibleTransactionCount} />
          </div>
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
          </>
        )}

        {error ? <div className="workspace-error workspace-error--inline">{error}</div> : null}

        <div className={`workspace-action-row ${plaid ? '' : 'workspace-action-row--single'}`}>
          <button className="workspace-primary wide" type="button" disabled={busy} onClick={onRun}>
            {busy ? 'Connecting accounts...' : plaid ? 'Refresh connection' : 'Connect accounts'} <ArrowRight size={18} />
          </button>
          {plaid ? (
            <button className="workspace-secondary wide" type="button" onClick={onContinue}>
              Continue to memory questions <ArrowRight size={18} />
            </button>
          ) : null}
        </div>
      </article>
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
  busy,
  activeSection,
  onSelectSection,
  onUpdate,
  onCommit,
  error,
}: {
  questionnaire: QuestionnaireAnswers
  busy: boolean
  activeSection: string
  onSelectSection: (sectionId: QuestionnaireSectionId) => void
  onUpdate: (key: string, value: string) => void
  onCommit: () => void
  error: string
}) {
  const answeredCount = questionnaireFields.filter((field) => (questionnaire[field.key] ?? '').trim().length > 0).length
  const visibleFields = questionnaireFields.filter((field) => field.section === activeSection)
  const activeSectionMeta = questionnaireSections.find((section) => section.id === activeSection) ?? questionnaireSections[0]

  return (
    <section className="workspace-stage workspace-stage--full memory-stage">
      <article className="workspace-card memory-product-card">
        <header className="workspace-card__header memory-hero-header">
          <div>
            <span className="workspace-kicker">Financial memory</span>
            <h1>Build the complete memory file.</h1>
            <p>
              Answer in natural language. The backend converts this into goals, constraints, preferences, and the
              official memory document.
            </p>
          </div>
          <div className="memory-progress">
            <strong>{answeredCount}</strong>
            <span>of {questionnaireFields.length} answered</span>
          </div>
        </header>

        <div className="memory-section-tabs" role="tablist" aria-label="Questionnaire sections">
          {questionnaireSections.map((section) => (
            <button
              className={section.id === activeSection ? 'active' : ''}
              type="button"
              key={section.id}
              onClick={() => onSelectSection(section.id)}
            >
              <span>{section.shortLabel}</span>
              <strong>{questionnaireFields.filter((field) => field.section === section.id).length}</strong>
            </button>
          ))}
        </div>

        <section className="question-section">
          <div className="question-section__intro">
            <span>{activeSectionMeta.label}</span>
            <p>{activeSectionMeta.copy}</p>
          </div>
          <div className="questionnaire-grid questionnaire-grid--product">
            {visibleFields.map((field) => {
              const globalIndex = questionnaireFields.findIndex((item) => item.key === field.key)
              return (
                <label className={field.kind === 'long' ? 'question-field question-field--long' : 'question-field'} key={field.key}>
                  <span>{String(globalIndex + 1).padStart(2, '0')}</span>
                  <strong>{field.label}</strong>
                  {field.kind === 'long' ? (
                    <textarea
                      value={questionnaire[field.key] ?? ''}
                      placeholder={field.placeholder}
                      onChange={(event) => onUpdate(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      value={questionnaire[field.key] ?? ''}
                      placeholder={field.placeholder}
                      onChange={(event) => onUpdate(field.key, event.target.value)}
                    />
                  )}
                </label>
              )
            })}
          </div>
        </section>

        {error ? <div className="workspace-error workspace-error--inline">{error}</div> : null}

        <div className="memory-submit-row">
          <div>
            <strong>Ready for memory commit</strong>
            <p>Creates structured goals, values, risk, tax context, approvals, and memory.md.</p>
          </div>
          <div className="memory-submit-action">
            <button className="workspace-primary" type="button" disabled={busy} onClick={onCommit}>
              {busy ? 'Compiling official memory...' : `Commit ${questionnaireFields.length} answers`} <Database size={18} />
            </button>
            {answeredCount < questionnaireFields.length ? (
              <small>Only {answeredCount} of {questionnaireFields.length} answers filled out so far!</small>
            ) : null}
          </div>
        </div>
      </article>
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
        <TracePanel title="Scenario trace" events={scenarioTrace} empty="Run trace to stream tool events." />
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
  const personNode = nodes.find((node) => node.kind === 'person')
  const sessionName = formatPersonName(localStorage.getItem(activeUserNameKey) ?? '')
  const displayName = resolveGraphDisplayName(sessionName, personNode?.label, graph?.contextPacket.user.name)
  const displayContext = formatGraphValue(personNode?.value || 'Your active memory profile')
  const orbitNodes = nodes.filter((node) => node.kind !== 'person')

  return (
    <div className="graph-studio">
      <div className="graph-orbit">
        <div className="maya-node">
          <UserCircle size={28} weight="duotone" />
          <strong>{displayName}</strong>
          <span>{displayContext}</span>
        </div>
        {orbitNodes.map((node, index) => (
          <button
            className={`memory-node memory-node-${index % 8} ${node.id === selectedNodeId ? 'active' : ''}`}
            type="button"
            key={node.id}
            onClick={() => onSelect(node.id)}
          >
            <NodeIcon kind={node.kind} />
            <strong>{formatGraphLabel(node.label)}</strong>
            <span>{formatGraphPreview(node)}</span>
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
                <h3>{formatGraphLabel(selectedNode.label)}</h3>
              </div>
            </div>
            <p>{formatGraphValue(selectedNode.value)}</p>
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
  const path = window.location.pathname
  if (path === '/workspace/memory') return 'memory'
  if (path === '/workspace/home') return 'home'
  if (path === '/workspace/connect' || path === '/workspace') return 'connect'

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

function questionnaireStorageKey(userId: string) {
  return `northstar.questionnaire.${userId}`
}

function buildDefaultQuestionnaire(userId: string, userName: string): QuestionnaireAnswers {
  const stored = localStorage.getItem(questionnaireStorageKey(userId))
  if (stored) {
    try {
      const parsed = {
        ...blankQuestionnaire(userName),
        ...(JSON.parse(stored) as QuestionnaireAnswers),
      }
      return userId === fallbackUserId ? parsed : removeSampleAnswers(parsed, userName)
    } catch {
      localStorage.removeItem(questionnaireStorageKey(userId))
    }
  }

  if (userId === fallbackUserId) {
    return Object.fromEntries(
      questionnaireFields.map((field) => [field.key, questionnaireSampleAnswers[field.key] ?? field.defaultValue]),
    )
  }

  return blankQuestionnaire(userName)
}

function removeSampleAnswers(answers: QuestionnaireAnswers, userName: string): QuestionnaireAnswers {
  return Object.fromEntries(
    questionnaireFields.map((field) => {
      const value = answers[field.key] ?? ''
      if (value === questionnaireSampleAnswers[field.key]) {
        return [field.key, field.key === 'full_name' ? userName : field.defaultValue]
      }
      return [field.key, value]
    }),
  )
}

function resolveGraphDisplayName(sessionName: string, personLabel?: string, graphName?: string) {
  const names = [personLabel, graphName, sessionName, 'You']
    .map((name) => formatPersonName(name ?? ''))
    .filter(Boolean)
  if (sessionName) {
    const nonDemoName = names.find((name) => !/^Maya(?:\s+Patel)?$/i.test(name))
    return nonDemoName || sessionName
  }
  return names[0] || 'You'
}

function formatGraphLabel(label: string) {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
}

function formatGraphValue(value: string) {
  const cleaned = value
    .trim()
    .replace(/_/g, ' ')
    .replace(/\$0(?:\.00)?\s+by\s+unknown/gi, 'target amount and timeline TBD')
    .replace(/\$0(?:\.00)?/gi, 'target amount TBD')
    .replace(/\bby\s+unknown\b/gi, 'timeline TBD')
    .replace(/\b0,\s*unknown\b/i, 'Your active memory profile')
    .replace(/\bunknown\b/gi, 'not filled in yet')
    .replace(/\bplain english\b/gi, 'Plain English')
    .replace(/\bmoderate cautious\b/gi, 'Moderate and cautious')
  if (!cleaned) return 'Not filled in yet'
  return cleaned
    .split(/\s*;\s*|\n+/)
    .map((chunk) => {
      const goalMatch = chunk.match(/^([^:]+):\s*(.+)$/)
      if (!goalMatch) return sentenceCase(chunk)
      const [, label, detail] = goalMatch
      return `${sentenceCase(label)}\n${sentenceCase(detail.replace(/,\s*timeline TBD/gi, ' - Timeline TBD'))}`
    })
    .filter(Boolean)
    .join('\n\n')
}

function formatGraphPreview(node: MemoryGraphNode) {
  const detail = formatGraphValue(node.value)
  if (node.kind === 'goal') {
    const goals = detail
      .split(/\n\n+/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (goals.length > 1) {
      const firstGoal = goals[0]?.split('\n')[0] ?? 'Goals mapped'
      return `${firstGoal} + ${goals.length - 1} more`
    }
  }
  return detail
    .replace(/\n+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sentenceCase(value: string) {
  const text = value.trim()
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function blankQuestionnaire(userName: string): QuestionnaireAnswers {
  return Object.fromEntries(
    questionnaireFields.map((field) => [field.key, field.key === 'full_name' ? userName : field.defaultValue]),
  )
}

function formatPersonName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function firstNameFrom(value: string) {
  return formatPersonName(value).split(/\s+/).filter(Boolean)[0] ?? ''
}

function buildProfileText(answers: QuestionnaireAnswers) {
  return questionnaireFields
    .map((field, index) => `${index + 1}. ${field.label}\n${answers[field.key] || 'Not answered yet'}`)
    .join('\n\n')
}

function parseCurrencyAmount(value: string | undefined): number | null {
  if (!value) return null
  const currencyMatch = value.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)(\s*(k|m|thousand|million))?/i)
  if (!currencyMatch) return null
  const numeric = Number(currencyMatch[1].replace(/,/g, ''))
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  const suffix = currencyMatch[3]?.toLowerCase()
  if (suffix === 'k' || suffix === 'thousand') return numeric * 1000
  if (suffix === 'm' || suffix === 'million') return numeric * 1000000
  return numeric
}

function hasTaxableAccount(value: string | undefined): boolean {
  const normalized = value?.toLowerCase() ?? ''
  return normalized.includes('taxable brokerage') || normalized.includes('taxable investment') || normalized.includes('yes')
}

type QuestionnaireSectionId =
  | 'identity'
  | 'cashflow'
  | 'assets'
  | 'goals'
  | 'risk'
  | 'tax'
  | 'protection'
  | 'preferences'

type QuestionnaireField = {
  key: string
  label: string
  defaultValue: string
  placeholder: string
  section: QuestionnaireSectionId
  kind?: 'long'
}

const questionnaireSections: Array<{ id: QuestionnaireSectionId; label: string; shortLabel: string; copy: string }> = [
  {
    id: 'identity',
    label: 'Identity and household',
    shortLabel: 'Household',
    copy: 'Who the profile belongs to, who depends on them, and what major life context should shape advice.',
  },
  {
    id: 'cashflow',
    label: 'Income and cash flow',
    shortLabel: 'Cash flow',
    copy: 'How money comes in, what usually goes out, and how much financial flexibility exists month to month.',
  },
  {
    id: 'assets',
    label: 'Accounts, assets, and liabilities',
    shortLabel: 'Assets',
    copy: 'The current financial picture across cash, investments, employer benefits, property, debt, and credit.',
  },
  {
    id: 'goals',
    label: 'Goals and liquidity needs',
    shortLabel: 'Goals',
    copy: 'What the user wants, when they need it, what can move, and what should never be compromised.',
  },
  {
    id: 'risk',
    label: 'Risk behavior and investing style',
    shortLabel: 'Risk',
    copy: 'Both risk tolerance and risk capacity: how the user feels, what they can afford, and how they make decisions.',
  },
  {
    id: 'tax',
    label: 'Taxes and account strategy',
    shortLabel: 'Taxes',
    copy: 'Taxable accounts, filing context, realized gains, tax-loss harvesting, and transaction sensitivity.',
  },
  {
    id: 'protection',
    label: 'Protection, insurance, and estate',
    shortLabel: 'Protection',
    copy: 'Insurance coverage, emergency planning, beneficiaries, estate documents, and important family obligations.',
  },
  {
    id: 'preferences',
    label: 'Values, approvals, and communication',
    shortLabel: 'Preferences',
    copy: 'How North should explain itself, what needs explicit approval, and what constraints the agent must respect.',
  },
]

const questionnaireFields: QuestionnaireField[] = [
  { key: 'full_name', section: 'identity', label: 'Tell Northstar who this memory belongs to.', defaultValue: '', placeholder: 'Example: My name is Jordan Lee. I usually go by Jordan.' },
  { key: 'age', section: 'identity', label: 'Share your age or life stage in your own words.', defaultValue: '', placeholder: 'Example: I am 24 and early in my career.' },
  { key: 'location', section: 'identity', label: 'Where do you live, and could that change?', defaultValue: '', placeholder: 'Example: I live in Chicago now, but I might move for work or a home purchase.' },
  { key: 'household', section: 'identity', label: 'Describe your household and anyone who depends on you.', defaultValue: '', placeholder: 'Example: No dependents right now, but I may help my parents occasionally.' },
  { key: 'life_events', section: 'identity', label: 'What major life events should North remember?', defaultValue: '', placeholder: 'Example: I may buy a home, change jobs, and start supporting family in the next few years.', kind: 'long' },
  { key: 'work', section: 'cashflow', label: 'Describe your work and how you earn money.', defaultValue: '', placeholder: 'Example: I work as a product designer with W-2 income and a possible annual bonus.' },
  { key: 'income_stability', section: 'cashflow', label: 'How stable does your income feel?', defaultValue: '', placeholder: 'Example: Mostly stable, but I want a larger buffer because my company has had layoffs.' },
  { key: 'monthly_income', section: 'cashflow', label: 'Describe your usual take-home income.', defaultValue: '', placeholder: 'Example: I take home about $5,200 per month after taxes, insurance, and 401(k) contributions.' },
  { key: 'monthly_spending', section: 'cashflow', label: 'Describe your typical spending and fixed bills.', defaultValue: '', placeholder: 'Example: I spend about $3,900 monthly including rent, food, transport, subscriptions, and loan minimums.', kind: 'long' },
  { key: 'monthly_savings', section: 'cashflow', label: 'How much can you usually save or invest?', defaultValue: '', placeholder: 'Example: On normal months I can save $500, but travel or family costs can reduce that.' },
  { key: 'cash_buffer_current', section: 'cashflow', label: 'How much cash buffer do you currently have?', defaultValue: '', placeholder: 'Example: I have around three months of expenses in cash right now.' },
  { key: 'cash_buffer_target', section: 'cashflow', label: 'What emergency cash target feels right?', defaultValue: '', placeholder: 'Example: I want six months of expenses before taking more investment risk.' },
  { key: 'bank_accounts', section: 'assets', label: 'Describe the bank accounts Northstar should understand.', defaultValue: '', placeholder: 'Example: I use checking for bills, high-yield savings for emergency cash, and one credit card paid monthly.', kind: 'long' },
  { key: 'investment_accounts', section: 'assets', label: 'Describe your investment and retirement accounts.', defaultValue: '', placeholder: 'Example: I have a taxable brokerage, Roth IRA, and employer 401(k), but I am not sure how they should work together.', kind: 'long' },
  { key: 'employer_benefits', section: 'assets', label: 'What employer benefits matter to your plan?', defaultValue: '', placeholder: 'Example: My employer offers a 401(k) match, health insurance, an HSA option, and a bonus.' },
  { key: 'real_estate_assets', section: 'assets', label: 'Describe any real estate you own or want to own.', defaultValue: '', placeholder: 'Example: I do not own property yet, but I am saving for my first home.' },
  { key: 'debt', section: 'assets', label: 'Describe debt, loans, or credit obligations.', defaultValue: '', placeholder: 'Example: My credit card is paid monthly. I have a small student loan but no high-interest debt.', kind: 'long' },
  { key: 'credit_profile', section: 'assets', label: 'What should Northstar know about your credit profile?', defaultValue: '', placeholder: 'Example: My credit is strong, and mortgage readiness matters more than optimizing rewards.' },
  { key: 'primary_goal', section: 'goals', label: 'Describe your most important financial goal naturally.', defaultValue: '', placeholder: 'Example: I want to buy a home and need about $80,000 for the down payment and closing costs by May 2029.', kind: 'long' },
  { key: 'primary_goal_amount', section: 'goals', label: 'If there is a clear target amount, say it here.', defaultValue: '', placeholder: 'Example: Around $80,000 total, but I want the agent to infer if fees or a buffer should be added.' },
  { key: 'primary_goal_date', section: 'goals', label: 'If there is a target date or timeline, say it here.', defaultValue: '', placeholder: 'Example: Ideally May 2029, but I may move sooner if the right home appears.' },
  { key: 'secondary_goals', section: 'goals', label: 'Describe all other goals North should structure.', defaultValue: '', placeholder: 'Example: I also want an emergency fund, retirement progress, travel money, and flexibility to help family.', kind: 'long' },
  { key: 'goal_priority', section: 'goals', label: 'Explain how those goals should be prioritized.', defaultValue: '', placeholder: 'Example: Home first, emergency fund second, retirement third; travel only if it does not slow the home plan.', kind: 'long' },
  { key: 'near_term_liquidity', section: 'goals', label: 'Could you need cash soon? Describe the situation.', defaultValue: '', placeholder: 'Example: I may need to pull 20% of investable assets within 12 months if my home timeline moves up.', kind: 'long' },
  { key: 'non_negotiables', section: 'goals', label: 'What tradeoffs are not acceptable?', defaultValue: '', placeholder: 'Example: Do not risk rent money, emergency savings, mortgage readiness, or tax actions I have not approved.', kind: 'long' },
  { key: 'market_drop_response', section: 'risk', label: 'How would you react to a large market drop?', defaultValue: '', placeholder: 'Example: If investments fell 20%, I would be very anxious and might want to sell unless the agent explains the tradeoff.', kind: 'long' },
  { key: 'risk_preference', section: 'risk', label: 'Describe your risk preference in plain language.', defaultValue: '', placeholder: 'Example: Balanced overall: lower risk for home money, more growth for retirement.' },
  { key: 'risk_capacity', section: 'risk', label: 'What risk can your actual timeline support?', defaultValue: '', placeholder: 'Example: I can take moderate risk for retirement, but not for money needed in the next few years.', kind: 'long' },
  { key: 'investment_experience', section: 'risk', label: 'How experienced are you with investing?', defaultValue: '', placeholder: 'Example: Beginner. I know the basics but want help understanding taxes, risk, and account tradeoffs.' },
  { key: 'decision_behavior', section: 'risk', label: 'What behavior should North watch for under stress?', defaultValue: '', placeholder: 'Example: I over-check balances, worry about headlines, and may delay decisions when tradeoffs feel complex.', kind: 'long' },
  { key: 'taxable_accounts', section: 'tax', label: 'Describe any taxable investment accounts.', defaultValue: '', placeholder: 'Example: Yes, I have a taxable brokerage with some ETFs and mutual funds.' },
  { key: 'tax_sensitivity', section: 'tax', label: 'How should tax impact affect recommendations?', defaultValue: '', placeholder: 'Example: Tax impact matters. Explain gains, losses, and alternatives before suggesting any sale.', kind: 'long' },
  { key: 'filing_context', section: 'tax', label: 'Describe your tax filing context.', defaultValue: '', placeholder: 'Example: Single filer with W-2 income and no business income right now.' },
  { key: 'realized_gains', section: 'tax', label: 'Are there gains, losses, or concentrated positions?', defaultValue: '', placeholder: 'Example: I may have some unrealized gains but no huge single-stock position that I know of.', kind: 'long' },
  { key: 'tax_permissions', section: 'tax', label: 'What tax-sensitive actions need approval?', defaultValue: '', placeholder: 'Example: Any sale, tax-loss harvest, withdrawal, retirement contribution change, or realized gain needs approval.', kind: 'long' },
  { key: 'insurance', section: 'protection', label: 'Describe your insurance coverage and gaps.', defaultValue: '', placeholder: 'Example: I have employer health insurance, but no separate disability or life insurance yet.', kind: 'long' },
  { key: 'estate_documents', section: 'protection', label: 'Describe beneficiaries or estate documents.', defaultValue: '', placeholder: 'Example: I need to review beneficiaries and do not have a will yet.' },
  { key: 'family_support', section: 'protection', label: 'Could family support affect your plan?', defaultValue: '', placeholder: 'Example: Not regularly, but I may need to help my parents with one-off expenses later.', kind: 'long' },
  { key: 'values', section: 'preferences', label: 'What values should guide recommendations?', defaultValue: '', placeholder: 'Example: Simplicity, control, transparency, and avoiding unnecessary complexity.', kind: 'long' },
  { key: 'communication_style', section: 'preferences', label: 'How should Northstar explain decisions?', defaultValue: '', placeholder: 'Example: Plain English, clear next steps, no jargon, and always show what data was used.' },
  { key: 'approval_style', section: 'preferences', label: 'What should require explicit approval?', defaultValue: '', placeholder: 'Example: Any financial action, trade plan, withdrawal, tax-sensitive decision, or account change.', kind: 'long' },
  { key: 'advisor_boundaries', section: 'preferences', label: 'What should Northstar never do automatically?', defaultValue: '', placeholder: 'Example: Never place trades, move money, change beneficiaries, or submit tax actions without my approval.', kind: 'long' },
  { key: 'worries', section: 'preferences', label: 'What worries should North monitor?', defaultValue: '', placeholder: 'Example: Market drops, not enough cash, delaying my home goal, and accidentally creating tax problems.', kind: 'long' },
  { key: 'open_questions', section: 'preferences', label: 'What is uncertain or worth asking later?', defaultValue: '', placeholder: 'Example: Exact home timing, income changes, sustainability preferences, and whether my risk comfort changes after linking accounts.', kind: 'long' },
]

const previewDiff: MemoryDiffItem[] = [
  { kind: 'set', label: 'Full memory profile', value: 'Waiting for official commit' },
  { kind: 'added', label: 'Goals', value: 'Goals will be extracted from the intake' },
  { kind: 'updated', label: 'Risk and liquidity', value: 'Risk behavior and liquidity needs will be structured' },
  { kind: 'set', label: 'Values and preferences', value: 'Communication, constraints, and values will be saved' },
]
