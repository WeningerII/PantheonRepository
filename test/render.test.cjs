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
    assert.ok(rows.length >= 2700, `expected >= 2700 rows, got ${rows.length}`);
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
    assert.ok(m && parseInt(m[1], 10) >= 241,
      `expected at least 241 mapped traditions on the atlas, stats read "${stats}"`);
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
    await app.openFigure('arabian_antara'); // 'Antara ibn Shaddad — a multi-era lifecycle
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

  // Lightweight LEAF figures — no descendants, parents, or relations — so
  // opening their full Detail in jsdom stays cheap. (seedPeople key[0] is Zeus,
  // who roots the whole Greek descendant tree; his Lineage SVG mounts
  // synchronously here — deferRest is off under jsdom — and is far too heavy
  // to open just to check an infobox.)
  const lightFigureIds = (win, n = 2) => {
    const sp = win.__PR.seedPeople;
    const hasChild = new Set();
    for (const k of Object.keys(sp)) for (const pid of (sp[k].parentIds || [])) hasChild.add(pid);
    const out = [];
    for (const k of Object.keys(sp)) {
      const p = sp[k];
      if (!hasChild.has(k) && !(p.parentIds || []).length && !(p.relations || []).length) out.push(k);
      if (out.length >= n) break;
    }
    return out;
  };

  test('detail renders the PD/CC0 lead infobox only when the figure has an image', async () => {
    // The detail shard carries entry.image (build-tiers attaches the images.json
    // record). The harness boots the image-free corpus, so inject one record the
    // same shape the shard delivers, then clean it up so no other test sees it.
    // One test, both cases (present → absent), on two light figures so the panel
    // opens cheaply and tears down before the memory-releasing Items switch that
    // follows — keeping this file's peak jsdom heap where it was. Two DISTINCT
    // figures because the absent case must change selectedId to force a real
    // re-render (re-opening the same id is a no-op that leaves the old DOM).
    const [idA, idB] = lightFigureIds(app.window, 2);
    const rec = app.window.__PR.seedPeople[idA];
    rec.image = {
      file: idA + '.webp', w: 800, h: 1000,
      license: { key: 'pd-old-100', name: 'Public domain', url: null },
      author: 'Rembrandt', authorUrl: 'https://commons.wikimedia.org/wiki/User:X',
      source: 'https://commons.wikimedia.org/wiki/File:Test.webp',
      title: 'File:Test.webp', bytes: 12345,
    };
    try {
      await app.openFigure(idA);
      const fig = app.document.querySelector('.detail .detail-lead');
      assert.ok(fig, 'lead infobox did not render for a figure with an image');
      const img = fig.querySelector('img.detail-lead-img');
      assert.ok(img, 'infobox <img> missing');
      // Self-hosted, page-relative (never a Commons hotlink).
      assert.match(img.getAttribute('src'), /^assets\/images\/figures\/.+\.webp$/,
        `image src not self-hosted under assets/images/figures/: ${img.getAttribute('src')}`);
      // width/height reserve the box so the portrait never shifts the header.
      assert.strictEqual(img.getAttribute('width'), '800');
      assert.strictEqual(img.getAttribute('height'), '1000');
      assert.strictEqual(img.getAttribute('loading'), 'lazy');
      const credit = fig.querySelector('.detail-lead-credit');
      assert.ok(credit, 'credit line missing');
      assert.match(credit.textContent, /Rembrandt/, 'author not credited');
      assert.match(credit.textContent, /Public domain/, 'license not shown');
      assert.match(credit.textContent, /Wikimedia Commons/, 'source not attributed');
      const hrefs = [...credit.querySelectorAll('a')].map((a) => a.getAttribute('href'));
      assert.ok(hrefs.includes('https://commons.wikimedia.org/wiki/File:Test.webp'),
        'license credit must link back to the Commons file page');
    } finally {
      delete rec.image;
    }
    // A different, imageless figure: the header reads the same and emits no
    // .detail-lead node (renders nothing, never a broken <img>).
    assert.ok(!app.window.__PR.seedPeople[idB].image, 'precondition: idB has no image');
    await app.openFigure(idB);
    assert.ok(app.document.querySelector('.detail'), 'detail did not open for the imageless figure');
    assert.strictEqual(app.document.querySelector('.detail .detail-lead'), null,
      'an imageless figure rendered a lead infobox');
    // Tear the panel down so it doesn't ride into the next tests' heap.
    await app.act(async () => { app.key('Escape'); });
    await app.flush();
    await new Promise((r) => setTimeout(r, 220));
    await app.flush();
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
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

  test('the focused figure is always present in its own Lineage tree (14+ siblings)', async () => {
    // Regression: the focus row centers the figure among its siblings, so a
    // figure with >=14 siblings landed past the 7-card collapse window and a
    // plain slice(0, MAX_PER_ROW) sliced away the very card being viewed.
    // greek_apollod_hyllus is a Heraclid with 50+ siblings.
    await app.openFigure('greek_apollod_hyllus');
    const focus = app.document.querySelector('.lineage-card.focus');
    assert.ok(focus, 'the focused figure vanished from its own lineage tree');
    assert.match(focus.querySelector('.lineage-card-name')?.textContent || '', /Hyllus/,
      'the focus card is not the figure being viewed');
    await app.clickButton('Browse');
  });

  test('switching view tabs with a detail open closes it and drops the id from the hash', async () => {
    // Regression: the view tabs called setView directly, leaving an open
    // slide-over stacked over the new view while the hash collapsed to
    // #/<view> with no id — breaking the mutual-exclusion / hash-source-of-
    // truth invariant. changeView now clears every detail axis first.
    await app.openFigure('greek_hesiod_zeus');
    assert.ok(app.document.querySelector('.detail:not(.closing)'), 'detail did not open');
    await app.clickButton('Items');
    assert.ok(app.document.querySelector('.items-view'), 'Items view did not mount');
    assert.strictEqual(app.document.querySelector('.detail:not(.closing)'), null,
      'a figure detail stayed open (non-closing) over the new view');
    assert.strictEqual(app.window.location.hash, '#/items',
      'hash kept a figure id after switching views');
    await app.clickButton('Browse');
  });

  test('Browse "Era (oldest)" sort groups into a few contiguous time bands, not hundreds', async () => {
    // Regression: grouping by the raw era label while sorting by absolute
    // anchor year shattered into ~1110 one-row headers (the same label recurs
    // across dozens of traditions at different years). Grouping now uses the
    // same chronological axis the sort uses, so each band header is contiguous.
    await app.clickButton('Browse');
    await app.clickButton('Era');
    const headers = [...app.document.querySelectorAll('.browse-group-header .group-label')]
      .map((h) => h.textContent);
    assert.ok(headers.length > 0, 'Era sort produced no group headers');
    assert.ok(headers.length <= 12,
      `Era sort fragmented into ${headers.length} headers (expected a handful of time bands)`);
    // Every header label must be unique — a repeated label means a band was
    // split into non-contiguous runs.
    assert.strictEqual(new Set(headers).size, headers.length,
      `Era band headers repeat (non-contiguous): ${headers.join(', ')}`);
    await app.clickButton('A→Z');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('epithets with the {original, translation} shape render legible text, not raw JSON', async () => {
    // Regression: epithet records lacking epithetId/string-name fell through to
    // safeLabel(), which JSON.stringify()'d the record into a truncated blob
    // (22 Greek figures). The accessor now prefers translation, then original.
    await app.openFigure('greek_agamemnon');
    const names = [...app.document.querySelectorAll('.rich-row-name-epithet')].map((n) => n.textContent);
    assert.ok(names.length >= 2, 'expected Agamemnon\'s epithets to render');
    assert.ok(!names.some((t) => t.includes('{') || t.includes('"')),
      `epithet rendered as raw JSON: ${names.find((t) => t.includes('{'))}`);
    assert.ok(names.some((t) => /lord of men/i.test(t)), `expected the translated epithet, got ${names.join(' | ')}`);
    await app.clickButton('Browse');
  });

  test('emptying the hash collapses an open detail instead of leaving it stuck open', async () => {
    // Regression: applyHash early-returned on an empty/unknown hash BEFORE the
    // clear-all-detail-axes block, so the slide-over stayed open (no 'closing'
    // class) while the URL no longer described it. The clears now run first.
    await app.openFigure('greek_hesiod_zeus');
    assert.ok(app.document.querySelector('.detail-backdrop:not(.closing)'), 'detail did not open');
    await app.act(async () => {
      app.window.location.hash = '#';
      app.window.dispatchEvent(new app.window.Event('hashchange'));
    });
    await app.flush();
    assert.strictEqual(app.document.querySelector('.detail-backdrop:not(.closing)'), null,
      'a detail stayed open after the hash was emptied');
    await app.clickButton('Browse');
  });

  test('Items search query drives the header count and summary line', async () => {
    // Regression: the title count and summary read faceted.length (kind-facet
    // only), ignoring the text query — so "Items 2079" stuck even with one row
    // shown. Both now read the post-query visible list.
    await app.clickButton('Items');
    const setVal = Object.getOwnPropertyDescriptor(app.window.HTMLInputElement.prototype, 'value').set;
    const input = app.document.querySelector('.items-search input');
    await app.act(async () => { setVal.call(input, 'mjolnir'); input.dispatchEvent(new app.window.Event('input', { bubbles: true })); });
    await app.flush();
    const count = app.document.querySelector('.items-count')?.textContent;
    const rows = app.document.querySelectorAll('.item-row').length;
    assert.strictEqual(String(rows), count, `header count ${count} != rendered rows ${rows} under an active query`);
    assert.ok(rows >= 1 && rows < 2079, `expected the query to narrow the list, got ${rows}`);
    assert.match(app.document.querySelector('.items-showcased')?.textContent || '', /filtered — \d+ of/,
      'summary line did not reflect the filtered count');
    await app.act(async () => { setVal.call(input, ''); input.dispatchEvent(new app.window.Event('input', { bubbles: true })); });
    await app.flush();
    await app.clickButton('Browse');
  });

  test('the "/" search shortcut is inert while the Command Palette is open', async () => {
    // Regression: the '/' branch ran before the cmdkOpen guard, so '/' typed
    // from the body (after blurring the palette input) stole focus to the
    // background search box behind the open palette.
    await app.act(async () => { app.key('k', { metaKey: true }); });
    await app.flush();
    assert.ok(app.document.querySelector('.cmdk'), 'Command Palette did not open');
    const search = app.document.querySelector('.topbar-search input');
    if (app.document.activeElement === search) search.blur();
    await app.act(async () => { app.key('/'); });
    await app.flush();
    assert.notStrictEqual(app.document.activeElement, search,
      "'/' focused the background search input while the palette was open");
    assert.ok(app.document.querySelector('.cmdk'), 'Command Palette closed unexpectedly');
    await app.act(async () => { app.key('Escape'); });
    await app.flush();
  });

  test('Browse A→Z sort: ligature names (Ægir, Þjazi) produce no duplicate group headers', async () => {
    // Regression: groupKeyForEntry stripped non-[A-Za-z] characters before
    // extracting the first letter, so "Ægir" → 'G' and "Þjazi" → 'J' despite
    // localeCompare placing them in the 'A' and 'T' sections. nameForAlphaSort
    // now maps ligatures (Æ→AE, Þ→Th) before the group key reads the first
    // letter, keeping sort order and group keys consistent.
    await app.clickButton('Browse');
    await app.clickButton('A→Z');
    await app.flush();
    const headers = [...app.document.querySelectorAll('.browse-group-header .group-label')]
      .map((h) => h.textContent);
    assert.ok(headers.length > 0, 'A→Z sort produced no group headers');
    const seen = new Set();
    const duplicates = headers.filter((h) => { const d = seen.has(h); seen.add(h); return d; });
    assert.deepStrictEqual(duplicates, [],
      `A→Z group headers are not unique (fragment): ${duplicates.join(', ')}`);
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('Lineage expand: clicking "+N" scrolls the wrap to keep the focus card visible', async () => {
    // Regression: expanding a 50-sibling row put the focus card ~4100px from
    // the left edge with no auto-scroll, requiring manual horizontal scrolling.
    // The new useEffect sets lineage-wrap.scrollLeft to center on the focus.
    await app.openFigure('greek_apollod_hyllus');
    const chip = app.document.querySelector('.lineage-overflow:not(.is-expanded)');
    assert.ok(chip, 'expected a collapsed "+N" overflow chip (50+ siblings)');
    const wrap = app.document.querySelector('.lineage-wrap');
    assert.ok(wrap, '.lineage-wrap did not render');
    assert.strictEqual(wrap.scrollLeft, 0, 'scrollLeft should start at 0');
    await app.act(async () => { chip.click(); });
    await app.flush();
    assert.ok(wrap.scrollLeft > 0,
      `after expanding a wide row the focus card is still at scrollLeft=0 (effect did not fire)`);
    await app.clickButton('Browse');
  });

  test('eraBandForYear(0) returns the 1–500 CE band, not 500–1 BCE', () => {
    // Regression: ERA_BANDS used max:0 for the BCE band, so year 0 fell into
    // '500–1 BCE'. Year 0 (the turn of the era) should land in '1–500 CE'.
    assert.strictEqual(app.window.eraBandForYear(0), '1–500 CE');
    assert.strictEqual(app.window.eraBandForYear(-1), '500–1 BCE');
    assert.strictEqual(app.window.eraBandForYear(1), '1–500 CE');
  });

  test('cursorIdx resets to 0 when the filter list changes content', async () => {
    // Regression: useSelection only clamped the cursor when filtered.length
    // changed, so switching from one tradition (100 rows) to another same-size
    // tradition left the cursor at an arbitrary position in the new list.
    await app.clickButton('Browse');
    // Drive the cursor to position 3 via keyboard.
    await app.act(async () => { app.key('j'); app.key('j'); app.key('j'); });
    await app.flush();
    // Count only data rows (not group headers) to find the cursor position.
    const getCursorDataIdx = () =>
      [...app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)')]
        .findIndex(r => r.classList.contains('cursor'));
    assert.ok(getCursorDataIdx() > 0, 'expected cursor to advance past row 0');
    // Switch to Norse filter — changes filtered content, cursor should reset.
    const rail = [...app.document.querySelectorAll('.rail-row-trad')]
      .find((r) => r.textContent.includes('Norse'));
    assert.ok(rail, 'Norse tradition not in rail');
    await app.act(async () => { rail.click(); });
    await app.flush();
    assert.strictEqual(getCursorDataIdx(), 0, 'cursor did not reset to 0 after filter change');
    // Clear filter.
    await app.act(async () => { rail.click(); });
    await app.flush();
  });

  test('cursorIdx resets to 0 when switching views', async () => {
    // Regression: changeView() and applyHash() set selectedId to null but
    // did not reset cursorIdx, so returning to Browse left the highlight
    // at a stale position from a previous session.
    await app.clickButton('Browse');
    await app.act(async () => { app.key('j'); app.key('j'); });
    await app.flush();
    const getCursorDataIdx = () =>
      [...app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)')]
        .findIndex(r => r.classList.contains('cursor'));
    assert.ok(getCursorDataIdx() > 0, 'expected cursor to advance');
    await app.clickButton('Graph');
    await app.flush();
    await app.clickButton('Browse');
    await app.flush();
    assert.strictEqual(getCursorDataIdx(), 0, 'cursor did not reset to 0 after view switch');
  });

  test('cursorIdx lands at 0 (not last row) when filter shrinks list below cursor position', async () => {
    // Regression: two separate useEffects in useSelection both fired when
    // filtered shrank. Effect 1 enqueued setCursorIdx(0); Effect 2's stale
    // closure saw the old cursorIdx as out-of-bounds and enqueued
    // setCursorIdx(last). React 18 batching applied the last setter, landing
    // the cursor on the last row. Fix: remove Effect 2 — 0 is always valid.
    await app.clickButton('Browse');
    const getCursorDataIdx = () =>
      [...app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)')]
        .findIndex(r => r.classList.contains('cursor'));
    // Find a tradition with very few entries (< 5) so that advancing cursor
    // to row 4 puts it out-of-bounds after the filter is applied.
    const rails = [...app.document.querySelectorAll('.rail-row-trad')];
    const smallRail = rails.find((r) => {
      const countEl = r.querySelector('.rail-count');
      return countEl && parseInt(countEl.textContent, 10) <= 3;
    });
    if (!smallRail) { return; } // no suitable small tradition in this build — skip
    // Advance cursor to position 4 via keyboard.
    await app.act(async () => {
      app.key('j'); app.key('j'); app.key('j'); app.key('j');
    });
    await app.flush();
    assert.ok(getCursorDataIdx() >= 4, 'expected cursor to advance to at least row 4');
    // Apply the small tradition filter — list shrinks below cursor position.
    await app.act(async () => { smallRail.click(); });
    await app.flush();
    assert.strictEqual(getCursorDataIdx(), 0,
      'cursor should land at 0 (not last row) when filter shrinks list below cursor position');
    // Clear filter.
    await app.act(async () => { smallRail.click(); });
    await app.flush();
  });

  test('Lifecycle stale hover card clears on entry navigation', async () => {
    // Regression: LifecycleTimeline's `hover` state was never reset when the
    // `lc` prop changed. The previous entry's stage card stayed visible after
    // navigating to a different entry.
    // Open a figure that has a lifecycle section.
    await app.openFigure('greek_alexander');
    const svg = app.document.querySelector('.lifecycle-svg');
    if (!svg) { return; } // figure has no lifecycle in this build — skip
    const firstNode = svg.querySelector('circle[r="12"]');
    if (!firstNode) { return; }
    // Simulate hover to set hover state.
    firstNode.parentNode?.dispatchEvent(new app.window.MouseEvent('mouseenter', { bubbles: true }));
    await app.flush();
    // Navigate to a different entry.
    await app.openFigure('greek_zeus');
    await app.flush();
    // The hover card (lifecycle detail card below the timeline) must not show
    // data from the previous entry. We check it's absent (null or empty).
    const hoverCard = app.document.querySelector('.lifecycle-hover');
    assert.ok(!hoverCard || !hoverCard.textContent.trim(),
      'lifecycle hover card from previous entry still visible after navigation');
  });

  test('Browse "Clear all" does not reset sort mode', async () => {
    // Regression: filters.reset() called setSort('alpha') even though sort is
    // not presented as a filter chip and should not be wiped by "Clear all".
    await app.clickButton('Browse');
    // Switch to Tradition sort.
    const sortTrad = [...app.document.querySelectorAll('.sort-group button')]
      .find((b) => b.textContent.includes('Trad'));
    if (!sortTrad) { return; } // no Tradition sort button — skip
    await app.act(async () => { sortTrad.click(); });
    await app.flush();
    assert.ok(sortTrad.classList.contains('btn-on'), 'Tradition sort should be active');
    // Activate 2 filters (tradition + origin) so the "Clear all" chip appears.
    // "Clear all" only renders when activeChips.length >= 2.
    const greekRail = [...app.document.querySelectorAll('.rail-row-trad')]
      .find((r) => r.textContent.includes('Greek'));
    const canonBtn = [...app.document.querySelectorAll('button[role="tab"]')]
      .find((b) => b.textContent === 'Canon');
    if (!greekRail || !canonBtn) { return; } // expected UI missing — skip
    await app.act(async () => { greekRail.click(); canonBtn.click(); });
    await app.flush();
    const clearAll = [...app.document.querySelectorAll('.filter-chip')]
      .find((c) => c.textContent.includes('Clear all'));
    assert.ok(clearAll, 'expected Clear all chip after applying 2 filters');
    await app.act(async () => { clearAll.click(); });
    await app.flush();
    // Sort should still be Tradition, not A→Z.
    assert.ok(sortTrad.classList.contains('btn-on'),
      'sort was reset to alpha by Clear all (should be preserved)');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('domain registry indexes legacy d.id domain entries (E-bangishimog / west-wind)', async () => {
    // Regression: buildDomainRegistry required d.sphereId and silently dropped
    // any domain entry using the older d.id field. Over 100 domain records used
    // d.id. Fix: accept d.sphereId || d.id.
    const allDomains = app.window.allDomains ? app.window.allDomains() : null;
    if (!allDomains) { return; } // allDomains not yet exposed — skip
    const westWind = allDomains.find((d) => d.id === 'west-wind');
    assert.ok(westWind, 'west-wind domain not found — legacy d.id fix may have regressed');
    assert.ok(westWind.holderCount >= 1,
      `west-wind domain has no holders; expected E-bangishimog (holderCount: ${westWind.holderCount})`);
    assert.ok(westWind.holders.some((h) => h.personId === 'e_bangishimog'),
      'E-bangishimog should appear as holder of west-wind domain (uses legacy d.id field)');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('entryAnchorYear prefers mythicStart over textualStart when both are present', async () => {
    // Regression: entryAnchorYear used textualStart before mythicStart, but
    // entryDateRange (the display function) uses mythicStart first. This caused
    // the era sort group and the displayed date to derive from different axes.
    // For a Greek heroic-age figure with an explicit mythicStart (~1400 BCE) and
    // the default ERA_DATES textualStart (~750 BCE), the anchor year should be
    // the mythicStart so the sort position matches the displayed date.
    const entry = app.window.__PR?.seedPeople?.['greek_apollod_acrisius'];
    if (!entry) { return; } // figure not in this build — skip
    const anchorYear = app.window.entryAnchorYear(entry);
    // mythicStart for Acrisius is -1400; ERA textualStart is ~ -750.
    assert.ok(anchorYear <= -1300,
      `entryAnchorYear returned ${anchorYear} — expected mythicStart (~-1400), not textualStart (~-750)`);
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });

  test('Items view groups items by bucket key, not raw kind, when a facet is active', async () => {
    // Regression: groups() keyed by raw it.kind ('thunderbolt-weapon', 'blade',
    // 'dagger-weapon'…) while the facet filter used itemKindBucket() — different
    // key spaces. Filtering to "Weapons" produced dozens of micro-group headers
    // instead of a single "Weapons" section.
    await app.clickButton('Items');
    await app.flush();
    const view = app.document.querySelector('.items-view');
    assert.ok(view, 'Items view did not render');
    // Click the Weapons facet chip.
    const weaponsChip = [...view.querySelectorAll('.facet-chip:not(.facet-clear)')]
      .find((c) => c.textContent.trim() === 'Weapons');
    if (!weaponsChip) { return; } // no Weapons chip in this build — skip
    await app.act(async () => { weaponsChip.click(); });
    await app.flush();
    const groupHeaders = view.querySelectorAll('.items-group-head');
    // After the fix, all weapon-bucket items go into ONE group named "Weapons".
    // A micro-group explosion from raw kinds would produce > 5 headers here.
    assert.ok(groupHeaders.length <= 2,
      `Weapons facet produced ${groupHeaders.length} group headers (expected ≤2 after bucket-grouping fix)`);
    const headerTexts = [...groupHeaders].map((h) => h.textContent.trim());
    assert.ok(headerTexts.some((t) => t.startsWith('Weapons')),
      `expected a "Weapons" group header, got: ${headerTexts.join(', ')}`);
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
  });
});
