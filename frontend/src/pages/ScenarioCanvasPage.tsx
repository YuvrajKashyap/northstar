import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Bank,
  Briefcase,
  ChartLineDown,
  CheckCircle,
  Clock,
  Coins,
  House,
  Lightning,
  MagicWand,
  ShieldCheck,
  Sparkle,
  TrendUp,
  WarningCircle,
} from '@phosphor-icons/react'
import { AppChrome } from '../components/layout/AppChrome'
import type { ScreenProps } from '../types/screens'

type ScenarioKind = 'choice' | 'event'
type ScenarioTone = 'green' | 'gold' | 'red' | 'blue'

type ScenarioDraft = {
  id: string
  title: string
  kind: ScenarioKind
  text: string
  horizon: string
}

type ScenarioPreset = ScenarioDraft & {
  icon: typeof Briefcase
  category: string
}

type ScenarioResult = ScenarioDraft & {
  slotIndex: number
  score: number
  liquidity: number
  goalFit: number
  stress: number
  actionability: number
  tone: ScenarioTone
  forecast: string
  strategy: string
  tradeoff: string
}

const scenarioPresets: ScenarioPreset[] = [
  {
    id: 'market-drop',
    title: 'Market drops 20%',
    kind: 'event',
    text: 'Stocks fall 20% over the next 3 months while my goals stay the same.',
    horizon: '3 months',
    icon: ChartLineDown,
    category: 'Outside event',
  },
  {
    id: 'cash-need',
    title: 'Need $15K cash',
    kind: 'event',
    text: 'I unexpectedly need $15,000 in cash within 60 days.',
    horizon: '60 days',
    icon: Bank,
    category: 'Outside event',
  },
  {
    id: 'home-sooner',
    title: 'Move home goal earlier',
    kind: 'choice',
    text: 'I want to move my home down payment timeline up by 12 months.',
    horizon: '12 months',
    icon: House,
    category: 'User choice',
  },
  {
    id: 'increase-risk',
    title: 'Invest more aggressively',
    kind: 'choice',
    text: 'I am considering moving more cash into growth stocks to speed up long-term returns.',
    horizon: '1 year',
    icon: TrendUp,
    category: 'User choice',
  },
  {
    id: 'income-gap',
    title: 'Income gap',
    kind: 'event',
    text: 'My income stops for 4 months, but rent and normal bills continue.',
    horizon: '4 months',
    icon: Clock,
    category: 'Outside event',
  },
  {
    id: 'large-purchase',
    title: 'Large purchase',
    kind: 'choice',
    text: 'I want to spend $8,000 on a major purchase this year.',
    horizon: 'This year',
    icon: Coins,
    category: 'User choice',
  },
]

const initialScenarios: ScenarioDraft[] = [
  scenarioPresets[0],
  scenarioPresets[2],
  scenarioPresets[4],
].map(toScenarioDraft)

export function ScenarioCanvasPage(props: ScreenProps) {
  const [scenarios, setScenarios] = useState<ScenarioDraft[]>(initialScenarios)
  const [selectedSlot, setSelectedSlot] = useState(0)

  const results = useMemo(() => scenarios.map((scenario, index) => scoreScenario(scenario, index)), [scenarios])
  const best = useMemo(() => chooseBest(results), [results])

  function updateScenario(index: number, patch: Partial<ScenarioDraft>) {
    setScenarios((current) =>
      current.map((scenario, scenarioIndex) =>
        scenarioIndex === index ? { ...scenario, ...patch } : scenario,
      ),
    )
  }

  function applyPreset(preset: ScenarioPreset) {
    updateScenario(selectedSlot, toScenarioDraft(preset))
  }

  return (
    <AppChrome
      active="scenarios"
      setScreen={props.setScreen}
      graph={props.graph}
      agentAnswer={props.agentAnswer}
      scenarioTrace={props.scenarioTrace}
      runAgent={props.runAgent}
      runScenario={props.runScenario}
      busyStep={props.busyStep}
      onSelectMemoryNode={props.setSelectedNodeId}
    >
      <section className="scenario-screen screen-enter">
        <header className="scenario-hero">
          <div>
            <span className="scenario-kicker">
              <Sparkle size={16} weight="fill" />
              Scenario canvas
            </span>
            <h1>Compare three futures before you react.</h1>
            <p>
              <span>Test choices you control and events you do not.</span>
              <span className="scenario-hero__nowrap">
                Northstar separates forecasts from recommendations, then shows which path fits your
                memory, goals, and risk comfort.
              </span>
            </p>
          </div>
          <div className="scenario-hero__status">
            <ShieldCheck size={22} weight="regular" />
            <span>Approval-first</span>
            <strong>No auto-trades</strong>
          </div>
        </header>

        <div className="scenario-workbench">
          <aside className="scenario-bank" aria-label="Scenario presets">
            <div className="scenario-bank__head">
              <span className="scenario-kicker">
                <MagicWand size={15} weight="fill" />
                Preset bank
              </span>
              <strong>Fill slot {selectedSlot + 1}</strong>
              <p>Pick a starting point, then edit the numbers and timing yourself.</p>
            </div>
            <div className="scenario-preset-list">
              {scenarioPresets.map((preset) => {
                const Icon = preset.icon
                return (
                  <button type="button" key={preset.id} onClick={() => applyPreset(preset)}>
                    <Icon size={20} weight="regular" />
                    <span>
                      <strong>{preset.title}</strong>
                      <small>{preset.category}</small>
                    </span>
                    <ArrowRight size={16} weight="regular" />
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="scenario-slots" aria-label="Three scenarios">
            {scenarios.map((scenario, index) => (
              <article
                className={`scenario-slot ${selectedSlot === index ? 'is-selected' : ''}`}
                key={`slot-${index}`}
              >
                <header className="scenario-slot__top">
                  <button
                    className="scenario-slot__select"
                    type="button"
                    onClick={() => setSelectedSlot(index)}
                  >
                    Scenario {index + 1}
                  </button>
                  <span className={`scenario-kind-pill scenario-kind-pill--${scenario.kind}`}>
                    {scenario.kind === 'choice' ? 'Choice' : 'Event'}
                  </span>
                </header>
                <div className="scenario-field-grid">
                  <label>
                    <span>Type</span>
                    <select
                      value={scenario.kind}
                      onChange={(event) => updateScenario(index, { kind: event.target.value as ScenarioKind })}
                    >
                      <option value="choice">In my control</option>
                      <option value="event">Outside my control</option>
                    </select>
                  </label>
                  <label>
                    <span>Timeframe</span>
                    <input
                      value={scenario.horizon}
                      onChange={(event) => updateScenario(index, { horizon: event.target.value })}
                    />
                  </label>
                </div>
                <label className="scenario-title-field">
                  <span>Label</span>
                  <input
                    value={scenario.title}
                    onChange={(event) => updateScenario(index, { title: event.target.value })}
                  />
                </label>
                <label className="scenario-text-field">
                  <span>What should Northstar test?</span>
                  <textarea
                    value={scenario.text}
                    onChange={(event) => updateScenario(index, { text: event.target.value })}
                    placeholder="Example: I want to buy a house sooner, but I may need more cash flexibility."
                  />
                </label>
              </article>
            ))}
          </div>
        </div>

        <section className="scenario-comparison" aria-label="Scenario comparison">
          {results.map((result, index) => (
            <article className={`scenario-result scenario-result--${result.tone}`} key={`result-${index}`}>
              <header>
                <div>
                  <span>{result.kind === 'choice' ? 'Decision path' : 'Outside event'}</span>
                  <strong>{result.title || `Scenario ${index + 1}`}</strong>
                </div>
                <em>{result.kind === 'choice' ? 'Can decide' : 'Prepare'}</em>
              </header>
              <div className="scenario-score">
                <span>{result.score}</span>
                <small>Northstar fit</small>
              </div>
              <div className="scenario-bars">
                <ScenarioBar label="Goal fit" value={result.goalFit} />
                <ScenarioBar label="Liquidity" value={result.liquidity} />
                <ScenarioBar label="Stress load" value={result.stress} inverse />
              </div>
              <div className="scenario-result-copy">
                <p>
                  <strong>Forecast</strong>
                  {result.forecast}
                </p>
                <p>
                  <strong>{result.kind === 'choice' ? 'Recommendation' : 'Best response'}</strong>
                  {result.strategy}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="scenario-agent-review" aria-label="Agent review" aria-live="polite">
          <div className="scenario-agent-review__mark">
            <Lightning size={24} weight="fill" />
          </div>
          <div>
            <span className="scenario-kicker">Scenario Agent review</span>
            <h2>
              {best
                ? `Scenario ${best.slotIndex + 1}: ${best.title || 'Untitled scenario'} aligns best with your Northstar.`
                : 'Add scenarios to compare paths.'}
            </h2>
            {best ? (
              <>
                <p>
                  {best.kind === 'choice'
                    ? `This is the strongest user-controlled path because it has the best blend of goal fit, liquidity, and emotional risk. Northstar would still require approval before any financial action.`
                    : eventReviewFor(best)}
                </p>
                <div className="scenario-agent-review__metrics" aria-label="Current winning scenario metrics">
                  <span>
                    <strong>{best.score}</strong>
                    Fit
                  </span>
                  <span>
                    <strong>{best.liquidity}%</strong>
                    Liquidity
                  </span>
                  <span>
                    <strong>{best.stress}%</strong>
                    Stress
                  </span>
                  <span>
                    <strong>{best.horizon}</strong>
                    Horizon
                  </span>
                </div>
                <div className="scenario-agent-review__grid">
                  {results.map((result) => (
                    <div
                      className={result.slotIndex === best.slotIndex ? 'is-best' : ''}
                      key={`review-slot-${result.slotIndex}`}
                    >
                      {result.slotIndex === best.slotIndex ? (
                        <CheckCircle size={18} weight="fill" />
                      ) : (
                        <WarningCircle size={18} />
                      )}
                      <strong>Scenario {result.slotIndex + 1}: {result.title || 'Untitled'}</strong>
                      <span>{result.tradeoff}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </section>
    </AppChrome>
  )
}

function ScenarioBar({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  return (
    <div className="scenario-bar">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <i style={{ width: `${value}%` }} className={inverse ? 'inverse' : ''} />
    </div>
  )
}

function toScenarioDraft({ id, title, kind, text, horizon }: ScenarioPreset): ScenarioDraft {
  return { id, title, kind, text, horizon }
}

function scoreScenario(scenario: ScenarioDraft, slotIndex: number): ScenarioResult {
  const text = `${scenario.title} ${scenario.text}`.toLowerCase()
  const isChoice = scenario.kind === 'choice'
  const riskSignals = countSignals(text, ['drop', 'crash', 'loss', 'aggressive', 'growth', 'stock', 'risk'])
  const cashSignals = countSignals(text, ['cash', 'withdraw', 'income', 'bill', 'rent', 'emergency', 'purchase'])
  const goalSignals = countSignals(text, ['home', 'goal', 'timeline', 'retire', 'down payment', 'save'])
  const taxSignals = countSignals(text, ['sell', 'rebalance', 'tax', 'gain'])

  const liquidity = clamp(78 - cashSignals * 13 - riskSignals * 3 + (text.includes('cash') ? 4 : 0))
  const goalFit = clamp(62 + goalSignals * 10 - cashSignals * 5 - taxSignals * 4 + (isChoice ? 4 : 0))
  const stress = clamp(32 + riskSignals * 13 + cashSignals * 9 + (scenario.kind === 'event' ? 10 : 0))
  const actionability = clamp(isChoice ? 76 - stress * 0.18 + goalFit * 0.12 : 46 + liquidity * 0.2)
  const score = Math.round(clamp(goalFit * 0.38 + liquidity * 0.28 + actionability * 0.22 + (100 - stress) * 0.12))
  const tone: ScenarioTone = score >= 74 ? 'green' : score >= 62 ? 'blue' : score >= 50 ? 'gold' : 'red'

  return {
    ...scenario,
    slotIndex,
    score,
    liquidity,
    goalFit,
    stress,
    actionability,
    tone,
    forecast: forecastFor(scenario, { cashSignals, riskSignals, goalSignals }),
    strategy: strategyFor(scenario, { score, liquidity, stress }),
    tradeoff: tradeoffFor(scenario, { score, liquidity, stress, goalFit }),
  }
}

function chooseBest(results: ScenarioResult[]) {
  if (!results.length) return null
  return [...results].sort((a, b) => b.score - a.score)[0]
}

function forecastFor(
  scenario: ScenarioDraft,
  signals: { cashSignals: number; riskSignals: number; goalSignals: number },
) {
  if (scenario.kind === 'event') {
    if (signals.riskSignals > signals.cashSignals) {
      return 'Forecast: portfolio value would likely fall before goals change, so the first risk is a reactive decision during volatility.'
    }
    if (signals.cashSignals > 0) {
      return 'Forecast: liquidity becomes the binding constraint, and long-term plan quality depends on avoiding forced selling.'
    }
    return 'Forecast: the event would stress the plan, with the largest impact coming from cash runway, goal timing, and how quickly decisions are made.'
  }
  if (signals.goalSignals > 0) {
    return 'This could improve goal alignment if the timeline and cash buffer remain realistic.'
  }
  if (signals.riskSignals > 0) {
    return 'Expected return may rise, but volatility and panic-selling risk rise with it.'
  }
  return 'This choice can be evaluated, but Northstar needs clear amount, timing, and funding source.'
}

function strategyFor(scenario: ScenarioDraft, metrics: { score: number; liquidity: number; stress: number }) {
  if (scenario.kind === 'event') {
    if (metrics.liquidity < 52) {
      return 'Prepare now: rank funding sources, preserve near-term cash, pause nonessential risk, and define what would trigger action before the event forces a decision.'
    }
    if (metrics.stress > 64) {
      return 'Prepare now: write the response plan before stress hits, protect goal cash, set rebalance thresholds, and delay major allocation changes until the shock is measured.'
    }
    return 'Prepare now: protect goal cash, set a calm review cadence, rebalance only if thresholds are hit, and require confirmation before acting.'
  }
  if (metrics.score >= 70) {
    return 'Worth considering, but only after checking tax impact, cash runway, and whether the move still needs explicit approval.'
  }
  if (metrics.stress > 62) {
    return 'Do not rush it. The emotional and liquidity load is high enough that Northstar would slow the decision down.'
  }
  return 'Keep it as a maybe. Clarify the amount, timing, and tradeoff before making it an approval-ready plan.'
}

function tradeoffFor(
  scenario: ScenarioDraft,
  metrics: { score: number; liquidity: number; stress: number; goalFit: number },
) {
  if (scenario.kind === 'event') {
    if (metrics.liquidity < 55) return 'Prepare for the cash gap first so investments are not sold at the worst moment.'
    if (metrics.stress > 64) return 'Pre-commit the response so stress does not become the decision-maker.'
    return 'Best preparation is a calm playbook: know what to protect, what to watch, and when to act.'
  }
  if (metrics.score >= 70) return 'Best fit because it improves the plan without overwhelming cash flexibility.'
  if (metrics.stress > metrics.goalFit) return 'Falls behind because stress rises faster than goal progress.'
  return 'Useful, but it needs sharper numbers before Northstar can recommend it.'
}

function eventReviewFor(result: ScenarioResult) {
  if (result.liquidity < 55) {
    return `This outside event needs a preparation plan, not a yes-or-no decision. The forecast points to liquidity pressure, so the best response is to protect cash, choose funding sources in advance, and avoid forced selling if ${result.title || 'this event'} happens.`
  }
  if (result.stress > 64) {
    return `This outside event is mainly a stress-management test. The forecast says the plan can absorb more if decisions are pre-committed, so prepare by setting review thresholds, protecting goal cash, and delaying big changes until the shock is measurable.`
  }
  return `This outside event has a clearer response path than the other slots. The forecast is manageable if you prepare in advance: protect goal cash, define what would trigger action, and use the plan instead of reacting in the moment.`
}

function countSignals(text: string, words: string[]) {
  return words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0)
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
