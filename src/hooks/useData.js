import { useState, useEffect } from 'react'

// Global data cache shared across all components
// Loaded once on mount and accessed by visualizations
export const dataCache = {
  flowLinks: [],          // Route-level passenger flows with coordinates
  carriers: [],           // Carrier data by origin airport
  marketShare: [],        // Monthly market share percentages
  monthlyMetrics: [],     // Aggregated monthly totals
  worldGeo: null,         // TopoJSON world geometry for map
  usaFeature: null,       // Extracted US feature from world data
  statesMesh: null,       // State boundaries mesh
  statesGeo: null,        // GeoJSON of US states
  nationGeo: null,        // National boundary
  zoomBehavior: null,     // D3 zoom behavior instance
  svgForZoom: null        // SVG element reference for zoom
}

// Filter settings for route map (top N routes sorted by metric)
export const mapFilters = {
  sortBy: 'PASSENGERS',   // Metric to sort by (PASSENGERS, DEPARTURES, SEATS)
  top: 15                 // Number of top routes to display
}

// Tracks which carriers are currently enabled in the market share chart
export const enabledCarriers = new Set()

// Maps time period keys to available origin airports
// Keys: "YEAR-MONTH" (e.g., "2024-1"), "YEAR-0" (all months), "0-MONTH" (all years), "0-0" (all data)
export const originsByPeriod = new Map()

// Maps airport codes to metadata (city, state) for display labels
export const originMeta = new Map()

/**
 * Build origin airport index grouped by time period
 * Creates lookup maps for populating origin dropdown based on selected year/month
 */
export function buildOriginIndex(flowLinks) {
  originsByPeriod.clear()
  originMeta.clear()

  const groupedByMonth = {}      // Specific year-month combinations
  const groupedByYear = {}       // All months for a given year
  const groupedAllMonths = {}    // All years for a given month
  const groupedAll = new Set()   // All origins across all time

  flowLinks.forEach(d => {
    const monthKey = `${d.YEAR}-${d.MONTH}`
    const yearKey = `${d.YEAR}-0` // "All months" bucket per year
    const allYearsMonthKey = `0-${d.MONTH}` // "All years" for a given month

    if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = new Set()
    if (!groupedByYear[yearKey]) groupedByYear[yearKey] = new Set()
    if (!groupedAllMonths[allYearsMonthKey]) groupedAllMonths[allYearsMonthKey] = new Set()

    groupedByMonth[monthKey].add(d.ORIGIN)
    groupedByYear[yearKey].add(d.ORIGIN)
    groupedAllMonths[allYearsMonthKey].add(d.ORIGIN)
    groupedAll.add(d.ORIGIN)

    // Store city/state metadata for display
    if (!originMeta.has(d.ORIGIN)) {
      originMeta.set(d.ORIGIN, {
        city: d.o_city || '',
        state: d.o_state || ''
      })
    }
  })

  for (const key in groupedByMonth) {
    originsByPeriod.set(key, Array.from(groupedByMonth[key]).sort())
  }
  for (const key in groupedByYear) {
    originsByPeriod.set(key, Array.from(groupedByYear[key]).sort())
  }
  for (const key in groupedAllMonths) {
    originsByPeriod.set(key, Array.from(groupedAllMonths[key]).sort())
  }
  originsByPeriod.set('0-0', Array.from(groupedAll).sort())
}

/**
 * Populate origin dropdown with airports that have data for the selected time period
 * Falls back through progressively broader time ranges if no exact match exists
 */
export function populateOriginSelect(year, month) {
  const key = `${year}-${month}`
  let origins = originsByPeriod.get(key)

  // Fallback cascade: specific month → all months for year → all years for month → all data
  if (!origins && month === 0 && year !== 0) {
    origins = originsByPeriod.get(`${year}-0`)
  }
  if (!origins && year === 0 && month !== 0) {
    origins = originsByPeriod.get(`0-${month}`)
  }
  if (!origins && year === 0 && month === 0) {
    origins = originsByPeriod.get('0-0')
  }
  origins = origins || []

  const select = document.getElementById('originSelect')
  if (!select) return

  select.innerHTML = origins.map(code => {
    const meta = originMeta.get(code) || {}
    const cityLabel = meta.city ? `${meta.city}${meta.state ? `, ${meta.state}` : ''}` : ''
    const label = cityLabel ? `${code} — ${cityLabel}` : code
    return `<option value="${code}">${label}</option>`
  }).join('')

  if (origins.length > 0 && !select.value) {
    select.value = origins[0]
  }
}

/**
 * React hook to load all data
 */
export function useData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true)

        const [flowLinksRaw, carriersRaw, marketShareRaw, monthlyRaw] = await Promise.all([
          fetch('/data/flow_links.json').then(r => r.json()),
          fetch('/data/carriers_by_origin.json').then(r => r.json()),
          fetch('/data/carrier_market_share.json').then(r => r.json()),
          fetch('/data/monthly_metrics.json').then(r => r.json())
        ])

        // Coerce numeric fields
        dataCache.flowLinks = flowLinksRaw.map(d => ({
          ...d,
          YEAR: +d.YEAR,
          MONTH: +d.MONTH,
          PASSENGERS: +d.PASSENGERS,
          DEPARTURES: +d.DEPARTURES,
          SEATS: +d.SEATS,
          o_latitude: +d.o_latitude,
          o_longitude: +d.o_longitude,
          d_latitude: +d.d_latitude,
          d_longitude: +d.d_longitude,
          load_factor: d.SEATS ? d.PASSENGERS / d.SEATS : null
        }))

        dataCache.carriers = carriersRaw.map(d => ({
          ...d,
          YEAR: +d.YEAR,
          MONTH: +d.MONTH,
          PASSENGERS: +d.PASSENGERS
        }))

        dataCache.marketShare = marketShareRaw.map(d => ({
          ...d,
          date: new Date(d.YEAR, d.MONTH - 1, 1),
          market_share: +d.market_share
        }))

        dataCache.monthlyMetrics = monthlyRaw.map(d => ({
          ...d,
          passengers: +d.passengers,
          year: +d.year,
          month: +d.month
        }))

        // Build origin index
        buildOriginIndex(dataCache.flowLinks)

        setLoading(false)
      } catch (err) {
        console.error('Data loading error:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadAllData()
  }, [])

  return { loading, error, dataCache }
}
