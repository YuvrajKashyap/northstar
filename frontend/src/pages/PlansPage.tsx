import { useEffect, useMemo, useState } from 'react'
import {
  ArrowClockwise,
  CalendarCheck,
  CheckCircle,
  Clock,
  LockKey,
  Target,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react'
import type { Plan, PlanStep, PlanStepTiming } from '@calmvest/shared'
import { AppChrome } from '../components/layout/AppChrome'
import { generatePlan, getPlans, updatePlanStepApproval } from '../lib/api'
import type { ScreenProps } from '../types/screens'

const timingLabels: Record<PlanStepTiming, string> = {
  now: 'Now',
  next_30_days: '30 days',
  next_90_days: '90 days',
  longer_term: 'Later',
}

export function PlansPage(props: ScreenProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activePlan = useMemo(() => plans.find((plan) => plan.status === 'active') ?? plans[0] ?? null, [plans])
  const approvalSteps = activePlan?.steps.filter((step) => step.approvalRequired) ?? []
  const nextMove = useMemo(() => selectNextMoveStep(activePlan), [activePlan])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await getPlans(props.currentUserId)
        if (cancelled) return
        if (response.plans.length) {
          setPlans(response.plans)
          return
        }
        const generated = await generatePlan(props.currentUserId)
        if (!cancelled) setPlans([generated.plan])
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load plans.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [props.currentUserId])

  async function refreshPlan() {
    setSaving(true)
    setError(null)
    try {
      const response = await generatePlan(props.currentUserId)
      setPlans((current) => [response.plan, ...current.filter((plan) => plan.id !== response.plan.id)])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not refresh plan.')
    } finally {
      setSaving(false)
    }
  }

  async function decideStep(step: PlanStep, approvalStatus: 'approved' | 'rejected') {
    if (!activePlan) return
    setSaving(true)
    setError(null)
    try {
      const response = await updatePlanStepApproval(activePlan.id, step.id, props.currentUserId, approvalStatus)
      setPlans((current) => current.map((plan) => (plan.id === response.plan.id ? response.plan : plan)))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update approval.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppChrome
      active="plans"
      setScreen={props.setScreen}
      graph={props.graph}
      agentAnswer={props.agentAnswer}
      scenarioTrace={props.scenarioTrace}
      runAgent={props.runAgent}
      runScenario={props.runScenario}
      busyStep={props.busyStep}
      onSelectMemoryNode={props.setSelectedNodeId}
    >
      <section className="plans-screen screen-enter">
        {error ? (
          <div className="plans-alert" role="alert">
            <WarningCircle size={18} />
            <span>{cleanError(error)}</span>
          </div>
        ) : null}

        <header className="plans-hero">
          <div>
            <span className="plans-kicker">
              <CalendarCheck size={15} weight="fill" />
              Active plan
            </span>
            <h1>{activePlan?.title ?? 'Building your plan'}</h1>
            <p>{activePlan ? 'One roadmap from memory, goals, accounts, and approval rules.' : 'Northstar is reading your saved context.'}</p>
          </div>
          <div className="plans-hero__right">
            <div className="plans-score">
              <strong>{loading ? '--' : activePlan?.score ?? '--'}</strong>
              <span>{loading ? 'Loading' : 'Plan health'}</span>
            </div>
            <button type="button" onClick={refreshPlan} disabled={loading || saving}>
              <ArrowClockwise size={16} className={saving ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {activePlan ? (
          <div className="plans-layout">
            <main className="plans-roadmap" aria-label="Plan roadmap">
              <section className="plans-next-card" aria-label="Your next best move">
                <div>
                  <span className="plans-kicker">One clear move</span>
                  <h2>{nextMove?.title ?? 'Protect near-term goal money before chasing more growth.'}</h2>
                  <p>
                    {nextMove?.description ??
                      'Review a plan to reduce short-term risk for the money tied to your most time-sensitive goal.'}
                  </p>
                  <small>
                    {nextMove?.rationale ??
                      'Near-term goals have less time to recover from market drops. Long-term money can usually stay growth-oriented.'}
                  </small>
                </div>
              </section>

              <section className="plans-facts" aria-label="Plan facts">
                <PlanFact icon={Target} label="Goal" value={activePlan.content.primaryGoal} />
                <PlanFact icon={Clock} label="Horizon" value={activePlan.horizon} />
              </section>

              <section className="plans-roadmap-card">
                <div className="plans-section-head">
                  <span className="plans-kicker">Roadmap</span>
                  <strong>Only what matters next</strong>
                </div>
                <div className="plans-step-list">
                  {activePlan.steps.map((step) => (
                    <PlanStepRow step={step} onDecision={decideStep} saving={saving} key={step.id} />
                  ))}
                </div>
              </section>
            </main>

            <aside className="plans-context" aria-label="Plan context">
              <section>
                <div className="plans-section-head">
                  <span className="plans-kicker">Approvals</span>
                  <strong>{approvalCopy(approvalSteps)}</strong>
                </div>
                <div className="plans-approval-list">
                  {approvalSteps.length ? (
                    approvalSteps.map((step) => (
                      <div className="plans-approval-item" key={step.id}>
                        <LockKey size={16} />
                        <span>{step.title}</span>
                        <em>{approvalStatusText(step)}</em>
                      </div>
                    ))
                  ) : (
                    <p>No gated action is waiting.</p>
                  )}
                </div>
              </section>

              <section>
                <div className="plans-section-head">
                  <span className="plans-kicker">Why</span>
                  <strong>Plan basis</strong>
                </div>
                <div className="plans-basis">
                  <Confidence label="Liquidity" value={activePlan.confidence.liquidityMath} />
                  <Confidence label="Goal pace" value={activePlan.confidence.goalPace} />
                  <Confidence label="Tax" value={activePlan.confidence.taxSpecificity} />
                </div>
                <p className="plans-context-line">
                  Memory {activePlan.sourceMetadata.memoryUpdatedAt ? 'committed' : 'missing'} / {activePlan.sourceMetadata.accounts} accounts /{' '}
                  {activePlan.sourceMetadata.holdings} holdings
                </p>
              </section>
            </aside>
          </div>
        ) : (
          <section className="plans-empty">
            <Clock size={28} />
            <strong>{loading ? 'Loading plan context...' : 'No plan yet'}</strong>
            <p>{loading ? 'Checking Supabase for the active plan.' : 'Refresh after memory is committed.'}</p>
          </section>
        )}
      </section>
    </AppChrome>
  )
}

function PlanFact({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="plans-fact">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function selectNextMoveStep(plan: Plan | null) {
  if (!plan?.steps.length) return null
  return [...plan.steps].sort((a, b) => scoreStep(b) - scoreStep(a))[0]
}

function scoreStep(step: PlanStep) {
  let score = 0
  if (step.timing === 'now') score += 40
  if (step.timing === 'next_30_days') score += 26
  if (step.approvalRequired) score += 12
  score += step.impact.goalFit + step.impact.liquidity + step.impact.riskReduction + step.impact.taxAwareness
  return score
}

function PlanStepRow({
  step,
  saving,
  onDecision,
}: {
  step: PlanStep
  saving: boolean
  onDecision: (step: PlanStep, approvalStatus: 'approved' | 'rejected') => void
}) {
  return (
    <article className="plans-step-row">
      <div className="plans-step-row__time">
        <span>{timingLabels[step.timing]}</span>
      </div>
      <div className="plans-step-row__main">
        <div>
          <strong>{step.title}</strong>
          <p>{step.description}</p>
        </div>
        <small>{step.rationale}</small>
      </div>
      <div className="plans-step-row__status">
        <em className={`plans-status plans-status--${step.approvalStatus}`}>{approvalStatusText(step)}</em>
        {step.approvalRequired && step.approvalStatus === 'approval_required' ? (
          <div>
            <button type="button" onClick={() => onDecision(step, 'approved')} disabled={saving}>
              <CheckCircle size={15} />
              Approve
            </button>
            <button type="button" onClick={() => onDecision(step, 'rejected')} disabled={saving}>
              <XCircle size={15} />
              Reject
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function Confidence({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={`confidence-${value}`}>{value}</strong>
    </div>
  )
}

function approvalCopy(steps: PlanStep[]) {
  const pending = steps.filter((step) => step.approvalStatus === 'approval_required').length
  if (!steps.length) return 'No gated steps'
  if (!pending) return 'Decided'
  return `${pending} pending`
}

function approvalStatusText(step: PlanStep) {
  if (!step.approvalRequired) return 'Guidance'
  if (step.approvalStatus === 'approved') return 'Approved'
  if (step.approvalStatus === 'rejected') return 'Rejected'
  return 'Approval needed'
}

function cleanError(error: string) {
  try {
    const parsed = JSON.parse(error) as { error?: string; message?: string }
    return parsed.error ?? parsed.message ?? error
  } catch {
    return error
  }
}
