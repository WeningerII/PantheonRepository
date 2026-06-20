// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY SCENARIO SUITE — realistic end-to-end journeys, one per major
// capability, driven through the real app booted in jsdom (test/helpers/boot.cjs).
//
// METHODOLOGY
//   • Success criteria: each scenario states a single, observable criterion and
//     asserts it. Evaluation method is binary PASS/FAIL (an assertion either
//     holds or throws) — no partial credit, no rubric weighting.
//   • Same conditions: read-only journeys share one clean boot and each resets to
//     a known route before acting; persistence journeys each get their own fresh
//     boot with storage staged before data.js runs (the only way to exercise the
//     load branches the corpus-size quota failure otherwise hides).
//   • Evidence: every scenario records {id, capability, criterion, status,
//     observed} into EVIDENCE; an `after` hook writes test/scenarios/REPORT.md.
//   • Quality bar: 100% of scenarios PASS. A FAIL re-throws so `node --test`
//     (and CI) is red until the underlying cause is fixed.
// ─────────────────────────────────────────────────────────────────────────────
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { bootApp } = require('./helpers/boot.cjs');

const EVIDENCE = [];
const rows = (app) => app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)').length;
const setInputValue = (app, el, val) => {
  const setter = Object.getOwnPropertyDescriptor(app.window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, val);
  el.dispatchEvent(new app.window.Event('input', { bubbles: true }));
};
const toBrowse = async (app) => {
  await app.act(async () => { app.window.location.hash = '#/browse'; app.window.dispatchEvent(new app.window.Event('hashchange')); });
  await app.flush();
};
const settle = async (app) => { await app.flush(); await new Promise((r) => setTimeout(r, 220)); await app.flush(); };

function writeReport() {
  const pass = EVIDENCE.filter((e) => e.status === 'PASS').length;
  const lines = [];
  lines.push('# Capability scenario report');
  lines.push('');
  lines.push('Evaluation: binary PASS/FAIL via assertions over the real app booted in jsdom.');
  lines.push(`Quality bar: every scenario PASS. **Result: ${pass}/${EVIDENCE.length} passed.**`);
  lines.push('');
  lines.push('| ID | Capability | Criterion | Result | Evidence |');
  lines.push('|----|-----------|-----------|--------|----------|');
  for (const e of EVIDENCE.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    const ev = String(e.observed || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 160);
    lines.push(`| ${e.id} | ${e.capability} | ${e.criterion} | ${e.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${ev} |`);
  }
  lines.push('');
  fs.writeFileSync(path.join(__dirname, 'scenarios', 'REPORT.md'), lines.join('\n'));
}

describe('Pantheon Registry — capability scenarios', () => {
  let app;
  before(async () => { app = await bootApp(); });
  after(() => { try { writeReport(); } finally { app?.close?.(); } });

  // Registers a scenario against the shared boot; records evidence either way.
  const S = (id, capability, criterion, fn) => test(`${id} — ${criterion}`, async () => {
    try {
      const observed = await fn(app);
      EVIDENCE.push({ id, capability, criterion, status: 'PASS', observed });
    } catch (e) {
      EVIDENCE.push({ id, capability, criterion, status: 'FAIL', observed: String(e && e.message || e) });
      throw e;
    }
  });
  // Same, but the scenario boots (and closes) its own instance.
  const SB = (id, capability, criterion, fn) => test(`${id} — ${criterion}`, async () => {
    try {
      const observed = await fn();
      EVIDENCE.push({ id, capability, criterion, status: 'PASS', observed });
    } catch (e) {
      EVIDENCE.push({ id, capability, criterion, status: 'FAIL', observed: String(e && e.message || e) });
      throw e;
    }
  });

  S('S01', 'Boot & data load', 'app boots to completion with zero runtime errors', async (app) => {
    assert.ok(app.window.__bootDone, 'boot did not complete');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
    return 'bootDone=true, errors=0';
  });

  S('S02', 'Browse', 'the full corpus renders as table rows', async (app) => {
    await toBrowse(app);
    const n = rows(app);
    assert.ok(n >= 1900, `expected >= 1900 rows, got ${n}`);
    return `${n} figure rows`;
  });

  S('S03', 'Search / filter', 'typing in search narrows the table; clearing restores it', async (app) => {
    await toBrowse(app);
    const full = rows(app);
    const input = app.document.querySelector('[aria-label="Search registry"]');
    assert.ok(input, 'search input not found');
    await app.act(async () => { setInputValue(app, input, 'thor'); });
    await app.flush();
    const filtered = rows(app);
    assert.ok(filtered > 0 && filtered < full, `filter did not narrow: ${filtered} vs ${full}`);
    assert.match(app.document.querySelector('.browse-table').textContent, /Thor/i, 'no Thor match in filtered table');
    await app.act(async () => { setInputValue(app, input, ''); });
    await app.flush();
    assert.strictEqual(rows(app), full, `clearing did not restore (${rows(app)} vs ${full})`);
    return `full=${full}, "thor"→${filtered}, restored=${full}`;
  });

  S('S04', 'Command palette', 'Cmd+K and Ctrl+K open the palette, Esc closes it', async (app) => {
    await app.act(async () => { app.key('k', { metaKey: true }); });
    assert.ok(app.document.querySelector('.cmdk'), 'Cmd+K did not open');
    await app.act(async () => { app.key('Escape'); });
    await app.flush();
    assert.ok(!app.document.querySelector('.cmdk'), 'Esc did not close');
    await app.act(async () => { app.key('k', { ctrlKey: true }); });
    assert.ok(app.document.querySelector('.cmdk'), 'Ctrl+K did not open (parity)');
    await app.act(async () => { app.key('Escape'); });
    await app.flush();
    return 'meta+K open, Esc close, ctrl+K open';
  });

  S('S05', 'Detail — core boxes', 'a figure detail renders powers and material culture', async (app) => {
    await app.openFigure('greek_apollod_heracles');
    assert.ok(app.document.querySelector('.detail'), 'detail did not open');
    assert.ok(app.document.querySelector('.section-powers .power-row'), 'no powers rendered');
    assert.ok(app.document.querySelector('.section-material'), 'no material-culture section');
    return 'powers + material rendered for Heracles';
  });

  S('S06', 'Detail — etymology', 'a figure with a sourced etymology renders the etymology section', async (app) => {
    await app.openFigure('greek_hesiod_zeus');
    const ety = app.document.querySelector('.section-etymology');
    assert.ok(ety, 'etymology section did not render');
    assert.ok(ety.textContent.trim().length > 30, 'etymology section is empty');
    return `etymology rendered (${ety.textContent.trim().length} chars)`;
  });

  S('S07', 'Detail — genealogy/parentage', 'a figure with a resolvable parent links to that parent', async (app) => {
    await app.openFigure('greek_apollod_danae');
    const par = app.document.querySelector('.parentage');
    assert.ok(par, 'parentage block did not render');
    const linked = par.querySelector('.parentage-row:not(.unresolved)');
    assert.ok(linked, 'no resolved parent row');
    return `parentage links to ${par.querySelector('.parentage-row')?.textContent?.trim().slice(0, 40)}`;
  });

  S('S08', 'Detail — multi-script names', 'Heracles surfaces cross-tradition / original-script names', async (app) => {
    await app.openFigure('greek_apollod_heracles');
    const names = app.document.querySelector('.section-names');
    assert.ok(names, 'names section did not render');
    assert.match(names.textContent, /Hercle|Hercules/, 'cross-tradition names missing');
    assert.ok(names.querySelectorAll('.name-rec-original').length >= 1, 'no original-script glyphs');
    return 'multi-script names rendered';
  });

  S('S09', 'Divinity computation', 'Heracles shows the 9⁄16 divinity descent breakdown', async (app) => {
    await app.openFigure('greek_apollod_heracles');
    const d = app.document.querySelector('.section-descent');
    assert.ok(d, 'descent section did not render');
    assert.match(d.textContent, /9⁄16/, 'expected 9/16 fraction');
    assert.ok(d.querySelectorAll('.descent-parent').length >= 2, 'expected per-parent rows');
    return '9⁄16 demigod by descent';
  });

  S('S10', 'Power scope-tags', 'faculties render their derived scope-tag chips', async (app) => {
    await app.openFigure('greek_hesiod_zeus');
    const chip = app.document.querySelector('.section-powers .power-scope');
    assert.ok(chip, 'no scope-tag chip rendered');
    return `scope chip: "${chip.textContent.trim()}"`;
  });

  S('S11', 'Inheritance', 'a Heraclid surfaces inheritable-from-ancestry power candidates', async (app) => {
    await app.openFigure('greek_eur_macaria');
    const powers = app.document.querySelector('.section-powers');
    assert.ok(powers, 'powers section did not render');
    assert.ok(powers.querySelector('.powers-inherited'), 'no inherited-candidates block');
    assert.match(powers.textContent, /not attested/, 'candidates not labelled potential');
    return 'inherited candidates labelled not-attested';
  });

  S('S12', 'Graph view', 'the default graph mounts a populated node-link diagram', async (app) => {
    await app.clickButton('Graph');
    const svg = app.document.querySelector('.graph-canvas svg');
    assert.ok(svg, 'graph svg did not mount');
    const n = svg.querySelectorAll('circle').length;
    assert.ok(n >= 20, `expected >= 20 nodes, got ${n}`);
    return `${n} graph nodes`;
  });

  S('S13', 'Graph focus', 'deep-linking #/graph/<id> focuses that figure', async (app) => {
    await app.clickButton('Graph');
    await app.act(async () => { app.window.location.hash = '#/graph/greek_apollod_heracles'; app.window.dispatchEvent(new app.window.Event('hashchange')); });
    await app.flush();
    const card = app.document.querySelector('.graph-focus-card');
    assert.ok(card, 'graph focus card did not render');
    const name = card.querySelector('.graph-focus-name')?.textContent || '';
    assert.match(name, /era[ck]l/i, `focus card names the wrong figure: "${name}"`);
    assert.ok(card.querySelector('.graph-focus-neighbors-list'), 'focus card lists no neighbors');
    return `focused "${name}" with neighbor list`;
  });

  S('S14', 'Graph path-finding', 'path mode finds a shortest relation path between two figures', async (app) => {
    await app.clickButton('Graph');
    await app.flush();
    const toggle = [...app.document.querySelectorAll('button')].find((b) => /find path/i.test(b.textContent));
    assert.ok(toggle, 'path-mode toggle ("Find path") not found');
    await app.act(async () => { toggle.click(); });
    await app.flush();            // path mode forces the full ('all') graph — let it rebuild
    await app.flush();
    const svg = app.document.querySelector('.graph-canvas svg');
    // One clickable <g> per node (cursor:pointer); rank by visible-dot radius
    // (radius grows with degree) and pick the two hubs — reliably in the same
    // connected component, so a path must exist.
    const groups = [...svg.querySelectorAll('g')].filter((g) => g.style && g.style.cursor === 'pointer');
    assert.ok(groups.length >= 2, `expected >= 2 node groups, got ${groups.length}`);
    const ranked = groups.map((g) => ({
      g, r: Math.max(0, ...[...g.querySelectorAll('circle')].map((c) => parseFloat(c.getAttribute('r') || '0')).filter((x) => x < 14)),
    })).sort((a, b) => b.r - a.r);
    await app.act(async () => { ranked[0].g.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true })); });
    await app.flush();
    await app.act(async () => { ranked[1].g.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true })); });
    await app.flush();
    const card = app.document.querySelector('.graph-path-card');
    assert.ok(card, 'path card did not render for two hub endpoints');
    assert.match(card.textContent, /hop/, 'path card has no hop count');
    return `path found: "${card.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)}"`;
  });

  S('S15', 'Atlas view', 'the atlas mounts all mapped territories', async (app) => {
    await app.clickButton('Atlas');
    const svg = app.document.querySelector('.atlas-canvas svg');
    assert.ok(svg, 'atlas svg did not mount');
    const paths = svg.querySelectorAll('path').length;
    assert.ok(paths >= 250, `expected >= 250 territory paths, got ${paths}`);
    const stats = app.document.querySelector('.atlas-stats')?.textContent || '';
    const m = stats.match(/(\d+)\s*traditions/);
    assert.ok(m && parseInt(m[1], 10) >= 238, `expected >= 238 traditions, stats: "${stats}"`);
    return `${paths} paths, ${m && m[1]} traditions`;
  });

  S('S16', 'Atlas deep-link', '#/atlas/<tradition> focuses that territory', async (app) => {
    await app.act(async () => { app.window.location.hash = '#/atlas/' + encodeURIComponent('Greek'); app.window.dispatchEvent(new app.window.Event('hashchange')); });
    await app.flush();
    const chip = app.document.querySelector('.graph-focused-label');
    assert.ok(chip && /Greek/.test(chip.textContent), `deep link did not focus Greek (chip: "${chip?.textContent}")`);
    return 'focused Greek territory';
  });

  S('S17', 'Lifecycle', 'a dense lifecycle lays out stages without overlap', async (app) => {
    await app.openFigure('greek_alexander');
    const svg = app.document.querySelector('.lifecycle-svg');
    assert.ok(svg, 'lifecycle svg did not render');
    const xs = [...svg.querySelectorAll('circle')].filter((c) => c.getAttribute('r') === '12')
      .map((c) => { const m = /translate\(([-\d.]+)/.exec(c.parentNode.getAttribute('transform') || ''); return m ? parseFloat(m[1]) : null; })
      .filter((v) => v != null).sort((a, b) => a - b);
    assert.ok(xs.length >= 10, `expected >= 10 stages, got ${xs.length}`);
    let gap = Infinity; for (let i = 1; i < xs.length; i++) gap = Math.min(gap, xs[i] - xs[i - 1]);
    assert.ok(gap >= 24, `stages overlap: min gap ${Math.round(gap)}px`);
    return `${xs.length} stages, min gap ${Math.round(gap)}px`;
  });

  S('S18', 'Items registry', 'the Items view lists the object corpus grouped by kind', async (app) => {
    await app.clickButton('Items');
    const view = app.document.querySelector('.items-view');
    assert.ok(view, 'items view did not mount');
    const n = view.querySelectorAll('.item-row').length;
    assert.ok(n >= 1240, `expected >= 1240 item rows, got ${n}`);
    assert.ok(view.querySelector('.items-group'), 'no kind groupings');
    return `${n} item rows, grouped`;
  });

  S('S19', 'Item custody', 'an item detail names its custody chain and links registry holders', async (app) => {
    await app.openItem('heracles-bow');
    const custody = app.document.querySelector('.section-custody');
    assert.ok(custody, 'custody section did not render');
    assert.match(custody.textContent, /Philoctetes/, 'external custody holder missing');
    assert.ok(custody.querySelector('.custody-who.link'), 'no linked registry figure in chain');
    return 'custody chain with linked holder';
  });

  S('S20', 'Keyboard nav', 'j/k move the cursor, Enter opens it, Escape closes', async (app) => {
    await toBrowse(app);
    await app.act(async () => { app.key('j'); }); await app.act(async () => { app.key('j'); }); await app.act(async () => { app.key('k'); });
    await app.flush();
    const cursor = app.document.querySelector('.browse-table tbody tr.cursor');
    assert.ok(cursor, 'no cursor row after j/j/k');
    const name = cursor.querySelector('.name-text')?.textContent;
    await app.act(async () => { app.key('Enter'); });
    await app.flush();
    const detail = app.document.querySelector('.detail');
    assert.ok(detail, 'Enter did not open a detail');
    assert.strictEqual(detail.querySelector('h1')?.textContent, name, 'Enter opened a different figure');
    await app.act(async () => { app.key('Escape'); });
    await settle(app);
    assert.ok(!app.document.querySelector('.detail'), 'Escape did not close detail');
    return `cursor "${name}" opened + closed`;
  });

  // ── Wave 2: edge cases, negative paths, finer-grained capabilities ──────────
  S('S24', 'Search — empty state', 'a no-match query yields zero rows without error', async (app) => {
    await toBrowse(app);
    const input = app.document.querySelector('[aria-label="Search registry"]');
    const before = app.errors.length;
    await app.act(async () => { setInputValue(app, input, 'zzqxnotarealfigure'); });
    await app.flush();
    assert.strictEqual(rows(app), 0, `expected 0 rows, got ${rows(app)}`);
    assert.strictEqual(app.errors.length, before, 'no-match search raised errors');
    await app.act(async () => { setInputValue(app, input, ''); });
    await app.flush();
    return 'no-match → 0 rows, no error, restores';
  });

  S('S25', 'Routing — unknown id', 'deep-linking a non-existent figure does not crash the app', async (app) => {
    const before = app.errors.length;
    await app.openFigure('this_figure_does_not_exist_xyz');
    assert.strictEqual(app.errors.length, before, 'unknown deep-link raised errors');
    await toBrowse(app);
    assert.ok(app.document.querySelector('.browse-table'), 'app did not recover to Browse');
    return 'unknown id handled gracefully';
  });

  S('S26', 'Detail — minimal figure', 'a figure with no powers/items/domains renders cleanly', async (app) => {
    const before = app.errors.length;
    await app.openFigure('greek_apollod_acrisius');
    const d = app.document.querySelector('.detail');
    assert.ok(d, 'detail did not open for the minimal figure');
    assert.strictEqual(app.errors.length, before, 'minimal figure raised errors');
    assert.ok(!d.querySelector('.section-powers .power-row'), 'unexpected powers on a minimal figure');
    await app.act(async () => { app.key('Escape'); });
    await settle(app);
    return 'minimal figure rendered, no powers, no errors';
  });

  S('S27', 'Detail — cult block', 'a major deity renders festivals, priesthoods, and offerings', async (app) => {
    await app.openFigure('greek_hesiod_zeus');
    const cult = app.document.querySelector('.section-cult-wrap');
    assert.ok(cult, 'cult block did not render');
    const t = cult.textContent;
    assert.match(t, /festival/i, 'no festivals');
    assert.match(t, /priesthood/i, 'no priesthoods');
    assert.match(t, /offering/i, 'no offerings');
    return `cult block: "${(cult.querySelector('.count')?.textContent || '').trim()}"`;
  });

  S('S28', 'Detail — iconography', 'a figure with iconography renders the iconography block', async (app) => {
    await app.openFigure('greek_hesiod_zeus');
    const ico = app.document.querySelector('.section-iconography-wrap');
    assert.ok(ico, 'iconography block did not render');
    assert.ok(ico.textContent.trim().length > 20, 'iconography block is empty');
    return `iconography rendered (${ico.textContent.trim().length} chars)`;
  });

  S('S29', 'Browse — sort', 'sorting by tradition reorders the table', async (app) => {
    await toBrowse(app);
    const firstNames = (app) => [...app.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header) .name-text')].slice(0, 4).map((e) => e.textContent);
    await app.act(async () => { app.document.querySelector('.th-name')?.click(); });
    await app.flush();
    const alpha = firstNames(app);
    const th = app.document.querySelector('.th-tradition');
    assert.ok(th, 'tradition sort header not found');
    await app.act(async () => { th.click(); });
    await app.flush();
    assert.ok(app.document.querySelector('.th-tradition.th-on'), 'tradition sort did not engage');
    assert.notDeepStrictEqual(firstNames(app), alpha, 'table did not reorder on tradition sort');
    await app.act(async () => { app.document.querySelector('.th-name')?.click(); });
    await app.flush();
    return `reordered from alpha "${alpha[0]}"`;
  });

  S('S30', 'Browse — tradition filter', 'selecting a tradition in the rail narrows the table', async (app) => {
    await toBrowse(app);
    const full = rows(app);
    const rail = [...app.document.querySelectorAll('.rail-row-trad')].find((r) => /Norse/.test(r.textContent));
    assert.ok(rail, 'Norse rail row not found');
    await app.act(async () => { rail.click(); });
    await app.flush();
    const filtered = rows(app);
    assert.ok(filtered > 0 && filtered < full, `rail filter did not narrow: ${filtered} vs ${full}`);
    await app.act(async () => { rail.click(); });
    await app.flush();
    assert.strictEqual(rows(app), full, 'clearing the rail filter did not restore');
    return `Norse filter: ${full} → ${filtered} → ${full}`;
  });

  S('S31', 'Command palette — navigate', 'typing a name and confirming opens that figure', async (app) => {
    await toBrowse(app);
    await app.act(async () => { app.key('k', { metaKey: true }); });
    const input = app.document.querySelector('.cmdk input');
    assert.ok(input, 'palette input not found');
    await app.act(async () => { setInputValue(app, input, 'Heracles'); });
    await app.flush();
    const result = app.document.querySelector('.cmdk [data-cmdk-idx="0"]');
    assert.ok(result, 'no palette result for "Heracles"');
    await app.act(async () => { result.click(); });
    await app.flush();
    const detail = app.document.querySelector('.detail');
    assert.ok(detail, 'palette pick did not open a detail');
    assert.match(detail.querySelector('h1')?.textContent || '', /era[ck]l/i, 'palette opened the wrong figure');
    await app.act(async () => { app.key('Escape'); });
    await settle(app);
    return `palette opened "${detail.querySelector('h1')?.textContent}"`;
  });

  S('S32', 'Graph — year scope', 'toggling year-scope engages without error', async (app) => {
    await app.clickButton('Graph');
    await app.flush();
    const toggle = [...app.document.querySelectorAll('button')].find((b) => /scope by year/i.test(b.textContent));
    assert.ok(toggle, 'year-scope toggle not found');
    await app.act(async () => { toggle.click(); });
    await app.flush();
    const off = [...app.document.querySelectorAll('button')].find((b) => /all time/i.test(b.textContent));
    assert.ok(off, 'year-scope did not engage (no "All time" toggle appeared)');
    assert.deepStrictEqual(app.errors, [], app.errors.join('\n'));
    await app.act(async () => { off.click(); });
    await app.flush();
    return 'year-scope engaged and reverted, no errors';
  });

  SB('S21', 'Persistence — quota', 'oversized corpus stays in memory; the atlas still persists', async () => {
    const a = await bootApp();
    try {
      assert.strictEqual(a.window.localStorage.getItem(a.window.__PR.PEOPLE_KEY), null, 'people unexpectedly persisted');
      assert.ok(a.window.localStorage.getItem(a.window.__PR.ATLAS_KEY), 'atlas did not persist');
      assert.ok(rows(a) > 0, 'in-memory fallback did not feed the UI');
      return 'people=null (quota), atlas persisted, UI populated';
    } finally { a.close(); }
  });

  SB('S22', 'Persistence — corruption', 'corrupted localStorage JSON falls back to the seed', async () => {
    const a = await bootApp({ preSeedStorage: (w) => w.localStorage.setItem('pantheon_registry_v9', '{not valid json') });
    try {
      assert.ok(rows(a) > 100, `expected seed corpus, got ${rows(a)} rows`);
      assert.deepStrictEqual(a.errors, [], a.errors.join('\n'));
      return `fell back to seed (${rows(a)} rows), no errors`;
    } finally { a.close(); }
  });

  SB('S23', 'Persistence — user edit', 'a user-edited corpus in storage wins over the seed', async () => {
    const edited = {
      test_edit_one: { id: 'test_edit_one', schemaVersion: 2, name: { primary: 'Edited One' }, type: 'deity', origin: 'canon', tradition: 'Greek' },
      test_edit_two: { id: 'test_edit_two', schemaVersion: 2, name: { primary: 'Edited Two' }, type: 'mortal', origin: 'canon', tradition: 'Greek' },
    };
    const a = await bootApp({ preSeedStorage: (w) => w.localStorage.setItem('pantheon_registry_v9', JSON.stringify(edited)) });
    try {
      assert.strictEqual(rows(a), 2, `stored corpus should win, got ${rows(a)} rows`);
      assert.match(a.document.querySelector('.browse-table').textContent, /Edited One/, 'edited figure missing');
      return 'stored 2-figure corpus won over seed';
    } finally { a.close(); }
  });
});
