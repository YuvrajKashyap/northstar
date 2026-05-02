import { Eye, Plus, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import type { ScreenProps } from '../types/screens'
import { AgentRail } from '../components/dashboard/AgentRail'
import { AppChrome } from '../components/layout/AppChrome'
import { AppPageHeader } from '../components/layout/AppPageHeader'
import { MemoryGalaxy } from '../components/dashboard/MiniGraph'

export function DashboardPage(props: ScreenProps) {
  return (
    <AppChrome active="dashboard" setScreen={props.setScreen}>
      <section className="dashboard-screen screen-enter">
        <AppPageHeader title="Memory Graph Studio" subtitle="Your life. Your context. Connected for calm, intelligent guidance." />
        <div className="dashboard-layout">
          <article className="graph-canvas">
            <div className="graph-toolbar">
              <button type="button"><Eye size={18} /></button>
              <button type="button"><Sparkle size={18} /></button>
              <button type="button"><Plus size={18} /> Add Memory</button>
            </div>
            <MemoryGalaxy
              graph={props.graph}
              selectedNodeId={props.selectedNodeId}
              setSelectedNodeId={props.setSelectedNodeId}
            />
            <div className="legend-row">
              {['Core Identity', 'Financial', 'Life Context', 'Behavioral', 'Hidden'].map((item) => <span key={item}>{item}</span>)}
            </div>
          </article>
          <AgentRail trace={props.scenarioTrace} runScenario={props.runScenario} busy={props.busyStep === 'scenario'} />
        </div>
        <div className="dashboard-bottom">
          <article className="summary-card">
            <h3>Memory Summary</h3>
            <p>
              {props.selectedNode?.value ??
                "Maya is saving for a home, balancing growth with liquidity, and prefers plain language."}
            </p>
            <div className="tag-row">
              {['Long-term focused', 'Growth mindset', 'Family-oriented'].map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </article>
          <article className="privacy-card">
            <h3>Privacy Controls</h3>
            <div className="privacy-grid">
              {['Memory Access', 'Data Visibility', 'Data Retention', 'Export / Delete'].map((item) => (
                <div key={item}>
                  <ShieldCheck size={22} />
                  <strong>{item}</strong>
                  <button type="button">Manage</button>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </AppChrome>
  )
}
