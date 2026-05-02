import { ArrowClockwise, Brain, ChartLineUp, Sparkle } from '@phosphor-icons/react'
import { DashboardMemoryGraph } from '../components/dashboard/DashboardMemoryGraph'
import { AppChrome } from '../components/layout/AppChrome'
import type { ScreenProps } from '../types/screens'

export function HomePage(props: ScreenProps) {
  const userName = props.graph?.contextPacket.user.name ?? 'Your profile'
  const goals = props.graph?.contextPacket.goals ?? []
  const accounts = props.graph?.contextPacket.accounts_summary
  const portfolioValue = accounts
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
        accounts.portfolio_value,
      )
    : 'Not connected'
  const cashValue = accounts
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
        accounts.cash_available,
      )
    : 'Not connected'

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
      <section className="dashboard-screen dashboard-memory-home screen-enter">
        <div className="dashboard-home-header">
          <div>
            <span>Home</span>
            <h1>Memory graph</h1>
            <p>{userName}'s durable context, goals, risk profile, accounts, taxes, values, and communication style.</p>
          </div>
          <div className="dashboard-home-actions">
            <button type="button" onClick={() => props.setScreen('north')}>
              <Sparkle size={18} /> Open North
            </button>
            <button type="button" onClick={props.runScenario} disabled={props.busyStep === 'scenario'}>
              <ChartLineUp size={18} /> Run trace
            </button>
          </div>
        </div>

        <div className="dashboard-home-layout">
          <article className="dashboard-home-graph-card">
            <DashboardMemoryGraph
              graph={props.graph}
              selectedNodeId={props.selectedNodeId}
              onSelect={props.setSelectedNodeId}
            />
          </article>

          <aside className="dashboard-home-side">
            <article>
              <Brain size={20} weight="duotone" />
              <div>
                <span>Memory status</span>
                <strong>{props.graph ? `${props.graph.nodes.length} context nodes` : 'Not loaded yet'}</strong>
              </div>
            </article>
            <article>
              <ChartLineUp size={20} weight="duotone" />
              <div>
                <span>Portfolio</span>
                <strong>{portfolioValue}</strong>
                <p>{cashValue} cash context</p>
              </div>
            </article>
            <article>
              <ArrowClockwise size={20} weight="duotone" />
              <div>
                <span>Goals</span>
                <strong>{goals.length ? `${goals.length} active goals` : 'No goals committed'}</strong>
                <p>{goals[0]?.type.replace(/_/g, ' ') ?? 'Run onboarding to populate goals.'}</p>
              </div>
            </article>
          </aside>
        </div>
      </section>
    </AppChrome>
  )
}
