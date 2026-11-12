// Pulls the lineups for PinPlan's Albuquerque venues from Pinball Map and writes lineup.json
// next to index.html. Runs in GitHub Actions on a schedule, so the API token stays in a
// repository secret and request volume doesn't grow with site traffic.
//
// Pinball Map asks apps to use bulk endpoints instead of looping over /locations/:id,
// so each run makes two region-wide requests:
//   1. /region/:region/locations.json?with_lmx=1   every location in the region, with machines and comments
//   2. /machines.json?no_details=1                  machine names, manufacturers, years and OPDB ids
// (plus two one-time lookups to find the region name if PBM_REGION isn't set).
import { readFile, writeFile } from "node:fs/promises";

// The venues PinPlan covers (Pinball Map location ids). Keep in sync with VENUES in index.html.
const VENUE_IDS = [2789, 27749, 27915, 29637, 27108, 27112, 2788, 19721, 5132, 29052, 30149, 28857, 27114, 10449, 2775, 6422, 23079, 28980, 27473, 28937];
const HOME_ID = 6422; // Sister: used to look up the region when PBM_REGION isn't set
const TOKEN = process.env.PINBALLMAP_API_TOKEN;
const MOCK = process.env.PBM_MOCK_DIR; // local testing: read <dir>/<path with / replaced by _>.json instead of calling the API
const OUT = new URL("../lineup.json", import.meta.url);
const API = "https://pinballmap.com/api/v1";

if (!TOKEN && !MOCK) {
  console.error("PINBALLMAP_API_TOKEN is not set. Add it under Settings > Secrets and variables > Actions.");
  process.exit(1);
}

let calls = 0;
async function get(path) {
  calls++;
  if (MOCK) {
    const file = path.replace(/^\//, "").replace(/\?.*$/, "").replace(/[/.]/g, "_") + ".json";
    return JSON.parse(await readFile(new URL(file, "file://" + MOCK.replace(/\/?$/, "/")), "utf8"));
  }
  const res = await fetch(API + path, {
    headers: { "X-Api-Token": TOKEN, Accept: "application/json", "User-Agent": "PinPlan lineup sync (github.com/abeytaadam/PinPlan)" }
  });
  if (!res.ok) throw new Error(`GET ${path} returned HTTP ${res.status}`);
  return res.json();
}

const pick = (...v) => v.find(x => x !== undefined && x !== null && x !== "");
const userOf = o => pick(o?.username, o?.user_name, o?.user?.username, o?.user?.user_name, "");
const list = (o, ...keys) => { for (const k of keys) if (Array.isArray(o?.[k])) return o[k]; return Array.isArray(o) ? o : []; };

// 1. Region name.
let region = process.env.PBM_REGION;
if (!region) {
  const home = await get(`/locations/${HOME_ID}.json`);
  const regionId = pick(home.region_id, home.location?.region_id);
  const regions = list(await get("/regions.json"), "regions");
  region = pick(regions.find(r => r.id === regionId)?.name, home.region?.name);
  if (!region) throw new Error("Couldn't work out the Pinball Map region. Set PBM_REGION in the workflow.");
  console.log(`Region: ${region} (set PBM_REGION=${region} in the workflow to skip this lookup).`);
}

// 2. Locations with their machines and comments.
const locations = list(await get(`/region/${encodeURIComponent(region)}/locations.json?with_lmx=1`), "locations");
const wanted = new Set(VENUE_IDS);
const ours = locations.filter(l => wanted.has(Number(l.id)));
if (!ours.length) {
  console.error(`Pinball Map returned none of PinPlan's venues for region "${region}". Leaving lineup.json unchanged.`);
  process.exit(1);
}
const missing = VENUE_IDS.filter(id => !ours.some(l => Number(l.id) === id));
if (missing.length) console.warn(`Not found in this pull (closed or moved?): ${missing.join(", ")}`);

// 3. Machine catalog, for names, makers, years and OPDB ids.
const catalog = new Map(list(await get("/machines.json?no_details=1"), "machines").map(m => [Number(m.id), m]));

const venues = ours.map(loc => {
  const lmxs = list(loc, "location_machine_xrefs", "lmxes");
  const machines = lmxs.map(x => {
    const m = Object.assign({}, catalog.get(Number(pick(x.machine_id, x.machine?.id))) || {}, x.machine || {});
    // High scores are left out for now (no extra request); any that come inline with the lmx are kept.
    const scores = x.machine_score_xrefs || [];
    return {
      name: pick(x.machine_name, m.name, "Unknown machine"),
      lmx_id: Number(x.id) || null,
      all_conditions: x.machine_conditions || [],
      manufacturer: pick(m.manufacturer, ""),
      year: Number(pick(m.year, 0)) || null,
      opdb_id: pick(m.opdb_id, null),
      conditions: (x.machine_conditions || [])
        .filter(c => c && c.comment)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 3)
        .map(c => ({ comment: String(c.comment).trim(), user: userOf(c), date: pick(c.created_at, c.updated_at, null) })),
      scores: scores
        .filter(s => Number(s.score) > 0)
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, 3)
        .map(s => ({ score: Number(s.score), user: userOf(s), date: pick(s.created_at, null) }))
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  return {
    id: Number(loc.id),
    name: loc.name,
    url: `https://pinballmap.com/map/?by_location_id=${loc.id}`,
    date_last_updated: pick(loc.date_last_updated, null),
    machines
  };
}).sort((a, b) => a.name.localeCompare(b.name));

// Play history: keep every condition note we've ever seen for each copy (venue + location-machine id),
// so a copy's timeline survives after Pinball Map's list moves on. Stored in data/history.json.
const HISTORY = new URL("../data/history.json", import.meta.url);
let history = { source: "Pinball Map (pinballmap.com), CC BY-SA 4.0", copies: {} };
try { history = JSON.parse(await readFile(HISTORY, "utf8")); } catch {}
const histBefore = JSON.stringify(history.copies);
const today = new Date().toISOString().slice(0, 10);
for (const v of venues) {
  for (const m of v.machines) {
    const raw = m.all_conditions;
    delete m.all_conditions;
    if (!m.lmx_id) continue;
    const key = `${v.id}:${m.lmx_id}`;
    const copy = history.copies[key] || (history.copies[key] = { venue_id: v.id, name: m.name, first_seen: today, notes: [] });
    copy.name = m.name;
    const seen = new Set(copy.notes.map(n => `${n.date}|${n.comment}`));
    for (const c of raw) {
      if (!c || !c.comment) continue;
      const note = { comment: String(c.comment).trim(), user: userOf(c), date: pick(c.created_at, c.updated_at, null) };
      const k = `${note.date}|${note.comment}`;
      if (!seen.has(k)) { copy.notes.push(note); seen.add(k); }
    }
    copy.notes.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    copy.notes = copy.notes.slice(0, 50);
  }
}
if (JSON.stringify(history.copies) !== histBefore) {
  history.updated = new Date().toISOString();
  await writeFile(HISTORY, JSON.stringify(history, null, 2) + "\n");
  console.log(`Updated data/history.json (${Object.keys(history.copies).length} copies tracked).`);
}

const out = { source: "Pinball Map (pinballmap.com), CC BY-SA 4.0", region, venues };

// Only rewrite the file when the data changed, so the repo doesn't get a commit every run.
let previous = null;
try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch {}
const comparable = o => JSON.stringify({ ...o, synced_at: undefined });
const total = venues.reduce((n, v) => n + v.machines.length, 0);
if (previous && comparable(previous) === comparable(out)) {
  console.log(`No changes. ${venues.length} venues, ${total} machines. ${calls} API requests.`);
} else {
  out.synced_at = new Date().toISOString();
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote lineup.json: ${venues.length} venues, ${total} machines. ${calls} API requests.`);
}
