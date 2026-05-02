import {
  Briefcase,
  CalendarCheck,
  CirclesThreePlus,
  Flag,
  Graph,
  House,
  Pulse,
  ShieldCheck,
  Target,
  TreeEvergreen,
  Wallet,
} from '@phosphor-icons/react'
import type { OnboardingAnswers } from '@calmvest/shared'
import type { OnboardingStep, Screen } from '../types/screens'

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
  { screen: 'profile', label: 'Agents', icon: Graph },
  { screen: 'goals', label: 'Goals', icon: Target },
  { screen: 'memory', label: 'Plans', icon: CalendarCheck },
  { screen: 'profile', label: 'Scenarios', icon: Briefcase },
  { screen: 'memory', label: 'Insights', icon: Pulse },
  { screen: 'profile', label: 'Vault', icon: Wallet },
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
  {
    agent: 'Communication Agent',
    title: 'Drafted portfolio update',
    detail: 'Used Communication Style, Recent Activity',
    tag: 'Ready to review',
    tone: 'blue',
    time: '1h ago',
  },
]

export const goalRows = [
  {
    title: 'Home Down Payment',
    subtitle: 'Buy my first home in the Bay Area',
    icon: House,
    target: '$120,000',
    date: 'Jun 2027',
    saved: '$57,600 saved',
    progress: 48,
    confidence: 'High Confidence',
    tone: 'green',
  },
  {
    title: 'Emergency Fund',
    subtitle: '6 months of expenses for peace of mind',
    icon: ShieldCheck,
    target: '$30,000',
    date: 'Dec 2025',
    saved: '$21,600 saved',
    progress: 72,
    confidence: 'Very High Confidence',
    tone: 'green',
  },
  {
    title: 'Retirement',
    subtitle: 'Retire comfortably and on my terms',
    icon: TreeEvergreen,
    target: '$1,500,000',
    date: 'May 2055',
    saved: '$240,000 saved',
    progress: 16,
    confidence: 'Medium Confidence',
    tone: 'gold',
  },
  {
    title: 'Travel Fund',
    subtitle: 'Explore the world with family',
    icon: Flag,
    target: '$25,000',
    date: 'Aug 2026',
    saved: '$8,000 saved',
    progress: 32,
    confidence: 'Low Confidence',
    tone: 'violet',
  },
]

export function goalHelper(goal: string) {
  const helpers: Record<string, string> = {
    'Build wealth': 'Grow my money over time',
    'Retire comfortably': 'Save for a comfortable retirement',
    'Buy a home': 'Save for a down payment',
    'Financial independence': 'Work optional, live on my terms',
    Education: 'Save for myself or a loved one',
    Other: 'Something else',
  }
  return helpers[goal] ?? 'Personalized goal'
}

export function onboardingTitle(step: OnboardingStep['id']) {
  const titles: Record<string, string> = {
    goal: "What's your primary financial goal right now?",
    targetDate: 'When might you need this money?',
    withdrawalNeed: 'Could you need liquidity next year?',
    drawdownFeeling: 'How would a sharp drop feel?',
    targetAmount: 'What target should agents plan around?',
    taxableAccount: 'Are these taxable accounts?',
    communicationStyle: 'How should agents explain tradeoffs?',
    review: 'Review and commit your memory.',
  }
  return titles[step]
}

export function onboardingCopy(step: OnboardingStep['id']) {
  const copy: Record<string, string> = {
    goal: 'We use this to prioritize recommendations that move you closer to what matters.',
    targetDate: 'The timeline controls how much risk is reasonable.',
    withdrawalNeed: 'Near-term cash needs should be protected before growth bets.',
    drawdownFeeling: 'Your emotional comfort matters because plans must be usable.',
    targetAmount: 'A concrete target gives the Goal Agent a useful benchmark.',
    taxableAccount: 'Knowing the account type helps the Tax Agent avoid sloppy moves.',
    communicationStyle: 'The Communication Agent will match your preferred level of detail.',
    review: 'This writes a human-readable memory and machine-readable context packet.',
  }
  return copy[step]
}
