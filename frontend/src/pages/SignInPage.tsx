import { useState, type ReactNode } from 'react'
import {
  CheckCircle,
  CheckSquare,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Lock,
  Square,
  User,
} from '@phosphor-icons/react'
import appleLogo from '../assets/apple-logo.svg'
import googleLogo from '../assets/google-g-logo.svg'
import northstarLogo from '../assets/northstar-logo.svg'
import type { Screen } from '../types/screens'

type AuthMode = 'register' | 'login'

function AuthInput({
  id,
  icon,
  placeholder,
  type = 'text',
  showToggle,
  showPassword,
  onTogglePassword,
}: {
  id: string
  icon: ReactNode
  placeholder: string
  type?: string
  showToggle?: boolean
  showPassword?: boolean
  onTogglePassword?: () => void
}) {
  return (
    <label className="auth-input" htmlFor={id}>
      <span className="auth-input__icon">{icon}</span>
      <input id={id} type={showToggle && showPassword ? 'text' : type} placeholder={placeholder} />
      {showToggle ? (
        <button className="auth-input__eye" type="button" aria-label="Toggle password visibility" onClick={onTogglePassword}>
          {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      ) : null}
    </label>
  )
}

export function SignInPage({
  setScreen,
  initialMode = 'register',
}: {
  setScreen: (screen: Screen) => void
  initialMode?: AuthMode
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const isRegister = mode === 'register'

  return (
    <div className="auth-page screen-enter">
      <button className="auth-page-brand" type="button" onClick={() => setScreen('landing')}>
        <img src={northstarLogo} alt="" aria-hidden="true" />
        <span>Northstar</span>
      </button>

      <section className="auth-card" aria-label="Northstar authentication">
        <button className="auth-card-brand" type="button" onClick={() => setScreen('landing')}>
          <img src={northstarLogo} alt="" aria-hidden="true" />
          <span>Northstar</span>
        </button>

        <header className="auth-card__header">
          <h1>
            Welcome to <span>Northstar</span>
          </h1>
          <p>
            A calm operating system for
            <br />
            your money and your future.
          </p>
        </header>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button className={isRegister ? 'active' : ''} type="button" role="tab" aria-selected={isRegister} onClick={() => setMode('register')}>
            Create account
          </button>
          <button className={!isRegister ? 'active' : ''} type="button" role="tab" aria-selected={!isRegister} onClick={() => setMode('login')}>
            Log in
          </button>
        </div>

        <div className="auth-fields">
          {isRegister ? (
            <AuthInput id="auth-name" icon={<User size={18} />} placeholder="Full name" />
          ) : null}
          <AuthInput id="auth-email" icon={<EnvelopeSimple size={18} />} placeholder="Email address" type="email" />
          <AuthInput
            id="auth-password"
            icon={<Lock size={18} />}
            placeholder="Password"
            type="password"
            showToggle
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((current) => !current)}
          />
        </div>

        {isRegister ? (
          <div className="auth-requirements" aria-label="Password requirements">
            {['8+ characters', 'One number', 'One special character'].map((item) => (
              <span key={item}>
                <CheckCircle size={15} weight="fill" />
                {item}
              </span>
            ))}
          </div>
        ) : (
          <div className="auth-login-options">
            <button className="auth-remember" type="button" onClick={() => setRemember((current) => !current)}>
              {remember ? <CheckSquare size={17} weight="fill" /> : <Square size={17} />}
              Remember me
            </button>
            <button className="auth-forgot" type="button">Forgot password?</button>
          </div>
        )}

        <button className="auth-primary" type="button" onClick={() => setScreen('dashboard')}>
          {isRegister ? 'Create account' : 'Log in'}
        </button>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="auth-socials">
          <button type="button"><img src={googleLogo} alt="" aria-hidden="true" /> Google</button>
          <button type="button"><img src={appleLogo} alt="" aria-hidden="true" /> Apple</button>
        </div>

        <p className="auth-terms">
          {isRegister ? 'By creating an account, you agree to our' : 'By continuing, you agree to our'}
          <br />
          <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.
        </p>
      </section>
    </div>
  )
}
