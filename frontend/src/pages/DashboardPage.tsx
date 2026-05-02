import { useEffect, useMemo, useState } from 'react'
import {
  ArrowClockwise,
  Brain,
  ChartLineUp,
  Database,
  FileText,
  PaperPlaneTilt,
  Pulse,
  Sparkle,
} from '@phosphor-icons/react'
import type { AgentTraceEvent, RawMemoryDocument } from '@calmvest/shared'
import type { ScreenProps } from '../types/screens'
import { AppChrome } from '../components/layout/AppChrome'
import { getRawMemory } from '../lib/api'

const freshCheckMessage =
  'Get the latest market news, use my memory and portfolio context, and tell me what matters for my specific goals and risk comfort. Limit yourself to the most important checks.'

const suggestedPrompts = [
  'What should I do if markets fall 20% and I may need cash next year?',
  'Use my memory.md and explain the biggest risk in my portfolio.',
  'What should I review before making any tax-sensitive move?',
]

export function DashboardPage(props: ScreenProps) {
  const [prompt, setPrompt] = useState('')
  const [rawMemory, setRawMemory] = useState<RawMemoryDocument | null>(null)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [memoryTab, setMemoryTab] = useState<'memory' | 'context'>('memory')

  const userId = props.graph?.userId ?? props.answers.userId
  const isBusy = props.busyStep === 'scenario'

  useEffect(() => {
    let cancelled = false
    void getRawMemory(userId)
      .then((memory) => {
        if (!cancelled) setRawMemory(memory)
      })
      .catch(() => {
        if (!cancelled && props.graph) {
          setRawMemory({
            userId,
            memoryMarkdown: props.graph.memoryMarkdown,
            contextPacket: props.graph.contextPacket,
            updatedAt: null,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [props.graph, userId])

  const messages = useMemo(
    () => [
      {
        role: 'assistant' as const,
        body:
          'I am North. I load memory.md, context_packet.json, and portfolio context before I answer. Ask me for a scenario, a daily market check, or a plain-English review.',
      },
      ...(props.agentAnswer
        ? [
            {
              role: 'assistant' as const,
              body: props.agentAnswer,
            },
          ]
        : []),
    ],
    [props.agentAnswer],
  )

  function submit(message = prompt, mode: 'general' | 'fresh_check' | 'demo_scenario' = 'general') {
    const trimmed = message.trim()
    if (!trimmed || isBusy) return
    props.runAgent(trimmed, mode)
    setPrompt('')
  }

  function rerunOnboarding() {
    window.history.pushState({}, '', '/workspace/memory')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const visibleTrace = props.scenarioTrace.filter((event) => event.type !== 'message_delta')

  return (
    <AppChrome
      active="dashboard"
      setScreen={props.setScreen}
      graph={props.graph}
      agentAnswer={props.agentAnswer}
      scenarioTrace={props.scenarioTrace}
      runAgent={props.runAgent}
      runScenario={props.runScenario}
      busyStep={props.busyStep}
      onSelectMemoryNode={props.setSelectedNodeId}
    >
      <section className="north-chat-screen screen-enter">
        <main className="north-chat-main" aria-label="North chat">
          <header className="north-chat-header">
            <div className="north-chat-mark">
              <Sparkle size={22} weight="duotone" />
            </div>
            <div>
              <span>North</span>
              <h1>One local agent. Full memory loaded.</h1>
            </div>
          </header>

          <div className="north-quick-actions" aria-label="Demo actions">
            <button type="button" onClick={rerunOnboarding}>
              <ArrowClockwise size={18} /> Run onboarding again
            </button>
            <button
              type="button"
              onClick={() => {
                setMemoryOpen(true)
                setMemoryTab('memory')
              }}
            >
              <FileText size={18} /> View memory.md
            </button>
            <button type="button" onClick={props.runScenario} disabled={isBusy}>
              <Pulse size={18} /> Run demo scenario
            </button>
            <button type="button" onClick={() => submit(freshCheckMessage, 'fresh_check')} disabled={isBusy}>
              <ChartLineUp size={18} /> Daily market check
            </button>
          </div>

          <section className="north-message-list" aria-live="polite">
            {messages.map((message, index) => (
              <article className={`north-message north-message--${message.role}`} key={`${message.role}-${index}`}>
                <div className="north-message__avatar">{message.role === 'assistant' ? 'N' : 'You'}</div>
                <p>{message.body}</p>
              </article>
            ))}
            {!props.agentAnswer && (
              <div className="north-suggestions">
                {suggestedPrompts.map((item) => (
                  <button type="button" key={item} onClick={() => submit(item)}>
                    {item}
                  </button>
                ))}
              </div>
            )}
          </section>

          <form
            className="north-composer"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask North about your portfolio, goals, taxes, memory, or market context..."
              disabled={isBusy}
              rows={2}
            />
            <button type="submit" disabled={isBusy || !prompt.trim()} aria-label="Send message">
              <PaperPlaneTilt size={20} weight="fill" />
            </button>
          </form>
        </main>

        <aside className="north-trace-panel" aria-label="Tool trace">
          <header>
            <span>Trace</span>
            <strong>{visibleTrace.length} events</strong>
          </header>
          <div className="north-context-card">
            <Brain size={20} weight="duotone" />
            <div>
              <strong>{rawMemory?.contextPacket.user.name ?? props.graph?.contextPacket.user.name ?? 'User'}</strong>
              <span>{rawMemory ? `${rawMemory.memoryMarkdown.length.toLocaleString()} memory chars` : 'Loading memory...'}</span>
            </div>
          </div>
          <div className="north-trace-list">
            {visibleTrace.length ? (
              visibleTrace.map((event) => <TraceEventRow event={event} key={event.id} />)
            ) : (
              <p>Run onboarding, a demo scenario, or a market check to stream JSONL-style tool events here.</p>
            )}
          </div>
        </aside>

        {memoryOpen ? (
          <div className="north-memory-modal" role="dialog" aria-modal="true" aria-label="Memory document">
            <div className="north-memory-modal__panel">
              <header>
                <div>
                  <span>Transparency</span>
                  <h2>{memoryTab === 'memory' ? 'memory.md' : 'context_packet.json'}</h2>
                </div>
                <button type="button" onClick={() => setMemoryOpen(false)}>
                  Close
                </button>
              </header>
              <div className="north-memory-tabs">
                <button
                  className={memoryTab === 'memory' ? 'active' : ''}
                  type="button"
                  onClick={() => setMemoryTab('memory')}
                >
                  <FileText size={16} /> memory.md
                </button>
                <button
                  className={memoryTab === 'context' ? 'active' : ''}
                  type="button"
                  onClick={() => setMemoryTab('context')}
                >
                  <Database size={16} /> context packet
                </button>
              </div>
              <pre>
                {memoryTab === 'memory'
                  ? rawMemory?.memoryMarkdown ?? props.graph?.memoryMarkdown ?? 'No memory loaded yet.'
                  : JSON.stringify(rawMemory?.contextPacket ?? props.graph?.contextPacket ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </section>
    </AppChrome>
  )
}

function TraceEventRow({ event }: { event: AgentTraceEvent }) {
  return (
    <article className="north-trace-row">
      <span>{event.type.replace(/_/g, ' ')}</span>
      <strong>{event.label}</strong>
      <p>{event.agent}</p>
    </article>
  )
}
