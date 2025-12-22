/**
 * travel-timeline.js
 * Annotated timeline showing travel volume trends with historical events
 */

import * as d3 from 'd3';
import { assetUrl, formatNumber } from '../utils/helpers.js';
import { tooltip, hideTooltip } from './tooltip.js';

// Historical events to annotate
const EVENTS = [
  { year: 2001, month: 9, label: '9/11 Attacks', color: '#ef4444' },
  { year: 2008, month: 9, label: 'Great Recession', color: '#f97316' },
  { year: 2013, month: 12, label: 'AA-US Airways Merger', color: '#3b82f6' },
  { year: 2020, month: 3, label: 'COVID-19 Pandemic', color: '#dc2626' },
  { year: 2021, month: 6, label: 'Travel Recovery Begins', color: '#10b981' }
];

/**
 * Render the travel volume timeline with annotations
 */
export async function renderTravelTimeline() {
  const container = d3.select('#timelineChart');
  const node = container.node();
  container.selectAll('*').remove();

  if (!node) return;

  // Load monthly metrics data
  const monthlyData = await fetch(assetUrl('data/monthly_metrics.json')).then(r => r.json());

  // Aggregate by month across all sectors
  const aggregated = d3.rollups(
    monthlyData,
    v => ({
      passengers: d3.sum(v, d => d.PASSENGERS),
      year: v[0].YEAR,
      month: v[0].MONTH,
      date: new Date(v[0].YEAR, v[0].MONTH - 1, 1)
    }),
    d => `${d.YEAR}-${d.MONTH}`
  );

  const data = aggregated.map(([, val]) => val).sort((a, b) => a.date - b.date);

  // Calculate index relative to 1999 baseline
  const baseline1999 = d3.mean(
    data.filter(d => d.year === 1999),
    d => d.passengers
  );

  data.forEach(d => {
    d.index = (d.passengers / baseline1999) * 100;
  });

  const width = node.clientWidth || 960;
  const height = 500;
  const margin = { top: 60, right: 40, bottom: 50, left: 60 };

  const svg = container.append('svg').attr('width', width).attr('height', height);

  // Title
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', 18)
    .attr('font-weight', 600)
    .text('U.S. Air Travel Volume Index (1999 = 100)');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, innerWidth]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, d => d.index) * 1.1])
    .range([innerHeight, 0])
    .nice();

  // Line generator
  const line = d3
    .line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.index))
    .curve(d3.curveMonotoneX);

  // Draw baseline at 100
  g.append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', yScale(100))
    .attr('y2', yScale(100))
    .attr('stroke', '#9ca3af')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,4')
    .attr('opacity', 0.6);

  g.append('text')
    .attr('x', innerWidth - 5)
    .attr('y', yScale(100) - 5)
    .attr('text-anchor', 'end')
    .attr('font-size', 11)
    .attr('fill', '#6b7280')
    .text('1999 baseline');

  // Draw area under the line
  const area = d3
    .area()
    .x(d => xScale(d.date))
    .y0(innerHeight)
    .y1(d => yScale(d.index))
    .curve(d3.curveMonotoneX);

  g.append('path')
    .datum(data)
    .attr('d', area)
    .attr('fill', 'url(#areaGradient)')
    .attr('opacity', 0.3);

  // Define gradient
  const gradient = svg
    .append('defs')
    .append('linearGradient')
    .attr('id', 'areaGradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%');

  gradient.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.4);
  gradient.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0);

  // Draw main line
  g.append('path')
    .datum(data)
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', '#2563eb')
    .attr('stroke-width', 2.5);

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(width < 640 ? 8 : 12))
    .selectAll('text')
    .style('font-size', 11);

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => d.toFixed(0)))
    .selectAll('text')
    .style('font-size', 11);

  // Axis labels
  svg
    .append('text')
    .attr('x', margin.left + innerWidth / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .text('Year');

  svg
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(margin.top + innerHeight / 2))
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .text('Travel Volume Index');

  // Add event annotations
  EVENTS.forEach(event => {
    const eventDate = new Date(event.year, event.month - 1, 1);
    const dataPoint = data.find(d => d.year === event.year && d.month === event.month) ||
      data.find(d => d.year === event.year);

    if (!dataPoint) return;

    const x = xScale(eventDate);
    const y = yScale(dataPoint.index);

    // Vertical line to event
    g.append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', y)
      .attr('y2', -15)
      .attr('stroke', event.color)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.7);

    // Event marker
    g.append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 4)
      .attr('fill', event.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Event label
    const labelY = -20 - (EVENTS.indexOf(event) % 2) * 20;
    g.append('text')
      .attr('x', x)
      .attr('y', labelY)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .attr('fill', event.color)
      .text(event.label);
  });

  // Interactive overlay for tooltip
  const bisect = d3.bisector(d => d.date).center;

  const focus = g
    .append('circle')
    .attr('r', 5)
    .attr('fill', '#2563eb')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('display', 'none');

  const overlay = svg
    .append('rect')
    .attr('fill', 'transparent')
    .attr('pointer-events', 'all')
    .attr('x', margin.left)
    .attr('y', margin.top)
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .on('mousemove', (event) => {
      const [mx] = d3.pointer(event, g.node());
      const date = xScale.invert(mx);
      const i = bisect(data, date);
      const d = data[Math.min(i, data.length - 1)];

      if (!d) return;

      focus.style('display', null).attr('cx', xScale(d.date)).attr('cy', yScale(d.index));

      const html = `
        <div><strong>${d3.timeFormat('%B %Y')(d.date)}</strong></div>
        <div>Index: ${d.index.toFixed(1)}</div>
        <div>Passengers: ${formatNumber(d.passengers)}</div>
        <div class="muted">${d.index > 100 ? '+' : ''}${(d.index - 100).toFixed(1)}% vs 1999</div>
      `;
      const [px, py] = d3.pointer(event, document.body);
      tooltip
        .html(html)
        .style('opacity', 1)
        .style('display', 'block')
        .style('left', `${px + 14}px`)
        .style('top', `${py + 14}px`);
    })
    .on('mouseleave', () => {
      focus.style('display', 'none');
      hideTooltip();
    });
}
