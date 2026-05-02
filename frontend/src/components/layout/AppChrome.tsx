import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  CaretRight,
  ChatsCircle,
  CirclesThreePlus,
  CreditCard,
  GearSix,
  MagnifyingGlass,
  Question,
  SignOut,
  Sparkle,
  UserCircle,
} from '@phosphor-icons/react'
import { navItems } from '../../data/workspaceContent'
import type { Screen } from '../../types/screens'
import { workspaceProfileFromGraph } from '../../lib/workspaceProfile'
import type { AgentTraceEvent, MemoryGraph, MemoryGraphNode } from '@calmvest/shared'
import { Logo } from '../brand/Logo'
import { AgentRail } from '../dashboard/AgentRail'
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
  agentAnswer = '',
  scenarioTrace = [],
  runAgent,
  runScenario,
  busyStep,
  showAgentDrawer = true,
  onSelectMemoryNode,
}: {
  children: ReactNode
  active: Screen
  setScreen: (screen: Screen) => void
  /** Extra controls in the command row (e.g. Agent activity) */
  commandExtras?: ReactNode
  graph?: MemoryGraph | null
  agentAnswer?: string
  scenarioTrace?: AgentTraceEvent[]
  runAgent?: (message: string) => void
  runScenario?: () => void
  busyStep?: string | null
  showAgentDrawer?: boolean
  onSelectMemoryNode?: (id: string) => void
}) {
  const [utility, setUtility] = useState<UtilityModal>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)
  const [memoryQuery, setMemoryQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
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

  useEffect(() => {
    if (!searchOpen) return
    const closeOnPointer = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('pointerdown', closeOnPointer)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnPointer)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [searchOpen])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgent)
      if (event.key.toLowerCase() !== 'k' || (isMac ? !event.metaKey : !event.ctrlKey)) return
      event.preventDefault()
      searchInputRef.current?.focus()
      setSearchOpen(true)
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const graphProfile = workspaceProfileFromGraph(graph ?? null)
  const profileName = sessionProfile.name || graphProfile.name
  const profileRole = graphProfile.role
  const profileEmail = sessionProfile.email || 'No email on file'
  const memoryResults = useMemo(() => searchMemoryGraph(graph ?? null, memoryQuery), [graph, memoryQuery])
  const shouldShowSearchResults = searchOpen && memoryQuery.trim().length > 0

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

  function openMemoryResult(result: MemorySearchResult) {
    setSearchOpen(false)
    setMemoryQuery('')
    if (result.nodeId) {
      onSelectMemoryNode?.(result.nodeId)
      setScreen('dashboard')
      return
    }
    setScreen('memory')
  }

  return (
    <div className={`os-shell os-shell--workspace os-shell--${active}${agentPanelOpen ? ' os-shell--agent-open' : ''}`}>
      <header className="workspace-shell-header">
        <div className="workspace-shell-header__brand">
          <Logo />
        </div>
        <nav className="workspace-nav" aria-label="Workspace">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = active === item.screen
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
          <div className={`search-box${searchOpen ? ' search-box--active' : ''}`} role="search" ref={searchRef}>
            <MagnifyingGlass size={18} weight="regular" />
            <input
              ref={searchInputRef}
              type="search"
              value={memoryQuery}
              onChange={(event) => {
                setMemoryQuery(event.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search memories..."
              aria-label="Search memories"
              aria-expanded={shouldShowSearchResults}
              aria-controls="memory-search-results"
              autoComplete="off"
            />
            <kbd>{searchShortcut}</kbd>
            {shouldShowSearchResults ? (
              <div className="memory-search-popover" id="memory-search-results" role="listbox">
                <div className="memory-search-popover__head">
                  <span>Memory results</span>
                  <strong>{memoryResults.length}</strong>
                </div>
                {memoryResults.length > 0 ? (
                  memoryResults.map((result) => (
                    <button
                      type="button"
                      key={`${result.type}-${result.nodeId ?? 'markdown'}-${result.title}`}
                      role="option"
                      onClick={() => openMemoryResult(result)}
                    >
                      <span className="memory-search-popover__kind">{result.type}</span>
                      <strong>{result.title}</strong>
                      <small>{result.snippet}</small>
                    </button>
                  ))
                ) : (
                  <div className="memory-search-popover__empty">
                    <strong>No matching memory yet</strong>
                    <small>Try a goal, risk word, account detail, or phrase from your questionnaire.</small>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          {commandExtras ? <div className="command-bar__extras">{commandExtras}</div> : null}
          <button className="command-icon-btn" type="button" aria-label="Notifications">
            <Bell size={20} weight="regular" />
          </button>
        </div>
        {children}

        {showAgentDrawer ? (
          <aside
            id="workspace-agent-drawer"
            className={`dashboard-agent-drawer${agentPanelOpen ? ' is-open' : ' is-collapsed'}`}
            aria-label="Agent chat and tools"
          >
            {!agentPanelOpen ? (
              <button
                className="dashboard-agent-drawer__peek"
                type="button"
                onClick={() => setAgentPanelOpen(true)}
              >
                <ChatsCircle size={22} weight="regular" aria-hidden />
                <span>Agent</span>
              </button>
            ) : (
              <>
                <div className="dashboard-agent-drawer__head">
                  <div className="dashboard-agent-drawer__masthead">
                    <span className="dashboard-agent-drawer__mark" aria-hidden>
                      <Sparkle size={17} weight="fill" />
                    </span>
                    <div>
                      <h2 className="dashboard-agent-drawer__title">Northstar agent</h2>
                      <p className="dashboard-agent-drawer__sub">Memory-aware replies with visible tool context</p>
                    </div>
                  </div>
                  <div className="dashboard-agent-drawer__signals" aria-label="Agent status">
                    <span>Live memory</span>
                    <span>Approval-first</span>
                  </div>
                  <button
                    className="dashboard-agent-drawer__collapse"
                    type="button"
                    onClick={() => setAgentPanelOpen(false)}
                    aria-label="Collapse agent panel"
                  >
                    <CaretRight size={20} weight="bold" aria-hidden />
                  </button>
                </div>
                <div className="dashboard-agent-drawer__body">
                  <AgentRail
                    hideHeading
                    panel
                    answer={agentAnswer}
                    trace={scenarioTrace}
                    runAgent={runAgent ?? (() => undefined)}
                    runScenario={runScenario ?? (() => undefined)}
                    busy={busyStep === 'scenario'}
                  />
                </div>
              </>
            )}
          </aside>
        ) : null}
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

type MemorySearchResult = {
  type: string
  title: string
  snippet: string
  nodeId?: string
  score: number
}

function searchMemoryGraph(graph: MemoryGraph | null, query: string): MemorySearchResult[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!graph || !normalizedQuery) return []
  const tokens = normalizedQuery.split(' ').filter(Boolean)
  const results: MemorySearchResult[] = []

  for (const node of graph.nodes) {
    const haystack = normalizeSearchText([node.label, node.kind, node.value, node.source, ...node.usedBy].join(' '))
    const score = scoreSearchMatch(haystack, normalizedQuery, tokens)
    if (score <= 0) continue
    results.push({
      type: labelForMemoryKind(node.kind),
      title: node.label,
      snippet: makeSearchSnippet(node.value || node.source || node.label, query),
      nodeId: node.id,
      score,
    })
  }

  const markdown = graph.memoryMarkdown?.trim()
  if (markdown) {
    const haystack = normalizeSearchText(markdown)
    const score = scoreSearchMatch(haystack, normalizedQuery, tokens)
    if (score > 0) {
      results.push({
        type: 'Memory document',
        title: 'Human-readable memory.md',
        snippet: makeSearchSnippet(markdown.replace(/^#+\s*/gm, ''), query),
        score: score - 0.25,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 8)
}

function scoreSearchMatch(haystack: string, query: string, tokens: string[]) {
  if (!haystack) return 0
  let score = haystack.includes(query) ? 6 : 0
  for (const token of tokens) {
    if (token.length < 2) continue
    if (haystack.includes(token)) score += 1
  }
  return score
}

function makeSearchSnippet(value: string, query: string) {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (!clean) return 'Saved memory context'
  const lower = clean.toLowerCase()
  const token = query.trim().toLowerCase().split(/\s+/).find(Boolean) ?? ''
  const index = token ? lower.indexOf(token) : -1
  const start = index > 36 ? index - 36 : 0
  const snippet = clean.slice(start, start + 150)
  return `${start > 0 ? '...' : ''}${snippet}${clean.length > start + 150 ? '...' : ''}`
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[_-]/g, ' ').replace(/[^\w\s$.,]/g, ' ').replace(/\s+/g, ' ').trim()
}

function labelForMemoryKind(kind: MemoryGraphNode['kind']) {
  const labels: Record<MemoryGraphNode['kind'], string> = {
    person: 'Profile',
    goal: 'Goal',
    risk: 'Risk',
    account: 'Account',
    tax: 'Tax',
    values: 'Values',
    cash_flow: 'Cash flow',
    communication: 'Communication',
  }
  return labels[kind]
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
