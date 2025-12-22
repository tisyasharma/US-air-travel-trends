import { useState, useEffect } from 'react'

// Global data cache (shared across components)
export const dataCache = {
  flowLinks: [],
  carriers: [],
  marketShare: [],
  monthlyMetrics: [],
  worldGeo: null,
  usaFeature: null,
  statesMesh: null,
  statesGeo: null,
  nationGeo: null,
  zoomBehavior: null,
  svgForZoom: null
}

// Global state for map filters
export const mapFilters = {
  sortBy: 'PASSENGERS',
  top: 15
}

// Global state for enabled carriers in market share
export const enabledCarriers = new Set()

// Origin lookup by year/month
export const originsByPeriod = new Map()
// Origin metadata lookup: code -> {city, state}
export const originMeta = new Map()

/**
 * Build origin index from flow links
 */
export function buildOriginIndex(flowLinks) {
  // Clear old entries so reloads don't accumulate stale keys
  originsByPeriod.clear()
  originMeta.clear()

  const groupedByMonth = {}
  const groupedByYear = {}
  const groupedAllMonths = {}
  const groupedAll = new Set()

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
 * Populate origin select dropdown
 */
export function populateOriginSelect(year, month) {
  const key = `${year}-${month}`
  // Support all-months and all-years buckets
  let origins = originsByPeriod.get(key)
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
