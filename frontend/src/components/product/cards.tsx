import { EyeSlash, Sparkle } from '@phosphor-icons/react'
import type { AgentTraceEvent, MemoryGraphNode } from '@calmvest/shared'
import type { agentCards } from '../../data/product'

export function AgentCard({ card }: { card: (typeof agentCards)[number] }) {
  return (
    <article className="agent-card">
      <header>
        <span className={`agent-icon ${card.tone}`}>
          <Sparkle size={20} />
        </span>
        <div>
          <h3>{card.agent}</h3>
          <p>
            {card.time} - {card.detail}
          </p>
        </div>
        <span className={`tag ${card.tone}`}>{card.tag}</span>
      </header>
      <h4>{card.title}</h4>
      <p>Every recommendation includes a memory citation and a traceable tool path.</p>
    </article>
  )
}

export function MemoryDetailCard({ node }: { node: MemoryGraphNode }) {
  return (
    <article className="memory-detail-card">
      <header>
        <div>
          <h3>{node.label}</h3>
          <p>{node.source}</p>
        </div>
        <button className="icon-button" type="button" aria-label="Hide memory">
          <EyeSlash size={18} />
        </button>
      </header>
      <p>{node.value}</p>
      <div className="tag-row">
        {node.usedBy.map((agent) => (
          <span key={agent}>{agent}</span>
        ))}
      </div>
    </article>
  )
}

export function TraceEvent({ event }: { event: AgentTraceEvent }) {
  return (
    <div className="trace-event">
      <Sparkle size={17} />
      <div>
        <strong>{event.agent}</strong>
        <p>{event.label}</p>
        <code>{event.type}</code>
      </div>
    </div>
  )
}

export function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="memory-detail-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}
