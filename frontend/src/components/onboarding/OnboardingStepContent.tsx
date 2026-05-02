import { CalendarCheck, ShieldCheck, TrendUp } from '@phosphor-icons/react'
import type { OnboardingAnswers } from '@calmvest/shared'
import { goalHelper } from '../../data/workspaceContent'
import type { OnboardingStep } from '../../types/screens'
import { Field } from '../common/Field'

export function OnboardingStepContent({
  step,
  answers,
  setAnswers,
}: {
  step: OnboardingStep['id']
  answers: OnboardingAnswers
  setAnswers: (answers: OnboardingAnswers) => void
}) {
  function update<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers({ ...answers, [key]: value })
  }

  if (step === 'goal') {
    return (
      <div className="choice-grid">
        {['Build wealth', 'Retire comfortably', 'Buy a home', 'Financial independence', 'Education', 'Other'].map((item) => (
          <button className={answers.goal === item ? 'selected' : ''} type="button" key={item} onClick={() => update('goal', item)}>
            <TrendUp size={26} />
            <span><strong>{item}</strong><small>{goalHelper(item)}</small></span>
          </button>
        ))}
      </div>
    )
  }

  if (step === 'targetDate') {
    return <Field label="Target date" value={answers.targetDate} onChange={(value) => update('targetDate', value)} helper="Use a month and year for the demo timeline." />
  }

  if (step === 'withdrawalNeed') {
    return <Field label="Liquidity need" value={answers.withdrawalNeed} onChange={(value) => update('withdrawalNeed', value)} helper="Tell agents if cash may be needed soon." />
  }

  if (step === 'drawdownFeeling') {
    return <Field label="Risk comfort" value={answers.drawdownFeeling} onChange={(value) => update('drawdownFeeling', value)} helper="This shapes scenario and communication agents." />
  }

  if (step === 'targetAmount') {
    return <Field label="Target amount" value={String(answers.targetAmount)} onChange={(value) => update('targetAmount', Number(value))} helper="Used for goal readiness and stress testing." />
  }

  if (step === 'taxableAccount') {
    return (
      <div className="choice-grid two">
        <button className={answers.taxableAccount ? 'selected' : ''} type="button" onClick={() => update('taxableAccount', true)}>
          <CalendarCheck size={26} /> <span><strong>Taxable account</strong><small>Tax agent estimates impact</small></span>
        </button>
        <button className={!answers.taxableAccount ? 'selected' : ''} type="button" onClick={() => update('taxableAccount', false)}>
          <ShieldCheck size={26} /> <span><strong>Not sure</strong><small>We can infer from account data</small></span>
        </button>
      </div>
    )
  }

  if (step === 'communicationStyle') {
    return <Field label="Explanation style" value={answers.communicationStyle} onChange={(value) => update('communicationStyle', value)} helper="Controls how the Communication Agent writes recommendations." />
  }

  return (
    <div className="review-card">
      <h3>Ready to commit memory</h3>
      <p>{answers.goal} / ${answers.targetAmount.toLocaleString()} / {answers.targetDate}</p>
      <p>{answers.withdrawalNeed}</p>
      <p>{answers.drawdownFeeling}</p>
    </div>
  )
}
