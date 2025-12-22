/**
 * tooltip.js
 * Shared tooltip management for D3 visualizations
 */

import * as d3 from 'd3';

// Shared tooltip used by the D3 map and Vega charts
export const tooltip = d3
  .select('body')
  .append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0)
  .style('pointer-events', 'none');

/**
 * Show tooltip with HTML content at mouse position
 * @param {Event} event - Mouse event
 * @param {string} html - HTML content to display
 */
export function showTooltip(event, html) {
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

/**
 * Hide the tooltip
 */
export function hideTooltip() {
  tooltip.style('opacity', 0).style('display', 'none');
}
