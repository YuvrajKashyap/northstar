import {
  Bell,
  CheckCircle,
  CirclesThreePlus,
  Eye,
  GearSix,
  MagnifyingGlass,
  Sparkle,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { AgentCard, TraceEvent } from '../../components/product/cards'
import { MemoryKindIcon } from '../../components/product/MemoryKindIcon'
import { PageHeader } from '../../components/product/PageHeader'
import { agentCards, fallbackNodes } from '../../data/product'
import type { ProductScreenProps } from '../../types/product'

export function DashboardScreen({ graph, health, runScenario, trace, busy }: ProductScreenProps) {
  const nodes = graph?.nodes ?? fallbackNodes
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? 'user')
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0]

  return (
    <>
      <PageHeader
        title="Memory Graph Studio"
        subtitle="Live context graph used by the Goal, Scenario, Tax, and Communication agents."
      >
        <button className="secondary-action" type="button">
          <Bell size={18} /> {health?.supabase.connected ? 'Backend connected' : 'Local demo'}
        </button>
        <button className="primary-action" type="button" disabled={busy} onClick={runScenario}>
          <Sparkle size={18} /> Run agent stack
        </button>
      </PageHeader>
      <section className="dashboard-layout">
        <div>
          <div className="graph-canvas">
            <div className="graph-toolbar">
              <button className="secondary-action" type="button">
                <MagnifyingGlass size={18} /> Inspect
              </button>
              <button className="secondary-action" type="button">
                <Eye size={18} /> Sources
              </button>
              <button className="secondary-action" type="button">
                <GearSix size={18} /> Settings
              </button>
            </div>
            <div className="memory-galaxy">
              <div className="center-node">
                <CirclesThreePlus size={32} />
                <strong>Maya Patel</strong>
                <span>Unified investing memory</span>
              </div>
              {nodes.map((node, index) => (
                <button
                  className={`graph-node node-${index % 8} ${node.kind} ${node.id === selectedId ? 'selected' : ''}`}
                  type="button"
                  key={node.id}
                  onClick={() => setSelectedId(node.id)}
                >
                  <MemoryKindIcon kind={node.kind} />
                  <h4>{node.label}</h4>
                  <p>{node.value}</p>
                </button>
              ))}
            </div>
            <div className="legend-row">
              <span><i /> Goal</span>
              <span><i className="gold" /> Account</span>
              <span><i className="violet" /> Risk</span>
              <span><i className="blue" /> Communication</span>
            </div>
          </div>
          <div className="dashboard-bottom">
            <div className="summary-card">
              <h3>{selected?.label ?? 'Memory'}</h3>
              <p>{selected?.value ?? 'Commit onboarding to fill the graph.'}</p>
              <div className="profile-tags">
                {selected?.usedBy.map((agent) => (
                  <span key={agent}>{agent}</span>
                ))}
              </div>
            </div>
            <div className="privacy-card">
              <h3>Privacy controls</h3>
              <p>Agents can read only approved memory sections. Auto-trading stays disabled.</p>
              <div className="privacy-grid">
                {['No auto trade', 'Tax aware', 'Cite sources', 'Explain costs'].map((item) => (
                  <div className="privacy-tile" key={item}>
                    <CheckCircle size={18} />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <aside className="agent-rail">
          <div className="rail-heading">
            <h2>Agent activity</h2>
            <span className="live-dot" />
          </div>
          {agentCards.map((card) => (
            <AgentCard card={card} key={card.agent} />
          ))}
          <div className="trace-list">
            {trace.slice(0, 5).map((event) => (
              <TraceEvent event={event} key={event.id} />
            ))}
          </div>
        </aside>
      </section>
    </>
  )
}
