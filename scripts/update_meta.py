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

# --- Army-link decoding --------------------------------------------------
# clashId -> unit name maps. Fetched live each run from the community-maintained
# clash-armies game data (so newly released troops/spells decode automatically),
# with the embedded snapshot below as a fallback if that fetch ever fails.
GAMEDATA_URL = "https://raw.githubusercontent.com/NinjaInShade/clash-armies/HEAD/game-data.json5"

_TROOPS = {0: "Barbarian", 1: "Archer", 2: "Goblin", 3: "Giant", 4: "Wall Breaker", 5: "Balloon", 6: "Wizard", 7: "Healer", 8: "Dragon", 9: "P.E.K.K.A", 10: "Minion", 11: "Hog Rider", 12: "Valkyrie", 13: "Golem", 15: "Witch", 17: "Lava Hound", 22: "Bowler", 23: "Baby Dragon", 24: "Miner", 26: "Super Barbarian", 27: "Super Archer", 28: "Super Wall Breaker", 29: "Super Giant", 53: "Yeti", 55: "Sneaky Goblin", 56: "Super Miner", 57: "Rocket Balloon", 58: "Ice Golem", 59: "Electro Dragon", 63: "Inferno Dragon", 64: "Super Valkyrie", 65: "Dragon Rider", 66: "Super Witch", 76: "Ice Hound", 80: "Super Bowler", 81: "Super Dragon", 82: "Headhunter", 83: "Super Wizard", 84: "Super Minion", 95: "Electro Titan", 97: "Apprentice Warden", 98: "Super Hog Rider", 109: "Ruin Witch", 110: "Root Rider", 123: "Druid", 132: "Thrower", 147: "Super Yeti", 150: "Furnace", 177: "Meteor Golem"}
_SPELLS = {0: "Lightning", 1: "Healing", 2: "Rage", 3: "Jump", 5: "Freeze", 9: "Poison", 10: "Earthquake", 11: "Haste", 16: "Clone", 17: "Skeleton", 28: "Bat", 35: "Invisibility", 53: "Recall", 70: "Overgrowth", 98: "Revive", 109: "Ice Block", 120: "Totem", 123: "Angry Spell"}
_SIEGES = {51: "Wall Wrecker", 52: "Battle Blimp", 62: "Stone Slammer", 75: "Siege Barracks", 87: "Log Launcher", 91: "Flame Flinger", 92: "Battle Drill", 135: "Troop Launcher", 188: "Sky Wagon"}

_SECTION_RE = re.compile(r"^\t(\w+):\s*\[")
_NAME_RE = re.compile(r"name:\s*'([^']+)'")
_CLASHID_RE = re.compile(r"clashId:\s*(\d+)")
_UNIT_RE = re.compile(r"(\d+)x(\d+)")
_SEG_RE = re.compile(r"([idus])((?:\d+x\d+-?)+)")


def parse_gamedata(text):
    """Parse clash-armies game-data.json5 into troops/spells/sieges clashId maps."""
    out = {"troops": {}, "spells": {}, "sieges": {}}
    cur = None
    curname = None
    for ln in text.split("\n"):
        sec = _SECTION_RE.match(ln)
        if sec:
            cur = sec.group(1)
            curname = None
            continue
        if cur in out:
            nm = _NAME_RE.search(ln)
            if nm:
                curname = nm.group(1)
                continue
            idm = _CLASHID_RE.search(ln)
            if idm and curname is not None:
                out[cur][int(idm.group(1))] = curname
                curname = None
    return out["troops"], out["spells"], out["sieges"]


def load_unit_maps():
    try:
        t, s, g = parse_gamedata(fetch(GAMEDATA_URL, timeout=25))
        if len(t) >= 10 and len(s) >= 5:
            return t, s, g, "live"
    except Exception:
        pass
    return dict(_TROOPS), dict(_SPELLS), dict(_SIEGES), "embedded"


def decode_army(url, troops, spells, sieges):
    """Return {head, spells, comp} describing an army link's composition, or None."""
    m = re.search(r"army=([^&\s\"']+)", url)
    if not m:
        return None
    segs = dict(_SEG_RE.findall(m.group(1)))

    def pairs(seg):
        return [(int(a), int(i)) for a, i in _UNIT_RE.findall(seg or "")]

    troop_list, siege_list = [], []
    for amt, cid in pairs(segs.get("u")):
        if cid in troops:
            troop_list.append((amt, troops[cid]))
        elif cid in sieges:
            siege_list.append((amt, sieges[cid]))
        else:
            troop_list.append((amt, "#" + str(cid)))
    spell_list = [(amt, spells.get(cid, "#" + str(cid))) for amt, cid in pairs(segs.get("s"))]

    if not troop_list and not spell_list:
        return None

    top = sorted(troop_list, key=lambda x: -x[0])
    head = " · ".join("%d× %s" % (a, n) for a, n in top[:3])
    if len(top) > 3:
        head += " +%d" % (len(top) - 3)

    # unique spell names, order preserved
    seen = []
    for _, n in spell_list:
        if n not in seen:
            seen.append(n)
    spells_str = " · ".join(seen)

    parts = []
    if troop_list:
        parts.append("Troops: " + ", ".join("%d× %s" % (a, n) for a, n in troop_list))
    if siege_list:
        parts.append("Siege: " + ", ".join(n for _, n in siege_list))
    if spell_list:
        parts.append("Spells: " + ", ".join("%d× %s" % (a, n) for a, n in spell_list))
    return {"head": head, "spells": spells_str, "comp": " | ".join(parts)}


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

    # Decode each army link into a readable composition (troops + spells).
    troops_m, spells_m, sieges_m, maps_src = load_unit_maps()
    decoded = 0
    for a in fin_armies:
        info = decode_army(a["url"], troops_m, spells_m, sieges_m)
        if info:
            a["head"], a["spells"], a["comp"] = info["head"], info["spells"], info["comp"]
            decoded += 1

    out = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources_ok": len(ok),
        "sources_failed": failed,
        "maps_source": maps_src,
        "armies": fin_armies,
        "bases": fin_bases,
    }

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n",
                         encoding="utf-8")

    print(f"[update_meta] {today}: +{a1 + a2} new armies, +{b1 + b2} new bases")
    print(f"[update_meta] totals: {len(fin_armies)} armies ({pro_armies} pro), "
          f"{len(fin_bases)} bases ({pro_bases} pro)")
    print(f"[update_meta] decoded {decoded}/{len(fin_armies)} armies (unit map: {maps_src})")
    print(f"[update_meta] sources ok: {len(ok)}, failed: {len(failed)}")
    for f in failed:
        print(f"   - failed: {f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
