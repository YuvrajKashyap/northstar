import { TrendUp } from '@phosphor-icons/react'
import { goalRows } from '../../data/demoContent'
import { IconTile } from '../common/IconTile'

export function GoalCard({ goal }: { goal: (typeof goalRows)[number] }) {
  const Icon = goal.icon
  return (
    <article className="goal-card">
      <IconTile tone={goal.tone}><Icon /></IconTile>
      <div className="goal-main-copy">
        <h3>{goal.title}</h3>
        <p>{goal.subtitle}</p>
        <div><span>Target Amount</span><strong>{goal.target}</strong></div>
        <div><span>Target Date</span><strong>{goal.date}</strong></div>
      </div>
      <div className="goal-progress">
        <span>Progress</span>
        <strong>{goal.progress}%</strong>
        <small>{goal.saved}</small>
        <div className="progress-track"><i style={{ width: `${goal.progress}%` }} /></div>
      </div>
      <div className={`confidence ${goal.tone}`}>
        <TrendUp size={20} />
        <strong>{goal.confidence}</strong>
        <span>Agents Connected</span>
      </div>
    </article>
  )
}
