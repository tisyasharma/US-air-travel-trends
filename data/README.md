# Data folder

Expected contents for rebuilding the site data:
- `raw_data/` — source T-100 CSVs (not tracked)
- `clean_data/` — cleaned flight CSVs (not tracked)
- `airports.csv` — airport lookup (IATA, name, city, state, country, latitude, longitude)
- JSON outputs produced by `scripts/build_web_data.py` (tracked, overwritten on rebuild):
  - `flow_links.json`
  - `carriers_by_origin.json`
  - `monthly_metrics.json`
  - `carrier_market_share.json`
  - `linked_scatter_histogram.json` (Altair spec)

Note: `airports.csv` is required for rebuilds but is not included in the repo. Place it here before running the build script.
