"""
Build small, frontend-ready data extracts from the cleaned T-100 files.

- Top 200 routes per (year, month) with coordinates for map arcs.
- Top carriers per origin for those map routes (per year & month).
- Monthly totals (with domestic/international split) for trend/heatmap charts.
"""

from __future__ import annotations

import calendar
from pathlib import Path
from typing import Dict, List

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CLEAN_DIR = ROOT / "clean_data"
AIRPORTS_PATH = ROOT / "other_data" / "airports.csv"
OUT_DIR = ROOT / "webpage_deliverable" / "data"


def load_airports() -> pd.DataFrame:
    airports = pd.read_csv(AIRPORTS_PATH)
    airports["iata"] = airports["iata"].str.upper()
    cols = ["iata", "name", "city", "state", "country", "latitude", "longitude"]
    return airports[cols].drop_duplicates("iata").set_index("iata")


def load_flights() -> pd.DataFrame:
    usecols = [
        "YEAR",
        "MONTH",
        "ORIGIN",
        "DEST",
        "UNIQUE_CARRIER_NAME",
        "PASSENGERS",
        "DEPARTURES_PERFORMED",
        "SEATS",
    ]
    frames: List[pd.DataFrame] = []
    for path in sorted(CLEAN_DIR.glob("flights_*_clean.csv")):
        frames.append(pd.read_csv(path, usecols=usecols))
    flights = pd.concat(frames, ignore_index=True)
    flights["ORIGIN"] = flights["ORIGIN"].str.upper()
    flights["DEST"] = flights["DEST"].str.upper()
    return flights


def attach_airport_meta(df: pd.DataFrame, airports: pd.DataFrame) -> pd.DataFrame:
    """Add origin/destination metadata columns."""
    origin_meta = airports.add_prefix("o_")
    dest_meta = airports.add_prefix("d_")
    df = df.merge(origin_meta, left_on="ORIGIN", right_index=True, how="left")
    df = df.merge(dest_meta, left_on="DEST", right_index=True, how="left")
    df = df[df["o_latitude"].notna() & df["d_latitude"].notna()].copy()
    return df


def classify_sector(origin_country: str, dest_country: str) -> str:
    if origin_country == "USA" and dest_country == "USA":
        return "Domestic"
    if pd.isna(origin_country) or pd.isna(dest_country):
        return "Unknown"
    return "International"


def build_route_links(flights: pd.DataFrame, airports: pd.DataFrame) -> pd.DataFrame:
    # Aggregate to year-month routes
    routes = (
        flights.groupby(["YEAR", "MONTH", "ORIGIN", "DEST"], as_index=False)
        .agg(
            PASSENGERS=("PASSENGERS", "sum"),
            DEPARTURES=("DEPARTURES_PERFORMED", "sum"),
            SEATS=("SEATS", "sum"),
        )
        .sort_values("PASSENGERS", ascending=False)
    )
    routes = attach_airport_meta(routes, airports)
    routes["load_factor"] = routes["PASSENGERS"] / routes["SEATS"].replace(0, pd.NA)
    routes["month_name"] = routes["MONTH"].apply(lambda m: calendar.month_name[int(m)])
    routes["sector"] = routes.apply(
        lambda r: classify_sector(r["o_country"], r["d_country"]), axis=1
    )

    # Take top 200 routes per year-month to keep payload small
    routes["rank"] = routes.groupby(["YEAR", "MONTH"])["PASSENGERS"].rank(
        method="first", ascending=False
    )
    routes = routes[routes["rank"] <= 200].drop(columns="rank")
    return routes


def build_carrier_rankings(flights: pd.DataFrame, origins: pd.Series) -> pd.DataFrame:
    carriers = flights[flights["ORIGIN"].isin(origins)]
    carriers = (
        carriers.groupby(
            ["YEAR", "MONTH", "ORIGIN", "UNIQUE_CARRIER_NAME"], as_index=False
        )
        .agg(
            PASSENGERS=("PASSENGERS", "sum"),
            DEPARTURES=("DEPARTURES_PERFORMED", "sum"),
            SEATS=("SEATS", "sum"),
        )
        .sort_values("PASSENGERS", ascending=False)
    )
    carriers["rank"] = carriers.groupby(["YEAR", "MONTH", "ORIGIN"])[
        "PASSENGERS"
    ].rank(method="first", ascending=False)
    carriers = carriers[carriers["rank"] <= 12].drop(columns="rank")
    return carriers


def build_monthly_metrics(flights: pd.DataFrame, country_lookup: Dict[str, str]) -> pd.DataFrame:
    f = flights.copy()
    f["o_country"] = f["ORIGIN"].map(country_lookup)
    f["d_country"] = f["DEST"].map(country_lookup)
    f["sector"] = f.apply(
        lambda r: classify_sector(r["o_country"], r["d_country"]), axis=1
    )
    monthly = (
        f.groupby(["YEAR", "MONTH", "sector"], as_index=False)
        .agg(
            PASSENGERS=("PASSENGERS", "sum"),
            DEPARTURES=("DEPARTURES_PERFORMED", "sum"),
            SEATS=("SEATS", "sum"),
        )
        .sort_values(["YEAR", "MONTH"])
    )
    monthly["load_factor"] = monthly["PASSENGERS"] / monthly["SEATS"].replace(
        0, pd.NA
    )
    monthly["date"] = pd.to_datetime(
        dict(year=monthly["YEAR"], month=monthly["MONTH"], day=1)
    )
    return monthly


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    airports = load_airports()
    flights = load_flights()

    country_lookup = airports["country"].to_dict()

    routes = build_route_links(flights, airports)
    carrier_rankings = build_carrier_rankings(flights, routes["ORIGIN"].unique())
    monthly = build_monthly_metrics(flights, country_lookup)

    routes.to_json(OUT_DIR / "flow_links.json", orient="records")
    carrier_rankings.to_json(OUT_DIR / "carriers_by_origin.json", orient="records")
    monthly.to_json(OUT_DIR / "monthly_metrics.json", orient="records", date_format="iso")

    print(f"Wrote {len(routes):,} route links -> {OUT_DIR/'flow_links.json'}")
    print(
        f"Carriers: {len(carrier_rankings):,} rows -> {OUT_DIR/'carriers_by_origin.json'}"
    )
    print(f"Monthly metrics: {len(monthly):,} rows -> {OUT_DIR/'monthly_metrics.json'}")


if __name__ == "__main__":
    main()
