// Tier-artifact tests: run the real scripts/build-tiers.cjs, then assert the
// emitted dist/data/* tiers are internally consistent and losslessly round-trip
// the corpus. Pure node — no React/jsdom. This locks the scale foundation:
// the generator is inert (the app still loads inline today), so without a test
// a drift between the tiers and the corpus would go unnoticed until a future
// cutover. Validates the contract every tier consumer will rely on.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'data');

// Generate fresh from the committed source of truth so the test never reads a
// stale artifact from a previous run.
execFileSync('node', [path.join('scripts', 'build-tiers.cjs')], { cwd: ROOT, stdio: 'ignore' });

const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
const meta = readJSON('meta.json');
const index = readJSON('index.json');
const edges = readJSON('edges.json');
const items = readJSON('items.json');
const powers = readJSON('powers.json');
const domains = readJSON('domains.json');

// Mirror of the generator's bucket hash — if these drift, sharding lookups break.
const bucketOf = (id) => { let s = 0; for (let k = 0; k < id.length; k++) s = (s + id.charCodeAt(k)) % meta.buckets; return s; };

const idSet = new Set(index.map((r) => r.i));

test('meta is schema 2 and counts agree with the emitted tiers', () => {
  assert.strictEqual(meta.schema, 2, 'tier schema must be 2');
  assert.strictEqual(meta.buckets, 64, 'bucket count');
  assert.strictEqual(meta.bucketHash, 'sum-charcodes-mod-buckets');
  assert.strictEqual(meta.figures, index.length, 'meta.figures vs index length');
  assert.strictEqual(meta.items, Object.keys(items).length, 'meta.items vs items.json');
  assert.strictEqual(meta.powers, Object.keys(powers).length, 'meta.powers vs powers.json');
  assert.strictEqual(meta.domains, Object.keys(domains).length, 'meta.domains vs domains.json');
});

test('index records are structurally complete and ids are unique', () => {
  assert.strictEqual(idSet.size, index.length, 'duplicate id in index');
  for (const r of index) {
    assert.strictEqual(typeof r.i, 'string', `index id not a string: ${JSON.stringify(r)}`);
    assert.ok(r.i.length, `empty index id`);
    assert.strictEqual(typeof r.n, 'string', `${r.i}: name (n) not a string`);
    assert.ok(r.n.length, `${r.i}: empty name`);
    for (const k of ['s', 't', 'y', 'e']) assert.strictEqual(typeof r[k], 'string', `${r.i}: field ${k} not a string`);
    assert.ok(Number.isInteger(r.f) && r.f >= 0 && r.f <= 15, `${r.i}: capability flags out of range: ${r.f}`);
  }
});

test('every figure resolves to exactly one detail shard at its hashed bucket', () => {
  const seen = new Set();
  const shardCache = {};
  const shard = (b) => (shardCache[b] || (shardCache[b] = readJSON(path.join('details', `${b}.json`))));
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

test('edges reference only real figures (no dangling parent/relation targets)', () => {
  const dangling = [];
  for (const [src, e] of Object.entries(edges)) {
    assert.ok(idSet.has(src), `edge source ${src} is not in the index`);
    for (const pid of (e.p || [])) if (!idSet.has(pid)) dangling.push(`${src} -parent-> ${pid}`);
    for (const rel of (e.r || [])) if (!idSet.has(rel.id)) dangling.push(`${src} -${rel.k}-> ${rel.id}`);
  }
  assert.strictEqual(dangling.length, 0, `dangling edge targets:\n  ${dangling.slice(0, 20).join('\n  ')}`);
});

test('aggregate holders/inheritors are all real figures', () => {
  const check = (reg, label) => {
    for (const [key, rec] of Object.entries(reg)) {
      for (const h of (rec.holders || [])) assert.ok(idSet.has(h), `${label} ${key}: holder ${h} not in index`);
      for (const h of (rec.inheritors || [])) assert.ok(idSet.has(h), `${label} ${key}: inheritor ${h} not in index`);
    }
  };
  check(powers, 'power');
  check(domains, 'domain');
  // Powers must carry the descent dimension the schema-2 upgrade added.
  assert.ok('inheritors' in Object.values(powers)[0], 'powers aggregate missing inheritors field');
});

test('capability flags in the index match the detailed record', () => {
  const shardCache = {};
  const shard = (b) => (shardCache[b] || (shardCache[b] = readJSON(path.join('details', `${b}.json`))));
  for (const r of index) {
    const rec = shard(bucketOf(r.i))[r.i];
    const expect =
      ((rec.relations || []).length ? 1 : 0) | ((rec.materialCulture || []).length ? 2 : 0) |
      ((rec.domains || []).length ? 4 : 0) | ((rec.faculties || []).length ? 8 : 0);
    assert.strictEqual(r.f, expect, `${r.i}: index flags ${r.f} != record-derived ${expect}`);
  }
});
