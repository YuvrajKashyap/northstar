import { ArrowRight, CheckCircle, CirclesThreePlus, Graph, ShieldCheck, SignIn, Wallet } from '@phosphor-icons/react'
import type { MemoryGraph } from '@calmvest/shared'
import type { Screen } from '../types/screens'
import { AgentRail } from '../components/dashboard/AgentRail'
import { IconTile } from '../components/common/IconTile'
import { LandingNav } from '../components/layout/LandingNav'
import { MiniGraph } from '../components/dashboard/MiniGraph'
import { MiniOsHeader } from '../components/layout/MiniOsHeader'
import { Logo } from '../components/brand/Logo'

export function LandingPage({ setScreen, graph }: { setScreen: (screen: Screen) => void; graph: MemoryGraph | null }) {
  return (
    <section className="landing screen-enter">
      <LandingNav setScreen={setScreen} />
      <div className="landing-hero">
        <div className="landing-copy">
          <div className="soft-pill"><span /> Agent-first wealth guidance</div>
          <h1>Your money, handled with context.</h1>
          <p>
            CalmVest Agent OS uses specialized AI agents and your life context to give you clear
            guidance, so you can make confident money decisions starting today.
          </p>
          <div className="button-row">
            <button className="primary-action" type="button" onClick={() => setScreen('onboarding')}>
              Get started <ArrowRight size={19} />
            </button>
            <button className="ghost-action" type="button" onClick={() => setScreen('dashboard')}>
              <SignIn size={19} /> See how it works
            </button>
          </div>
          <div className="promise-row">
            {['Built for beginners', 'Private by design', 'Always working for you'].map((item) => (
              <div className="promise stagger-in" key={item}>
                <CheckCircle size={18} />
                <strong>{item}</strong>
                <span>No jargon. Just clarity.</span>
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
      <div className="landing-feature-grid">
        {[
          ['Memory Graph', 'A living map of your money and life. Agents use your context to deliver personalized guidance.'],
          ['Scenario Canvas', 'Explore what-if simulations that stress test your plan before you act.'],
          ['Decision Inbox', 'Clear recommendations, tradeoffs, and next steps so you know what to do and why.'],
          ['Trust Receipts', 'Every suggestion comes with a source-backed explanation and confidence breakdown.'],
        ].map(([title, text], index) => (
          <article className="feature-card stagger-in" key={title}>
            <IconTile>{index === 0 ? <CirclesThreePlus /> : index === 1 ? <Graph /> : index === 2 ? <Wallet /> : <ShieldCheck />}</IconTile>
            <h3>{title}</h3>
            <p>{text}</p>
            <button className="text-link" type="button" onClick={() => setScreen('dashboard')}>
              Learn more <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </div>
      <div className="landing-bottom">
        <section>
          <h2>How agents work for you</h2>
          <div className="process-line">
            {['We get to know you', 'Agents do the work', 'You decide with confidence'].map((item) => (
              <div key={item}>
                <CheckCircle size={28} />
                <strong>{item}</strong>
                <p>Secure context, clear recommendations, and human control.</p>
              </div>
            ))}
          </div>
        </section>
        <section className="testimonial-card">
          <h2>Loved by people who want clarity</h2>
          <p>
            CalmVest finally makes money feel less overwhelming. The agents understand my life and
            give advice that actually fits.
          </p>
          <strong>Priya S.</strong>
        </section>
      </div>
      <footer className="landing-footer">
        <div>
          <Logo />
          <span>Agent-first wealth guidance for real life.</span>
        </div>
        <button className="primary-action" type="button" onClick={() => setScreen('onboarding')}>
          Get started <ArrowRight size={19} />
        </button>
      </footer>
    </section>
  )
}
