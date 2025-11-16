// Initialize AOS (scroll animations)
AOS.init({ once:true, duration:600, easing:'ease-out' });

// Back-to-top button visibility
const toTop = document.getElementById('toTop');
window.addEventListener('scroll', () => {
  toTop.style.display = window.scrollY > 600 ? 'block' : 'none';
});
toTop.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

// Theme toggle (simple class switch on <html>)
const themeToggle = document.getElementById('themeToggle');
let dark = false;
themeToggle.addEventListener('click', () => {
  dark = !dark;
  document.documentElement.classList.toggle('dark', dark);
  themeToggle.textContent = dark ? 'Light' : 'Dark';
});

// Global filters (wire these to your charts later)
const yearRange = document.getElementById('yearRange');
const yearVal = document.getElementById('yearVal');
const sectorSelect = document.getElementById('sectorSelect');

yearRange.addEventListener('input', () => {
  yearVal.textContent = yearRange.value;
  syncFilters();
});
sectorSelect.addEventListener('change', syncFilters);

function syncFilters(){
  const maxYear = +yearRange.value;
  const sector = sectorSelect.value; // 'all' | 'domestic' | 'international'
  updateTrendChart({ maxYear, sector });
  updateCompareChart({ maxYear, sector });
  updateEfficiencyChart({ maxYear, sector });
  updateHeatmap({ maxYear, sector });
}

// Altair / Vega-Lite helpers 
const accent1 = getComputedStyle(document.documentElement).getPropertyValue('--accent1').trim();
const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim();

function vlTheme(){
  return {
    background: '#ffffff',
    title: { color: '#111827', font: 'Inter', fontSize: 16, fontWeight: 600 },
    axis: { labelColor: '#374151', titleColor: '#374151', gridColor: '#e5e7eb' },
    legend: { labelColor: '#374151', titleColor: '#374151' },
    range: { category: [accent2, accent1, '#7c8aa6', '#aab6cf'] }
  };
}

async function embedVL(targetId, spec){
  const specFinal = { $schema:'https://vega.github.io/schema/vega-lite/v5.json', ...spec, config: vlTheme() };
  return vegaEmbed('#' + targetId, specFinal, { actions:false, renderer:'canvas' });
}

// ------- Chart stubs  -------
async function updateTrendChart({ maxYear=2024, sector='all' } = {}){
  const spec = {
    data: { values: [] }, // TODO: replace with url to your Altair-exported JSON
    mark: { type:'line', interpolate:'monotone', strokeWidth:2 },
    encoding: {
      x: { field:'Date', type:'temporal', title:null },
      y: { field:'Pax', type:'quantitative', title:'Passengers' },
      color: { value: accent2 }
    }
  };
  await embedVL('trendChart', spec);
}

async function updateCompareChart({ maxYear=2024 } = {}){
  const spec = {
    data: { values: [] }, // TODO
    mark: { type:'line', interpolate:'monotone', strokeWidth:2 },
    encoding: {
      x: { field:'Date', type:'temporal', title:null },
      y: { field:'Passengers', type:'quantitative', title:'Passengers' },
      color: { field:'Segment', type:'nominal', scale:{ range:[accent2, accent1] } }
    }
  };
  await embedVL('compareChart', spec);
}

async function updateEfficiencyChart({ maxYear=2024 } = {}){
  const spec = {
    data: { values: [] }, // TODO
    mark: { type:'point', filled:true, size:50, opacity:0.85 },
    encoding: {
      x: { field:'Flt', type:'quantitative', title:'Flights' },
      y: { field:'Pax', type:'quantitative', title:'Passengers' },
      color: { field:'Year', type:'quantitative', scale:{ scheme:'blues' } },
      tooltip: [ {field:'Year'}, {field:'Pax'}, {field:'Flt'} ]
    }
  };
  await embedVL('efficiencyChart', spec);
}

// D3 heatmap stub (replace with real data) 
function updateHeatmap({ maxYear=2024 } = {}){
  const el = d3.select('#heatmap');
  el.selectAll('*').remove();
  const width = el.node().clientWidth, height = el.node().clientHeight;
  const margin = { top:24, right:24, bottom:28, left:48 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const svg = el.append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Placeholder synthetic data: Year 1999..maxYear, Month 1..12
  const years = d3.range(1999, maxYear + 1);
  const months = d3.range(1, 13);
  const data = [];
  years.forEach(Y => months.forEach(M => data.push({ Year:Y, Month:M, Pax: 100 + (M===7||M===12?80:0) + (Y-1999)*2 })));

  const x = d3.scaleBand().domain(months).range([0, w]).padding(0.05);
  const y = d3.scaleBand().domain(years).range([0, h]).padding(0.05);
  const color = d3.scaleSequential(d3.interpolateBlues).domain(d3.extent(data, d => d.Pax));

  g.selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', d => x(d.Month))
    .attr('y', d => y(d.Year))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('rx', 3)
    .attr('fill', d => color(d.Pax))
    .append('title')
    .text(d => `${d.Year}-${String(d.Month).padStart(2,'0')}: ${Math.round(d.Pax)}k pax`);

  const ax = d3.axisBottom(x).tickFormat(m => d3.timeFormat('%b')(new Date(2000, m-1, 1)));
  const ay = d3.axisLeft(y).tickValues(years.filter(y => y % 2 === 1));
  g.append('g').attr('transform', `translate(0,${h})`).call(ax).selectAll('text').attr('font-size', 11);
  g.append('g').call(ay).selectAll('text').attr('font-size', 11);
}

// Export PNG for Vega/Altair canvases
async function downloadPNG(containerId){
  const el = document.querySelector(`#${containerId} canvas`);
  if(!el){ alert('Export available for Vega/Altair charts only.'); return; }
  const a = document.createElement('a');
  a.download = `${containerId}.png`;
  a.href = el.toDataURL('image/png');
  a.click();
}

// Init on load
(async function init(){
  updateTrendChart({});
  updateCompareChart({});
  updateEfficiencyChart({});
  updateHeatmap({});
})();
