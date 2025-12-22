/**
 * seasonal-heatmap.js
 * Seasonal passenger heatmap visualization
 */

import * as d3 from 'd3';
import { assetUrl, formatNumber } from '../utils/helpers.js';
import { MONTH_NAMES } from '../utils/constants.js';

let heatmapTooltip = null;

/**
 * Tear down any existing heatmap artifacts (used for StrictMode double-mount)
 */
export function cleanupSeasonalHeatmap() {
  // If duplicate containers somehow exist, clear them all
  document.querySelectorAll("#seasonHeatmap").forEach((el, idx) => {
    // Keep the first container and simply clear children; remove any extras entirely
    if (idx === 0) {
      el.innerHTML = '';
    } else {
      el.remove();
    }
  });
  d3.selectAll(".tooltip.heatmap-tooltip").remove();
  heatmapTooltip = null;
}

/**
 * Render the seasonal heatmap grid
 */
export async function renderSeasonalHeatmap() {
  // Clear previous render to avoid duplicate charts in StrictMode/dev
  cleanupSeasonalHeatmap();

  // Ensure we only have a single container to draw into
  const containers = document.querySelectorAll("#seasonHeatmap");
  const targetEl = containers[0] || document.getElementById("seasonHeatmap");
  if (!targetEl) return;
  const heatEl = d3.select(targetEl);

  const width = heatEl.node().clientWidth;
  const height = heatEl.node().clientHeight;

  // Load the monthly totals (precomputed JSON; see build script)
  const monthly = await fetch(assetUrl('data/monthly_metrics.json')).then(r => r.json());

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
  // Single shared tooltip for this chart
  heatmapTooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip heatmap-tooltip")
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
          heatmapTooltip.style("opacity", 1)
            .html(`<strong>${monthNames[m-1]} ${yr}</strong><br>${formatNumber(value)} passengers`);
        })
        .on("mousemove", (event) => {
          heatmapTooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY + 10 + "px");
        })
        .on("mouseleave", () => heatmapTooltip.style("opacity", 0));
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
