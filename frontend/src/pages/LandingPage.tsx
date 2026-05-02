import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowRight,
  CirclesThreePlus,
  Graph,
  PlayCircle,
  ShieldCheck,
  Wallet,
} from '@phosphor-icons/react'
import type { MemoryGraph } from '@calmvest/shared'
import type { Screen } from '../types/screens'
import { AgentRail } from '../components/dashboard/AgentRail'
import { LandingNav } from '../components/layout/LandingNav'
import { MiniGraph } from '../components/dashboard/MiniGraph'
import { MiniOsHeader } from '../components/layout/MiniOsHeader'
import { Logo } from '../components/brand/Logo'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: <CirclesThreePlus size={22} />,
    title: 'Memory Graph',
    desc: 'A persistent map of your life and money. Every agent reads it before acting.',
  },
  {
    icon: <Graph size={22} />,
    title: 'Scenario Canvas',
    desc: "Guided what-if simulations that stress-test your plan before you commit.",
  },
  {
    icon: <Wallet size={22} />,
    title: 'Decision Inbox',
    desc: 'Surfaced recommendations with trade-offs. No hunting through dashboards.',
  },
  {
    icon: <ShieldCheck size={22} />,
    title: 'Trust Receipts',
    desc: 'Every suggestion comes with a plain-language audit trail and confidence score.',
  },
]

export function LandingPage({
  setScreen,
  graph,
}: {
  setScreen: (screen: Screen) => void
  graph: MemoryGraph | null
}) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.feat-item',
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.09,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.l-features', start: 'top 82%' },
        },
      )
      gsap.fromTo(
        '.l-cta',
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.l-cta', start: 'top 88%' },
        },
      )
    })
    return () => {
      ctx.revert()
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <div className="l-root screen-enter">
      <LandingNav setScreen={setScreen} />

      {/* ─── Hero ─── */}
      <section className="l-hero">
        <div className="l-hero-copy">
          <div className="l-badge"><span className="l-dot" />Agent-first wealth guidance</div>
          <h1 className="l-h1">
            Your money,<br />
            handled with<br />
            <em>context.</em>
          </h1>
          <p className="l-lead">
            CalmVest uses specialized AI agents and your life context to give you
            clear guidance—so you can make confident money decisions, starting today.
          </p>
          <div className="l-actions">
            <button className="l-btn-primary" type="button" onClick={() => setScreen('onboarding')}>
              Get started <ArrowRight size={17} />
            </button>
            <button className="l-btn-ghost" type="button" onClick={() => setScreen('dashboard')}>
              <PlayCircle size={17} /> See how it works
            </button>
          </div>
          <ul className="l-promises">
            <li>Built for beginners</li>
            <li>Private by design</li>
            <li>Always working for you</li>
          </ul>
        </div>

        <div className="l-hero-frame">
          <MiniOsHeader />
          <div className="l-hero-grid">
            <MiniGraph graph={graph} />
            <AgentRail compact />
          </div>
        </div>
      </section>

      {/* ─── Features strip ─── */}
      <section className="l-features">
        {features.map((f) => (
          <div className="feat-item" key={f.title}>
            <span className="feat-icon">{f.icon}</span>
            <div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
            <button
              className="feat-link"
              type="button"
              onClick={() => setScreen('dashboard')}
            >
              Learn more <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </section>

      {/* ─── CTA ─── */}
      <section className="l-cta">
        <div>
          <h2>Ready for calm, intelligent money guidance?</h2>
          <p>Let agents handle the analysis. You make the call.</p>
        </div>
        <div className="l-cta-actions">
          <button className="l-btn-primary" type="button" onClick={() => setScreen('onboarding')}>
            Get started <ArrowRight size={17} />
          </button>
          <button className="l-btn-ghost" type="button" onClick={() => setScreen('dashboard')}>
            <PlayCircle size={17} /> See demo
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="l-footer">
        <Logo />
        <nav className="l-footer-links">
          {['Product', 'How it works', 'Security', 'Pricing', 'About'].map((item) => (
            <button type="button" key={item}>{item}</button>
          ))}
        </nav>
        <span className="l-footer-copy">© 2024 CalmVest, Inc.</span>
      </footer>
    </div>
  )
}
