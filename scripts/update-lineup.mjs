// Pulls Sister's lineup from Pinball Map and writes lineup.json next to index.html.
// Runs in GitHub Actions on a schedule, so the API token stays in a repository
// secret and the API is called twice a day no matter how many people open the page.
import { readFile, writeFile } from "node:fs/promises";

const LOCATION_ID = process.env.PBM_LOCATION_ID || "6422"; // Sister, Albuquerque
const TOKEN = process.env.PINBALLMAP_API_TOKEN;
const OUT = new URL("../lineup.json", import.meta.url);
const API = "https://pinballmap.com/api/v1";

if (!TOKEN) {
  console.error("PINBALLMAP_API_TOKEN is not set. Add it under Settings > Secrets and variables > Actions.");
  process.exit(1);
}

async function get(path) {
  const res = await fetch(API + path, {
    headers: { "X-Api-Token": TOKEN, Accept: "application/json", "User-Agent": "PinPlan lineup sync" }
  });
  if (!res.ok) throw new Error(`GET ${path} returned HTTP ${res.status}`);
  return res.json();
}

const pick = (...v) => v.find(x => x !== undefined && x !== null && x !== "");
const userOf = o => pick(o?.username, o?.user_name, o?.user?.username, o?.user?.user_name, "");

// One call for the lineup with conditions and scores, one for OPDB ids.
const loc = await get(`/locations/${LOCATION_ID}.json`);
let details = [];
try {
  const d = await get(`/locations/${LOCATION_ID}/machine_details.json`);
  details = Array.isArray(d) ? d : (d.machines || d.machine_details || []);
} catch (e) {
  console.warn("machine_details unavailable, matching plans by name only:", e.message);
}
const detailById = new Map(details.map(m => [m.id, m]));

const lmxs = loc.location_machine_xrefs || loc.lmxes || [];
if (!lmxs.length) {
  console.error("Pinball Map returned no machines for this location. Leaving lineup.json unchanged.");
  process.exit(1);
}

const machines = lmxs.map(x => {
  const m = x.machine || {};
  const d = detailById.get(pick(x.machine_id, m.id)) || {};
  return {
    name: pick(x.machine_name, x.name, m.name, d.name, "Unknown machine"),
    manufacturer: pick(x.manufacturer, m.manufacturer, d.manufacturer, ""),
    year: Number(pick(x.year, m.year, d.year, 0)) || null,
    opdb_id: pick(x.opdb_id, m.opdb_id, d.opdb_id, null),
    conditions: (x.machine_conditions || [])
      .filter(c => c && c.comment)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 3)
      .map(c => ({ comment: String(c.comment).trim(), user: userOf(c), date: pick(c.created_at, c.updated_at, null) })),
    scores: (x.machine_score_xrefs || [])
      .filter(s => Number(s.score) > 0)
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 3)
      .map(s => ({ score: Number(s.score), user: userOf(s), date: pick(s.created_at, null) }))
  };
}).sort((a, b) => a.name.localeCompare(b.name));

const out = {
  location: {
    id: Number(LOCATION_ID),
    name: pick(loc.name, "Sister"),
    url: `https://pinballmap.com/map/?by_location_id=${LOCATION_ID}`,
    date_last_updated: pick(loc.date_last_updated, null),
    last_updated_by: pick(loc.last_updated_by_username, null)
  },
  source: "Pinball Map (pinballmap.com), CC BY-SA 4.0",
  machines
};

// Only rewrite the file when the data changed, so the repo doesn't get a commit every run.
let previous = null;
try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch {}
const comparable = o => JSON.stringify({ ...o, synced_at: undefined });
if (previous && comparable(previous) === comparable(out)) {
  console.log(`No changes. ${machines.length} machines on the floor.`);
} else {
  out.synced_at = new Date().toISOString();
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote lineup.json with ${machines.length} machines.`);
}
