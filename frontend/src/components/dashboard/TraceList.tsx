import type { AgentTraceEvent } from '@calmvest/shared'

export function TraceList({ trace, compact }: { trace: AgentTraceEvent[]; compact?: boolean }) {
  return (
    <ol className={compact ? 'trace-list compact' : 'trace-list'}>
      {trace.map((event) => (
        <li key={event.id}>
          <span>{event.agent}</span>
          <strong>{event.label}</strong>
          <small>{event.type}</small>
        </li>
      ))}
    </ol>
  )
}
