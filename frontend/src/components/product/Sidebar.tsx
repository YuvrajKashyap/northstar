import {
  Briefcase,
  CalendarCheck,
  CirclesThreePlus,
  Graph,
  Lock,
  Plus,
  Pulse,
  Target,
  Wallet,
} from '@phosphor-icons/react'
import { navItems } from '../../data/product'
import type { HealthResponse, Screen } from '../../types/product'
import { Brand } from './Brand'

const navIcons = {
  graph: CirclesThreePlus,
  agents: Graph,
  goals: Target,
  plans: CalendarCheck,
  scenarios: Briefcase,
  insights: Pulse,
  vault: Wallet,
}

export function Sidebar({
  current,
  setScreen,
  onHome,
  health,
}: {
  current: Screen
  setScreen: (screen: Screen) => void
  onHome: () => void
  health: HealthResponse | null
}) {
  return (
    <aside className="sidebar">
      <Brand onClick={onHome} />
      <nav className="sidebar-nav">
        {navItems.map(({ screen, label, icon }) => {
          const Icon = navIcons[icon]
          return (
            <button
              className={current === screen ? 'active' : ''}
              type="button"
              key={label}
              onClick={() => setScreen(screen)}
            >
              <Icon size={20} /> {label}
            </button>
          )
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="studio-link" type="button" onClick={() => setScreen('onboarding')}>
          <Plus size={18} /> New memory update
        </button>
        <div className="sidebar-status">
          <span className="sidebar-lock">
            <Lock size={14} /> Private workspace
          </span>
          <strong>{health?.service ?? 'Northstar API'}</strong>
          <span className="sidebar-version">
            {health?.openrouter.configured ? 'Model routing ready' : 'Demo model mode'}
          </span>
        </div>
      </div>
    </aside>
  )
}
