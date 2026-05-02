import type { ReactNode } from 'react'
import { Bell, CirclesThreePlus, GearSix, MagnifyingGlass, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import { navItems } from '../../data/demoContent'
import type { Screen } from '../../types/screens'
import { Logo } from '../brand/Logo'
import { LiveDot } from '../common/LiveDot'
import { ProfileChip } from '../common/ProfileChip'

export function AppChrome({
  children,
  active,
  setScreen,
}: {
  children: ReactNode
  active: 'dashboard' | 'profile' | 'memory' | 'goals' | 'onboarding'
  setScreen: (screen: Screen) => void
}) {
  return (
    <div className="os-shell">
      <aside className="sidebar">
        <Logo />
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              (active === 'dashboard' && item.screen === 'dashboard') ||
              (active === 'goals' && item.screen === 'goals') ||
              (active === 'memory' && item.screen === 'memory') ||
              (active === 'profile' && item.label === 'Agents')
            return (
              <button className={isActive ? 'active' : ''} type="button" key={item.label} onClick={() => setScreen(item.screen)}>
                <Icon size={22} /> {item.label}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-status">
          <button type="button"><CirclesThreePlus size={20} /> Studio <span>BETA</span></button>
          <button type="button"><GearSix size={20} /> Settings</button>
          <button type="button"><ShieldCheck size={20} /> Help & Docs</button>
          <div><LiveDot /> System Status <small>All systems calm</small></div>
        </div>
      </aside>
      <div className="os-main">
        <header className="command-bar">
          <div className="search-box"><MagnifyingGlass size={18} /> Search memories... <kbd>Cmd K</kbd></div>
          <button type="button"><Sparkle size={20} /></button>
          <button type="button"><Bell size={20} /></button>
          <ProfileChip />
        </header>
        {children}
      </div>
    </div>
  )
}
