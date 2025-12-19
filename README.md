# Passenger Travel Analysis

Built interactive visuals of U.S. flight trends (1999–2024): route flows, carrier market share, and seasonal capacity using cleaned T-100 data.

Website Link: https://tisyasharma.github.io/US-air-travel-trends/. The steps below are only needed if you want to rebuild data or preview locally.

## Highlights
- Built an interactive route map (D3 + TopoJSON) with filtering by origin, year, month, and top-N routes.
- Built market share and seasonality charts (Vega-Lite) using lightweight JSON extracts.
- Automated data prep with a single build script that writes the JSON feeds used by the site.

## Screenshots
- ![Hero](docs/hero.png) — landing section
- ![Routes map](docs/routes.png) — map with filters visible
- ![Market share](docs/market-share.png) — stacked area chart

## Project layout
- [`index.html`](index.html), [`main.js`](main.js), [`styles.css`](styles.css) — static site.
- [`scripts/build_web_data.py`](scripts/build_web_data.py) — data pipeline for JSON feeds.
- [`data/`](data/) — JSON outputs and raw/clean CSV inputs (inputs not committed).
- [`data/*.json`](data/) — frontend JSON assets (e.g., `linked_scatter_histogram.json` Altair spec).
- [`notebooks/01_data_cleaning.ipynb`](notebooks/01_data_cleaning.ipynb), [`notebooks/02_analysis.ipynb`](notebooks/02_analysis.ipynb) — cleaning and analysis notebooks (in order).
- [`docs/`](docs/) — screenshots/assets.

## Local build (optional)
1) Install: `pip install -r requirements.txt` (Python 3.9+).  
2) Add data:
   - Cleaned flight CSVs → `data/clean_data/flights_*_clean.csv`
   - `airports.csv` → `data/airports.csv` (or keep legacy `other_data/airports.csv`)
3) Build JSON for the site:
   ```bash
   python scripts/build_web_data.py
   ```
   Outputs: `data/flow_links.json`, `data/carriers_by_origin.json`, `data/monthly_metrics.json`, `data/carrier_market_share.json`.
4) View the site locally:
   ```bash
   python -m http.server 8000
   ```

## Data pipeline
- Raw T-100 files (1999–2024) → `data/raw_data/`
- Cleaned flight CSVs → `data/clean_data/`
- Airport lookup → `data/airports.csv` (required for rebuilds; not included in the repo)
- `scripts/build_web_data.py` joined airport metadata, trimmed to top routes/carriers, and wrote the JSON feeds.
- Outputs landed in `data/` for the static site (including non-generated JSON assets in `data/`).
- If source data changes, rerun the build script and refresh the page.

## Data sources & downloads
- Flight data: BTS T-100 Segment data (domestic + international). Download monthly CSVs, place in `data/raw_data/`, run your cleaning to populate `data/clean_data/`.
- Airport metadata: `airports.csv` (IATA, city, state, country, lat/lon). Place in `data/airports.csv` (fallback: `other_data/airports.csv`).
- Keep large raw/clean CSVs out of Git; consider Git LFS if you must share full datasets.

## Methods & sanity checks
- Build step prints row counts per extract; ensure JSONs exist in `data/`.
- Spot-checked records in `flow_links.json` and `carriers_by_origin.json` for sensible values (PASSENGERS, lat/lon).
- Validated code loads: `python -m py_compile scripts/build_web_data.py`.
- For local dev, rerun the build after updating source CSVs and hard-refresh the browser cache.

## Notes for contributors
- Keep large raw/clean CSVs out of Git; only the derived JSON feeds need to be versioned.
- Refresh screenshots in `docs/` after visual tweaks so the README stays current.

## License
MIT — see `LICENSE`.
