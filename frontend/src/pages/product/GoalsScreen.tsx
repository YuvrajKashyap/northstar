import { ArrowRight, Plus, Target, TrendUp } from '@phosphor-icons/react'
import { IconTile } from '../../components/product/IconTile'
import { PageHeader } from '../../components/product/PageHeader'
import { goalCards } from '../../data/product'
import type { ProductScreenProps } from '../../types/product'

export function GoalsScreen({ setScreen }: ProductScreenProps) {
  return (
    <>
      <PageHeader title="Goals" subtitle="Scenario confidence, milestones, and memory-aware recommendations.">
        <button className="primary-action" type="button" onClick={() => setScreen('onboarding')}>
          <Plus size={18} /> Add goal
        </button>
      </PageHeader>
      <section className="goals-layout">
        <div className="goals-main">
          <div className="filter-row">
            <button className="active" type="button">Active</button>
            <button type="button">Needs review</button>
            <button type="button">Archived</button>
          </div>
          <div className="goal-list">
            {goalCards.map((goal, index) => (
              <article className="goal-card" key={goal.title}>
                <IconTile tone={index === 0 ? 'green' : index === 1 ? 'gold' : 'blue'}>
                  <Target size={25} />
                </IconTile>
                <div className="goal-main-copy">
                  <h3>{goal.title}</h3>
                  <p>{goal.note}</p>
                </div>
                <div className="goal-meta">
                  <div>
                    <span>Target</span>
                    <strong>{goal.target}</strong>
                  </div>
                  <div>
                    <span>Date</span>
                    <strong>{goal.date}</strong>
                  </div>
                </div>
                <div className="goal-progress">
                  <span>{goal.status}</span>
                  <div className="progress-track">
                    <i style={{ width: `${goal.progress}%` }} />
                  </div>
                  <div className="progress-axis">
                    <small>0</small>
                    <small>{goal.confidence}</small>
                  </div>
                </div>
                <ArrowRight size={20} />
              </article>
            ))}
          </div>
        </div>
        <aside className="goals-side">
          <div className="confidence-card">
            <h3>Goal confidence</h3>
            <div className="donut">
              <div className="donut-ring">
                <strong>78</strong>
                <span>score</span>
              </div>
              <div className="legend-stack">
                <span><i /> On track</span>
                <span><i className="gold" /> Watch</span>
                <span><i className="violet" /> Needs plan</span>
              </div>
            </div>
          </div>
          <div className="impact-card">
            <h3>Recommended moves</h3>
            {[
              'Reduce top-three concentration by 7.4%',
              'Protect next-year withdrawal bucket',
              'Rebalance taxable account first',
            ].map((text) => (
              <div className="impact-row" key={text}>
                <TrendUp size={20} />
                <div>
                  <h4>{text}</h4>
                  <p>Generated from current memory profile.</p>
                </div>
                <strong>High</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  )
}
