import { useEffect, useState } from 'react'
import * as d3 from 'd3'
import { updateFlowMap } from '../visualizations/flow-map'
import { renderCarrierList } from '../visualizations/carrier-list'
import { mapFilters, populateOriginSelect, dataCache } from '../hooks/useData'
import { debounce } from '../utils/helpers'

function RoutesMap() {
  const [state, setState] = useState({
    year: 2024,
    month: 0,
    origin: 'ATL'
  })

  useEffect(() => {
    // Populate origin dropdown for current year/month
    populateOriginSelect(state.year, state.month)
    const select = document.getElementById('originSelect')
    if (select) {
      const options = Array.from(select.options).map(opt => opt.value)
      // Prefer the current state origin if it exists in the list
      if (options.includes(state.origin)) {
        select.value = state.origin
      } else if (select.value && !state.origin) {
        setState(prev => ({ ...prev, origin: select.value }))
      } else if (!state.origin && options.length) {
        select.value = options[0]
        setState(prev => ({ ...prev, origin: options[0] }))
      }
    }
  }, [])

  useEffect(() => {
    // Update visualizations when state or filters change
    if (state.origin && dataCache.flowLinks.length > 0) {
      updateFlowMap(state)
      renderCarrierList(state)
    }
  }, [state.year, state.month, state.origin, mapFilters.sortBy, mapFilters.top])

  useEffect(() => {
    // Keep the map sized to the card if layout changes after initial render
    const canvas = document.getElementById('flowMapCanvas')
    if (!canvas) return
    const handleResize = debounce(() => {
      if (state.origin && dataCache.flowLinks.length > 0) {
        updateFlowMap(state)
      }
    }, 150)
    const observer = new ResizeObserver(handleResize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [state])

  const handleZoomReset = () => {
    if (dataCache.svgForZoom && dataCache.zoomBehavior) {
      d3.select(dataCache.svgForZoom)
        .transition()
        .duration(300)
        .call(dataCache.zoomBehavior.transform, d3.zoomIdentity)
    }
  }

  // Update origin dropdown for new time period and keep previous selection if still valid
  const syncOriginToDropdown = (year, month, prevOrigin) => {
    populateOriginSelect(year, month)
    const select = document.getElementById('originSelect')
    if (!select) return prevOrigin

    const options = Array.from(select.options).map(opt => opt.value)

    // Keep previous origin if it still exists for this time period
    if (options.includes(prevOrigin)) {
      select.value = prevOrigin
      return prevOrigin
    }

    // Otherwise default to first available option
    if (options.length > 0) {
      select.value = options[0]
      return options[0]
    }
    return ''
  }

  const handleOriginChange = (e) => {
    setState(prev => ({ ...prev, origin: e.target.value }))
  }

  const handleYearChange = (e) => {
    const year = +e.target.value
    const nextOrigin = syncOriginToDropdown(year, state.month, state.origin)
    setState(prev => ({ ...prev, year, origin: nextOrigin }))
  }

  const handleMonthChange = (e) => {
    const month = +e.target.value
    const nextOrigin = syncOriginToDropdown(state.year, month, state.origin)
    setState(prev => ({ ...prev, month, origin: nextOrigin }))
  }

  const handleSortChange = (e) => {
    mapFilters.sortBy = e.target.value
    if (state.origin) {
      updateFlowMap(state)
    }
  }

  const handleTopChange = (e) => {
    mapFilters.top = +e.target.value
    const valEl = document.getElementById('mapTopVal')
    if (valEl) valEl.textContent = mapFilters.top
    if (state.origin) {
      updateFlowMap(state)
    }
  }

  const handleSavePNG = () => {
    const canvas = document.getElementById('flowMapCanvas')
    if (!canvas) return

    const svg = canvas.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas2d = document.createElement('canvas')
    const ctx = canvas2d.getContext('2d')
    const img = new Image()

    canvas2d.width = svg.clientWidth
    canvas2d.height = svg.clientHeight

    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const pngFile = canvas2d.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `route-map-${state.origin}-${state.year}-${state.month || 'all'}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <>
      <section id="routes" className="section section--alt">
        <div className="container">
          <div className="section__head" data-aos="fade-up">
            <div>
              <p className="kicker">Routes</p>
              <h3>Passenger Flows by Origin</h3>
              <p className="muted">
                Interactive U.S. route map showing the top destinations for a chosen origin, year, and month. Route lines are sized by volume; the top 3 routes are highlighted.
              </p>
              <div className="map-legend">
                <span className="legend-item">
                  <span className="dot" style={{ '--c': 'var(--accent1)' }}></span>Top 3 routes
                </span>
                <span className="legend-item">
                  <span className="dot" style={{ '--c': 'var(--route)' }}></span>Other top routes
                </span>
              </div>
            </div>
            <div className="map-controls">
              <button className="btn btn--ghost" onClick={handleSavePNG}>Save PNG</button>
            </div>
          </div>

          <div id="flowMap" className="viz-card viz-card--tall" data-aos="fade-up">
            <div className="map-layout">
              <div className="map-filters">
                <h4>Filters</h4>
                <label>
                  Origin Airport
                  <select id="originSelect" className="select" onChange={handleOriginChange}>
                    <option value="">Loading...</option>
                  </select>
                </label>
                <label>
                  Year
                  <select id="mapYearSelect" className="select" value={state.year} onChange={handleYearChange}>
                    <option value="0">All years</option>
                    {[...Array(26)].map((_, i) => {
                      const year = 1999 + i
                      return <option key={year} value={year}>{year}</option>
                    })}
                  </select>
                </label>
                <label>
                  Month
                  <select id="mapMonthSelect" className="select" value={state.month} onChange={handleMonthChange}>
                    <option value="0">All months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </label>
                <label>
                  Sort by
                  <select id="mapSort" className="select" defaultValue="PASSENGERS" onChange={handleSortChange}>
                    <option value="PASSENGERS">Passengers</option>
                    <option value="DEPARTURES">Flights</option>
                  </select>
                </label>
                <label>
                  Top destinations
                  <input
                    type="range"
                    id="mapTopSlider"
                    min="1"
                    max="25"
                    step="1"
                    defaultValue="15"
                    onChange={handleTopChange}
                  />
                  <div className="range-meta">
                    <span>1</span>
                    <span id="mapTopVal">{mapFilters.top}</span>
                  </div>
                </label>
                <div className="map-zoom">
                  <button id="zoomReset" className="btn btn--ghost btn--reset" onClick={handleZoomReset}>Reset</button>
                  <span className="zoom-label">Zoom <span id="zoomVal">1.0x</span></span>
                </div>
              </div>
              <div className="map-canvas" id="flowMapCanvas"></div>
            </div>
          </div>

          <div className="map-panels" data-aos="fade-up">
            <div className="card" id="mapSummary">
              <h4>Selection</h4>
              <p className="muted">Totals will appear here after data loads.</p>
            </div>
            <div className="card" id="carrierList">
              <h4>Carriers Serving Origin</h4>
              <p className="muted">Top carriers by passengers for this origin.</p>
            </div>
          </div>

          <p className="caption">
            Figure 1. Top destinations for the selected month (summed if "All months").
          </p>
        </div>
      </section>

      <section id="viz-takeaways" className="section section--alt">
        <div className="container" data-aos="fade-up">
          <h2 className="kicker">Takeaways</h2>
          <div className="viz-block">
            <h3>Passenger Flows by Origin (Route Map)</h3>
            <p>
              This visualization highlights the busiest routes from a selected airport, allowing users to explore how travel demand shifts by month, year, and destination. The thickest arcs represent the highest-volume routes, and the top three are specially highlighted. The map reveals geographic travel patterns clearly and helps identify dominant origin–destination relationships.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default RoutesMap
