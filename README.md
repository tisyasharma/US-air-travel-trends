# US Air Travel Trends (1999-2024)

Interactive data visualization exploring 25 years of U.S. domestic air travel patterns, market dynamics, and the impact of major economic events.

**DS4200 Final Project** - Tisya Sharma | Northeastern University

**Live Site**: https://tisyasharma.github.io/US-air-travel-trends/

## Tech Stack

- **React** 18 - Component-based UI
- **Vite** - Fast development server & build tool
- **D3.js** 7 - Custom interactive visualizations
- **Vega-Lite** - Declarative chart specifications
- **Vanilla CSS** - Custom dark theme design

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (runs on port 8000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Note: If `npm run dev` reports `vite: command not found`, run `npm install` first.

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
├── data/                    # Pipeline inputs (raw/clean CSVs + airports.csv)
├── public/
│   ├── data/               # Runtime JSON served by Vite
│   └── annotated_timeline.png
│
├── scripts/                 # Data build scripts
├── notebooks/               # Analysis/Altair specs
├── styles.css              # Global dark theme styles
├── vite.config.js          # Vite configuration
└── package.json
```

## Data Sources

- **BTS T-100 Domestic Segment Data** (1999-2024)
- U.S. Bureau of Transportation Statistics
- Preprocessed with Python/Pandas into web-ready JSON

## Visualizations

1. **Passenger Flow Map** - Interactive D3 map showing top routes from selected origin
2. **Market Share Chart** - 100% stacked area chart of airline market share over time
3. **Seasonal Heatmap** - Month-by-year grid showing passenger volume patterns
4. **Capacity Analysis** - Vega-Lite linked scatter & histogram exploring load factors
5. **Travel Volume Timeline** - Annotated line chart of major historical events

## Development Notes

### Migration from Vanilla JS to React

This project was recently migrated from vanilla JavaScript to React + Vite:

- **Old structure**: Single `main.js` file (~1.2k lines) + `index.html`
- **New structure**: Modular React components + separated visualization logic
- **Benefits**: Better code organization, hot module reload, modern build tooling

### Key Technical Decisions

1. **D3 Integration**: D3 visualizations use direct DOM manipulation within `useEffect` hooks
2. **State Management**: Local component state (no Redux/Context needed for this scale)
3. **Styling**: Vanilla CSS with CSS custom properties for theming
4. **Data Loading**: JSON fetched at runtime (could be optimized with bundling)

## Data Pipeline (Optional)

If you need to rebuild the data from source:

1) Install Python dependencies: `pip install -r requirements.txt` (Python 3.9+)
2) Add source data:
   - Cleaned flight CSVs → `data/clean_data/flights_*_clean.csv`
   - `airports.csv` → `data/airports.csv`
3) Build JSON for the site (writes to `public/data/`):
   ```bash
   python scripts/build_web_data.py
   ```
4) Outputs: `public/data/flow_links.json`, `public/data/carriers_by_origin.json`, `public/data/monthly_metrics.json`, `public/data/carrier_market_share.json`
5) Optional: Rebuild the Seasonal Capacity Vega-Lite spec in `notebooks/02_analysis.ipynb` and save it to `public/data/linked_scatter_histogram.json`

## Build & Deploy

```bash
# Production build (outputs to /dist)
npm run build

# Preview production build locally
npm run preview

# Deploy dist/ folder to your hosting service
# (Vercel, Netlify, GitHub Pages, etc.)
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Tested on desktop; mobile responsive

## License

MIT - Academic project for educational purposes

## Acknowledgments

- D3.js community for visualization patterns
- BTS for comprehensive air travel data
- Vite team for excellent dev tooling 
