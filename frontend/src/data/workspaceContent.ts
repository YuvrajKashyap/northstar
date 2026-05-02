import {
  Briefcase,
  CalendarCheck,
  CirclesThreePlus,
  Graph,
  HouseLine,
  Pulse,
  Target,
} from '@phosphor-icons/react'
import type { OnboardingAnswers } from '@calmvest/shared'
import type { Screen } from '../types/screens'

export const userId = 'maya-patel-demo'

export const defaultAnswers: OnboardingAnswers = {
  userId,
  goal: 'Retire comfortably',
  targetAmount: 80000,
  targetDate: '2029-05',
  withdrawalNeed: 'May need to withdraw 20% next year',
  drawdownFeeling: 'Very worried at a 20% drop',
  taxableAccount: true,
  communicationStyle: 'Plain English with clear next steps',
  values: 'Avoid complexity. Explain tradeoffs before any action.',
}

export const navItems: Array<{ screen: Screen; label: string; icon: typeof CirclesThreePlus }> = [
  { screen: 'dashboard', label: 'Home', icon: HouseLine },
  { screen: 'north', label: 'North', icon: CirclesThreePlus },
  { screen: 'agent-runs', label: 'Context', icon: Graph },
  { screen: 'goals', label: 'Goals', icon: Target },
  { screen: 'plans', label: 'Plans', icon: CalendarCheck },
  { screen: 'scenarios', label: 'Scenarios', icon: Briefcase },
  { screen: 'insights', label: 'Insights', icon: Pulse },
]

export const agentCards = [
  {
    agent: 'North',
    title: 'Updated goal plan',
    detail: 'Used memory.md, goals, accounts, and cash flow tools',
    tag: 'Plan updated',
    tone: 'green',
    time: '2m ago',
  },
  {
    agent: 'North',
    title: 'Stress tested portfolio',
    detail: 'Used risk comfort, market data, and scenario tools',
    tag: '3 scenarios run',
    tone: 'violet',
    time: '8m ago',
  },
  {
    agent: 'North',
    title: 'Found tax-smart move',
    detail: 'Used tax profile, account data, and cost-basis tools',
    tag: '$2,430 est. saved',
    tone: 'gold',
    time: '15m ago',
  },
  {
    agent: 'North',
    title: 'Drafted portfolio update',
    detail: 'Used communication style and recent activity',
    tag: 'Ready to review',
    tone: 'blue',
    time: '1h ago',
  },
]

