# PinPlan: project brief

Read this first. It replaces the original conversation, which isn't available to you.

## What this is
**Renamed 2026-11-12: the site is now "Garbo's Guide to ABQ Pinball"** (repo and URL still say PinPlan). Garbo is the owner's alien character; the theme is a field guide he left behind in Albuquerque (no Roswell references: the owner didn't want the app to seem based there). Night-sky look, Instrument Serif titles, dot-matrix accents. Lime is reserved for Garbo, the onboard display and tappable things. `garbo-says.md` holds the owner's own one-thing line per game (overrides `thesis`); `art/garbo.png` is his drawing used as a mask (three-eyed version, refined by the owner 2026-11-13; the pre-2026-11-12 drawing must not come back). The DMD version is the hand-drawn 40×30 `GARBO` bitmap in `index.html`; he winks his left eye (the viewer's right).
PinPlan is a free tournament strategy guide for pinball venues, starting in Albuquerque, NM.
- Live site: https://www.garbosguide.lol/ (custom domain set 2026-11-13; GitHub Pages, served from `main`, root folder; the `CNAME` file holds the domain). The old https://abeytaadam.github.io/PinPlan/ links, including printed QR codes, redirect there with their `#venue` hash intact.
- Domains (GoDaddy): garbosguide.lol has GitHub's four A and four AAAA records on `@` and `www` CNAME → abeytaadam.github.io. garbosguide.com is a GoDaddy 301 forward to https://www.garbosguide.lol. GoDaddy asks for an emailed one-time code on every DNS save; the owner enters it.
- New QR codes should point at `https://www.garbosguide.lol/#<venue-slug>`.
- Players reach it from a QR code posted at the venue.
- The current version covers one venue: **Sister**, 407 Central Ave NW (Pinball Map location 6422), with 16 machines.

**Reframed 2026-11-11:** PinPlan is now a general pinball strategy guide with tournament notes, so venues don't need to be labelled casual or tournament. Page order: thesis, PinTips, Game plan, Avoid, In a tournament (game-specific `tourney[]` lines, or three general match-play basics when empty), then venue panel, rules and sources. Original structure, for reference:

Each machine page leads with **tournament** strategy, not general play:
1. A one-line thesis ("If you remember one thing")
2. A tournament plan in priority order
3. An "Avoid" list
4. "At Sister": condition notes and high scores from Pinball Map, plus notes about this copy (model differences, remakes, malfunctions)
5. PinTips: the top-voted community tips, rewritten in our own words, with vote counts and categories
6. Rules in brief, then sources (every page links its sources)

## Files
- `icons/`: Garbo's face in lime on night (#1b1c20), rendered from the owner's drawing (2026-11-12). `favicon-32.png` and `favicon-64.png` use a face crop: `favicon-32.png` shows only the three eyes, nose and teeth; `favicon-64.png` adds the brows and whiskers so it reads at tab size; `apple-touch-icon.png` (180), `icon-192.png` and `icon-512.png` show the whole drawing. `favicon.svg` is the old "pp" mark, no longer linked. `site.webmanifest` names the app for "Add to Home Screen".
- `index.html`: the whole site in one file. The curated plans are the `MACHINES` array in the script near the bottom. Each entry has: id, code (DMD-style 2–4 letters), name, sort, mfr, year, variant, group (stern/chicago/classic/spooky/other), opdb (OPDB group id, e.g. G4do5), thesis, plan[], avoid[], venue {notes, copy, tied, scores}, tips [[category, votes, text]], tourney [] (tournament-only notes), rules, sources [[label, url]].
  - `venue.tied` holds [keyword, line] pairs. Each line only shows while a live Pinball Map condition note contains that keyword.
- `index.html` also loads `lineup.json` if it exists. Live machines are matched to plans by OPDB group id, then by name. New machines get a basic "No plan yet" page. Curated machines that leave the floor stay reachable by link.
- `scripts/update-lineup.mjs` + `.github/workflows/update-lineup.yml`: a GitHub Action that runs twice a day, calls the Pinball Map API with the `PINBALLMAP_API_TOKEN` repository secret, and commits `lineup.json` only when it changes. Until the secret exists, the job skips quietly instead of failing. Currently single-venue (location 6422). It was tested against mocked data, not the live API, because the key wasn't approved yet.
- `data/abq-venues-2026-11-11.json`: a snapshot of all 20 Albuquerque venues and their full lineups, read from pinballmap.com on 2026-11-11.

## Status (2026-11-11)
- Sister guide: done and live. A QR code for the live URL exists.
- Pinball Map API key: requested or about to be. The request text is at the bottom of this file.
- **Next: expand to every Albuquerque venue.** 20 venues, 98 machines, 58 distinct games. 16 already have plans (covering 27 machines). **42 games still need plans.** Don't re-research games that already have one; reuse them.
- **2026-11-11 update:** owner picked option 3 (full plans for all 42). All 42 are written and live in `MORE_PLANS` in `index.html` (in the shared library, matched by name, not shown in Sister's grid). The Avengers (2012) has no community rulesheet anywhere (checked Pinball Rulesheets, Kineticist, Pinball Primer); its plan combines Stern's instruction card (pinballrebel.com) with a 2013 Reddit thread. A text guide some fans circulate describes Zen's digital Avengers table, not the Stern machine, so don't use it. Indiana Jones and Super Star came from Primer text the owner pasted. All 42 plans have OPDB group ids and PinTips, pulled 2026-11-11 through the owner's browser because Match Play blocks automated fetchers (space requests about 8s apart or the API returns 429). Metallica and Super Star have no PinTips yet. Walking Dead Remastered (Gj6DE) has none, so its page shows the original 2014 game's tips. 
- Original options were:
  1. Full plans for the 14 games at 2+ venues (with Sister's, covers 70 of 98 machines); basic pages for the rest.
  2. Short plans (thesis + 3–4 priorities) for all 42.
  3. Full plans for all 42.
  Ask which one before starting.

### Games still needing plans (count = number of Albuquerque venues with it)
| Game | Venues | Where |
|---|---|---|
| Pokémon | 5 | La Cumbre Brewing Co. Westside, Putts N Pints, Rio Bravo Brewing Company, Stone Face Tavern, Unhinged Brewing Co |
| Star Wars: Fall of the Empire | 5 | Brew Lab 101 Beer & Cider Co., Calavida Cantina Corrales, La Cumbre Brewing Co. Westside, Rio Bravo Brewing Company, Unhinged Brewing Co |
| Transformers: More Than Meets the Eye | 5 | Calavida Cantina Corrales, La Cumbre Brewing Co, Putts N Pints, Rio Bravo Brewing Company, Uptown Sports Bar |
| Fallout | 4 | La Cumbre Brewing Co, Rio Bravo Brewing Company, Unhinged Brewing Co, Uptown Sports Bar |
| Jurassic Park | 4 | Brew Lab 101 Beer & Cider Co., Calavida Cantina Corrales, La Cumbre Brewing Co. Westside, Launchpad |
| Dungeons & Dragons: The Tyrant's Eye | 3 | Calavida Cantina Corrales, Unhinged Brewing Co, Uptown Sports Bar |
| JAWS | 3 | Brew Lab 101 Beer & Cider Co., Unhinged Brewing Co, Uptown Sports Bar |
| Guardians of the Galaxy | 2 | Round1 Bowling & Amusement, Uptown Sports Bar |
| James Bond 007 | 2 | Stone Face Tavern, Unhinged Brewing Co |
| King Kong: Myth of Terror Island | 2 | Calavida Cantina Corrales, Stone Face Tavern |
| Pulp Fiction | 2 | La Cumbre Brewing Co, Stone Face Tavern |
| Star Wars | 2 | Putts N Pints, Round1 Bowling & Amusement |
| The Munsters | 2 | Calavida Cantina Corrales, Silva Lanes |
| Twilight Zone | 2 | Anodyne Pool Hall & Cocktails, Silva Lanes |
| Avengers: Infinity Quest | 1 | La Cumbre Brewing Co. Westside |
| Deadpool | 1 | Brew Lab 101 Beer & Cider Co. |
| Fish Tales | 1 | Old Town Pizza Parlor |
| Foo Fighters | 1 | Calavida Cantina Corrales |
| Ghostbusters | 1 | Round1 Bowling & Amusement |
| Guns N' Roses | 1 | Launchpad |
| Indiana Jones: The Pinball Adventure | 1 | Pizza Castle |
| Iron Maiden: Legacy of the Beast | 1 | Putts N Pints |
| Kiss | 1 | Putts N Pints |
| Last Action Hero | 1 | Old Town Pizza Parlor |
| Led Zeppelin | 1 | Revel |
| Metallica | 1 | Round1 Bowling & Amusement |
| Monster Bash | 1 | Launchpad |
| Mustang | 1 | Putts N Pints |
| Spider-Man | 1 | Putts N Pints |
| Star Trek | 1 | Revel |
| Star Trek: The Next Generation | 1 | Anodyne Pool Hall & Cocktails |
| Star Wars Trilogy | 1 | Poki Poki |
| Super Star | 1 | Enchanted Trails RV Park & Trading Post |
| Teenage Mutant Ninja Turtles | 1 | Revel |
| The Addams Family | 1 | Anodyne Pool Hall & Cocktails |
| The Avengers | 1 | Putts N Pints |
| The Mandalorian | 1 | Revel |
| The Simpsons Pinball Party | 1 | Silva Lanes |
| The Walking Dead Remastered | 1 | Unhinged Brewing Co |
| Theatre of Magic | 1 | Pizza Castle |
| Venom | 1 | Calavida Cantina Corrales |
| X-Men | 1 | Launchpad |

Note: "X-Men" at Launchpad is the 2012 Stern X-Men, a different game from The Uncanny X-Men (2024). "Star Wars" is the 2017 Stern game; one copy is the 2019 Comic Art edition, same rules.

## Multi-venue UI (built 2026-11-11)
- A venue selector in the top bar switches between all 20 Albuquerque venues (names only). The choice is remembered per browser.
- The bare URL opens a landing page listing all 20 venues (dot-matrix short name, full name, machine count) with a "Last visited" shortcut once someone has opened a venue. Sister's QR code must point at `#sister` (the bare URL no longer opens Sister).
- Routes: `#<venue-slug>` is a venue's lineup, `#<venue-slug>/<machine-id>` is a plan seen from that venue, and old `#<machine-id>` links open Sister's pages. Each venue's QR code should point at `.../PinPlan/#<venue-slug>` (e.g. `#putts-n-pints`).
- `VENUES` in `index.html` holds each venue's snapshot lineup. Sister's curated notes, scores and copy lines only show at Sister; at other venues the venue panel starts blank and fills from live data.
- `lineup.json` is `{venues: [{id, name, date_last_updated, machines}]}` (the page also still reads the old single-venue `{location, machines}` format). `scripts/update-lineup.mjs` now pulls all 20 venues with region-wide requests: locations with `with_lmx=1` and the machine catalog (4 requests per run, 2 once `PBM_REGION` is set in the workflow, which matches the ~4/day in the API request). High scores were dropped on purpose for now: the owner wants to focus on strategy, so no score request is made. `VENUE_IDS` in the script must stay in sync with `VENUES` in `index.html`. Tested against mock data only (`PBM_MOCK_DIR`); the response shapes are guessed from the docs, so check the first live run's log.
- **Player reports (2026-11-12):** the owner decided reports live inside PinPlan only. Pinball Map condition notes are no longer fetched or shown (Pinball Map still supplies lineups, and each venue still links to its listing). Each machine page has an anonymous "How's it playing?" form (flippers, tilt, outlanes as tap choices, plus an "Anything else" note where players mention slow or dead shots). It posts to a Google Form the owner controls (`REPORT_FORM` in `index.html`: the formResponse URL and entry IDs from the form's "Get pre-filled link"). The responses sheet is published to the web as CSV; its link is the `REPORTS_CSV_URL` repository variable. `.github/workflows/update-reports.yml` runs `scripts/update-reports.mjs` every two hours and writes `data/reports.json` keyed `"<venue-slug>/<machine-id>"` (keeps 120 days, 30 per copy). The page summarizes the last 60 days: most common answer per question with "N of M", then the latest notes. Moderation = delete the row in the sheet. Spam guards: hidden honeypot field and one report per machine per 30 minutes per browser. `venue.tied` lines now match against report text. Step 3 (own backend for instant reports) only if usage warrants. PR #5 (saving Pinball Map notes) was closed unmerged.
- The Pinball Map API key (approved 2026-11-11) belongs only in the `PINBALLMAP_API_TOKEN` repository secret. Never put it in a file.
- Sister's hours/address strip was removed to follow the Pinball Map rules below. Each venue links to its own Pinball Map listing instead.

## Planned multi-venue structure (original notes)
- Home page: a list of venues (name only). Each venue page shows its lineup and has its own QR code.
- Machine plans live once in a shared library keyed by OPDB group id. Every venue that has the game links to the same plan. Venue-specific notes (condition reports, scores, model differences) stay per venue.
- Sync: one bulk request per run instead of one per venue. Pinball Map explicitly calls looping over `/locations/:id` an anti-pattern. Likely `GET /api/v1/locations.json?region=new-mexico` filtered to Albuquerque. Check whether the bulk response includes condition notes and scores before relying on it.
- Keep the visual design: dark "arcade terminal" look inspired by doronsupply.com (adapted, not copied). Instrument Serif display, IBM Plex Mono labels, IBM Plex Sans body, orange dot-matrix accent (#ff6b1f), crosshair-cornered grid cards, an animated DMD canvas in the hero.

## Pinball Map rules (must follow)
Source: https://pinballmap.com/api/v1/docs and https://pinballmap.com/llms.txt
- Every API request needs a key. Keep it server-side only (here: a GitHub Actions secret). Never call the API from browser JavaScript.
- Cache and refresh on a schedule. Request volume must not grow with site traffic.
- Use bulk endpoints. A well-designed app makes very few calls.
- Data is CC BY-SA 4.0. Each venue's page must link to **that venue's** Pinball Map listing, not just the homepage.
- **No clones.** Pinball Map forbids apps where people find places to play. Don't add maps, addresses, hours, "near me", location search, or "which venues have game X". Send people to Pinball Map for anything location-related. If in doubt, the owner should contact admin@pinballmap.com.

## Research sources
- **PinTips** (community tips): https://app.matchplay.events/opdb/entries/<OPDB group>/pintips. The page's data comes from `/api/pintips?opdbId=<group>` on app.matchplay.events. It rate-limits fast (HTTP 429 after about 6 quick requests), so space requests about 7 seconds apart.
- **Pinball Primer**: has a "Quick strategy synopsis" per game. Pages are named `<slug>_<OPDB group>.html`. Find them via https://pinballprimer.github.io/gamelist.html (slugs vary, e.g. afm_G4do5, medieval_G5pe4).
- **Pinball Rulesheets**: https://pinballrulesheets.com (the Tilt Forums rulesheets moved here when Tilt Forums closed in September 2026). Master list at /rulesheet-master-list.
- **Kineticist tutorials**: the best tournament-focused writing for modern Sterns, under kineticist.com/news/...
- **Tilt Forums archive**: tiltforums.com still serves static copies of old threads. Good for competitive strategy on older games.
- The newest games (2025–26) have rulesheets but little tournament-specific writing yet. Say so on the page rather than inventing strategy.

## Working notes
- The owner watches usage closely. Batch the research, reuse existing plans, and don't redo finished work.
- Verify facts against sources, and rewrite tips in your own words (don't copy text from sources).
- Before publishing, syntax-check the script and load the page with sample data (jsdom works; stub `matchMedia` and canvas).

## Pinball Map API request (Albuquerque-wide draft)
Service name: PinPlan
Site: https://abeytaadam.github.io/PinPlan/
Source code: https://github.com/abeytaadam/PinPlan

What it does: PinPlan is a free tournament strategy guide for pinball venues in Albuquerque, NM. Each venue has its own guide to the machines currently on its floor. For each machine there's a tournament game plan, shots to avoid, a short rules summary, community tips from PinTips, and links to rulesheets. Players open a venue's guide from a link or a QR code posted at that venue. The site is static, hosted on GitHub Pages, with no ads or logins. It covers the Albuquerque venues listed on Pinball Map, starting with Sister (location 6422).

What it isn't: PinPlan won't help people find places to play. It has no map, addresses, hours, location search, "near me" results, or search for which venues have a given game. Each venue's guide links to that venue's Pinball Map listing for anything location-related.

Why it needs the API: lineups rotate. The API keeps each venue's machine list current and shows the latest condition reports and high scores for each copy, so players know about problems like a weak flipper before they play.

Endpoints (read-only): one bulk call per run for the Albuquerque locations in the New Mexico region and their machines (GET /api/v1/locations.json with region and city filters), plus one call to GET /api/v1/machines.json?no_details=1 for OPDB IDs, used to match each machine to its strategy page. If you'd prefer a different endpoint for this, I'm happy to switch.

How often: a scheduled GitHub Actions job runs twice a day, so about 4 requests a day no matter how many venues or visitors there are. Occasionally I may run it by hand after a lineup change.

Caching and key handling: results are saved to JSON files in the repository, and the site reads only those files. Visitors never call the API. The token is stored as an encrypted GitHub Actions secret and never appears in the site's code or a browser. No write endpoints are used.

Attribution: every page credits Pinball Map and notes the CC BY-SA 4.0 license. Each venue's guide links to that venue's own Pinball Map listing, and condition notes show the username and date as posted.

If usage grows beyond this or the scope changes (for example, beyond Albuquerque), I'll contact you first.
