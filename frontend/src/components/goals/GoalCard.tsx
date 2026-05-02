import { ArrowRight, TrendUp } from '@phosphor-icons/react'
import { IconTile } from '../common/IconTile'

export type GoalCardModel = {
  title: string
  subtitle: string
  icon: typeof TrendUp
  target: string
  date: string
  currentLabel: string
  progress: number
  confidence: string
  tone: 'green' | 'gold' | 'violet' | 'blue'
  rawTargetAmount: number
}

export function GoalCard({ goal }: { goal: GoalCardModel }) {
  const Icon = goal.icon
  return (
    <article className={`goal-card goal-card--${goal.tone}`}>
      <div className="goal-card__glow" aria-hidden="true" />
      <IconTile tone={goal.tone}><Icon weight="duotone" /></IconTile>
      <div className="goal-main-copy">
        <span className="goal-kicker">Memory goal</span>
        <h3>{goal.title}</h3>
        <p>{goal.subtitle}</p>
        <div className="goal-meta">
          <div><span>Target Amount</span><strong>{goal.target}</strong></div>
          <div><span>Target Date</span><strong>{goal.date}</strong></div>
        </div>
      </div>
      <div className="goal-progress">
        <span>Progress</span>
        <strong>{goal.progress}%</strong>
        <small>{goal.currentLabel}</small>
        <div className="progress-track"><i style={{ width: `${goal.progress}%` }} /></div>
        <div className="progress-axis"><em>Now</em><em>Target</em></div>
      </div>
      <div className={`confidence ${goal.tone}`}>
        <TrendUp size={20} weight="duotone" />
        <strong>{goal.confidence}</strong>
        <span>Agent ready</span>
      </div>
      <button className="goal-card__open" type="button" aria-label={`Open ${goal.title}`}>
        <ArrowRight size={18} />
      </button>
    </article>
  )
}
