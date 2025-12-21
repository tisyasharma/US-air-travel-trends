/**
 * state.js
 * Application state management and data caches
 */

// Central UI state for the map filters
export const state = { year: 2025, month: 0, origin: null };

// Map filters configuration
export const mapFilters = { sortBy: 'PASSENGERS', top: 15 };

// Data cache for all visualizations
export const dataCache = {
  flowLinks: [],
  carriers: [],
  marketShare: [],
  worldGeo: null,
  usaFeature: null,
  statesMesh: null,
  statesGeo: null,
  nationGeo: null,
  zoomBehavior: null,
  svgForZoom: null,
};

// Market share filtering state
export const enabledCarriers = new Set();

// Origin lookup index for populating dropdowns
export const originsByPeriod = new Map();

/**
 * Build a lookup of origins per (year, month) for populating the dropdown
 * @param {Array} flowLinks - Flow links data
 */
export function buildOriginIndex(flowLinks) {
  originsByPeriod.clear();
  flowLinks.forEach((d) => {
    const keys = [`${d.YEAR}-${d.MONTH}`, `${d.YEAR}-0`];
    keys.forEach((key) => {
      if (!originsByPeriod.has(key)) originsByPeriod.set(key, new Map());
      const m = originsByPeriod.get(key);
      m.set(d.ORIGIN, (m.get(d.ORIGIN) || 0) + d.PASSENGERS);
    });
  });
}

/**
 * Populate the origin dropdown with the busiest origins for the selected period
 * @param {number} year - Selected year
 * @param {number} month - Selected month
 */
export function populateOriginSelect(year, month) {
  const originSelect = document.getElementById('originSelect');
  if (!originSelect) return;

  const key = `${year}-${month}`;
  const map = originsByPeriod.get(key);
  if (!map || !map.size) return;

  const totals = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  const current = originSelect.value;
  originSelect.innerHTML = '';
  totals.forEach(([origin]) => {
    const sample = dataCache.flowLinks.find((d) => d.ORIGIN === origin);
    const label = sample?.o_city ? `${origin} — ${sample.o_city}` : origin;
    const opt = document.createElement('option');
    opt.value = origin;
    opt.textContent = label;
    originSelect.appendChild(opt);
  });
  const hasCurrent = totals.some(([o]) => o === current);
  state.origin = hasCurrent ? current : totals[0]?.[0] || null;
  if (state.origin) originSelect.value = state.origin;
}

/**
 * Get current application state
 * @returns {Object} Current state
 */
export function getState() {
  return { ...state };
}

/**
 * Update application state
 * @param {Object} updates - State updates to apply
 */
export function updateState(updates) {
  Object.assign(state, updates);
}
