# Passenger Travel Analysis

Built interactive visuals of U.S. flight trends (1999–2024): route flows, carrier market share, and seasonal capacity using cleaned T-100 data.

Website Link: https://tisyasharma.github.io/US-air-travel-trends/. The steps below are only needed if you want to rebuild data or preview locally.

## Highlights
- Built an interactive route map (D3 + TopoJSON) with filtering by origin, year, month, and top-N routes.
- Built market share and seasonality charts (Vega-Lite) using lightweight JSON extracts.
- Automated data prep with a single build script that writes the JSON feeds used by the site.

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

## Data & build
- Inputs live in `data/raw_data/` (T-100 CSVs) and `data/clean_data/` (cleaned flights). `airports.csv` goes in `data/` (fallback: `other_data/airports.csv`).
- `scripts/build_web_data.py` joins airport metadata, trims to top routes/carriers, and writes the JSON feeds.
- Outputs land in `data/` for the static site (including non-generated JSON assets in `data/`).
- Rebuild + preview locally:
  ```bash
  python scripts/build_web_data.py
  python -m http.server 8000
  ```
- Data sources: BTS T-100 Segment data (1999–2024) from [transtats.bts.gov](https://transtats.bts.gov/Fields.asp?gnoyr_VQ=FMG) and an airport lookup with IATA, city, state, country, lat/lon. 