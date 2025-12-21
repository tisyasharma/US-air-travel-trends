/**
 * carrier-list.js
 * Carrier sidebar rendering showing top carriers by passenger volume
 */

import { dataCache } from './state.js';
import { formatNumber } from './utils.js';

/**
 * Render the carrier leaderboard for the selected origin
 * @param {Object} params - Render parameters
 * @param {number} params.year - Selected year
 * @param {number} params.month - Selected month (0 for all months)
 * @param {string} params.origin - Selected origin airport code
 */
export function renderCarrierList({ year, month, origin }) {
  const container = document.getElementById('carrierList');
  if (!container) return;

  let data = dataCache.carriers.filter((d) => d.YEAR === year && d.ORIGIN === origin);

  if (month > 0) {
    data = data.filter((d) => d.MONTH === month);
  } else {
    data = d3
      .rollups(
        data,
        (v) => ({
          passengers: d3.sum(v, (d) => d.PASSENGERS),
          departures: d3.sum(v, (d) => d.DEPARTURES),
          seats: d3.sum(v, (d) => d.SEATS),
        }),
        (d) => d.UNIQUE_CARRIER_NAME
      )
      .map(([carrier, val]) => ({ carrier, ...val }));
  }

  data = data
    .map((d) => ({
      carrier: d.UNIQUE_CARRIER_NAME || d.carrier,
      passengers: d.passengers ?? d.PASSENGERS,
    }))
    .sort((a, b) => b.passengers - a.passengers)
    .slice(0, 12);

  if (!data.length) {
    container.innerHTML = '<h4>Carriers Serving Origin</h4><p class="muted">No carrier records.</p>';
    return;
  }

  const maxPax = d3.max(data, (d) => d.passengers) || 1;
  container.innerHTML =
    `<h4>Carriers Serving ${origin}</h4>` +
    data
      .map(
        (d) => `
      <div class="carrier-item">
        <span>${d.carrier}</span>
        <span>${formatNumber(d.passengers)}</span>
      </div>
      <div class="carrier-bar"><span style="width:${(d.passengers / maxPax) * 100}%"></span></div>
    `
      )
      .join('');
}
