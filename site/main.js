// Page interactions and map visualization logic for filters, data loading, and rendering
// Initialize AOS (scroll animations)
AOS.init({ once: true, duration: 600, easing: 'ease-out' });

// Back-to-top button visibility
const toTop = document.getElementById('toTop');
window.addEventListener('scroll', () => {
  toTop.style.display = window.scrollY > 600 ? 'block' : 'none';
});
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// Controls and state
const originSelect = document.getElementById('originSelect');
const zoomVal = document.getElementById('zoomVal');
const zoomReset = document.getElementById('zoomReset');
const mapYearSelect = document.getElementById('mapYearSelect');
const mapMonthSelect = document.getElementById('mapMonthSelect');
const mapSort = document.getElementById('mapSort');
const mapTopSlider = document.getElementById('mapTopSlider');
const mapTopVal = document.getElementById('mapTopVal');

// Shared helpers and state for the map and charts
const monthNames = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
// Used to label states on hover for the basemap
const stateAbbrev = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
  'Puerto Rico': 'PR',
};

// Central UI state for the map filters
const state = { year: 2025, month: 0, origin: null };

// Loaded datasets and derived lookup maps
let flowLinks = [];
let carriers = [];
let marketShare = [];
let worldGeo = null;
let usaFeature = null;
let statesMesh = null;
let statesGeo = null;
let nationGeo = null;
let zoomBehavior = null;
let svgForZoom = null;
let originsByPeriod = new Map();
const mapFilters = { sortBy: 'PASSENGERS', top: 15 };
let enabledCarriers = new Set();

// Resolve CSS custom properties so colors can be in sync with styles.css
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const MAP_COLORS = {
  land: cssVar('--land') || '#E3ECF6',
  border: cssVar('--border-strong') || '#C2D1E5',
  state: cssVar('--border-strong') || '#C2D1E5',
  hub: cssVar('--ink') || '#111827',
  node: cssVar('--accent2') || '#5471a9',
  route: cssVar('--route') || '#4B6EDC',
  highlight: cssVar('--accent1') || '#F97316',
};

// Colorblind-friendly palette with 22 distinct colors (cool/neutral, on-theme)
const MARKET_COLORS = [
  '#1F4B99', '#4E6FB8', '#7896CE', '#AFC2E6', '#C7D6ED', // blues
  '#0F6A6A', '#2F8F8F', '#5BA9A9', '#8CC6C6', '#B7E0DF', // teals
  '#3A6E3A', '#5F915F', '#8AB78A', '#B7D8B7', '#D9EBD9', // greens
  '#6B5FA5', '#8A7BC1', '#A897DD', '#C3B3F0', '#DDD3FF', // violets
  '#586F7C', '#7A8E9A' // neutrals
];
const carrierAliases = {
  'ExpressJet Airlines LLC d/b/a aha!': 'ExpressJet (aha!)',
};
const displayCarrier = (name) => carrierAliases[name] || name;
const legendLabel = (name) =>
  displayCarrier(name)
    .replace(/\b(inc\.?|co\.?|corp\.?|corporation|l\.?l\.?c\.?)\b/gi, '')
    .replace(/[.,]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

// Shared tooltip used by the D3 map and Vega charts
const tooltip = d3
  .select('body')
  .append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0)
  .style('pointer-events', 'none');

// Basic formatters for tooltips and labels
const fmt = new Intl.NumberFormat('en-US');
function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return fmt.format(Math.round(n));
}
function formatPct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return (v * 100).toFixed(1) + '%';
}
function monthLabel(m) {
  if (!m) return 'All months';
  return monthNames[m] || 'Month ' + m;
}

// Simple debounce for resize handlers
function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Load the prepared JSON extracts from ../data/ and coerce fields to numbers
async function loadData() {
  const [linksRaw, carrierDataRaw, marketShareRaw] = await Promise.all([
    fetch('../data/flow_links.json').then((r) => r.json()),
    fetch('../data/carriers_by_origin.json').then((r) => r.json()),
    fetch('../data/carrier_market_share.json').then((r) => r.json()),
  ]);

  // Omit incomplete 2025 data
  const links = linksRaw.filter((d) => +d.YEAR <= 2024);
  const carrierData = carrierDataRaw.filter((d) => +d.YEAR <= 2024);

  flowLinks = links.map((d) => ({
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

  carriers = carrierData.map((d) => ({
    ...d,
    YEAR: +d.YEAR,
    MONTH: +d.MONTH,
    PASSENGERS: +d.PASSENGERS,
    DEPARTURES: +d.DEPARTURES,
    SEATS: +d.SEATS,
  }));
  marketShare = marketShareRaw
    .map((d) => ({
      ...d,
      YEAR: +d.YEAR,
      MONTH: +d.MONTH,
      PASSENGERS: +d.PASSENGERS,
      market_share: d.market_share ? +d.market_share : 0,
      date: new Date(+d.YEAR, +d.MONTH - 1, 1),
    }))
    .filter((d) => d.YEAR <= 2024);

  const minYear = d3.min(flowLinks, (d) => d.YEAR) || 1999;
  const maxYear = d3.max(flowLinks, (d) => d.YEAR) || 2024;
  state.year = maxYear;

  buildOriginIndex();
  populateOriginSelect({ year: state.year, month: state.month });

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
  if (mapMonthSelect) {
    mapMonthSelect.value = state.month;
  }
}

// Build a lookup of origins per (year, month) for populating the dropdown
function buildOriginIndex() {
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

// Populate the origin dropdown with the busiest origins for the selected period
function populateOriginSelect({ year, month }) {
  const key = `${year}-${month}`;
  const map = originsByPeriod.get(key);
  if (!map || !map.size) return;

  const totals = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  const current = originSelect.value;
  originSelect.innerHTML = '';
  totals.forEach(([origin]) => {
    const sample = flowLinks.find((d) => d.ORIGIN === origin);
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

originSelect.addEventListener('change', () => {
  state.origin = originSelect.value;
  updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
  renderCarrierList({ year: state.year, month: state.month, origin: state.origin });
});
if (mapYearSelect) {
  mapYearSelect.addEventListener('change', () => {
    state.year = +mapYearSelect.value;
    populateOriginSelect({ year: state.year, month: state.month });
    syncFilters();
  });
}
if (mapMonthSelect) {
  mapMonthSelect.addEventListener('change', () => {
    state.month = +mapMonthSelect.value;
    populateOriginSelect({ year: state.year, month: state.month });
    syncFilters();
  });
}
if (mapSort) {
  mapSort.addEventListener('change', () => {
    mapFilters.sortBy = mapSort.value;
    updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
  });
}
if (mapTopSlider && mapTopVal) {
  mapTopVal.textContent = mapTopSlider.value;
  mapTopSlider.addEventListener('input', () => {
    mapFilters.top = +mapTopSlider.value;
    mapTopVal.textContent = mapTopSlider.value;
    updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
  });
}

// Keep map + carrier panel in sync when filters change
function syncFilters() {
  const { year, month, origin } = state;
  if (origin) {
    updateFlowMap({ year, month, origin });
    renderCarrierList({ year, month, origin });
  }
}

// Zoom controls (button + label)
if (zoomReset) {
  zoomReset.addEventListener('click', () => {
    if (zoomVal) zoomVal.textContent = '1.0x';
    updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
  });
}

// ---- Routes map ----
// Generate intermediate coordinates for a smooth great-circle arc
function greatCircleCoords(d) {
  const from = [d.o_longitude, d.o_latitude];
  const to = [d.d_longitude, d.d_latitude];
  const interp = d3.geoInterpolate(from, to);
  return d3.range(0, 1.01, 0.02).map((t) => interp(t));
}

// Sum across months when "All months" is selected
function aggregateAcrossMonths(links) {
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

// Main render pipeline for the flow map
async function updateFlowMap({ year, month, origin }) {
  const el = d3.select('#flowMapCanvas');
  el.selectAll('svg').remove();

  let links = flowLinks.filter((d) => d.YEAR === year && d.ORIGIN === origin);
  if (month > 0) links = links.filter((d) => d.MONTH === month);
  else links = aggregateAcrossMonths(links);

  const sortKey = mapFilters.sortBy || 'PASSENGERS';
  links = links.sort((a, b) => b[sortKey] - a[sortKey]);

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
  if (zoomVal) zoomVal.textContent = '1.0x';

  if (!worldGeo) {
    try {
      worldGeo = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    } catch (err) {
      el.append('div')
        .attr('class', 'muted')
        .style('padding', '12px')
        .text('Map basemap failed to load. Please check your connection.');
      renderMapSummary(links, { year, month, origin });
      return;
    }
  }
  if (!statesMesh) {
    try {
      const states = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
      statesMesh = topojson.mesh(states, states.objects.states, (a, b) => a !== b);
      statesGeo = topojson.feature(states, states.objects.states);
      nationGeo = topojson.feature(states, states.objects.nation);
    } catch (err) {
      statesMesh = null;
      statesGeo = null;
      nationGeo = null;
    }
  }
  const countries = topojson.feature(worldGeo, worldGeo.objects.countries);
  if (!usaFeature) {
    usaFeature =
      countries.features.find((f) => f.id === '840') ||
      countries.features.find((f) => (f.properties.name || '').includes('United States')) ||
      null;
  }
  // Prefer nation geometry (keeps Great Lakes clean); fallback to country outline
  const land = nationGeo
    ? nationGeo
    : usaFeature
      ? { type: 'FeatureCollection', features: [usaFeature] }
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
  svgForZoom = svg.node();
  const g = svg.append('g');
  const gZoom = g.append('g');

  zoomBehavior = d3
    .zoom()
    .scaleExtent([1, 5])
    .on('zoom', (event) => {
      gZoom.attr('transform', event.transform);
      if (zoomVal) {
        zoomVal.textContent = `${event.transform.k.toFixed(1)}x`;
      }
    });
  svg.call(zoomBehavior);

  gZoom
    .append('g')
    .selectAll('path')
    .data(land.features)
    .join('path')
    .attr('d', path)
    .attr('fill', MAP_COLORS.land)
    .attr('stroke', MAP_COLORS.border)
    .attr('stroke-width', 1);

  if (statesMesh) {
    const stateGroup = gZoom.append('g');
    stateGroup
      .append('path')
      .datum(statesMesh)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', MAP_COLORS.state)
      .attr('stroke-width', 0.6)
      .attr('stroke-opacity', 0.6);

    if (statesGeo && statesGeo.features) {
      const labels = stateGroup
        .append('g')
        .selectAll('text')
        .data(statesGeo.features)
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
          return stateAbbrev[name] || name || '';
        });

      stateGroup
        .append('g')
        .selectAll('path.state-hit')
        .data(statesGeo.features)
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
    .on('mouseenter', (event, d) => showTooltip(event, d))
    .on('mousemove', (event, d) => showTooltip(event, d))
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
    .on('mouseenter', (event, d) => showTooltip(event, d))
    .on('mousemove', (event, d) => showTooltip(event, d))
    .on('mouseleave', hideTooltip);

  renderMapSummary(links, { year, month, origin });
}

// Tooltip handlers for route/destination hover
function showTooltip(event, d) {
  const originLabel = d.o_city ? `${d.o_city} (${d.ORIGIN})` : d.ORIGIN;
  const destLabel = d.d_city ? `${d.d_city} (${d.DEST})` : d.DEST;
  const html = `
    <div><strong>${destLabel}</strong></div>
    <div class="muted">from ${originLabel}</div>
    <div>${formatNumber(d.PASSENGERS)} passengers</div>
    <div>${formatNumber(d.DEPARTURES)} flights</div>
    <div>${monthLabel(d.MONTH)} ${d.YEAR}</div>
  `;
  const [x, y] = d3.pointer(event, document.body);
  const offsetX = 16;
  const offsetY = 16;
  tooltip
    .html(html)
    .style('opacity', 1)
    .style('left', `${x + offsetX}px`)
    .style('top', `${y + offsetY}px`)
    .style('display', 'block');
}

function hideTooltip() {
  tooltip.style('opacity', 0).style('display', 'none');
}

// Update the summary card beneath the map
function renderMapSummary(links, { year, month, origin }) {
  const summaryEl = document.getElementById('mapSummary');
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

// Render the carrier leaderboard for the selected origin
function renderCarrierList({ year, month, origin }) {
  const container = document.getElementById('carrierList');
  let data = carriers.filter((d) => d.YEAR === year && d.ORIGIN === origin);
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

// Airline market-share with 100% stacked area
function renderMarketShare({ preserveEnabled = false } = {}) {
  const container = d3.select('#marketShareChart');
  const legendEl = document.getElementById('marketLegend');
  const node = container.node();
  container.selectAll('svg').remove();
  container.selectAll('.chart-meta').remove();
  if (!node) return;

  if (!marketShare.length) {
    if (legendEl) legendEl.innerHTML = '';
    container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share data unavailable.');
    return;
  }

  try {
    if (legendEl) legendEl.innerHTML = '';

    // Order carriers by latest month that keeps mergers sensible, push Other to the end
    const latestDate = d3.max(marketShare, (d) => d.date);
    const latestSlice = marketShare.filter((d) => +d.date === +latestDate);
    const ranked = latestSlice
      .sort((a, b) => b.market_share - a.market_share)
      .map((d) => d.UNIQUE_CARRIER_NAME);
    const allCarriers = Array.from(new Set(marketShare.map((d) => d.UNIQUE_CARRIER_NAME))).filter(Boolean);

    // Single "Other" bucket at the end
    const order = Array.from(
      new Set([...ranked.filter((c) => c !== 'Other'), ...allCarriers.filter((c) => c !== 'Other'), 'Other'])
    );
    if (!order.length) {
      container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share data unavailable.');
      return;
    }

    // Track enabled carriers and default to top 8 if nothing selected, unless preserving current selections
    if (!enabledCarriers.size && !preserveEnabled) {
      ranked.slice(0, 8).forEach((c) => enabledCarriers.add(c));
      if (!enabledCarriers.size) enabledCarriers = new Set(order.slice(0, 8));
    }
    const activeOrder = order.filter((c) => enabledCarriers.has(c));
    const inactiveOrder = order.filter((c) => !enabledCarriers.has(c));
    if (!activeOrder.length) {
      activeOrder.push(order[0]);
      enabledCarriers.add(order[0]);
    }

    // Colorblind-friendly palette (using MARKET_COLORS)
    const palette = order.map((_, i) => MARKET_COLORS[i % MARKET_COLORS.length]);
    const color = d3.scaleOrdinal().domain(order).range(palette);

    // Group by month, keep precomputed percentages
    const byDate = d3.rollups(
      marketShare,
      (v) => {
        const entry = { date: v[0].date };
        order.forEach((c) => (entry[c] = 0));
        v.forEach((d) => {
          entry[d.UNIQUE_CARRIER_NAME] = d.market_share || 0;
        });
        return entry;
      },
      (d) => d.date.getTime()
    );
    const seriesInput = byDate
      .map(([, val]) => {
        const hiddenShare = inactiveOrder.reduce((sum, c) => sum + (val[c] || 0), 0);
        return { ...val, __hidden: hiddenShare };
      })
      .sort((a, b) => a.date - b.date);
    if (!seriesInput.length) {
      container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share data unavailable.');
      return;
    }

    const width = node.clientWidth || 960;
    const height = node.clientHeight || 360;
    const margin = { top: 10, right: 16, bottom: 30, left: 48 };
    const xDomainNums = d3.extent(seriesInput, (d) => +d.date);
    if (!xDomainNums[0] || !xDomainNums[1]) {
      console.error('Market share: invalid x-domain', xDomainNums);
      container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share domain missing.');
      return;
    }
    const x = d3
      .scaleUtc()
      .domain([new Date(xDomainNums[0]), new Date(xDomainNums[1])])
      .range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);

    const stackKeys = [...activeOrder, '__hidden'];
    const stack = d3
      .stack()
      .keys(stackKeys)
      .value((d, key) => d[key] || 0)
      .offset(d3.stackOffsetNone);
    const stacked = stack(seriesInput);
    const hiddenSeries = stacked.find((s) => s.key === '__hidden');
    const visibleStack = stacked.filter((s) => s.key !== '__hidden');

    console.log('market-share debug', {
      rows: marketShare.length,
      carriers: order.length,
      series: seriesInput.length,
      width,
      height,
      xDomain: xDomainNums,
      first: seriesInput[0],
      last: seriesInput[seriesInput.length - 1],
    });

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const area = d3
      .area()
      .x((d) => x(d.data.date))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    // Draw the aggregated hidden share (unselected carriers) first so visible bands sit on top
    const hasHidden =
      hiddenSeries && hiddenSeries.some((seg) => seg[1] - seg[0] > 0.00001 && Number.isFinite(seg[1]));
    if (hasHidden) {
      svg
        .append('g')
        .selectAll('path')
        .data([hiddenSeries])
        .join('path')
        .attr('fill', '#e5e7eb')
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.6)
        .attr('opacity', 0.8)
        .attr('d', area);
    }

    svg
      .append('g')
      .selectAll('path')
      .data(visibleStack)
      .join('path')
      .attr('fill', (d) => color(d.key))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.6)
      .attr('opacity', 0.95)
      .attr('d', area);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(width < 640 ? 6 : 10).tickFormat(d3.utcFormat('%Y')))
      .selectAll('text')
      .style('font-size', '12px');

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')))
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '12px');

    const pointer = svg
      .append('line')
      .attr('stroke', '#111827')
      .attr('stroke-opacity', 0.2)
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .style('display', 'none');

    const bisect = d3.bisector((d) => d.date).center;
    const formatMonth = d3.timeFormat('%b %Y');
    svg
      .append('rect')
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)
      .on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event);
        const i = bisect(seriesInput, x.invert(mx));
        const idx = Math.max(0, Math.min(seriesInput.length - 1, i));
        const row = seriesInput[idx];
        pointer.style('display', null).attr('x1', mx).attr('x2', mx);

        // Identify which carrier band the pointer is over
        const shareAt = y.invert(my);
        let carrierUnder = null;
        let shareExact = null;
        for (const series of stacked) {
          const seg = series[idx];
          if (shareAt >= seg[0] && shareAt <= seg[1]) {
            carrierUnder = series.key;
            shareExact = row[series.key] ?? seg[1] - seg[0];
            break;
          }
        }

        const hiddenShare = row.__hidden || 0;
        const rows = [
          ...activeOrder
            .map((c) => ({ carrier: c, share: row[c] || 0 }))
            .filter((d) => d.share > 0)
            .sort((a, b) => b.share - a.share)
            .slice(0, 8),
          ...(hiddenShare > 0 ? [{ carrier: '__hidden', share: hiddenShare }] : []),
        ]
          .map((d) => {
            const label = d.carrier === '__hidden' ? 'Unselected carriers' : displayCarrier(d.carrier);
            return `<div>${label}: ${formatPct(d.share)}</div>`;
          })
          .join('');
        const focusColor =
          carrierUnder === '__hidden' ? '#9ca3af' : carrierUnder ? color(carrierUnder) : null;
        const focusLine = carrierUnder
          ? `<strong style="color:${focusColor}">${
              carrierUnder === '__hidden' ? 'Unselected carriers' : displayCarrier(carrierUnder)
            }</strong> — ${formatPct(shareExact)}`
          : 'Market share';
        const html = `<div><strong>${formatMonth(row.date)}</strong><div class="muted">${focusLine}</div></div>${rows}`;
        const [px, py] = d3.pointer(event, document.body);
        tooltip
          .html(html)
          .style('opacity', 1)
          .style('display', 'block')
          .style('left', `${px + 14}px`)
          .style('top', `${py + 14}px`);
      })
      .on('mouseleave', () => {
        pointer.style('display', 'none');
        hideTooltip();
      });

    // Legend after successful render
    if (legendEl) {
      const latestShareMap = new Map(latestSlice.map((d) => [d.UNIQUE_CARRIER_NAME, d.market_share || 0]));
      legendEl.innerHTML = order
        .map(
          (c, idx) => `
          <label class="ms-legend-item">
            <input type="checkbox" data-carrier="${c}" ${enabledCarriers.has(c) ? 'checked' : ''}/>
            <span class="ms-legend-dot" style="background:${color(c)}"></span>
            <span class="ms-legend-name">${idx + 1}. ${legendLabel(c)}</span>
            <span class="ms-legend-share"></span>
          </label>
        `
        )
        .join('');
      legendEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.addEventListener('change', (e) => {
          const carrier = e.target.getAttribute('data-carrier');
          if (e.target.checked) enabledCarriers.add(carrier);
          else enabledCarriers.delete(carrier);
          renderMarketShare({ preserveEnabled: true });
        });
      });
    }

    container
      .append('div')
      .attr('class', 'chart-meta')
      .text(
        `Series: ${seriesInput.length} · Carriers: ${activeOrder.length}${hasHidden ? ' · Grey band = unselected share' : ''}`
      );
  } catch (err) {
    console.error('Market share render failed', err);
    container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share chart failed to render.');
  }
}

async function renderSeasonalHeatmap() {
  const heatEl = d3.select("#seasonHeatmap");
  heatEl.selectAll("*").remove();

  const width = heatEl.node().clientWidth;
  const height = heatEl.node().clientHeight;

  // Load the monthly totals (precomputed JSON; see build script)
  const monthly = await fetch("../data/monthly_metrics.json").then(r => r.json());

  // Extract months 1–12 and all years
  const years = [...new Set(monthly.map(d => d.YEAR))].sort((a,b) => a-b);
  const months = d3.range(1,13);

  // Aggregate by YEAR + MONTH across Domestic, International, Unknown
  const aggregated = d3.rollups(
    monthly,
    v => d3.sum(v, d => d.PASSENGERS),
    d => d.YEAR,
    d => d.MONTH
  );

  // Convert into lookup[year][month] = total passengers
  const lookup = {};
  aggregated.forEach(([year, monthEntries]) => {
    lookup[year] = {};
    monthEntries.forEach(([month, total]) => {
      lookup[year][month] = total;
    });
  });

  // Determine meaningful scale (ignore tiny values)
  const meaningfulValues = aggregated.flatMap(([year, entries]) =>
    entries.map(([month, total]) => total).filter(v => v > 30_000_000)
  );

  const minPax = d3.min(meaningfulValues);
  const maxPax = d3.max(meaningfulValues);

  // Color scale for real months
  const color = d3.scaleSequential()
    .domain([minPax, maxPax])
    .interpolator(d3.interpolateBlues);

  // Threshold for tiny values
  const tinyThreshold = 30_000_000;

  const svg = heatEl.append("svg")
      .attr("width", width)
      .attr("height", height);

  const margin = { top: 40, right: 90, bottom: 30, left: 55 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const cellW = innerWidth / 12;
  const cellH = innerHeight / years.length;

  const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Axes
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // X labels
  g.selectAll(".x-label")
    .data(months)
    .enter()
    .append("text")
    .attr("x", d => (d-1)*cellW + cellW/2)
    .attr("y", -6)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text(d => monthNames[d-1]);

  // Y labels
  g.selectAll(".y-label")
    .data(years)
    .enter()
    .append("text")
    .attr("x", -8)
    .attr("y", (year, i) => i*cellH + cellH/2)
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "middle")
    .attr("font-size", 12)
    .text(year => year);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Draw cells
  years.forEach((yr, yi) => {
    months.forEach((m, mi) => {
      const value = lookup[yr]?.[m] || 0;

      g.append("rect")
        .attr("x", (m-1)*cellW)
        .attr("y", yi*cellH)
        .attr("width", cellW - 1)
        .attr("height", cellH - 1)
        .attr("fill", value < tinyThreshold ? "#e0e0e0" : color(value))
        .on("mouseenter", (event) => {
          tooltip.style("opacity", 1)
            .html(`<strong>${monthNames[m-1]} ${yr}</strong><br>${formatNumber(value)} passengers`);
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY + 10 + "px");
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));
    });
  });

  // Annotate major US events along the y-axis
  const events = [
    { year: 2001, label: "9/11" },
    { year: 2008, label: "Recession" },
    { year: 2020, label: "COVID-19" },
  ];
  const eventLookup = new Map(events.map((e) => [e.year, e.label]));
  const eventGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left + innerWidth + 20},${margin.top})`)
    .attr("class", "event-markers");

  const markers = eventGroup
    .selectAll(".event-marker")
    .data(years.filter((y) => eventLookup.has(y)))
    .enter()
    .append("g")
    .attr("class", "event-marker")
    .attr("transform", (y) => `translate(0, ${years.indexOf(y) * cellH + cellH / 2})`);

  markers
    .append("circle")
    .attr("r", 3)
    .attr("fill", "#e71419");

  markers
    .append("text")
    .attr("x", 8)
    .attr("dy", "0.32em")
    .attr("text-anchor", "start")
    .attr("font-size", 10.5)
    .attr("fill", "#ef4444")
    .text((y) => eventLookup.get(y));
}

// Render all views once data is available
loadData().then(() => {
  updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
  renderCarrierList({ year: state.year, month: state.month, origin: state.origin });
  renderMarketShare();
  renderSeasonalHeatmap(); 
});

// Seasonal scatter + histogram (Altair spec)
fetch("../data/linked_scatter_histogram.json")
  .then(r => {
    console.log("Fetch status:", r.status);
    return r.json();
  })
  .then(spec => {
    console.log("Spec loaded:", spec);
    vegaEmbed("#seasonalChart", spec, { actions: false })
      .catch(err => console.error("Embed error:", err));
  })
  .catch(err => console.error("Fetch error:", err));

// Export PNG for Vega/Altair canvases and SVG map
async function downloadPNG(containerId) {
  const canvas = document.querySelector(`#${containerId} canvas`);
  const svg = document.querySelector(`#${containerId} svg`);
  if (canvas) {
    const a = document.createElement('a');
    a.download = `${containerId}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    return;
  }
  if (svg) {
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = window.btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = function () {
      const c = document.createElement('canvas');
      c.width = svg.clientWidth || svg.viewBox.baseVal.width || 1200;
      c.height = svg.clientHeight || svg.viewBox.baseVal.height || 600;
      c.getContext('2d').drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `${containerId}.png`;
      a.href = c.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + svg64;
    return;
  }
  alert('Export available for rendered charts only.');
}

// Init on load
(async function init() {
  await loadData();
  syncFilters();
  renderMarketShare();
})();

window.addEventListener(
  'resize',
  debounce(() => {
    renderMarketShare();
  }, 150)
);
