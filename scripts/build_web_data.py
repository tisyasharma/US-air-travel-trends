"""
Data extracts from the cleaned T-100 files for the map visualization.

- Top 200 routes per (year, month) with coordinates for map routes.
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
    """
    parameters: none
    returns: pd.DataFrame indexed by IATA with airport metadata
    function: airport lookup (lat/lon, city, country) keyed by IATA
    """
    airports = pd.read_csv(AIRPORTS_PATH)
    airports["iata"] = airports["iata"].str.upper()
    cols = ["iata", "name", "city", "state", "country", "latitude", "longitude"]
    return airports[cols].drop_duplicates("iata").set_index("iata")


def load_flights() -> pd.DataFrame:
    """
    parameters: none
    returns: pd.DataFrame with flight records (reduced columns)
    function: load cleaned flight CSVs and keep only columns needed for web extracts
    """
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
    """
    parameters: df (route-level records), airports (lookup indexed by IATA)
    returns: pd.DataFrame merged with origin/destination metadata
    function: append airport lat/lon and place info for both origin and destination
    """
    origin_meta = airports.add_prefix("o_")
    dest_meta = airports.add_prefix("d_")
    df = df.merge(origin_meta, left_on="ORIGIN", right_index=True, how="left")
    df = df.merge(dest_meta, left_on="DEST", right_index=True, how="left")
    df = df[df["o_latitude"].notna() & df["d_latitude"].notna()].copy()
    return df


def classify_sector(origin_country: str, dest_country: str) -> str:
    """
    parameters: origin_country, dest_country
    returns: string label (Domestic, International, Unknown)
    function: label a route as domestic vs international
    """
    if origin_country == "USA" and dest_country == "USA":
        return "Domestic"
    if pd.isna(origin_country) or pd.isna(dest_country):
        return "Unknown"
    return "International"


def build_route_links(flights: pd.DataFrame, airports: pd.DataFrame) -> pd.DataFrame:
    """
    parameters: flights (raw flight rows), airports (lookup)
    returns: pd.DataFrame of top routes per year-month with coords and load_factor
    function: aggregate flights to routes, attach airport meta, rank, trim to top 200 per period
    """
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
    """
    parameters: flights (raw rows), origins (iterable of origin airports)
    returns: pd.DataFrame of top carriers per origin/year/month
    function: summarize carriers by passengers/departures/seats and keep top 12 per origin-period
    """
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
    carriers["rank"] = carriers.groupby(["YEAR", "MONTH", "ORIGIN"])["PASSENGERS"].rank(
        method="first", ascending=False
    )
    carriers = carriers[carriers["rank"] <= 12].drop(columns="rank")
    return carriers


def build_monthly_metrics(
    flights: pd.DataFrame, country_lookup: Dict[str, str]
) -> pd.DataFrame:
    """
    parameters: flights (raw rows), country_lookup (IATA --> country)
    returns: pd.DataFrame of monthly totals by sector with load factor
    function: tag domestic/international and aggregate monthly passengers/flights/seats
    """
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
    monthly["load_factor"] = monthly["PASSENGERS"] / monthly["SEATS"].replace(0, pd.NA)
    monthly["date"] = pd.to_datetime(
        dict(year=monthly["YEAR"], month=monthly["MONTH"], day=1)
    )
    return monthly


def build_carrier_market_share(
    flights: pd.DataFrame, airports: pd.DataFrame
) -> pd.DataFrame:
    """
    parameters: flights (raw rows), airports (lookup indexed by IATA)
    returns: pd.DataFrame of monthly domestic market share by carrier (top 10 + Other)
    function: compute domestic-only passenger share per carrier each month, normalize to 100%
    """
    country_lookup = airports["country"].to_dict()
    f = flights.copy()
    f["o_country"] = f["ORIGIN"].map(country_lookup)
    f["d_country"] = f["DEST"].map(country_lookup)
    f = f[(f["o_country"] == "USA") & (f["d_country"] == "USA")].copy()

    grouped = (
        f.groupby(["YEAR", "MONTH", "UNIQUE_CARRIER_NAME"], as_index=False)
        .agg(PASSENGERS=("PASSENGERS", "sum"))
        .sort_values("PASSENGERS", ascending=False)
    )

    frames: List[pd.DataFrame] = []
    for (year, month), frame in grouped.groupby(["YEAR", "MONTH"]):
        frame = frame.sort_values("PASSENGERS", ascending=False)
        top = frame.head(10)
        other = frame.iloc[10:]
        if not other.empty:
            other_row = {
                "YEAR": year,
                "MONTH": month,
                "UNIQUE_CARRIER_NAME": "Other",
                "PASSENGERS": other["PASSENGERS"].sum(),
            }
            top = pd.concat([top, pd.DataFrame([other_row])], ignore_index=True)
        total = top["PASSENGERS"].sum()
        top["market_share"] = top["PASSENGERS"] / total if total else 0
        frames.append(top)

    return pd.concat(frames, ignore_index=True)


def main():
    """
    parameters: none
    returns: None
    function: orchestrate loading, aggregating, and writing JSON extracts for the frontend
    """
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    airports = load_airports()
    flights = load_flights()

    country_lookup = airports["country"].to_dict()

    routes = build_route_links(flights, airports)
    carrier_rankings = build_carrier_rankings(flights, routes["ORIGIN"].unique())
    monthly = build_monthly_metrics(flights, country_lookup)
    market_share = build_carrier_market_share(flights, airports)

    routes.to_json(OUT_DIR / "flow_links.json", orient="records")
    carrier_rankings.to_json(OUT_DIR / "carriers_by_origin.json", orient="records")
    monthly.to_json(
        OUT_DIR / "monthly_metrics.json", orient="records", date_format="iso"
    )
    market_share.to_json(
        OUT_DIR / "carrier_market_share.json", orient="records", date_format="iso"
    )

    print(f"Wrote {len(routes):,} route links -> {OUT_DIR/'flow_links.json'}")
    print(
        f"Carriers: {len(carrier_rankings):,} rows -> {OUT_DIR/'carriers_by_origin.json'}"
    )
    print(f"Monthly metrics: {len(monthly):,} rows -> {OUT_DIR/'monthly_metrics.json'}")
    print(f"Market share: {len(market_share):,} rows -> {OUT_DIR/'carrier_market_share.json'}")


if __name__ == "__main__":
    main()
