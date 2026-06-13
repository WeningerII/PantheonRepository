// Data-layer tests: run app/data.js in an isolated VM context with the browser
// globals it touches stubbed, then assert the seed it writes to localStorage and
// the constants it exposes on window.__PR. No React/jsdom — fast and dependency-free.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA = path.resolve(__dirname, '..', 'app', 'data.js');

function loadSeed() {
  const store = new Map();
  const logs = { warn: [], error: [], info: [] };
  const ctx = {
    window: { dispatchEvent: () => true },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    console: {
      log() {},
      warn: (...a) => logs.warn.push(a.join(' ')),
      error: (...a) => logs.error.push(a.join(' ')),
      info: (...a) => logs.info.push(a.join(' ')),
    },
    CustomEvent: class { constructor(t, o) { Object.assign(this, { type: t }, o || {}); } },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(DATA, 'utf8'), ctx, { filename: 'data.js' });
  return {
    ctx,
    logs,
    people: JSON.parse(ctx.localStorage.getItem('pantheon_registry_v9')),
    atlas: JSON.parse(ctx.localStorage.getItem('pantheon_atlas_v3')),
  };
}

const { ctx, logs, people, atlas } = loadSeed();

test('seeds the full figure corpus (growing)', () => {
  // The corpus is deliberately expanding as missing central figures are added;
  // assert a floor rather than an exact count.
  // (1,851 minus the two absorbed duplicate entities — Tyche and the Erinyes
  // each existed twice; wave 7 merged them.)
  assert.ok(Object.keys(people).length >= 1845, `expected >= 1845 figures, got ${Object.keys(people).length}`);
});

test('seeds 238 atlas territories (every tradition mapped)', () => {
  assert.strictEqual(Object.keys(atlas).length, 238);
});

test('exposes the constants the UI reads on window.__PR', () => {
  const pr = ctx.window.__PR;
  assert.ok(pr, 'window.__PR was not set');
  for (const k of ['ERA_ORDER', 'ERA_DATES', 'TRADITION_PIGMENTS', 'TYPE_META', 'PEOPLE_KEY', 'ATLAS_KEY', 'getEntryDates']) {
    assert.ok(k in pr, `window.__PR.${k} missing`);
  }
  assert.strictEqual(typeof pr.getEntryDates, 'function');
});

test('every figure has a string id (matching its map key) and a valid type', () => {
  const VALID = new Set(['deity', 'demigod', 'quartigod', 'scion', 'mortal']);
  for (const [key, p] of Object.entries(people)) {
    assert.strictEqual(typeof p.id, 'string', `figure ${key} has a non-string id`);
    assert.strictEqual(p.id, key, `figure keyed ${key} carries id ${p.id}`);
    // Presence, not just validity: a regression that drops the type field
    // from every figure must not pass as "all types valid".
    assert.ok(VALID.has(p.type), `figure ${key} has missing/invalid type "${p.type}"`);
  }
});

test('migrate reports no hard-schema (Layer 1) violations', () => {
  const hard = logs.error.filter((m) => /Layer 1/.test(m));
  assert.deepStrictEqual(hard, [], `hard-schema errors:\n${hard.join('\n')}`);
});

test('warn-level integrity drift stays at its accepted ceilings', () => {
  const all = logs.warn.join('\n');
  const num = (re) => { const m = all.match(re); return m ? parseInt(m[1], 10) : 0; };
  // Hard zeros, all of them: every dangling reference, unknown ITEMS_GEN
  // key, and unmapped era value has been resolved (waves 6 + 6b backfilled
  // all 182 missing traditions). Any recurrence is a regression.
  const danglingCeiling = 0;
  const unknownItemCeiling = 0;
  const eraGapCeiling = 0;
  assert.ok(num(/(\d+) dangling references/) <= danglingCeiling,
    `dangling references grew past ${danglingCeiling}:\n${all.split('\n').filter((l) => /dangling/.test(l)).join('\n')}`);
  const unknownItems = (all.match(/generated item for unknown figure/g) || []).length;
  assert.ok(unknownItems <= unknownItemCeiling,
    `ITEMS_GEN keys without an authored figure grew to ${unknownItems}`);
  assert.ok(num(/(\d+) era values unresolvable/) <= eraGapCeiling,
    'era values fell out of ERA_ORDER coverage (dates/sort silently degraded)');
  // Wave 7 resolved every drift case: 18 types adopted from the computed
  // tier, 10 documented authored-tier stances (which surface on an info
  // line, not as drift). Drift is a hard zero now.
  const drift = num(/Tier-classification drift in (\d+) entries/);
  assert.strictEqual(drift, 0, `tier-classification drift reappeared (${drift} entries)`);
  assert.ok(!/Layer 3 era inversions/.test(all), 'era inversions reappeared');
});

test('every name is verified: each figure has an edge OR a recorded solitary verdict', () => {
  // The wave-7d exhaustive pass gave every figure a verdict. This is the
  // permanent invariant: a figure with no parentIds and no relations MUST be
  // listed in data-sources/verified-solitary.json (with a cited reason).
  // Any future figure added without a verdict fails here — "every name
  // verified" is now a property of the corpus, not a one-time effort.
  const ledger = require('../data-sources/verified-solitary.json');
  const unverified = [];
  for (const [id, p] of Object.entries(people)) {
    const edged = (p.parentIds || []).length || (p.relations || []).length;
    if (!edged && !ledger[id]) unverified.push(id);
  }
  assert.deepStrictEqual(unverified, [],
    `${unverified.length} figures have neither an edge nor a solitary verdict:\n${unverified.slice(0, 30).join('\n')}`);
  // Every ledger entry must carry a non-trivial reason.
  for (const [id, reason] of Object.entries(ledger)) {
    assert.ok(typeof reason === 'string' && reason.length >= 10, `solitary verdict for ${id} lacks a reason`);
  }
});

test('family-graph parity floors hold (wave-7 enrichment)', () => {
  // The generated waves arrived with ZERO family links; wave 7 authored 248
  // figures' worth of cited genealogy. These floors pin the result: total
  // relation edges (after auto-mirroring) and the count of figures with no
  // family links at all can only improve from here.
  const ppl = Object.values(people);
  const rels = ppl.reduce((n, p) => n + (p.relations || []).length, 0);
  const noFam = ppl.filter(p => !(p.parentIds || []).length && !(p.relations || []).length).length;
  assert.ok(rels >= 2500, `relation edges fell to ${rels} (floor 2500)`);
  assert.ok(noFam <= 380, `figures with no family links grew to ${noFam} (ceiling 380)`);
});

test('iconography coverage floor (wave-7g)', () => {
  // Iconography (attributes/sacred animals/plants) was authored for 240
  // figures but rendered for NONE (Detail had no iconography section).
  // Wave 7g added the section and authored the attested visual emblems
  // across the deity/demigod tier. Floor pins it.
  const ppl = Object.values(people);
  const items = (p) => { const i = p.iconography || {}; return (i.attributes || []).length + (i.sacredAnimals || []).length + (i.sacredPlants || []).length; };
  const withIco = ppl.filter(p => items(p) > 0).length;
  const total = ppl.reduce((n, p) => n + items(p), 0);
  assert.ok(withIco >= 720, `figures with iconography fell to ${withIco} (floor 720)`);
  assert.ok(total >= 1500, `total iconography items fell to ${total} (floor 1500)`);
  // Every iconography item must carry an id + a citation.
  const bad = [];
  for (const p of ppl) {
    const i = p.iconography || {};
    for (const sub of ['attributes', 'sacredAnimals', 'sacredPlants']) {
      for (const it of (i[sub] || [])) if (!it.id || !(it.sources || []).length) bad.push(`${p.id}.${sub}: ${it.id || '∅'}`);
    }
  }
  assert.deepStrictEqual(bad, [], `uncited or id-less iconography:\n${bad.slice(0, 20).join('\n')}`);
});

test('etymology coverage floor (wave-7h)', () => {
  // Name etymologies existed for 119 figures (the Detail "Etymology" section
  // already rendered them). Wave 7h authored cited name-origin reconstructions
  // — language family + native-script prose + sources — across the deity/
  // demigod tier, lifting coverage to ~768. This floor pins that result and
  // requires every wave-authored etymology to carry a real citation.
  const ppl = Object.values(people);
  const withEtym = ppl.filter(p => p.linguistic && p.linguistic.etymology).length;
  const withFam  = ppl.filter(p => p.linguistic && p.linguistic.languageFamily).length;
  const withSrc  = ppl.filter(p => p.linguistic && (p.linguistic.sources || []).length).length;
  assert.ok(withEtym >= 740, `figures with etymology fell to ${withEtym} (floor 740)`);
  assert.ok(withFam  >= 740, `figures with languageFamily fell to ${withFam} (floor 740)`);
  assert.ok(withSrc  >= 620, `cited etymologies fell to ${withSrc} (floor 620)`);
  // Every etymology must be accompanied by a languageFamily, and any sources
  // attached must cite a real reference (no bare/empty citations).
  const bad = [];
  for (const p of ppl) {
    const L = p.linguistic;
    if (!L || !L.etymology) continue;
    if (!L.languageFamily) bad.push(`${p.id}: etymology without languageFamily`);
    for (const s of (L.sources || [])) {
      const ref = typeof s === 'string' ? s : (s && s.reference);
      if (!ref) bad.push(`${p.id}: source missing reference`);
    }
  }
  assert.deepStrictEqual(bad, [], `malformed etymology metadata:\n${bad.slice(0, 20).join('\n')}`);
});

test('cult-practice coverage floor (wave-7f)', () => {
  // Festivals/rites/ceremonies were 5% coverage (28 figures); wave 7f
  // authored the attested practices across the deity/demigod tier. Floor
  // pins it so the "Festivals & rites" panel can't silently empty again.
  const ppl = Object.values(people);
  const withFest = ppl.filter(p => (p.cult && p.cult.festivals || []).length).length;
  const total = ppl.reduce((n, p) => n + ((p.cult && p.cult.festivals) || []).length, 0);
  assert.ok(withFest >= 520, `figures with festivals/rites fell to ${withFest} (floor 520)`);
  assert.ok(total >= 600, `total cult practices fell to ${total} (floor 600)`);
  // Every authored practice must carry a name + a citation.
  const bad = [];
  for (const p of ppl) for (const f of ((p.cult && p.cult.festivals) || [])) {
    if (!(f.name || f.id) || !(f.sources || []).length) bad.push(`${p.id}: ${f.name || f.id || '∅'}`);
  }
  assert.deepStrictEqual(bad, [], `uncited or unnamed cult practices:\n${bad.slice(0, 20).join('\n')}`);
});

test('cult-site coverage floor (wave-7i)', () => {
  // Cult CENTERS (temples/sanctuaries/shrines/oracles/sacred places) were 4%
  // coverage (79 figures, 126 sites). Wave 7i documented the attested places
  // of worship across the deity/demigod tier — each with a type and (mostly) a
  // native-script site name — lifting it to ~627 figures / ~848 sites. Floor
  // pins it so the Cult "Centers" panel can't silently empty again.
  const ppl = Object.values(people);
  const cc = (p) => (p.cult && Array.isArray(p.cult.cultCenters)) ? p.cult.cultCenters : [];
  const withCenters = ppl.filter(p => cc(p).length).length;
  const total = ppl.reduce((n, p) => n + cc(p).length, 0);
  const typed = ppl.reduce((n, p) => n + cc(p).filter(s => s.type).length, 0);
  assert.ok(withCenters >= 600, `figures with cult sites fell to ${withCenters} (floor 600)`);
  assert.ok(total >= 800, `total cult sites fell to ${total} (floor 800)`);
  assert.ok(typed >= 700, `typed cult sites fell to ${typed} (floor 700)`);
  // Every cult site must carry a placeName and at least one cited source.
  const bad = [];
  for (const p of ppl) for (const s of cc(p)) {
    if (!s.placeName || !(s.sources || []).length) bad.push(`${p.id}: ${s.placeName || '∅'}`);
  }
  assert.deepStrictEqual(bad, [], `uncited or unnamed cult sites:\n${bad.slice(0, 20).join('\n')}`);
});

test('priesthood coverage floor (wave-7j)', () => {
  // Priesthoods (the WHO of cult: clergy/orders/colleges) had ~0% coverage
  // (1 figure). Wave 7j documented the attested priestly offices that served
  // each figure — each with a type and (mostly) a native-script title —
  // lifting it to ~497 figures / ~540 offices. Floor pins it so the new Cult
  // "Priesthood" sub-section can't silently empty again.
  const ppl = Object.values(people);
  const pr = (p) => (p.cult && Array.isArray(p.cult.priesthoods)) ? p.cult.priesthoods : [];
  const withPriest = ppl.filter(p => pr(p).length).length;
  const total = ppl.reduce((n, p) => n + pr(p).length, 0);
  assert.ok(withPriest >= 470, `figures with priesthoods fell to ${withPriest} (floor 470)`);
  assert.ok(total >= 500, `total priesthood offices fell to ${total} (floor 500)`);
  // Every office must carry a title, a type, and at least one cited source.
  const bad = [];
  for (const p of ppl) for (const o of pr(p)) {
    if (!o.title || !o.type || !(o.sources || []).length) bad.push(`${p.id}: ${o.title || '∅'}`);
  }
  assert.deepStrictEqual(bad, [], `uncited/untitled/untyped priesthoods:\n${bad.slice(0, 20).join('\n')}`);
});

test('offering coverage floor (wave-7k)', () => {
  // Offerings/sacrifices (the WHAT of cult) had 0% coverage. Wave 7k documented
  // the attested sacrifices, libations, food/first-fruits, incense, votives,
  // and ritual taboos for each figure — each with a type and (mostly) a
  // native-script term — lifting it to ~460 figures / ~497 offerings. This
  // completes the cult complex (where/when/who/what); floor pins it so the new
  // Cult "Offerings & sacrifices" sub-section can't silently empty again.
  const ppl = Object.values(people);
  const of = (p) => (p.cult && Array.isArray(p.cult.offerings)) ? p.cult.offerings : [];
  const withOff = ppl.filter(p => of(p).length).length;
  const total = ppl.reduce((n, p) => n + of(p).length, 0);
  assert.ok(withOff >= 430, `figures with offerings fell to ${withOff} (floor 430)`);
  assert.ok(total >= 460, `total offerings fell to ${total} (floor 460)`);
  // Every offering must carry an offering description, a type, and a citation.
  const bad = [];
  for (const p of ppl) for (const o of of(p)) {
    if (!o.offering || !o.type || !(o.sources || []).length) bad.push(`${p.id}: ${o.offering || '∅'}`);
  }
  assert.deepStrictEqual(bad, [], `uncited/untyped/empty offerings:\n${bad.slice(0, 20).join('\n')}`);
});

test('epithet coverage floor (wave-7e)', () => {
  // The Epithets panel rendered for nobody (4 figures' epithets were stranded
  // at linguistic.epithets; the rest were unauthored). Wave 7e lifted those
  // and authored cited native-script epithets across the deity/demigod tier.
  // This floor pins the result so the panel can't silently empty again.
  const ppl = Object.values(people);
  const withEp = ppl.filter(p => (p.epithets || []).length).length;
  const total = ppl.reduce((n, p) => n + (p.epithets || []).length, 0);
  assert.ok(withEp >= 470, `figures with epithets fell to ${withEp} (floor 470)`);
  assert.ok(total >= 1000, `total epithets fell to ${total} (floor 1000)`);
  // Every epithet must carry a native original + a citation (no bare labels).
  const bad = [];
  for (const p of ppl) for (const e of (p.epithets || [])) {
    if (!e.original || !(e.sources || []).length) bad.push(`${p.id}: ${e.original || '∅'}`);
  }
  assert.deepStrictEqual(bad, [], `uncited or label-only epithets:\n${bad.slice(0, 20).join('\n')}`);
});

test('cross-tradition equivalence network parity floor (wave-7c)', () => {
  // The Graph's default mode renders the BETWEEN-pantheon layer. It shipped
  // with ~33 pairs (all Greco-Roman-Etruscan); wave 7c authored the attested
  // world network — Herodotus's tables, the Anatolian storm chain, the
  // Polynesian cognates, the Sakra reception chain... This floor pins it.
  let directed = 0;
  for (const p of Object.values(people)) {
    for (const r of p.relations || []) {
      const k = (r.kind || '').toLowerCase();
      if (!['equated-with', 'interpretatio', 'syncretism'].includes(k)) continue;
      if (people[r.personId] && people[r.personId].tradition !== p.tradition) directed++;
    }
  }
  assert.ok(directed >= 450, `cross-tradition refs fell to ${directed} (floor 450 ≈ 225 pairs)`);
});

test('documented authored-tier stances are exactly the reviewed ten', () => {
  const line = logs.info.find((m) => /authored-tier stances/.test(m)) || '';
  const m = line.match(/(\d+) documented authored-tier stances/);
  assert.ok(m, 'authored-stances info line missing');
  assert.strictEqual(parseInt(m[1], 10), 10, `expected the 10 reviewed stances, got ${m[1]}`);
});

test('symmetric relations are fully reciprocal and duplicate entities stay merged', () => {
  const SYM = new Set(['spouse','sibling','twin sibling','half sibling','half-sibling','lover','enemy','rival','ally','companion','sworn companion','equated-with','interpretatio']);
  const missing = [];
  for (const p of Object.values(people)) {
    for (const r of p.relations || []) {
      if (!r.personId || !SYM.has((r.kind || '').toLowerCase()) || !people[r.personId]) continue;
      const back = (people[r.personId].relations || []).some((rr) => rr.personId === p.id &&
        (rr.kind || '').toLowerCase() === (r.kind || '').toLowerCase());
      if (!back) missing.push(`${p.id} -[${r.kind}]-> ${r.personId}`);
    }
  }
  assert.deepStrictEqual(missing, [], `one-way symmetric relations:\n${missing.join('\n')}`);
  // The absorbed duplicates must not return.
  assert.ok(!people['greek_apollod_tyche'] && !people['greek_erinyes'], 'an absorbed duplicate entity reappeared');
  // Aliased items resolve to one object (one Talos, one xirang).
  const items = ctx.window.__PR.items;
  assert.strictEqual(items['talos'], items['europa-talos'], 'Talos split back into two items');
  assert.strictEqual(items['yu-xirang'], items['gun-xirang'], 'the xirang split back into two items');
  const xirangHolders = items['yu-xirang'].holders.map((h) => h.personId);
  assert.ok(xirangHolders.includes('chinese_gun') && xirangHolders.includes('chinese_yu_the_great'),
    'the xirang custody pair lost a holder');
});

test('getEntryDates resolves a known entry to the documented shape', () => {
  const zeus = people['greek_hesiod_zeus'];
  assert.ok(zeus, 'expected greek_hesiod_zeus in the seed');
  const d = ctx.window.__PR.getEntryDates(zeus);
  assert.ok(d && typeof d === 'object');
  for (const k of ['mythicStart', 'mythicEnd', 'textualStart', 'textualEnd', 'precision']) {
    assert.ok(k in d, `getEntryDates result missing ${k}`);
  }
});

test('exposes the divinity descent breakdown (Heracles = 9/16, demigod)', () => {
  const div = ctx.window.__PR.divinity;
  assert.ok(div, '__PR.divinity not exposed');
  const h = div['greek_apollod_heracles'];
  assert.ok(h, 'heracles breakdown missing');
  assert.ok(Math.abs(h.fraction - 0.5625) < 1e-9, `expected 0.5625, got ${h.fraction}`);
  assert.strictEqual(h.tier, 'demigod');
  assert.strictEqual(h.contributions.length, 2);
  const fr = h.contributions.map((c) => c.fraction).sort((a, b) => a - b);
  assert.ok(Math.abs(fr[0] - 0.125) < 1e-9, `expected a 1/8 contribution, got ${fr[0]}`);
  assert.ok(Math.abs(fr[1] - 1) < 1e-9, `expected a full (refresh) contribution, got ${fr[1]}`);
});

test('formatFraction renders dyadic fractions', () => {
  const fmt = ctx.window.__PR.formatFraction;
  assert.strictEqual(fmt(0.5), '½');
  assert.strictEqual(fmt(0.5625), '9⁄16');
  assert.strictEqual(fmt(1), '1');
  assert.strictEqual(fmt(0), '0');
});

test('exposes canon-safe inheritable-power candidates', () => {
  const ip = ctx.window.__PR.inheritedPowers;
  assert.ok(ip, '__PR.inheritedPowers not exposed');
  // A Heraclid who does not declare strength sees it as a candidate from Heracles.
  const macaria = ip['greek_eur_macaria'];
  assert.ok(macaria && macaria.length, 'expected inheritable candidates for a Heraclid');
  const str = macaria.find((c) => c.facultyId === 'physical-strength-extreme');
  assert.ok(str, 'expected physical-strength-extreme as a candidate');
  assert.strictEqual(str.fromAncestorId, 'greek_apollod_heracles');
  assert.ok(['full', 'diminished', 'trace', 'partial'].includes(str.level), `bad level ${str.level}`);
});

test('inheritance never overrides a figure\'s own declared powers (canon-safe)', () => {
  const ip = ctx.window.__PR.inheritedPowers;
  for (const [id, arr] of Object.entries(ip)) {
    const own = new Set((people[id].faculties || []).map((f) => f.id));
    for (const c of arr) {
      assert.ok(!own.has(c.facultyId), `${id} lists its own power ${c.facultyId} as "inherited"`);
    }
  }
  // Hyllus declares his own strength → it must not appear as inherited.
  const hyllus = ip['greek_apollod_hyllus'] || [];
  assert.ok(!hyllus.some((c) => c.facultyId === 'physical-strength-extreme'),
    'a declared power leaked into the inheritance candidates');
});

test('seeds the cited Thor figure with Mjǫllnir in his material culture', () => {
  const thor = people['norse_thor'];
  assert.ok(thor, 'expected norse_thor in the seed');
  assert.deepStrictEqual(thor.parentIds, ['norse_odin'], 'Thor is Odin\'s son');
  const mc = (thor.materialCulture || []).map((m) => m.id);
  assert.ok(mc.includes('mjolnir'), 'Thor should carry mjolnir');
});

test('exposes the item registry on window.__PR.items', () => {
  const items = ctx.window.__PR.items;
  assert.ok(items && typeof items === 'object', '__PR.items not exposed');
  assert.ok(Object.keys(items).length >= 1240, `expected the full object corpus, got ${Object.keys(items).length}`);
  // Every materialCulture object becomes an item with at least one holder.
  for (const it of Object.values(items)) {
    assert.strictEqual(typeof it.id, 'string', 'item missing id');
    assert.ok(Array.isArray(it.holders), `item ${it.id} missing holders`);
    assert.ok(Array.isArray(it.names) && it.names.length >= 1, `item ${it.id} missing a name`);
  }
});

test('Mjǫllnir carries its multi-script names (incl. the runic form) and maker', () => {
  const mj = ctx.window.__PR.items['mjolnir'];
  assert.ok(mj, 'mjolnir item missing');
  const values = mj.names.map((n) => n.value);
  assert.ok(values.includes('Mjǫllnir'), 'expected the normalized Old Norse form');
  assert.ok(values.some((v) => /[ᚠ-᛿]/.test(v)), 'expected a runic (younger futhark) form');
  assert.ok(mj.maker && /Brokkr/.test(mj.maker.name), 'expected the dwarf-smith maker Brokkr');
  // Thor (a registry figure) is a holder.
  assert.ok(mj.holders.some((h) => h.personId === 'norse_thor'), 'Thor should be a holder of Mjǫllnir');
});

test('every item in the registry carries cited lore and resolvable custody', () => {
  const items = ctx.window.__PR.items;
  const ids = Object.keys(items);
  assert.ok(ids.length >= 1240, `expected the full object corpus, got ${ids.length}`);
  for (const it of Object.values(items)) {
    assert.ok(it.lore && it.lore.length > 20, `item ${it.id} is missing authored lore`);
    assert.ok(it.names.length >= 1 && it.names[0].value, `item ${it.id} is missing a name`);
    assert.ok(it.sources.length >= 1, `item ${it.id} has no citations`);
    // Every custody step that names a registry figure must resolve to one.
    for (const c of (it.custody || [])) {
      if (c.personId) {
        assert.ok(people[c.personId], `item ${it.id} custody links unknown figure ${c.personId}`);
      }
    }
  }
});

test('historical artifacts carry provenance custody to a current location (Shabaka Stone)', () => {
  const stone = ctx.window.__PR.items['shabaka-stone'];
  assert.ok(stone, 'shabaka-stone missing');
  assert.match(stone.location, /British Museum/, 'expected a current museum location');
  assert.ok(stone.custody.some((c) => c.personId === 'shabaka'), 'commissioner Shabaka should anchor the chain');
  assert.match(JSON.stringify(stone.custody), /Earl Spencer|1805/, 'expected the find/donation history');
});

test('Heracles\' bow has a real custody chain (Heracles → Poeas → Philoctetes)', () => {
  const bow = ctx.window.__PR.items['heracles-bow'];
  assert.ok(bow, 'heracles-bow item missing');
  assert.ok(bow.custody.length >= 3, `expected a multi-step custody chain, got ${bow.custody.length}`);
  // The original owner is a registry figure (linked by personId).
  const origin = bow.custody.find((c) => c.personId === 'greek_apollod_heracles');
  assert.ok(origin, 'Heracles should anchor the chain by personId');
  // Downstream holders not yet in the registry are named by externalRef.
  const chainText = JSON.stringify(bow.custody);
  assert.match(chainText, /Poeas/, 'expected Poeas in the chain');
  assert.match(chainText, /Philoctetes/, 'expected Philoctetes in the chain');
  // Every custody step is cited.
  for (const step of bow.custody) {
    assert.ok((step.sources || []).length >= 1, `custody step "${step.role}" is uncited`);
  }
});
