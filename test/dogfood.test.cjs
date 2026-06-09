// Dogfood test: exercise the *built* Detail panel the way a user would, not the
// source data. Boots the real app in jsdom, opens a deterministic spread of
// sampled figures, and asserts each one's Detail panel actually renders its
// native-term nodes — powers (.power-term-native) and domains (.domain-term) —
// with non-empty script text. Catches rendering regressions that data-shape
// tests cannot (a term present in the seed but dropped by the UI).
const { test, before } = require('node:test');
const assert = require('node:assert');
const { bootApp } = require('./helpers/boot.cjs');

let app, people;
before(async () => {
  app = await bootApp();
  // Prefer the persisted seed, but fall back to the in-memory seed the app
  // exposes on window.__PR — the corpus now exceeds the browser/jsdom
  // localStorage cap, so the persist is intentionally skipped (see state.jsx).
  const raw = app.window.localStorage.getItem('pantheon_registry_v8');
  people = raw ? JSON.parse(raw) : (app.window.__PR && app.window.__PR.seedPeople) || {};
});

// Every figure that should show both a native power-term and a native
// domain-term, id-sorted for a stable sample.
function candidates() {
  return Object.entries(people)
    .filter(([, p]) => (p.faculties || []).some((f) => f.term && f.term.value)
      && (p.domains || []).some((d) => d.term && d.term.value))
    .map(([id]) => id)
    .sort();
}

test('app boots clean before dogfooding', () => {
  assert.ok(app.window.__bootDone, 'boot did not complete');
  assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
});

test('a deterministic spread of figures renders non-empty .power-term / .domain-term nodes in Detail', async () => {
  const ids = candidates();
  assert.ok(ids.length >= 25, `expected >= 25 figures with both native power & domain terms, got ${ids.length}`);
  // Five picks evenly spread across the sorted candidate set (stable, no RNG).
  const picks = [0, 1, 2, 3, 4].map((k) => ids[Math.floor((k * (ids.length - 1)) / 4)]);
  for (const id of picks) {
    await app.openFigure(id);
    const D = app.document;
    const pterm = [...D.querySelectorAll('.power-term-native')].map((n) => n.textContent.trim()).filter(Boolean);
    const dterm = [...D.querySelectorAll('.domain-term')].map((n) => n.textContent.trim()).filter(Boolean);
    assert.ok(pterm.length >= 1, `${id}: Detail rendered no non-empty .power-term-native node`);
    assert.ok(dterm.length >= 1, `${id}: Detail rendered no non-empty .domain-term node`);
  }
});

test('a figure that owns items renders its material culture in Detail', async () => {
  // Pick the id-sorted first figure with material culture, open it, and assert
  // the item panel mounts with at least one named entry.
  const withItems = Object.entries(people)
    .filter(([, p]) => (p.materialCulture || []).length > 0).map(([id]) => id).sort();
  assert.ok(withItems.length >= 100, `expected many item-bearing figures, got ${withItems.length}`);
  await app.openFigure(withItems[0]);
  const D = app.document;
  const hasItems = D.querySelector('.mc-item, .material-culture, .item-card, [class*="material"], [class*="mc-"]');
  assert.ok(hasItems, `${withItems[0]}: Detail rendered no material-culture section`);
});
