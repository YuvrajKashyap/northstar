import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import {
  Bell,
  CirclesThreePlus,
  GearSix,
  MagnifyingGlass,
  Question,
  Sparkle,
} from '@phosphor-icons/react'
import { navItems } from '../../data/workspaceContent'
import type { Screen } from '../../types/screens'
import { workspaceProfileFromGraph } from '../../lib/workspaceProfile'
import type { MemoryGraph } from '@calmvest/shared'
import { Logo } from '../brand/Logo'
import { LiveDot } from '../common/LiveDot'
import { ProfileChip } from '../common/ProfileChip'
import { WorkspaceModal } from './WorkspaceModal'

type UtilityModal = 'studio' | 'settings' | 'help' | null

export function AppChrome({
  children,
  active,
  setScreen,
  commandExtras,
  graph,
}: {
  children: ReactNode
  active: 'dashboard' | 'profile' | 'memory' | 'goals'
  setScreen: (screen: Screen) => void
  /** Extra controls in the command row (e.g. Agent activity) */
  commandExtras?: ReactNode
  graph?: MemoryGraph | null
}) {
  const [utility, setUtility] = useState<UtilityModal>(null)
  const searchShortcut = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Ctrl K'
    return /Mac|iPhone|iPad/i.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K'
  }, [])

  const { name: profileName, role: profileRole } = workspaceProfileFromGraph(graph ?? null)

  return (
    <div className={`os-shell os-shell--workspace os-shell--${active}`}>
      <header className="workspace-shell-header">
        <div className="workspace-shell-header__brand">
          <Logo />
        </div>
        <nav className="workspace-nav" aria-label="Workspace">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              (active === 'dashboard' && item.screen === 'dashboard') ||
              (active === 'goals' && item.screen === 'goals') ||
              (active === 'memory' && item.screen === 'memory') ||
              (active === 'profile' && item.label === 'Agents')
            return (
              <button
                className={isActive ? 'active' : ''}
                type="button"
                key={item.label}
                onClick={() => setScreen(item.screen)}
              >
                <Icon size={18} weight="regular" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="workspace-shell-header__tools">
          <button
            className="workspace-icon-btn workspace-icon-btn--quiet"
            type="button"
            onClick={() => setUtility('studio')}
          >
            <CirclesThreePlus size={20} weight="regular" />
            <span>Studio</span>
            <em>BETA</em>
          </button>
          <button
            className="workspace-icon-btn workspace-icon-btn--quiet"
            type="button"
            onClick={() => setUtility('settings')}
          >
            <GearSix size={20} weight="regular" />
            <span>Settings</span>
          </button>
          <button
            className="workspace-icon-btn workspace-icon-btn--quiet"
            type="button"
            onClick={() => setUtility('help')}
          >
            <Question size={20} weight="regular" />
            <span>Help</span>
          </button>
          <div className="workspace-shell-header__profile-slot">
            <ProfileChip name={profileName} role={profileRole} onClick={() => setScreen('profile')} />
          </div>
        </div>
      </header>

      <div className="os-main">
        <div className="command-bar">
          <div className="search-box" role="search">
            <MagnifyingGlass size={18} weight="regular" />
            <span>Search memories...</span>
            <kbd>{searchShortcut}</kbd>
          </div>
          {commandExtras ? <div className="command-bar__extras">{commandExtras}</div> : null}
          <button className="command-icon-btn" type="button" aria-label="Assistant">
            <Sparkle size={20} weight="regular" />
          </button>
          <button className="command-icon-btn" type="button" aria-label="Notifications">
            <Bell size={20} weight="regular" />
          </button>
        </div>
        {children}
      </div>

      <WorkspaceModal
        open={utility === 'studio'}
        title="Northstar Studio"
        onClose={() => setUtility(null)}
      >
        <p className="workspace-modal__copy">
          Experimental memory and scenario tools live here. This area is in beta—save often and expect rapid
          iteration.
        </p>
        <p className="workspace-modal__status">
          <LiveDot /> System status: all systems calm
        </p>
      </WorkspaceModal>

      <WorkspaceModal
        open={utility === 'settings'}
        title="Settings"
        onClose={() => setUtility(null)}
      >
        <p className="workspace-modal__copy">
          Account, notifications, data connections, and security preferences will appear here in a future release.
        </p>
      </WorkspaceModal>

      <WorkspaceModal open={utility === 'help'} title="Help and documentation" onClose={() => setUtility(null)}>
        <p className="workspace-modal__copy">
          Product guides, API notes, and support channels are being prepared. For now, use the Memory Graph to
          inspect what Northstar remembers about you.
        </p>
      </WorkspaceModal>
    </div>
  )
}
