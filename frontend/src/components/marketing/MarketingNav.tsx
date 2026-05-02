import { CaretDown } from '@phosphor-icons/react'
import northstarLogo from '../../assets/northstar-logo.svg'
import type { Screen } from '../../types/screens'

type MarketingNavProps = {
  setScreen?: (screen: Screen) => void
  openAuth?: (mode: 'register' | 'login') => void
}

const navItems: Array<{ label: string; screen: Screen }> = [
  { label: 'How it works', screen: 'how-it-works' },
  { label: 'For beginners', screen: 'beginners' },
  { label: 'Our agents', screen: 'agents' },
  { label: 'Safety', screen: 'safety' },
  { label: 'Pricing', screen: 'pricing' },
]

const learnItems: Array<{ label: string; helper: string; screen: Screen }> = [
  { label: 'Investor basics', helper: 'Plain-English foundations', screen: 'beginners' },
  { label: 'How Northstar thinks', helper: 'Goals, risk, and next actions', screen: 'how-it-works' },
  { label: 'Safety notes', helper: 'Privacy and control model', screen: 'safety' },
]

export function MarketingNav({ setScreen, openAuth }: MarketingNavProps) {
  return (
    <nav className="north-nav" aria-label="Primary navigation">
      <button className="north-brand" type="button" onClick={() => setScreen?.('landing')}>
        <img className="north-logo-mark north-logo-mark--brand" src={northstarLogo} alt="" aria-hidden="true" />
        <span>Northstar</span>
      </button>

      <div className="north-nav__links">
        {navItems.map((item) => (
          <button type="button" key={item.screen} onClick={() => setScreen?.(item.screen)}>
            {item.label}
          </button>
        ))}

        <div className="north-learn-menu">
          <button className="north-learn-menu__trigger" type="button" aria-haspopup="menu">
            Learn <CaretDown size={14} />
          </button>
          <div className="north-learn-menu__panel" role="menu" aria-label="Learn menu">
            {learnItems.map((item) => (
              <button type="button" role="menuitem" key={item.label} onClick={() => setScreen?.(item.screen)}>
                <strong>{item.label}</strong>
                <span>{item.helper}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="north-nav__actions">
        <button type="button" onClick={() => openAuth ? openAuth('login') : setScreen?.('signin')}>Log in</button>
        <button className="north-nav__cta" type="button" onClick={() => openAuth ? openAuth('register') : setScreen?.('signin')}>
          Get started
        </button>
      </div>
    </nav>
  )
}
