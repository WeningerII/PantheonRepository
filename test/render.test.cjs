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

  test('renders all 601 figures in the Browse table', () => {
    const rows = app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)');
    assert.strictEqual(rows.length, 601);
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
  // Equal-width columns must keep the stages spread apart.
  test('Lifecycle stage nodes are spread, not crammed', async () => {
    await app.openFirstFigure(); // ʿAntara ibn Shaddad — a multi-era lifecycle
    const svg = app.document.querySelector('.lifecycle-svg');
    assert.ok(svg, 'expected a scaled lifecycle timeline for the first figure');
    const xs = [...svg.querySelectorAll('circle')]
      .filter((c) => c.getAttribute('r') === '12') // NODE_R
      .map((c) => {
        const m = /translate\(([-\d.]+)/.exec(c.parentNode.getAttribute('transform') || '');
        return m ? parseFloat(m[1]) : null;
      })
      .filter((v) => v != null)
      .sort((a, b) => a - b);
    assert.ok(xs.length >= 2, `expected multiple lifecycle stages, got ${xs.length}`);
    let minGap = Infinity;
    for (let i = 1; i < xs.length; i++) minGap = Math.min(minGap, xs[i] - xs[i - 1]);
    assert.ok(minGap >= 24, `stage nodes overlap: min gap ${Math.round(minGap)}px < 24px node size`);
  });
});
