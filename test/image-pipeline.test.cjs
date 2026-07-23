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

test('renderSheet escapes hostile titles and survives an empty queue', () => {
  const html = renderSheet({
    evil: { name: '<script>alert(1)</script>', tradition: 'X', options: [{ title: 'File:</script><script>x.jpg', thumb: 'https://u/x.jpg', license: 'CC0' }] },
  });
  assert.ok(!/<script>alert/.test(html), 'name escaped');
  assert.ok(!/<\/script><script>x\.jpg/.test(html), 'title escaped everywhere (JSON block uses \\u003c)');
  assert.match(renderSheet({}), /Nothing to review/, 'empty state');
});
