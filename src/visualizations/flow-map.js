/**
 * flow-map.js
 * Interactive route flow map visualization using D3.js
 */

import * as d3 from 'd3';
import { dataCache, mapFilters, originMeta } from '../hooks/useData.js';
import { formatNumber, monthLabel, yearLabel, formatAirportLabel } from '../utils/helpers.js';
import { getMapColors, STATE_ABBREV } from '../utils/constants.js';
import { showTooltip, hideTooltip } from './tooltip.js';
import { renderCarrierList } from './carrier-list.js';

/**
 * Sum across months when "All months" is selected
 * @param {Array} links - Flow links data
 * @returns {Array} Aggregated links
 */
export function aggregateAcrossMonths(links) {
  const grouped = d3.rollups(
    links,
    (v) => {
      const sample = v[0];
      const passengers = d3.sum(v, (d) => d.PASSENGERS);
      const departures = d3.sum(v, (d) => d.DEPARTURES);
      const seats = d3.sum(v, (d) => d.SEATS);
      return {
        ...sample,
        MONTH: 0,
        PASSENGERS: passengers,
        DEPARTURES: departures,
        SEATS: seats,
        load_factor: seats ? passengers / seats : null,
      };
    },
    (d) => `${d.ORIGIN}-${d.DEST}`
  );
  return grouped.map(([, val]) => val);
}

/**
 * Aggregate across years (and optionally months) for all available records
 * @param {Array} links - Flow links data (same origin)
 * @param {number} month - Selected month (0 for all months)
 * @returns {Array} Aggregated links
 */
export function aggregateAcrossYears(links, month) {
  const grouped = d3.rollups(
    links,
    (v) => {
      const sample = v[0];
      const passengers = d3.sum(v, (d) => d.PASSENGERS);
      const departures = d3.sum(v, (d) => d.DEPARTURES);
      const seats = d3.sum(v, (d) => d.SEATS);
      return {
        ...sample,
        YEAR: 0,
        MONTH: month || 0,
        PASSENGERS: passengers,
        DEPARTURES: departures,
        SEATS: seats,
        load_factor: seats ? passengers / seats : null,
      };
    },
    (d) => `${d.ORIGIN}-${d.DEST}`
  );
  return grouped.map(([, val]) => val);
}

/**
 * Main render pipeline for the flow map
 * @param {Object} params - Render parameters
 * @param {number} params.year - Selected year
 * @param {number} params.month - Selected month (0 for all months)
 * @param {string} params.origin - Selected origin airport code
 */
export async function updateFlowMap({ year, month, origin }) {
  const el = d3.select('#flowMapCanvas');
  el.selectAll('svg').remove();
  const mapColors = getMapColors();

  let links = dataCache.flowLinks.filter((d) => d.ORIGIN === origin);
  if (year > 0) links = links.filter((d) => d.YEAR === year);
  if (month > 0) links = links.filter((d) => d.MONTH === month);

  if (year === 0) {
    links = aggregateAcrossYears(links, month);
  } else if (month === 0) {
    links = aggregateAcrossMonths(links);
  }

  const sortKey = mapFilters.sortBy || 'PASSENGERS';
  links = links.sort((a, b) => b[sortKey] - a[sortKey]);

  const mapTopSlider = document.getElementById('mapTopSlider');
  const mapTopCurrent = document.getElementById('mapTopCurrent');
  const mapTopMax = document.getElementById('mapTopMax');
  if (mapTopSlider) {
    mapTopSlider.max = Math.max(1, links.length);
    if (mapFilters.top > links.length) {
      mapFilters.top = links.length || 1;
    }
    mapTopSlider.value = mapFilters.top;
    if (mapTopMax) mapTopMax.textContent = mapTopSlider.max;
    updateRangeMarker(mapTopSlider, mapTopCurrent);
  }
  links = links.slice(0, mapFilters.top || 15);

  if (!links.length) {
    el.append('div').attr('class', 'muted').style('padding', '12px').text('No routes for this selection.');
    renderMapSummary([], { year, month, origin });
    return;
  }

  const width = el.node().clientWidth;
  const height = el.node().clientHeight;

  const zoomVal = document.getElementById('zoomVal');
  if (zoomVal) zoomVal.textContent = '1.0x';

  if (!dataCache.worldGeo) {
    try {
      dataCache.worldGeo = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    } catch (err) {
      el.append('div')
        .attr('class', 'muted')
        .style('padding', '12px')
        .text('Map basemap failed to load. Please check your connection.');
      renderMapSummary(links, { year, month, origin });
      return;
    }
  }
  if (!dataCache.statesMesh) {
    try {
      const states = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
      dataCache.statesMesh = topojson.mesh(states, states.objects.states, (a, b) => a !== b);
      dataCache.statesGeo = topojson.feature(states, states.objects.states);
      dataCache.nationGeo = topojson.feature(states, states.objects.nation);
    } catch (err) {
      dataCache.statesMesh = null;
      dataCache.statesGeo = null;
      dataCache.nationGeo = null;
    }
  }
  const countries = topojson.feature(dataCache.worldGeo, dataCache.worldGeo.objects.countries);
  if (!dataCache.usaFeature) {
    dataCache.usaFeature =
      countries.features.find((f) => f.id === '840') ||
      countries.features.find((f) => (f.properties.name || '').includes('United States')) ||
      null;
  }
  // Prefer nation geometry (keeps Great Lakes clean); fallback to country outline
  const land = dataCache.nationGeo
    ? dataCache.nationGeo
    : dataCache.usaFeature
      ? { type: 'FeatureCollection', features: [dataCache.usaFeature] }
      : { type: 'FeatureCollection', features: countries.features };

  const projection = d3
    .geoAlbersUsa()
    .fitExtent(
      [
        [12, 12],
        [width - 12, height - 12],
      ],
      land
    )
    .precision(0.1);
  const path = d3.geoPath(projection);

  const svg = el.append('svg').attr('width', width).attr('height', height);
  dataCache.svgForZoom = svg.node();
  const g = svg.append('g');
  const gZoom = g.append('g');

  dataCache.zoomBehavior = d3
    .zoom()
    .scaleExtent([1, 5])
    .on('zoom', (event) => {
      gZoom.attr('transform', event.transform);
      if (zoomVal) {
        zoomVal.textContent = `${event.transform.k.toFixed(1)}x`;
      }
    });
  svg.call(dataCache.zoomBehavior);

  gZoom
    .append('g')
    .selectAll('path')
    .data(land.features)
    .join('path')
    .attr('d', path)
    .attr('fill', mapColors.land)
    .attr('stroke', mapColors.border)
    .attr('stroke-width', 1);

  if (dataCache.statesMesh) {
    const stateGroup = gZoom.append('g');
    stateGroup
      .append('path')
      .datum(dataCache.statesMesh)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', mapColors.state)
      .attr('stroke-width', 0.6)
      .attr('stroke-opacity', 0.6);

    if (dataCache.statesGeo && dataCache.statesGeo.features) {
      const labels = stateGroup
        .append('g')
        .selectAll('text')
        .data(dataCache.statesGeo.features)
        .join('text')
        .attr('transform', (d) => {
          const centroid = path.centroid(d);
          if (!centroid || !Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) {
            return 'translate(0,0)';
          }
          return `translate(${centroid})`;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', (d) => {
          const area = path.area(d);
          return area && area < 200 ? 8 : 10;
        })
        .attr('fill', '#6b7280')
        .style('opacity', 0)
        .text((d) => {
          const name = d.properties && d.properties.name;
          return STATE_ABBREV[name] || name || '';
        });

      stateGroup
        .append('g')
        .selectAll('path.state-hit')
        .data(dataCache.statesGeo.features)
        .join('path')
        .attr('class', 'state-hit')
        .attr('d', path)
        .attr('fill', 'transparent')
        .attr('stroke', 'none')
        .on('mouseenter', function (event, d) {
          labels
            .filter((l) => l.properties && l.properties.name === d.properties.name)
            .style('opacity', 0.45);
        })
        .on('mouseleave', function () {
          labels.style('opacity', 0);
        });
    }
  }

  const paxExtent = d3.extent(links, (d) => d.PASSENGERS);
  if (paxExtent[0] === paxExtent[1]) paxExtent[0] = 0;
  const widthScale = d3.scaleSqrt().domain(paxExtent).range([0.6, 4]);
  const highlightCut = Math.min(links.length, Math.max(3, Math.round(links.length * 0.2)));

  /**
   * Create a curved arc path between two points
   * All arcs curve upward (negative Y direction) for a bloom/fountain effect
   * @param {Object} d - Route data with coordinates
   * @returns {string} SVG path string for curved arc
   */
  const curvedArc = (d) => {
    const start = projection([d.o_longitude, d.o_latitude]);
    const end = projection([d.d_longitude, d.d_latitude]);

    if (!start || !end || !Number.isFinite(start[0]) || !Number.isFinite(end[0])) {
      return '';
    }

    // Calculate distance for arc height
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Subtle arc height (reduced from 0.2 to 0.15 for more gentle curve)
    const arcHeight = distance * 0.15;

    // Midpoint between start and end
    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;

    // Always offset upward (negative Y direction) for consistent bloom effect
    const controlX = midX;
    const controlY = midY - arcHeight;

    // Create quadratic bezier curve
    return `M ${start[0]},${start[1]} Q ${controlX},${controlY} ${end[0]},${end[1]}`;
  };

  const arcs = gZoom
    .append('g')
    .selectAll('path')
    .data(links)
    .join('path')
    .attr('class', 'route-arc')
    .attr('data-dest', (d) => d.DEST)
    .attr('data-carrier', (d) => d.UNIQUE_CARRIER_NAME)
    .attr('fill', 'none')
    .attr('stroke', (_, i) => (i < highlightCut ? mapColors.highlight : mapColors.route))
    .attr('stroke-width', (d, i) => widthScale(d.PASSENGERS) * (i < highlightCut ? 1.15 : 1))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.75)
    .attr('d', curvedArc);

  // Transparent hit layer for easier hover
  gZoom
    .append('g')
    .selectAll('path')
    .data(links)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', 'transparent')
    .attr('stroke-width', 10)
    .attr('d', curvedArc)
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => showRouteTooltip(event, d))
    .on('mousemove', (event, d) => showRouteTooltip(event, d))
    .on('mouseleave', hideTooltip);

  // Origin point
  const originPoint = { type: 'Point', coordinates: [links[0].o_longitude, links[0].o_latitude] };
  const originCoords = projection(originPoint.coordinates);
  if (originCoords && Number.isFinite(originCoords[0]) && Number.isFinite(originCoords[1])) {
    gZoom
      .append('circle')
      .attr('r', 5)
      .attr('fill', mapColors.hub)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('transform', `translate(${originCoords})`)
      .style('cursor', 'pointer')
      .on('mouseenter', () => {
        setRouteEmphasis(origin);
      })
      .on('mouseleave', () => {
        resetRouteEmphasis();
      });
  }

  // Destination points
  gZoom
    .append('g')
    .selectAll('circle')
    .data(links)
    .join('circle')
    .attr('r', 3)
    .attr('fill', mapColors.node)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.7)
    .attr('transform', (d) => {
      const coords = projection([d.d_longitude, d.d_latitude]);
      if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
        return 'translate(-9999,-9999)';
      }
      return `translate(${coords})`;
    })
    .style('cursor', 'pointer');

  // Larger invisible targets for dots
  gZoom
    .append('g')
    .selectAll('circle.hit')
    .data(links)
    .join('circle')
    .attr('class', 'hit')
    .attr('r', 9)
    .attr('fill', 'transparent')
    .attr('transform', (d) => {
      const coords = projection([d.d_longitude, d.d_latitude]);
      if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
        return 'translate(-9999,-9999)';
      }
      return `translate(${coords})`;
    })
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => {
      showRouteTooltip(event, d);
      setRouteEmphasis(d.DEST);
      // Show carriers for the destination airport
      renderCarrierList({ year, month, origin: d.DEST });
    })
    .on('mousemove', (event, d) => showRouteTooltip(event, d))
    .on('mouseleave', () => {
      hideTooltip();
      resetRouteEmphasis();
      // Restore carriers for the origin airport
      renderCarrierList({ year, month, origin });
    });

  // Initial render of carrier list for origin
  renderCarrierList({ year, month, origin });
  renderMapSummary(links, { year, month, origin });
}

/**
 * Tooltip handler for route/destination hover
 * @param {Event} event - Mouse event
 * @param {Object} d - Route data
 */
function showRouteTooltip(event, d) {
  const originLabel = d.o_city ? `${d.o_city} (${d.ORIGIN})` : d.ORIGIN;
  const destLabel = d.d_city ? `${d.d_city} (${d.DEST})` : d.DEST;
  const html = `
    <div><strong>${destLabel}</strong></div>
    <div class="muted">from ${originLabel}</div>
    <div>${formatNumber(d.PASSENGERS)} passengers</div>
    <div>${formatNumber(d.DEPARTURES)} flights</div>
    <div>${monthLabel(d.MONTH)} ${d.YEAR}</div>
  `;
  showTooltip(event, html);
}

function setRouteEmphasis(airport) {
  d3.selectAll('#flowMapCanvas .route-arc')
    .transition()
    .duration(300)
    .attr('stroke-opacity', (d) => {
      const isConnected = d.DEST === airport || d.ORIGIN === airport;
      return isConnected ? 0.9 : 0.15;
    });
}

function resetRouteEmphasis() {
  d3.selectAll('#flowMapCanvas .route-arc')
    .transition()
    .duration(300)
    .attr('stroke-opacity', 0.75);
}

function updateRangeMarker(slider, marker) {
  if (!slider || !marker) return;
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 1);
  const val = Number(slider.value || 0);
  const ratio = max > min ? (val - min) / (max - min) : 0;
  marker.textContent = val;
  requestAnimationFrame(() => {
    const sliderWidth = slider.getBoundingClientRect().width || 1;
    const markerWidth = marker.offsetWidth || 0;
    const rawLeft = ratio * sliderWidth;
    const clampedLeft = Math.min(sliderWidth - markerWidth / 2, Math.max(markerWidth / 2, rawLeft));
    marker.style.left = `${clampedLeft}px`;
  });
}

/**
 * Update the summary card beneath the map
 * @param {Array} links - Filtered route links
 * @param {Object} params - Render parameters
 */
export function renderMapSummary(links, { year, month, origin }) {
  const summaryEl = document.getElementById('mapSummary');
  if (!summaryEl) return;

  const meta = originMeta.get(origin) || {};
  const sample = links[0] || {};
  const originLabel = formatAirportLabel(
    origin,
    sample.o_city || meta.city,
    sample.o_state || meta.state
  );

  if (!links.length) {
    summaryEl.innerHTML = `<h4>${originLabel || 'Selection'}</h4><p class="muted">No routes found.</p>`;
    return;
  }

  const totalPassengers = d3.sum(links, (d) => d.PASSENGERS);
  const totalFlights = d3.sum(links, (d) => d.DEPARTURES);

  // Use mapFilters.top to show exact number of destinations from slider
  const displayCount = Math.min(mapFilters.top || 15, links.length);
  const list = links
    .slice(0, displayCount)
    .map(
      (d) => `
        <div class="summary-row">
          <span class="summary-dest" title="${formatAirportLabel(d.DEST, d.d_city, d.d_state)}">${formatAirportLabel(d.DEST, d.d_city, d.d_state)}</span>
          <span class="summary-pass">${formatNumber(d.PASSENGERS)}</span>
          <span class="summary-dot">·</span>
          <span class="summary-flights">${formatNumber(d.DEPARTURES)}</span>
        </div>`
    )
    .join('');

  summaryEl.innerHTML = `
    <h4>${originLabel}</h4>
    <p style="font-size: 13px; margin-bottom: var(--space-md);"><strong>${formatNumber(totalPassengers)}</strong> passengers · <strong>${formatNumber(totalFlights)}</strong> flights</p>
    <div class="summary-list">${list}</div>
  `;
}
