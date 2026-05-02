import { useEffect, useState } from 'react'
import { useCalmVestWorkspace } from './hooks/useCalmVestWorkspace'
import { DashboardPage } from './pages/DashboardPage'
import { GoalsPage } from './pages/GoalsPage'
import { LandingPage } from './pages/LandingPage'
import { MarketingPage } from './pages/MarketingPage'
import { MemoryPage } from './pages/MemoryPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProfilePage } from './pages/ProfilePage'
import { SignInPage } from './pages/SignInPage'
import { WealthWorkspacePage } from './pages/WealthWorkspacePage'
import './styles/index.css'

function App() {
  const { screen, setScreen, error, screenProps } = useCalmVestWorkspace()
  const [hash, setHash] = useState(() => window.location.hash)
  const [path, setPath] = useState(() => window.location.pathname)
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register')

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

  function openAuth(mode: 'register' | 'login') {
    setAuthMode(mode)
    window.history.pushState({}, '', '/login')
    setPath('/login')
    setScreen('signin')
  }

  function navigateFromRoute(nextScreen: Parameters<typeof setScreen>[0]) {
    if (path === '/login' || path === '/auth') {
      window.history.pushState({}, '', '/')
      setPath('/')
    }
    setScreen(nextScreen)
  }

  if (hash === '#workspace' || hash.startsWith('#workspace/')) {
    return <WealthWorkspacePage />
  }

  if (path === '/login' || path === '/auth') {
    return <SignInPage setScreen={navigateFromRoute} initialMode={authMode} />
  }

  return (
    <main className="calmvest-root">
      {error ? <div className="error-toast">{error}</div> : null}
      {screen === 'landing' ? <LandingPage setScreen={setScreen} openAuth={openAuth} graph={screenProps.graph} /> : null}
      {screen === 'how-it-works' ? <MarketingPage page="how-it-works" setScreen={setScreen} openAuth={openAuth} /> : null}
      {screen === 'beginners' ? <MarketingPage page="beginners" setScreen={setScreen} openAuth={openAuth} /> : null}
      {screen === 'agents' ? <MarketingPage page="agents" setScreen={setScreen} openAuth={openAuth} /> : null}
      {screen === 'safety' ? <MarketingPage page="safety" setScreen={setScreen} openAuth={openAuth} /> : null}
      {screen === 'pricing' ? <MarketingPage page="pricing" setScreen={setScreen} openAuth={openAuth} /> : null}
      {screen === 'signin' ? <SignInPage setScreen={setScreen} initialMode={authMode} /> : null}
      {screen === 'onboarding' ? <OnboardingPage {...screenProps} /> : null}
      {screen === 'profile' ? <ProfilePage {...screenProps} /> : null}
      {screen === 'memory' ? <MemoryPage {...screenProps} /> : null}
      {screen === 'goals' ? <GoalsPage {...screenProps} /> : null}
      {screen === 'dashboard' ? <DashboardPage {...screenProps} /> : null}
    </main>
  )
}

export default App
