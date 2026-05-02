import {
  ArrowRight,
  ArrowUp,
  CheckCircle,
  Clock,
  Flag,
  Heart,
  Leaf,
  Mountains,
  PlayCircle,
  Pulse,
  ShieldCheck,
  StarFour,
  Target,
  TrendUp,
} from '@phosphor-icons/react'
import type { MemoryGraph } from '@calmvest/shared'
import { MarketingNav } from '../components/marketing/MarketingNav'
import landingBackground from '../assets/northstar-landing-bg.png'
import northstarLogo from '../assets/northstar-logo.svg'
import type { Screen } from '../types/screens'

const memoryItems = [
  {
    icon: <Heart size={24} weight="regular" />,
    label: 'What matters',
    text: 'Financial freedom, family, and peace of mind',
  },
  {
    icon: <Clock size={24} weight="regular" />,
    label: 'Time horizon',
    text: 'Long term (10+ years)',
  },
  {
    icon: <Pulse size={24} weight="regular" />,
    label: 'Risk comfort',
    text: 'Moderate',
    meter: true,
  },
  {
    icon: <Target size={24} weight="regular" />,
    label: 'Current focus',
    text: 'Grow wealth steadily, avoid stress',
  },
]

const agents = [
  {
    icon: <Mountains size={24} weight="regular" />,
    title: 'Strategist',
    text: 'Builds and rebalances your portfolio',
  },
  {
    icon: <ShieldCheck size={24} weight="regular" />,
    title: 'Risk Guardian',
    text: 'Monitors risk and keeps you on track',
  },
  {
    icon: <Leaf size={24} weight="regular" />,
    title: 'Behavior Coach',
    text: 'Helps you stay calm and consistent',
  },
]

export function LandingPage({
  setScreen,
  openAuth,
}: {
  setScreen?: (screen: Screen) => void
  openAuth?: (mode: 'register' | 'login') => void
  graph?: MemoryGraph | null
}) {
  return (
    <div className="landing-page screen-enter">
      <section className="landing-hero" aria-label="Northstar landing page">
        <img
          className="landing-hero__image"
          src={landingBackground}
          alt=""
          aria-hidden="true"
        />
        <div className="landing-hero__wash" aria-hidden="true" />

        <MarketingNav setScreen={setScreen} openAuth={openAuth} />

        <div className="north-hero-grid">
          <div className="north-copy">
            <div className="north-eyebrow">
              <StarFour size={14} weight="fill" />
              Goal-aware. Transparent. In your control.
            </div>

            <h1>
              A <em>calm</em> operating
              <span>system for money.</span>
            </h1>

            <p>
              Northstar helps everyday investors make clear, goal-aware decisions,
              showing what could happen, what it means for you, and what to do next.
            </p>

            <div className="north-actions">
              <button className="north-primary" type="button" onClick={() => openAuth?.('register') ?? setScreen?.('signin')}>
                Build my plan <ArrowRight size={22} />
              </button>
              <button className="north-secondary" type="button" onClick={() => setScreen?.('dashboard')}>
                See how it works <PlayCircle size={22} />
              </button>
            </div>

            <div className="north-proof" aria-label="Northstar planning flow">
              <div className="north-proof__step">
                <span className="north-proof__icon" aria-hidden="true">
                  <Flag size={25} weight="regular" />
                </span>
                <span>
                  <strong>Goal captured</strong>
                  <small>House in 3 years</small>
                </span>
              </div>
              <span className="north-proof__connector" aria-hidden="true" />
              <div className="north-proof__step">
                <span className="north-proof__icon" aria-hidden="true">
                  <TrendUp size={25} weight="regular" />
                </span>
                <span>
                  <strong>Scenario tested</strong>
                  <small>Market drop + cash need</small>
                </span>
              </div>
              <span className="north-proof__connector" aria-hidden="true" />
              <div className="north-proof__step">
                <span className="north-proof__icon" aria-hidden="true">
                  <CheckCircle size={25} weight="regular" />
                </span>
                <span>
                  <strong>You approve</strong>
                  <small>No auto-trades</small>
                </span>
              </div>
            </div>
          </div>

          <div className="north-product" aria-label="Northstar product preview">
            <div className="north-product__top">
              <article className="memory-panel">
                <header>
                  <img className="north-logo-mark north-logo-mark--panel" src={northstarLogo} alt="" aria-hidden="true" />
                  <div>
                    <strong>Your Memory Profile</strong>
                    <span>Built from our conversation</span>
                  </div>
                </header>
                <div className="memory-list">
                  {memoryItems.map((item) => (
                    <div className="memory-row" key={item.label}>
                      <span className="memory-icon">{item.icon}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.text}</span>
                        {item.meter ? <span className="risk-meter" aria-hidden="true" /> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <div className="north-chat-column">
                <article className="chat-bubble chat-bubble--user">
                  <span>You</span>
                  <p>I want to invest for the long term, but I get anxious with market ups and downs.</p>
                  <time>11:24 AM</time>
                </article>

                <article className="chat-bubble chat-bubble--northstar">
                  <span><img className="north-logo-mark north-logo-mark--inline" src={northstarLogo} alt="" aria-hidden="true" /> Northstar</span>
                  <p>Understood. I&apos;ll focus on steady growth with managed risk and keep you informed without the noise.</p>
                  <time>11:24 AM</time>
                  <span className="north-sparkle" aria-hidden="true">
                    <StarFour size={28} weight="fill" />
                  </span>
                </article>
              </div>
            </div>

            <article className="agents-panel">
              <h2>Your investing agents</h2>
              <div className="agent-list">
                {agents.map((agent) => (
                  <div className="north-agent-card" key={agent.title}>
                    <span className="agent-icon">{agent.icon}</span>
                    <div>
                      <strong>{agent.title}</strong>
                      <span>{agent.text}</span>
                      <small><StarFour size={12} weight="fill" /> Active</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <div className="goal-input" aria-label="Example goal prompt">
              <span>Ask anything or tell me your goal...</span>
              <button type="button" aria-label="Decorative prompt arrow" tabIndex={-1}>
                <ArrowUp size={22} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
