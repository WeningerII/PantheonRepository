// Tier-artifact tests: run the real scripts/build-tiers.cjs, then assert the
// emitted dist/data/* tiers are internally consistent and losslessly round-trip
// the corpus. Pure node — no React/jsdom. This locks the scale foundation:
// the generator is inert (the app still loads inline today), so without a test
// a drift between the tiers and the corpus would go unnoticed until a future
// cutover. Schema 4 adds the projections-migration artifacts (atlas tier, content-hashed detail shards + manifest, skinny registry lists) atop the schema-3 multi-file-shell set — corpus-<h>.json (the
// post-pipeline __PR snapshot), core-<h>.js (module-scope constants), hashed
// index/edges filenames recorded in meta.json, full-fidelity power/domain
// registries — so the parity assertions here are the contract the async
// runtime will boot against.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { loadCorpus } = require('../scripts/build-tiers.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'data');

// dist/data is gitignored and built by the `npm test` command itself
// (`python3 build.py --pages`) BEFORE the runner starts: node runs test files
// concurrently, so no test may rewrite the shared tree mid-run — that race
// 404s any sibling test reading dist/data at that moment. Byte-exact
// determinism is still enforced (dist/data is gitignored, so the verify-regen
// git-diff gate never sees it): a second generation lands in a scratch dir
// through the PR_TIERS_OUT seam and must fingerprint identically.
if (!fs.existsSync(path.join(OUT, 'meta.json'))) {
  throw new Error('dist/data missing — run `python3 build.py --pages` first (npm test does this automatically)');
}
const fingerprint = (base) => {
  const map = {};
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const fp = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(fp);
      else map[path.relative(base, fp)] = crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex');
    }
  };
  walk(base);
  return map;
};
const SCRATCH = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pr-tiers-'));
execFileSync('node', [path.join('scripts', 'build-tiers.cjs')], {
  cwd: ROOT, stdio: 'ignore', env: { ...process.env, PR_TIERS_OUT: SCRATCH },
});
const firstRun = fingerprint(OUT);
const secondRun = fingerprint(SCRATCH);
fs.rmSync(SCRATCH, { recursive: true, force: true });

const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
const meta = readJSON('meta.json');
const index = readJSON(meta.files.index);
const edges = readJSON(meta.files.edges);
const corpus = readJSON(meta.files.corpus);
const items = readJSON(meta.registry.items);
const powers = readJSON(meta.registry.powers);
const domains = readJSON(meta.registry.domains);

// The vm-loaded __PR is the parity oracle. vm objects live in a foreign realm
// whose prototypes fail deepStrictEqual's === prototype check — JSON
// round-trip everything vm-born into this realm before comparing (which also
// matches what a fetch+JSON.parse consumer of the artifacts actually sees).
const PR = loadCorpus({ quiet: true });
const roundTrip = (x) => JSON.parse(JSON.stringify(x));

// Mirror of the generator's bucket hash — if these drift, sharding lookups break.
const bucketOf = (id) => { let s = 0; for (let k = 0; k < id.length; k++) s = (s + id.charCodeAt(k)) % meta.buckets; return s; };

const idSet = new Set(index.map((r) => r.i));

test('an independent generator run emits a byte-identical tree', () => {
  assert.ok(Object.keys(firstRun).length > meta.buckets, 'unexpectedly few artifacts');
  assert.deepStrictEqual(secondRun, firstRun, 'artifact bytes changed between runs');
});

test('meta is schema 4, counts agree, and hashed filenames match their bodies', () => {
  assert.strictEqual(meta.schema, 4, 'tier schema must be 4');
  // Buckets are the deterministic scale knob: the next power of two keeping
  // ~100 figures/shard, floored at 64 (5.7k → 64, 30k → 512). Never hand-set.
  let expectBuckets = 64;
  while (expectBuckets * 100 < meta.figures) expectBuckets *= 2;
  assert.strictEqual(meta.buckets, expectBuckets, 'bucket count must follow the deterministic formula');
  assert.strictEqual(meta.bucketHash, 'sum-charcodes-mod-buckets');
  assert.strictEqual(meta.figures, index.length, 'meta.figures vs index length');
  assert.strictEqual(meta.items, Object.keys(items).length, 'meta.items vs items.json');
  assert.strictEqual(meta.powers, Object.keys(powers).length, 'meta.powers vs powers.json');
  assert.strictEqual(meta.domains, Object.keys(domains).length, 'meta.domains vs domains.json');
  const patterns = {
    core: /^core-[0-9a-f]{12}\.js$/, index: /^index-[0-9a-f]{12}\.json$/,
    corpus: /^corpus-[0-9a-f]{12}\.json$/, edges: /^edges-[0-9a-f]{12}\.json$/,
    atlas: /^atlas-[0-9a-f]{12}\.json$/,
  };
  assert.deepStrictEqual(Object.keys(meta.files).sort(), Object.keys(patterns).sort(), 'meta.files key set');
  for (const [k, re] of Object.entries(patterns)) {
    const name = meta.files[k];
    assert.match(name, re, `meta.files.${k}: ${name}`);
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, name))).digest('hex').slice(0, 12);
    assert.ok(name.includes(`-${h}.`), `${name}: embedded hash != content hash ${h}`);
  }
});

test('meta.registry names the three content-hashed per-view tiers', () => {
  const patterns = {
    items: /^items-[0-9a-f]{12}\.json$/,
    powers: /^powers-[0-9a-f]{12}\.json$/,
    domains: /^domains-[0-9a-f]{12}\.json$/,
  };
  assert.deepStrictEqual(Object.keys(meta.registry).sort(), Object.keys(patterns).sort(), 'meta.registry key set');
  for (const [k, re] of Object.entries(patterns)) {
    const name = meta.registry[k];
    assert.match(name, re, `meta.registry.${k}: ${name}`);
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, name))).digest('hex').slice(0, 12);
    assert.ok(name.includes(`-${h}.`), `${name}: embedded hash != content hash ${h}`);
  }
});

test('index records are structurally complete and ids are unique', () => {
  assert.strictEqual(idSet.size, index.length, 'duplicate id in index');
  for (const r of index) {
    assert.strictEqual(typeof r.i, 'string', `index id not a string: ${JSON.stringify(r)}`);
    assert.ok(r.i.length, `empty index id`);
    assert.strictEqual(typeof r.n, 'string', `${r.i}: name (n) not a string`);
    assert.ok(r.n.length, `${r.i}: empty name`);
    for (const k of ['s', 't', 'y', 'e', 'o']) assert.strictEqual(typeof r[k], 'string', `${r.i}: field ${k} not a string`);
    assert.ok(Array.isArray(r.a), `${r.i}: alt names (a) not an array`);
    for (const alt of r.a) assert.ok(alt && typeof alt === 'string', `${r.i}: empty/non-string alt name`);
    if (r.d !== null) {
      assert.ok(Array.isArray(r.d) && r.d.length === 2, `${r.i}: dates (d) not a [start,end] pair`);
      assert.ok(r.d.some((v) => v != null), `${r.i}: date pair with both bounds null`);
      for (const v of r.d) assert.ok(v === null || typeof v === 'number', `${r.i}: non-numeric date bound ${v}`);
    }
    assert.ok(Number.isInteger(r.f) && r.f >= 0 && r.f <= 15, `${r.i}: capability flags out of range: ${r.f}`);
  }
});

test('index d/o/a mirror the vm corpus (dates resolved per-axis, mythic first)', () => {
  for (const r of index) {
    const p = PR.seedPeople[r.i];
    assert.ok(p, `${r.i}: not in vm corpus`);
    assert.strictEqual(r.o, p.origin || '', `${r.i}: origin flag`);
    const alt = (p.name && Array.isArray(p.name.alt)) ? p.name.alt.filter(Boolean) : [];
    assert.deepStrictEqual(r.a, roundTrip(alt), `${r.i}: alt names`);
    const dates = PR.getEntryDates(p) || {};
    const expect = (dates.mythicStart != null || dates.mythicEnd != null)
      ? [dates.mythicStart ?? null, dates.mythicEnd ?? null]
      : (dates.textualStart != null || dates.textualEnd != null)
        ? [dates.textualStart ?? null, dates.textualEnd ?? null]
        : null;
    assert.deepStrictEqual(r.d, expect, `${r.i}: resolved date pair`);
  }
});

test('corpus snapshot deep-equals the vm __PR after a JSON round-trip', () => {
  assert.deepStrictEqual(Object.keys(corpus).sort(),
    ['divinity', 'inheritedPowers', 'items', 'seedAtlas', 'seedPeople', 'traditionMix'], 'corpus key set');
  // Compared key by key so a failure names the drifted layer instead of
  // dumping a 20 MB diff.
  for (const k of Object.keys(corpus)) {
    assert.deepStrictEqual(corpus[k], roundTrip(PR[k]), `corpus.${k} != vm __PR.${k}`);
  }
});

test('core.js is a classic-script IIFE carrying the six module-scope constants', () => {
  const body = fs.readFileSync(path.join(OUT, meta.files.core), 'utf8');
  assert.ok(/;\(function\(\)\{window\.__PR=Object\.assign\(window\.__PR\|\|\{\},/.test(body), 'core.js IIFE shape');
  assert.ok(!/^\s*(import|export)\b/m.test(body), 'core.js must stay a classic script');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(body, ctx, { filename: meta.files.core });
  const got = roundTrip(ctx.window.__PR);
  assert.deepStrictEqual(Object.keys(got).sort(),
    ['ATLAS_KEY', 'ERA_DATES', 'ERA_ORDER', 'PEOPLE_KEY', 'TRADITION_PIGMENTS', 'TYPE_META'], 'core.js key set');
  for (const k of Object.keys(got)) {
    assert.deepStrictEqual(got[k], roundTrip(PR[k]), `core.js ${k} != vm __PR.${k}`);
  }
  // Assign-over semantics: an already-populated __PR (inline data.js ran
  // first) must survive the merge.
  const ctx2 = { window: { __PR: { seedPeople: { probe: 1 } } } };
  vm.createContext(ctx2);
  vm.runInContext(body, ctx2, { filename: meta.files.core });
  assert.strictEqual(ctx2.window.__PR.seedPeople.probe, 1, 'core.js clobbered a pre-existing __PR');
});

// Phase-1 shards are per-bucket content-hashed (details/<b>-<hash12>.json),
// resolved through the meta.details manifest — the fix for the deploy-skew
// window an unhashed shard set has under Pages' fixed max-age=600.
const shardCache = {};
const shard = (b) => (shardCache[b] || (shardCache[b] = readJSON(path.join(meta.details.dir, meta.details.shards[b]))));

test('the detail-shard manifest is complete and every name embeds its content hash', () => {
  assert.strictEqual(meta.details.dir, 'details');
  assert.strictEqual(meta.details.shards.length, meta.buckets, 'manifest length vs bucket count');
  meta.details.shards.forEach((name, b) => {
    assert.match(name, new RegExp(`^${b}-[0-9a-f]{12}\\.json$`), `shard ${b} name: ${name}`);
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, 'details', name))).digest('hex').slice(0, 12);
    assert.ok(name.includes(`-${h}.`), `${name}: embedded hash != content hash ${h}`);
  });
  // No stray files beyond the manifest (a stale shard would resurrect old data).
  const onDisk = fs.readdirSync(path.join(OUT, 'details')).sort();
  assert.deepStrictEqual(onDisk, [...meta.details.shards].sort(), 'details/ contains files the manifest does not name');
});

test('every figure resolves to exactly one detail shard at its hashed bucket', () => {
  const seen = new Set();
  for (const r of index) {
    const b = bucketOf(r.i);
    const rec = shard(b)[r.i];
    assert.ok(rec, `${r.i}: missing from detail shard ${b}`);
    assert.strictEqual(rec.id, r.i, `${r.i}: detail record id mismatch (${rec.id})`);
    assert.ok(!seen.has(r.i), `${r.i}: appears in more than one shard`);
    seen.add(r.i);
  }
  // And no shard carries a figure absent from the index (no orphan detail).
  for (let b = 0; b < meta.buckets; b++) {
    for (const id of Object.keys(shard(b))) {
      assert.ok(idSet.has(id), `detail shard ${b} carries non-index figure ${id}`);
      assert.strictEqual(bucketOf(id), b, `${id} in shard ${b} but hashes to ${bucketOf(id)}`);
    }
  }
  assert.strictEqual(seen.size, index.length, 'detail coverage incomplete');
});

test('the atlas tier carries the corpus derived layers verbatim', () => {
  const atlas = readJSON(meta.files.atlas);
  assert.deepStrictEqual(Object.keys(atlas).sort(),
    ['divinity', 'inheritedPowers', 'seedAtlas', 'traditionMix'], 'atlas tier key set');
  for (const k of Object.keys(atlas)) {
    assert.deepStrictEqual(atlas[k], roundTrip(PR[k]), `atlas.${k} != vm __PR.${k}`);
  }
  // seedAtlas key ORDER is semantic (Atlas iterates it); JSON preserves it.
  assert.deepStrictEqual(Object.keys(atlas.seedAtlas), Object.keys(roundTrip(PR.seedAtlas)), 'seedAtlas key order drifted');
});

test('skinny registry lists agree with the full registries and their shard sets are complete', () => {
  const sortedIds = index.map((r) => r.i);
  for (const [kind, full] of [['powers', powers], ['domains', domains], ['items', items]]) {
    const m = meta.lists[kind];
    const list = readJSON(m.list);
    assert.deepStrictEqual(Object.keys(list).sort(), Object.keys(full).sort(), `${kind}: list id set`);
    const rBucketOf = (id) => { let s = 0; for (let k = 0; k < id.length; k++) s = (s + id.charCodeAt(k)) % m.buckets; return s; };
    // Shard manifest: hashed names, full coverage, records identical to the full registry.
    assert.strictEqual(m.shards.length, m.buckets, `${kind}: shard manifest length`);
    const cache = {};
    const rShard = (b) => (cache[b] || (cache[b] = readJSON(path.join(m.dir, m.shards[b]))));
    for (const [id, rec] of Object.entries(full)) {
      assert.deepStrictEqual(rShard(rBucketOf(id))[id], rec, `${kind}/${id}: shard record != full registry record`);
      const s = list[id];
      // Counts mirror the full record; holder indices decode to its personIds.
      for (const k of ['displayName', 'holderCount', 'figureCount']) {
        assert.deepStrictEqual(s[k], rec[k], `${kind}/${id}: list ${k}`);
      }
      const decode = (arr) => (arr || []).map((i) => sortedIds[i]);
      assert.deepStrictEqual(decode(s.h), (rec.holders || []).map((h) => h.personId), `${kind}/${id}: holder indices`);
      if (kind === 'powers') {
        assert.deepStrictEqual(decode(s.n), (rec.inheritors || []).map((h) => h.personId), `${kind}/${id}: inheritor indices`);
      }
    }
  }
});

test('edges reference only real figures (no dangling parent/relation targets)', () => {
  const dangling = [];
  for (const [src, e] of Object.entries(edges)) {
    assert.ok(idSet.has(src), `edge source ${src} is not in the index`);
    for (const pid of (e.p || [])) if (!idSet.has(pid)) dangling.push(`${src} -parent-> ${pid}`);
    for (const rel of (e.r || [])) if (!idSet.has(rel.id)) dangling.push(`${src} -${rel.k}-> ${rel.id}`);
  }
  assert.strictEqual(dangling.length, 0, `dangling edge targets:\n  ${dangling.slice(0, 20).join('\n  ')}`);
});

test('powers.json carries the full runtime-registry shape with consistent counts', () => {
  assert.ok(Object.keys(powers).length > 0, 'powers registry empty');
  for (const [pid, rec] of Object.entries(powers)) {
    assert.strictEqual(rec.id, pid, `${pid}: id mismatch`);
    assert.ok(rec.displayName && typeof rec.displayName === 'string', `${pid}: displayName`);
    for (const k of ['holders', 'inheritors', 'scopeTags', 'sources']) assert.ok(Array.isArray(rec[k]), `${pid}: ${k} not an array`);
    assert.ok(rec.heritCounts && typeof rec.heritCounts === 'object', `${pid}: heritCounts`);
    const holderIds = new Set();
    for (const h of rec.holders) {
      assert.strictEqual(typeof h.personId, 'string', `${pid}: holder without personId`);
      assert.ok(idSet.has(h.personId), `power ${pid}: holder ${h.personId} not in index`);
      assert.ok(Array.isArray(h.scopeTags) && Array.isArray(h.sources), `${pid}: holder ${h.personId} missing scopeTags/sources`);
      holderIds.add(h.personId);
    }
    for (const h of rec.inheritors) {
      assert.strictEqual(typeof h.personId, 'string', `${pid}: inheritor without personId`);
      assert.ok(idSet.has(h.personId), `power ${pid}: inheritor ${h.personId} not in index`);
    }
    assert.strictEqual(rec.holderCount, holderIds.size, `${pid}: holderCount`);
    assert.strictEqual(rec.inheritorCount, rec.inheritors.length, `${pid}: inheritorCount`);
    assert.strictEqual(rec.figureCount,
      holderIds.size + rec.inheritors.filter((h) => !holderIds.has(h.personId)).length, `${pid}: figureCount`);
    // Consensus inheritability = most-attested heritCounts key, first wins on
    // ties (JSON preserves the registry's insertion order).
    let best = null, bestN = -1;
    for (const k of Object.keys(rec.heritCounts)) if (rec.heritCounts[k] > bestN) { best = k; bestN = rec.heritCounts[k]; }
    assert.strictEqual(rec.inheritability, best, `${pid}: inheritability consensus`);
  }
  // The descent dimension must survive the schema-3 upgrade.
  assert.ok(Object.values(powers).some((r) => r.inheritors.length), 'no power carries inheritors');
});

test('domains.json carries the full runtime-registry shape with consistent counts', () => {
  assert.ok(Object.keys(domains).length > 0, 'domains registry empty');
  for (const [did, rec] of Object.entries(domains)) {
    assert.strictEqual(rec.id, did, `${did}: id mismatch`);
    assert.ok(rec.displayName && typeof rec.displayName === 'string', `${did}: displayName`);
    for (const k of ['holders', 'contextTags', 'sources']) assert.ok(Array.isArray(rec[k]), `${did}: ${k} not an array`);
    const holderIds = new Set();
    for (const h of rec.holders) {
      assert.strictEqual(typeof h.personId, 'string', `${did}: holder without personId`);
      assert.ok(idSet.has(h.personId), `domain ${did}: holder ${h.personId} not in index`);
      assert.ok(Array.isArray(h.sources), `${did}: holder ${h.personId} missing sources`);
      holderIds.add(h.personId);
    }
    assert.strictEqual(rec.holderCount, rec.holders.length, `${did}: holderCount`);
    assert.strictEqual(rec.figureCount, holderIds.size, `${did}: figureCount`);
  }
});

test('capability flags in the index match the detailed record', () => {
  for (const r of index) {
    const rec = shard(bucketOf(r.i))[r.i];
    const expect =
      ((rec.relations || []).length ? 1 : 0) | ((rec.materialCulture || []).length ? 2 : 0) |
      ((rec.domains || []).length ? 4 : 0) | ((rec.faculties || []).length ? 8 : 0);
    assert.strictEqual(r.f, expect, `${r.i}: index flags ${r.f} != record-derived ${expect}`);
  }
});
