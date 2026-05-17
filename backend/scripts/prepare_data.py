#!/usr/bin/env python3
"""
Build app/data/world_cup_matches.csv from a raw source.

Primary (documented): Kaggle "FIFA World Cup" by A. Becklas
  https://www.kaggle.com/datasets/abecklas/fifa-world-cup
  Place matches_1930_2014.csv in backend/data/raw/

Fallback: martj42 international_results (FIFA World Cup, <= 2018)
  Used when no Kaggle file is present — same ~900 tournament matches.
"""

from __future__ import annotations

import argparse
import csv
import io
import sys
import urllib.request
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RAW = BACKEND_ROOT / "data" / "raw" / "matches_1930_2014.csv"
DEFAULT_OUT = BACKEND_ROOT / "app" / "data" / "world_cup_matches.csv"

MARTJ42_URL = (
    "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
)

OUT_COLUMNS = [
    "year",
    "date",
    "stage",
    "home_team",
    "away_team",
    "home_goals",
    "away_goals",
    "result",
    "neutral",
    "city",
    "country",
]


def result_code(home_goals: int, away_goals: int) -> str:
    if home_goals > away_goals:
        return "H"
    if home_goals < away_goals:
        return "A"
    return "D"


def clean_kaggle_row(row: dict[str, str]) -> dict[str, str] | None:
    """Normalize abecklas / Kaggle matches_1930_2014.csv rows."""
    year = row.get("Year") or row.get("year")
    home = row.get("Home Team") or row.get("Home Team Name") or row.get("home_team")
    away = row.get("Away Team") or row.get("Away Team Name") or row.get("away_team")
    if not year or not home or not away:
        return None

    try:
        hg = int(float(row.get("Home Goals") or row.get("home_goals") or 0))
        ag = int(float(row.get("Away Goals") or row.get("away_goals") or 0))
    except ValueError:
        return None

    y = int(float(year))
    if y > 2018:
        return None

    date = row.get("Datetime") or row.get("date") or f"{y}-06-15"
    date = date[:10]

    return {
        "year": str(y),
        "date": date,
        "stage": (row.get("Stage") or row.get("stage") or "Unknown").strip(),
        "home_team": home.strip(),
        "away_team": away.strip(),
        "home_goals": str(hg),
        "away_goals": str(ag),
        "result": result_code(hg, ag),
        "neutral": "true",
        "city": (row.get("City") or row.get("city") or "").strip(),
        "country": (row.get("Country") or row.get("country") or "").strip(),
    }


def fetch_martj42_rows() -> list[dict[str, str]]:
    print(f"Downloading fallback source: {MARTJ42_URL}")
    raw = urllib.request.urlopen(MARTJ42_URL, timeout=60).read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(raw))
    out: list[dict[str, str]] = []
    for row in reader:
        if row.get("tournament") != "FIFA World Cup":
            continue
        year = int(row["date"][:4])
        if year > 2018:
            continue
        hg = int(row["home_score"])
        ag = int(row["away_score"])
        out.append(
            {
                "year": str(year),
                "date": row["date"],
                "stage": "Group stage",
                "home_team": row["home_team"].strip(),
                "away_team": row["away_team"].strip(),
                "home_goals": str(hg),
                "away_goals": str(ag),
                "result": result_code(hg, ag),
                "neutral": row.get("neutral", "TRUE").lower(),
                "city": row.get("city", "").strip(),
                "country": row.get("country", "").strip(),
            }
        )
    return out


def load_kaggle_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = [clean_kaggle_row(r) for r in reader]
    return [r for r in rows if r]


def write_csv(rows: list[dict[str, str]], out_path: Path) -> None:
    rows = sorted(rows, key=lambda r: (r["date"], r["year"]))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} matches -> {out_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare world_cup_matches.csv")
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    if args.raw.exists():
        print(f"Using Kaggle raw file: {args.raw}")
        rows = load_kaggle_rows(args.raw)
    else:
        print("Kaggle raw file not found; using public fallback (martj42).")
        rows = fetch_martj42_rows()

    if not rows:
        print("No rows produced.", file=sys.stderr)
        return 1

    write_csv(rows, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
