import { useEffect, useState } from 'react'
import type { AgentTraceEvent, DemoSeed } from '@calmvest/shared'
import './App.css'

type HealthResponse = {
  ok: boolean
  service: string
  supabase: { connected: boolean; message?: string }
  openrouter: { configured: boolean }
}

async function readSse(response: Response, onEvent: (event: AgentTraceEvent) => void) {
  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const data = part
        .split('\n')
        .find((line) => line.startsWith('data: '))
        ?.slice(6)

      if (!data) continue
      const parsed = JSON.parse(data)
      if ('type' in parsed) onEvent(parsed as AgentTraceEvent)
    }
  }
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [seed, setSeed] = useState<DemoSeed | null>(null)
  const [trace, setTrace] = useState<AgentTraceEvent[]>([])
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    void Promise.all([
      fetch('/api/health').then(async (res) => setHealth(await res.json())),
      fetch('/api/demo/seed').then(async (res) => setSeed(await res.json())),
    ])
  }, [])

  async function runScenario() {
    setTrace([])
    setIsRunning(true)

    try {
      const response = await fetch('/api/agent/scenario/stream', { method: 'POST' })
      await readSse(response, (event) => setTrace((previous) => [...previous, event]))
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div>
          <p className="eyebrow">Goldman Sachs Hackathon Prototype</p>
          <h1>CalmVest Agent OS</h1>
          <p className="hero-copy">
            A transparent agent team that turns onboarding answers and simulated account data into
            memory, scenario analysis, and trust receipts.
          </p>
        </div>
        <div className="status-panel" aria-label="System status">
          <span className={health?.ok ? 'status-dot good' : 'status-dot'} />
          <div>
            <strong>{health?.service ?? 'Starting API'}</strong>
            <p>
              Supabase {health?.supabase.connected ? 'connected' : 'pending'} · OpenRouter{' '}
              {health?.openrouter.configured ? 'configured' : 'needs key'}
            </p>
          </div>
        </div>
      </section>

      <section className="demo-grid">
        <article className="panel memory-panel">
          <div className="panel-heading">
            <p className="eyebrow">Memory Graph Seed</p>
            <h2>{seed?.user.name ?? 'Maya Patel'}</h2>
          </div>
          <div className="node-cloud">
            {['Goals', 'Risk', 'Accounts', 'Tax', 'Cash Flow', 'Communication'].map((node) => (
              <span key={node}>{node}</span>
            ))}
          </div>
          <pre>{seed?.memoryTemplate ?? 'Loading memory template...'}</pre>
        </article>

        <article className="panel scenario-panel">
          <div className="panel-heading">
            <p className="eyebrow">Scenario Canvas</p>
            <h2>Market drop + 20% withdrawal</h2>
          </div>
          <p>
            This temporary shell proves the backend stream, trace ordering, and seeded context. The
            screenshot-driven UI pass will replace this with the final hackathon visual system.
          </p>
          <button type="button" onClick={runScenario} disabled={isRunning}>
            {isRunning ? 'Running agents...' : 'Run fresh check'}
          </button>
        </article>

        <article className="panel trace-panel">
          <div className="panel-heading">
            <p className="eyebrow">Agent Trace Replay</p>
            <h2>Chronological events</h2>
          </div>
          <ol>
            {trace.map((event) => (
              <li key={event.id}>
                <span>{event.agent}</span>
                <strong>{event.label}</strong>
                <small>{event.type}</small>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </main>
  )
}

export default App
