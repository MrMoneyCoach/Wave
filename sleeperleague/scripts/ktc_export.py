#!/usr/bin/env python3
"""
KeepTradeCut → Sleeper-keyed JSON snapshot.

Scrapes KTC's three rankings pages (Dynasty 1QB, Dynasty Superflex, Redraft),
joins each player to a Sleeper ID, and writes:

  sleeperleague/data/ktc_latest.json              <- always overwritten
  sleeperleague/data/snapshots/ktc_YYYY-MM-DD.json <- per-day archive

The browser-side app fetches ktc_latest.json (CORS-friendly raw GitHub URL)
and uses dated snapshots for "value at time of trade" lookups.

Usage:
    pip install requests beautifulsoup4
    python ktc_export.py

Run by .github/workflows/ktc-daily.yml on a schedule.
"""

from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import requests

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
}

KTC_DYNASTY = "https://keeptradecut.com/dynasty-rankings"
KTC_REDRAFT = "https://keeptradecut.com/fantasy-rankings"
SLEEPER_PLAYERS = "https://api.sleeper.app/v1/players/nfl"

OUT_DIR = Path(__file__).resolve().parent.parent / "data"
LATEST = OUT_DIR / "ktc_latest.json"
SNAPSHOT_DIR = OUT_DIR / "snapshots"


# ---- Scraping ----

def fetch_players_array(url: str) -> list[dict]:
    """KTC embeds the full ranking dataset as `var playersArray = [...];`.
    Pull the page, regex out the array, parse as JSON.
    """
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    m = re.search(r"var\s+playersArray\s*=\s*(\[.*?\]);", r.text, re.DOTALL)
    if not m:
        raise RuntimeError(f"playersArray not found on {url}")
    return json.loads(m.group(1))


# ---- Name normalization for Sleeper join ----

_SUFFIX_RE = re.compile(r"\b(jr|sr|ii|iii|iv|v)\.?$", re.IGNORECASE)
_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def norm_name(name: str | None) -> str:
    if not name:
        return ""
    # Strip accents, lowercase, drop punctuation, drop suffixes.
    n = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    n = _SUFFIX_RE.sub("", n).strip()
    # Drop dots WITHOUT inserting a space, so "D.J. Moore" → "dj moore"
    # and matches Sleeper's "DJ Moore". Other punctuation still becomes a
    # space (so "Amon-Ra" → "amon ra", matching Sleeper's tokenization).
    n = n.replace(".", "")
    n = _NON_ALNUM.sub(" ", n).strip()
    return " ".join(n.split())


def fetch_sleeper_index() -> dict[str, str]:
    """Return a lookup: norm_name(full_name) + '|' + position -> sleeper_id.

    A second-pass adds team-disambiguated keys when the same name+position
    occurs more than once.
    """
    print("Fetching Sleeper player database…", flush=True)
    r = requests.get(SLEEPER_PLAYERS, timeout=60)
    r.raise_for_status()
    players = r.json()

    # Build name+pos buckets first to detect duplicates.
    buckets: dict[str, list[tuple[str, dict]]] = {}
    for sid, p in players.items():
        if not p:
            continue
        full = p.get("full_name") or " ".join(filter(None, [p.get("first_name"), p.get("last_name")]))
        pos = (p.get("position") or "").upper()
        if not full or not pos:
            continue
        key = f"{norm_name(full)}|{pos}"
        buckets.setdefault(key, []).append((sid, p))

    out: dict[str, str] = {}
    for key, entries in buckets.items():
        if len(entries) == 1:
            out[key] = entries[0][0]
        else:
            # Disambiguate by team. If multiple still match, pick the active
            # one (status == "Active") with the highest "search_rank" (lower is better).
            for sid, p in entries:
                team = (p.get("team") or "").upper()
                if team:
                    out[f"{key}|{team}"] = sid
            # As a last-resort fallback for the bare key, pick the lowest search_rank.
            entries_sorted = sorted(
                entries,
                key=lambda x: (
                    x[1].get("status") != "Active",
                    x[1].get("search_rank") or 9999,
                ),
            )
            out[key] = entries_sorted[0][0]
    print(f"  {len(players)} players in Sleeper DB", flush=True)
    return out


# ---- KTC → Sleeper join + JSON shape ----

# Set of position strings KTC uses for draft picks. Historically just "PICK",
# now "RDP" (Rookie Draft Pick).
PICK_POSITIONS = {"PICK", "RDP"}


def is_pick(p: dict) -> bool:
    return (p.get("position") or "").upper() in PICK_POSITIONS


def player_to_sleeper(p: dict, idx: dict[str, str]) -> str | None:
    """Return a Sleeper ID for this KTC player record, or None if unmatched."""
    if is_pick(p):
        return None
    name = p.get("playerName")
    pos = (p.get("position") or "").upper()
    team = (p.get("team") or "").upper()
    n = norm_name(name)
    # Try team-disambiguated, then bare.
    return idx.get(f"{n}|{pos}|{team}") or idx.get(f"{n}|{pos}")


def player_row(p: dict, sleeper_id: str | None, sf: bool, redraft: bool) -> dict:
    if redraft:
        block = p.get("redraftValues") or p.get("oneQBValues") or {}
    else:
        block = (p.get("superflexValues") if sf else p.get("oneQBValues")) or {}
    return {
        "sleeper_id": sleeper_id,
        "name": p.get("playerName"),
        "pos": p.get("position"),
        "team": p.get("team"),
        "age": p.get("age"),
        "value": block.get("value"),
        "rank": block.get("rank"),
        "pos_rank": block.get("positionalRank"),
        "tier": block.get("tier"),
        "trend": block.get("overallTrend"),
        "rookie": bool(p.get("rookie")),
        "ktc_slug": p.get("slug"),
        "ktc_id": p.get("playerID"),
    }


def pick_row(p: dict, sf: bool, redraft: bool) -> dict | None:
    """KTC picks (position == 'RDP' or 'PICK') become entries with a parsed season + round."""
    if not is_pick(p):
        return None
    if redraft:
        block = p.get("redraftValues") or p.get("oneQBValues") or {}
    else:
        block = (p.get("superflexValues") if sf else p.get("oneQBValues")) or {}
    label = p.get("playerName") or ""
    season, rnd, slot = parse_pick_label(label)
    return {
        "label": label,
        "season": season,
        "round": rnd,
        "slot": slot,  # "early" / "mid" / "late" / None
        "value": block.get("value"),
        "rank": block.get("rank"),
        "tier": block.get("tier"),
        "trend": block.get("overallTrend"),
        "ktc_slug": p.get("slug"),
        "ktc_id": p.get("playerID"),
    }


_PICK_LABEL_RE = re.compile(
    r"(?P<season>\d{4})\s+(?P<slot>early|mid|late)?\s*(?P<round>1st|2nd|3rd|4th|5th|6th|7th)",
    re.IGNORECASE,
)


def parse_pick_label(label: str) -> tuple[str | None, int | None, str | None]:
    """e.g. '2025 Mid 1st' -> ('2025', 1, 'mid'); '2025 1st' -> ('2025', 1, None)."""
    if not label:
        return None, None, None
    m = _PICK_LABEL_RE.search(label)
    if not m:
        return None, None, None
    season = m.group("season")
    slot = (m.group("slot") or "").lower() or None
    rd_str = m.group("round").lower()
    round_map = {"1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5, "6th": 6, "7th": 7}
    return season, round_map.get(rd_str), slot


def build_format(players: list[dict], idx: dict[str, str], sf: bool, redraft: bool) -> dict:
    matched: dict[str, dict] = {}
    unmatched: list[dict] = []
    picks: list[dict] = []

    for p in players:
        if is_pick(p):
            row = pick_row(p, sf, redraft)
            if row:
                picks.append(row)
            continue
        sid = player_to_sleeper(p, idx)
        row = player_row(p, sid, sf, redraft)
        if sid:
            matched[sid] = row
        else:
            unmatched.append({"name": row["name"], "pos": row["pos"], "team": row["team"]})

    picks.sort(key=lambda x: (x.get("rank") is None, x.get("rank") or 9999))
    return {
        "players": matched,            # sleeper_id -> row
        "picks": picks,
        "unmatched": unmatched,
        "counts": {
            "matched_players": len(matched),
            "unmatched_players": len(unmatched),
            "picks": len(picks),
        },
    }


# ---- Output ----

def write_outputs(payload: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    LATEST.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    snap = SNAPSHOT_DIR / f"ktc_{date.today().isoformat()}.json"
    snap.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"\n  wrote {LATEST.relative_to(OUT_DIR.parent.parent)}", flush=True)
    print(f"  wrote {snap.relative_to(OUT_DIR.parent.parent)}", flush=True)


def main() -> int:
    print("Fetching KTC dynasty page (1QB + Superflex are on the same page)…", flush=True)
    dyn = fetch_players_array(KTC_DYNASTY)
    print(f"  {len(dyn)} dynasty entries", flush=True)

    print("Fetching KTC redraft page…", flush=True)
    rd = fetch_players_array(KTC_REDRAFT)
    print(f"  {len(rd)} redraft entries", flush=True)

    idx = fetch_sleeper_index()

    payload: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "snapshot_date": date.today().isoformat(),
        "source": "keeptradecut.com",
        "formats": {
            "dynasty_1qb": build_format(dyn, idx, sf=False, redraft=False),
            "dynasty_sf":  build_format(dyn, idx, sf=True,  redraft=False),
            "redraft":     build_format(rd,  idx, sf=False, redraft=True),
        },
    }

    summary = {fmt: blk["counts"] for fmt, blk in payload["formats"].items()}
    print("\nMatch summary:")
    for fmt, c in summary.items():
        print(f"  {fmt:13s}  matched {c['matched_players']:>4d}  "
              f"unmatched {c['unmatched_players']:>3d}  picks {c['picks']:>3d}")

    write_outputs(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
