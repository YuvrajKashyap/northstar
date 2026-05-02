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

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  function openAuth(_mode: 'register' | 'login') {
    setScreen('signin')
  }

  if (hash === '#workspace') {
    return <WealthWorkspacePage />
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
      {screen === 'signin' ? <SignInPage setScreen={setScreen} /> : null}
      {screen === 'onboarding' ? <OnboardingPage {...screenProps} /> : null}
      {screen === 'profile' ? <ProfilePage {...screenProps} /> : null}
      {screen === 'memory' ? <MemoryPage {...screenProps} /> : null}
      {screen === 'goals' ? <GoalsPage {...screenProps} /> : null}
      {screen === 'dashboard' ? <DashboardPage {...screenProps} /> : null}
    </main>
  )
}

export default App
