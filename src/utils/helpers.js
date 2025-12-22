/**
 * utils.js
 * Pure formatting and calculation helper functions
 */

import * as d3 from 'd3';
import { MONTH_NAMES, CARRIER_ALIASES } from './constants.js';

// Basic formatters for tooltips and labels
const fmt = new Intl.NumberFormat('en-US');

/**
 * Format a number with thousands separator
 * @param {number} n - Number to format
 * @returns {string} Formatted number or '—' if invalid
 */
export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return fmt.format(Math.round(n));
}

/**
 * Build a URL that respects Vite's configured base path.
 * @param {string} path - Path relative to the public root (e.g., "data/file.json")
 * @returns {string} Resolved asset URL
 */
export function assetUrl(path) {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Format a value as a percentage
 * @param {number} v - Value to format (0-1 range)
 * @returns {string} Formatted percentage or '—' if invalid
 */
export function formatPct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return (v * 100).toFixed(1) + '%';
}

/**
 * Convert month number to display label
 * @param {number} m - Month number (0 for all months, 1-12 for specific months)
 * @returns {string} Month label
 */
export function monthLabel(m) {
  if (!m) return 'All months';
  return MONTH_NAMES[m] || 'Month ' + m;
}

/**
 * Convert year number to display label
 * @param {number} y - Year number (0 for all years)
 * @returns {string} Year label
 */
export function yearLabel(y) {
  if (!y) return 'All years';
  return String(y);
}

/**
 * Apply carrier aliases for cleaner display
 * @param {string} name - Carrier name
 * @returns {string} Aliased carrier name
 */
export function displayCarrier(name) {
  return CARRIER_ALIASES[name] || name;
}

/**
 * Clean carrier name for legend display
 * @param {string} name - Carrier name
 * @returns {string} Cleaned carrier name
 */
export function legendLabel(name) {
  return displayCarrier(name)
    .replace(/\b(inc\.?|co\.?|corp\.?|corporation|l\.?l\.?c\.?)\b/gi, '')
    .replace(/[.,]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Simple debounce for resize handlers
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Generate intermediate coordinates for a smooth great-circle arc
 * @param {Object} d - Data object with origin/destination coordinates
 * @returns {Array} Array of [longitude, latitude] coordinate pairs
 */
export function greatCircleCoords(d) {
  const from = [d.o_longitude, d.o_latitude];
  const to = [d.d_longitude, d.d_latitude];
  const interp = d3.geoInterpolate(from, to);
  return d3.range(0, 1.01, 0.02).map((t) => interp(t));
}
