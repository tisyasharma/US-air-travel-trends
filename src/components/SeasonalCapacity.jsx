import { useEffect } from 'react'

function SeasonalCapacity() {
  useEffect(() => {
    // Load Vega/Altair visualization
    fetch('/data/linked_scatter_histogram.json')
      .then(r => r.json())
      .then(spec => {
        if (window.vegaEmbed) {
          window.vegaEmbed('#seasonalChart', spec, { actions: false })
            .catch(err => console.error('Vega embed error:', err))
        }
      })
      .catch(err => console.error('Fetch error:', err))
  }, [])

  // Convert SVG to PNG and trigger download
  // Process: serialize SVG → create canvas → draw image → export as PNG data URL
  const handleSavePNG = () => {
    const container = document.getElementById('seasonalChart')
    if (!container) return

    const svg = container.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = svg.clientWidth || 960
    canvas.height = svg.clientHeight || 500

    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = 'seasonal-capacity.png'
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
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
                Explore how load factor varies by season, and examine the distribution of efficiency for specific regions of interest.
              </p>
            </div>
            <div className="map-controls">
              <button className="btn btn--ghost" onClick={handleSavePNG}>Save PNG</button>
            </div>
          </div>

          <div id="seasonalChart" className="viz-card"></div>

          <p className="caption">
            Brushing over the scatterplot filters the histogram on the right to show only points from the selected region.
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
