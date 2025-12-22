import { useEffect } from 'react'
import { renderTravelTimeline } from '../visualizations/travel-timeline.js'
import { debounce } from '../utils/helpers.js'

function TravelTimeline() {
  useEffect(() => {
    renderTravelTimeline()

    const handleResize = debounce(() => {
      renderTravelTimeline()
    }, 250)

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSavePNG = () => {
    const container = document.getElementById('timelineChart')
    if (!container) return

    const svg = container.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = svg.clientWidth || 960
    canvas.height = svg.clientHeight || 500

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = 'travel-timeline.png'
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <>
      <section id="travel-timeline" className="section">
        <div className="container">
          <div className="section__head" data-aos="fade-up">
            <div>
              <p className="kicker">Long-Term Trends</p>
              <h3>Travel Volume Index with Historical Events</h3>
              <p className="muted">
                This annotated timeline highlights how major economic, geopolitical, and industry events
                shaped U.S. air travel demand over the last two decades.
              </p>
            </div>
            <div className="map-controls">
              <button className="btn btn--ghost" onClick={handleSavePNG}>
                Save PNG
              </button>
            </div>
          </div>

          <div id="timelineChart" className="viz-card"></div>

          <p className="caption">
            Major historical events—such as 9/11, the Great Recession, industry mergers, and the onset of COVID-19—correspond strongly to spikes and drops in national passenger volume.
          </p>
        </div>
      </section>

      <section id="viz-takeaways" className="section section--alt">
        <div className="container" data-aos="fade-up">
          <h2 className="kicker">Visualization Takeaways</h2>
          <div className="viz-block">
            <h3>Travel Volume Index with Historical Events</h3>
            <p>
              This annotated line chart displays how national air travel volume has changed relative to 1999 levels. Key events such as 9/11, recessions, mergers, and COVID-19 are clearly labeled, illustrating how economic and geopolitical shocks directly influence air travel.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default TravelTimeline
