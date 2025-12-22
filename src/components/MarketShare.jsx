import { useEffect } from 'react'
import { renderMarketShare } from '../visualizations/market-share'
import { dataCache } from '../hooks/useData'
import { debounce } from '../utils/helpers'

function MarketShare() {
  useEffect(() => {
    // Render market share chart when data is available
    if (dataCache.marketShare.length > 0) {
      renderMarketShare({ preserveEnabled: false })
    }
  }, [])

  useEffect(() => {
    // Re-render chart on resize so the SVG fills the card after layout shifts
    const el = document.getElementById('marketShareChart')
    if (!el) return
    const handleResize = debounce(() => {
      if (dataCache.marketShare.length > 0) {
        renderMarketShare({ preserveEnabled: true })
      }
    }, 150)
    const observer = new ResizeObserver(handleResize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleSavePNG = () => {
    const container = document.getElementById('marketShareChart')
    if (!container) return

    const svg = container.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = svg.clientWidth || 960
    canvas.height = svg.clientHeight || 360

    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = 'market-share.png'
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <>
      <section id="market" className="section">
        <div className="container">
          <div className="section__head" data-aos="fade-up">
            <div>
              <p className="kicker">Market Share</p>
              <h3>Airline Market Share (100% Stacked)</h3>
              <p className="muted">
                Relative domestic passenger share by carrier, normalized to 100% each month so you can spot winners/losers regardless of total volume.
              </p>
            </div>
            <div className="map-controls">
              <button className="btn btn--ghost" onClick={handleSavePNG}>Save PNG</button>
            </div>
          </div>

          <div className="viz-card viz-card--market" data-aos="fade-up">
            <div className="market-share-inner">
              <div className="legend-panel">
                <div className="legend-title">Filter carriers</div>
                <div id="marketLegend" className="stacked-legend"></div>
              </div>
              <div id="marketShareChart" className="chart-area"></div>
            </div>
          </div>

          <p className="caption">
            Figure 2. Each band shows that carrier's percentage of the domestic market; "Other" aggregates smaller airlines.
          </p>
        </div>
      </section>

      <section id="viz-takeaways" className="section section--alt">
        <div className="container" data-aos="fade-up">
          <h2 className="kicker">Visualization Takeaways</h2>
          <div className="viz-block">
            <h3>Airline Market Share (100% Stacked Area Chart)</h3>
            <p>
              The stacked area chart shows how U.S. airline market share has shifted over the last 25 years. Each month is normalized to 100%, making airline comparisons straightforward. Major consolidation trends, volatility during major events, and the dominance of major carriers become visually apparent.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default MarketShare
