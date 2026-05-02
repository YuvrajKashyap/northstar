import { useState } from 'react'
import { LandingPage } from './pages/LandingPage'
import { ProductApp, type Screen } from './pages/ProductApp'
import './styles/index.css'

function App() {
  const [screen, setScreen] = useState<'landing' | Screen>('landing')

  if (screen !== 'landing') {
    return (
      <main className="calmvest-root">
        <ProductApp initialScreen={screen} onHome={() => setScreen('landing')} />
      </main>
    )
  }

  return (
    <main className="calmvest-root">
      <LandingPage
        onGetStarted={() => setScreen('onboarding')}
        onLogin={() => setScreen('signin')}
        onDemo={() => setScreen('dashboard')}
      />
    </main>
  )
}

export default App
