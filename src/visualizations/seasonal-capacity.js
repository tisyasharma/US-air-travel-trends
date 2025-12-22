/**
 * seasonal-capacity.js
 * Interactive scatter plot + histogram with brushing
 * Shows seasonal capacity patterns with load factor analysis
 */

import * as d3 from 'd3';
import { assetUrl, formatNumber, formatPct } from '../utils/helpers.js';
import { tooltip, hideTooltip } from './tooltip.js';

const SEASON_COLORS = {
  Winter: '#1e3a8a',
  Spring: '#10b981',
  Summer: '#f59e0b',
  Fall: '#b45309'
};

const SEASON_ORDER = ['Winter', 'Spring', 'Summer', 'Fall'];

let brushSelection = null;
let scatterData = [];

/**
 * Render the seasonal capacity visualization (scatter + histogram)
 */
export async function renderSeasonalCapacity() {
  const container = d3.select('#seasonalChart');
  const node = container.node();
  container.selectAll('*').remove();

  if (!node) return;

  // Load the seasonal data from the Vega spec
  const spec = await fetch(assetUrl('data/linked_scatter_histogram.json')).then(r => r.json());
  const data = spec.datasets['data-b1b09d8d7e5ff0dc8c49e6775a44f3f7'];
  scatterData = data;

  const containerWidth = node.clientWidth || 960;
  const containerHeight = node.clientHeight || 480;

  // Create wrapper for both charts
  const wrapper = container.append('div').style('display', 'flex').style('gap', '20px');

  // Scatter plot container
  const scatterContainer = wrapper
    .append('div')
    .style('flex', '1')
    .attr('id', 'scatterPlot');

  // Histogram container
  const histContainer = wrapper
    .append('div')
    .style('width', '320px')
    .attr('id', 'histogramPlot');

  renderScatterPlot(scatterContainer, data, containerWidth, containerHeight);
  renderHistogram(histContainer, data, containerHeight);
}

/**
 * Render scatter plot with brush selection
 */
function renderScatterPlot(container, data, containerWidth, containerHeight) {
  const width = Math.max(600, containerWidth * 0.6);
  const height = 450;
  const margin = { top: 40, right: 20, bottom: 50, left: 70 };

  const svg = container.append('svg').attr('width', width).attr('height', height);

  // Title
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('font-size', 16)
    .attr('font-weight', 600)
    .text('Seasonal Scatter — Select a Region');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const xExtent = d3.extent(data, d => d.SEATS);
  const yExtent = d3.extent(data, d => d.PASSENGERS);
  const loadExtent = d3.extent(data, d => d.capacity_percent);

  const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]).nice();
  const yScale = d3.scaleLinear().domain(yExtent).range([innerHeight, 0]).nice();
  const sizeScale = d3
    .scaleSqrt()
    .domain(d3.extent(data, d => d.DEPARTURES_PERFORMED))
    .range([10, 300]);

  // Color scale for load factor
  const colorScale = d3
    .scaleSequential(d3.interpolateReds)
    .domain(loadExtent);

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(8).tickFormat(d => (d / 1e6).toFixed(0) + 'M'))
    .selectAll('text')
    .style('font-size', 11);

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => (d / 1e6).toFixed(0) + 'M'))
    .selectAll('text')
    .style('font-size', 11);

  // Axis labels
  svg
    .append('text')
    .attr('x', margin.left + innerWidth / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .text('Total Seasonal Seats');

  svg
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(margin.top + innerHeight / 2))
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .text('Total Seasonal Passengers');

  // Shape mapping for seasons
  const shapes = {
    Winter: d3.symbol().type(d3.symbolCircle),
    Spring: d3.symbol().type(d3.symbolSquare),
    Summer: d3.symbol().type(d3.symbolTriangle),
    Fall: d3.symbol().type(d3.symbolDiamond)
  };

  // Draw points
  const circles = g
    .selectAll('.scatter-point')
    .data(data)
    .join('path')
    .attr('class', 'scatter-point')
    .attr('d', d => shapes[d.SEASON].size(sizeScale(d.DEPARTURES_PERFORMED))())
    .attr('transform', d => `translate(${xScale(d.SEATS)},${yScale(d.PASSENGERS)})`)
    .attr('fill', d => colorScale(d.capacity_percent))
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5)
    .attr('opacity', 0.7)
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => showScatterTooltip(event, d))
    .on('mousemove', (event, d) => showScatterTooltip(event, d))
    .on('mouseleave', hideTooltip);

  // Brush
  const brush = d3
    .brush()
    .extent([
      [0, 0],
      [innerWidth, innerHeight]
    ])
    .on('brush end', (event) => {
      brushSelection = event.selection;
      updateBrushedPoints(circles);
      renderHistogram(d3.select('#histogramPlot'), data, height);
    });

  g.append('g').attr('class', 'brush').call(brush);
}

/**
 * Update point styling based on brush selection
 */
function updateBrushedPoints(circles) {
  if (!brushSelection) {
    circles.attr('opacity', 0.7).attr('stroke-width', 0.5);
    return;
  }

  const [[x0, y0], [x1, y1]] = brushSelection;

  circles.each(function (d) {
    const x = parseFloat(d3.select(this).attr('transform').match(/translate\(([^,]+)/)[1]);
    const y = parseFloat(d3.select(this).attr('transform').match(/,([^)]+)/)[1]);
    const selected = x >= x0 && x <= x1 && y >= y0 && y <= y1;

    d3.select(this)
      .attr('opacity', selected ? 0.9 : 0.2)
      .attr('stroke-width', selected ? 1 : 0.5);
  });
}

/**
 * Render histogram of load factors
 */
function renderHistogram(container, data, containerHeight) {
  container.selectAll('*').remove();

  const width = 320;
  const height = 450;
  const margin = { top: 40, right: 20, bottom: 50, left: 60 };

  const svg = container.append('svg').attr('width', width).attr('height', height);

  // Title
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('font-size', 14)
    .attr('font-weight', 600)
    .text('Load Factor Distribution');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Filter data based on brush selection
  let filteredData = data;
  if (brushSelection && scatterData.length > 0) {
    const [[x0, y0], [x1, y1]] = brushSelection;
    const xExtent = d3.extent(scatterData, d => d.SEATS);
    const yExtent = d3.extent(scatterData, d => d.PASSENGERS);
    const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(yExtent).range([innerHeight, 0]);

    filteredData = data.filter(d => {
      const x = xScale(d.SEATS);
      const y = yScale(d.PASSENGERS);
      return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    });
  }

  if (!filteredData.length) {
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('class', 'muted')
      .text('Select a region on the scatter plot');
    return;
  }

  // Histogram binning
  const bins = d3
    .bin()
    .domain([0, 1])
    .thresholds(20)
    .value(d => d.capacity_percent)(filteredData);

  // Group by season within each bin
  bins.forEach(bin => {
    bin.bySeason = d3.rollup(
      bin,
      v => v.length,
      d => d.SEASON
    );
  });

  // Scales
  const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .range([innerHeight, 0])
    .nice();

  // Stack data by season
  const stack = d3
    .stack()
    .keys(SEASON_ORDER)
    .value((bin, season) => bin.bySeason.get(season) || 0);

  const series = stack(bins);

  // Draw bars
  g.selectAll('.season-bars')
    .data(series)
    .join('g')
    .attr('class', 'season-bars')
    .attr('fill', d => SEASON_COLORS[d.key])
    .selectAll('rect')
    .data(d => d)
    .join('rect')
    .attr('x', d => xScale(d.data.x0))
    .attr('y', d => yScale(d[1]))
    .attr('width', d => Math.max(0, xScale(d.data.x1) - xScale(d.data.x0) - 1))
    .attr('height', d => yScale(d[0]) - yScale(d[1]))
    .attr('opacity', 0.9);

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.0%')))
    .selectAll('text')
    .style('font-size', 10);

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5))
    .selectAll('text')
    .style('font-size', 10);

  // Axis labels
  svg
    .append('text')
    .attr('x', margin.left + innerWidth / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .text('Load Factor');

  svg
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(margin.top + innerHeight / 2))
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .text('Count');

  // Legend
  const legend = svg
    .append('g')
    .attr('transform', `translate(${width - 80},${margin.top + 20})`);

  SEASON_ORDER.forEach((season, i) => {
    const lg = legend.append('g').attr('transform', `translate(0,${i * 20})`);

    lg.append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', SEASON_COLORS[season]);

    lg.append('text')
      .attr('x', 16)
      .attr('y', 10)
      .attr('font-size', 10)
      .text(season);
  });
}

/**
 * Show tooltip for scatter point
 */
function showScatterTooltip(event, d) {
  const html = `
    <div><strong>${d.SEASON} ${d.YEAR}</strong></div>
    <div>Load Factor: ${formatPct(d.capacity_percent)}</div>
    <div>Passengers: ${formatNumber(d.PASSENGERS)}</div>
    <div>Seats: ${formatNumber(d.SEATS)}</div>
    <div>Departures: ${formatNumber(d.DEPARTURES_PERFORMED)}</div>
  `;
  const [px, py] = d3.pointer(event, document.body);
  tooltip
    .html(html)
    .style('opacity', 1)
    .style('display', 'block')
    .style('left', `${px + 14}px`)
    .style('top', `${py + 14}px`);
}
