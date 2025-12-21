/**
 * flow-map.js
 * Interactive route flow map visualization using D3.js
 */

import { dataCache, mapFilters } from './state.js';
import { formatNumber, monthLabel, greatCircleCoords } from './utils.js';
import { MAP_COLORS, STATE_ABBREV } from './constants.js';
import { showTooltip, hideTooltip } from './tooltip.js';

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
 * Main render pipeline for the flow map
 * @param {Object} params - Render parameters
 * @param {number} params.year - Selected year
 * @param {number} params.month - Selected month (0 for all months)
 * @param {string} params.origin - Selected origin airport code
 */
export async function updateFlowMap({ year, month, origin }) {
  const el = d3.select('#flowMapCanvas');
  el.selectAll('svg').remove();

  let links = dataCache.flowLinks.filter((d) => d.YEAR === year && d.ORIGIN === origin);
  if (month > 0) links = links.filter((d) => d.MONTH === month);
  else links = aggregateAcrossMonths(links);

  const sortKey = mapFilters.sortBy || 'PASSENGERS';
  links = links.sort((a, b) => b[sortKey] - a[sortKey]);

  const mapTopSlider = document.getElementById('mapTopSlider');
  const mapTopVal = document.getElementById('mapTopVal');
  if (mapTopSlider) {
    mapTopSlider.max = Math.max(1, links.length);
    if (mapFilters.top > links.length) {
      mapFilters.top = links.length || 1;
      mapTopSlider.value = mapFilters.top;
      if (mapTopVal) mapTopVal.textContent = mapFilters.top;
    }
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
    .attr('fill', MAP_COLORS.land)
    .attr('stroke', MAP_COLORS.border)
    .attr('stroke-width', 1);

  if (dataCache.statesMesh) {
    const stateGroup = gZoom.append('g');
    stateGroup
      .append('path')
      .datum(dataCache.statesMesh)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', MAP_COLORS.state)
      .attr('stroke-width', 0.6)
      .attr('stroke-opacity', 0.6);

    if (dataCache.statesGeo && dataCache.statesGeo.features) {
      const labels = stateGroup
        .append('g')
        .selectAll('text')
        .data(dataCache.statesGeo.features)
        .join('text')
        .attr('transform', (d) => `translate(${path.centroid(d)})`)
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

  const arcs = gZoom
    .append('g')
    .selectAll('path')
    .data(links)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', (_, i) => (i < highlightCut ? MAP_COLORS.highlight : MAP_COLORS.route))
    .attr('stroke-width', (d, i) => widthScale(d.PASSENGERS) * (i < highlightCut ? 1.15 : 1))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.75)
    .attr('d', (d) => path({ type: 'LineString', coordinates: greatCircleCoords(d) }));

  // Transparent hit layer for easier hover
  gZoom
    .append('g')
    .selectAll('path')
    .data(links)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', 'transparent')
    .attr('stroke-width', 10)
    .attr('d', (d) => path({ type: 'LineString', coordinates: greatCircleCoords(d) }))
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => showRouteTooltip(event, d))
    .on('mousemove', (event, d) => showRouteTooltip(event, d))
    .on('mouseleave', hideTooltip);

  // Origin point
  const originPoint = { type: 'Point', coordinates: [links[0].o_longitude, links[0].o_latitude] };
  gZoom
    .append('circle')
    .attr('r', 5)
    .attr('fill', MAP_COLORS.hub)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .attr('transform', `translate(${projection(originPoint.coordinates)})`);

  // Destination points
  gZoom
    .append('g')
    .selectAll('circle')
    .data(links)
    .join('circle')
    .attr('r', 3)
    .attr('fill', MAP_COLORS.node)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.7)
    .attr('transform', (d) => `translate(${projection([d.d_longitude, d.d_latitude])})`)
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
    .attr('transform', (d) => `translate(${projection([d.d_longitude, d.d_latitude])})`)
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => showRouteTooltip(event, d))
    .on('mousemove', (event, d) => showRouteTooltip(event, d))
    .on('mouseleave', hideTooltip);

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

/**
 * Update the summary card beneath the map
 * @param {Array} links - Filtered route links
 * @param {Object} params - Render parameters
 */
export function renderMapSummary(links, { year, month, origin }) {
  const summaryEl = document.getElementById('mapSummary');
  if (!summaryEl) return;

  if (!links.length) {
    summaryEl.innerHTML = '<h4>Selection</h4><p class="muted">No routes found.</p>';
    return;
  }
  const totalPassengers = d3.sum(links, (d) => d.PASSENGERS);
  const top = links[0];
  const list = links
    .slice(0, 15)
    .map(
      (d) => `
        <div class="summary-row">
          <span class="summary-dest">${d.d_city || d.DEST} (${d.DEST})</span>
          <span class="summary-pass">${formatNumber(d.PASSENGERS)} passengers</span>
          <span class="summary-dot">·</span>
          <span class="summary-flights">${formatNumber(d.DEPARTURES)} flights</span>
        </div>`
    )
    .join('');
  summaryEl.innerHTML = `
    <h4>${origin} — ${monthLabel(month)} ${year}</h4>
    <p><strong>${formatNumber(totalPassengers)}</strong> passengers across ${links.length} routes.</p>
    <p class="muted">Top destination: ${top.DEST} (${formatNumber(top.PASSENGERS)} pax)</p>
    <div class="summary-list" style="margin-top:8px">${list}</div>
  `;
}
