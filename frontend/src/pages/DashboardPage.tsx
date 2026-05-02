import { useMemo, useState } from 'react'
import { CaretRight, ChatsCircle, CirclesThreePlus, Clock, Eye, FileArrowDown, LockKey } from '@phosphor-icons/react'
import type { ScreenProps } from '../types/screens'
import { AgentRail } from '../components/dashboard/AgentRail'
import { DashboardMemoryGraph } from '../components/dashboard/DashboardMemoryGraph'
import { AppChrome } from '../components/layout/AppChrome'

export function DashboardPage(props: ScreenProps) {
  const [agentPanelOpen, setAgentPanelOpen] = useState(true)

  const orbitCount = useMemo(
    () => props.graph?.nodes?.filter((n) => n.kind !== 'person').length ?? 0,
    [props.graph?.nodes],
  )

  const personLine = useMemo(() => {
    const person = props.graph?.nodes.find((n) => n.kind === 'person')
    return person?.value?.replace(/_/g, ' ') ?? null
  }, [props.graph?.nodes])

  const toolbarExcerpt = useMemo(() => {
    const defaultExcerpt =
      'Flexible planning, tax-aware tradeoffs, and approval before meaningful moves.'
    const n = props.selectedNode
    if (!n || n.kind === 'person') return defaultExcerpt
    return n.value?.replace(/_/g, ' ') ?? defaultExcerpt
  }, [props.selectedNode])

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
      commandExtras={
        <button
          className={`command-agents-btn${agentPanelOpen ? ' command-agents-btn--active' : ''}`}
          type="button"
          onClick={() => setAgentPanelOpen((open) => !open)}
          aria-expanded={agentPanelOpen}
          aria-controls="dashboard-agent-drawer"
        >
          <CirclesThreePlus size={20} weight="regular" />
          {agentPanelOpen ? 'Hide agent' : 'Agent'}
        </button>
      }
    >
      <section className="dashboard-screen screen-enter">
        <div className="dashboard-studio">
          <header className="dashboard-hero">
            <h1 className="dashboard-hero__title">Memory Graph Studio</h1>
            <p className="dashboard-hero__lead">
              Your context, visualized—tap a thread to see exactly what agents hold in memory.
            </p>
            <p className="dashboard-hero__meta">
              {orbitCount > 0 ? (
                <>
                  <span className="dashboard-hero__meta-strong">{orbitCount} threads</span>
                  <span className="dashboard-hero__meta-sep" aria-hidden>
                    ·
                  </span>
                  <span>Orbit updates as you connect accounts and refine preferences.</span>
                </>
              ) : (
                <span>Link accounts after onboarding—the map will populate from your profile.</span>
              )}
            </p>
          </header>

          <div className={`dashboard-studio__workspace${agentPanelOpen ? ' dashboard-studio__workspace--panel-open' : ''}`}>
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

          <aside
            id="dashboard-agent-drawer"
            className={`dashboard-agent-drawer${agentPanelOpen ? ' is-open' : ' is-collapsed'}`}
            aria-label="Agent chat and tools"
          >
            {!agentPanelOpen ? (
              <button
                className="dashboard-agent-drawer__peek"
                type="button"
                onClick={() => setAgentPanelOpen(true)}
              >
                <ChatsCircle size={22} weight="regular" aria-hidden />
                <span>Agent</span>
              </button>
            ) : (
              <>
                <div className="dashboard-agent-drawer__head">
                  <h2 className="dashboard-agent-drawer__title">Northstar agent</h2>
                  <p className="dashboard-agent-drawer__sub">Streaming tools & memory-aware replies</p>
                  <button
                    className="dashboard-agent-drawer__collapse"
                    type="button"
                    onClick={() => setAgentPanelOpen(false)}
                    aria-label="Collapse agent panel"
                  >
                    <CaretRight size={20} weight="bold" aria-hidden />
                  </button>
                </div>
                <div className="dashboard-agent-drawer__body">
                  <AgentRail
                    hideHeading
                    panel
                    answer={props.agentAnswer}
                    trace={props.scenarioTrace}
                    runAgent={props.runAgent}
                    runScenario={props.runScenario}
                    busy={props.busyStep === 'scenario'}
                  />
                </div>
              </>
            )}
          </aside>
        </div>
      </section>
    </AppChrome>
  )
}
