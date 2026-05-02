import { Check, CheckCircle, Clock, Pulse, Sparkle, Target } from '@phosphor-icons/react'
import type { OnboardingAnswers } from '@calmvest/shared'
import type { OnboardingStep } from '../../types/product'
import { IconTile } from './IconTile'

export function OnboardingStepFields({
  step,
  answers,
  update,
}: {
  step: OnboardingStep['id']
  answers: OnboardingAnswers
  update: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void
}) {
  if (step === 'goal') {
    return (
      <ChoiceGrid
        value={answers.goal}
        options={['Retire comfortably', 'Buy a home', 'Build wealth steadily', 'Fund family goals']}
        onSelect={(value) => update('goal', value)}
      />
    )
  }

  if (step === 'targetDate') {
    return (
      <div className="stacked-fields">
        <label className="field">
          Target date
          <input
            type="month"
            value={answers.targetDate}
            onChange={(event) => update('targetDate', event.target.value)}
          />
        </label>
        <label className="field">
          Target annual amount
          <input
            type="number"
            value={answers.targetAmount}
            onChange={(event) => update('targetAmount', Number(event.target.value))}
          />
        </label>
      </div>
    )
  }

  if (step === 'withdrawalNeed') {
    return (
      <ChoiceGrid
        value={answers.withdrawalNeed}
        options={[
          'No major withdrawals planned',
          'May need to withdraw 20% next year',
          'Need emergency cash available',
          'Not sure yet',
        ]}
        onSelect={(value) => update('withdrawalNeed', value)}
      />
    )
  }

  if (step === 'drawdownFeeling') {
    return (
      <ChoiceGrid
        value={answers.drawdownFeeling}
        options={[
          'Calm at a 20% drop',
          'Concerned but steady',
          'Very worried at a 20% drop',
          'I would likely sell',
        ]}
        onSelect={(value) => update('drawdownFeeling', value)}
      />
    )
  }

  if (step === 'targetAmount') {
    return (
      <div className="stacked-fields">
        <label className="field">
          Income stability
          <textarea value={answers.values} onChange={(event) => update('values', event.target.value)} />
        </label>
      </div>
    )
  }

  if (step === 'taxableAccount') {
    return (
      <button
        className="toggle-card"
        type="button"
        onClick={() => update('taxableAccount', !answers.taxableAccount)}
      >
        <div>
          <strong>Taxable brokerage account</strong>
          <p>Use tax-aware recommendations when agents compare plans.</p>
        </div>
        <span className={`empty-check ${answers.taxableAccount ? '' : 'off'}`}>
          <Check size={14} />
        </span>
      </button>
    )
  }

  if (step === 'communicationStyle') {
    return (
      <ChoiceGrid
        value={answers.communicationStyle}
        options={[
          'Plain English with clear next steps',
          'Detailed math and assumptions',
          'Short alerts only',
          'Coach me through tradeoffs',
        ]}
        onSelect={(value) => update('communicationStyle', value)}
      />
    )
  }

  return (
    <div className="review-list">
      {previewItems(answers).map((item) => (
        <div className="review-card" key={item.label}>
          <strong>{item.label}</strong>
          <p>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

export function ChoiceGrid({
  value,
  options,
  onSelect,
}: {
  value: string
  options: string[]
  onSelect: (value: string) => void
}) {
  return (
    <div className="choice-grid">
      {options.map((option) => (
        <button
          className={`choice-card ${value === option ? 'active' : ''}`}
          type="button"
          key={option}
          onClick={() => onSelect(option)}
        >
          <IconTile>
            <CheckCircle size={22} />
          </IconTile>
          <div>
            <strong>{option}</strong>
            <span>Save this as reusable agent context.</span>
          </div>
          {value === option ? <Check size={18} /> : null}
        </button>
      ))}
    </div>
  )
}

export function previewItems(answers: OnboardingAnswers) {
  return [
    {
      label: 'Goal',
      value: `${answers.goal} by ${answers.targetDate}`,
      icon: <Target size={22} />,
      tone: 'green',
    },
    { label: 'Liquidity', value: answers.withdrawalNeed, icon: <Clock size={22} />, tone: 'gold' },
    { label: 'Risk comfort', value: answers.drawdownFeeling, icon: <Pulse size={22} />, tone: 'violet' },
    { label: 'Style', value: answers.communicationStyle, icon: <Sparkle size={22} />, tone: 'blue' },
  ]
}
