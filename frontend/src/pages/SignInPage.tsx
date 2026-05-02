import { useState, type FormEvent, type ReactNode } from 'react'
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
import { postJson } from '../lib/api'
import type { Screen } from '../types/screens'
import type { AuthRecoverResponse, AuthUserSession } from '@calmvest/shared'

type AuthMode = 'register' | 'login'

function AuthInput({
  id,
  icon,
  placeholder,
  type = 'text',
  autoComplete,
  showToggle,
  showPassword,
  onTogglePassword,
  value,
  onChange,
}: {
  id: string
  icon: ReactNode
  placeholder: string
  type?: string
  autoComplete?: string
  showToggle?: boolean
  showPassword?: boolean
  onTogglePassword?: () => void
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="auth-input" htmlFor={id}>
      <span className="auth-input__icon">{icon}</span>
      <input
        id={id}
        type={showToggle && showPassword ? 'text' : type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [showRecover, setShowRecover] = useState(false)
  const isRegister = mode === 'register'

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage(null)
    setShowRecover(false)
  }

  function activateSession(session: AuthUserSession) {
    localStorage.setItem('northstar.activeUserId', session.userId)
    localStorage.setItem('northstar.activeUserEmail', session.email)
    if (session.accessToken) localStorage.setItem('northstar.accessToken', session.accessToken)
    window.dispatchEvent(new Event('northstar-auth'))
    setScreen(isRegister ? 'workspace' : 'dashboard')
  }

  function readableError(caught: unknown) {
    if (!(caught instanceof Error)) return 'Something went wrong. Try again.'
    try {
      const parsed = JSON.parse(caught.message) as { message?: string }
      return parsed.message ?? caught.message
    } catch {
      return caught.message
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    if (isRegister && password !== confirmPassword) {
      setMessage({ kind: 'error', text: 'Passwords do not match. Retype your password to continue.' })
      return
    }
    setBusy(true)
    try {
      const session = isRegister
        ? await postJson<AuthUserSession>('/api/auth/register', { name, email, password })
        : await postJson<AuthUserSession>('/api/auth/login', { email, password })
      activateSession(session)
    } catch (caught) {
      const text = readableError(caught)
      setMessage({ kind: 'error', text })
      if (text.toLowerCase().includes('not found') || text.toLowerCase().includes('password')) {
        setShowRecover(true)
      }
    } finally {
      setBusy(false)
    }
  }

  async function recoverPassword() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await postJson<AuthRecoverResponse>('/api/auth/recover', { email })
      setMessage({ kind: result.found ? 'success' : 'error', text: result.message })
    } catch (caught) {
      setMessage({ kind: 'error', text: readableError(caught) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page screen-enter">
      <button className="auth-page-brand" type="button" onClick={() => setScreen('landing')}>
        <img src={northstarLogo} alt="" aria-hidden="true" />
        <span>Northstar</span>
      </button>

      <section className={`auth-card ${isRegister ? 'auth-card--register' : 'auth-card--login'}`} aria-label="Northstar authentication">
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

        <div className={`auth-tabs auth-tabs--${mode}`} role="tablist" aria-label="Authentication mode">
          <button className={isRegister ? 'active' : ''} type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}>
            Create account
          </button>
          <button className={!isRegister ? 'active' : ''} type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>
            Log in
          </button>
        </div>

        <form className="auth-form" onSubmit={submitAuth}>
          <div className="auth-fields">
            {isRegister ? (
              <AuthInput id="auth-name" icon={<User size={18} />} placeholder="Full name" autoComplete="name" value={name} onChange={setName} />
            ) : null}
            <AuthInput id="auth-email" icon={<EnvelopeSimple size={18} />} placeholder="Email address" type="email" autoComplete="email" value={email} onChange={setEmail} />
            <AuthInput
              id="auth-password"
              icon={<Lock size={18} />}
              placeholder="Password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              showToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((current) => !current)}
              value={password}
              onChange={setPassword}
            />
            {isRegister ? (
              <AuthInput
                id="auth-confirm-password"
                icon={<Lock size={18} />}
                placeholder="Retype password"
                type="password"
                autoComplete="new-password"
                showToggle
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((current) => !current)}
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            ) : null}
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
              <button className="auth-forgot" type="button" onClick={() => setShowRecover((current) => !current)}>Forgot password?</button>
            </div>
          )}

          {message ? <p className={`auth-message auth-message--${message.kind}`}>{message.text}</p> : null}

          {showRecover && !isRegister ? (
            <div className="auth-recovery">
              <span>Recover access for this email or create a new account.</span>
              <div>
                <button type="button" onClick={recoverPassword} disabled={busy}>Recover password</button>
                <button type="button" onClick={() => switchMode('register')}>Create account</button>
              </div>
            </div>
          ) : null}

          <button className="auth-primary" type="submit" disabled={busy}>
            {busy ? 'Working...' : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>

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
