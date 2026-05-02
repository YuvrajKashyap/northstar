import { ArrowRight, CirclesThreePlus, Clock, Copy, DotsThree, PencilSimple, Plus } from '@phosphor-icons/react'
import { agentCards } from '../data/workspaceContent'
import type { ScreenProps } from '../types/screens'
import { AgentUsageCard } from '../components/dashboard/AgentCards'
import { AppChrome } from '../components/layout/AppChrome'
import { AppPageHeader } from '../components/layout/AppPageHeader'
import { Avatar } from '../components/common/Avatar'
import { LiveDot } from '../components/common/LiveDot'

export function MemoryPage(props: ScreenProps) {
  const sessionName = localStorage.getItem('northstar.activeUserName')?.trim()
  const graphName = props.graph?.contextPacket.user.name?.trim()
  const displayName = sessionName || graphName || 'Northstar user'
  const investorLevel = props.graph?.contextPacket.user.investor_level?.replace(/_/g, ' ') || 'profile in progress'
  const primaryGoal = props.graph?.contextPacket.goals[0]
  const riskComfort = props.graph?.contextPacket.risk_profile.risk_comfort?.replace(/_/g, ' ') || 'not filled in yet'
  const memorySections = [
    ['Memory Summary', 'High-level overview', `${displayName}'s memory is built from committed questionnaire answers and connected account context.`],
    ['Identity', 'Personal and professional', `${displayName} is marked as ${investorLevel}.`],
    ['Goals', 'Priorities and timelines', primaryGoal ? `${primaryGoal.type.replace(/_/g, ' ')} with a ${primaryGoal.priority} priority.` : 'No committed goal yet.'],
    ['Communication Style', 'Preferences and patterns', props.graph?.contextPacket.user.communication_style || props.answers.communicationStyle],
    ['Risk Comfort', 'Behavior and market response', riskComfort],
    ['Constraints', 'Boundaries and limits', 'No auto-trading. Explain costs, taxes, and confidence.'],
  ]

  return (
    <AppChrome
      active="memory"
      setScreen={props.setScreen}
      graph={props.graph}
      agentAnswer={props.agentAnswer}
      scenarioTrace={props.scenarioTrace}
      runAgent={props.runAgent}
      runScenario={props.runScenario}
      busyStep={props.busyStep}
    >
      <section className="memory-screen screen-enter">
        <AppPageHeader title="Memory" subtitle={`Detailed view and editor for ${displayName}'s memory.`} />
        <div className="memory-layout">
          <article>
            <div className="profile-heading">
              <Avatar name={displayName} />
              <div>
                <h2>{displayName} <span>Verified</span></h2>
                <p>Primary Profile - Last updated 2h ago</p>
              </div>
              <button type="button"><DotsThree size={22} /></button>
              <button type="button"><Clock size={18} /> Memory history</button>
              <button className="primary-action" type="button"><PencilSimple size={18} /> Edit memory</button>
            </div>
            <div className="memory-tabs">
              {['Memory', 'Raw data', 'Structured fields'].map((item, index) => (
                <button className={index === 0 ? 'active' : ''} type="button" key={item}>{item}</button>
              ))}
            </div>
            <div className="memory-content-grid">
              <aside className="memory-section-list">
                {memorySections.map(([title, sub], index) => (
                  <button className={index === 0 ? 'active' : ''} type="button" key={title}>
                    <CirclesThreePlus size={22} />
                    <span><strong>{title}</strong><small>{sub}</small></span>
                  </button>
                ))}
                <button className="add-section" type="button"><Plus size={18} /> Add memory section</button>
              </aside>
              <div className="memory-detail-stack">
                {memorySections.map(([title, sub, text]) => (
                  <article className="memory-detail-card" key={title}>
                    <div>
                      <h3>{title}</h3>
                      <p>{sub}</p>
                    </div>
                    <p>{text}</p>
                    <div className="tag-row">
                      {['Growth mindset', 'Financial freedom', 'Family-oriented'].map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  </article>
                ))}
                <article className="markdown-card">
                  <div><h3>Human-readable memory.md</h3><button type="button"><Copy size={16} /> Copy</button></div>
                  <pre>{props.graph?.memoryMarkdown ?? 'Memory will appear after onboarding commit.'}</pre>
                </article>
              </div>
            </div>
          </article>
          <aside className="agent-usage-panel">
            <h3>Recent North tool usage <LiveDot /></h3>
            {agentCards.map((card) => (
              <AgentUsageCard card={card} key={card.agent} />
            ))}
            <div className="memory-controls">
              <h3>Memory controls</h3>
              {['Approve updates', 'Hide from North', 'Memory history', 'Export memory', 'Delete memory'].map((item, index) => (
                <button className={index === 4 ? 'danger' : ''} type="button" key={item}>{item}<ArrowRight size={15} /></button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </AppChrome>
  )
}
