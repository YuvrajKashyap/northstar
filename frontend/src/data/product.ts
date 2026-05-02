import type { MemoryGraphNode, OnboardingAnswers } from '@calmvest/shared'
import type { OnboardingStep, Screen } from '../types/product'

export const demoUserId = 'maya-patel-demo'

export const defaultAnswers: OnboardingAnswers = {
  userId: demoUserId,
  goal: 'Retire comfortably',
  targetAmount: 80000,
  targetDate: '2029-05',
  withdrawalNeed: 'May need to withdraw 20% next year',
  drawdownFeeling: 'Very worried at a 20% drop',
  taxableAccount: true,
  communicationStyle: 'Plain English with clear next steps',
  values: 'Avoid complexity. Explain tradeoffs before any action.',
}

export const navItems: Array<{ screen: Screen; label: string; icon: 'graph' | 'agents' | 'goals' | 'plans' | 'scenarios' | 'insights' | 'vault' }> = [
  { screen: 'dashboard', label: 'Memory Graph', icon: 'graph' },
  { screen: 'profile', label: 'Agents', icon: 'agents' },
  { screen: 'goals', label: 'Goals', icon: 'goals' },
  { screen: 'memory', label: 'Plans', icon: 'plans' },
  { screen: 'profile', label: 'Scenarios', icon: 'scenarios' },
  { screen: 'memory', label: 'Insights', icon: 'insights' },
  { screen: 'profile', label: 'Vault', icon: 'vault' },
]

export const onboardingSteps: OnboardingStep[] = [
  { id: 'goal', label: 'Goal Type', helper: 'What matters most' },
  { id: 'targetDate', label: 'Time Horizon', helper: 'When you need it' },
  { id: 'withdrawalNeed', label: 'Liquidity Needs', helper: 'Next year withdrawals' },
  { id: 'drawdownFeeling', label: 'Risk Comfort', helper: 'Handling market drops' },
  { id: 'targetAmount', label: 'Income Stability', helper: 'How steady is income' },
  { id: 'taxableAccount', label: 'Taxable Account', helper: "Where we're investing" },
  { id: 'communicationStyle', label: 'Explanation Style', helper: 'How you like insights' },
  { id: 'review', label: 'Review & Confirm', helper: 'Review your profile' },
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
] as const

export const goalCards = [
  {
    title: 'Retire comfortably',
    target: '$80,000 / year',
    date: 'May 2029',
    confidence: '82%',
    status: 'On track',
    progress: 68,
    note: 'Main drag is concentrated tech exposure during drawdowns.',
  },
  {
    title: 'Home upgrade fund',
    target: '$42,500',
    date: 'Nov 2027',
    confidence: '64%',
    status: 'Needs cash plan',
    progress: 41,
    note: 'Agent recommends moving irregular bonuses into a protected bucket.',
  },
  {
    title: 'Annual travel',
    target: '$12,000',
    date: 'Every year',
    confidence: '91%',
    status: 'Protected',
    progress: 88,
    note: 'Current cash reserve covers the next two planned trips.',
  },
]

export const fallbackNodes: MemoryGraphNode[] = [
  {
    id: 'user',
    label: 'Maya Patel',
    kind: 'person',
    value: 'New investor, wants calm guidance.',
    source: 'Demo seed',
    usedBy: ['Orchestrator', 'Communication Agent'],
  },
  {
    id: 'goals',
    label: 'Goals',
    kind: 'goal',
    value: 'Retire comfortably with stable annual income.',
    source: 'Onboarding',
    usedBy: ['Goal Agent', 'Scenario Agent'],
  },
  {
    id: 'risk',
    label: 'Risk Comfort',
    kind: 'risk',
    value: 'Very worried at a 20% drop.',
    source: 'Onboarding',
    usedBy: ['Scenario Agent'],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    kind: 'account',
    value: '$184,250 across brokerage and cash.',
    source: 'Simulated Plaid',
    usedBy: ['Tax Agent', 'Rebalance Agent'],
  },
]
