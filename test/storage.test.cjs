// localStorage contract tests: the three loadPeople branches the corpus-size
// quota failure normally hides — (a) a user-edited corpus in storage wins over
// the seed, (b) corrupted JSON falls back to the seed, (c) a present-but-empty
// value ('{}' left by a legacy clear) must NOT shadow the in-memory seed.
// Each case needs its own jsdom boot with storage staged before data.js runs.
const { test } = require('node:test');
const assert = require('node:assert');
const { bootApp } = require('./helpers/boot.cjs');

const PEOPLE_KEY = 'pantheon_registry_v9'; // mirrors __PR.PEOPLE_KEY (asserted below)

const rowCount = (app) =>
  app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)').length;

test('a small user-edited corpus in localStorage wins over the seed', async () => {
  const edited = {
    test_edit_one: { id: 'test_edit_one', schemaVersion: 2, name: { primary: 'Edited One' }, type: 'deity', origin: 'canon', tradition: 'Greek' },
    test_edit_two: { id: 'test_edit_two', schemaVersion: 2, name: { primary: 'Edited Two' }, type: 'mortal', origin: 'canon', tradition: 'Greek' },
  };
  const app = await bootApp({
    preSeedStorage: (window) => window.localStorage.setItem(PEOPLE_KEY, JSON.stringify(edited)),
  });
  assert.strictEqual(app.window.__PR.PEOPLE_KEY, PEOPLE_KEY, 'key constant drifted');
  assert.strictEqual(rowCount(app), 2, 'stored corpus should win over the seed');
  assert.match(app.document.querySelector('.browse-table').textContent, /Edited One/);
  app.close();
});

test('corrupted localStorage JSON falls back to the in-memory seed', async () => {
  const app = await bootApp({
    preSeedStorage: (window) => window.localStorage.setItem(PEOPLE_KEY, '{not valid json'),
  });
  assert.ok(rowCount(app) > 100, `expected the seed corpus, got ${rowCount(app)} rows`);
  assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  app.close();
});

test('a present-but-empty stored value does not blank the registry', async () => {
  const app = await bootApp({
    preSeedStorage: (window) => window.localStorage.setItem(PEOPLE_KEY, '{}'),
  });
  assert.ok(rowCount(app) > 100, `expected the seed corpus, got ${rowCount(app)} rows`);
  app.close();
});

test('a stale atlas in localStorage cannot pin the map to an old territory set', async () => {
  // The exact production incident: a returning visitor's browser held the
  // pre-backfill 56-territory atlas under the old key, the loader preferred
  // storage, and the live site rendered 56 territories (0 after filtering to
  // any new tradition) while the shipped seed had 238. The fix is twofold:
  // the old key is removed at boot, and the atlas (pure seed data, no edit
  // UI) is overwritten on every load — even a stale value under the CURRENT
  // key must be replaced.
  const staleOld = { Greek: { polygons: [] } };
  const staleCurrent = { Greek: { polygons: [] }, Roman: { polygons: [] } };
  const app = await bootApp({
    preSeedStorage: (window) => {
      window.localStorage.setItem('pantheon_atlas_v2', JSON.stringify(staleOld));
      window.localStorage.setItem('pantheon_atlas_v3', JSON.stringify(staleCurrent));
    },
  });
  assert.strictEqual(app.window.localStorage.getItem('pantheon_atlas_v2'), null,
    'the retired atlas key was not cleaned up');
  const stored = JSON.parse(app.window.localStorage.getItem('pantheon_atlas_v3'));
  assert.ok(Object.keys(stored).length >= 238,
    `stale atlas under the current key survived the boot (got ${Object.keys(stored).length} territories)`);
  app.close();
});
