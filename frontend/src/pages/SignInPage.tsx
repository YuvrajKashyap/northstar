import { useState } from 'react'
import {
  AppleLogo,
  ArrowRight,
  CheckSquare,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  GoogleLogo,
  Lock,
  ShieldCheck,
  Sparkle,
  Square,
} from '@phosphor-icons/react'
import { agentCards } from '../data/workspaceContent'
import type { Screen } from '../types/screens'
import { AgentIcon } from '../components/common/AgentIcon'
import { AuthOrbit } from '../components/auth/AuthOrbit'
import { LiveDot } from '../components/common/LiveDot'
import { Logo } from '../components/brand/Logo'

export function SignInPage({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const [showPw, setShowPw] = useState(false)
  const [keep, setKeep] = useState(true)

  return (
    <div className="si-root screen-enter">

      {/* ─── Left ─── */}
      <div className="si-left">
        <Logo />

        <div className="si-headline">
          <h1>
            Your life.<br />
            Your context.<br />
            <em>Connected.</em>
          </h1>
          <p>CalmVest remembers what matters, so every decision fits your bigger picture.</p>
        </div>

        <AuthOrbit />

        <div className="si-activity">
          <div className="si-activity-header">
            <span>Agent Activity</span>
            <LiveDot />
            <small>Live</small>
          </div>
          {agentCards.slice(0, 3).map((card) => (
            <div className="si-agent-row" key={card.agent}>
              <AgentIcon tone={card.tone} compact />
              <div>
                <strong>{card.title}</strong>
                <span>{card.time} · {card.detail}</span>
              </div>
              <span className={`si-pill ${card.tone}`}>{card.tag}</span>
            </div>
          ))}
          <div className="si-security">
            <Lock size={12} />
            <span>Bank-level encryption · Your data is always private</span>
          </div>
        </div>
      </div>

      {/* ─── Right ─── */}
      <div className="si-right">
        <div className="si-card">

          {/* Tabs */}
          <div className="si-tabs">
            <button className="active" type="button">Sign in</button>
            <button type="button">Create account</button>
          </div>

          {/* Email */}
          <div className="si-field">
            <label htmlFor="si-email">Email</label>
            <div className="si-input">
              <EnvelopeSimple size={16} />
              <input id="si-email" type="email" placeholder="you@example.com" />
            </div>
          </div>

          {/* Password */}
          <div className="si-field">
            <div className="si-field-header">
              <label htmlFor="si-password">Password</label>
              <button className="si-forgot" type="button">Forgot password?</button>
            </div>
            <div className="si-input">
              <Lock size={16} />
              <input id="si-password" type={showPw ? 'text' : 'password'} placeholder="Enter your password" />
              <button className="si-eye" type="button" onClick={() => setShowPw((v) => !v)}>
                {showPw ? <Eye size={15} /> : <EyeSlash size={15} />}
              </button>
            </div>
          </div>

          {/* Keep signed in */}
          <button className="si-check" type="button" onClick={() => setKeep((v) => !v)}>
            {keep
              ? <CheckSquare size={18} weight="fill" color="var(--green)" />
              : <Square size={18} />}
            <span>Keep me signed in</span>
          </button>

          {/* CTA */}
          <button
            className="si-submit"
            type="button"
            onClick={() => setScreen('dashboard')}
          >
            Sign in to CalmVest <ArrowRight size={18} />
          </button>

          {/* Divider */}
          <div className="si-divider">or continue with</div>

          {/* Providers */}
          <div className="si-providers">
            <button type="button"><GoogleLogo size={17} /> Google</button>
            <button type="button"><AppleLogo size={17} /> Apple</button>
            <button type="button">
              <span className="ms-grid">
                <span style={{ background: '#f25022' }} />
                <span style={{ background: '#7fba00' }} />
                <span style={{ background: '#00a4ef' }} />
                <span style={{ background: '#ffb900' }} />
              </span>
              Microsoft
            </button>
          </div>

          {/* Security */}
          <div className="si-secure">
            <ShieldCheck size={17} weight="fill" color="var(--green)" />
            <div>
              <strong>Secure connect</strong>
              <span>256-bit encryption · Zero-knowledge architecture</span>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="si-note">
          <Sparkle size={30} weight="duotone" color="var(--green)" />
          <div>
            <strong>We remember your goals, not just your balances.</strong>
            <p>CalmVest connects the dots across your financial life so every recommendation fits.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
