import { ArrowRight } from '@phosphor-icons/react'
import { agentCards } from '../../data/demoContent'
import { AgentIcon } from '../common/AgentIcon'

export function AgentActivityCard({ card }: { card: (typeof agentCards)[number] }) {
  return (
    <article className="agent-card">
      <AgentIcon tone={card.tone} />
      <div>
        <div><strong>{card.agent}</strong><span>{card.time}</span></div>
        <h4>{card.title}</h4>
        <p>{card.detail}</p>
        <footer><span>{card.tag}</span><button type="button">View details <ArrowRight size={14} /></button></footer>
      </div>
    </article>
  )
}

export function AgentUsageCard({ card }: { card: (typeof agentCards)[number] }) {
  return (
    <article className="usage-card">
      <AgentIcon tone={card.tone} />
      <div>
        <strong>{card.agent}</strong>
        <span>{card.time}</span>
        <p>{card.detail}</p>
        <div className="tag-row"><span>Goals</span><span>Risk Comfort</span><span>+5</span></div>
      </div>
    </article>
  )
}
