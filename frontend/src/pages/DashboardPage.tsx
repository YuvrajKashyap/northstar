import { useMemo } from 'react'
import { Clock, Eye, FileArrowDown, LockKey } from '@phosphor-icons/react'
import type { ScreenProps } from '../types/screens'
import { DashboardMemoryGraph } from '../components/dashboard/DashboardMemoryGraph'
import { AppChrome } from '../components/layout/AppChrome'

export function DashboardPage(props: ScreenProps) {
  const orbitCount = useMemo(
    () => props.graph?.nodes?.filter((n) => n.kind !== 'person').length ?? 0,
    [props.graph?.nodes],
  )

  const personLine = useMemo(() => {
    const person = props.graph?.nodes.find((n) => n.kind === 'person')
    return formatProfileLine(person?.value ?? '', props.graph?.contextPacket.user.investor_level ?? '')
  }, [props.graph?.contextPacket.user.investor_level, props.graph?.nodes])

  const toolbarExcerpt = useMemo(() => {
    const defaultExcerpt =
      'Flexible planning, tax-aware tradeoffs, and approval before meaningful moves.'
    const n = props.selectedNode
    if (!n || n.kind === 'person') return defaultExcerpt
    return formatToolbarSummary(n, props.graph) || defaultExcerpt
  }, [props.graph, props.selectedNode])

  const privacyActions = useMemo(
    () =>
      [
        { label: 'Memory access', icon: LockKey },
        { label: 'Data visibility', icon: Eye },
        { label: 'Retention', icon: Clock },
        { label: 'Export / delete', icon: FileArrowDown },
      ] as const,
    [],
  )

  return (
    <AppChrome
      active="dashboard"
      setScreen={props.setScreen}
      graph={props.graph}
      agentAnswer={props.agentAnswer}
      scenarioTrace={props.scenarioTrace}
      runAgent={props.runAgent}
      runScenario={props.runScenario}
      busyStep={props.busyStep}
    >
      <section className="dashboard-screen screen-enter">
        <div className="dashboard-studio">
          <header className="dashboard-hero">
            <h1 className="dashboard-hero__title">Memory Graph Studio</h1>
            <p className="dashboard-hero__lead">
              Your context, visualized.
              <br />
              Tap a thread to see exactly what agents hold in memory.
            </p>
            <p className="dashboard-hero__meta">
              {orbitCount > 0 ? (
                <>
                  <span className="dashboard-hero__meta-strong">{orbitCount} threads</span>
                  <span className="dashboard-hero__meta-sep" aria-hidden>
                    -
                  </span>
                  <span>Orbit updates as you connect accounts and refine preferences.</span>
                </>
              ) : (
                <span>Link accounts after onboarding. The map will populate from your profile.</span>
              )}
            </p>
          </header>

          <div className="dashboard-studio__workspace">
            <div className="dashboard-studio__graph-stack">
              <div className="dashboard-studio__graph">
                <DashboardMemoryGraph
                  graph={props.graph}
                  selectedNodeId={props.selectedNodeId}
                  onSelect={props.setSelectedNodeId}
                />
              </div>

              <footer className="dashboard-studio-toolbar" aria-label="Context and privacy">
                <div className="dashboard-studio-toolbar__left">
                  {personLine ? <p className="dashboard-studio-toolbar__person">{personLine}</p> : null}
                  <p className="dashboard-studio-toolbar__excerpt">{toolbarExcerpt}</p>
                  <div className="dashboard-studio-toolbar__tags">
                    {['Flexible planning', 'Tax-aware', 'Approval-first'].map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="dashboard-studio-toolbar__right" role="group" aria-label="Privacy controls">
                  {privacyActions.map(({ label, icon: Icon }) => (
                    <button
                      type="button"
                      key={label}
                      className="dashboard-studio-toolbar__action"
                      title={label}
                    >
                      <Icon size={20} weight="regular" aria-hidden />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </footer>
            </div>
          </div>

        </div>
      </section>
    </AppChrome>
  )
}

function formatProfileLine(value: string, investorLevel: string) {
  const clean = formatDashboardText(value)
  const age = clean.match(/\b\d{1,3}\b/)?.[0]
  const level = cleanInvestorLevel(investorLevel || clean)
  if (age && level) return `${age}-year-old ${level} profile`
  if (level) return `${level.charAt(0).toUpperCase()}${level.slice(1)} profile`
  return 'Active memory profile'
}

function formatToolbarSummary(
  node: NonNullable<ScreenProps['selectedNode']>,
  graph: ScreenProps['graph'],
) {
  if (node.kind === 'goal') return summarizeGoals(graph?.contextPacket.goals ?? [])
  if (node.kind === 'risk') return summarizePlainText(node.value, 'Risk preferences are being shaped from the questionnaire and agent context.')
  if (node.kind === 'account') return summarizePlainText(node.value, 'Account context is connected to help Northstar compare options responsibly.')
  if (node.kind === 'cash_flow') return summarizePlainText(node.value, 'Cash-flow context helps separate near-term safety from long-term investing.')
  if (node.kind === 'tax') return summarizePlainText(node.value, 'Tax context is available for recommendations that involve selling, rebalancing, or withdrawals.')
  if (node.kind === 'communication') return summarizePlainText(node.value, 'Northstar will keep explanations clear, direct, and approval-first.')
  if (node.kind === 'values') return summarizePlainText(node.value, 'Values guide how Northstar weighs flexibility, clarity, and control.')
  return summarizePlainText(node.value, '')
}

function summarizeGoals(goals: NonNullable<ScreenProps['graph']>['contextPacket']['goals']) {
  if (!goals.length) return 'No goals have been committed yet. Finish the memory flow to build a cleaner planning map.'

  const fundedGoals = goals.filter((goal) => Number(goal.target_amount) > 0)
  const leadGoal = fundedGoals[0] ?? goals[0]
  const leadName = titleCase(leadGoal.type)
  const target = Number(leadGoal.target_amount) > 0
    ? ` with a ${formatMoney(Number(leadGoal.target_amount))} target`
    : ''
  const timelineCount = goals.filter((goal) => isKnown(goal.target_date)).length
  const missingTimelineCount = goals.length - timelineCount
  const otherCount = Math.max(goals.length - 1, 0)

  const parts = [`Tracking ${goals.length} goal${goals.length === 1 ? '' : 's'}, led by ${leadName}${target}.`]
  if (otherCount > 0) {
    parts.push(`${otherCount} more goal${otherCount === 1 ? '' : 's'} are mapped for comparison.`)
  }
  if (missingTimelineCount > 0) {
    parts.push('Timelines still need confirmation before projections should be treated as final.')
  }
  return parts.join(' ')
}

function summarizePlainText(value: string, fallback: string) {
  const clean = formatDashboardText(value)
  if (!clean || /not filled in yet/i.test(clean)) return fallback
  return clean
}

function formatDashboardText(value: string) {
  return value
    .trim()
    .replace(/_/g, ' ')
    .replace(/\$0(?:\.00)?\s+by\s+unknown/gi, 'target amount and timeline to confirm')
    .replace(/\$0(?:\.00)?/gi, 'target amount to confirm')
    .replace(/\bby\s+unknown\b/gi, 'timeline to confirm')
    .replace(/\b0,\s*unknown\b/i, 'active memory profile')
    .replace(/\bunknown\b/gi, 'to confirm')
    .replace(/\bplain english\b/gi, 'Plain English')
    .replace(/\bmoderate cautious\b/gi, 'moderate and cautious')
}

function cleanInvestorLevel(value: string) {
  const clean = value.toLowerCase().replace(/_/g, ' ')
  if (clean.includes('beginner')) return 'beginner investor'
  if (clean.includes('intermediate')) return 'intermediate investor'
  if (clean.includes('advanced')) return 'advanced investor'
  return ''
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isKnown(value: string) {
  return Boolean(value.trim()) && !/^unknown$/i.test(value.trim())
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
