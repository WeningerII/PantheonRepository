// Offline tests for native-script / native-language search terms
// (scripts/lib/native-names.cjs). The pipeline searched only English
// romanizations while the corpus carried each figure's native form on 97.5% of
// records; these hold the extraction rules that turn that data into queries.
//
// Fixtures are REAL shapes copied from app/data.js (name.transliterations),
// including the messy ones the corpus actually contains: compound
// native+romanization values, parenthetical reading glosses, scholarly
// Egyptological transliteration, and prose etymology notes.
const { test } = require('node:test');
const assert = require('node:assert');
const nn = require('../scripts/lib/native-names.cjs');
const wd = require('../scripts/lib/wikidata.cjs');

const fig = (transliterations, tradition, primary = 'X', alt = []) =>
  ({ name: { primary, alt, transliterations }, tradition });

// ── script detection ────────────────────────────────────────────────────────
test('scriptOf identifies the scripts the corpus actually uses', () => {
  assert.strictEqual(nn.scriptOf('Ἀκεσώ'), 'greek');
  assert.strictEqual(nn.scriptOf('Батраз'), 'cyrillic');
  assert.strictEqual(nn.scriptOf('राम'), 'devanagari');
  assert.strictEqual(nn.scriptOf('河伯'), 'han');
  assert.strictEqual(nn.scriptOf('하백'), 'hangul');
  assert.strictEqual(nn.scriptOf('ハベク'), 'kana');
  assert.strictEqual(nn.scriptOf('اللات'), 'arabic');
  assert.strictEqual(nn.scriptOf('Ⴃ'), 'georgian');
  assert.strictEqual(nn.scriptOf('Perkūnas'), 'latin');
  assert.strictEqual(nn.scriptOf(''), 'latin');
});

// ── prose / name discrimination ─────────────────────────────────────────────
test('isNameLike rejects etymology prose and accepts names', () => {
  assert.ok(nn.isNameLike('Ἀκεσώ'));
  assert.ok(nn.isNameLike('Minamoto no Yoriie'));
  assert.ok(!nn.isNameLike('Greek: from ἄκος ("cure, remedy") — "Cure" personified.'));
  assert.ok(!nn.isNameLike('Old Manipuri: salai (sky, heaven) + len (great)'));
  assert.ok(!nn.isNameLike(''));
});

// ── the compound-value bug the real corpus exposed ──────────────────────────
test('scriptRuns splits a native form packed with its romanization', () => {
  // Real corpus value for Svarog: "Сварогъ Svarogŭ" — as ONE query it matches
  // nothing; each run has to be searched separately.
  const runs = nn.scriptRuns('Сварогъ Svarogŭ');
  assert.deepStrictEqual(runs.map((r) => r.text), ['Сварогъ', 'Svarogŭ']);
  assert.deepStrictEqual(runs.map((r) => r.script), ['cyrillic', 'latin']);
  // A single-script multi-word name stays whole.
  assert.deepStrictEqual(nn.scriptRuns('Minamoto no Yoriie').map((r) => r.text), ['Minamoto no Yoriie']);
});

test('scriptRuns strips parenthetical reading glosses', () => {
  // Real corpus value: "河伯（ハベク）" — the parenthesized katakana is a
  // pronunciation aid, not part of the name.
  assert.deepStrictEqual(nn.scriptRuns('河伯（ハベク）').map((r) => r.text), ['河伯']);
  assert.deepStrictEqual(nn.scriptRuns('Rama (Rāma)').map((r) => r.text), ['Rama']);
});

// ── scholarly transliteration must not be searched as a language ────────────
test('scholarly Egyptological/Assyriological transliteration is excluded', () => {
  assert.ok(nn.isScholarly('mdc-transliteration', 'sꜣt-ı͗mn'));
  assert.ok(nn.isScholarly('anything', 'sꜣt-ı͗mn'));       // by character set
  assert.ok(nn.isScholarly('akkadian', 'Ninsun'));          // by key
  assert.ok(!nn.isScholarly('lithuanian', 'Perkūnas'));     // a real native spelling
  // Sitamun's Egyptological form must produce NO search term.
  const sitamun = fig({ 'mdc-transliteration': 'sꜣt-ı͗mn' }, 'Egyptian', 'Sitamun');
  assert.deepStrictEqual(nn.searchTerms(sitamun), []);
});

// ── end-to-end term extraction on real shapes ───────────────────────────────
test('searchTerms: native script gets its own language', () => {
  const aceso = fig({ greek: 'Ἀκεσώ', etymology: 'Greek: from ἄκος ("cure")' }, 'Greek', 'Aceso');
  assert.deepStrictEqual(nn.searchTerms(aceso), [{ term: 'Ἀκεσώ', lang: 'el', script: 'greek' }]);

  const habaek = fig({ korean: '하백', chinese: '河伯' }, 'Korean', 'Habaek');
  const terms = nn.searchTerms(habaek);
  assert.ok(terms.some((t) => t.term === '하백' && t.lang === 'ko'));
  assert.ok(terms.some((t) => t.term === '河伯' && t.lang === 'zh'));

  const batraz = fig({ ru: 'Батраз' }, 'Ossetian', 'Batraz');
  assert.deepStrictEqual(nn.searchTerms(batraz)[0], { term: 'Батраз', lang: 'ru', script: 'cyrillic' });
});

test('searchTerms: Latin-script native spelling uses the tradition language', () => {
  const perkunas = fig({ lithuanian: 'Perkūnas' }, 'Lithuanian', 'Perkūnas');
  assert.deepStrictEqual(nn.searchTerms(perkunas), [{ term: 'Perkūnas', lang: 'lt', script: 'latin' }]);
});

test('searchTerms: no language for the tradition or key → no term (never guess)', () => {
  const suludnon = fig({ 'kinaray-a': 'Labaw Donggon' }, 'Suludnon', 'Labaw Donggon');
  assert.deepStrictEqual(nn.searchTerms(suludnon), []);
});

test('unsearchable display scripts (cuneiform, hieroglyph, runic) produce no terms', () => {
  assert.deepStrictEqual(nn.searchTerms(fig({ cuneiform: '𒀭𒎏𒄞' }, 'Mesopotamian', 'Ninsun')), []);
  assert.deepStrictEqual(nn.searchTerms(fig({ runic: 'ᚦᚢᚱ' }, 'Norse', 'Thor')), []);
});

test('langForTradition resolves multi-word tradition names token-wise', () => {
  assert.strictEqual(nn.langForTradition('Amhara–Tigrinya highland folk religion'), 'am');
  assert.strictEqual(nn.langForTradition('Jeju Island shamanism'), 'ko');
  assert.strictEqual(nn.langForTradition('Ancient Israelite religion / Yahwism'), 'he');
  assert.strictEqual(nn.langForTradition('Nonexistent People'), null);
});

test('searchTerms is capped so one figure cannot monopolize the API budget', () => {
  const many = fig({ greek: 'Ἀκεσώ', ru: 'Батраз', korean: '하백', chinese: '河伯', hi: 'राम' }, 'Greek');
  assert.ok(nn.searchTerms(many, 2).length <= 2);
});

test('nativeHit finds an exact native form inside a Commons file title', () => {
  const habaek = fig({ korean: '하백', chinese: '河伯' }, 'Korean', 'Habaek');
  assert.ok(nn.nativeHit(habaek, 'File:朝鮮の河伯図.jpg'));
  assert.ok(!nn.nativeHit(habaek, 'File:Han River bridge.jpg'));
  // A Latin-only figure never "native hits" (that is the romanized path's job).
  assert.ok(!nn.nativeHit(fig({ lithuanian: 'Perkūnas' }, 'Lithuanian'), 'File:Perkūnas.jpg'));
});

// ── wikidata integration: native matches count, but stay honest ─────────────
test('matchKind: native-script label matches where normalized romanization cannot', () => {
  const aceso = fig({ greek: 'Ἀκεσώ' }, 'Greek', 'Aceso');
  const names = wd.figureNames(aceso);
  const natives = wd.nativeNameSet(aceso);
  assert.ok(natives.has('Ἀκεσώ'));
  // Greek-labelled entity: normName() would strip it to '' — only the native
  // set can match it.
  assert.strictEqual(wd.matchKind(names, natives, { label: 'Ἀκεσώ', description: 'Greek goddess' }), 'native');
  // Romanized label still matches the Latin way.
  assert.strictEqual(wd.matchKind(names, natives, { label: 'Aceso', description: 'Greek goddess' }), 'latin');
  assert.strictEqual(wd.matchKind(names, natives, { label: 'Unrelated', description: 'a town' }), null);
});

test('matchKind flags sub-3-character native matches as too dense to trust', () => {
  const habaek = fig({ chinese: '河伯' }, 'Korean', 'Habaek');
  const kind = wd.matchKind(wd.figureNames(habaek), wd.nativeNameSet(habaek), { label: '河伯', description: 'water deity' });
  assert.strictEqual(kind, 'native-short', '2-character CJK collides heavily — must not be confident');
});

test('pickQid: a 2-char native-only match never reaches high confidence', () => {
  const habaek = fig({ chinese: '河伯' }, 'Korean', 'Habaek');
  const pick = wd.pickQid(habaek, [{ qid: 'Q1', label: '河伯', description: 'Korean river god', aliases: [] }], false);
  assert.ok(pick);
  assert.strictEqual(pick.confidence, 'ambiguous');
});

test('pickQid: a solid native match can still be confident', () => {
  const batraz = fig({ ru: 'Батраз' }, 'Ossetian', 'Batraz');
  const pick = wd.pickQid(batraz, [{ qid: 'Q2', label: 'Батраз', description: 'Ossetian Nart hero', aliases: [] }], false);
  assert.ok(pick);
  assert.strictEqual(pick.confidence, 'high');
});
