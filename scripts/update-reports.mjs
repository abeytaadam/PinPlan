// Pulls PinPlan's own machine reports and writes data/reports.json for the site.
// Players submit reports from the form on each machine page; the form posts to a Google Form the
// owner controls, whose responses sheet is published as CSV. Deleting a row in the sheet removes
// that report on the next run.
//
// Moderation: the tap answers (flippers, tilt, outlanes) go up automatically. A written note only
// goes up once the owner ticks the "OK" checkbox column in the responses sheet, and never if it
// holds a link, an email address, a phone number or a word from scripts/blocked-words.txt.
//
// Set REPORTS_CSV_URL (a repository variable) to the sheet's "Publish to web" CSV link.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const SRC = process.env.REPORTS_CSV_URL;
const OUT = new URL("../data/reports.json", import.meta.url);
const KEEP_DAYS = 120;      // older reports are dropped; the page only counts the last 60 days
const PER_COPY = 30;
const NOTE_MAX = 280;

if (!SRC) {
  console.log("REPORTS_CSV_URL isn't set yet, so there are no reports to pull.");
  process.exit(0);
}

const text = SRC.startsWith("file:") || !/^https?:/.test(SRC)
  ? await readFile(SRC.replace(/^file:\/\//, ""), "utf8")
  : await (async () => {
      const r = await fetch(SRC, { headers: { "User-Agent": "PinPlan report sync" } });
      if (!r.ok) throw new Error(`Report sheet returned HTTP ${r.status}`);
      return r.text();
    })();

// Minimal RFC 4180 CSV parser (quoted fields, doubled quotes, newlines inside quotes).
function parseCSV(s) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(f); rows.push(row); row = []; f = "";
    } else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ""));
}

const [header = [], ...rows] = parseCSV(text);
const col = word => header.findIndex(h => h.toLowerCase().includes(word));
const okCol = header.findIndex(h => ["ok", "approved", "approve"].includes(h.trim().toLowerCase()));
const C = { time: col("timestamp"), copy: col("copy"), flippers: col("flipper"), tilt: col("tilt"), outlanes: col("outlane"), note: col("note") >= 0 ? col("note") : col("anything else") };
if (C.copy < 0) throw new Error(`The report sheet has no "Copy" column. Found: ${header.join(" | ")}`);

if (okCol < 0) console.log('No "OK" column in the report sheet yet, so no written notes are shown.');

// Notes the owner hasn't ticked, or that trip the filter, are dropped (the tap answers stay).
const BLOCKED = (await readFile(new URL("./blocked-words.txt", import.meta.url), "utf8").catch(() => ""))
  .split(/\r?\n/).map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith("#"));
const unleet = t => t.toLowerCase().replace(/[0@4$5!1|3]/g, c => ({ "0": "o", "@": "a", "4": "a", "$": "s", "5": "s", "!": "i", "1": "i", "|": "i", "3": "e" })[c]);
const blockedRe = BLOCKED.length ? new RegExp(`(^|[^a-z])(${BLOCKED.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[^a-z]+")).join("|")})(s|es|ed|ing)?(?![a-z])`) : null;
const hasContact = t => /https?:|www\.|\b[a-z0-9-]+\.(com|net|org|io|ly|gg|xyz|co|me|lol|info|biz)\b|@\w|\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/i.test(t);
const isTicked = v => /^(true|yes|y|x|ok|1|✓|✔)$/i.test(String(v || "").trim());
let held = 0, blocked = 0;
function allowNote(row, note) {
  if (!note) return "";
  if (blockedRe && blockedRe.test(unleet(note)) || hasContact(note)) { blocked++; return ""; }
  if (okCol < 0 || !isTicked(row[okCol])) { held++; return ""; }
  return note;
}

// Google Forms timestamps look like "11/12/2026 11:30:12" (US locale) or ISO; normalise to YYYY-MM-DD.
function toDate(s) {
  const m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}
const clean = (v, max = 60) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);

const copies = {};
for (const r of rows) {
  const key = clean(r[C.copy], 120).toLowerCase();
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(key)) continue;          // must look like venue-slug/machine-id
  const date = toDate(r[C.time]);
  if (!date || date < cutoff) continue;
  const rep = {
    date,
    flippers: C.flippers >= 0 ? clean(r[C.flippers]) : "",
    tilt: C.tilt >= 0 ? clean(r[C.tilt]) : "",
    outlanes: C.outlanes >= 0 ? clean(r[C.outlanes]) : "",
    note: C.note >= 0 ? allowNote(r, clean(r[C.note], NOTE_MAX)) : ""
  };
  if (!rep.flippers && !rep.tilt && !rep.outlanes && !rep.note) continue;
  (copies[key] = copies[key] || []).push(rep);
}
for (const k of Object.keys(copies)) {
  copies[k].sort((a, b) => b.date.localeCompare(a.date));
  copies[k] = copies[k].slice(0, PER_COPY);
}

if (held || blocked) console.log(`Notes not shown: ${held} waiting for an OK tick, ${blocked} caught by the filter.`);

const out = { source: "PinPlan player reports", copies };
let previous = null;
try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch {}
const total = Object.values(copies).reduce((n, a) => n + a.length, 0);
if (previous && JSON.stringify(previous.copies) === JSON.stringify(copies)) {
  console.log(`Reports unchanged: ${total} reports on ${Object.keys(copies).length} machines.`);
} else {
  out.updated = new Date().toISOString();
  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote data/reports.json: ${total} reports on ${Object.keys(copies).length} machines.`);
}
