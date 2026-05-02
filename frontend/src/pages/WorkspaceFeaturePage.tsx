import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CirclesThreePlus,
  Database,
  Graph,
  Pulse,
  ShieldCheck,
} from '@phosphor-icons/react'
import { agentCards } from '../data/workspaceContent'
import type { Screen, ScreenProps } from '../types/screens'
import { AgentUsageCard } from '../components/dashboard/AgentCards'
import { AppChrome } from '../components/layout/AppChrome'
import { AppPageHeader } from '../components/layout/AppPageHeader'

const featureMeta = {
  'agent-runs': {
    title: 'Agents',
    subtitle: 'Specialized agent activity, responsibilities, and recent context checks.',
    icon: Graph,
    cards: ['Goal Agent', 'Scenario Agent', 'Tax Agent', 'Communication Agent'],
    detail: 'Each agent reads the approved memory graph and contributes a focused review before guidance is shown.',
  },
  plans: {
    title: 'Plans',
    subtitle: 'Saved recommendations, decision paths, and approval-ready next steps.',
    icon: CalendarCheck,
    cards: ['Balanced protection', 'Liquidity review', 'Tax-aware rebalance', 'Goal pace check'],
    detail: 'Plans will collect the durable outputs from agent runs so you can compare tradeoffs over time.',
  },
  scenarios: {
    title: 'Scenarios',
    subtitle: 'Stress tests for market drops, cash needs, goal changes, and timing tradeoffs.',
    icon: Briefcase,
    cards: ['Market drawdown', 'Large withdrawal', 'Home timeline moves up', 'Income interruption'],
    detail: 'Scenario tools help Northstar show what changes, what stays stable, and what needs approval.',
  },
  insights: {
    title: 'Insights',
    subtitle: 'Important patterns Northstar notices across your memory, accounts, and goals.',
    icon: Pulse,
    cards: ['Cash flexibility', 'Goal drift', 'Tax sensitivity', 'Behavior watchlist'],
    detail: 'Insights are designed to surface meaningful changes without turning every data point into noise.',
  },
} as const satisfies Record<'agent-runs' | 'plans' | 'scenarios' | 'insights', {
  title: string
  subtitle: string
  icon: typeof CirclesThreePlus
  cards: string[]
  detail: string
}>

export function WorkspaceFeaturePage({
  page,
  ...props
}: ScreenProps & { page: keyof typeof featureMeta }) {
  const meta = featureMeta[page]
  const Icon = meta.icon

  return (
    <AppChrome
      active={page as Screen}
      setScreen={props.setScreen}
      graph={props.graph}
      agentAnswer={props.agentAnswer}
      scenarioTrace={props.scenarioTrace}
      runAgent={props.runAgent}
      runScenario={props.runScenario}
      busyStep={props.busyStep}
      onSelectMemoryNode={props.setSelectedNodeId}
    >
      <section className="workspace-feature-screen screen-enter">
        <AppPageHeader title={meta.title} subtitle={meta.subtitle} />
        <div className="workspace-feature-grid">
          <article className="workspace-feature-hero">
            <div className="workspace-feature-hero__icon">
              <Icon size={34} weight="regular" />
            </div>
            <h2>{meta.title}</h2>
            <p>{meta.detail}</p>
            <div className="workspace-feature-actions">
              <button className="primary-action" type="button">
                Open workspace <ArrowRight size={16} />
              </button>
              <button className="ghost-action" type="button">
                View memory inputs
              </button>
            </div>
          </article>

          <div className="workspace-feature-card-grid">
            {meta.cards.map((card, index) => (
              <article className="workspace-feature-card" key={card}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{card}</strong>
                <p>{index % 2 === 0 ? 'Ready for memory-aware review.' : 'Requires user approval before action.'}</p>
              </article>
            ))}
          </div>

          <aside className="workspace-feature-side">
            <div className="workspace-feature-status">
              <ShieldCheck size={22} />
              <div>
                <strong>Approval-first</strong>
                <p>Nothing here executes financial actions automatically.</p>
              </div>
            </div>
            <div className="workspace-feature-status">
              <Database size={22} />
              <div>
                <strong>Memory scoped</strong>
                <p>Outputs stay tied to the currently logged-in user.</p>
              </div>
            </div>
            {agentCards.slice(0, 2).map((card) => (
              <AgentUsageCard card={card} key={card.agent} />
            ))}
          </aside>
        </div>
      </section>
    </AppChrome>
  )
}
