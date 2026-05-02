import type { AgentTraceEvent } from '@calmvest/shared'
import { ArrowRight } from '@phosphor-icons/react'
import { agentCards } from '../../data/demoContent'
import { LiveDot } from '../common/LiveDot'
import { AgentActivityCard } from './AgentCards'
import { TraceList } from './TraceList'

export function AgentRail({
  compact,
  trace,
  runScenario,
  busy,
}: {
  compact?: boolean
  trace?: AgentTraceEvent[]
  runScenario?: () => void
  busy?: boolean
}) {
  return (
    <aside className={compact ? 'agent-rail compact' : 'agent-rail'}>
      <div className="rail-heading">
        <h3>Agent Activity</h3>
        <LiveDot />
      </div>
      {agentCards.map((card) => (
        <AgentActivityCard card={card} key={card.agent} />
      ))}
      {runScenario ? (
        <button className="rail-run" type="button" onClick={runScenario} disabled={busy}>
          {busy ? 'Running agents...' : 'Run fresh check'} <ArrowRight size={16} />
        </button>
      ) : null}
      {trace && trace.length > 0 ? <TraceList trace={trace} compact /> : null}
    </aside>
  )
}
