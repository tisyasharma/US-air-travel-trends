/**
 * carrier-list.js
 * Carrier market share rendering showing all carriers by market share percentage
 */

import * as d3 from 'd3';
import { dataCache, originMeta } from '../hooks/useData.js';
import { formatAirportLabel } from '../utils/helpers.js';

const TRANSITION_MS = 450;

/**
 * Format percentage for display
 * @param {number} value - Decimal value (0-1)
 * @returns {string} Formatted percentage
 */
function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Render the carrier market share for the selected origin
 * @param {Object} params - Render parameters
 * @param {number} params.year - Selected year
 * @param {number} params.month - Selected month (0 for all months)
 * @param {string} params.origin - Selected origin airport code
 */
export function renderCarrierList({ year, month, origin }) {
  const container = document.getElementById('carrierList');
  if (!container) return;

  const meta = originMeta.get(origin) || {};
  const originLabel = formatAirportLabel(origin, meta.city, meta.state);
  let data = dataCache.carriers.filter((d) => d.ORIGIN === origin);

  if (year > 0) {
    data = data.filter((d) => d.YEAR === year);
  }
  if (month > 0) {
    data = data.filter((d) => d.MONTH === month);
  }

  // Always aggregate across remaining records so "All years" and "All months" work
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

  // Calculate total passengers for market share
  const totalPassengers = d3.sum(data, (d) => d.passengers);

  // Calculate market share and sort by it, show all carriers
  data = data
    .map((d) => ({
      carrier: d.carrier,
      passengers: d.passengers,
      share: totalPassengers > 0 ? d.passengers / totalPassengers : 0,
    }))
    .sort((a, b) => b.share - a.share);

  if (!data.length) {
    container.innerHTML = `<h4>Carriers Serving ${originLabel || origin}</h4><p class="muted">No carrier records.</p>`;
    return;
  }

  // Update header
  const headerEl = d3.select(container).selectAll('h4').data([null]);
  headerEl
    .join('h4')
    .text(`Carriers Serving ${originLabel || origin}`);

  // Create or select wrapper div for carrier items
  const wrapper = d3.select(container).selectAll('.carrier-list-wrapper').data([null]);
  const wrapperEnter = wrapper.enter().append('div').attr('class', 'carrier-list-wrapper');
  const wrapperMerged = wrapperEnter.merge(wrapper);
  const prevPositions = new Map();
  wrapperMerged.selectAll('.carrier-group').each(function (d) {
    if (d && d.carrier) {
      prevPositions.set(d.carrier, this.getBoundingClientRect().top);
    }
  });

  // Bind data to carrier groups
  const carrierGroups = wrapperMerged
    .selectAll('.carrier-group')
    .data(data, (d) => d.carrier);

  // Enter new carrier groups
  const groupsEnter = carrierGroups
    .enter()
    .append('div')
    .attr('class', 'carrier-group');

  // Add carrier item div (name + percentage)
  const itemEnter = groupsEnter.append('div').attr('class', 'carrier-item');
  itemEnter.append('span').attr('class', 'carrier-name');
  itemEnter.append('span').attr('class', 'carrier-pct');

  // Add carrier bar div
  const barEnter = groupsEnter.append('div').attr('class', 'carrier-bar');
  barEnter
    .append('span')
    .style('width', '0%')
    .transition()
    .duration(TRANSITION_MS)
    .ease(d3.easeCubicOut)
    .style('width', (d) => `${d.share * 100}%`);

  // Update existing carrier groups
  const groupsMerged = groupsEnter.merge(carrierGroups);
  groupsMerged.sort((a, b) => d3.descending(a.share, b.share));

  groupsMerged.select('.carrier-name').text((d) => d.carrier);
  groupsMerged.select('.carrier-pct').text((d) => formatPct(d.share));

  groupsMerged
    .select('.carrier-bar span')
    .transition()
    .duration(TRANSITION_MS)
    .ease(d3.easeCubicOut)
    .style('width', (d) => `${d.share * 100}%`);

  const nextPositions = new Map();
  groupsMerged.each(function (d) {
    if (d && d.carrier) {
      nextPositions.set(d.carrier, this.getBoundingClientRect().top);
    }
  });
  groupsMerged.each(function (d) {
    const prev = prevPositions.get(d.carrier);
    const next = nextPositions.get(d.carrier);
    if (prev == null || next == null) return;
    const delta = prev - next;
    if (!delta) return;
    this.style.transform = `translateY(${delta}px)`;
    this.style.transition = 'transform 0s';
  });
  requestAnimationFrame(() => {
    groupsMerged.each(function (d) {
      const prev = prevPositions.get(d.carrier);
      const next = nextPositions.get(d.carrier);
      if (prev == null || next == null) return;
      const delta = prev - next;
      if (!delta) return;
      this.style.transition = `transform ${TRANSITION_MS}ms ease`;
      this.style.transform = 'translateY(0)';
    });
  });

  // Exit old carrier groups
  carrierGroups.exit().remove();
}
