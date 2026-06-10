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
    atlas: JSON.parse(ctx.localStorage.getItem('pantheon_atlas_v2')),
  };
}

const { ctx, logs, people, atlas } = loadSeed();

test('seeds the full figure corpus (growing)', () => {
  // The corpus is deliberately expanding as missing central figures are added;
  // assert a floor rather than an exact count.
  assert.ok(Object.keys(people).length >= 1850, `expected >= 1850 figures, got ${Object.keys(people).length}`);
});

test('seeds 56 atlas territories', () => {
  assert.strictEqual(Object.keys(atlas).length, 56);
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
  // Ceilings pin the KNOWN drift so it can only shrink deliberately — these
  // counts could previously grow 100x without any test moving. Wanema/Alalu
  // and the four ITEMS_GEN figures are authored now, so those two ceilings
  // are hard zeros; the era-gap ceiling ratchets to 0 with the wave-6
  // tradition-constants backfill.
  const danglingCeiling = 0;
  const unknownItemCeiling = 0;
  const eraGapCeiling = 1200;  // unmapped-tradition era values (constants backfill pending)
  assert.ok(num(/(\d+) dangling references/) <= danglingCeiling,
    `dangling references grew past ${danglingCeiling}:\n${all.split('\n').filter((l) => /dangling/.test(l)).join('\n')}`);
  const unknownItems = (all.match(/generated item for unknown figure/g) || []).length;
  assert.ok(unknownItems <= unknownItemCeiling,
    `ITEMS_GEN keys without an authored figure grew to ${unknownItems}`);
  assert.ok(num(/(\d+) era values unresolvable/) <= eraGapCeiling,
    'era values fell out of ERA_ORDER coverage (dates/sort silently degraded)');
  const drift = num(/Tier-classification drift in (\d+) entries/);
  assert.ok(drift <= 30, `tier-classification drift grew to ${drift} entries (accepted ceiling 30)`);
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
