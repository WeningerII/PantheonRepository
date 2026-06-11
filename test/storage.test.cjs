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
