#!/usr/bin/env node
/*
 * build-tiers.cjs — derive lazily-loadable data tiers from the assembled corpus.
 *
 * The inline-everything single-file model does not scale past a few thousand
 * figures (50k ~= 315 MB). This emits a tiered static dataset keeping UPFRONT
 * load flat regardless of corpus size. Tiers map to distinct access patterns:
 *
 *   core-<h>.js    TIER 0 (upfront, sync)  classic-script IIFE assigning the
 *                  module-scope constants state.jsx/Lifecycle.jsx read off
 *                  window.__PR before any data arrives: ERA_ORDER, ERA_DATES,
 *                  TRADITION_PIGMENTS, TYPE_META, PEOPLE_KEY, ATLAS_KEY.
 *   index-<h>.json TIER 1 (upfront)  one record/figure: {i,n,s,t,y,e,d,o,a,f}
 *                  = id, name, search-blob (alt names + native term values),
 *                  tradition, type, era, resolved date pair (getEntryDates,
 *                  one axis, mythic first — the pair Browse renders), origin
 *                  flag, alt names (row rendering; s stays the search blob),
 *                  capability-flags (1 rel|2 item|4 dom|8 fac).
 *   edges-<h>.json TIER 2 (on first Graph/Lineage/Detail)  id -> {p:parentIds,
 *                  pr:parentRoles, r:[{k:kind,id:personId}]}. The cross-cutting
 *                  graph that Graph view, the Lineage tree (childrenOf inverts
 *                  parentIds), and the divinity walk all need IN AGGREGATE.
 *   corpus-<h>.json  full post-pipeline __PR snapshot {seedPeople, divinity,
 *                  traditionMix, inheritedPowers, items, seedAtlas} — the
 *                  33-pass pipeline and derived-layer loops run once here
 *                  instead of in every visitor's browser.
 *   details/<b>.json  TIER 3 (lazy per figure-open)  full record + precomputed
 *                  _divinity / _inherited / _traditionMix. Hash-bucketed
 *                  (bucket(id)=(SUM charCodes)%BUCKETS), fetched once, cached.
 *   items/powers/domains.json  TIER 4 (lazy per view)  precomputed aggregates,
 *                  so a view never scans all figures at runtime. powers and
 *                  domains carry the FULL registry shape state.jsx
 *                  buildPowerRegistry/buildDomainRegistry produce.
 *   meta.json      schema/version, counts, BUCKETS, bucket hash, and the exact
 *                  content-hashed filenames — the only cache-busting available
 *                  under GitHub Pages' fixed max-age=600.
 *
 * Source of truth stays app/data.js (gen scripts unchanged); this DERIVES the
 * artifacts by running the assembled corpus in node. Deterministic output
 * (sorted ids/keys except where insertion order is semantic) -> byte-exact
 * reproducible. Run: node scripts/build-tiers.cjs
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const zlib = require('zlib');
const util = require('util');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
// PR_TIERS_OUT redirects the output tree. The test suite runs its files
// concurrently, so no test may rewrite the shared dist/data mid-run; the
// determinism test builds into a scratch dir through this seam instead.
const OUT = process.env.PR_TIERS_OUT
  ? path.resolve(process.env.PR_TIERS_OUT)
  : path.join(ROOT, 'dist', 'data');
const SCHEMA = 4;

// Bucket count is a deterministic function of record count — the scale knob
// nobody hand-tunes (debate synthesis §3/§4). Next power of two that keeps
// ~100 figures per shard, floored at 64: 5.7k figures → 64 (status quo),
// 30k → 512, keeping every shard inside its 150KB-gz budget. Clients never
// assume it: meta.json carries the resolved count and the shard manifest.
const bucketCountFor = (n, per = 100, floor = 64) => {
  let b = floor;
  while (b * per < n) b *= 2;
  return b;
};
// Resolved in main() from the corpus; module scope so bucketOf can close over
// it (tests mirror the hash with meta.buckets, never this variable).
let BUCKETS = 64;

// __PR keys the emitted artifacts must reconstruct for the multi-file runtime.
// A missing key means the data.js contract changed under us — fail the build.
const REQUIRED_PR_KEYS = [
  'ERA_ORDER', 'ERA_DATES', 'TRADITION_PIGMENTS', 'TYPE_META', 'PEOPLE_KEY', 'ATLAS_KEY',
  'getEntryDates', 'seedPeople', 'seedAtlas', 'divinity', 'traditionMix', 'inheritedPowers', 'items',
];

function loadCorpus(opts) {
  const quiet = !!(opts && opts.quiet);
  // data.js's integrity detectors (era inversions, genealogy cycles, dangling
  // refs, divinity drift) report exclusively via console.warn/error; a silent
  // stub console leaves those diagnostics with no CI home. Forward them to the
  // build log, prefixed so they are attributable to the vm run.
  const diag = (stream) => (...args) => stream.write(`[corpus] ${util.format(...args)}\n`);
  const ctx = {
    window: { dispatchEvent: () => true, addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    console: {
      log() {}, info() {},
      warn: quiet ? () => {} : diag(process.stdout),
      error: quiet ? () => {} : diag(process.stderr),
    },
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
const hash12 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

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

// Mirror of state.jsx dedupeSources — same key rule, first occurrence wins.
const dedupeSources = (arr) => {
  const seen = new Set();
  return (arr || []).filter((s) => {
    const k = (s && s.reference) || JSON.stringify(s);
    if (seen.has(k)) return false; seen.add(k); return true;
  });
};

// Full-fidelity mirror of state.jsx buildPowerRegistry: same record shape,
// same rules, field for field — a tier-served Powers view must be
// indistinguishable from the registry the inline app builds from seedPeople.
// Iterate figures in corpus insertion order — NOT the sorted `ids` used for
// sharding. The "first declarer whose displayName still equals humanize(id)
// wins" rule below is order-sensitive, and the live app's power registry
// walks Object.keys(seedPeople) in insertion order. Iterating sorted ids here
// picked a different declarer for 6 powers, writing ungrammatical mid-sentence
// fragments into powers.json that disagreed with what the app shows. Matching
// the runtime's order keeps the artifact and the registry in lockstep.
function buildPowers(P, inh) {
  const reg = {};
  const ensure = (id) => (reg[id] || (reg[id] = {
    id, displayName: humanize(id), domainTag: null, term: null,
    holders: [], inheritors: [], scopeTags: [], sources: [],
    heritCounts: {}, inheritability: null, holderCount: 0, inheritorCount: 0, figureCount: 0,
  }));
  // Declarers — figures whose faculties[] include the power (attested).
  for (const pid of Object.keys(P)) {
    for (const f of (P[pid].faculties || [])) {
      if (!f || !f.id) continue;
      const rec = ensure(f.id);
      rec.holders.push({
        personId: pid, inheritability: f.inheritability || null,
        scopeTags: f.scopeTags || [], sources: f.sources || [],
        notes: f.notes || null, term: f.term || null,
      });
      if (f.name && rec.displayName === humanize(f.id)) rec.displayName = f.name;
      if (!rec.domainTag && f.domainTag) rec.domainTag = f.domainTag;
      if (!rec.term && f.term && f.term.value) rec.term = f.term;
      for (const t of (f.scopeTags || [])) if (!rec.scopeTags.includes(t)) rec.scopeTags.push(t);
      for (const s of (f.sources || [])) rec.sources.push(s);
      if (f.inheritability) rec.heritCounts[f.inheritability] = (rec.heritCounts[f.inheritability] || 0) + 1;
    }
  }
  // Inheritors — descent edges (candidate, not attested) from __PR.inheritedPowers.
  for (const pid of Object.keys(inh || {})) {
    for (const c of (inh[pid] || [])) {
      if (!c || !c.facultyId) continue;
      ensure(c.facultyId).inheritors.push({
        personId: pid, fromAncestorId: c.fromAncestorId, generation: c.generation, level: c.level,
      });
    }
  }
  for (const id of Object.keys(reg)) {
    const rec = reg[id];
    const holderIds = new Set(rec.holders.map((h) => h.personId));
    rec.holderCount = holderIds.size;
    rec.inheritorCount = rec.inheritors.length;
    rec.figureCount = holderIds.size + rec.inheritors.filter((h) => !holderIds.has(h.personId)).length;
    rec.sources = dedupeSources(rec.sources);
    let best = null, bestN = -1;
    for (const k of Object.keys(rec.heritCounts)) if (rec.heritCounts[k] > bestN) { best = k; bestN = rec.heritCounts[k]; }
    rec.inheritability = best;
  }
  return reg;
}

// Full-fidelity mirror of state.jsx buildDomainRegistry. Same insertion-order
// requirement as buildPowers: holder array order must match the runtime's.
function buildDomains(P) {
  const reg = {};
  const ensure = (id) => (reg[id] || (reg[id] = {
    id, displayName: humanize(id), term: null,
    holders: [], contextTags: [], sources: [], holderCount: 0, figureCount: 0,
  }));
  for (const pid of Object.keys(P)) {
    for (const d of (P[pid].domains || [])) {
      if (!d) continue;
      const sid = d.sphereId || d.id;
      if (!sid) continue;
      const rec = ensure(sid);
      rec.holders.push({
        personId: pid, contextTag: d.contextTag || null,
        sources: d.sources || [], notes: d.notes || null, term: d.term || null,
      });
      if (d.contextTag && !rec.contextTags.includes(d.contextTag)) rec.contextTags.push(d.contextTag);
      if (!rec.term && d.term && d.term.value) rec.term = d.term;
      for (const s of (d.sources || [])) rec.sources.push(s);
    }
  }
  for (const id of Object.keys(reg)) {
    const rec = reg[id];
    rec.holderCount = rec.holders.length;
    rec.figureCount = new Set(rec.holders.map((h) => h.personId)).size;
    rec.sources = dedupeSources(rec.sources);
  }
  return reg;
}

function main() {
  const PR = loadCorpus();
  for (const k of REQUIRED_PR_KEYS) {
    if (PR[k] == null) throw new Error(`__PR.${k} missing from app/data.js — cannot emit schema-${SCHEMA} tiers`);
  }
  const P = PR.seedPeople;
  const div = PR.divinity, inh = PR.inheritedPowers, mix = PR.traditionMix;
  const ids = Object.keys(P).sort();
  BUCKETS = bucketCountFor(ids.length);
  // Figure images (PD/CC0 only — docs/image-licensing.md). The manifest is a
  // separate committed source (scripts/ingest-images.cjs writes it), merged
  // ONLY into the detail shards below — NEVER the skinny index, so a portrait
  // per figure cannot touch first-load bytes. Image FILES self-host under
  // assets/images/figures/; this carries just the ~200-byte metadata record.
  const images = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data-sources', 'images.json'), 'utf8')); }
    catch (_) { return {}; }
  })();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'details'), { recursive: true });
  const gz = (s) => zlib.gzipSync(Buffer.isBuffer(s) ? s : Buffer.from(s)).length;
  const MB = (x) => (x / 1048576).toFixed(2);
  const write = (f, body) => { fs.writeFileSync(path.join(OUT, f), body); return Buffer.byteLength(body); };
  const writeJSON = (f, obj) => write(f, JSON.stringify(obj));

  // TIER 1 — index
  const index = ids.map((id) => {
    const p = P[id];
    const dates = PR.getEntryDates(p) || {};
    // One axis, resolved per-AXIS with mythic first — mirrors state.jsx
    // entryDateRange: pairing bounds across axes renders reversed ranges
    // whenever one axis is partial.
    const d = (dates.mythicStart != null || dates.mythicEnd != null)
      ? [dates.mythicStart ?? null, dates.mythicEnd ?? null]
      : (dates.textualStart != null || dates.textualEnd != null)
        ? [dates.textualStart ?? null, dates.textualEnd ?? null]
        : null;
    // x: the FIRST transliterations entry, verbatim [key, value] — Browse
    // rows display transliterations(entry)[0].value as the native-script
    // sub-line, so a skinny record must carry it or the row visibly grows a
    // line when its detail shard hydrates (the projections-era layout-snap
    // bug). Mirrors Object.entries order exactly; nothing else of the
    // transliterations map is row-visible (search uses the s blob).
    const tr = p.name && p.name.transliterations;
    const x = (tr && typeof tr === 'object' && Object.keys(tr).length)
      ? (([k, v]) => (typeof v === 'string' ? [k, v] : null))(Object.entries(tr)[0])
      : null;
    return {
      i: id, n: (p.name && p.name.primary) || id, s: searchBlob(p),
      t: p.tradition || '', y: p.type || '', e: (p.temporal && p.temporal.era) || '',
      d, o: p.origin || '',
      a: (p.name && Array.isArray(p.name.alt)) ? p.name.alt.filter(Boolean) : [],
      ...(x ? { x } : {}),
      f: flags(p),
    };
  });
  const indexBody = JSON.stringify(index);

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
  const edgesBody = JSON.stringify(sortedObj(edges));

  // TIER 3 — detail shards (full record + precomputed derived data), PER-
  // BUCKET content-hashed: details/<bucket>-<hash12>.json. A weekly authoring
  // batch renames only the shards whose figures actually changed, so untouched
  // buckets keep their URLs (and any HTTP cache) across deploys — and the
  // hashed name closes the deploy-skew window an unhashed shard set has under
  // Pages' fixed max-age=600. The bucket→filename manifest travels in
  // meta.details AND is pinned into the shell at build time (same pattern as
  // __PR_DATA / __PR_REGISTRY_DATA), so resolution never races a deploy.
  const buckets = Array.from({ length: BUCKETS }, () => ({}));
  for (const id of ids) {
    const rec = Object.assign({}, P[id]);
    if (div[id] != null) rec._divinity = div[id];
    if (inh[id]) rec._inherited = inh[id];
    if (mix[id]) rec._traditionMix = mix[id];
    if (images[id]) rec.image = images[id]; // PD/CC0 lead portrait — shard-only
    buckets[bucketOf(id)][id] = rec;
  }
  let detailBytes = 0;
  const detailShards = buckets.map((b, i) => {
    const body = JSON.stringify(sortedObj(b));
    const name = `${i}-${hash12(body)}.json`;
    detailBytes += write(path.join('details', name), body);
    return name;
  });

  // TIER 4 — aggregates (per-view registries, fetched lazily when the Items /
  // Powers / Domains view is opened — NOT gated on the 20 MB corpus). These are
  // the exact runtime-registry shapes state.jsx builds from seedPeople, so the
  // views render from them the way Browse renders from the skinny index. Hashed
  // like the other tiers (the only cache-bust under Pages' fixed max-age=600).
  const items = sortedObj(PR.items);
  const powers = sortedObj(buildPowers(P, inh));
  const domains = sortedObj(buildDomains(P));
  const itemsBody = JSON.stringify(items);
  const powersBody = JSON.stringify(powers);
  const domainsBody = JSON.stringify(domains);

  // TIER 4b — SKINNY registry lists + hash-bucketed registry shards (Phase 1
  // dual emission; unconsumed until the full-registry budget tripwire fires
  // and the views switch — debate synthesis §3 Phase 1 / §4). The list carries
  // what the view's LIST rendering needs — display fields and counts, with
  // holder/inheritor personIds compressed to integer indices into the sorted
  // figure-id order the index tier fixes. The heavy per-holder records
  // (sources, notes, terms) live in per-registry shards fetched when a single
  // power/domain/item is opened. Same content-hash discipline as details/.
  const figIdx = new Map(ids.map((id, i) => [id, i]));
  const toIdx = (arr, key) => (arr || []).map((h) => figIdx.get(key ? h[key] : h)).filter((x) => x !== undefined);
  const skinnyPower = (r) => ({
    id: r.id, displayName: r.displayName, domainTag: r.domainTag, term: r.term,
    scopeTags: r.scopeTags, inheritability: r.inheritability,
    holderCount: r.holderCount, inheritorCount: r.inheritorCount, figureCount: r.figureCount,
    h: toIdx(r.holders, 'personId'), n: toIdx(r.inheritors, 'personId'),
  });
  const skinnyDomain = (r) => ({
    id: r.id, displayName: r.displayName, term: r.term, contextTags: r.contextTags,
    holderCount: r.holderCount, figureCount: r.figureCount, h: toIdx(r.holders, 'personId'),
  });
  const skinnyItem = (r) => ({
    id: r.id, classId: r.classId, kind: r.kind, displayName: r.displayName,
    names: r.names, location: r.location || null,
    holderCount: r.holderCount, custodyCount: r.custodyCount, h: toIdx(r.holders, 'personId'),
  });
  const emitRegistryShards = (kind, reg, skinny) => {
    const regIds = Object.keys(reg);
    const rb = bucketCountFor(regIds.length, 100, 16);
    const rBucketOf = (id) => { let s = 0; for (let k = 0; k < id.length; k++) s = (s + id.charCodeAt(k)) % rb; return s; };
    const shardsObj = Array.from({ length: rb }, () => ({}));
    for (const id of regIds) shardsObj[rBucketOf(id)][id] = reg[id];
    fs.mkdirSync(path.join(OUT, kind), { recursive: true });
    let bytes = 0;
    const shards = shardsObj.map((b, i) => {
      const body = JSON.stringify(sortedObj(b));
      const name = `${i}-${hash12(body)}.json`;
      bytes += write(path.join(kind, name), body);
      return name;
    });
    const listObj = {};
    for (const id of regIds) listObj[id] = skinny(reg[id]);
    const listBody = JSON.stringify(listObj);
    const listName = `${kind}-list-${hash12(listBody)}.json`;
    bytes += write(listName, listBody);
    return { list: listName, buckets: rb, bucketHash: 'sum-charcodes-mod-buckets', shards, bytes, listBody };
  };
  const lists = {
    powers: emitRegistryShards('powers', powers, skinnyPower),
    domains: emitRegistryShards('domains', domains, skinnyDomain),
    items: emitRegistryShards('items', items, skinnyItem),
  };

  // TIER 5 — the atlas/derived tier: everything the corpus snapshot carries
  // beyond seedPeople and items. Unblocks the Atlas view (seedAtlas polygons)
  // and the divinity/inheritance/mix lookups without a single figure record.
  // Key order matches the corpus emission rules: seedAtlas and inheritedPowers
  // keep vm insertion order (semantic — Atlas iterates seedAtlas keys),
  // divinity/traditionMix sorted for stable diffs.
  const atlasTier = {
    seedAtlas: PR.seedAtlas, divinity: sortedObj(div),
    traditionMix: sortedObj(mix), inheritedPowers: inh,
  };
  const atlasBody = JSON.stringify(atlasTier);

  // Post-pipeline snapshot. seedPeople and inheritedPowers keep vm insertion
  // order — it is semantic: the runtime registries (state.jsx
  // buildPowerRegistry/buildDomainRegistry) walk Object.keys in insertion
  // order, so the first-declarer displayName rule and holder/inheritor array
  // order must not change when the app is served from this snapshot instead
  // of data.js. seedAtlas likewise (Atlas iterates its keys; the pr-boot
  // ATLAS_KEY write must match the inline one). divinity/traditionMix/items
  // are pure id-keyed lookups — sorted for stable diffs.
  const corpus = {
    seedPeople: P, divinity: sortedObj(div), traditionMix: sortedObj(mix),
    inheritedPowers: inh, items, seedAtlas: PR.seedAtlas,
  };
  const corpusBody = JSON.stringify(corpus);

  // TIER 0 — the module-scope constants state.jsx and Lifecycle.jsx read off
  // __PR at script-evaluation time. Classic-script IIFE (state.jsx re-declares
  // PEOPLE_KEY/ATLAS_KEY at top level; a bare const collides). U+2028/2029 are
  // valid in JSON strings but not in pre-ES2019 JS literals — escape them.
  const coreConsts = {
    ERA_ORDER: PR.ERA_ORDER, ERA_DATES: PR.ERA_DATES,
    TRADITION_PIGMENTS: PR.TRADITION_PIGMENTS, TYPE_META: PR.TYPE_META,
    PEOPLE_KEY: PR.PEOPLE_KEY, ATLAS_KEY: PR.ATLAS_KEY,
  };
  const coreJSON = JSON.stringify(coreConsts).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const coreBody = '/* generated by scripts/build-tiers.cjs — module-scope __PR constants for the multi-file shell. Do not hand-edit. */\n' +
    `;(function(){window.__PR=Object.assign(window.__PR||{},${coreJSON});})();\n`;

  const files = {
    core: `core-${hash12(coreBody)}.js`,
    index: `index-${hash12(indexBody)}.json`,
    corpus: `corpus-${hash12(corpusBody)}.json`,
    edges: `edges-${hash12(edgesBody)}.json`,
    atlas: `atlas-${hash12(atlasBody)}.json`,
  };
  // The per-view registries are content-hashed and recorded under meta.registry
  // (kept separate from meta.files, which pins the upfront/core tiers). pr-boot
  // fetches these on the first Items/Powers/Domains navigation.
  const registry = {
    items: `items-${hash12(itemsBody)}.json`,
    powers: `powers-${hash12(powersBody)}.json`,
    domains: `domains-${hash12(domainsBody)}.json`,
  };
  const coreBytes = write(files.core, coreBody);
  const idxBytes = write(files.index, indexBody);
  const corpusBytes = write(files.corpus, corpusBody);
  const edgeBytes = write(files.edges, edgesBody);
  const atlasBytes = write(files.atlas, atlasBody);
  const itemBytes = write(registry.items, itemsBody);
  const powerBytes = write(registry.powers, powersBody);
  const domainBytes = write(registry.domains, domainsBody);

  writeJSON('meta.json', {
    schema: SCHEMA, buckets: BUCKETS, bucketHash: 'sum-charcodes-mod-buckets',
    figures: ids.length, items: Object.keys(items).length,
    powers: Object.keys(powers).length, domains: Object.keys(domains).length,
    files, registry,
    details: { dir: 'details', shards: detailShards },
    lists: {
      powers: { list: lists.powers.list, dir: 'powers', buckets: lists.powers.buckets, bucketHash: lists.powers.bucketHash, shards: lists.powers.shards },
      domains: { list: lists.domains.list, dir: 'domains', buckets: lists.domains.buckets, bucketHash: lists.domains.bucketHash, shards: lists.domains.shards },
      items: { list: lists.items.list, dir: 'items', buckets: lists.items.buckets, bucketHash: lists.items.bucketHash, shards: lists.items.shards },
    },
  });

  console.log(`build-tiers: ${ids.length} figures -> dist/data/ (schema ${SCHEMA})`);
  console.log(`  ${files.core}   ${MB(coreBytes)} raw / ${MB(gz(coreBody))} gz MB  (constants — UPFRONT sync)`);
  console.log(`  ${files.index}   ${MB(idxBytes)} raw / ${MB(gz(indexBody))} gz MB  (${(idxBytes / ids.length).toFixed(0)} B/fig — UPFRONT)`);
  console.log(`  ${files.edges}   ${MB(edgeBytes)} raw / ${MB(gz(edgesBody))} gz MB  (on graph/lineage/detail)`);
  console.log(`  ${files.atlas}   ${MB(atlasBytes)} raw / ${MB(gz(atlasBody))} gz MB  (atlas + derived layers)`);
  console.log(`  ${files.corpus}   ${MB(corpusBytes)} raw / ${MB(gz(corpusBody))} gz MB  (full snapshot — async)`);
  console.log(`  details/     ${BUCKETS} content-hashed shards, ${MB(detailBytes)} MB total (lazy per open)`);
  console.log(`  ${registry.items}   ${MB(itemBytes)} raw / ${MB(gz(itemsBody))} gz MB (lazy per view)`);
  console.log(`  ${registry.powers}   ${MB(powerBytes)} raw / ${MB(gz(powersBody))} gz MB (lazy per view)`);
  console.log(`  ${registry.domains}   ${MB(domainBytes)} raw / ${MB(gz(domainsBody))} gz MB (lazy per view)`);
  for (const k of Object.keys(lists)) {
    console.log(`  ${lists[k].list}   ${MB(Buffer.byteLength(lists[k].listBody))} raw / ${MB(gz(lists[k].listBody))} gz MB + ${lists[k].shards.length} ${k}/ shards (skinny list — dual emission)`);
  }
}

if (require.main === module) main();

// The tier tests reuse the vm harness for corpus-parity assertions.
module.exports = { loadCorpus };
