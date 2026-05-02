import { ArrowRight } from '@phosphor-icons/react'
import type { Screen } from '../../types/screens'
import { Logo } from '../brand/Logo'

export function LandingNav({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <nav className="landing-nav">
      <Logo />
      <div className="landing-links">
        {['Product', 'How it works', 'For beginners', 'Security', 'Pricing', 'Resources'].map((item) => (
          <button type="button" key={item}>{item}</button>
        ))}
      </div>
      <div className="landing-actions">
        <button type="button" onClick={() => setScreen('signin')}>Sign in</button>
        <button className="primary-action" type="button" onClick={() => setScreen('onboarding')}>
          Get started <ArrowRight size={18} />
        </button>
      </div>
    </nav>
  )
}
