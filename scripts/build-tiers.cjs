#!/usr/bin/env node
/*
 * build-tiers.cjs — derive lazily-loadable data tiers from the assembled corpus.
 *
 * The inline-everything single-file model does not scale past a few thousand
 * figures (50k ~= 315 MB). This emits a tiered static dataset keeping UPFRONT
 * load flat regardless of corpus size. Tiers map to distinct access patterns:
 *
 *   index.json     TIER 1 (upfront)  one tiny record/figure: {i,n,s,t,y,e,f}
 *                  = id, name, search-blob (alt names + native term values),
 *                  tradition, type, era, capability-flags (1 rel|2 item|4 dom|8 fac).
 *                  Drives Browse + search + facets with NO detail/edge data.
 *   edges.json     TIER 2 (on first Graph/Lineage/Detail)  id -> {p:parentIds,
 *                  pr:parentRoles, r:[{k:kind,id:personId}]}. The cross-cutting
 *                  graph that Graph view, the Lineage tree (childrenOf inverts
 *                  parentIds), and the divinity walk all need IN AGGREGATE.
 *   details/<b>.json  TIER 3 (lazy per figure-open)  full record + precomputed
 *                  _divinity / _inherited / _traditionMix. Hash-bucketed
 *                  (bucket(id)=(SUM charCodes)%BUCKETS), fetched once, cached.
 *   items/powers/domains.json  TIER 4 (lazy per view)  precomputed aggregates,
 *                  so a view never scans all figures at runtime. powers carries
 *                  both holders (attested) and inheritors (descent).
 *   meta.json      schema/version, counts, BUCKETS, bucket hash.
 *
 * Source of truth stays app/data.js (gen scripts unchanged); this DERIVES the
 * artifacts by running the assembled corpus in node. Deterministic output
 * (sorted ids/keys) -> byte-exact reproducible. Run: node scripts/build-tiers.cjs
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'data');
const BUCKETS = 64;
const SCHEMA = 2;

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

const bucketOf = (id) => { let s = 0; for (let k = 0; k < id.length; k++) s = (s + id.charCodeAt(k)) % BUCKETS; return s; };
const humanize = (s) => String(s == null ? '' : s).replace(/[-_]+/g, ' ').trim();
const sortedObj = (obj) => { const out = {}; for (const k of Object.keys(obj).sort()) out[k] = obj[k]; return out; };

// Compact search blob: names a user might type. Native-term VALUES (not the
// verbose etymology prose, which stays in the detail tier).
function searchBlob(p) {
  const parts = [p.name && p.name.primary, ...((p.name && p.name.alt) || [])];
  const tr = p.name && p.name.transliterations;
  if (tr) for (const k of Object.keys(tr)) { if (k !== 'etymology' && typeof tr[k] === 'string') parts.push(tr[k]); }
  return [...new Set(parts.filter(Boolean).map((s) => String(s)))].join(' | ');
}
const flags = (p) =>
  ((p.relations || []).length ? 1 : 0) | ((p.materialCulture || []).length ? 2 : 0) |
  ((p.domains || []).length ? 4 : 0) | ((p.faculties || []).length ? 8 : 0);

function buildPowers(P, ids, inh) {
  const reg = {};
  const ensure = (id) => reg[id] || (reg[id] = { id, displayName: humanize(id), domainTag: null, holders: [], inheritors: [] });
  for (const id of ids) for (const f of (P[id].faculties || [])) {
    if (!f || !f.id) continue;
    const r = ensure(f.id);
    if (f.name && r.displayName === humanize(f.id)) r.displayName = f.name;
    if (!r.domainTag && f.domainTag) r.domainTag = f.domainTag;
    r.holders.push(id);
  }
  for (const pid of Object.keys(inh || {})) for (const c of (inh[pid] || [])) {
    if (c && c.facultyId) ensure(c.facultyId).inheritors.push(pid);
  }
  return reg;
}
function buildDomains(P, ids) {
  const reg = {};
  for (const id of ids) for (const d of (P[id].domains || [])) {
    if (!d || !d.sphereId) continue;
    (reg[d.sphereId] || (reg[d.sphereId] = { id: d.sphereId, displayName: humanize(d.sphereId), holders: [] })).holders.push(id);
  }
  return reg;
}

function main() {
  const PR = loadCorpus();
  const P = PR.seedPeople;
  const div = PR.divinity || {}, inh = PR.inheritedPowers || {}, mix = PR.traditionMix || {};
  const ids = Object.keys(P).sort();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'details'), { recursive: true });
  const gz = (s) => zlib.gzipSync(Buffer.isBuffer(s) ? s : Buffer.from(s)).length;
  const MB = (x) => (x / 1048576).toFixed(2);
  const write = (f, obj) => { const j = JSON.stringify(obj); fs.writeFileSync(path.join(OUT, f), j); return j.length; };

  // TIER 1 — index
  const index = ids.map((id) => {
    const p = P[id];
    return { i: id, n: (p.name && p.name.primary) || id, s: searchBlob(p), t: p.tradition || '', y: p.type || '', e: (p.temporal && p.temporal.era) || '', f: flags(p) };
  });
  const idxBytes = write('index.json', index);

  // TIER 2 — edges (parentIds + parentRoles + in-corpus relations)
  const edges = {};
  for (const id of ids) {
    const p = P[id];
    const e = {};
    if ((p.parentIds || []).length) { e.p = p.parentIds; if (p.parentRoles) e.pr = p.parentRoles; }
    const r = (p.relations || []).filter((x) => x && x.personId).map((x) => ({ k: x.kind, id: x.personId }));
    if (r.length) e.r = r;
    if (e.p || e.r) edges[id] = e;
  }
  const edgeBytes = write('edges.json', sortedObj(edges));

  // TIER 3 — detail shards (full record + precomputed derived data)
  const buckets = Array.from({ length: BUCKETS }, () => ({}));
  for (const id of ids) {
    const rec = Object.assign({}, P[id]);
    if (div[id] != null) rec._divinity = div[id];
    if (inh[id]) rec._inherited = inh[id];
    if (mix[id]) rec._traditionMix = mix[id];
    buckets[bucketOf(id)][id] = rec;
  }
  let detailBytes = 0;
  buckets.forEach((b, i) => { detailBytes += write(path.join('details', `${i}.json`), sortedObj(b)); });

  // TIER 4 — aggregates
  const items = sortedObj(PR.items || {});
  const powers = sortedObj(buildPowers(P, ids, inh));
  const domains = sortedObj(buildDomains(P, ids));
  const itemBytes = write('items.json', items);
  write('powers.json', powers);
  write('domains.json', domains);

  write('meta.json', {
    schema: SCHEMA, buckets: BUCKETS, bucketHash: 'sum-charcodes-mod-buckets',
    figures: ids.length, items: Object.keys(items).length,
    powers: Object.keys(powers).length, domains: Object.keys(domains).length,
  });

  console.log(`build-tiers: ${ids.length} figures -> dist/data/ (schema ${SCHEMA})`);
  console.log(`  index.json   ${MB(idxBytes)} raw / ${MB(gz(fs.readFileSync(path.join(OUT,'index.json'))))} gz MB  (${(idxBytes/ids.length).toFixed(0)} B/fig — UPFRONT)`);
  console.log(`  edges.json   ${MB(edgeBytes)} raw / ${MB(gz(fs.readFileSync(path.join(OUT,'edges.json'))))} gz MB  (${(edgeBytes/ids.length).toFixed(0)} B/fig — on graph/lineage/detail)`);
  console.log(`  details/     ${BUCKETS} shards, ${MB(detailBytes)} MB total (lazy per open)`);
  console.log(`  items.json   ${MB(itemBytes)} raw / ${MB(gz(fs.readFileSync(path.join(OUT,'items.json'))))} gz MB (lazy per view)`);
}

main();
