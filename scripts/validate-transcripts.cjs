#!/usr/bin/env node
/*
 * validate-transcripts.cjs — pre-flight checks for figure-authoring transcripts,
 * BEFORE gen-new-figures merges them into the corpus. Catches the defects that
 * the test suite misses because they cause SILENT DATA LOSS rather than errors:
 *   - faculties authored as { "faculty": "x" } (no id/name) → dropped from the
 *     powers registry.
 *   - materialCulture authored as { "itemId": "x" } (no id/name) → dropped from
 *     the item registry.
 * plus the things that DO fail downstream, surfaced here per-figure with a clear
 * message: bad era keys (must be registered for the tradition), missing
 * citations, dangling relation/parent targets, id collisions, and one-way
 * symmetric relations (within-batch must be reciprocal; to an existing corpus
 * figure it is reported as RECIPROCAL-NEEDED so the reciprocal can be added).
 *
 * Usage: node scripts/validate-transcripts.cjs data-sources/transcripts/foo.txt [bar.txt ...]
 * Exit 0 = clean, 1 = problems found.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SYM = new Set(['spouse', 'sibling', 'twin sibling', 'half sibling', 'half-sibling',
  'lover', 'enemy', 'rival', 'ally', 'companion', 'sworn companion', 'equated-with', 'interpretatio']);
const VALID_TYPE = new Set(['deity', 'demigod', 'quartigod', 'scion', 'mortal']);

function loadCorpus() {
  const ctx = {
    window: { dispatchEvent: () => true, addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    console: { log() {}, warn() {}, error() {}, info() {} },
    CustomEvent: class { constructor(t, o) { Object.assign(this, { type: t }, o || {}); } },
  };
  ctx.window.localStorage = ctx.localStorage; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
  return ctx.window.__PR;
}

function extractFigures(text) {
  const out = [];
  const re = /```(?:json)?\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) { try { const v = JSON.parse(m[1].trim()); if (Array.isArray(v)) out.push(...v); } catch (e) { out._parseError = e.message; } }
  return out;
}
const hasRef = (arr) => Array.isArray(arr) && arr.length && arr.every((s) => s && typeof s.reference === 'string' && s.reference.trim());

function main() {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('usage: validate-transcripts.cjs <transcript.txt> ...'); process.exit(2); }
  const PR = loadCorpus();
  const corpus = PR.seedPeople;
  const ERA = PR.ERA_ORDER || {};
  const corpusIds = new Set(Object.keys(corpus));

  // Collect every authored figure across the given files (the batch).
  const batch = new Map();
  const problems = [];
  const reciprocalNeeded = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const figs = extractFigures(text);
    if (figs._parseError) problems.push(`${f}: JSON parse error — ${figs._parseError}`);
    for (const fig of figs) {
      if (!fig || !fig.id) { problems.push(`${f}: figure with no id`); continue; }
      if (batch.has(fig.id)) problems.push(`${fig.id}: duplicated within the batch`);
      if (corpusIds.has(fig.id)) problems.push(`${fig.id}: COLLIDES with an existing corpus id`);
      batch.set(fig.id, fig);
    }
  }
  const known = (id) => batch.has(id) || corpusIds.has(id);

  for (const [id, p] of batch) {
    const where = id;
    if (!VALID_TYPE.has(p.type)) problems.push(`${where}: invalid type ${JSON.stringify(p.type)}`);
    if (!hasRef((p.sources || []).flatMap((s) => s.citations || []))) problems.push(`${where}: top-level sources[].citations[].reference missing/empty`);
    const vocab = ERA[p.tradition];
    if (!vocab) problems.push(`${where}: tradition ${JSON.stringify(p.tradition)} has no ERA_ORDER vocabulary`);
    const eraOk = (e, w) => { if (e && vocab && !vocab.includes(e)) problems.push(`${where}: ${w} era ${JSON.stringify(e)} not registered for ${p.tradition} (valid: ${vocab.join(', ')})`); };
    eraOk(p.temporal && p.temporal.era, 'temporal');
    for (const ph of p.lifecycle || []) eraOk(ph.era, 'lifecycle');
    // faculties: must be {id,name,inheritability,sources}; catch the {faculty:...} shape.
    for (const fac of p.faculties || []) {
      if (!fac || typeof fac !== 'object') { problems.push(`${where}: faculty entry not an object`); continue; }
      if ('faculty' in fac && !fac.id) problems.push(`${where}: faculty uses {"faculty":...} shape (no id/name) — will be DROPPED; use {id,name,inheritability}`);
      if (!fac.id || !fac.name) problems.push(`${where}: faculty missing id/name: ${JSON.stringify(fac).slice(0, 80)}`);
      if (!hasRef(fac.sources)) problems.push(`${where}: faculty ${fac.id || '?'} sources[].reference missing/empty`);
    }
    // materialCulture: must carry id+name; catch the {itemId:...} shape.
    for (const mc of p.materialCulture || []) {
      if (!mc || typeof mc !== 'object') { problems.push(`${where}: materialCulture entry not an object`); continue; }
      if ('itemId' in mc && !mc.id) problems.push(`${where}: materialCulture uses {"itemId":...} (no id/name) — will be DROPPED; use {id,name,kind,role}`);
      if (!mc.id || !mc.name) problems.push(`${where}: materialCulture missing id/name: ${JSON.stringify(mc).slice(0, 80)}`);
      if (!hasRef(mc.sources)) problems.push(`${where}: materialCulture ${mc.id || '?'} sources[].reference missing/empty`);
    }
    for (const d of p.domains || []) if (!hasRef(d.sources)) problems.push(`${where}: domain ${d.sphereId || '?'} sources[].reference missing/empty`);
    // parents + relations resolve
    for (const pid of p.parentIds || []) if (!known(pid)) problems.push(`${where}: parentId ${pid} does not resolve`);
    for (const rel of p.relations || []) {
      if (!rel || !rel.personId) continue; // externalRef relations have no personId — fine
      if (!known(rel.personId)) problems.push(`${where}: relation ${rel.kind} -> ${rel.personId} does not resolve`);
      if (SYM.has(rel.kind)) {
        if (batch.has(rel.personId)) {
          const back = (batch.get(rel.personId).relations || []).some((r) => r.personId === id && r.kind === rel.kind);
          if (!back) problems.push(`${where}: symmetric ${rel.kind} -> ${rel.personId} is NOT reciprocated within the batch`);
        } else if (corpusIds.has(rel.personId)) {
          const back = (corpus[rel.personId].relations || []).some((r) => r.personId === id && r.kind === rel.kind);
          if (!back) reciprocalNeeded.push(`${rel.personId} ${rel.kind} ${id}  (add reciprocal to existing figure ${rel.personId})`);
        }
      }
    }
  }

  console.log(`validate-transcripts: ${batch.size} figures across ${files.length} file(s)`);
  if (reciprocalNeeded.length) {
    console.log(`\nRECIPROCAL-NEEDED (add to existing corpus figures):`);
    for (const r of reciprocalNeeded) console.log('  - ' + r);
  }
  if (problems.length) {
    console.log(`\n✗ ${problems.length} problem(s):`);
    for (const p of problems) console.log('  - ' + p);
    process.exit(1);
  }
  console.log(reciprocalNeeded.length ? '\n(no hard problems; resolve the reciprocals above before/after merge)' : '\n✓ clean');
}
main();
