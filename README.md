# ☄️ TH18 War Hub

A free, static website that explains — in plain English — the strongest **Town Hall 18** attack strategies in
the current Clash of Clans meta, and the defensive base designs that beat them. Every army is a one-tap **Copy Army**
link, and every base is a one-tap **Open Layout** link that imports straight into the game.

- **`index.html`** — TH18 "Crash Lands" meta overview + how the downloads work
- **`attacks.html`** — 5 meta attack strategies, each with a step-by-step plan, hero + equipment loadout, and an army download
- **`defenses.html`** — import-ready CWL/war bases + a plain-English breakdown of *why* they hold
- **`assets/`** — stylesheet, script, no external dependencies

No build step, no frameworks — it's plain HTML/CSS/JS, so it runs anywhere.

---

## How the downloads work

- **Army links** (`action=CopyArmy&army=…`) encode the whole composition — troops, spells, siege, and hero
  equipment — directly in the URL, so they can be built from scratch and always load the exact loadout.
- **Base links** (`action=OpenLayout&id=…`) contain an *opaque server ID* that points to a layout Supercell stored
  when a real player shared that base in-game. They **cannot be hand-generated**, so the bases here are genuine,
  publicly-shared community layouts curated to match the defensive principles on the page.

Open the site **on the device that has Clash of Clans installed**, tap a button, and the game takes over. Nothing is
spent or changed automatically — you always confirm in-game.

---

## Publish it free on GitHub Pages

1. **Create a repo** on GitHub (e.g. `th18-war-hub`).
2. **Push these files** to the repo root:
   ```bash
   cd "th18-war-hub"
   git init
   git add .
   git commit -m "TH18 War Hub"
   git branch -M main
   git remote add origin https://github.com/<your-username>/th18-war-hub.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, pick **`main`** / **`/ (root)`**, Save.
4. Wait ~1 minute. Your site is live at `https://<your-username>.github.io/th18-war-hub/`.

> The included `.nojekyll` file tells GitHub Pages to serve the files as-is (no Jekyll processing).

### Custom domain (optional)
Add a `CNAME` file containing your domain, then point a DNS `CNAME` record at `<your-username>.github.io`.

---

## Keeping it current

The Clash of Clans meta shifts with every balance patch. To update:

- **Swap an army:** replace the `href` and `data-copy` values on that strategy's buttons in `attacks.html` with a
  fresh `CopyArmy` link.
- **Swap a base:** replace the `href`/`data-copy` on that base card in `defenses.html` with a fresh `OpenLayout`
  link (from in-game sharing or a reputable base site).
- **Change the roster:** each strategy's hero/equipment list and step-by-step are plain HTML — edit in place.

---

## Weekly auto-updater (GitHub Actions)

`.github/workflows/weekly-meta-update.yml` runs every **Tuesday 13:00 UTC** (and on-demand via the Actions tab).
It runs `scripts/update_meta.py`, which scrapes community pages for `CopyArmy` / `OpenLayout` links, merges them
into `data/latest.json` (keeping each link's first-seen date), then commits & pushes so Pages redeploys. The site's
"Fresh this week" sections render that file.

The script has **two source lanes**, both edited at the top of `scripts/update_meta.py`:

- `SOURCES` — general community pages → the **🔥 Community fresh** grid.
- `PRO_SOURCES` — curated top-tier / pro / CWL pages → links get `pro: true` and show under **🏆 Pro / tournament
  picks** with a gold **PRO** badge.

To add a source, drop its URL into the right list. Dead or paywalled sources are skipped automatically (they never
fail the run). Note: base layouts and army comps are **not** in the official Supercell API, so "pro" means
community-curated top-tier picks from public pages — see the *Study the Pros* section on the site's home page.

> GitHub disables scheduled workflows after ~60 days of **no repo activity**. The weekly commits normally keep it
> awake; if it ever pauses, open the Actions tab and hit **Run workflow** once to re-arm it.

## Credits & disclaimer

Unofficial fan project. **Clash of Clans is a trademark of Supercell**; this site is not affiliated with or endorsed
by Supercell. Strategy notes and community links are curated from public sources including Supercell's official TH18
release notes, AllClash, Blueprint CoC and TrophyCoach.
