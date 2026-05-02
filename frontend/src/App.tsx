import { useCallback, useEffect, useState } from 'react'
import { useCalmVestWorkspace } from './hooks/useCalmVestWorkspace'
import { DashboardPage } from './pages/DashboardPage'
import { GoalsPage } from './pages/GoalsPage'
import { LandingPage } from './pages/LandingPage'
import { MarketingPage } from './pages/MarketingPage'
import { MemoryPage } from './pages/MemoryPage'
import { ProfilePage } from './pages/ProfilePage'
import { SignInPage } from './pages/SignInPage'
import { WealthWorkspacePage } from './pages/WealthWorkspacePage'
import { apiJson } from './lib/api'
import type { Screen } from './types/screens'
import type { MemoryStatusResponse } from '@calmvest/shared'
import './styles/index.css'

const screenRoutes = {
  landing: '/landing',
  'how-it-works': '/how-it-works',
  beginners: '/beginners',
  agents: '/agents',
  safety: '/safety',
  pricing: '/pricing',
  signin: '/login',
  workspace: '/workspace/connect',
  profile: '/profile',
  memory: '/memory',
  goals: '/goals',
  dashboard: '/dashboard',
} as const

const pathScreens = Object.fromEntries(
  Object.entries(screenRoutes).map(([screen, route]) => [route, screen]),
) as Record<string, keyof typeof screenRoutes>

const demoUserId = 'maya-patel-demo'
const activeUserKey = 'northstar.activeUserId'

function App() {
  const { screen, setScreen, error, screenProps } = useCalmVestWorkspace()
  const [hash, setHash] = useState(() => window.location.hash)
  const [path, setPath] = useState(() => window.location.pathname)
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register')

  const navigateTo = useCallback((nextScreen: Screen) => {
    const nextPath = screenRoutes[nextScreen] ?? '/'
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    setScreen(nextScreen)
  }, [setScreen])

  useEffect(() => {
    const syncLocation = () => {
      setHash(window.location.hash)
      setPath(window.location.pathname)
    }
    window.addEventListener('hashchange', syncLocation)
    window.addEventListener('popstate', syncLocation)
    return () => {
      window.removeEventListener('hashchange', syncLocation)
      window.removeEventListener('popstate', syncLocation)
    }
  }, [])

  useEffect(() => {
    if (path === '/workspace/home') {
      window.history.replaceState({}, '', '/dashboard')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }
    const routedScreen = pathScreens[path]
    if (routedScreen && routedScreen !== screen) {
      setScreen(routedScreen)
    }
    if (path === '/' && screen !== 'landing') {
      setScreen('landing')
    }
  }, [path, screen, setScreen])

  useEffect(() => {
    if (!['/dashboard', '/profile', '/memory', '/goals'].includes(path)) return
    const activeUserId = localStorage.getItem(activeUserKey)
    if (!activeUserId || activeUserId === demoUserId) return

    let cancelled = false
    void apiJson<MemoryStatusResponse>(`/api/memory/status?userId=${encodeURIComponent(activeUserId)}`)
      .then((status) => {
        if (cancelled || status.hasMemory) return
        navigateTo('workspace')
      })
      .catch(() => {
        if (!cancelled) navigateTo('workspace')
      })

    return () => {
      cancelled = true
    }
  }, [navigateTo, path])

  function openAuth(mode: 'register' | 'login') {
    setAuthMode(mode)
    navigateTo('signin')
  }

  if (
    path === '/onboarding' ||
    path === '/workspace' ||
    path.startsWith('/workspace/') ||
    hash === '#workspace' ||
    hash.startsWith('#workspace/')
  ) {
    return <WealthWorkspacePage />
  }

  if (path === '/login' || path === '/auth') {
    return <SignInPage setScreen={navigateTo} initialMode={authMode} />
  }

  return (
    <main className="calmvest-root">
      {error ? <div className="error-toast">{error}</div> : null}
      {screen === 'landing' ? <LandingPage setScreen={navigateTo} openAuth={openAuth} graph={screenProps.graph} /> : null}
      {screen === 'how-it-works' ? <MarketingPage page="how-it-works" setScreen={navigateTo} openAuth={openAuth} /> : null}
      {screen === 'beginners' ? <MarketingPage page="beginners" setScreen={navigateTo} openAuth={openAuth} /> : null}
      {screen === 'agents' ? <MarketingPage page="agents" setScreen={navigateTo} openAuth={openAuth} /> : null}
      {screen === 'safety' ? <MarketingPage page="safety" setScreen={navigateTo} openAuth={openAuth} /> : null}
      {screen === 'pricing' ? <MarketingPage page="pricing" setScreen={navigateTo} openAuth={openAuth} /> : null}
      {screen === 'signin' ? <SignInPage setScreen={navigateTo} initialMode={authMode} /> : null}
      {screen === 'profile' ? <ProfilePage {...screenProps} /> : null}
      {screen === 'memory' ? <MemoryPage {...screenProps} /> : null}
      {screen === 'goals' ? <GoalsPage {...screenProps} /> : null}
      {screen === 'dashboard' ? <DashboardPage {...screenProps} /> : null}
    </main>
  )
}

export default App
