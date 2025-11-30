# Passenger Travel Analysis

## Prerequisites
- Python 3.9+ with `pip`
- Source data needed:
  - `clean_data/flights_*_clean.csv` (cleaned flight records)

## Install
```bash
pip install -r requirements.txt
```

## Build web data
Runs the transform to produce the JSON extracts consumed by the webpage.
```bash
python scripts/build_web_data.py
```
Outputs land in `webpage_deliverable/data/`:
- `flow_links.json`
- `carriers_by_origin.json`
- `monthly_metrics.json`
- `carrier_market_share.json`


## Notes
- All processing is deterministic; rerun the build after updating source CSVs.
- Frontend uses static JSON. When data changes, rebuild and reload. 
