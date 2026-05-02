import { Fragment } from 'react'
import {
  ArrowRight,
  CheckCircle,
  CirclesThreePlus,
  Graph,
  Heart,
  PlayCircle,
  ShieldCheck,
  Star,
  TrendUp,
  Wallet,
  XLogo,
  LinkedinLogo,
} from '@phosphor-icons/react'
import type { MemoryGraph } from '@calmvest/shared'
import type { Screen } from '../types/screens'
import { AgentRail } from '../components/dashboard/AgentRail'
import { IconTile } from '../components/common/IconTile'
import { LandingNav } from '../components/layout/LandingNav'
import { MiniGraph } from '../components/dashboard/MiniGraph'
import { MiniOsHeader } from '../components/layout/MiniOsHeader'
import { Logo } from '../components/brand/Logo'

const features = [
  {
    icon: <CirclesThreePlus size={26} />,
    title: 'Memory Graph',
    text: 'A living map of your money and life. Agents use your context to deliver personalized guidance.',
    tone: '',
  },
  {
    icon: <Graph size={26} />,
    title: 'Scenario Canvas',
    text: "Explore 'what if' with guided simulations that stress test your plan before you act.",
    tone: 'violet',
  },
  {
    icon: <Wallet size={26} />,
    title: 'Decision Inbox',
    text: 'Clear recommendations, trade-offs, and next steps—so you always know what to do and why.',
    tone: 'gold',
  },
  {
    icon: <ShieldCheck size={26} />,
    title: 'Trust Receipts',
    text: 'Every suggestion comes with a plain-language explanation and source receipts.',
    tone: 'blue',
  },
]

const steps = [
  {
    icon: <Heart size={22} />,
    title: 'We get to know you',
    text: 'Securely connect your accounts and answer a few simple questions. We build your context.',
  },
  {
    icon: <CirclesThreePlus size={22} />,
    title: 'Agents do the work',
    text: 'Specialized agents analyze your context, run scenarios, and surface the best options.',
  },
  {
    icon: <CheckCircle size={22} />,
    title: 'You decide with confidence',
    text: 'Review clear guidance and take action—on your terms, in your time.',
  },
]

const stats = [
  { icon: <Star size={16} weight="fill" />, value: '4.9/5', label: 'Average rating from early users' },
  { icon: <CheckCircle size={16} />, value: '90%', label: 'Say they feel more confident about their money' },
  { icon: <TrendUp size={16} />, value: '10M+', label: 'Life decisions mapped and analyzed securely' },
]

export function LandingPage({ setScreen, graph }: { setScreen: (screen: Screen) => void; graph: MemoryGraph | null }) {
  return (
    <section className="landing screen-enter">
      <LandingNav setScreen={setScreen} />

      {/* ── Hero ── */}
      <div className="landing-hero">
        <div className="landing-copy">
          <div className="soft-pill"><span />Agent-first wealth guidance</div>
          <h1>
            Your money,<br />
            handled with <span>context.</span>
          </h1>
          <p>
            CalmVest Agent OS uses specialized AI agents and your life context to give you clear
            guidance, so you can make confident money decisions—starting today.
          </p>
          <div className="button-row">
            <button className="primary-action" type="button" onClick={() => setScreen('onboarding')}>
              Get started <ArrowRight size={19} />
            </button>
            <button className="ghost-action" type="button" onClick={() => setScreen('dashboard')}>
              <PlayCircle size={19} /> See how it works
            </button>
          </div>
          <div className="promise-row">
            {[
              { icon: <CheckCircle size={16} />, title: 'Built for beginners', sub: 'No jargon. Just clarity.' },
              { icon: <ShieldCheck size={16} />, title: 'Private by design', sub: 'Your data stays yours.' },
              { icon: <CirclesThreePlus size={16} />, title: 'Always working for you', sub: "Agents that don't sleep." },
            ].map((item) => (
              <div className="promise stagger-in" key={item.title}>
                {item.icon}
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-product-frame">
          <MiniOsHeader />
          <div className="hero-product-grid">
            <MiniGraph graph={graph} />
            <AgentRail compact />
          </div>
        </div>
      </div>

      {/* ── Feature Grid ── */}
      <div className="landing-feature-grid">
        {features.map((f) => (
          <article className="feature-card stagger-in" key={f.title}>
            <IconTile tone={f.tone}>{f.icon}</IconTile>
            <div className="feature-body">
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <button className="text-link" type="button" onClick={() => setScreen('dashboard')}>
                Learn more <ArrowRight size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* ── How it works + Testimonial ── */}
      <div className="landing-bottom">
        <section className="process-line">
          <h2>How agents work for you</h2>
          <div className="process-steps">
            {steps.map((step, i) => (
              <Fragment key={step.title}>
                <div className="process-step">
                  <div className="process-icon">{step.icon}</div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="process-connector">
                    <ArrowRight size={16} />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
          <button className="text-link" type="button" onClick={() => setScreen('dashboard')}>
            See how it works <ArrowRight size={14} />
          </button>
        </section>

        <section className="testimonial-wrap">
          <div className="testimonial-main">
            <h2>Loved by people who want clarity</h2>
            <div className="star-row">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={18} weight="fill" color="#e8c86e" />
              ))}
            </div>
            <blockquote>
              "CalmVest finally makes money feel less overwhelming. The agents understand my life
              and give advice that actually fits."
            </blockquote>
            <div className="testimonial-attribution">
              <div className="avatar" />
              <div>
                <strong>Priya S.</strong>
                <span>New investor &amp; working mom</span>
              </div>
            </div>
          </div>
          <div className="stats-column">
            {stats.map((s) => (
              <div className="stat-item" key={s.value}>
                <span className="stat-icon">{s.icon}</span>
                <div>
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── CTA Band ── */}
      <div className="cta-band">
        <div>
          <h2>Ready for calm, intelligent money guidance?</h2>
          <p>Join thousands of people who let agents handle the heavy lifting.</p>
        </div>
        <div className="cta-band-actions">
          <button className="primary-action" type="button" onClick={() => setScreen('onboarding')}>
            Get started <ArrowRight size={19} />
          </button>
          <button className="ghost-action" type="button" onClick={() => setScreen('dashboard')}>
            <PlayCircle size={19} /> See how it works
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <Logo />
          <span>Agent-first wealth guidance for real life.</span>
        </div>
        <nav className="footer-links">
          {['Product', 'How it works', 'Security', 'Pricing', 'Resources', 'About'].map((item) => (
            <button type="button" key={item}>{item}</button>
          ))}
        </nav>
        <div className="footer-social">
          <button type="button" aria-label="X / Twitter"><XLogo size={18} /></button>
          <button type="button" aria-label="LinkedIn"><LinkedinLogo size={18} /></button>
          <button type="button" aria-label="Security"><ShieldCheck size={18} /></button>
        </div>
      </footer>
      <div className="footer-legal">
        <span>© 2024 CalmVest, Inc. All rights reserved.</span>
        <nav>
          {['Privacy', 'Terms', 'Cookies', 'Security'].map((item) => (
            <button type="button" key={item}>{item}</button>
          ))}
        </nav>
      </div>
    </section>
  )
}
