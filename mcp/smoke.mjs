// Quick self-test of the corpus query layer (no network). `npm run smoke`.
// Each check is a real question the connector must be able to answer.
import * as c from './corpus.mjs';
const ok = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } };

// stats & vocab discovery
ok(c.stats.figures > 3900, 'figure count');
ok(c.stats.relation_kinds > 80, 'relation-kind vocabulary present');
ok(c.vocab('relation_kinds').results.some((r) => r.key === 'killed-by' && r.count > 10), 'vocab lists killed-by with count');
ok(c.vocab('iconography', { prefix: 'thunder' }).results.length >= 1, 'vocab finds thunderbolt iconography');
ok(c.vocab('nope').error && c.vocab('nope').vocabularies.length, 'bad vocab kind teaches the valid ones');

// search: names, epithets, full text, filters
ok(c.searchFigures('zeus').results.some((r) => r.id === 'greek_hesiod_zeus'), 'search finds Zeus by name');
ok(c.searchFigures('averter of evil').results.some((r) => r.id === 'greek_apollod_heracles'), 'search matches an epithet TRANSLATION (full-text)');
ok(c.searchFigures('', { icon: 'thunderbolt' }).results.length >= 1, 'reverse lookup by iconographic attribute');
ok(c.searchFigures('', { place: 'thebes' }).results.length >= 1, 'reverse lookup by cult/birth place');
ok(c.searchFigures('', { relation_kind: 'killed-by' }).results.length >= 5, 'reverse lookup by relation kind');
ok(c.searchFigures('', { tradition: 'Greek', alive_in_year: -1250 }).results.length >= 3, 'filter by mythic year');
const miss = c.searchFigures('herakles the striker of nonsense');
ok(miss.total === 0 && Array.isArray(miss.suggestions), 'zero-hit search returns suggestions');

// get_figure: batch + views
const batch = c.getFigure(['greek_hesiod_zeus', 'greek_apollod_heracles'], { view: 'card' });
ok(batch.figures.length === 2 && batch.figures[0].name === 'Zeus', 'batch get, card view');
const dossier = c.getFigure('greek_apollod_heracles', { view: 'dossier' });
ok(dossier.divinity && /9\/16|0\.56|⁹|9\/16/.test(JSON.stringify(dossier.divinity.fraction)) || dossier.divinity.tier === 'demigod', 'dossier carries divinity math');
ok(dossier.inherited_powers === undefined || Array.isArray(dossier.inherited_powers), 'dossier inherited powers shape');
ok(dossier.relations.some((r) => r.kind && r.id), 'dossier relations are typed with ids');
ok(dossier.cult_places && dossier.cult_places.includes('Thebes'), 'dossier lists cult places');
const full = c.getFigure('greek_apollod_heracles', { view: 'full' });
ok(full.iconography && full.iconography.attributes.some((a) => /lion/.test(a.id)), 'full view carries iconography');
ok(full.sources_by_claim.some((s) => s.claim === 'apotheosis'), 'full view carries per-claim citations');
ok(full.variants && full.variants.length >= 1, 'full view carries variant claims');
ok(c.getFigure('greek_zeus').suggestions.some((s) => s.id.includes('zeus')), 'unknown id suggests the right one');

// graph
const r = c.relate('greek_apollod_heracles', 'greek_helen');
ok(r.hops === 2 && r.path.some((s) => s.id === 'greek_hesiod_zeus'), 'relate path via Zeus');
ok(r.path.every((s, i) => i === 0 || s.via), 'relate steps are typed');
const nb = c.neighbors('greek_hesiod_zeus', { kinds: ['father-of', 'father of', 'parent of'] });
ok(nb.results.length >= 5, 'typed neighbors filter');
ok(Object.keys(nb.kinds_present).length >= 3, 'neighbors reports kind counts');
ok(c.equivalents('greek_hesiod_zeus').equivalents.some((e) => /Iuppiter|Jupiter/.test(e.name)), 'Zeus ↔ Iuppiter');
const killed = c.queryRelations('killed-by', {});
ok(killed.results.length >= 10 && killed.results[0].from && killed.results[0].to, 'relation slice: killed-by pairs');

// registries
ok(c.whoGoverns('sea').results.length > 10, 'sea-governors');
const wields = c.whoWields('physical-strength-extreme');
ok(wields.holders.results.length >= 1, 'power holders');
ok(wields.inheritors.results.length >= 1 && wields.inheritors.results[0].inherited_from, 'power INHERITORS with provenance');
const bolt = c.getItem('zeus-thunderbolt');
ok(bolt.custody && bolt.custody.some((s) => /forged/.test(s.role)) && bolt.lore, 'item custody chain + lore');
const swords = c.getItem('sword', { limit: 5 });
ok(swords.total >= 3 && swords.results[0].id, 'item search by text');

// aggregates & traditions
const agg = c.aggregate('domain', { tradition: 'Greek' });
ok(agg.results.length >= 10 && agg.results[0].count >= agg.results[1].count, 'aggregate: Greek domains ranked');
ok(c.aggregate('bogus').error && c.aggregate('bogus').dimensions.length, 'bad dimension teaches valid ones');
const ov = c.traditionOverview('norse');
ok(ov.figures > 50 && ov.top_domains.length >= 5, 'tradition overview with top domains');
ok(c.traditionOverview('norsee').suggestions, 'tradition typo suggests');

console.log('smoke ok —', JSON.stringify(c.stats));
