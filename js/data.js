/**
 * data.js
 * Data loading and processing logic
 */

import { dataCache, state, buildOriginIndex, populateOriginSelect } from './state.js';

/**
 * Load the prepared JSON extracts from data/ and coerce fields to numbers
 * @returns {Promise<Object>} Loaded data
 */
export async function loadData() {
  const [linksRaw, carrierDataRaw, marketShareRaw] = await Promise.all([
    fetch('data/flow_links.json').then((r) => r.json()),
    fetch('data/carriers_by_origin.json').then((r) => r.json()),
    fetch('data/carrier_market_share.json').then((r) => r.json()),
  ]);

  // Omit incomplete 2025 data
  const links = linksRaw.filter((d) => +d.YEAR <= 2024);
  const carrierData = carrierDataRaw.filter((d) => +d.YEAR <= 2024);

  dataCache.flowLinks = links.map((d) => ({
    ...d,
    YEAR: +d.YEAR,
    MONTH: +d.MONTH,
    PASSENGERS: +d.PASSENGERS,
    DEPARTURES: +d.DEPARTURES,
    SEATS: +d.SEATS,
    load_factor: d.load_factor ? +d.load_factor : null,
    o_latitude: +d.o_latitude,
    o_longitude: +d.o_longitude,
    d_latitude: +d.d_latitude,
    d_longitude: +d.d_longitude,
  }));

  dataCache.carriers = carrierData.map((d) => ({
    ...d,
    YEAR: +d.YEAR,
    MONTH: +d.MONTH,
    PASSENGERS: +d.PASSENGERS,
    DEPARTURES: +d.DEPARTURES,
    SEATS: +d.SEATS,
  }));

  dataCache.marketShare = marketShareRaw
    .map((d) => ({
      ...d,
      YEAR: +d.YEAR,
      MONTH: +d.MONTH,
      PASSENGERS: +d.PASSENGERS,
      market_share: d.market_share ? +d.market_share : 0,
      date: new Date(+d.YEAR, +d.MONTH - 1, 1),
    }))
    .filter((d) => d.YEAR <= 2024);

  const minYear = d3.min(dataCache.flowLinks, (d) => d.YEAR) || 1999;
  const maxYear = d3.max(dataCache.flowLinks, (d) => d.YEAR) || 2024;
  state.year = maxYear;

  buildOriginIndex(dataCache.flowLinks);
  populateOriginSelect(state.year, state.month);

  const mapYearSelect = document.getElementById('mapYearSelect');
  if (mapYearSelect) {
    mapYearSelect.innerHTML = '';
    for (let y = maxYear; y >= minYear; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      mapYearSelect.appendChild(opt);
    }
    mapYearSelect.value = state.year;
  }

  const mapMonthSelect = document.getElementById('mapMonthSelect');
  if (mapMonthSelect) {
    mapMonthSelect.value = state.month;
  }

  return {
    flowLinks: dataCache.flowLinks,
    carriers: dataCache.carriers,
    marketShare: dataCache.marketShare,
  };
}
