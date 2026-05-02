import { ArrowRight } from '@phosphor-icons/react'
import { agentCards } from '../../data/workspaceContent'
import { AgentIcon } from '../common/AgentIcon'

export function AgentActivityCard({ card }: { card: (typeof agentCards)[number] }) {
  return (
    <article className="agent-card">
      <header>
        <AgentIcon tone={card.tone} />
        <div>
          <strong>{card.agent}</strong>
          <span>{card.time}</span>
        </div>
        <span className={`agent-card-tag ${card.tone}`}>{card.tag}</span>
      </header>
      <h4>{card.title}</h4>
      <p>{card.detail}</p>
      <footer>
        <button type="button" className="subtle-button">View details <ArrowRight size={13} /></button>
      </footer>
    </article>
  )
}

/** Compact single-row variant used in hero product frame */
export function CompactAgentRow({ card }: { card: (typeof agentCards)[number] }) {
  return (
    <div className="compact-agent-row">
      <AgentIcon tone={card.tone} compact />
      <div className="compact-agent-body">
        <strong>{card.title}</strong>
        <span>{card.time} · {card.agent}</span>
      </div>
      <span className={`agent-pill ${card.tone}`}>{card.tag}</span>
    </div>
  )
}

export function AgentUsageCard({ card }: { card: (typeof agentCards)[number] }) {
  return (
    <article className="usage-card">
      <header>
        <AgentIcon tone={card.tone} />
        <div>
          <strong>{card.agent}</strong>
          <span>{card.time}</span>
        </div>
      </header>
      <p>{card.detail}</p>
      <div className="tag-row">
        <span>Goals</span>
        <span>Risk Comfort</span>
        <span>+3</span>
      </div>
    </article>
  )
}
