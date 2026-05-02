import { ArrowRight, Check, Lock, MagnifyingGlass, Sparkle } from '@phosphor-icons/react'
import { agentCards } from '../data/demoContent'
import type { Screen } from '../types/screens'
import { AgentIcon } from '../components/common/AgentIcon'
import { AuthOrbit } from '../components/auth/AuthOrbit'
import { Field } from '../components/common/Field'
import { LiveDot } from '../components/common/LiveDot'
import { Logo } from '../components/brand/Logo'

export function SignInPage({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <section className="auth-screen screen-enter">
      <div className="auth-left">
        <Logo />
        <h1>Your life. Your context. <span>Connected.</span></h1>
        <p>CalmVest Agent OS remembers what matters, so you can make calm, confident decisions.</p>
        <AuthOrbit />
        <div className="auth-activity">
          <h3>Agent Activity <LiveDot /></h3>
          {agentCards.slice(0, 3).map((card) => (
            <div className="mini-agent-row" key={card.agent}>
              <AgentIcon tone={card.tone} />
              <div>
                <strong>{card.title}</strong>
                <span>{card.time} - {card.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className="active" type="button">Sign in</button>
            <button type="button">Create account</button>
          </div>
          <Field label="Email" icon={<MagnifyingGlass size={19} />} placeholder="you@example.com" />
          <Field label="Password" icon={<Lock size={19} />} placeholder="Enter your password" password />
          <div className="auth-options">
            <span><Check size={16} /> Keep me signed in</span>
            <button type="button">Forgot password?</button>
          </div>
          <button className="primary-action full" type="button" onClick={() => setScreen('dashboard')}>
            Sign in to CalmVest <ArrowRight size={19} />
          </button>
          <div className="divider-label">or continue with</div>
          <div className="provider-row">
            <button type="button">Google</button>
            <button type="button">Apple</button>
            <button type="button">Microsoft</button>
          </div>
        </div>
        <div className="auth-note">
          <Sparkle size={38} />
          <div>
            <h3>We remember your goals, not just your balances.</h3>
            <p>CalmVest connects the dots across your financial life so every recommendation fits.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
