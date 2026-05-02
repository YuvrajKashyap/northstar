import type { AgentTraceEvent } from '@calmvest/shared'
import { ArrowRight, CheckCircle, PaperPlaneTilt, ShieldCheck, WarningCircle } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { agentCards } from '../../data/workspaceContent'
import { MarkdownRenderer } from '../common/MarkdownRenderer'
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
  const scenario = useMemo(() => summarizeScenario(trace ?? []), [trace])

  if (compact) {
    return (
      <aside className="agent-rail compact">
        <div className="rail-heading">
          <h3>Agent activity</h3>
          <LiveDot />
        </div>
        {agentCards.map((card) => (
          <CompactAgentRow card={card} key={card.title} />
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
        <MarkdownRenderer>{answer}</MarkdownRenderer>
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
    ? agentCards.map((card) => <CompactAgentRow card={card} key={card.title} />)
    : agentCards.map((card) => <AgentActivityCard card={card} key={card.title} />)

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
          <DecisionInboxCard scenario={scenario} />
          <ScenarioCanvasCard scenario={scenario} />
          <TrustReceiptCard scenario={scenario} />
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

type ScenarioSummary = {
  stress?: Record<string, unknown>
  paths?: Record<string, unknown>
  receipt?: Record<string, unknown>
  eventCount: number
}

function summarizeScenario(trace: AgentTraceEvent[]): ScenarioSummary {
  return {
    stress: findToolResult(trace, 'run_stress_test'),
    paths: findToolResult(trace, 'compare_plan_paths'),
    receipt:
      trace.find((event) => event.type === 'receipt_created')?.payload.receipt as Record<string, unknown> | undefined ??
      findToolResult(trace, 'create_trust_receipt'),
    eventCount: trace.length,
  }
}

function findToolResult(trace: AgentTraceEvent[], toolName: string) {
  const event = trace.find(
    (item) => item.type === 'tool_result' && item.payload.toolName === toolName && typeof item.payload.result === 'object',
  )
  return event?.payload.result as Record<string, unknown> | undefined
}

function DecisionInboxCard({ scenario }: { scenario: ScenarioSummary }) {
  const hasRun = scenario.eventCount > 0
  return (
    <article className="demo-decision-card">
      <div className="demo-card-kicker">
        <WarningCircle size={17} weight="duotone" />
        Needs approval
      </div>
      <h3>Scenario worth reviewing</h3>
      <p>Market drop + withdrawal need may affect Maya's house goal.</p>
      <div className="demo-decision-meta">
        <span>{hasRun ? 'Trace ready' : 'Waiting for fresh check'}</span>
        <span>Approval required</span>
      </div>
    </article>
  )
}

function ScenarioCanvasCard({ scenario }: { scenario: ScenarioSummary }) {
  const stress = scenario.stress
  const paths = Array.isArray(scenario.paths?.paths) ? (scenario.paths.paths as Array<Record<string, unknown>>) : []
  const recommended = paths.find((path) => path.name === scenario.paths?.recommendation) ?? paths[1]

  return (
    <article className="scenario-canvas-card">
      <div className="demo-card-kicker">Scenario Canvas</div>
      <h3>Markets -20%, cash need 20%</h3>
      <div className="scenario-metrics">
        <Metric label="Portfolio" value={money(stress?.startingValue) || '$60,688'} />
        <Metric label="Stressed" value={money(stress?.stressedValue) || '$47,094'} />
        <Metric label="Gap" value={money(stress?.liquidityGap) || '$9,988'} />
        <Metric label="Delay" value={`${numberOr(stress?.goalDelayMonths, 11)} mo`} />
      </div>
      <div className="scenario-path">
        <span>Recommended path</span>
        <strong>{String(recommended?.name ?? 'Balanced protection')}</strong>
        <p>
          Stress loss {pct(recommended?.stressLossPct) || '-14.8%'} · liquidity{' '}
          {pctFromRatio(recommended?.liquidityCoverage) || '100%'} · concentration{' '}
          {pctFromRatio(recommended?.top3Concentration) || '29%'}
        </p>
      </div>
    </article>
  )
}

function TrustReceiptCard({ scenario }: { scenario: ScenarioSummary }) {
  const receipt = scenario.receipt
  const confidence = receipt?.confidence as Record<string, unknown> | undefined
  return (
    <article className="trust-receipt-card">
      <div className="demo-card-kicker">
        <ShieldCheck size={17} weight="duotone" />
        Trust receipt
      </div>
      <h3>Human control: {String(receipt?.humanControl ?? 'approval_required').replace(/_/g, ' ')}</h3>
      <div className="receipt-grid">
        <span>Why</span>
        <p>{String(receipt?.why ?? 'Maya may need cash soon and is worried about a sharp drawdown.')}</p>
        <span>Cost</span>
        <p>{String(receipt?.cost ?? 'low')}</p>
        <span>Tax</span>
        <p>{String(receipt?.taxImpact ?? 'medium')}</p>
      </div>
      <div className="confidence-row">
        {([
          ['Liquidity', confidence?.liquidityMath ?? 'high'],
          ['Market', confidence?.marketShockAssumptions ?? 'medium'],
          ['Forecast', confidence?.returnForecast ?? 'low'],
        ] as Array<[string, unknown]>).map(([label, value]) => (
          <span key={label}>
            <CheckCircle size={14} weight="fill" />
            {label}: {String(value)}
          </span>
        ))}
      </div>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function money(value: unknown) {
  return typeof value === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    : ''
}

function pct(value: unknown) {
  return typeof value === 'number' ? `${value.toFixed(1)}%` : ''
}

function pctFromRatio(value: unknown) {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : ''
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback
}
