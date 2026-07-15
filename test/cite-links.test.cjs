// Unit tests for the citation-link resolver (app/cite-links.js). Pure, so we
// require() it directly — the same module the browser inlines as window.PRCite
// and the static build require()s. Verifies deep links resolve to the verified
// hosts, best-effort refs fall to search URLs, and non-citations return null.
const { test } = require('node:test');
const assert = require('node:assert');
const PRCite = require('../app/cite-links.js');

test('exposes citeUrl + citeSegments', () => {
  assert.strictEqual(typeof PRCite.citeUrl, 'function');
  assert.strictEqual(typeof PRCite.citeSegments, 'function');
});

test('classical primary sources deep-link to Theoi (verified scheme)', () => {
  assert.match(PRCite.citeUrl('Apollod. 2.4.1'), /theoi\.com\/Text\/Apollodorus2\.html$/);
  assert.match(PRCite.citeUrl('Hom. Il. 14.319-320'), /theoi\.com\/Text\/HomerIliad14\.html$/);
  assert.match(PRCite.citeUrl('Ov. Met. 4.663-803'), /theoi\.com\/Text\/OvidMetamorphoses4\.html$/);
  // item-numbered works land on the verified landing page, never a per-item file
  assert.match(PRCite.citeUrl('Hyg. Fab. 200'), /theoi\.com\/Text\/HyginusFabulae1\.html$/);
  // Apollodorus Epitome
  assert.match(PRCite.citeUrl('Apollod. Epitome 3.17'), /theoi\.com\/Text\/ApollodorusE\.html$/);
});

test('book numbers out of a work\'s range fall back to the landing page', () => {
  // Apollonius Argonautica has 4 books; a bad "book 9" must not 404.
  assert.match(PRCite.citeUrl('Ap. Rhod. 9.1'), /ApolloniusRhodius1\.html$/);
});

test('classical authors not on Theoi resolve to a Wikipedia search (cannot 404)', () => {
  assert.match(PRCite.citeUrl('Paus. 2.16.3'), /en\.wikipedia\.org\/wiki\/Special:Search\?search=/);
  assert.match(PRCite.citeUrl('Pind. Pyth. 12'), /en\.wikipedia\.org\/wiki\/Special:Search\?search=/);
});

test('scripture & canonical texts deep-link to their verified homes', () => {
  assert.match(PRCite.citeUrl('Rigveda 10.14'), /sacred-texts\.com\/hin\/rigveda\/$/);
  assert.match(PRCite.citeUrl('Poetic Edda, Voluspa 21'), /sacred-texts\.com\/neu\/poe\/$/);
  assert.match(PRCite.citeUrl('Enuma Elish tablet IV'), /sacred-texts\.com\/ane\/enuma\.htm$/);
  assert.match(PRCite.citeUrl('John 3:16'), /biblegateway\.com\/passage\/\?search=John/);
  assert.match(PRCite.citeUrl('Quran 2:255'), /quran\.com\/2\/255$/);
});

test('a Bible book name is only scripture when a chapter number follows it', () => {
  // "John Batchelor" (an ethnographer) must NOT resolve to the Gospel of John.
  const u = PRCite.citeUrl('John Batchelor, The Ainu and Their Folk-Lore (1901)');
  assert.ok(!u || !/biblegateway/.test(u), 'a person named John is not scripture');
});

test('modern books resolve to a Google Books search; journals to Scholar', () => {
  assert.match(
    PRCite.citeUrl('Vansina, Jan. The Children of Woot. Madison: University of Wisconsin Press, 1978.'),
    /google\.com\/search\?tbm=bks&q=/);
  assert.match(
    PRCite.citeUrl("Doja, Albert, 'Mythology and Destiny', Anthropos 100/2, 2005, pp. 449-462."),
    /scholar\.google\.com\/scholar\?q=/);
});

test('vague / material / linguistic references return null', () => {
  assert.strictEqual(PRCite.citeUrl('throughout Greek corpus'), null);
  assert.strictEqual(PRCite.citeUrl('the Linear B tablets from the Mycenaean Palace of Pylos'), null);
  assert.strictEqual(PRCite.citeUrl("Weekday 'Þunresdæg'; Old Saxon Baptismal Vow"), null);
  assert.strictEqual(PRCite.citeUrl('continuing Ōmiwa Shrine institutional oral tradition'), null);
});

test('compound references resolve to the first linkable work', () => {
  const u = PRCite.citeUrl('Hom. Il. 14.319-320; Hes. Sh. 216-237; Apollod. 2.4.1-5');
  assert.match(u, /HomerIliad14\.html$/);
  const segs = PRCite.citeSegments('Apollod. 2.4.1; Rigveda 10.14');
  assert.strictEqual(segs.length, 2);
  assert.match(segs[0].url, /Apollodorus2\.html$/);
  assert.match(segs[1].url, /rigveda/);
});

test('every resolved URL is an absolute https URL', () => {
  const inputs = ['Apollod. 2.4.1', 'Rigveda 10.14', 'John 3:16', 'Quran 2:255',
    'Paus. 2.16', 'Vansina, Jan. The Children of Woot. 1978.',
    "Doja, 'Mythology and Destiny', Anthropos 100/2, 2005, pp. 449-462."];
  for (const i of inputs) {
    const u = PRCite.citeUrl(i);
    assert.match(u, /^https:\/\/\S+$/, `bad url for "${i}": ${u}`);
    assert.ok(!/\s/.test(u), `url has whitespace for "${i}"`);
  }
});

test('never throws on malformed input', () => {
  for (const i of [null, undefined, 42, {}, [], '', '   ', ';;;', '(((', 'a'.repeat(4000), '$^*+?[](){}|.\\']) {
    assert.doesNotThrow(() => { PRCite.citeUrl(i); PRCite.citeSegments(i); });
  }
});
