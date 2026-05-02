import {
  Briefcase,
  CalendarCheck,
  CirclesThreePlus,
  Graph,
  Pulse,
  Target,
  Wallet,
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
  { screen: 'dashboard', label: 'Memory Graph', icon: CirclesThreePlus },
  { screen: 'agent-runs', label: 'Agents', icon: Graph },
  { screen: 'goals', label: 'Goals', icon: Target },
  { screen: 'plans', label: 'Plans', icon: CalendarCheck },
  { screen: 'scenarios', label: 'Scenarios', icon: Briefcase },
  { screen: 'insights', label: 'Insights', icon: Pulse },
  { screen: 'vault', label: 'Vault', icon: Wallet },
]

export const agentCards = [
  {
    agent: 'Goal Agent',
    title: 'Updated retirement plan',
    detail: 'Used Goals, Accounts, Cash Flow Pattern',
    tag: 'Plan updated',
    tone: 'green',
    time: '2m ago',
  },
  {
    agent: 'Scenario Agent',
    title: 'Stress tested portfolio',
    detail: 'Used Risk Comfort, Market Data, Goals',
    tag: '3 scenarios run',
    tone: 'violet',
    time: '8m ago',
  },
  {
    agent: 'Tax Agent',
    title: 'Found tax-smart move',
    detail: 'Used Tax Profile, Accounts, Cash Flow',
    tag: '$2,430 est. saved',
    tone: 'gold',
    time: '15m ago',
  },
  {
    agent: 'Communication Agent',
    title: 'Drafted portfolio update',
    detail: 'Used Communication Style, Recent Activity',
    tag: 'Ready to review',
    tone: 'blue',
    time: '1h ago',
  },
]

