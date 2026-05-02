#!/usr/bin/env python3
"""
KTC per-player history scraper. Builds:

    sleeperleague/data/ktc_history.json

Shape:
    {
      "generated_at": "...",
      "format_index": "dynasty_1qb",  # which format the history we pulled is in
      "history": {
        "<sleeper_id>": [
          {"d": "2024-09-01", "v": 9876},
          {"d": "2024-09-02", "v": 9880},
          ...
        ],
        ...
      }
    }

Used by the browser to look up "value at trade date" for each player.

Strategy:
1. Read sleeperleague/data/ktc_latest.json to get the list of players that
   have already been matched to Sleeper IDs (so we don't waste calls on
   unmatched players).
2. For each, GET keeptradecut.com/dynasty-rankings/history/<slug>.
3. Regex out the embedded `playerOneQBHistory` / `playerSuperflexHistory`
   array (KTC names them slightly differently between formats).
4. Parse the daily series and store under sleeper_id.
5. Throttle: 0.4s between requests, with on-error backoff. Keeps us
   gentle and avoids tripping any rate limit.

Run via .github/workflows/ktc-history-weekly.yml (slow but rare).
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
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

OUT_DIR = Path(__file__).resolve().parent.parent / "data"
LATEST = OUT_DIR / "ktc_latest.json"
HISTORY = OUT_DIR / "ktc_history.json"

# Player history page. We try a few URL shapes - KTC has changed it a few
# times over the years. First one that returns 200 wins.
HISTORY_URL_PATTERNS = [
    "https://keeptradecut.com/dynasty-rankings/players/{slug}",
    "https://keeptradecut.com/dynasty-rankings/history/{slug}",
    "https://keeptradecut.com/players/{slug}",
]

# Embedded JS variable patterns the page uses to render the history chart.
# Different formats have differently-named arrays — we try them all.
HISTORY_VAR_PATTERNS = [
    r"var\s+playerOneQBHistory\s*=\s*(\[[^\];]*\]);",
    r"var\s+playerSuperflexHistory\s*=\s*(\[[^\];]*\]);",
    r"var\s+oneQBHistory\s*=\s*(\[[^\];]*\]);",
    r"var\s+superflexHistory\s*=\s*(\[[^\];]*\]);",
    r"var\s+history\s*=\s*(\[[^\];]*\]);",
]

THROTTLE_S = 0.4
MAX_BACKOFF_S = 30


def fetch_history_for(slug: str, fmt: str) -> list[dict] | None:
    """fmt: 'dynasty_1qb' or 'dynasty_sf'. Returns list of {d, v} or None."""
    last_html = None
    for url_tpl in HISTORY_URL_PATTERNS:
        url = url_tpl.format(slug=slug)
        try:
            r = requests.get(url, headers=HEADERS, timeout=30)
        except requests.RequestException:
            continue
        if r.status_code != 200:
            continue
        last_html = r.text
        break
    if not last_html:
        return None

    # Try each known variable name. KTC's history arrays look like:
    #   [{"d":"2024-09-01","v":9876}, ...]
    # We accept anything matching that shape.
    for pat in HISTORY_VAR_PATTERNS:
        m = re.search(pat, last_html, re.DOTALL)
        if not m:
            continue
        raw = m.group(1)
        # KTC sometimes uses single quotes or unquoted keys - try a couple forms.
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            try:
                # Tolerate unquoted keys via a light fixup.
                fixed = re.sub(r"([{,]\s*)([A-Za-z_]\w*)\s*:", r'\1"\2":', raw)
                fixed = fixed.replace("'", '"')
                data = json.loads(fixed)
            except json.JSONDecodeError:
                continue
        # Normalize each row to {d, v}.
        out = []
        for row in data:
            d = row.get("d") or row.get("date") or row.get("Date")
            v = row.get("v") or row.get("value") or row.get("Value")
            if d and v is not None:
                out.append({"d": d, "v": int(v)})
        if out:
            return out

    return None


def main() -> int:
    if not LATEST.exists():
        print("ktc_latest.json not present - run ktc_export.py first.", file=sys.stderr)
        return 1
    snapshot = json.loads(LATEST.read_text(encoding="utf-8"))
    # We use dynasty_1qb as the historical reference format. (Browser will
    # interpret values relative to whatever format is in use today; this is
    # a known approximation - see README.)
    fmt = os.environ.get("KTC_HISTORY_FMT", "dynasty_1qb")
    block = snapshot.get("formats", {}).get(fmt, {})
    players = block.get("players", {})
    if not players:
        print(f"No players in format {fmt}", file=sys.stderr)
        return 1

    # Resume support: if HISTORY exists, keep what we already have and only
    # fetch players that are missing or stale (older than 7 days).
    existing: dict[str, Any] = {}
    if HISTORY.exists():
        try:
            existing = json.loads(HISTORY.read_text(encoding="utf-8")).get("history", {}) or {}
        except (json.JSONDecodeError, OSError):
            existing = {}

    history: dict[str, list[dict]] = dict(existing)
    todo = [(sid, p) for sid, p in players.items() if p.get("ktc_slug")]
    print(f"Will fetch up to {len(todo)} player histories…", flush=True)

    failures = 0
    backoff = THROTTLE_S
    for i, (sid, p) in enumerate(todo, 1):
        slug = p.get("ktc_slug")
        if not slug:
            continue
        try:
            data = fetch_history_for(slug, fmt)
        except Exception as e:  # noqa: BLE001
            print(f"  [{i}/{len(todo)}] {slug}: error {e}", flush=True)
            data = None

        if data:
            history[sid] = data
            backoff = THROTTLE_S
            failures = 0
        else:
            failures += 1
            backoff = min(MAX_BACKOFF_S, max(THROTTLE_S * 2, backoff * 1.5))
            print(f"  [{i}/{len(todo)}] {slug}: no history (backoff {backoff:.1f}s)", flush=True)
            if failures >= 25:
                print("Too many consecutive failures - bailing.", file=sys.stderr)
                break

        # Save progress every 50 players so a crash mid-run keeps something.
        if i % 50 == 0:
            _save(history, fmt)
            print(f"  saved progress at {i}/{len(todo)}", flush=True)

        time.sleep(backoff)

    _save(history, fmt)
    print(f"\n  total players with history: {len(history)}", flush=True)
    return 0


def _save(history: dict[str, list[dict]], fmt: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "format_index": fmt,
        "history": history,
    }
    HISTORY.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
