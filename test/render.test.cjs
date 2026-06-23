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

  test('renders the full figure corpus in the Browse table (growing)', () => {
    // The corpus is deliberately expanding as missing central figures are added;
    // assert a floor rather than an exact count (mirrors seed.test.cjs).
    const rows = app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)');
    assert.ok(rows.length >= 1845, `expected >= 1845 rows, got ${rows.length}`);
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
    // The populated branch specifically — the `.graph-empty` placeholder must
    // not satisfy this test, or an emptied default graph regresses silently.
    const gsvg = app.document.querySelector('.graph-canvas svg');
    assert.ok(gsvg, 'graph svg did not mount');
    assert.ok(gsvg.querySelectorAll('circle').length >= 20,
      `expected a populated default graph, got ${gsvg.querySelectorAll('circle').length} nodes`);
    await app.clickButton('Atlas');
    // Real territory polygons, not the basemap-error placeholder (the harness
    // serves a basemap fixture, so a placeholder here means Atlas broke).
    const asvg = app.document.querySelector('.atlas-canvas svg');
    assert.ok(asvg, 'atlas svg did not mount');
    assert.ok(asvg.querySelectorAll('path').length >= 250,
      `expected territory polygons on the map, got ${asvg.querySelectorAll('path').length} paths`);
    // EVERY tradition renders: the stats line counts renderedTraditions, and
    // a stale-storage or projection regression that drops coverage must fail
    // here, not in a user's screenshot.
    const stats = app.document.querySelector('.atlas-stats')?.textContent || '';
    const m = stats.match(/(\d+)\s*traditions/);
    assert.ok(m && parseInt(m[1], 10) >= 238,
      `expected all 238 mapped traditions on the atlas, stats read "${stats}"`);
    await app.clickButton('Browse');
    assert.ok(app.document.querySelector('.browse-table'), 'did not return to browse');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('rail-filtering to a backfilled tradition still shows it on the atlas', async () => {
    // Screenshot regression: selecting only wave-6b traditions in the rail
    // showed "0 traditions · 0 polygons" when the browser held a stale atlas.
    // With a current atlas, a filter of one new tradition must render it.
    const rail = [...app.document.querySelectorAll('.rail-row-trad')]
      .find((r) => r.textContent.includes('Cherokee'));
    assert.ok(rail, 'Cherokee not in the tradition rail');
    await app.act(async () => { rail.click(); });
    await app.flush();
    await app.clickButton('Atlas');
    const stats = app.document.querySelector('.atlas-stats')?.textContent || '';
    assert.match(stats, /1\s*traditions/, `filtered atlas stats read "${stats}"`);
    assert.ok(app.document.querySelectorAll('.atlas-canvas svg path').length > 3,
      'the filtered tradition rendered no polygons');
    // Clear the filter and return to Browse for the tests that follow.
    await app.act(async () => { rail.click(); });
    await app.flush();
    await app.clickButton('Browse');
  });

  test('the corpus exceeds the localStorage quota: people unpersisted, atlas still persists', () => {
    // Regression guard for the seeding split: the people write always throws
    // QuotaExceededError at this corpus size (the app must run from the
    // in-memory seed), but the 60 KB atlas write sits in its own try block
    // and must succeed — it used to be vetoed by sharing the people write's
    // try block.
    const PEOPLE_KEY = app.window.__PR.PEOPLE_KEY;
    const ATLAS_KEY = app.window.__PR.ATLAS_KEY;
    assert.strictEqual(app.window.localStorage.getItem(PEOPLE_KEY), null,
      'people corpus unexpectedly fit in localStorage — quota fallback no longer exercised');
    assert.ok(app.window.localStorage.getItem(ATLAS_KEY),
      'atlas seed did not persist despite fitting the quota');
    const rows = app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)');
    assert.ok(rows.length > 0, 'in-memory fallback did not feed the UI');
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
    assert.ok(view.querySelectorAll('.item-row').length >= 1240, 'expected the object corpus in the index');
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

  // The detail panels animate out for ~180ms after close before unmounting.
  const settle = async () => {
    await app.flush();
    await new Promise((r) => setTimeout(r, 220));
    await app.flush();
  };

  test('keyboard: Escape closes the open detail (cascade level 1)', async () => {
    assert.ok(app.document.querySelector('.detail'), 'precondition: a detail is open');
    await app.act(async () => { app.key('Escape'); });
    await settle();
    assert.ok(!app.document.querySelector('.detail'), 'Escape did not close the detail');
  });

  test('keyboard: j/k move the table cursor and Enter opens that row', async () => {
    await app.clickButton('Browse');
    await app.act(async () => { app.key('j'); });
    await app.act(async () => { app.key('j'); });
    await app.act(async () => { app.key('k'); });
    await app.flush();
    const cursorRow = app.document.querySelector('.browse-table tbody tr.cursor');
    assert.ok(cursorRow, 'expected a cursor row after j/j/k');
    const cursorName = cursorRow.querySelector('.name-text')?.textContent;
    await app.act(async () => { app.key('Enter'); });
    await app.flush();
    const detail = app.document.querySelector('.detail');
    assert.ok(detail, 'Enter did not open the cursor row');
    assert.strictEqual(detail.querySelector('h1')?.textContent, cursorName,
      'Enter opened a different figure than the cursor row');

    // With a detail open, j steps the selection to the next filtered entry.
    const before = detail.querySelector('h1')?.textContent;
    await app.act(async () => { app.key('j'); });
    await app.flush();
    const after = app.document.querySelector('.detail h1')?.textContent;
    assert.notStrictEqual(after, before, 'j did not step the open detail');
    await app.act(async () => { app.key('Escape'); });
    await settle();
  });

  test('keyboard: ctrl+K opens the palette (parity with meta+K)', async () => {
    await app.act(async () => { app.key('k', { ctrlKey: true }); });
    assert.ok(app.document.querySelector('.cmdk'), 'ctrl+K did not open the palette');
    await app.act(async () => { app.key('Escape'); });
    await app.flush();
    assert.ok(!app.document.querySelector('.cmdk'), 'Escape did not close the palette');
  });

  test('#/atlas/<tradition> deep-links to a focused territory', async () => {
    await app.act(async () => {
      app.window.location.hash = '#/atlas/' + encodeURIComponent('Greek');
      app.window.dispatchEvent(new app.window.Event('hashchange'));
    });
    await app.flush();
    const chip = app.document.querySelector('.graph-focused-label');
    assert.ok(chip, 'focus chip did not render for the deep link');
    assert.match(chip.textContent, /Greek/, 'deep link focused the wrong tradition');
    // Clear focus + return to browse for the tests that follow.
    await app.act(async () => {
      app.window.location.hash = '#/browse';
      app.window.dispatchEvent(new app.window.Event('hashchange'));
    });
    await app.flush();
  });

  test('atlas geometry: rings wind spherically and smoothing stays inside the hull', () => {
    const { chaikinSmooth, ringToFeature } = app.window.__atlasGeo;
    const d3 = app.window.d3;
    // A small Mediterranean box, authored in either direction, must come out
    // as a SMALL spherical polygon — the wrong winding denotes the rest of
    // the globe and floods the world with one territory's fill.
    const ring = [[10, 35], [25, 35], [25, 45], [10, 45], [10, 35]];
    for (const candidate of [ring, ring.slice().reverse()]) {
      const f = ringToFeature(candidate, false);
      assert.ok(f, 'feature not built');
      assert.ok(d3.geoArea(f) < Math.PI / 2,
        `ring wound to cover ${d3.geoArea(f).toFixed(2)} sr — flooded the globe`);
    }
    // Chaikin: corner-cutting quadruples the point count over two passes and,
    // being a convex combination, can never leave the hull's bounding box.
    const smooth = chaikinSmooth(ring);
    assert.ok(smooth.length >= (ring.length - 1) * 4 - 2, 'smoothing lost points');
    for (const [lon, lat] of smooth) {
      assert.ok(lon >= 10 && lon <= 25 && lat >= 35 && lat <= 45,
        `smoothed point (${lon},${lat}) escaped the authored hull`);
    }
  });

  test('item detail Prev/Next follows the on-screen index order', async () => {
    await app.clickButton('Items');
    const rows = [...app.document.querySelectorAll('.item-row')];
    assert.ok(rows.length > 2, 'expected an item index');
    await app.act(async () => { rows[0].click(); });
    await app.flush();
    assert.ok(app.document.querySelector('.item-detail'), 'item detail did not open');
    await app.act(async () => { app.key('j'); });
    await app.flush();
    const steppedTo = app.document.querySelector('.item-detail h1')?.textContent;
    const expected = rows[1].querySelector('.item-row-name')?.textContent;
    assert.strictEqual(steppedTo, expected,
      'j stepped to an item that is not the next on-screen row');
    await app.act(async () => { app.key('Escape'); });
    await settle();
  });

  test('the Powers view lists the power registry, grouped, flagging heritable powers', async () => {
    await app.clickButton('Powers');
    const view = app.document.querySelector('.powers-view');
    assert.ok(view, 'Powers view did not mount');
    assert.ok(view.querySelectorAll('.power-index-row').length >= 2000, 'expected the power corpus in the index');
    assert.ok(view.querySelector('.items-group'), 'expected grouped index');
    assert.ok(view.querySelector('.power-badge-descent'), 'expected at least one power flagged with a descent badge');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('a power detail traces its bearers and genealogical descent', async () => {
    await app.act(async () => {
      app.window.location.hash = '#/powers/' + encodeURIComponent('physical-strength-extreme');
      app.window.dispatchEvent(new app.window.Event('hashchange'));
    });
    await app.flush();
    const detail = app.document.querySelector('.power-detail');
    assert.ok(detail, 'power detail did not open');
    assert.ok(detail.querySelector('.section-power-bearers'), 'expected the wielded-by (declarers) section');
    const descent = detail.querySelector('.section-power-descent');
    assert.ok(descent, 'Descent section did not render');
    assert.ok(descent.querySelector('.power-descent-step'), 'expected at least one inheritance edge');
    assert.match(descent.textContent, /via/, 'descent edges name the ancestor the power descends from');
    await app.act(async () => { app.key('Escape'); });
    await settle();
  });

  test('the Domains view lists the sphere registry', async () => {
    await app.clickButton('Domains');
    const view = app.document.querySelector('.domains-view');
    assert.ok(view, 'Domains view did not mount');
    assert.ok(view.querySelectorAll('.domain-index-row').length >= 1200, 'expected the sphere corpus in the index');
    assert.ok(view.querySelector('.items-group'), 'expected grouped index');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('a domain detail lists the figures who govern the sphere', async () => {
    await app.act(async () => {
      app.window.location.hash = '#/domains/' + encodeURIComponent('war');
      app.window.dispatchEvent(new app.window.Event('hashchange'));
    });
    await app.flush();
    const detail = app.document.querySelector('.domain-detail');
    assert.ok(detail, 'domain detail did not open');
    const govs = detail.querySelector('.section-domain-govs');
    assert.ok(govs, 'governed-by section did not render');
    assert.ok(govs.querySelectorAll('.domain-gov').length >= 2, 'expected multiple governing figures for war');
    await app.act(async () => { app.key('Escape'); });
    await settle();
    await app.clickButton('Browse');
  });

  test('the left-rail tradition filter narrows Items, Powers, and Domains', async () => {
    // Regression: these three registries were built from the full corpus and
    // ignored the rail, so selecting a pantheon did nothing (while it scopes
    // Browse / Graph / Atlas). Each must now narrow to entries with a connected
    // figure in the filtered set, and surface a "filtered — N of M" count.
    const greekRow = () => [...app.document.querySelectorAll('.rail-row-trad')]
      .find((r) => r.textContent.includes('Greek'));
    for (const [tab, view, rowSel] of [
      ['Items', '.items-view', '.item-row'],
      ['Powers', '.powers-view', '.power-index-row'],
      ['Domains', '.domains-view', '.domain-index-row'],
    ]) {
      await app.clickButton(tab);
      const before = app.document.querySelectorAll(rowSel).length;
      assert.ok(before > 0, `${tab} index did not populate`);
      const row = greekRow();
      assert.ok(row, 'Greek not in the tradition rail');
      await app.act(async () => { row.click(); });
      await app.flush();
      const after = app.document.querySelectorAll(rowSel).length;
      assert.ok(after > 0 && after < before,
        `${tab} did not narrow on the Greek filter (${before} -> ${after})`);
      assert.match(
        app.document.querySelector(view + ' .items-showcased')?.textContent || '',
        /filtered/, `${tab} header did not show the filtered count`);
      await app.act(async () => { greekRow().click(); });  // clear for next iteration
      await app.flush();
    }
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('view-specific facets (kind / heritability / context) narrow each registry', async () => {
    // The raw fields are messy free text (118 item kinds, dozens of heritability
    // phrasings, lifelong-dominated contexts); each view canonicalizes them into
    // a small bucket set offered as multi-select chips. Assert the bar renders,
    // a known bucket narrows the list, toggles active, and clear restores it.
    for (const [tab, view, rowSel, expectChip] of [
      ['Items', '.items-view', '.item-row', 'Weapons'],
      ['Powers', '.powers-view', '.power-index-row', 'Full'],
      ['Domains', '.domains-view', '.domain-index-row', 'Lifelong'],
    ]) {
      await app.clickButton(tab);
      const chipFor = (text) => [...app.document.querySelectorAll(view + ' .facet-chip:not(.facet-clear)')]
        .find((c) => c.textContent.includes(text));
      assert.ok(app.document.querySelector(view + ' .facet-bar'), `${tab} facet bar did not render`);
      assert.ok(app.document.querySelectorAll(view + ' .facet-chip:not(.facet-clear)').length >= 3,
        `${tab} expected several facet chips`);
      const target = chipFor(expectChip);
      assert.ok(target, `${tab} facet "${expectChip}" not offered`);
      const before = app.document.querySelectorAll(rowSel).length;
      await app.act(async () => { target.click(); });
      await app.flush();
      const after = app.document.querySelectorAll(rowSel).length;
      assert.ok(after > 0 && after < before, `${tab} facet did not narrow (${before} -> ${after})`);
      assert.strictEqual(chipFor(expectChip)?.getAttribute('aria-pressed'), 'true',
        `${tab} chip did not toggle active`);
      await app.act(async () => { app.document.querySelector(view + ' .facet-clear')?.click(); });
      await app.flush();
      assert.strictEqual(app.document.querySelectorAll(rowSel).length, before,
        `${tab} clear did not restore the full list`);
    }
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });
});
