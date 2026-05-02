import type { MouseEvent } from 'react'
import { useCalmVestDemo } from './hooks/useCalmVestDemo'
import { DashboardPage } from './pages/DashboardPage'
import { GoalsPage } from './pages/GoalsPage'
import { LandingPage } from './pages/LandingPage'
import { MemoryPage } from './pages/MemoryPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProfilePage } from './pages/ProfilePage'
import { SignInPage } from './pages/SignInPage'
import type { Screen } from './types/screens'
import './styles/index.css'

function App() {
  const { screen, setScreen, error, screenProps } = useCalmVestDemo()

  function handleLandingClick(event: MouseEvent<HTMLElement>) {
    const button = (event.target as HTMLElement).closest('button')
    const text = button?.textContent?.trim().toLowerCase()
    const routeByText: Record<string, Screen> = {
      'log in': 'signin',
      'get started': 'onboarding',
      'build my plan': 'onboarding',
      'see how it works': 'dashboard',
    }
    if (text && routeByText[text]) setScreen(routeByText[text])
  }

  return (
    <main className="calmvest-root">
      {error ? <div className="error-toast">{error}</div> : null}
      {screen === 'landing' ? (
        <section onClick={handleLandingClick}>
          <LandingPage />
        </section>
      ) : null}
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
