/**
 * ui-controls.js
 * DOM event listeners and UI control logic
 */

import { state, mapFilters, populateOriginSelect, dataCache } from './state.js';
import { updateFlowMap } from './flow-map.js';
import { renderCarrierList } from './carrier-list.js';

/**
 * Keep map + carrier panel in sync when filters change
 */
function syncFilters() {
  const { year, month, origin } = state;
  if (origin) {
    updateFlowMap({ year, month, origin });
    renderCarrierList({ year, month, origin });
  }
}

/**
 * Initialize all UI controls and event listeners
 */
export function initControls() {
  // Get DOM elements
  const originSelect = document.getElementById('originSelect');
  const mapYearSelect = document.getElementById('mapYearSelect');
  const mapMonthSelect = document.getElementById('mapMonthSelect');
  const mapSort = document.getElementById('mapSort');
  const mapTopSlider = document.getElementById('mapTopSlider');
  const mapTopVal = document.getElementById('mapTopVal');
  const zoomReset = document.getElementById('zoomReset');
  const zoomVal = document.getElementById('zoomVal');

  // Origin select change handler
  if (originSelect) {
    originSelect.addEventListener('change', () => {
      state.origin = originSelect.value;
      updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
      renderCarrierList({ year: state.year, month: state.month, origin: state.origin });
    });
  }

  // Year select change handler
  if (mapYearSelect) {
    mapYearSelect.addEventListener('change', () => {
      state.year = +mapYearSelect.value;
      populateOriginSelect(state.year, state.month);
      syncFilters();
    });
  }

  // Month select change handler
  if (mapMonthSelect) {
    mapMonthSelect.addEventListener('change', () => {
      state.month = +mapMonthSelect.value;
      populateOriginSelect(state.year, state.month);
      syncFilters();
    });
  }

  // Sort change handler
  if (mapSort) {
    mapSort.addEventListener('change', () => {
      mapFilters.sortBy = mapSort.value;
      updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
    });
  }

  // Top slider change handler
  if (mapTopSlider && mapTopVal) {
    mapTopVal.textContent = mapTopSlider.value;
    mapTopSlider.addEventListener('input', () => {
      mapFilters.top = +mapTopSlider.value;
      mapTopVal.textContent = mapTopSlider.value;
      updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
    });
  }

  // Zoom reset button
  if (zoomReset) {
    zoomReset.addEventListener('click', () => {
      if (zoomVal) zoomVal.textContent = '1.0x';
      updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
    });
  }

  // Back-to-top button visibility
  const toTop = document.getElementById('toTop');
  if (toTop) {
    window.addEventListener('scroll', () => {
      toTop.style.display = window.scrollY > 600 ? 'block' : 'none';
    });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

/**
 * Export PNG for Vega/Altair canvases and SVG map
 * @param {string} containerId - Container element ID
 */
export async function downloadPNG(containerId) {
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

// Make downloadPNG globally available for inline onclick handlers in HTML
window.downloadPNG = downloadPNG;
