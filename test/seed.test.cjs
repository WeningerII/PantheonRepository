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
    people: JSON.parse(ctx.localStorage.getItem('pantheon_registry_v8')),
    atlas: JSON.parse(ctx.localStorage.getItem('pantheon_atlas_v2')),
  };
}

const { ctx, logs, people, atlas } = loadSeed();

test('seeds 601 figures', () => {
  assert.strictEqual(Object.keys(people).length, 601);
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

test('every figure has a string id and a valid type', () => {
  const VALID = new Set(['deity', 'demigod', 'quartigod', 'scion', 'mortal']);
  for (const [key, p] of Object.entries(people)) {
    assert.strictEqual(typeof p.id, 'string', `figure ${key} has a non-string id`);
    if (p.type !== undefined) {
      assert.ok(VALID.has(p.type), `figure ${key} has invalid type "${p.type}"`);
    }
  }
});

test('migrate reports no hard-schema (Layer 1) violations', () => {
  const hard = logs.error.filter((m) => /Layer 1/.test(m));
  assert.deepStrictEqual(hard, [], `hard-schema errors:\n${hard.join('\n')}`);
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
