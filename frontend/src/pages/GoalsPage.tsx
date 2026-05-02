import { ArrowRight, Plus } from '@phosphor-icons/react'
import { agentCards, goalRows } from '../data/workspaceContent'
import type { ScreenProps } from '../types/screens'
import { AgentUsageCard } from '../components/dashboard/AgentCards'
import { AppChrome } from '../components/layout/AppChrome'
import { AppPageHeader } from '../components/layout/AppPageHeader'
import { GoalCard } from '../components/goals/GoalCard'

export function GoalsPage(props: ScreenProps) {
  return (
    <AppChrome active="goals" setScreen={props.setScreen} graph={props.graph}>
      <section className="goals-screen screen-enter">
        <AppPageHeader title="Goals" subtitle="Your life goals, supported by intelligent agents and real progress." />
        <div className="goals-layout">
          <article className="goals-main">
            <div className="filter-row">
              {['All Goals', 'Active 4', 'Completed 1', 'On Track 3', 'At Risk 1'].map((item, index) => (
                <button className={index === 0 ? 'active' : ''} type="button" key={item}>{item}</button>
              ))}
              <button className="primary-action" type="button"><Plus size={18} /> Add Goal</button>
            </div>
            <div className="priority-row">
              <span>Goal Priority</span>
              <strong>High 2</strong>
              <strong>Medium 1</strong>
              <strong>Low 1</strong>
            </div>
            <div className="goal-list">
              {goalRows.map((goal) => <GoalCard goal={goal} key={goal.title} />)}
              <button className="add-goal-card" type="button"><Plus size={20} /> Add a New Goal</button>
            </div>
          </article>
          <aside className="goals-side">
            <div className="confidence-card">
              <h3>Goal Confidence Overview</h3>
              <div className="donut"><span>4</span><small>Total Goals</small></div>
              <button type="button">View Insights <ArrowRight size={16} /></button>
            </div>
            <div className="impact-card">
              <h3>Recent Agent Impact</h3>
              {agentCards.map((card) => <AgentUsageCard card={card} key={card.agent} />)}
            </div>
          </aside>
        </div>
      </section>
    </AppChrome>
  )
}
