# US Air Travel Trends (1999-2024)

An interactive data visualization exploring 25 years of U.S. domestic air travel patterns, market dynamics, and the impact of major economic events including 9/11, the 2008 financial crisis, and COVID-19.

**DS4200 Final Project** | Tisya Sharma | Northeastern University

[**Live Demo →**](https://tisyasharma.github.io/US-air-travel-trends/)

---

## Overview

This project analyzes over 25 years of flight data from the Bureau of Transportation Statistics to reveal patterns in passenger behavior, airline market evolution, and industry resilience through major disruptions. The interactive visualizations allow users to explore route networks, seasonal trends, carrier market share, and capacity utilization across different time periods.

## Tech Stack

- **React 18** - Component-based UI architecture
- **Vite** - Modern build tool with fast HMR
- **D3.js 7** - Custom interactive visualizations (flow map, area chart, heatmap)
- **Vega-Lite** - Declarative linked scatter plot and histogram
- **CSS3** - Custom dark theme with responsive design

## Features

- **Interactive Route Map** - Visualize passenger flow from any origin airport with dynamic filtering
- **Market Share Evolution** - Track airline dominance and consolidation over 25 years
- **Seasonal Patterns** - Heatmap revealing cyclical travel trends and anomalies
- **Capacity Analysis** - Explore load factor distributions and seat utilization
- **Historical Timeline** - Annotated visualization of major industry events

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (localhost:8000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
/
├── src/
│   ├── components/          # React components
│   │   ├── Navigation.jsx
│   │   ├── Hero.jsx
│   │   ├── Overview.jsx
│   │   ├── RoutesMap.jsx   # D3 flow map visualization
│   │   ├── MarketShare.jsx  # D3 stacked area chart
│   │   ├── SeasonalHeatmap.jsx
│   │   ├── SeasonalCapacity.jsx  # Vega-Lite scatter + histogram
│   │   ├── TravelTimeline.jsx
│   │   ├── Conclusion.jsx
│   │   ├── Methods.jsx
│   │   ├── References.jsx
│   │   ├── Footer.jsx
│   │   └── BackToTop.jsx
│   │
│   ├── hooks/              # Data loading hooks
│   │   └── useData.js
│   │
│   ├── visualizations/      # D3 visualization logic
│   │   ├── flow-map.js
│   │   ├── carrier-list.js
│   │   ├── market-share.js
│   │   ├── seasonal-heatmap.js
│   │   └── tooltip.js
│   │
│   ├── utils/              # Shared utilities
│   │   ├── constants.js    # Color palettes, lookups
│   │   └── helpers.js      # Formatting functions
│   │
│   ├── App.jsx             # Root component
│   └── main.jsx            # Application entry point
│
├── data/                    # Source data for processing (not in version control)
│   ├── raw_data/           # Raw BTS CSV files (gitignored)
│   └── clean_data/         # Processed CSVs (gitignored)
│
├── public/
│   ├── data/               # Production JSON files served by Vite (~61MB)
│
├── scripts/                 # Python data processing pipeline
├── notebooks/               # Jupyter notebooks for analysis
├── styles.css              # Global dark theme styles
├── vite.config.js          # Vite configuration
└── package.json
```

## Data Sources

This project uses the **BTS T-100 Domestic Segment Database** from the U.S. Bureau of Transportation Statistics, covering domestic flight operations from 1999-2024. The raw data includes carrier, route, passenger counts, seats, and departures for all U.S. domestic flights.

**Data Processing:** Raw CSVs are cleaned and aggregated using Python/Pandas, then exported to web-optimized JSON files served by the React app.

## Architecture

### Visualization Implementation

- **Flow Map** - D3 projection, GeoJSON rendering, interactive origin selection
- **Market Share** - D3 stacked area chart with toggleable carriers
- **Seasonal Heatmap** - D3 grid layout with color scale showing passenger volumes
- **Capacity Analysis** - Vega-Lite linked views (scatter plot + histogram)
- **Timeline** - Annotated line chart with major historical events

### Technical Decisions

- **D3 Integration**: D3 visualizations use direct DOM manipulation within React `useEffect` hooks
- **State Management**: Global data cache with local component state (lightweight, no Redux needed)
- **Styling**: CSS custom properties for consistent theming across components
- **Data Loading**: Asynchronous JSON fetch on mount with error handling

## Data Pipeline

The data pipeline rebuilds production JSON files from raw BTS data:

```bash
# 1. Install Python dependencies (Python 3.9+)
pip install -r requirements.txt

# 2. Add source data to data/ directory
#    - flights_*_clean.csv → data/clean_data/
#    - airports.csv → data/

# 3. Run the build script (outputs to public/data/)
python scripts/build_web_data.py
```

**Outputs:**
- `flow_links.json` - Route-level passenger flows
- `carriers_by_origin.json` - Carrier data by airport
- `monthly_metrics.json` - Aggregated time series
- `carrier_market_share.json` - Market share percentages

The Vega-Lite specification (`linked_scatter_histogram.json`) is generated separately in the Jupyter notebooks.

## Deployment

```bash
# Build for production
npm run build

# Deploy dist/ to hosting service
# Recommended: Vercel, Netlify, or GitHub Pages
```

The production build outputs to `/dist` and includes all optimized assets and data files.

## Browser Support

Modern browsers with ES6+ support (Chrome, Firefox, Safari, Edge). Tested on desktop and mobile viewports.

---

## License

MIT License - Academic project for educational purposes.

## Acknowledgments

Data provided by the U.S. Bureau of Transportation Statistics. Built with React, D3.js, Vega-Lite, and Vite. 
