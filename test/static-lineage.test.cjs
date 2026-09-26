const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Execute the real renderer against a neutral, tiny corpus. Importing the
// production corpus for another test worker needlessly competes with jsdom.
const filename = path.join(__dirname, '../scripts/build-static.cjs');
const source = fs.readFileSync(filename, 'utf8');
const requireFromRenderer = createRequire(filename);
function renderer(people) {
  const module = { exports: {} };
  const requireFixture = id => id === './build-tiers.cjs'
    ? { loadCorpus: () => ({ seedPeople: people, divinity: {} }) }
    : requireFromRenderer(id);
  vm.runInNewContext(source, {
    require: requireFixture, module, __dirname: path.dirname(filename), process,
  }, { filename });
  return module.exports;
}
const cite = (reference, suffix = 'claim') => ({
  kind: 'secondary', reference, url: `https://example.org/${suffix}?a=1&b=2`,
});
function fixture() {
  const people = Object.fromEntries(['N0', 'N1', 'N2', 'N3'].map(id => [id, {
    id, name: { primary: `Figure ${id}`, alt: [] }, tradition: 'T0', type: 'hero', parentIds: [],
  }]));
  people.N0.parentIds = ['N1'];
  people.N0.parentRoles = { N1: 'father' };
  people.N0.relations = [
    { kind: 'father', personId: 'N1', notes: 'Conventional parentage.', sources: [cite('Record 1', 'default')] },
    { kind: 'partner', personId: 'N3', notes: 'Marriage is disputed; this records partnership only.', sources: [cite('Record 2', 'union')] },
    { kind: 'ancestor (claimed)', externalRef: { name: 'An unnamed forebear', tradition: 'T1' }, notes: 'Distant ancestry, not direct parentage.', sources: [cite('Record 3', 'ancestry')] },
  ];
  people.N0.parentageAccounts = [{
    id: 'A0', label: 'Reported alternative', description: 'An alternative report, not the conventional genealogy.',
    parents: [{ kind: 'father', personId: 'N2', notes: 'Reported, not established.', sources: [cite('Record 4', 'parent')] }],
    sources: [cite('Record 5', 'account')],
  }];
  people.N0.sources = [{ claim: 'Biographical claim', citations: [cite('Record 6', 'biography')] }];
  people.N0.variants = [{ id: 'V0', claim: 'Union status', description: 'A marriage assertion has been questioned.', sources: [cite('Record 7', 'variant')] }];
  return people;
}
const section = (html, label) => html.match(new RegExp(`<h2>${label}</h2>([\\s\\S]*?)(?=<h2>|<a class="app-link")`))?.[1] || '';

test('static accounts preserve alternatives, role citations and the default genealogy boundary', () => {
  const people = fixture();
  const before = JSON.stringify(people);
  const render = renderer(people);
  const html = render.figurePage('N0');
  const defaults = section(html, 'Parentage');
  assert.match(defaults, /Recorded default; alternative parentage accounts are listed separately below/);
  assert.match(defaults, /father: <a href="N1.html">Figure N1<\/a>/);
  assert.doesNotMatch(defaults, /N2.html|N3.html/);
  const accounts = section(html, 'Parentage accounts');
  assert.match(accounts, /Reported alternative/);
  assert.match(accounts, /An alternative report, not the conventional genealogy/);
  assert.match(accounts, /father: <a href="N2.html">Figure N2<\/a>/);
  assert.match(accounts, /Reported, not established/);
  assert.match(accounts, /href="https:\/\/example.org\/parent\?a=1&amp;b=2"/);
  assert.match(accounts, /href="https:\/\/example.org\/account\?a=1&amp;b=2"/);
  assert.match(accounts, /does not change descent calculations or inherited powers/);
  assert.match(section(render.figurePage('N1'), 'Children'), /href="N0.html"/);
  assert.equal(section(render.figurePage('N2'), 'Children'), '', 'alternative parents do not acquire default children');
  assert.equal(section(render.figurePage('N3'), 'Children'), '', 'unions never imply parentage');
  assert.equal(JSON.stringify(people), before, 'rendering never mutates default records');
});

test('missing parents do not become an uncreated assertion while explicit empty accounts survive', () => {
  const people = fixture();
  const renderUnknown = renderer(people);
  const unknown = renderUnknown.figurePage('N3');
  assert.doesNotMatch(unknown, /uncreated|self-created/i);
  people.N3.parentageAccounts = [{ id: 'A1', label: 'Uncreated in this account',
    description: 'The text explicitly denies parents in this portrayal.', parents: [], sources: [cite('Record 8', 'empty')] }];
  const html = renderer(people).figurePage('N3');
  assert.match(section(html, 'Parentage'), /Recorded default/);
  assert.match(section(html, 'Parentage'), /<p>No parents recorded in the default.<\/p>/);
  const account = section(html, 'Parentage accounts');
  assert.match(account, /Uncreated in this account/);
  assert.match(account, /The text explicitly denies parents in this portrayal/);
  assert.match(account, /No parents recorded in this account/);
  assert.match(account, /example.org\/empty/);
});

test('static relationships preserve union uncertainty, unresolved names and variant evidence', () => {
  const html = renderer(fixture()).figurePage('N0');
  const relations = section(html, 'Relations');
  assert.match(relations, /partner: <a href="N3.html">Figure N3<\/a>/);
  assert.match(relations, /Marriage is disputed; this records partnership only/);
  assert.match(relations, /ancestor \(claimed\): An unnamed forebear · T1/);
  assert.match(relations, /Distant ancestry, not direct parentage/);
  assert.match(relations, /example.org\/union/);
  assert.match(relations, /example.org\/ancestry/);
  const variants = section(html, 'Variant accounts');
  assert.match(variants, /Union status/);
  assert.match(variants, /A marriage assertion has been questioned/);
  assert.match(variants, /example.org\/variant/);
});

test('epithet original, translation, metadata and supporting evidence remain visible', () => {
  const people = fixture();
  people.N0.epithets = [
    { original: 'Native title', translation: 'Translated title', language: 'L0', transliteration: 'Transliterated title',
      contextTag: 'royal title', notes: 'A title of favor, not biological descent.', sources: [cite('Record 9', 'epithet')] },
    { translation: 'Translation without original' },
    { name: 'Named epithet' },
  ];
  const html = section(renderer(people).figurePage('N0'), 'Epithets');
  for (const value of ['Native title', 'Translated title', 'L0', 'Transliterated title', 'royal title',
    'A title of favor, not biological descent', 'Translation without original', 'Named epithet']) assert.ok(html.includes(value), value);
  assert.match(html, /example.org\/epithet/);
});

test('qualified names link only to explicit targets and preserve disputed status', () => {
  const people = fixture();
  people.N0.nameLinks = [
    { value: 'Shared name', personId: 'N3', tradition: 'T1', status: 'disputed', sources: [cite('Record 10', 'name')] },
    { value: 'Unresolved name', tradition: 'T2', status: 'unresolved', sources: [cite('Record 11', 'unresolved')] },
    { value: 'Alias', tradition: 'T0', status: 'same-record', sources: [cite('Record 12', 'alias')] },
  ];
  const html = section(renderer(people).figurePage('N0'), 'Names and tradition associations');
  assert.match(html, /<a href="N3.html">Shared name<\/a>/);
  assert.match(html, /T1 · disputed/);
  assert.match(html, /Unresolved name <span class="meta">T2 · unresolved/);
  assert.match(html, /Alias <span class="meta">T0 · same record/);
  assert.equal((html.match(/href="N\d.html"/g) || []).length, 1);
  assert.match(html, /example.org\/name/);
});

test('explicit citation URLs survive HTML and catalog export with safe text and URL escaping', () => {
  const people = fixture();
  people.N0.sources.push({ claim: '<b>Unsafe claim</b>', citations: [
    cite('Record <script>text</script>', 'escape'),
    { reference: 'Unsafe URL', url: 'javascript:alert(1)' },
  ] });
  people.N0.relations[1].notes += ' <img src=x onerror=alert(1)>';
  const render = renderer(people);
  const html = render.figurePage('N0');
  const sources = section(html, 'Sources');
  assert.match(sources, /<strong>Biographical claim<\/strong>/);
  assert.match(sources, /href="https:\/\/example.org\/biography\?a=1&amp;b=2"/);
  assert.match(sources, /&lt;b&gt;Unsafe claim&lt;\/b&gt;/);
  assert.match(sources, /Record &lt;script&gt;text&lt;\/script&gt;/);
  assert.doesNotMatch(html, /href="javascript:|<img src=x|<script>text/);
  const catalog = JSON.parse(render.figuresJson());
  const entry = catalog.figures.find(p => p.id === 'N0');
  assert.deepEqual(entry.parents, ['N1']);
  for (const suffix of ['default', 'union', 'ancestry', 'parent', 'account', 'biography', 'variant']) {
    assert.ok(entry.sources.some(s => s.url === `https://example.org/${suffix}?a=1&b=2`), suffix);
  }
  assert.match(catalog.schema, /Parents and children use the recorded default/);
});

test('renaming identifiers leaves static relationship and account output invariant', () => {
  const people = fixture();
  const renamed = JSON.parse(JSON.stringify(people).replace(/N(\d)/g, 'R$1'));
  assert.equal(renderer(renamed).figurePage('R0'), renderer(people).figurePage('N0').replace(/N(\d)/g, 'R$1'));
});
