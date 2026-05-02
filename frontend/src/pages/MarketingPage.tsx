import {
  ArrowRight,
  Books,
  CheckCircle,
  Compass,
  Feather,
  Fingerprint,
  Leaf,
  LockKey,
  Mountains,
  Path,
  ShieldCheck,
  Sparkle,
  Stack,
  Target,
  TrendUp,
  WaveSine,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { MarketingNav } from '../components/marketing/MarketingNav'
import type { Screen } from '../types/screens'

type MarketingPageKey = 'how-it-works' | 'beginners' | 'agents' | 'safety' | 'pricing'

type PageConfig = {
  eyebrow: string
  title: string
  intro: string
  primary: string
  secondary: string
  heroIcon: ReactNode
  metrics: Array<{ value: string; label: string }>
  cards: Array<{ icon: ReactNode; title: string; body: string }>
  steps: Array<{ label: string; detail: string }>
  quote: string
}

const pages: Record<MarketingPageKey, PageConfig> = {
  'how-it-works': {
    eyebrow: 'Goal-aware guidance',
    title: 'A calmer loop for every money decision.',
    intro:
      'Northstar turns your goals, accounts, risk comfort, and market context into a clear profile, then uses focused agents to explain the next best move.',
    primary: 'Start the flow',
    secondary: 'View agents',
    heroIcon: <Path size={42} weight="duotone" />,
    metrics: [
      { value: '01', label: 'Map what matters' },
      { value: '02', label: 'Model tradeoffs' },
      { value: '03', label: 'Act with context' },
    ],
    cards: [
      { icon: <Target size={24} />, title: 'Goal memory', body: 'Your plan starts from the life outcomes you care about, not a generic risk quiz.' },
      { icon: <WaveSine size={24} />, title: 'Scenario lens', body: 'Every recommendation is framed through what could happen and what it means for you.' },
      { icon: <CheckCircle size={24} />, title: 'Clear next step', body: 'Northstar separates signal from noise and gives you one practical move at a time.' },
    ],
    steps: [
      { label: 'Conversation', detail: 'Tell Northstar your goals, worries, and timeline in plain language.' },
      { label: 'Profile', detail: 'The system builds a living investor profile from your inputs and account context.' },
      { label: 'Agents', detail: 'Specialized agents check strategy, risk, and behavior before surfacing guidance.' },
    ],
    quote: 'Built to feel less like a dashboard and more like a composed decision room.',
  },
  beginners: {
    eyebrow: 'For beginners',
    title: 'Start investing without pretending to be an expert.',
    intro:
      'Northstar keeps the interface plain, measured, and transparent so new investors can understand the why before they act.',
    primary: 'Build my plan',
    secondary: 'See safety',
    heroIcon: <Leaf size={42} weight="duotone" />,
    metrics: [
      { value: 'Plain', label: 'No jargon walls' },
      { value: 'Guided', label: 'Step-by-step flow' },
      { value: 'Calm', label: 'Behavior-aware help' },
    ],
    cards: [
      { icon: <Books size={24} />, title: 'Simple language', body: 'Key ideas are explained through goals, time, and tradeoffs instead of dense finance terms.' },
      { icon: <Compass size={24} />, title: 'Paced setup', body: 'The onboarding path collects only what matters and shows progress as your profile forms.' },
      { icon: <Feather size={24} />, title: 'Lower pressure', body: 'The experience is designed to slow down reactive decisions and make uncertainty feel manageable.' },
    ],
    steps: [
      { label: 'Set direction', detail: 'Choose what you are investing for and how soon you may need the money.' },
      { label: 'Understand fit', detail: 'See how risk, timeline, and account context shape possible paths.' },
      { label: 'Keep learning', detail: 'Use the agent explanations to build confidence over time.' },
    ],
    quote: 'Beginner-friendly should still feel premium, serious, and respectful.',
  },
  agents: {
    eyebrow: 'Our agents',
    title: 'Specialized checks before guidance reaches you.',
    intro:
      'Northstar uses focused agents for strategy, risk, and behavior so recommendations are reviewed from more than one angle.',
    primary: 'Meet the agents',
    secondary: 'How it works',
    heroIcon: <Stack size={42} weight="duotone" />,
    metrics: [
      { value: 'Strategy', label: 'Plan alignment' },
      { value: 'Risk', label: 'Downside checks' },
      { value: 'Behavior', label: 'Calm follow-through' },
    ],
    cards: [
      { icon: <Mountains size={24} />, title: 'Strategist', body: 'Builds the plan around your goals, cash needs, timeline, and portfolio direction.' },
      { icon: <ShieldCheck size={24} />, title: 'Risk Guardian', body: 'Looks for concentration, downside exposure, and moments where caution matters.' },
      { icon: <Leaf size={24} />, title: 'Behavior Coach', body: 'Helps you avoid panic, overtrading, and decision fatigue when markets move.' },
    ],
    steps: [
      { label: 'Read context', detail: 'Agents work from your current profile and recent conversation context.' },
      { label: 'Cross-check', detail: 'Each agent reviews the decision from its own responsibility area.' },
      { label: 'Explain', detail: 'Northstar turns the checks into one clear recommendation and rationale.' },
    ],
    quote: 'The result should feel considered before it ever asks you to act.',
  },
  safety: {
    eyebrow: 'Safety and control',
    title: 'Transparent guidance with boundaries you can understand.',
    intro:
      'Northstar is designed around user control, clear explanations, and careful handling of sensitive financial context.',
    primary: 'Review safety',
    secondary: 'Start setup',
    heroIcon: <LockKey size={42} weight="duotone" />,
    metrics: [
      { value: 'Control', label: 'You decide' },
      { value: 'Context', label: 'Visible reasoning' },
      { value: 'Care', label: 'Risk-first checks' },
    ],
    cards: [
      { icon: <Fingerprint size={24} />, title: 'Your profile', body: 'Guidance is tied to your goals and comfort level so outputs stay grounded in your reality.' },
      { icon: <ShieldCheck size={24} />, title: 'Risk framing', body: 'Recommendations include downside context and do not hide uncertainty behind false precision.' },
      { icon: <LockKey size={24} />, title: 'Clear boundaries', body: 'Northstar keeps the user in control and treats the interface as guidance, not autopilot.' },
    ],
    steps: [
      { label: 'Explain inputs', detail: 'You can see the profile signals Northstar is using.' },
      { label: 'Show tradeoffs', detail: 'The system frames benefits, risks, and what could change the recommendation.' },
      { label: 'Leave control', detail: 'Actions are presented for review instead of being hidden behind automation.' },
    ],
    quote: 'Premium safety is not loud. It is visible, composed, and easy to question.',
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Simple pricing for a calmer investing system.',
    intro:
      'A focused product should not need a confusing pricing wall. Northstar keeps the decision simple while the product matures.',
    primary: 'Get started',
    secondary: 'Compare plans',
    heroIcon: <TrendUp size={42} weight="duotone" />,
    metrics: [
      { value: 'Core', label: 'Profile and guidance' },
      { value: 'Plus', label: 'Agent reviews' },
      { value: 'Future', label: 'Advanced planning' },
    ],
    cards: [
      { icon: <Compass size={24} />, title: 'Starter', body: 'Build your profile, explore core guidance, and understand the Northstar workflow.' },
      { icon: <Sparkle size={24} />, title: 'Northstar Plus', body: 'Use deeper agent checks, richer scenarios, and ongoing investing context.' },
      { icon: <ShieldCheck size={24} />, title: 'Advisory-ready', body: 'A future tier for households that want more review, reporting, and planning support.' },
    ],
    steps: [
      { label: 'Start simple', detail: 'Begin with the core profile and guided investing workflow.' },
      { label: 'Add depth', detail: 'Unlock more detailed agent review when your decisions become more complex.' },
      { label: 'Stay flexible', detail: 'Plans can evolve as Northstar adds more planning tools.' },
    ],
    quote: 'The price page should feel as clear as the product promise.',
  },
}

export function MarketingPage({
  page,
  setScreen,
  openAuth,
}: {
  page: MarketingPageKey
  setScreen: (screen: Screen) => void
  openAuth?: (mode: 'register' | 'login') => void
}) {
  const config = pages[page]

  return (
    <div className="marketing-page screen-enter">
      <MarketingNav setScreen={setScreen} openAuth={openAuth} />

      <section className="marketing-hero" aria-label={config.eyebrow}>
        <div className="marketing-copy">
          <span className="north-eyebrow">
            <Sparkle size={14} weight="fill" />
            {config.eyebrow}
          </span>
          <h1>{config.title}</h1>
          <p>{config.intro}</p>
          <div className="north-actions">
            <button className="north-primary" type="button" onClick={() => openAuth ? openAuth('register') : setScreen('signin')}>
              {config.primary} <ArrowRight size={22} />
            </button>
            <button className="north-secondary" type="button" onClick={() => setScreen(page === 'agents' ? 'how-it-works' : 'agents')}>
              {config.secondary}
            </button>
          </div>
        </div>

        <div className="marketing-instrument" aria-hidden="true">
          <div className="instrument-orbit">
            <span />
            <span />
            <span />
          </div>
          <div className="instrument-core">{config.heroIcon}</div>
          <div className="instrument-metrics">
            {config.metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-card-grid">
          {config.cards.map((card) => (
            <article className="marketing-card stagger-in" key={card.title}>
              <span className="marketing-card__icon">{card.icon}</span>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-lower">
        <div className="marketing-steps">
          {config.steps.map((step, index) => (
            <article key={step.label}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{step.label}</h3>
                <p>{step.detail}</p>
              </div>
            </article>
          ))}
        </div>
        <aside className="marketing-quote">
          <Sparkle size={26} weight="fill" />
          <p>{config.quote}</p>
        </aside>
      </section>
    </div>
  )
}
