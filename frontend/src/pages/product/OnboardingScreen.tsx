import { useState } from 'react'
import { ArrowRight, CheckCircle, ShieldCheck } from '@phosphor-icons/react'
import type { OnboardingAnswers } from '@calmvest/shared'
import { IconTile } from '../../components/product/IconTile'
import { OnboardingStepFields, previewItems } from '../../components/product/onboardingFields'
import { onboardingSteps } from '../../data/product'
import type { ProductScreenProps } from '../../types/product'
import { Brand } from '../../components/product/Brand'

export function OnboardingScreen({
  answers,
  busy,
  commitOnboarding,
  setAnswers,
  setScreen,
  onHome,
}: ProductScreenProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = onboardingSteps[stepIndex]
  const canGoBack = stepIndex > 0
  const isLast = stepIndex === onboardingSteps.length - 1

  function update<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  return (
    <section className="onboarding-screen">
      <aside className="onboarding-rail">
        <Brand onClick={onHome} />
        <div>
          <div className="rail-copy">
            <h3>Build the memory layer</h3>
            <p>Eight short tabs populate the profile that every agent can cite before it acts.</p>
          </div>
          <nav className="onboarding-nav">
            {onboardingSteps.map((item, index) => (
              <button
                className={index === stepIndex ? 'active' : ''}
                type="button"
                key={item.id}
                onClick={() => setStepIndex(index)}
              >
                <span>{index + 1}</span>
                {item.label}
                <small>{item.helper}</small>
              </button>
            ))}
          </nav>
        </div>
        <div className="rail-secure">
          <ShieldCheck size={24} />
          <p>Profile edits generate memory diffs and trace events.</p>
        </div>
      </aside>

      <main className="onboarding-main">
        <div className="onboarding-top">
          <div>
            <h1>Tell Northstar how to think with you.</h1>
            <p>Every answer becomes reusable context, not a one-off form field.</p>
          </div>
          <button className="secondary-action" type="button" onClick={() => setScreen('dashboard')}>
            Skip to dashboard
          </button>
        </div>

        <div className="onboarding-progress">
          {onboardingSteps.map((item, index) => (
            <button
              className={`progress-step ${index <= stepIndex ? 'active' : ''}`}
              type="button"
              key={item.id}
              onClick={() => setStepIndex(index)}
            >
              <span>{index + 1}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </div>

        <div className="onboarding-layout">
          <article className="onboarding-card">
            <span className="step-badge">
              Step {stepIndex + 1} of {onboardingSteps.length}
            </span>
            <h2>{step.label}</h2>
            <p>{step.helper}</p>
            <OnboardingStepFields step={step.id} answers={answers} update={update} />
            <div className="onboarding-actions">
              <button
                className="secondary-action"
                type="button"
                disabled={!canGoBack}
                onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              >
                Back
              </button>
              <button className="subtle-button save-later" type="button" onClick={() => setScreen('dashboard')}>
                Save for later
              </button>
              <button
                className="primary-action"
                type="button"
                disabled={busy}
                onClick={() => (isLast ? commitOnboarding() : setStepIndex((index) => index + 1))}
              >
                {isLast ? 'Commit memory' : 'Continue'} <ArrowRight size={18} />
              </button>
            </div>
          </article>

          <aside className="memory-build-panel">
            <div className="panel-heading">
              <h2>Memory preview</h2>
              <span className="status-pill">Live</span>
            </div>
            {previewItems(answers).map((item) => (
              <div className="memory-preview-card" key={item.label}>
                <IconTile tone={item.tone}>{item.icon}</IconTile>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </div>
                <CheckCircle size={20} />
              </div>
            ))}
          </aside>
        </div>
      </main>
    </section>
  )
}
