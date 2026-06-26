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

// Content-richness score for duplicate resolution. Two transcripts can author
// the same id with different completeness (e.g. an early pool carries
// domains:[] while a later pool fills them in). Plain id-dedup kept whichever
// arrived first (sorted filename order), silently dropping the richer copy.
// Scoring the populated content arrays lets the richer record win regardless
// of iteration order, deterministically.
const richness = (f) => {
  let s = 0;
  for (const k of ['domains', 'faculties', 'materialCulture', 'relations',
    'epithets', 'lifecycle', 'sources', 'names', 'parentIds', 'altNames']) {
    if (Array.isArray(f[k])) s += f[k].length;
  }
  if (typeof f.notes === 'string' && f.notes.trim()) s += 1;
  return s;
};
// The set of figures a record names as kin/associates. Used to tell a genuine
// enrichment of the SAME figure (a superset of these targets) apart from an id
// COLLISION between two distinct figures that happen to share an id (divergent
// targets) — the latter must never be silently merged.
const relTargets = (f) => new Set((f.relations || []).map((r) => r.personId).filter(Boolean));

const all = new Map();
const stats = { files: 0, raw: 0, dups: 0, exist: 0, invalid: 0, dupReplaced: 0, dupCollide: 0 };
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
    normalizeMaterialCulture(f);
    sanitizeFigureNotes(f); // strip internal/plumbing scaffolding from public notes
    const prev = all.get(f.id);
    if (prev) {
      stats.dups++;
      // Two records sharing an id are EITHER the same figure authored twice at
      // different completeness (enrich: take the richer) OR two distinct
      // figures colliding on one id (a data error: never merge — keep the
      // first and flag it loudly for disambiguation). The discriminator: a
      // genuine enrichment preserves every kin target the first named; a
      // collision drops/diverges them (e.g. two different "Chitrangada" — one
      // Arjuna's wife, one Shantanu's son).
      const pT = relTargets(prev), cT = relTargets(f);
      const preservesPrev = [...pT].every((t) => cT.has(t));
      const rPrev = richness(prev), rCur = richness(f);
      if (!preservesPrev) {
        stats.dupCollide++;
        console.log(`  dup ${f.id}: COLLISION — kept first; the copies name different kin `
          + `(first→[${[...pT].join(',')}] vs other→[${[...cT].join(',')}]). Disambiguate the id.`);
      } else if (rCur > rPrev) {
        stats.dupReplaced++;
        console.log(`  dup ${f.id}: enriched same figure, kept richer copy (richness ${rPrev} -> ${rCur})`);
        all.set(f.id, f);
      }
      continue;
    }
    all.set(f.id, f);
  }
}
const arr = [...all.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const block = `/* NEW_FIGURES_START */\nconst NEW_FIGURES = ${JSON.stringify(arr, null, 1)};\n/* NEW_FIGURES_END */`;
writeSentinelBlock('NEW_FIGURES', block);
let pw = 0, it = 0; for (const f of arr) { pw += (f.faculties || []).length; it += (f.materialCulture || []).length; }
console.log(`transcripts: ${stats.files} | new figures: ${arr.length} (raw ${stats.raw}, skipped: existing ${stats.exist}, dup ${stats.dups}, invalid ${stats.invalid})`);
console.log(`  carrying ${pw} powers + ${it} items`);
