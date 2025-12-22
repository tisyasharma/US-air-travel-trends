import { useEffect } from 'react'
import { renderSeasonalCapacity } from '../visualizations/seasonal-capacity.js'
import { debounce } from '../utils/helpers.js'

function SeasonalCapacity() {
  useEffect(() => {
    renderSeasonalCapacity()

    const handleResize = debounce(() => {
      renderSeasonalCapacity()
    }, 250)

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSavePNG = () => {
    const container = document.getElementById('seasonalChart')
    if (!container) return

    const svgs = container.querySelectorAll('svg')
    if (!svgs.length) return

    // Create a canvas large enough for both charts
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    let totalWidth = 0
    let maxHeight = 0

    // Calculate total dimensions
    svgs.forEach(svg => {
      totalWidth += svg.clientWidth || 0
      maxHeight = Math.max(maxHeight, svg.clientHeight || 0)
    })

    canvas.width = totalWidth + 20 // gap between charts
    canvas.height = maxHeight

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let xOffset = 0

    // Draw each SVG onto the canvas
    svgs.forEach((svg, i) => {
      const svgData = new XMLSerializer().serializeToString(svg)
      const img = new Image()

      img.onload = () => {
        ctx.drawImage(img, xOffset, 0)
        xOffset += svg.clientWidth + 20

        // Download after last image is drawn
        if (i === svgs.length - 1) {
          const pngFile = canvas.toDataURL('image/png')
          const downloadLink = document.createElement('a')
          downloadLink.download = 'seasonal-capacity.png'
          downloadLink.href = pngFile
          downloadLink.click()
        }
      }

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    })
  }

  return (
    <>
      <section id="seasonal-capacity" className="section">
        <div className="container">
          <div className="section__head" data-aos="fade-up">
            <div>
              <p className="kicker">Capacity Analysis</p>
              <h3>Seasonal Capacity Patterns</h3>
              <p className="muted">
                Explore how load factor varies by season. Brush the scatter plot to filter the histogram and examine efficiency distributions for specific regions.
              </p>
            </div>
            <div className="map-controls">
              <button className="btn btn--ghost" onClick={handleSavePNG}>Save PNG</button>
            </div>
          </div>

          <div id="seasonalChart" className="viz-card"></div>

          <p className="caption">
            Brushing over the scatterplot filters the histogram on the right to show only points from the selected region. Point size represents departures performed, color indicates load factor, and shape denotes season.
          </p>
        </div>
      </section>

      <section id="viz-takeaways" className="section section--alt">
        <div className="container" data-aos="fade-up">
          <h2 className="kicker">Visualization Takeaways</h2>
          <div className="viz-block">
            <h3>Seasonal Capacity Patterns (Scatter + Histogram)</h3>
            <p>
              The scatterplot and histogram show relationships between passenger volume, available seats, and load factor across seasons. Higher-capacity regions tend to reach higher load factors, especially during summer. Brushing enables users to explore how load factor distributions change for specific regions or seasons.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default SeasonalCapacity
