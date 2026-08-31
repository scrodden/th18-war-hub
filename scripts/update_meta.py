#!/usr/bin/env python3
"""
Weekly meta updater for TH18 War Hub.

Fetches a set of public Clash of Clans community pages, extracts every
"Copy Army" (action=CopyArmy) and "Open Layout" (action=OpenLayout) deep link,
and merges them into data/latest.json (preserving each link's first-seen date so
the site can badge genuinely new finds). No third-party packages required — it
runs on the Python standard library so GitHub Actions needs zero pip installs.

Run:  python scripts/update_meta.py
"""

import json
import re
import html
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

# ----------------------------------------------------------------------------
# Sources to scan. Add/remove URLs here as the meta's go-to sites change.
# The script pulls BOTH army and base links from every page, so it's fine for a
# page to contain only one kind (or none — failures are skipped gracefully).
# ----------------------------------------------------------------------------
SOURCES = [
    # Army-link heavy
    "https://blueprintcoc.com/blogs/town-hall-18/top-5-th18-army-links",
    "https://blueprintcoc.com/blogs/town-hall-18/best-armies",
    "https://blueprintcoc.com/blogs/town-hall-18/best-th18-attack-strategies",
    "https://trophycoach.com/clash-of-clans/guides/best-armies-by-town-hall",
    # Base-link heavy
    "https://www.allclash.com/the-best-th18-war-trophy-farming-base-layouts/",
    "https://clashofclans-layouts.com/plans/th_18/war/",
    "https://clashofclans-layouts.com/plans/th_18/defence/",
    "https://blueprintcoc.com/blogs/town-hall-18/new-th18-bases",
]

# Only keep links for these Town Halls (bumped automatically when the script sees
# a higher TH appear in the wild — see MAX_TH handling below). Armies aren't
# TH-tagged in the URL, so they're always kept.
MIN_TH = 17

# Cap each list so the file/site stay tidy; newest-first, oldest trimmed.
MAX_ITEMS = 60

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "latest.json"

LINK_RE = re.compile(r"https?://link\.clashofclans\.com/[^\s\"'<>\\)]+", re.IGNORECASE)
LAYOUT_ID_RE = re.compile(r"TH(\d+)[:%]", re.IGNORECASE)          # TH18:WB or TH18%3AWB
LAYOUT_TYPE_RE = re.compile(r"TH\d+(?::|%3A)([A-Za-z]{2})", re.IGNORECASE)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    # Best-effort decode
    try:
        return raw.decode("utf-8", errors="replace")
    except Exception:
        return raw.decode("latin-1", errors="replace")


def clean_url(u):
    u = html.unescape(u)                 # &amp; -> &
    u = u.rstrip(".,);]'\"")             # strip trailing punctuation
    return u


def classify(u):
    low = u.lower()
    if "action=copyarmy" in low or "copyarmy" in low:
        return "army"
    if "action=openlayout" in low or "openlayout" in low:
        return "base"
    return None


def base_meta(u):
    """Return (th:int|None, type:str|None) parsed from an OpenLayout id."""
    dec = html.unescape(u)
    th = None
    typ = None
    m = LAYOUT_ID_RE.search(dec)
    if m:
        try:
            th = int(m.group(1))
        except ValueError:
            th = None
    m2 = LAYOUT_TYPE_RE.search(dec)
    if m2:
        typ = m2.group(1).upper()
    return th, typ


def load_existing():
    if DATA_PATH.exists():
        try:
            return json.loads(DATA_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"updated": None, "armies": [], "bases": []}


def index_by_url(items):
    return {it["url"]: it for it in items}


def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = load_existing()
    armies = index_by_url(existing.get("armies", []))
    bases = index_by_url(existing.get("bases", []))

    found_army, found_base = 0, 0
    ok_sources, failed_sources = [], []

    for src in SOURCES:
        try:
            page = fetch(src)
        except Exception as e:            # network / 403 / timeout — skip source
            failed_sources.append(f"{src} ({e.__class__.__name__})")
            continue
        ok_sources.append(src)
        host = re.sub(r"^https?://(www\.)?", "", src).split("/")[0]

        for raw in LINK_RE.findall(page):
            u = clean_url(raw)
            kind = classify(u)
            if kind == "army":
                if u not in armies:
                    armies[u] = {"url": u, "source": host, "first_seen": today}
                    found_army += 1
            elif kind == "base":
                th, typ = base_meta(u)
                if th is not None and th < MIN_TH:
                    continue
                if u not in bases:
                    bases[u] = {"url": u, "source": host, "th": th,
                                "type": typ, "first_seen": today}
                    found_base += 1

    def finalize(d):
        items = sorted(d.values(), key=lambda x: (x.get("first_seen", ""), x["url"]),
                       reverse=True)
        return items[:MAX_ITEMS]

    out = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources_ok": len(ok_sources),
        "sources_failed": failed_sources,
        "armies": finalize(armies),
        "bases": finalize(bases),
    }

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n",
                         encoding="utf-8")

    print(f"[update_meta] {today}: +{found_army} new armies, +{found_base} new bases")
    print(f"[update_meta] totals: {len(out['armies'])} armies, {len(out['bases'])} bases")
    print(f"[update_meta] sources ok: {len(ok_sources)}, failed: {len(failed_sources)}")
    for f in failed_sources:
        print(f"   - failed: {f}")
    # Never fail the workflow just because some sources were unreachable.
    return 0


if __name__ == "__main__":
    sys.exit(main())
