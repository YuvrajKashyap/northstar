import type { AgentTraceEvent } from '@calmvest/shared'
import { ArrowRight, PaperPlaneTilt } from '@phosphor-icons/react'
import { useState } from 'react'
import { agentCards } from '../../data/workspaceContent'
import { LiveDot } from '../common/LiveDot'
import { AgentActivityCard, CompactAgentRow } from './AgentCards'
import { TraceList } from './TraceList'

export function AgentRail({
  compact,
  hideHeading,
  panel,
  answer,
  trace,
  runAgent,
  runScenario,
  busy,
}: {
  compact?: boolean
  hideHeading?: boolean
  /** Right-side chat layout: message box first, then agents as compact rows */
  panel?: boolean
  answer?: string
  trace?: AgentTraceEvent[]
  runAgent?: (message: string) => void
  runScenario?: () => void
  busy?: boolean
}) {
  const [prompt, setPrompt] = useState('')

  if (compact) {
    return (
      <aside className="agent-rail compact">
        <div className="rail-heading">
          <h3>Agent activity</h3>
          <LiveDot />
        </div>
        {agentCards.map((card) => (
          <CompactAgentRow card={card} key={card.agent} />
        ))}
      </aside>
    )
  }

  const runner =
    runAgent ? (
      <form
        className="agent-runner-form"
        onSubmit={(event) => {
          event.preventDefault()
          const message = prompt.trim()
          if (!message || busy) return
          runAgent(message)
          setPrompt('')
        }}
      >
        <div className="agent-composer-head">
          <span>Ask Northstar</span>
          <small>{busy ? 'Working' : 'Ready'}</small>
        </div>
        <textarea
          className="agent-runner-input"
          rows={panel ? 3 : 4}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about your memory, portfolio, taxes, market context, or next decision."
          disabled={busy}
        />
        <div className="agent-runner-actions">
          <button className="primary-action rail-submit" type="submit" disabled={busy || !prompt.trim()}>
            {busy ? 'Running...' : 'Send'} <PaperPlaneTilt size={16} />
          </button>
        </div>
      </form>
    ) : null

  const answerBlock =
    answer ? (
      <article className="agent-answer">
        <span>Northstar response</span>
        <p>{answer}</p>
      </article>
    ) : null

  const traceBlock = trace && trace.length > 0 ? <TraceList trace={trace} compact /> : null

  const scenarioBlock =
    runScenario ? (
      <button className="ghost-action rail-run" type="button" onClick={runScenario} disabled={busy}>
        {busy ? 'Running agents...' : 'Run fresh check'} <ArrowRight size={16} />
      </button>
    ) : null

  const cardsBlock = panel
    ? agentCards.map((card) => <CompactAgentRow card={card} key={card.agent} />)
    : agentCards.map((card) => <AgentActivityCard card={card} key={card.agent} />)

  return (
    <aside className={`agent-rail${panel ? ' agent-rail--panel' : ''}`}>
      {!hideHeading ? (
        <div className="rail-heading">
          <h3>Agent activity</h3>
          <LiveDot />
        </div>
      ) : null}
      {panel ? (
        <>
          {runner}
          {answerBlock}
          {traceBlock}
          {scenarioBlock}
          <div className="agent-rail__panel-agents">
            <span className="agent-rail__panel-agents-label">Specialists on call</span>
            {cardsBlock}
          </div>
        </>
      ) : (
        <>
          {cardsBlock}
          {runner}
          {answerBlock}
          {scenarioBlock}
          {traceBlock}
        </>
      )}
    </aside>
  )
}
