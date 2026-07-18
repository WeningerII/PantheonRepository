// Scale gates for the projections migration (see the architecture debate,
// 2026-07): CI-enforced size tripwires + render-parity harnesses. These turn
// "the corpus grew too big" from a mobile crash report into a red build, and
// gate the risky Phase-2 wiring (Graph off the edges tier) behind a parity
// proof instead of a hope.
//
//   BUDGETS (gz, bytes) — when one fires, the pre-agreed response executes
//   (synthesis §4): index > 600KB → columnar browse/search split; skinny
//   registry list > 1MB → alphabetical sharding; detail shard > 150KB →
//   BUCKETS steps up; full registry > 2MB → switch that view to its skinny
//   list + shards (scheduled follow-on). Budgets assert on what exists —
//   Phase-1 artifacts (atlas tier, skinny lists, hashed shards) are covered
//   automatically once meta.json names them.
//
//   PARITY — (a) the edges tier must reconstruct exactly the fields
//   Graph/Lineage/divinity consume from full records (parentIds, parentRoles,
//   relations kind+personId); (b) the adjacency Graph.jsx builds from
//   tier-adapted skinny records must deep-equal the one it builds from the
//   corpus; (c) the static figure pages (the Phase-3 degrade path) must carry
//   every content field the SPA Detail renders, so a shard-fetch failure
//   degrades to a page that is complete, not a stub.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { loadCorpus } = require('../scripts/build-tiers.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'data');
if (!fs.existsSync(path.join(OUT, 'meta.json'))) {
  throw new Error('dist/data missing — run `python3 build.py --pages` first (npm test does this automatically)');
}
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
const gzSize = (f) => zlib.gzipSync(fs.readFileSync(path.join(OUT, f))).length;
const meta = readJSON('meta.json');
const PR = loadCorpus({ quiet: true });
const roundTrip = (x) => JSON.parse(JSON.stringify(x));

const KB = 1024, MB = 1048576;
// The tripwire ladder. Raising a budget is an architecture decision with a
// pre-agreed response — never a casual bump to green a build (synthesis §4).
const BUDGET = {
  index: 600 * KB,          // → columnar browse/search split, search column idle-fetched
  detailShard: 150 * KB,    // → BUCKETS steps up via the deterministic formula
  skinnyList: 1 * MB,       // → alphabetical sharding of that list
  fullRegistry: 2 * MB,     // → switch that view to skinny list + shards
  atlasTier: 1 * MB,        // → split polygons from derived layers
  edges: 1 * MB,            // → shard edges by figure-id bucket
  core: 128 * KB,           // constants only — growth here means a leak into TIER 0
};

test('size tripwires: every upfront and per-view artifact is inside its budget', () => {
  const over = [];
  const check = (file, budget, label) => {
    const gz = gzSize(file);
    if (gz > budget) over.push(`${label} (${file}): ${(gz / KB).toFixed(0)}KB gz > budget ${(budget / KB).toFixed(0)}KB`);
  };
  check(meta.files.index, BUDGET.index, 'index');
  check(meta.files.core, BUDGET.core, 'core');
  check(meta.files.edges, BUDGET.edges, 'edges');
  for (const [k, f] of Object.entries(meta.registry || {})) check(f, BUDGET.fullRegistry, `registry ${k}`);
  // Phase-1 artifacts, covered the moment meta names them.
  if (meta.files.atlas) check(meta.files.atlas, BUDGET.atlasTier, 'atlas tier');
  for (const [k, f] of Object.entries(meta.lists || {})) check(f, BUDGET.skinnyList, `skinny list ${k}`);
  // Detail shards: unhashed legacy layout (details/<b>.json) or the Phase-1
  // content-hashed layout named by a manifest.
  const shardDir = path.join(OUT, 'details');
  if (fs.existsSync(shardDir)) {
    for (const f of fs.readdirSync(shardDir)) check(path.join('details', f), BUDGET.detailShard, `detail shard ${f}`);
  }
  assert.deepStrictEqual(over, [], `size tripwire fired — execute the pre-agreed response for each:\n  ${over.join('\n  ')}`);
});

// ── Graph/Lineage render parity ─────────────────────────────────────────────
// The contract adapter: how the runtime must rehydrate skinny records from the
// edges tier. Phase 2b implements exactly this transform in pr-boot; this
// harness is the specification it is held to (and multifile.test.cjs holds the
// runtime to the same result through a real boot).
const adaptEdges = (skinny, edges) => {
  const out = {};
  for (const id of Object.keys(skinny)) {
    const rec = Object.assign({}, skinny[id]);
    const e = edges[id];
    rec.parentIds = (e && e.p) ? e.p : [];
    if (e && e.pr) rec.parentRoles = e.pr;
    rec.relations = (e && e.r) ? e.r.map((x) => ({ kind: x.k, personId: x.id })) : [];
    out[id] = rec;
  }
  return out;
};

test('edges tier losslessly reconstructs the graph fields of every figure', () => {
  const edges = readJSON(meta.files.edges);
  const P = PR.seedPeople;
  const bad = [];
  for (const id of Object.keys(P)) {
    const p = P[id];
    const e = edges[id] || {};
    const wantParents = p.parentIds || [];
    const wantRels = (p.relations || []).filter((r) => r && r.personId).map((r) => ({ kind: r.kind, personId: r.personId }));
    const gotParents = e.p || [];
    const gotRels = (e.r || []).map((x) => ({ kind: x.k, personId: x.id }));
    try {
      assert.deepStrictEqual(gotParents, roundTrip(wantParents));
      assert.deepStrictEqual(e.pr || null, wantParents.length && p.parentRoles ? roundTrip(p.parentRoles) : null);
      assert.deepStrictEqual(gotRels, roundTrip(wantRels));
    } catch (_) { bad.push(id); }
    // A figure with graph data must not be absent from the tier.
    if ((wantParents.length || wantRels.length) && !edges[id]) bad.push(id + ' (missing)');
  }
  assert.deepStrictEqual(bad.slice(0, 20), [], `${bad.length} figures whose edges-tier graph fields drift from the corpus`);
});

test('Graph adjacency built from tier-adapted records deep-equals the corpus build', () => {
  // Mirror of Graph.jsx buildGraph's link derivation (lines ~44-90): parent
  // links from parentIds, typed links from relations. Node identity = figure
  // id. If this passes over every figure, the rendered graph cannot differ.
  const buildLinks = (people) => {
    const links = [];
    for (const id of Object.keys(people).sort()) {
      const p = people[id];
      for (const pid of (p.parentIds || [])) links.push([pid, id, 'parent']);
      for (const r of (p.relations || [])) if (r && r.personId) links.push([id, r.personId, r.kind]);
    }
    return links;
  };
  const P = PR.seedPeople;
  const edges = readJSON(meta.files.edges);
  // Skinny stand-ins: id-only records, as the index-adapted byId map holds
  // before the corpus lands. The adapter must supply every graph field.
  const skinny = {};
  for (const id of Object.keys(P)) skinny[id] = { id };
  const adapted = adaptEdges(skinny, edges);
  assert.deepStrictEqual(buildLinks(adapted), roundTrip(buildLinks(P)),
    'tier-adapted adjacency differs from corpus adjacency');
});

// ── Static-page ⇄ SPA Detail field-completeness parity ─────────────────────
// The static registry/<id>.html pages become the degrade path when a detail
// shard fails (Phase 3). This holds them complete: every content field the
// SPA Detail renders must be present on the page for every figure. Checked
// structurally (section presence + entry counts), not by pixel.
test('static figure pages carry every Detail content field (degrade-path completeness)', () => {
  const SITE = path.join(ROOT, 'dist', 'site', 'registry');
  if (!fs.existsSync(SITE)) throw new Error('dist/site/registry missing — run `node scripts/build-static.cjs` first');
  const P = PR.seedPeople;
  const ids = Object.keys(P).sort();
  // Deterministic spread sample + the structurally-richest figures (every
  // field populated) — full 5,7xx-page sweep stays a build-tool concern.
  const strideSample = ids.filter((_, i) => i % 97 === 0);
  const rich = ids
    .map((id) => { const p = P[id]; return [id, (p.parentIds || []).length + (p.relations || []).length + (p.epithets || []).length + (p.domains || []).length + (p.faculties || []).length]; })
    .sort((a, b) => b[1] - a[1]).slice(0, 25).map(([id]) => id);
  const sample = [...new Set([...strideSample, ...rich])];
  const bad = [];
  for (const id of sample) {
    const f = path.join(SITE, `${id}.html`);
    if (!fs.existsSync(f)) { bad.push(`${id}: static page missing`); continue; }
    const html = fs.readFileSync(f, 'utf8');
    const p = P[id];
    const expect = [];
    if ((p.parentIds || []).filter(Boolean).length) expect.push('Parentage');
    if ((p.domains || []).map((d) => d.sphereId).filter(Boolean).length) expect.push('Domains');
    if ((p.faculties || []).length) expect.push('Powers');
    if ((p.epithets || []).map((e) => e.original).filter(Boolean).length) expect.push('Epithets');
    if ((p.relations || []).filter((r) => r.personId).length) expect.push('Relations');
    const hasCitations = (p.sources || []).some((s) => (s.citations || []).some((c) => c && c.reference));
    if (hasCitations) expect.push('Sources');
    for (const sec of expect) {
      if (!html.includes(`<h2>${sec}</h2>`)) bad.push(`${id}: static page missing section "${sec}"`);
    }
    // Notes prose must ship (it is the page's substance, and what the SPA shows).
    if (p.notes && !html.includes(String(p.notes).slice(0, 40).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').slice(0, 24))) {
      bad.push(`${id}: notes prose absent from static page`);
    }
  }
  assert.deepStrictEqual(bad, [], `static-page completeness failures (${bad.length}):\n  ${bad.slice(0, 15).join('\n  ')}`);
});
