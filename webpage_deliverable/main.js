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
const zoomSlider = document.getElementById('zoomSlider');
const zoomVal = document.getElementById('zoomVal');
const zoomReset = document.getElementById('zoomReset');
const mapYearSelect = document.getElementById('mapYearSelect');
const mapMonthSelect = document.getElementById('mapMonthSelect');
const mapSort = document.getElementById('mapSort');
const mapTopSlider = document.getElementById('mapTopSlider');
const mapTopVal = document.getElementById('mapTopVal');

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

const state = { year: 2025, month: 0, origin: null };

let flowLinks = [];
let carriers = [];
let worldGeo = null;
let usaFeature = null;
let statesMesh = null;
let statesGeo = null;
let zoomBehavior = null;
let svgForZoom = null;
let originsByPeriod = new Map();
const mapFilters = { sortBy: 'PASSENGERS', top: 15 };

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

const tooltip = d3
  .select('body')
  .append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0)
  .style('pointer-events', 'none');

// Utils
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

// Load data (cleaned extracts)
async function loadData() {
  const [linksRaw, carrierDataRaw] = await Promise.all([
    fetch('data/flow_links.json').then((r) => r.json()),
    fetch('data/carriers_by_origin.json').then((r) => r.json()),
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

function syncFilters() {
  const { year, month, origin } = state;
  if (origin) {
    updateFlowMap({ year, month, origin });
    renderCarrierList({ year, month, origin });
  }
}

if (zoomSlider) {
  zoomSlider.addEventListener('input', () => {
    const k = +zoomSlider.value;
    zoomVal.textContent = `${k.toFixed(1)}x`;
    if (svgForZoom && zoomBehavior) {
      d3.select(svgForZoom).call(zoomBehavior.scaleTo, k);
    }
  });
}
if (zoomReset) {
  zoomReset.addEventListener('click', () => {
    if (svgForZoom && zoomBehavior) {
      d3.select(svgForZoom).transition().duration(200).call(zoomBehavior.transform, d3.zoomIdentity);
      zoomSlider.value = 1;
      zoomVal.textContent = '1.0x';
    }
  });
}

// ---- Routes map ----
function greatCircleCoords(d) {
  const from = [d.o_longitude, d.o_latitude];
  const to = [d.d_longitude, d.d_latitude];
  const interp = d3.geoInterpolate(from, to);
  return d3.range(0, 1.01, 0.02).map((t) => interp(t));
}

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
    } catch (err) {
      statesMesh = null;
      statesGeo = null;
    }
  }
  const countries = topojson.feature(worldGeo, worldGeo.objects.countries);
  if (!usaFeature) {
    usaFeature =
      countries.features.find((f) => f.id === '840') ||
      countries.features.find((f) => (f.properties.name || '').includes('United States')) ||
      null;
  }
  const land = usaFeature
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
      if (zoomSlider && zoomVal) {
        zoomSlider.value = event.transform.k.toFixed(2);
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
      (d) =>
        `<div class="carrier-item"><span>${d.d_city || d.DEST} (${d.DEST})</span><span>${formatNumber(
          d.PASSENGERS
        )} passengers · ${formatNumber(d.DEPARTURES)} flights</span></div>`
    )
    .join('');
  summaryEl.innerHTML = `
    <h4>${origin} — ${monthLabel(month)} ${year}</h4>
    <p><strong>${formatNumber(totalPassengers)}</strong> passengers across ${links.length} routes.</p>
    <p class="muted">Top destination: ${top.DEST} (${formatNumber(top.PASSENGERS)} pax)</p>
    <div style="margin-top:8px">${list}</div>
  `;
}

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
})();
