#!/usr/bin/env node
/*
 * Build the NEW_FIGURES block in app/data.js from the figure-authoring agents'
 * transcripts. Each agent returns a fenced ```json [ ...figure objects... ] ```
 * block (full schema: id, name{primary,alt,transliterations}, type, tradition,
 * parentIds, domains[], faculties[], materialCulture[], sources[]). We extract,
 * parse, dedup by id, drop ids already in the corpus, and rewrite the block.
 * Idempotent. Run: node scripts/gen-new-figures.cjs
 */
const fs = require('fs');
const path = require('path');
const { sources, writeSentinelBlock } = require('./gen-lib.cjs');
const { sanitizeFigureNotes } = require('./sanitize-notes.cjs');
const VALID = new Set(['deity', 'numen', 'demigod', 'quartigod', 'scion', 'mortal']);
const EXIST_FILE = fs.existsSync(path.join(__dirname, '..', 'data-sources', 'existing-ids.json'))
  ? path.join(__dirname, '..', 'data-sources', 'existing-ids.json')
  : '/tmp/existing-ids.json';
const existing = new Set(JSON.parse(fs.readFileSync(EXIST_FILE, 'utf8')));

// Some authoring agents emit materialCulture entries with a non-standard shape
// (e.g. { item: "double-axe or hammer", term, sources } — no id/name).
// buildItemRegistry keys items by id and renders mc.name, so such entries would
// be silently dropped from the registry and render blank in Detail. Normalize in
// place: copy the first name-bearing alias to mc.name and synthesize a stable,
// figure-scoped id so the item is kept. No-op for well-formed entries (which
// already carry an id), so it never perturbs already-committed output.
function normalizeMaterialCulture(f) {
  const arr = f && f.materialCulture;
  if (!Array.isArray(arr)) return;
  for (const mc of arr) {
    if (!mc || typeof mc !== 'object' || mc.id) continue;
    const name = mc.name || mc.item || mc.title || mc.object || mc.artifact;
    if (typeof name !== 'string' || !name.trim()) continue;
    mc.name = name.trim();
    for (const k of ['item', 'title', 'object', 'artifact']) delete mc[k];
    const slug = mc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'item';
    mc.id = `${f.id}-${slug}`;
  }
}
function extractFigures(text) {
  const out = [];
  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const re = /```(?:json)?\s*([\s\S]*?)```/g;
  let m, found = false;
  while ((m = re.exec(text))) {
    const v = tryParse(m[1].trim());
    if (Array.isArray(v)) { out.push(...v); found = true; }
  }
  if (!found) {
    const a = text.indexOf('['), b = text.lastIndexOf(']');
    if (a >= 0 && b > a) { const v = tryParse(text.slice(a, b + 1)); if (Array.isArray(v)) out.push(...v); }
  }
  return out;
}

const all = new Map();
const stats = { files: 0, raw: 0, dups: 0, exist: 0, invalid: 0 };
for (const { text } of sources()) {
  const figs = extractFigures(text);
  if (!figs.length) continue;
  // Only count transcripts that look like figure-authoring (objects with id+type/domains)
  const looksLikeFigures = figs.some((f) => f && f.id && (f.type || f.domains || f.faculties));
  if (!looksLikeFigures) continue;
  stats.files++;
  for (const f of figs) {
    stats.raw++;
    if (!f || typeof f !== 'object' || typeof f.id !== 'string' || !f.id) { stats.invalid++; continue; }
    if (!f.name && !f.names) { stats.invalid++; continue; }
    if (!f.type || !VALID.has(f.type)) f.type = 'deity';
    if (existing.has(f.id)) { stats.exist++; continue; }
    if (all.has(f.id)) { stats.dups++; continue; }
    normalizeMaterialCulture(f);
    sanitizeFigureNotes(f); // strip internal/plumbing scaffolding from public notes
    all.set(f.id, f);
  }
}
const arr = [...all.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const block = `/* NEW_FIGURES_START */\nconst NEW_FIGURES = ${JSON.stringify(arr, null, 1)};\n/* NEW_FIGURES_END */`;
writeSentinelBlock('NEW_FIGURES', block);
let pw = 0, it = 0; for (const f of arr) { pw += (f.faculties || []).length; it += (f.materialCulture || []).length; }
console.log(`transcripts: ${stats.files} | new figures: ${arr.length} (raw ${stats.raw}, skipped: existing ${stats.exist}, dup ${stats.dups}, invalid ${stats.invalid})`);
console.log(`  carrying ${pw} powers + ${it} items`);
