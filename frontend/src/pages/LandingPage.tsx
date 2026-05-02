import {
  ArrowRight,
  ArrowUp,
  CaretDown,
  Clock,
  Compass,
  Heart,
  Leaf,
  Mountains,
  PlayCircle,
  Pulse,
  ShieldCheck,
  Star,
  StarFour,
  Target,
} from '@phosphor-icons/react'
import landingBackground from '../assets/northstar-landing-bg.png'

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

export function LandingPage() {
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

        <nav className="north-nav" aria-label="Primary navigation">
          <button className="north-brand" type="button">
            <Compass size={38} weight="thin" />
            <span>Northstar</span>
          </button>

          <div className="north-nav__links">
            {['How it works', 'For beginners', 'Our agents', 'Safety', 'Pricing'].map((item) => (
              <button type="button" key={item}>{item}</button>
            ))}
            <button type="button">
              Learn <CaretDown size={14} />
            </button>
          </div>

          <div className="north-nav__actions">
            <button type="button">Log in</button>
            <button className="north-nav__cta" type="button">
              Get started
            </button>
          </div>
        </nav>

        <div className="north-hero-grid">
          <div className="north-copy">
            <div className="north-eyebrow">
              <StarFour size={14} weight="fill" />
              AI-powered. Human-forward.
            </div>

            <h1>
              A <em>calm</em> operating
              <span>system for money.</span>
            </h1>

            <p>
              Northstar is your AI investing partner that remembers what matters
              to you—and acts on it with discipline, clarity, and care.
            </p>

            <div className="north-actions">
              <button className="north-primary" type="button">
                Build my plan <ArrowRight size={22} />
              </button>
              <button className="north-secondary" type="button">
                See how it works <PlayCircle size={22} />
              </button>
            </div>

            <div className="north-proof" aria-label="Investor rating">
              <div className="north-avatars" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="north-stars" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star size={15} weight="fill" key={index} />
                ))}
              </div>
              <span>4.9 from 1,200+ new investors</span>
            </div>
          </div>

          <div className="north-product" aria-label="Northstar product preview">
            <div className="north-product__top">
              <article className="memory-panel">
                <header>
                  <Compass size={30} weight="thin" />
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
                  <span><Compass size={22} weight="thin" /> Northstar</span>
                  <p>Understood. I&apos;ll focus on steady growth with managed risk and keep you informed—without the noise.</p>
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

            <form className="goal-input" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="goal">Ask anything or tell me your goal...</label>
              <input id="goal" aria-label="Ask anything or tell me your goal" />
              <button type="submit" aria-label="Submit goal">
                <ArrowUp size={22} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
