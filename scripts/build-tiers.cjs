#!/usr/bin/env node
/*
 * build-tiers.cjs — derive the lazy-load data tiers from the assembled corpus.
 *
 * The inline-everything single-file model does not scale past a few thousand
 * figures (50k ≈ 315 MB). This emits a tiered, lazily-loadable static dataset
 * that keeps UPFRONT load flat regardless of corpus size:
 *
 *   dist/data/index.json          TIER 1 — one tiny record per figure
 *                                  {i,n,t,y,e,f}: id, name, tradition, type, era,
 *                                  capability-flags (bit0 relations, bit1 items,
 *                                  bit2 domains, bit3 faculties). Drives Browse +
 *                                  search + facets with NO detail data.
 *   dist/data/details/<bkt>.json  TIER 2 — full records, hash-bucketed for balance.
 *                                  bucket(id) = (Σ charCodes) % BUCKETS. Fetched on
 *                                  figure open, then cached.
 *   dist/data/items.json          TIER 3 — precomputed aggregates, loaded only when
 *   dist/data/powers.json                  the matching view is opened (not scanned
 *   dist/data/domains.json                 at runtime over all figures).
 *   dist/data/meta.json           schema/version, counts, BUCKETS.
 *
 * Source of truth stays app/data.js (the gen scripts are unchanged); this DERIVES
 * the artifacts by running the assembled corpus in node. Deterministic output
 * (sorted ids / keys) so it is byte-exact reproducible.
 *
 * Run: node scripts/build-tiers.cjs
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'data');
const BUCKETS = 64;
const SCHEMA = 1;

function loadCorpus() {
  const ctx = {
    window: { dispatchEvent: () => true, addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    console: { log() {}, warn() {}, error() {}, info() {} },
    CustomEvent: class { constructor(t, o) { Object.assign(this, { type: t }, o || {}); } },
  };
  ctx.window.localStorage = ctx.localStorage;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
  return ctx.window.__PR;
}

const bucketOf = (id) => {
  let s = 0;
  for (let k = 0; k < id.length; k++) s = (s + id.charCodeAt(k)) % BUCKETS;
  return s;
};
const humanize = (s) => String(s == null ? '' : s).replace(/[-_]+/g, ' ').trim();
const flags = (p) =>
  ((p.relations || []).length ? 1 : 0) |
  ((p.materialCulture || []).length ? 2 : 0) |
  ((p.domains || []).length ? 4 : 0) |
  ((p.faculties || []).length ? 8 : 0);

function buildPowers(P, ids) {
  const reg = {};
  for (const id of ids) for (const f of (P[id].faculties || [])) {
    if (!f || !f.id) continue;
    const r = reg[f.id] || (reg[f.id] = { id: f.id, displayName: humanize(f.id), domainTag: null, holders: [] });
    if (f.name && r.displayName === humanize(f.id)) r.displayName = f.name;
    if (!r.domainTag && f.domainTag) r.domainTag = f.domainTag;
    r.holders.push(id);
  }
  return reg;
}
function buildDomains(P, ids) {
  const reg = {};
  for (const id of ids) for (const d of (P[id].domains || [])) {
    if (!d || !d.sphereId) continue;
    const r = reg[d.sphereId] || (reg[d.sphereId] = { id: d.sphereId, displayName: humanize(d.sphereId), holders: [] });
    r.holders.push(id);
  }
  return reg;
}
// stable map → object with keys in sorted order (deterministic output)
const sortedObj = (obj) => {
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
};

function main() {
  const PR = loadCorpus();
  const P = PR.seedPeople;
  const ids = Object.keys(P).sort();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'details'), { recursive: true });

  // TIER 1 — index
  const index = ids.map((id) => {
    const p = P[id];
    return { i: id, n: (p.name && p.name.primary) || id, t: p.tradition || '', y: p.type || '', e: (p.temporal && p.temporal.era) || '', f: flags(p) };
  });
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));

  // TIER 2 — detail shards (hash-bucketed; ids sorted within a bucket)
  const buckets = Array.from({ length: BUCKETS }, () => ({}));
  for (const id of ids) buckets[bucketOf(id)][id] = P[id];
  let detailBytes = 0;
  buckets.forEach((b, i) => {
    const j = JSON.stringify(sortedObj(b));
    detailBytes += j.length;
    fs.writeFileSync(path.join(OUT, 'details', `${i}.json`), j);
  });

  // TIER 3 — aggregates
  const items = sortedObj(PR.items || {});
  const powers = sortedObj(buildPowers(P, ids));
  const domains = sortedObj(buildDomains(P, ids));
  fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify(items));
  fs.writeFileSync(path.join(OUT, 'powers.json'), JSON.stringify(powers));
  fs.writeFileSync(path.join(OUT, 'domains.json'), JSON.stringify(domains));

  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({
    schema: SCHEMA, buckets: BUCKETS, bucketHash: 'sum-charcodes-mod-buckets',
    figures: ids.length, items: Object.keys(items).length,
    powers: Object.keys(powers).length, domains: Object.keys(domains).length,
  }));

  const gz = (s) => zlib.gzipSync(s).length;
  const MB = (x) => (x / 1048576).toFixed(2);
  const idxRaw = fs.readFileSync(path.join(OUT, 'index.json'));
  console.log(`build-tiers: ${ids.length} figures → dist/data/`);
  console.log(`  index.json   ${MB(idxRaw.length)} MB raw / ${MB(gz(idxRaw))} MB gz  (${(idxRaw.length / ids.length).toFixed(0)} B/figure — UPFRONT)`);
  console.log(`  details/     ${BUCKETS} shards, ${MB(detailBytes)} MB total (lazy)`);
  console.log(`  items/powers/domains aggregates (lazy per view)`);
}

main();
