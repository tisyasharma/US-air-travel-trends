# Passenger Travel Analysis

Interactive visuals of U.S. flight trends (1999–2024): route flows, carrier market share, and seasonal capacity using cleaned T-100 data.

Live demo: replace with your GitHub Pages URL, e.g. `https://<username>.github.io/US-air-travel-trends/`. The steps below are only needed if you want to rebuild data or preview locally.

## Highlights
- Interactive route map (D3 + TopoJSON) with filtering by origin, year, month, and top-N routes.
- Market share and seasonality charts (Vega-Lite) using lightweight JSON extracts.
- One-step data build script that mirrors outputs to both `data/` and `webpage_deliverable/data/` for the static site.

## Screenshots
Add your visuals under `docs/` and update the links:
- ![Hero](docs/hero.png) — landing section
- ![Routes map](docs/routes.png) — map with filters visible
- ![Market share](docs/market-share.png) — stacked area chart

## Project layout
- `index.html`, `main.js`, `styles.css` — static site.
- `data/` — JSON feeds for the site plus raw/clean CSV inputs (not committed).
- `webpage_deliverable/data/` — bundled copy of the JSON feeds for submission.
- `scripts/build_web_data.py` — prepares JSON extracts from cleaned CSVs.
- `notebooks/analysis.ipynb`, `notebooks/data_cleaning.ipynb` — exploration and cleaning notebooks.
- `data/*.json` — frontend JSON assets (e.g., `linked_scatter_histogram.json` Altair spec) mirrored to `webpage_deliverable/data/`.

## Local build (optional)
1) Install: `pip install -r requirements.txt` (Python 3.9+).  
2) Add data:
   - Cleaned flight CSVs → `data/clean_data/flights_*_clean.csv`
   - `airports.csv` → `data/airports.csv` (or keep legacy `other_data/airports.csv`)
3) Build JSON for the site:
   ```bash
   python scripts/build_web_data.py
   ```
   Outputs: `data/flow_links.json`, `data/carriers_by_origin.json`, `data/monthly_metrics.json`, `data/carrier_market_share.json` (mirrored to `webpage_deliverable/data/`).
4) View the site locally:
   ```bash
   python -m http.server 8000
   ```

## Data pipeline
- Raw T-100 files (1999–2024) → `data/raw_data/`
- Cleaned flight CSVs → `data/clean_data/`
- `scripts/build_web_data.py` joins airport metadata, trims to top routes/carriers, and writes the JSON feeds.
- Outputs mirrored to `data/` and `webpage_deliverable/data/` for the static site (including non-generated JSON assets in `data/`).
- If source data changes, rerun the build script and refresh the page.

## Data sources & downloads
- Flight data: BTS T-100 Segment data (domestic + international). Download monthly CSVs, place in `data/raw_data/`, run your cleaning to populate `data/clean_data/`.
- Airport metadata: `airports.csv` (IATA, city, state, country, lat/lon). Place in `data/airports.csv` (fallback: `other_data/airports.csv`).
- Keep large raw/clean CSVs out of Git; consider Git LFS if you must share full datasets.

## Methods & sanity checks
- Build step prints row counts per extract; ensure JSONs exist in both `data/` and `webpage_deliverable/data/`.
- Spot-check a few records in `flow_links.json` and `carriers_by_origin.json` for sensible values (PASSENGERS, lat/lon).
- Validate code loads: `python -m py_compile scripts/build_web_data.py`.
- For local dev, rerun the build after updating source CSVs and hard-refresh the browser cache.

## Notes for contributors
- Keep large raw/clean CSVs out of Git; only the derived JSON feeds need to be versioned.
- Refresh screenshots in `docs/` after visual tweaks so the README stays current.

## License
MIT — see `LICENSE`.
