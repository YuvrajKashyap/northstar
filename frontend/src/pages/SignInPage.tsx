import { useState } from 'react'
import {
  AppleLogo,
  ArrowRight,
  CheckSquare,
  EnvelopeSimple,
  EyeSlash,
  Eye,
  GoogleLogo,
  Lock,
  ShieldCheck,
  Sparkle,
  Square,
} from '@phosphor-icons/react'
import { agentCards } from '../data/demoContent'
import type { Screen } from '../types/screens'
import { AgentIcon } from '../components/common/AgentIcon'
import { AuthOrbit } from '../components/auth/AuthOrbit'
import { LiveDot } from '../components/common/LiveDot'
import { Logo } from '../components/brand/Logo'

export function SignInPage({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)

  return (
    <section className="auth-screen screen-enter">

      {/* ── Left: Branding + Graph + Agent Activity ── */}
      <div className="auth-left">
        <Logo />
        <div>
          <h1>
            Your life.<br />
            Your context. <span>Connected.</span>
          </h1>
          <p>CalmVest Agent OS remembers what matters, so you can make calm, confident decisions.</p>
        </div>

        <AuthOrbit />

        <div className="auth-activity">
          <header className="auth-activity-header">
            <span>Agent Activity</span>
            <LiveDot />
            <small>Live</small>
          </header>
          {agentCards.slice(0, 3).map((card) => (
            <div className="mini-agent-row" key={card.agent}>
              <AgentIcon tone={card.tone} />
              <div className="mini-agent-body">
                <strong>{card.agent} {card.title.toLowerCase()}</strong>
                <span>{card.time} &middot; {card.detail}</span>
              </div>
              <span className={`agent-pill ${card.tone}`}>{card.tag}</span>
            </div>
          ))}
          <div className="auth-security-note">
            <Lock size={13} />
            <span>Bank-level encryption &bull; Your data is always private</span>
          </div>
        </div>
      </div>

      {/* ── Right: Form + Info Card ── */}
      <div className="auth-right">
        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs">
            <button className="active" type="button">Sign in</button>
            <button type="button">Create account</button>
          </div>

          {/* Email */}
          <div className="field">
            <label htmlFor="email">Email</label>
            <span className="field-input-wrap">
              <EnvelopeSimple size={17} />
              <input id="email" type="email" placeholder="you@example.com" />
            </span>
          </div>

          {/* Password */}
          <div className="field">
            <div className="field-label-row">
              <label htmlFor="password">Password</label>
              <button className="forgot-link" type="button">Forgot password?</button>
            </div>
            <span className="field-input-wrap">
              <Lock size={17} />
              <input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" />
              <button
                type="button"
                className="field-eye"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <Eye size={16} /> : <EyeSlash size={16} />}
              </button>
            </span>
          </div>

          {/* Keep signed in */}
          <button
            type="button"
            className="checkbox-row"
            onClick={() => setKeepSignedIn((v) => !v)}
          >
            {keepSignedIn
              ? <CheckSquare size={20} weight="fill" color="var(--green)" />
              : <Square size={20} />}
            <span>Keep me signed in</span>
          </button>

          {/* CTA */}
          <button
            className="primary-action full-button"
            type="button"
            onClick={() => setScreen('dashboard')}
          >
            Sign in to CalmVest <ArrowRight size={19} />
          </button>

          {/* Divider */}
          <div className="divider-label">or continue with</div>

          {/* Providers */}
          <div className="provider-row">
            <button type="button" className="provider-btn">
              <GoogleLogo size={18} /> Google
            </button>
            <button type="button" className="provider-btn">
              <AppleLogo size={18} /> Apple
            </button>
            <button type="button" className="provider-btn">
              <span className="ms-icon">
                <span style={{ background: '#f25022' }} />
                <span style={{ background: '#7fba00' }} />
                <span style={{ background: '#00a4ef' }} />
                <span style={{ background: '#ffb900' }} />
              </span>
              Microsoft
            </button>
          </div>

          {/* Security strip */}
          <div className="auth-security-strip">
            <ShieldCheck size={18} weight="fill" color="var(--green)" />
            <div>
              <strong>Secure connect</strong>
              <span>256-bit encryption &bull; Zero-knowledge architecture</span>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="auth-note">
          <Sparkle size={34} weight="duotone" color="var(--green)" />
          <div>
            <strong>We remember your goals, not just your balances.</strong>
            <p>CalmVest connects the dots across your financial life—so every recommendation fits your bigger picture.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
