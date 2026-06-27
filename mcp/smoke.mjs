// Quick self-test of the corpus query layer (no network). `npm run smoke`.
import * as c from './corpus.mjs';
const ok = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } };
ok(c.stats.figures > 2800, 'figure count');
ok(c.searchFigures('zeus').results.some((r) => r.id === 'greek_hesiod_zeus'), 'search finds Zeus');
ok(c.getFigure('greek_hesiod_zeus').sources.length > 0, 'Zeus is cited');
const r = c.relate('greek_apollod_heracles', 'greek_helen');
ok(r.hops === 2 && r.path.some((s) => s.id === 'greek_hesiod_zeus'), 'relate path via Zeus');
ok(c.equivalents('greek_hesiod_zeus').equivalents.some((e) => /Iuppiter/.test(e.name)), 'Zeus ↔ Iuppiter');
ok(c.whoGoverns('sea').total > 10, 'sea-governors');
console.log('smoke ok —', JSON.stringify(c.stats));
