import { useEffect } from 'react'
import { useData } from './hooks/useData'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import Overview from './components/Overview'
import RoutesMap from './components/RoutesMap'
import MarketShare from './components/MarketShare'
import SeasonalHeatmap from './components/SeasonalHeatmap'
import SeasonalCapacity from './components/SeasonalCapacity'
import TravelTimeline from './components/TravelTimeline'
import Conclusion from './components/Conclusion'
import Methods from './components/Methods'
import References from './components/References'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'

function App() {
  const { loading, error } = useData()

  useEffect(() => {
    // Initialize AOS (Animate On Scroll)
    if (window.AOS) {
      window.AOS.init({ once: true, duration: 600, easing: 'ease-out' })
    }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--gray-100)' }}>
        <div>Loading data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--red)' }}>
        <div>Error loading data: {error}</div>
      </div>
    )
  }

  return (
    <>
      <Navigation />
      <Hero />
      <Overview />
      <RoutesMap />
      <MarketShare />
      <SeasonalHeatmap />
      <SeasonalCapacity />
      <TravelTimeline />
      <Conclusion />
      <Methods />
      <References />
      <Footer />
      <BackToTop />
    </>
  )
}

export default App
