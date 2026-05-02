import {
  ArrowRight,
  Flag,
  House,
  Plus,
  ShieldCheck,
  Sparkle,
  Target,
  TreeEvergreen,
} from '@phosphor-icons/react'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { ScreenProps } from '../types/screens'
import { AgentUsageCard, type AgentCardModel } from '../components/dashboard/AgentCards'
import { AppChrome } from '../components/layout/AppChrome'
import { AppPageHeader } from '../components/layout/AppPageHeader'
import { GoalCard, type GoalCardModel } from '../components/goals/GoalCard'

type GoalFilter = 'all' | 'active' | 'completed' | 'on-track' | 'at-risk'

export function GoalsPage(props: ScreenProps) {
  const [filter, setFilter] = useState<GoalFilter>('all')
  const [goalAgentOpen, setGoalAgentOpen] = useState(false)
  const [goalPrompt, setGoalPrompt] = useState('')
  const [goalError, setGoalError] = useState('')
  const context = props.graph?.contextPacket
  const goals = buildUserGoals(props)
  const filteredGoals = filterGoals(goals, filter)
  const goalInsights = buildGoalInsights(goals)
  const visibleCapital = getVisibleCapital(props)
  const totalTarget = goals.reduce((sum, goal) => sum + goal.rawTargetAmount, 0)
  const completedCount = goals.filter((goal) => goal.progress >= 100).length
  const activeCount = goals.length - completedCount
  const atRiskCount = goals.filter((goal) => goal.tone === 'violet').length
  const onTrackCount = goals.filter((goal) => goal.tone === 'green' || goal.tone === 'gold').length
  const priorityCounts = countPriorities(context?.goals ?? [])
  const featuredGoal = goals[0]
  const onTrackPercent = goals.length > 0 ? Math.round((onTrackCount / goals.length) * 100) : 0
  const goalAgentBusy = props.busyStep === 'goal'

  async function submitGoalFromAgent() {
    const description = goalPrompt.trim()
    if (!description || goalAgentBusy) return
    setGoalError('')
    try {
      await props.submitGoal(description)
      setGoalPrompt('')
      setGoalAgentOpen(false)
      setFilter('all')
    } catch (caught) {
      setGoalError(caught instanceof Error ? caught.message : 'Could not save this goal.')
    }
  }

  return (
    <AppChrome
      active="goals"
      setScreen={props.setScreen}
      graph={props.graph}
      agentAnswer={props.agentAnswer}
      scenarioTrace={props.scenarioTrace}
      runAgent={props.runAgent}
      runScenario={props.runScenario}
      busyStep={props.busyStep}
      onSelectMemoryNode={props.setSelectedNodeId}
    >
      <section className="goals-screen screen-enter">
        <AppPageHeader title="Goals" subtitle="Your life goals, supported by North's specialist tools and real progress." />
        <div className="goals-hero-panel">
          <div className="goals-hero-copy">
            <span className="goals-eyebrow"><Sparkle size={14} weight="fill" /> Private goal studio</span>
            <h2>{featuredGoal ? `${featuredGoal.title} is the current focus.` : 'Your goal plan is ready for memory.'}</h2>
            <p>
              {featuredGoal
                ? `Northstar is reading this user's saved memory profile and tracking ${featuredGoal.target} by ${featuredGoal.date}.`
                : 'Complete onboarding to turn this user profile into a personal goals workspace.'}
            </p>
          </div>
          <div className="goals-hero-metrics" aria-label="Goal summary">
            <div>
              <span>Total target</span>
              <strong>{totalTarget > 0 ? formatMoney(totalTarget) : 'TBD'}</strong>
            </div>
            <div>
              <span>Visible context</span>
              <strong>{visibleCapital > 0 ? formatMoney(visibleCapital) : 'Not linked'}</strong>
            </div>
            <div>
              <span>On track</span>
              <strong>{onTrackCount}/{goals.length}</strong>
            </div>
          </div>
        </div>
        <div className="goals-layout">
          <article className="goals-main">
            <div className="goals-control-stack">
              <div className="filter-row">
                {[
                  { id: 'all', label: `All ${goals.length}` },
                  { id: 'active', label: `Active ${activeCount}` },
                  { id: 'on-track', label: `On Track ${onTrackCount}` },
                  { id: 'at-risk', label: `Needs Detail ${atRiskCount}` },
                ].map((item) => (
                  <button
                    className={filter === item.id ? 'active' : ''}
                    type="button"
                    key={item.id}
                    onClick={() => setFilter(item.id as GoalFilter)}
                  >
                    {item.label}
                  </button>
                ))}
                {completedCount > 0 ? (
                  <button
                    className={filter === 'completed' ? 'active' : ''}
                    type="button"
                    onClick={() => setFilter('completed')}
                  >
                    Done {completedCount}
                  </button>
                ) : null}
              </div>
              <button className="primary-action goals-add-action" type="button" onClick={() => setGoalAgentOpen(true)}>
                <Plus size={18} /> Add Goal
              </button>
            </div>
            {goalAgentOpen ? (
              <article className="goal-agent-card">
                <div className="goal-agent-card__head">
                  <span className="goals-eyebrow"><Sparkle size={14} weight="fill" /> Goal agent</span>
                  <button type="button" onClick={() => setGoalAgentOpen(false)}>Close</button>
                </div>
                <h3>Describe the goal in plain English.</h3>
                <p>Northstar will add it to this signed-in user&apos;s goals and update their memory profile.</p>
                <textarea
                  value={goalPrompt}
                  onChange={(event) => setGoalPrompt(event.target.value)}
                  placeholder="Example: I want to save $45,000 for an emergency fund by December 2027. This is high priority because I want six months of expenses protected before investing more."
                  disabled={goalAgentBusy}
                />
                {goalError ? <div className="goal-agent-card__error">{goalError}</div> : null}
                <div className="goal-agent-card__actions">
                  <button className="ghost-action" type="button" onClick={() => setGoalPrompt('')} disabled={goalAgentBusy || !goalPrompt}>
                    Clear
                  </button>
                  <button className="primary-action" type="button" onClick={submitGoalFromAgent} disabled={goalAgentBusy || !goalPrompt.trim()}>
                    {goalAgentBusy ? 'Updating memory...' : 'Update Memory'} <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ) : null}
            <div className="priority-row" aria-label="Goal priority counts">
              <span><Target size={15} /> Goal Priority</span>
              <strong>High <em>{priorityCounts.high}</em></strong>
              <strong>Medium <em>{priorityCounts.medium}</em></strong>
              <strong>Low <em>{priorityCounts.low}</em></strong>
            </div>
            <div className="goal-list">
              {filteredGoals.length > 0 ? (
                filteredGoals.map((goal) => <GoalCard goal={goal} key={`${goal.title}-${goal.date}`} />)
              ) : (
                <article className="goals-empty-state">
                  <Target size={24} />
                  <strong>{goals.length > 0 ? 'No goals match this filter' : 'No goals saved yet'}</strong>
                  <p>{goals.length > 0 ? 'Choose another filter or add a new goal through the goal agent.' : 'Finish onboarding or add a goal here to save it to this user&apos;s memory profile.'}</p>
                </article>
              )}
            </div>
          </article>
          <aside className="goals-side">
            <div className="confidence-card">
              <header className="goals-side-head">
                <h3>Goal Confidence Overview</h3>
                <span className="side-eyebrow">Live profile</span>
              </header>
              <div className="donut">
                <div className="donut-ring" style={{ '--goal-track': `${onTrackPercent}%` } as CSSProperties}>
                  <strong>{goals.length}</strong>
                  <span>Total Goals</span>
                </div>
                <div className="legend-stack">
                  <span><i /> On track {onTrackCount}</span>
                  <span><i className="gold" /> Active {activeCount}</span>
                  <span><i className="violet" /> Needs detail {atRiskCount}</span>
                </div>
              </div>
              <button type="button">View Insights <ArrowRight size={16} /></button>
            </div>
            <div className="impact-card">
              <header className="goals-side-head">
                <h3>Memory Profile Signals</h3>
                <span className="side-eyebrow">Northstar readout</span>
              </header>
              {goalInsights.length > 0 ? (
                goalInsights.map((card) => <AgentUsageCard card={card} key={`${card.agent}-${card.title}`} />)
              ) : (
                <article className="goals-empty-state compact">
                  <Target size={22} />
                  <strong>No goal signals yet</strong>
                  <p>Once this user saves goals during onboarding, Northstar will summarize their personal goal signals here.</p>
                </article>
              )}
            </div>
          </aside>
        </div>
      </section>
    </AppChrome>
  )
}

function buildGoalInsights(goals: GoalCardModel[]): AgentCardModel[] {
  return goals.slice(0, 2).map((goal) => ({
    agent: 'Goal Agent',
    title: `${goal.title} profile synced`,
    detail: `${goal.target} target - ${goal.date} timeline - ${goal.confidence.toLowerCase()}`,
    tag: goal.tone === 'violet' ? 'Needs detail' : goal.progress >= 100 ? 'Completed' : 'Profile synced',
    tone: goal.tone,
    time: 'From memory profile',
  }))
}

function buildUserGoals(props: ScreenProps): GoalCardModel[] {
  const context = props.graph?.contextPacket
  const sourceGoals = context?.goals ?? []
  const visibleCapital = getVisibleCapital(props)

  return sourceGoals.map((goal) => {
    const targetAmount = Number(goal.target_amount) || 0
    const progress = targetAmount > 0 ? Math.min(100, Math.round((visibleCapital / targetAmount) * 100)) : 0
    const hasTarget = targetAmount > 0
    const hasDate = isKnown(goal.target_date)
    const tone = hasTarget && hasDate ? (progress >= 35 ? 'green' : 'gold') : 'violet'
    const confidence = hasTarget && hasDate
      ? progress >= 35 ? 'High Confidence' : 'Medium Confidence'
      : 'Needs More Detail'

    return {
      title: titleCase(goal.type || 'Financial goal'),
      subtitle: `${titleCase(goal.priority || 'medium')} priority from memory profile`,
      icon: iconForGoal(goal.type),
      target: hasTarget ? formatMoney(targetAmount) : 'Target TBD',
      date: hasDate ? formatGoalDate(goal.target_date) : 'Timeline TBD',
      currentLabel: visibleCapital > 0 ? `${formatMoney(visibleCapital)} visible in connected context` : 'No connected funding context yet',
      progress,
      confidence,
      tone,
      rawTargetAmount: targetAmount,
      status: progress >= 100 ? 'completed' : tone === 'violet' ? 'at-risk' : tone === 'green' ? 'on-track' : 'active',
    }
  })
}

function filterGoals(goals: GoalCardModel[], filter: GoalFilter) {
  if (filter === 'all') return goals
  if (filter === 'active') return goals.filter((goal) => goal.status !== 'completed')
  return goals.filter((goal) => goal.status === filter)
}

function getVisibleCapital(props: ScreenProps) {
  const context = props.graph?.contextPacket
  return Math.max(
    0,
    Number(context?.accounts_summary.cash_available ?? 0) + Number(context?.accounts_summary.portfolio_value ?? 0),
  )
}

function countPriorities(goals: NonNullable<ScreenProps['graph']>['contextPacket']['goals']) {
  return goals.reduce(
    (counts, goal) => {
      const priority = goal.priority?.toLowerCase()
      if (priority === 'high') counts.high += 1
      else if (priority === 'low') counts.low += 1
      else counts.medium += 1
      return counts
    },
    { high: 0, medium: 0, low: 0 },
  )
}

function iconForGoal(type: string) {
  const clean = type.toLowerCase()
  if (clean.includes('home') || clean.includes('house')) return House
  if (clean.includes('emergency') || clean.includes('cash')) return ShieldCheck
  if (clean.includes('retire')) return TreeEvergreen
  if (clean.includes('travel')) return Flag
  return Target
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isKnown(value: string) {
  return Boolean(value?.trim()) && !/^unknown$/i.test(value.trim())
}

function formatGoalDate(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return titleCase(value)
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
