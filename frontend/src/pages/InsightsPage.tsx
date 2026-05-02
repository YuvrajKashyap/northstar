import {
  ArrowRight,
  Bank,
  Brain,
  CalendarCheck,
  ChartLine,
  CheckCircle,
  LockKey,
  Pulse,
  ShieldCheck,
  Sparkle,
  Target,
  WarningCircle,
} from '@phosphor-icons/react'
import type { ContextPacket } from '@calmvest/shared'
import type { CSSProperties } from 'react'
import { AppChrome } from '../components/layout/AppChrome'
import type { ScreenProps } from '../types/screens'

type InsightTone = 'green' | 'gold' | 'red' | 'blue'

type InsightModel = {
  title: string
  body: string
  eyebrow: string
  metric: string
  tone: InsightTone
  icon: typeof Pulse
  prompt: string
}

type WatchItem = {
  label: string
  value: string
  tone: InsightTone
}

export function InsightsPage(props: ScreenProps) {
  const context = props.graph?.contextPacket
  const insights = buildInsights(context)
  const watchItems = buildWatchItems(context)
  const topInsight = insights[0]
  const profileScore = scoreProfile(context)
  const goalCount = context?.goals.length ?? 0
  const visibleCapital = getVisibleCapital(context)
  const missingCount = countMissingInputs(context)

  function askNorth(prompt: string) {
    props.runAgent(prompt, 'fresh_check')
  }

  return (
    <AppChrome
      active="insights"
      setScreen={props.setScreen}
      graph={props.graph}
      agentAnswer={props.agentAnswer}
      scenarioTrace={props.scenarioTrace}
      runAgent={props.runAgent}
      runScenario={props.runScenario}
      busyStep={props.busyStep}
      onSelectMemoryNode={props.setSelectedNodeId}
    >
      <section className="insights-screen screen-enter">
        <header className="insights-hero">
          <div className="insights-hero__copy">
            <span className="insights-kicker">
              <Sparkle size={15} weight="fill" />
              Northstar insights
            </span>
            <h1>{topInsight?.title ?? 'Your signal desk is waiting for memory.'}</h1>
            <p>
              {topInsight?.body ??
                'Complete onboarding so Northstar can separate meaningful financial signals from noise.'}
            </p>
          </div>
          <div className="insights-score-card" aria-label="Memory signal score">
            <div className="insights-score-ring" style={{ '--insight-score': `${profileScore}%` } as CSSProperties}>
              <strong>{profileScore}</strong>
              <span>Signal</span>
            </div>
            <div>
              <span>Profile clarity</span>
              <strong>{scoreLabel(profileScore)}</strong>
              <p>{missingCount ? `${missingCount} useful input${missingCount === 1 ? '' : 's'} still missing.` : 'Core memory signals are available.'}</p>
            </div>
          </div>
        </header>

        <section className="insights-strip" aria-label="Insight summary">
          <InsightStat icon={Target} label="Goals tracked" value={`${goalCount}`} />
          <InsightStat icon={Bank} label="Visible context" value={visibleCapital > 0 ? formatMoney(visibleCapital) : 'Not linked'} />
          <InsightStat icon={ShieldCheck} label="Approval mode" value={context?.constraints.no_auto_trade ? 'Protected' : 'Review'} />
          <InsightStat
            icon={Brain}
            label="Communication"
            value={isKnown(context?.user.communication_style) ? titleCase(context?.user.communication_style ?? '') : 'Not set'}
          />
        </section>

        <div className="insights-layout">
          <main className="insights-main">
            <section className="insights-card-grid" aria-label="Personal insights">
              {insights.map((insight, index) => {
                const Icon = insight.icon
                return (
                  <article className={`insight-card insight-card--${insight.tone}`} key={insight.title}>
                    <div className="insight-card__number">{String(index + 1).padStart(2, '0')}</div>
                    <div className="insight-card__icon">
                      <Icon size={22} weight="duotone" />
                    </div>
                    <div className="insight-card__copy">
                      <span>{insight.eyebrow}</span>
                      <h2>{insight.title}</h2>
                      <p>{insight.body}</p>
                    </div>
                    <div className="insight-card__metric">
                      <strong>{insight.metric}</strong>
                      <button type="button" onClick={() => askNorth(insight.prompt)}>
                        Ask North <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </section>
          </main>

          <aside className="insights-side" aria-label="Watchlist and memory gaps">
            <section className="insights-watch-panel">
              <div className="insights-panel-head">
                <span className="insights-kicker">Watchlist</span>
                <strong>What Northstar is tracking</strong>
              </div>
              <div className="insights-watch-list">
                {watchItems.map((item) => (
                  <div className={`insights-watch-item insights-watch-item--${item.tone}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="insights-memory-panel">
              <div className="insights-panel-head">
                <span className="insights-kicker">Memory gaps</span>
                <strong>{missingCount ? 'Worth asking next' : 'No urgent gaps'}</strong>
              </div>
              <div className="insights-gap-list">
                {buildGapList(context).map((gap) => (
                  <button type="button" key={gap} onClick={() => askNorth(`Help me fill this missing memory input: ${gap}`)}>
                    <WarningCircle size={16} />
                    <span>{gap}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </AppChrome>
  )
}

function InsightStat({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="insights-stat">
      <Icon size={19} weight="duotone" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function buildInsights(context: ContextPacket | undefined): InsightModel[] {
  if (!context) {
    return [
      {
        title: 'Memory has not loaded yet.',
        body: 'Northstar needs an approved memory profile before it can produce personal insights.',
        eyebrow: 'Setup',
        metric: 'Waiting',
        tone: 'gold',
        icon: Brain,
        prompt: 'What information should I add first to make my Northstar memory useful?',
      },
    ]
  }

  const goals = context.goals
  const cash = Number(context.accounts_summary.cash_available || 0)
  const portfolio = Number(context.accounts_summary.portfolio_value || 0)
  const total = cash + portfolio
  const cashRatio = total > 0 ? cash / total : 0
  const nearTermGoals = goals.filter((goal) => isNearTerm(goal.target_date))
  const incompleteGoals = goals.filter((goal) => !goal.target_amount || !isKnown(goal.target_date))
  const concentration = Number(context.portfolio_features.top3_concentration || 0)
  const taxAware = context.accounts_summary.taxable || context.constraints.prefer_tax_aware

  return [
    {
      title: goals.length ? `${titleCase(goals[0].type)} is driving the plan.` : 'No goals are committed yet.',
      body: goals.length
        ? `Northstar sees ${goals.length} goal${goals.length === 1 ? '' : 's'} in memory.\nThe most important next step is keeping funding, risk, and timing aligned.`
        : 'The workspace is ready, but insights will be sharper after at least one goal is saved to memory.',
      eyebrow: 'Goal signal',
      metric: goals.length ? `${goals.length} goal${goals.length === 1 ? '' : 's'}` : 'Empty',
      tone: goals.length ? 'green' : 'gold',
      icon: Target,
      prompt: 'Review my saved goals and tell me which one should drive the plan first.',
    },
    {
      title: cashRatio >= 0.25 ? 'Liquidity is visible enough to reason with.' : 'Liquidity may need more attention.',
      body: total > 0
        ? `${formatMoney(cash)} is visible as cash context against ${formatMoney(total)} in total visible context.`
        : 'No connected funding context is visible yet, so cash runway and goal pacing are still uncertain.',
      eyebrow: 'Cash signal',
      metric: total > 0 ? `${Math.round(cashRatio * 100)}% cash` : 'Unknown',
      tone: total === 0 ? 'gold' : cashRatio >= 0.25 ? 'green' : 'red',
      icon: Bank,
      prompt: 'Check my liquidity against my goals and tell me what needs protection.',
    },
    {
      title: nearTermGoals.length ? 'Near-term goals should be separated from risk money.' : 'Goal timing looks less urgent right now.',
      body: nearTermGoals.length
        ? `${nearTermGoals.length} goal${nearTermGoals.length === 1 ? ' is' : 's are'} within the next three years, so Northstar should avoid treating all capital the same.`
        : 'No near-term target dates are currently forcing a conservative funding lane.',
      eyebrow: 'Timing signal',
      metric: nearTermGoals.length ? `${nearTermGoals.length} near-term` : 'Stable',
      tone: nearTermGoals.length ? 'blue' : 'green',
      icon: CalendarCheck,
      prompt: 'Which of my goals need a separate low-risk funding lane?',
    },
    {
      title: taxAware ? 'Tax sensitivity is part of the profile.' : 'Tax context is still light.',
      body: taxAware
        ? 'Northstar should explain taxable account impact before any sale, rebalance, or withdrawal is treated as approval-ready.'
        : 'Tax-aware guidance will be limited until taxable accounts, gains, losses, or filing context are clearer.',
      eyebrow: 'Tax signal',
      metric: taxAware ? 'Tax-aware' : 'Missing',
      tone: taxAware ? 'green' : 'gold',
      icon: LockKey,
      prompt: 'Review my tax-sensitive context and tell me what data is still missing.',
    },
    {
      title: concentration > 0.35 ? 'Concentration deserves a watchpoint.' : 'Portfolio concentration is not the loudest signal.',
      body: concentration > 0
        ? `Top holdings represent about ${Math.round(concentration * 100)}% of portfolio context, which should inform risk and tax review.`
        : 'No concentration signal is available yet because holdings context is missing or incomplete.',
      eyebrow: 'Portfolio signal',
      metric: concentration > 0 ? `${Math.round(concentration * 100)}% top 3` : 'Unknown',
      tone: concentration > 0.35 ? 'gold' : concentration > 0 ? 'green' : 'blue',
      icon: ChartLine,
      prompt: 'Check whether concentration risk affects my goals.',
    },
    {
      title: incompleteGoals.length ? 'Some goals need sharper numbers.' : 'Goal definitions are structured enough to use.',
      body: incompleteGoals.length
        ? `${incompleteGoals.length} saved goal${incompleteGoals.length === 1 ? '' : 's'} need a clearer target amount or timeline before pacing can be trusted.`
        : 'Saved goals include usable target amounts and timelines, so Northstar can reason about pace and tradeoffs.',
      eyebrow: 'Completeness',
      metric: incompleteGoals.length ? `${incompleteGoals.length} gap${incompleteGoals.length === 1 ? '' : 's'}` : 'Clear',
      tone: incompleteGoals.length ? 'gold' : 'green',
      icon: CheckCircle,
      prompt: 'Find the missing goal details I should fill in next.',
    },
  ]
}

function buildWatchItems(context: ContextPacket | undefined): WatchItem[] {
  const cash = Number(context?.accounts_summary.cash_available || 0)
  const portfolio = Number(context?.accounts_summary.portfolio_value || 0)
  const goals = context?.goals ?? []
  const riskComfort = cleanText(context?.risk_profile.risk_comfort) || 'Unknown'
  const liquidityNeed = cleanText(context?.risk_profile.liquidity_need) || 'Unknown'
  const concentration = Number(context?.portfolio_features.top3_concentration || 0)

  return [
    { label: 'Cash available', value: cash > 0 ? formatMoney(cash) : 'Missing', tone: cash > 0 ? 'green' : 'gold' },
    { label: 'Portfolio context', value: portfolio > 0 ? formatMoney(portfolio) : 'Missing', tone: portfolio > 0 ? 'green' : 'gold' },
    { label: 'Goal count', value: `${goals.length}`, tone: goals.length ? 'green' : 'gold' },
    { label: 'Risk comfort', value: titleCase(riskComfort), tone: isKnown(riskComfort) ? 'blue' : 'gold' },
    { label: 'Liquidity need', value: titleCase(liquidityNeed), tone: isKnown(liquidityNeed) ? 'blue' : 'gold' },
    { label: 'Top concentration', value: concentration > 0 ? `${Math.round(concentration * 100)}%` : 'Unknown', tone: concentration > 0.35 ? 'gold' : 'green' },
  ]
}

function buildGapList(context: ContextPacket | undefined) {
  const gaps: string[] = []
  if (!context) return ['Commit memory profile', 'Connect accounts', 'Add first goal']
  if (!context.goals.length) gaps.push('Add at least one financial goal')
  if (context.goals.some((goal) => !goal.target_amount)) gaps.push('Add target amounts to goals')
  if (context.goals.some((goal) => !isKnown(goal.target_date))) gaps.push('Add goal timelines')
  if (!isKnown(context.risk_profile.risk_comfort)) gaps.push('Clarify risk comfort')
  if (!isKnown(context.risk_profile.liquidity_need)) gaps.push('Clarify liquidity need')
  if (!context.accounts_summary.cash_available && !context.accounts_summary.portfolio_value) gaps.push('Connect account context')
  if (!isKnown(context.user.communication_style)) gaps.push('Set communication style')
  return gaps.length ? gaps.slice(0, 5) : ['Ask Northstar for a fresh check', 'Review goals after account changes', 'Run a scenario before major decisions']
}

function scoreProfile(context: ContextPacket | undefined) {
  if (!context) return 0
  const checks = [
    context.goals.length > 0,
    context.goals.some((goal) => goal.target_amount > 0),
    context.goals.some((goal) => isKnown(goal.target_date)),
    isKnown(context.risk_profile.risk_comfort),
    isKnown(context.risk_profile.liquidity_need),
    context.accounts_summary.cash_available > 0 || context.accounts_summary.portfolio_value > 0,
    isKnown(context.user.communication_style),
    context.constraints.no_auto_trade,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function countMissingInputs(context: ContextPacket | undefined) {
  return buildGapList(context).filter((gap) => !gap.startsWith('Ask Northstar') && !gap.startsWith('Review') && !gap.startsWith('Run')).length
}

function getVisibleCapital(context: ContextPacket | undefined) {
  return Math.max(
    0,
    Number(context?.accounts_summary.cash_available ?? 0) + Number(context?.accounts_summary.portfolio_value ?? 0),
  )
}

function isNearTerm(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return false
  const date = new Date(year, month - 1, 1)
  const now = new Date()
  const months = (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth()
  return months >= 0 && months <= 36
}

function isKnown(value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized) return false
  return !/^unknown$/i.test(normalized)
}

function cleanText(value: string | undefined) {
  return value?.trim() ?? ''
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function scoreLabel(score: number) {
  if (score >= 82) return 'Strong'
  if (score >= 58) return 'Usable'
  if (score > 0) return 'Thin'
  return 'Empty'
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
