import { useEffect, useState } from 'react'
import { useCalmVestWorkspace } from './hooks/useCalmVestWorkspace'
import { DashboardPage } from './pages/DashboardPage'
import { GoalsPage } from './pages/GoalsPage'
import { LandingPage } from './pages/LandingPage'
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

  if (hash === '#workspace' || hash.startsWith('#workspace/')) {
    return <WealthWorkspacePage />
  }

  return (
    <main className="calmvest-root">
      {error ? <div className="error-toast">{error}</div> : null}
      {screen === 'landing' ? <LandingPage /> : null}
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
