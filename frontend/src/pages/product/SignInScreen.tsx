import { useState } from 'react'
import { ArrowRight, Check, Lock, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import type { ProductScreenProps } from '../../types/product'
import { Brand } from '../../components/product/Brand'

export function SignInScreen({ setScreen, onHome }: ProductScreenProps) {
  const [mode, setMode] = useState<'signin' | 'create'>('signin')

  return (
    <section className="auth-screen">
      <div className="auth-left">
        <Brand onClick={onHome} />
        <h1>Your money OS, now with a memory.</h1>
        <p>
          Sign in to see the restored agent workspace: onboarding, memory graph, goals, account import,
          and transparent agent traces.
        </p>
        <div className="auth-orbit" aria-hidden="true">
          <div className="orbit-line" />
          <div className="orbit-line two" />
          <div className="center-orbit">
            <Lock size={28} />
            <strong>Private by default</strong>
            <span>No auto-trading</span>
          </div>
          {['Goal', 'Risk', 'Tax', 'Cash', 'Values'].map((item) => (
            <div className="orbit-card auth-orbit-card" key={item}>
              <Sparkle size={18} />
              <h4>{item}</h4>
              <p>Remembered with source history</p>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} type="button" onClick={() => setMode('signin')}>
            Sign in
          </button>
          <button className={mode === 'create' ? 'active' : ''} type="button" onClick={() => setMode('create')}>
            Create account
          </button>
        </div>
        <div className="form-stack">
          {mode === 'create' ? (
            <div className="field-row">
              <label className="field">
                First name
                <input defaultValue="Maya" />
              </label>
              <label className="field">
                Last name
                <input defaultValue="Patel" />
              </label>
            </div>
          ) : null}
          <label className="field">
            Email
            <input defaultValue="maya@example.com" />
          </label>
          <label className="field">
            Password
            <input type="password" defaultValue="calmvest-demo" />
          </label>
          <div className="auth-options">
            <span className="check-line">
              <span>
                <Check size={15} weight="bold" />
              </span>
              Remember this device
            </span>
            <button className="text-link" type="button">
              Need help?
            </button>
          </div>
          <button
            className="primary-action full-button"
            type="button"
            onClick={() => setScreen(mode === 'create' ? 'onboarding' : 'dashboard')}
          >
            {mode === 'create' ? 'Start onboarding' : 'Enter dashboard'} <ArrowRight size={18} />
          </button>
        </div>
        <div className="divider-label">
          <span>or continue with</span>
        </div>
        <div className="provider-row">
          <button className="secondary-action" type="button">Google</button>
          <button className="secondary-action" type="button">Apple</button>
          <button className="secondary-action" type="button">Passkey</button>
        </div>
        <div className="auth-note">
          <ShieldCheck size={44} />
          <div>
            <strong>Demo safe</strong>
            <p>No credentials are submitted. This local UI moves into the restored product flow.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
