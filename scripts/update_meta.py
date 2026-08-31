#!/usr/bin/env python3
"""
Weekly meta updater for TH18 War Hub.

Fetches public Clash of Clans community pages, extracts every "Copy Army"
(action=CopyArmy) and "Open Layout" (action=OpenLayout) deep link, and merges
them into data/latest.json. Two lanes:
  * SOURCES     — general community pages (the standard "Fresh this week" feed)
  * PRO_SOURCES — curated top-tier / pro / tournament / CWL pages; links found
                  here get pro=true and show under "Pro / tournament picks".

Each link keeps its first-seen date so the site can badge genuinely new finds.
No third-party packages — pure standard library, so GitHub Actions needs zero
pip installs.

Run:  python scripts/update_meta.py
"""

import json
import re
import html
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# General community sources (standard feed) --------------------------------
SOURCES = [
    "https://blueprintcoc.com/blogs/town-hall-18/top-5-th18-army-links",
    "https://blueprintcoc.com/blogs/town-hall-18/best-armies",
    "https://trophycoach.com/clash-of-clans/guides/best-armies-by-town-hall",
    "https://www.allclash.com/the-best-th18-war-trophy-farming-base-layouts/",
    "https://clashofclans-layouts.com/plans/th_18/war/",
    "https://clashofclans-layouts.com/plans/th_18/defence/",
    "https://blueprintcoc.com/blogs/town-hall-18/new-th18-bases",
]

# Curated top-tier / pro / tournament / CWL sources (get pro=true) ----------
# NOTE: base layouts and army comps are NOT exposed by the official Supercell
# API, so "pro" here means community-curated top-tier / esports-informed picks
# from public pages — not a specific named pro's private war base.
PRO_SOURCES = [
    "https://blueprintcoc.com/blogs/town-hall-18/best-th18-attack-strategies",
    "https://blueprintcoc.com/blogs/town-hall-18/new-th18-attack-strategy",
    "https://blueprintcoc.com/blogs/town-hall-18/best-th18-cwl-war-base",
    "https://cocbasedrop.com/blog/best-th18-base-2026-top-5-layouts",
]

MIN_TH = 17          # ignore bases below this TH (armies aren't TH-tagged in URL)
MAX_ITEMS = 60       # cap each list; newest kept, oldest trimmed

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "latest.json"

LINK_RE = re.compile(r"https?://link\.clashofclans\.com/[^\s\"'<>\\)]+", re.IGNORECASE)
LAYOUT_ID_RE = re.compile(r"TH(\d+)[:%]", re.IGNORECASE)
LAYOUT_TYPE_RE = re.compile(r"TH\d+(?::|%3A)([A-Za-z]{2})", re.IGNORECASE)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    try:
        return raw.decode("utf-8", errors="replace")
    except Exception:
        return raw.decode("latin-1", errors="replace")


def clean_url(u):
    return html.unescape(u).rstrip(".,);]'\"")


def classify(u):
    low = u.lower()
    if "copyarmy" in low:
        return "army"
    if "openlayout" in low:
        return "base"
    return None


def base_meta(u):
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
    return {"armies": [], "bases": []}


def index_by_url(items):
    out = {}
    for it in items:
        it.setdefault("pro", False)
        out[it["url"]] = it
    return out


def host_of(url):
    return re.sub(r"^https?://(www\.)?", "", url).split("/")[0]


def process(sources, pro, armies, bases, today, ok, failed):
    new_a = new_b = 0
    for src in sources:
        try:
            page = fetch(src)
        except Exception as e:
            failed.append(f"{src} ({e.__class__.__name__})")
            continue
        ok.append(src)
        host = host_of(src)
        for raw in LINK_RE.findall(page):
            u = clean_url(raw)
            kind = classify(u)
            if kind == "army":
                if u in armies:
                    if pro:
                        armies[u]["pro"] = True
                else:
                    armies[u] = {"url": u, "source": host, "first_seen": today, "pro": pro}
                    new_a += 1
            elif kind == "base":
                th, typ = base_meta(u)
                if th is not None and th < MIN_TH:
                    continue
                if u in bases:
                    if pro:
                        bases[u]["pro"] = True
                else:
                    bases[u] = {"url": u, "source": host, "th": th, "type": typ,
                                "first_seen": today, "pro": pro}
                    new_b += 1
    return new_a, new_b


def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = load_existing()
    armies = index_by_url(existing.get("armies", []))
    bases = index_by_url(existing.get("bases", []))

    ok, failed = [], []
    a1, b1 = process(SOURCES, False, armies, bases, today, ok, failed)
    a2, b2 = process(PRO_SOURCES, True, armies, bases, today, ok, failed)

    def finalize(d):
        items = sorted(d.values(),
                       key=lambda x: (x.get("first_seen", ""), x["url"]),
                       reverse=True)
        return items[:MAX_ITEMS]

    fin_armies = finalize(armies)
    fin_bases = finalize(bases)
    pro_armies = sum(1 for x in fin_armies if x.get("pro"))
    pro_bases = sum(1 for x in fin_bases if x.get("pro"))

    out = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources_ok": len(ok),
        "sources_failed": failed,
        "armies": fin_armies,
        "bases": fin_bases,
    }

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n",
                         encoding="utf-8")

    print(f"[update_meta] {today}: +{a1 + a2} new armies, +{b1 + b2} new bases")
    print(f"[update_meta] totals: {len(fin_armies)} armies ({pro_armies} pro), "
          f"{len(fin_bases)} bases ({pro_bases} pro)")
    print(f"[update_meta] sources ok: {len(ok)}, failed: {len(failed)}")
    for f in failed:
        print(f"   - failed: {f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
