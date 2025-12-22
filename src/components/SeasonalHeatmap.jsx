import { useEffect, useRef } from 'react'
import { renderSeasonalHeatmap, cleanupSeasonalHeatmap } from '../visualizations/seasonal-heatmap'

function SeasonalHeatmap() {
  const rendered = useRef(false)

  useEffect(() => {
    // Guard against double-invoke in React StrictMode
    if (rendered.current) return
    rendered.current = true

    renderSeasonalHeatmap()
    return () => {
      rendered.current = false
      cleanupSeasonalHeatmap()
    }
  }, [])

  const handleSavePNG = () => {
    const container = document.getElementById('seasonHeatmap')
    if (!container) return

    const svg = container.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = svg.clientWidth || 960
    canvas.height = svg.clientHeight || 600

    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = 'seasonal-heatmap.png'
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <>
      <section id="seasonality" className="section section--alt">
        <div className="container">
          <div className="section__head" data-aos="fade-up">
            <div>
              <p className="kicker">Seasonality</p>
              <h3>Seasonal Passenger Heatmap</h3>
              <p className="muted">
                A month-by-year grid highlighting seasonal travel peaks, disruptions, and long-term recovery trends.
              </p>
            </div>
            <div className="map-controls">
              <button className="btn btn--ghost" onClick={handleSavePNG}>Save PNG</button>
            </div>
          </div>

          <div id="seasonHeatmap" className="viz-card" data-aos="fade-up"></div>

          <p className="caption">
            Figure 3. Darker colors represent months with higher passenger counts.
          </p>
        </div>
      </section>

      <section id="viz-takeaways" className="section section--alt">
        <div className="container" data-aos="fade-up">
          <h2 className="kicker">Visualization Takeaways</h2>
          <div className="viz-block">
            <h3>Seasonal Passenger Heatmap</h3>
            <p>
              This heatmap reveals seasonal cycles in U.S. air travel, with darker shades showing summer peaks and lighter shades indicating slower months. Dramatic disruptions—including 9/11, the Great Recession, and COVID-19—appear as extremely light periods. This visualization shows long-term recovery and seasonality clearly.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default SeasonalHeatmap
