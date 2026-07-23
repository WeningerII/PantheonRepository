// Unit tests for the image pipeline's PURE decision logic
// (docs/image-pipeline.md): Wikidata entity picking, the Tier-A file sanity
// gate, and the contact-sheet renderer. Everything here runs offline — the
// network halves (wbsearchentities/wbgetentities/Commons) only run in CI, so
// these decisions being testable without network is the point of the split.
// Deliberately corpus-free: no loadCorpus, no jsdom — this file must stay
// light enough to never matter to the suite's memory ceiling.
const { test } = require('node:test');
const assert = require('node:assert');
const wd = require('../scripts/lib/wikidata.cjs');
const { sanityCheck } = require('../scripts/lib/sanity-check.cjs');
const { renderSheet } = require('../scripts/lib/contact-sheet.cjs');
const { hashBucket, parseShard, inShard, foldShards } = require('../scripts/ingest-images.cjs');

const fig = (id, primary, tradition, alt = []) => ({ id, tradition, name: { primary, alt } });
const cand = (qid, label, description, aliases = []) => ({ qid, label, description, aliases, matchText: label });

// ── name normalization + matching ───────────────────────────────────────────

test('normName strips diacritics, case, and punctuation', () => {
  assert.strictEqual(wd.normName('Mjǫllnir'), 'mjollnir');
  assert.strictEqual(wd.normName('Hēraklês'), 'herakles');
  assert.strictEqual(wd.normName("A'amo"), 'a amo');
  assert.strictEqual(wd.normName('  Zeus  '), 'zeus');
});

test('nameMatches accepts label, alias, and diacritic-variant forms', () => {
  const names = wd.figureNames(fig('norse_thor', 'Þórr', 'Norse', ['Thor']));
  assert.ok(wd.nameMatches(names, cand('Q42952', 'Thor', 'thunder god in Norse mythology')));
  assert.ok(!wd.nameMatches(names, cand('Q1', 'Thorium', 'chemical element')));
});

// ── pickQid: the confidence rules ───────────────────────────────────────────

test('pickQid: unique myth-description exact-name match → high confidence', () => {
  const pick = wd.pickQid(fig('greek_hesiod_zeus', 'Zeus', 'Greek'), [
    cand('Q34201', 'Zeus', 'sky and thunder god in ancient Greek mythology'),
    cand('Q220', 'Zeus', '2006 film'),
  ], false);
  assert.strictEqual(pick.qid, 'Q34201');
  assert.strictEqual(pick.confidence, 'high');
});

test('pickQid: wrong-kind entities (film, genus, asteroid) are filtered out', () => {
  // Iris: goddess vs plant genus vs asteroid — only the goddess survives.
  const pick = wd.pickQid(fig('greek_iris', 'Iris', 'Greek'), [
    cand('Q158', 'Iris', 'genus of plants'),
    cand('Q3708', 'Iris', 'asteroid in the main belt'),
    cand('Q159416', 'Iris', 'Greek goddess of the rainbow'),
  ], false);
  assert.strictEqual(pick.qid, 'Q159416');
  assert.strictEqual(pick.confidence, 'high');
});

test('pickQid: an intra-corpus name collision is never confident', () => {
  const pick = wd.pickQid(fig('buddhist_mara', 'Mara', 'Buddhist'), [
    cand('Q179088', 'Mara', 'demon in Buddhist mythology'),
  ], true /* Mara also exists under other traditions in the corpus */);
  assert.strictEqual(pick.confidence, 'ambiguous');
  assert.match(pick.reason, /multiple traditions/);
});

test('pickQid: multiple myth-flavored candidates → ambiguous, first suggested', () => {
  const pick = wd.pickQid(fig('x_tara', 'Tara', 'Hindu'), [
    cand('Q1', 'Tara', 'Hindu goddess'),
    cand('Q2', 'Tara', 'Buddhist deity'),
  ], false);
  assert.strictEqual(pick.confidence, 'ambiguous');
  assert.strictEqual(pick.qid, 'Q1');
});

test('pickQid: short names are never confident; no candidates → null', () => {
  const short = wd.pickQid(fig('egyptian_set', 'Set', 'Egyptian'), [
    cand('Q133343', 'Set', 'ancient Egyptian god of the desert'),
  ], false);
  assert.strictEqual(short.confidence, 'ambiguous', 'a 3-letter name must go to review');
  assert.strictEqual(wd.pickQid(fig('a', 'Nobody', 'X'), [], false), null);
});

test('pickQid: no myth-flavored description → ambiguous, flagged as such', () => {
  const pick = wd.pickQid(fig('x_y', 'Ambiguon', 'X'), [
    cand('Q9', 'Ambiguon', 'topic of unclear notability'),
  ], false);
  assert.strictEqual(pick.confidence, 'ambiguous');
  assert.match(pick.reason, /no myth-flavored/);
});

// ── corpus collision detection ──────────────────────────────────────────────

test('corpusCollisions: same name under two traditions is flagged; unique names are not', () => {
  const set = wd.corpusCollisions([
    fig('turkic_al', 'Al', 'Kazakh'), fig('tajik_al', 'Al', 'Tajik'),
    fig('greek_hesiod_zeus', 'Zeus', 'Greek'),
  ]);
  assert.ok(set.has('al'));
  assert.ok(!set.has('zeus'));
});

// ── entity extractors ───────────────────────────────────────────────────────

test('p18Of / p31Of read wbgetentities claim shapes', () => {
  const entity = {
    claims: {
      P18: [{ mainsnak: { datavalue: { value: 'Zeus Otricoli.jpg' } } }],
      P31: [{ mainsnak: { datavalue: { value: { id: 'Q22989102' } } } }],
    },
  };
  assert.strictEqual(wd.p18Of(entity), 'Zeus Otricoli.jpg');
  assert.deepStrictEqual(wd.p31Of(entity), ['Q22989102']);
  assert.strictEqual(wd.p18Of({}), null);
  assert.deepStrictEqual(wd.p31Of(undefined), []);
});

// ── Tier-A sanity check ─────────────────────────────────────────────────────

test('sanityCheck passes a portrait-shaped raster (the Artemision Bronze case)', () => {
  const v = sanityCheck({ title: 'File:Bronze Zeus or Poseidon NAMA X 15161 Athens Greece.jpg', mime: 'image/jpeg', width: 3648, height: 3648 });
  assert.ok(v.pass, v.reasons.join('; '));
});

test('sanityCheck rejects scenery, glyphs, vectors, panoramas, and thumbnails', () => {
  assert.ok(!sanityCheck({ title: 'File:Temple of Olympian Zeus ruins.jpg', mime: 'image/jpeg', width: 800, height: 600 }).pass, 'scenery');
  assert.ok(!sanityCheck({ title: 'File:Jupiter symbol.svg', mime: 'image/svg+xml', width: 512, height: 512 }).pass, 'symbol svg');
  assert.ok(!sanityCheck({ title: 'File:Zeus painting.svg', mime: 'image/svg+xml' }).pass, 'any vector');
  assert.ok(!sanityCheck({ title: 'File:Athens skyline panorama.jpg', mime: 'image/jpeg', width: 6000, height: 1200 }).pass, 'panorama');
  assert.ok(!sanityCheck({ title: 'File:Odin.jpg', mime: 'image/jpeg', width: 120, height: 160 }).pass, 'too small');
});

// ── contact sheet ───────────────────────────────────────────────────────────

const REVIEW_FIXTURE = {
  greek_iris: {
    name: 'Iris', tradition: 'Greek', qid: 'Q159416', via: 'p180',
    options: [
      { title: 'File:Iris1.jpg', thumb: 'https://upload.wikimedia.org/x/Iris1.jpg', license: 'Public domain', author: 'A', score: 7, w: 600, h: 800 },
      { title: 'File:Iris2.jpg', thumb: 'https://upload.wikimedia.org/x/Iris2.jpg', license: 'CC0', author: null, score: 5, w: 640, h: 640 },
    ],
    at: '2026-07-23T00:00:00Z',
  },
};

test('renderSheet renders a card per figure with keyboard + export machinery', () => {
  const html = renderSheet(REVIEW_FIXTURE);
  assert.match(html, /card-greek_iris/, 'card per figure');
  assert.match(html, /Iris1\.jpg/, 'options rendered');
  assert.match(html, /image-approved\.json/, 'export instructions present');
  assert.match(html, /sheet-data/, 'embedded data block');
  assert.match(html, /keydown/, 'keyboard handler present');
  assert.match(html, /1<\/b> · Public domain/, 'license shown per option');
});

// ── parallel sharding + collector merge ─────────────────────────────────────

test('hashBucket is deterministic and every id lands in exactly one of n buckets', () => {
  const ids = ['greek_hesiod_zeus', 'norse_thor', 'egyptian_ra', 'hindu_shiva', 'a', 'b', 'c', 'd'];
  for (const n of [1, 4, 12]) {
    for (const id of ids) {
      const b = hashBucket(id, n);
      assert.ok(b >= 0 && b < n, `${id} bucket ${b} out of range for n=${n}`);
      assert.strictEqual(hashBucket(id, n), b, 'deterministic');
      assert.ok(inShard(id, parseShard({ shard: `${b}/${n}` })), 'inShard agrees with its own bucket');
      // and NOT in any other bucket
      for (let j = 0; j < n; j++) if (j !== b) assert.ok(!inShard(id, parseShard({ shard: `${j}/${n}` })));
    }
  }
});

test('parseShard validates form and range', () => {
  assert.deepStrictEqual(parseShard({ shard: '2/5' }), { i: 2, n: 5 });
  assert.strictEqual(parseShard({}), null);
  assert.throws(() => parseShard({ shard: '5/5' }), /out of range/);
  assert.throws(() => parseShard({ shard: 'x' }), /must be i\/n/);
});

test('foldShards: additions + updates + deletions across shards are correct', () => {
  const N = 4;
  // Build a baseline keyed by ids whose buckets we know; then simulate two
  // shards running (their buckets), each authoritative for its own ids.
  const idsByBucket = {};
  for (const id of ['greek_hesiod_zeus', 'norse_thor', 'hindu_shiva', 'japanese_amaterasu', 'egyptian_ra', 'x', 'y', 'z', 'w', 'q']) {
    (idsByBucket[hashBucket(id, N)] ||= []).push(id);
  }
  const buckets = Object.keys(idsByBucket).map(Number);
  assert.ok(buckets.length >= 2, 'need at least two occupied buckets for this test');
  const [bA, bB] = buckets;
  const someA = idsByBucket[bA][0];
  const untouched = idsByBucket[buckets.length > 2 ? buckets[2] : bA];

  const baseline = {};
  for (const b of buckets) for (const id of idsByBucket[b]) baseline[id] = { v: 'old', bucket: b };

  // Shard bA ran: it UPDATES someA and DROPS every other id in its bucket
  // (simulating a blocklist prune / cleared scan). Shard bB ran: unchanged.
  const shardA = { [someA]: { v: 'new' } };
  const shardB = {}; for (const id of idsByBucket[bB]) shardB[id] = baseline[id];

  const merged = foldShards(baseline, [{ n: bA, data: shardA }, { n: bB, data: shardB }], N);

  assert.deepStrictEqual(merged[someA], { v: 'new' }, 'update applied');
  for (const id of idsByBucket[bA]) if (id !== someA) assert.ok(!(id in merged), `${id} dropped by its authoritative shard`);
  for (const id of idsByBucket[bB]) assert.deepStrictEqual(merged[id], baseline[id], 'bB entries preserved');
  // A bucket whose shard did NOT run keeps its baseline (retried next sweep).
  if (buckets.length > 2) for (const id of untouched) assert.deepStrictEqual(merged[id], baseline[id], 'un-run bucket keeps baseline');
});

test('foldShards is order-independent (disjoint buckets)', () => {
  const N = 4;
  const a = { greek_hesiod_zeus: { v: 1 } }; // bucket 3
  const b = { japanese_amaterasu: { v: 2 } }; // bucket 1
  const m1 = foldShards({}, [{ n: hashBucket('greek_hesiod_zeus', N), data: a }, { n: hashBucket('japanese_amaterasu', N), data: b }], N);
  const m2 = foldShards({}, [{ n: hashBucket('japanese_amaterasu', N), data: b }, { n: hashBucket('greek_hesiod_zeus', N), data: a }], N);
  assert.deepStrictEqual(m1, m2);
  assert.deepStrictEqual(m1, { greek_hesiod_zeus: { v: 1 }, japanese_amaterasu: { v: 2 } });
});

test('renderSheet honors an explicit priority order', () => {
  const review = {
    zzz_low: { name: 'Zzz', tradition: 'X', options: [{ title: 'File:z.jpg', thumb: 'https://u/z.jpg', license: 'CC0' }] },
    aaa_high: { name: 'Aaa', tradition: 'X', options: [{ title: 'File:a.jpg', thumb: 'https://u/a.jpg', license: 'CC0' }] },
  };
  const html = renderSheet(review, ['zzz_low', 'aaa_high']); // low-id FIRST despite alphabetical
  assert.ok(html.indexOf('card-zzz_low') < html.indexOf('card-aaa_high'), 'explicit order wins over alphabetical');
  // Unknown ids in the order are skipped; missing entries not invented.
  const html2 = renderSheet(review, ['nope', 'aaa_high']);
  assert.ok(!html2.includes('card-nope'));
  assert.ok(html2.includes('card-aaa_high'));
});

test('renderSheet escapes hostile titles and survives an empty queue', () => {
  const html = renderSheet({
    evil: { name: '<script>alert(1)</script>', tradition: 'X', options: [{ title: 'File:</script><script>x.jpg', thumb: 'https://u/x.jpg', license: 'CC0' }] },
  });
  assert.ok(!/<script>alert/.test(html), 'name escaped');
  assert.ok(!/<\/script><script>x\.jpg/.test(html), 'title escaped everywhere (JSON block uses \\u003c)');
  assert.match(renderSheet({}), /Nothing to review/, 'empty state');
});
