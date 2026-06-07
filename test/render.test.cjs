// Integration tests: boot the whole app in jsdom and exercise the views and
// keyboard paths, asserting it renders without runtime errors. Includes a
// regression test for the Lifecycle equal-width-column layout.
const { describe, test, before } = require('node:test');
const assert = require('node:assert');
const { bootApp } = require('./helpers/boot.cjs');

describe('app renders in a browser-like environment', () => {
  let app;
  before(async () => { app = await bootApp(); });

  test('boots to completion with no runtime errors', () => {
    assert.ok(app.window.__bootDone, 'boot did not complete');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('renders all 602 figures in the Browse table', () => {
    const rows = app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)');
    assert.strictEqual(rows.length, 602);
  });

  test('"/" focuses the search box', async () => {
    await app.act(async () => { app.key('/'); });
    assert.strictEqual(
      app.document.activeElement?.getAttribute('aria-label'), 'Search registry');
    app.document.activeElement?.blur?.();
  });

  test('Cmd+K opens the command palette and Esc closes it', async () => {
    await app.act(async () => { app.key('k', { metaKey: true }); });
    assert.ok(app.document.querySelector('.cmdk-back, .cmdk'), 'palette did not open');
    await app.act(async () => { app.key('Escape'); });
    assert.ok(!app.document.querySelector('.cmdk-back, .cmdk'), 'palette did not close');
  });

  test('switches Browse → Graph → Atlas → Browse without errors', async () => {
    await app.clickButton('Graph');
    assert.ok(app.document.querySelector('.graph-canvas svg, .graph-empty'), 'graph did not mount');
    await app.clickButton('Atlas');
    assert.ok(app.document.querySelector('.atlas-canvas'), 'atlas did not mount');
    await app.clickButton('Browse');
    assert.ok(app.document.querySelector('.browse-table'), 'did not return to browse');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('opens the detail panel for a figure', async () => {
    await app.openFirstFigure();
    assert.ok(app.document.querySelector('.detail'), 'detail panel did not open');
  });

  // Regression: the Lifecycle timeline used year-proportional columns, which
  // crammed every stage of a short era into a sliver of overlapping nodes.
  // Equal-width columns (widened to guarantee a per-stage gap) must keep the
  // stage nodes spread apart — even for dense figures.
  const minLifecycleGap = (doc) => {
    const svg = doc.querySelector('.lifecycle-svg');
    assert.ok(svg, 'expected a scaled lifecycle timeline');
    const xs = [...svg.querySelectorAll('circle')]
      .filter((c) => c.getAttribute('r') === '12') // NODE_R
      .map((c) => {
        const m = /translate\(([-\d.]+)/.exec(c.parentNode.getAttribute('transform') || '');
        return m ? parseFloat(m[1]) : null;
      })
      .filter((v) => v != null)
      .sort((a, b) => a - b);
    assert.ok(xs.length >= 2, `expected multiple lifecycle stages, got ${xs.length}`);
    let gap = Infinity;
    for (let i = 1; i < xs.length; i++) gap = Math.min(gap, xs[i] - xs[i - 1]);
    return { count: xs.length, gap };
  };

  test('Lifecycle stage nodes are spread, not crammed', async () => {
    await app.openFirstFigure(); // ʿAntara ibn Shaddad — a multi-era lifecycle
    const { gap } = minLifecycleGap(app.document);
    assert.ok(gap >= 24, `stage nodes overlap: min gap ${Math.round(gap)}px < 24px node size`);
  });

  test('a dense lifecycle (greek_alexander, 17 stages) still does not overlap', async () => {
    await app.openFigure('greek_alexander');
    const { count, gap } = minLifecycleGap(app.document);
    assert.ok(count >= 10, `expected the dense figure's many stages, got ${count}`);
    assert.ok(gap >= 24, `dense lifecycle overlaps: min gap ${Math.round(gap)}px < 24px node size`);
  });

  test('detail surfaces the divinity descent breakdown', async () => {
    await app.openFigure('greek_apollod_heracles');
    const descent = app.document.querySelector('.section-descent');
    assert.ok(descent, 'Descent section did not render');
    assert.match(descent.textContent, /9⁄16/, 'expected the 9/16 fraction to be shown');
    assert.match(descent.textContent, /by descent/);
    assert.ok(descent.querySelectorAll('.descent-parent').length >= 2, 'expected per-parent contribution rows');
  });

  test('detail surfaces a Powers section with own + inherited candidates', async () => {
    await app.openFigure('greek_eur_macaria'); // a Heraclid with inheritance candidates
    const powers = app.document.querySelector('.section-powers');
    assert.ok(powers, 'Powers section did not render');
    assert.ok(powers.querySelector('.powers-inherited'), 'expected the inheritable-from-ancestry block');
    assert.match(powers.textContent, /not attested/, 'candidates must be labelled potential, not attested');
  });

  test('detail surfaces multi-script names (Heracles)', async () => {
    await app.openFigure('greek_apollod_heracles');
    const names = app.document.querySelector('.section-names');
    assert.ok(names, 'Names section did not render');
    assert.match(names.textContent, /Hercle|Hercules/, 'expected the cross-tradition names');
    assert.ok(names.querySelectorAll('.name-rec-original').length >= 1, 'expected original-script glyphs');
    assert.ok(app.document.querySelector('.section-powers .power-row'), 'expected Heracles\' own faculties');
  });

  test('the Items view lists the object registry, grouped by kind', async () => {
    await app.clickButton('Items');
    const view = app.document.querySelector('.items-view');
    assert.ok(view, 'Items view did not mount');
    assert.ok(view.querySelectorAll('.item-row').length > 30, 'expected the object corpus in the index');
    assert.ok(view.querySelector('.items-group'), 'expected kind groupings');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('an item detail tells the custody chain and links registry holders', async () => {
    await app.openItem('heracles-bow');
    const custody = app.document.querySelector('.section-custody');
    assert.ok(custody, 'custody section did not render');
    assert.match(custody.textContent, /Philoctetes/, 'expected the external custody holder Philoctetes');
    assert.ok(custody.querySelector('.custody-who.link'), 'expected a linked registry figure (Heracles) in the chain');
    // Mjǫllnir surfaces its runic name form.
    await app.openItem('mjolnir');
    const names = app.document.querySelector('.item-detail .section-item-names');
    assert.ok(names, 'item names section did not render');
    assert.match(names.textContent, /Mjǫllnir/, 'expected the Old Norse form');
  });

  test('a figure detail cross-links its material culture to the item registry', async () => {
    await app.openFigure('norse_thor');
    const mc = app.document.querySelector('.section-material .material-item.link');
    assert.ok(mc, 'expected a clickable material-culture item on Thor');
    assert.match(app.document.querySelector('.section-material').textContent, /Mjǫllnir/, 'expected the native item name, not the raw id');
  });
});
