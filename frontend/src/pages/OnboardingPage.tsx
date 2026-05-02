import { ArrowRight, CalendarCheck, Clock, Graph, Pulse, ShieldCheck, Target } from '@phosphor-icons/react'
import { onboardingCopy, onboardingSteps, onboardingTitle } from '../data/demoContent'
import type { ScreenProps } from '../types/screens'
import { AppChrome } from '../components/layout/AppChrome'
import { LiveDot } from '../components/common/LiveDot'
import { OnboardingStepContent } from '../components/onboarding/OnboardingStepContent'
import { TraceList } from '../components/dashboard/TraceList'

export function OnboardingPage(props: ScreenProps) {
  const step = onboardingSteps[props.activeOnboardingStep]

  function nextStep() {
    if (props.activeOnboardingStep < onboardingSteps.length - 1) {
      props.setActiveOnboardingStep(props.activeOnboardingStep + 1)
      return
    }
    props.commitOnboarding()
  }

  return (
    <AppChrome active="onboarding" setScreen={props.setScreen}>
      <section className="onboarding-screen screen-enter">
        <header className="app-header">
          <div>
            <h1>Onboarding</h1>
            <p>Help us understand your life so we can act in your best interest.</p>
          </div>
          <div className="profile-chip"><Clock size={16} /> Takes about 5 min</div>
        </header>
        <div className="onboarding-progress">
          {onboardingSteps.map((item, index) => (
            <button
              type="button"
              className={index === props.activeOnboardingStep ? 'active' : ''}
              key={item.label}
              onClick={() => props.setActiveOnboardingStep(index)}
            >
              <span>{index + 1}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div className="onboarding-layout">
          <aside className="onboarding-rail">
            <h3>Getting started</h3>
            <p>Tell us about your life. We build your personalized financial context.</p>
            {onboardingSteps.map((item, index) => (
              <button
                key={item.label}
                type="button"
                className={index === props.activeOnboardingStep ? 'active' : ''}
                onClick={() => props.setActiveOnboardingStep(index)}
              >
                <span>{index + 1}</span>
                <strong>{item.label}</strong>
                <small>{item.helper}</small>
              </button>
            ))}
          </aside>
          <article className="onboarding-card">
            <span className="step-badge">Step {props.activeOnboardingStep + 1} of 8</span>
            <h2>{onboardingTitle(step.id)}</h2>
            <p>{onboardingCopy(step.id)}</p>
            <OnboardingStepContent step={step.id} answers={props.answers} setAnswers={props.setAnswers} />
            {props.memoryDiff.length > 0 ? (
              <div className="memory-diff-strip">
                {props.memoryDiff.map((item) => (
                  <span key={`${item.kind}-${item.label}`}>{item.kind}: {item.label}</span>
                ))}
              </div>
            ) : null}
            <div className="onboarding-actions">
              <button className="ghost-action" type="button" onClick={() => props.setScreen('landing')}>
                Back
              </button>
              <button className="primary-action" type="button" onClick={nextStep} disabled={props.busyStep === 'onboarding'}>
                {props.activeOnboardingStep === onboardingSteps.length - 1 ? 'Commit profile' : 'Next'}
                <ArrowRight size={18} />
              </button>
            </div>
          </article>
          <aside className="memory-build-panel">
            <h3>Memory being built <LiveDot /></h3>
            {[
              ['Goals', props.answers.goal, Target],
              ['Risk Comfort', props.answers.drawdownFeeling, Pulse],
              ['Tax Profile', props.answers.taxableAccount ? 'Taxable brokerage' : 'Not taxable', CalendarCheck],
              ['Values', props.answers.values, ShieldCheck],
              ['Communication Style', props.answers.communicationStyle, Graph],
            ].map(([label, value, Icon]) => (
              <div className="memory-preview" key={String(label)}>
                <Icon size={28} />
                <div>
                  <strong>{String(label)}</strong>
                  <span>{String(value)}</span>
                </div>
              </div>
            ))}
            <TraceList trace={props.onboardingTrace} compact />
          </aside>
        </div>
      </section>
    </AppChrome>
  )
}
