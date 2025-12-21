/**
 * main.js
 * Application bootstrap and initialization
 */

import { loadData } from './data.js';
import { state } from './state.js';
import { updateFlowMap } from './flow-map.js';
import { renderCarrierList } from './carrier-list.js';
import { renderMarketShare } from './market-share.js';
import { renderSeasonalHeatmap } from './seasonal-heatmap.js';
import { initControls } from './ui-controls.js';
import { debounce } from './utils.js';

/**
 * Initialize the application
 */
async function init() {
  // Initialize AOS (scroll animations)
  AOS.init({ once: true, duration: 600, easing: 'ease-out' });

  // Initialize UI controls
  initControls();

  // Load all data
  await loadData();

  // Render all visualizations
  updateFlowMap({ year: state.year, month: state.month, origin: state.origin });
  renderCarrierList({ year: state.year, month: state.month, origin: state.origin });
  renderMarketShare();
  renderSeasonalHeatmap();

  // Load and render Vega/Altair seasonal scatter chart
  fetch("data/linked_scatter_histogram.json")
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

  // Handle window resize
  window.addEventListener(
    'resize',
    debounce(() => {
      renderMarketShare();
    }, 150)
  );
}

// Start the application
init();
