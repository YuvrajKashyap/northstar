import { useCallback, useEffect, useState } from 'react'
import { useCalmVestWorkspace } from './hooks/useCalmVestWorkspace'
import { DashboardPage } from './pages/DashboardPage'
import { GoalsPage } from './pages/GoalsPage'
import { InsightsPage } from './pages/InsightsPage'
import { LandingPage } from './pages/LandingPage'
import { MarketingPage } from './pages/MarketingPage'
import { MemoryPage } from './pages/MemoryPage'
import { PlansPage } from './pages/PlansPage'
import { ProfilePage } from './pages/ProfilePage'
import { ScenarioCanvasPage } from './pages/ScenarioCanvasPage'
import { SignInPage } from './pages/SignInPage'
import { WealthWorkspacePage } from './pages/WealthWorkspacePage'
import { WorkspaceFeaturePage } from './pages/WorkspaceFeaturePage'
import { getMemoryStatus } from './lib/wealthApi'
import type { Screen } from './types/screens'
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
  'agent-runs': '/agents/workspace',
  plans: '/plans',
  scenarios: '/scenarios',
  insights: '/insights',
  dashboard: '/dashboard',
  north: '/north',
} as const

const pathScreens = Object.fromEntries(
  Object.entries(screenRoutes).map(([screen, route]) => [route, screen]),
) as Record<string, keyof typeof screenRoutes>

const memoryGatedScreens = new Set<Screen>([
  'profile',
  'memory',
  'goals',
  'agent-runs',
  'plans',
  'scenarios',
  'insights',
  'dashboard',
  'north',
])

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
    if (!memoryGatedScreens.has(screen)) return

    const userId = localStorage.getItem('northstar.activeUserId')
    if (!userId) return

    let cancelled = false
    void getMemoryStatus(userId)
      .then((status) => {
        if (cancelled || (status.hasMemory && status.hasContext)) return
        navigateTo('workspace')
      })
      .catch(() => {
        if (!cancelled) navigateTo('workspace')
      })

    return () => {
      cancelled = true
    }
  }, [navigateTo, screen])

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
      {screen === 'profile' ? <ProfilePage {...screenProps} setScreen={navigateTo} /> : null}
      {screen === 'memory' ? <MemoryPage {...screenProps} setScreen={navigateTo} /> : null}
      {screen === 'goals' ? <GoalsPage {...screenProps} setScreen={navigateTo} /> : null}
      {screen === 'agent-runs' ? <WorkspaceFeaturePage {...screenProps} setScreen={navigateTo} page="agent-runs" /> : null}
      {screen === 'plans' ? <PlansPage {...screenProps} setScreen={navigateTo} /> : null}
      {screen === 'scenarios' ? <ScenarioCanvasPage {...screenProps} setScreen={navigateTo} /> : null}
      {screen === 'insights' ? <InsightsPage {...screenProps} setScreen={navigateTo} /> : null}
      {screen === 'dashboard' || screen === 'north' ? <DashboardPage {...screenProps} setScreen={navigateTo} /> : null}
    </main>
  )
}

export default App
