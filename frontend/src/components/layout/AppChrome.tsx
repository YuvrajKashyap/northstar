import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  CaretRight,
  CirclesThreePlus,
  CreditCard,
  GearSix,
  MagnifyingGlass,
  Question,
  SignOut,
  Sparkle,
  UserCircle,
  Wallet,
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const [sessionProfile, setSessionProfile] = useState(() => readSessionProfile())
  const searchShortcut = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Ctrl K'
    return /Mac|iPhone|iPad/i.test(navigator.userAgent) ? 'Cmd K' : 'Ctrl K'
  }, [])

  useEffect(() => {
    const syncProfile = () => setSessionProfile(readSessionProfile())
    window.addEventListener('northstar-auth', syncProfile)
    window.addEventListener('storage', syncProfile)
    return () => {
      window.removeEventListener('northstar-auth', syncProfile)
      window.removeEventListener('storage', syncProfile)
    }
  }, [])

  useEffect(() => {
    if (!accountMenuOpen) return
    const closeOnPointer = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false)
    }
    window.addEventListener('pointerdown', closeOnPointer)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnPointer)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountMenuOpen])

  const graphProfile = workspaceProfileFromGraph(graph ?? null)
  const profileName = sessionProfile.name || graphProfile.name
  const profileRole = graphProfile.role
  const profileEmail = sessionProfile.email || 'No email on file'

  function openAccountScreen(screen: Screen) {
    setAccountMenuOpen(false)
    setScreen(screen)
  }

  function signOut() {
    localStorage.removeItem('northstar.activeUserId')
    localStorage.removeItem('northstar.activeUserEmail')
    localStorage.removeItem('northstar.activeUserName')
    localStorage.removeItem('northstar.accessToken')
    window.dispatchEvent(new Event('northstar-auth'))
    window.history.pushState({}, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
    setScreen('signin')
  }

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
            <div className="account-menu-wrap" ref={accountMenuRef}>
              <ProfileChip
                name={profileName}
                role={profileRole}
                onClick={() => setAccountMenuOpen((open) => !open)}
                expanded={accountMenuOpen}
              />
              {accountMenuOpen ? (
                <div className="account-menu" role="menu" aria-label="Account menu">
                  <div className="account-menu__identity">
                    <span className="account-menu__avatar">{getInitials(profileName)}</span>
                    <div>
                      <strong>{profileName}</strong>
                      <small>{profileEmail}</small>
                    </div>
                  </div>
                  <button type="button" role="menuitem" onClick={() => openAccountScreen('profile')}>
                    <UserCircle size={18} weight="regular" />
                    Profile
                    <CaretRight size={15} weight="regular" />
                  </button>
                  <button type="button" role="menuitem" onClick={() => openAccountScreen('goals')}>
                    <Wallet size={18} weight="regular" />
                    Goals and plans
                    <CaretRight size={15} weight="regular" />
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setUtility('settings') }}>
                    <CreditCard size={18} weight="regular" />
                    Billing and data
                    <CaretRight size={15} weight="regular" />
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setUtility('help') }}>
                    <Question size={18} weight="regular" />
                    Help center
                    <CaretRight size={15} weight="regular" />
                  </button>
                  <button className="account-menu__signout" type="button" role="menuitem" onClick={signOut}>
                    <SignOut size={18} weight="regular" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
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

function readSessionProfile() {
  return {
    name: localStorage.getItem('northstar.activeUserName') ?? '',
    email: localStorage.getItem('northstar.activeUserEmail') ?? '',
  }
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
