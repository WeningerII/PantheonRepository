// Offline tests for the Wikipedia-sitelink lead-image path
// (scripts/lib/wiki-images.cjs). This is the source the pipeline had been
// ignoring entirely: every mapped Wikidata entity links to articles in up to
// ~300 language Wikipedias, each with a curated lead image on Commons.
const { test } = require('node:test');
const assert = require('node:assert');
const wi = require('../scripts/lib/wiki-images.cjs');

test('sitelinksOf keeps Wikipedia articles and drops sister projects', () => {
  const e = { sitelinks: {
    ruwiki: { title: 'Сварог' },
    enwiki: { title: 'Svarog' },
    jawiki: { title: 'スヴァローグ' },
    commonswiki: { title: 'Category:Svarog' },   // not an article
    enwikiquote: { title: 'Svarog' },            // not a Wikipedia
    specieswiki: { title: 'X' },                 // not a Wikipedia
  } };
  assert.deepStrictEqual(wi.sitelinksOf(e), { ru: 'Сварог', en: 'Svarog', ja: 'スヴァローグ' });
  assert.deepStrictEqual(wi.sitelinksOf({}), {});
  assert.deepStrictEqual(wi.sitelinksOf(null), {});
});

test('wikiLangOf maps sitelink keys to wiki codes', () => {
  assert.strictEqual(wi.wikiLangOf('ruwiki'), 'ru');
  assert.strictEqual(wi.wikiLangOf('zh_yuewiki'), 'zh-yue');
  assert.strictEqual(wi.wikiLangOf('commonswiki'), null);
  assert.strictEqual(wi.wikiLangOf('enwikisource'), null);
  assert.strictEqual(wi.wikiLangOf(''), null);
});

test('orderWikis puts the figure’s own culture-language first', () => {
  const links = { en: 'Perkūnas', lt: 'Perkūnas', de: 'Perkunas', ja: 'ペルクーナス' };
  const order = wi.orderWikis(links, ['lt']);
  assert.strictEqual(order[0], 'lt', 'the tradition language must be consulted first');
  assert.ok(order.includes('en') && order.includes('de') && order.includes('ja'));
  assert.strictEqual(new Set(order).size, order.length, 'no duplicates');
  // A preferred language the figure has no article in is simply skipped.
  assert.ok(!wi.orderWikis(links, ['xx']).includes('xx'));
});

// The silent-data-loss bug this path is most exposed to: MediaWiki rewrites
// requested titles (normalization + redirects), so results keyed by the
// RETURNED title never match what was asked for.
test('resolveRequested walks normalization and redirects back to the request', () => {
  const data = { query: {
    normalized: [{ from: 'svarog', to: 'Svarog' }],
    redirects: [{ from: 'Svarog', to: 'Svarog (deity)' }],
  } };
  const back = wi.resolveRequested(data);
  assert.strictEqual(back.get('Svarog (deity)'), 'svarog', 'must chain normalize -> redirect back to the original');
  assert.strictEqual(back.get('Svarog'), 'svarog');
  assert.strictEqual(wi.resolveRequested({}).size, 0);
  assert.strictEqual(wi.resolveRequested(null).size, 0);
});

test('BIG_WIKIS is a broad, deduplicated language sweep', () => {
  assert.ok(wi.BIG_WIKIS.length > 80, 'breadth pass must cover far more than a handful of languages');
  assert.strictEqual(new Set(wi.BIG_WIKIS).size, wi.BIG_WIKIS.length, 'no duplicate wikis');
  // Spot-check that the long tail relevant to this corpus is present.
  for (const l of ['ru', 'ja', 'fa', 'hy', 'ka', 'am', 'te', 'my', 'mi', 'qu', 'nah', 'os']) {
    assert.ok(wi.BIG_WIKIS.includes(l), `${l}wiki should be swept`);
  }
});
