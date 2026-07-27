#!/usr/bin/env node
// Cold-load + demand-reveal stability probe.
//
//   node scripts/verify-coldload.cjs            (after `python3 build.py --pages`)
//
// Needs Chromium. Point at it with PLAYWRIGHT_CHROMIUM_PATH, or install one
// with `npx playwright install chromium`; PLAYWRIGHT_BROWSERS_PATH is honoured.
//
// Guards four invariants of the Browse list:
//
//   1. Mounted rows grow MONOTONICALLY — the reveal window never collapses
//      when a data tier installs mid-load, and never gives back rows the
//      cursor ratchet already won.
//   2. A mounted row NEVER changes height. `table-layout: fixed` means column
//      widths come from the thead and must not re-negotiate as batches mount;
//      if they did, every visible row would re-wrap.
//   3. Cold load stays BOUNDED. The reveal is demand-driven: sitting on the
//      page without scrolling must not walk to the end of the corpus. This is
//      what keeps Lighthouse's Accessibility gatherer — one CDP evaluate under
//      a hard 60,000 ms cap — from timing out and nulling the Accessibility
//      and SEO categories outright.
//   4. Scrolling GROWS the window, and reaches the whole corpus. Without this
//      phase the probe would sit at the initial screenful for its entire run
//      and pass while observing nothing.
//
// Exits non-zero on any violation. A failure here is a real regression.
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const SITE = path.join(ROOT, 'dist', 'site');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.COLDLOAD_PORT || 8881);

// Cold load may mount the first screenful plus whatever the ratchet/ramp
// legitimately adds. It must not approach the full corpus.
const COLD_ROW_MAX = 1000;
const COLD_ELEMENT_MAX = 25000;

function fail(msg) { console.error('FAIL: ' + msg); process.exitCode = 1; }

function findChromium() {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers',
                 path.join(process.env.HOME || '', '.cache', 'ms-playwright')].filter(Boolean);
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const direct = path.join(r, 'chromium');
    if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
    for (const d of fs.readdirSync(r)) {
      for (const rel of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = path.join(r, d, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;
}

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  console.error('FAIL: playwright-core is not installed. Run `npm install`.');
  process.exit(1);
}

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const base = p.startsWith('/data/') ? DIST : SITE;
  const f = path.join(base, p);
  if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end(); }
  rs.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});

const sample = () => {
  const rows = document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)');
  const first = rows[0];
  const count = document.querySelector('.figcount');
  return {
    n: rows.length,
    h: first ? first.getBoundingClientRect().height : 0,
    els: document.getElementsByTagName('*').length,
    total: count ? Number(count.textContent.replace(/[^0-9]/g, '')) : 0,
  };
};

(async () => {
  if (!fs.existsSync(path.join(SITE, 'index.html'))) {
    console.error('FAIL: dist/site/index.html missing — run `python3 build.py --pages` first.');
    process.exit(1);
  }
  const exe = findChromium();
  if (!exe) {
    console.error('FAIL: no Chromium found. Set PLAYWRIGHT_CHROMIUM_PATH or run `npx playwright install chromium`.');
    process.exit(1);
  }

  await new Promise(r => srv.listen(PORT, r));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await pg.route('**/fonts.g**', r => r.fulfill({ status: 404, body: '' }));
  await pg.route('**/world-atlas**', r => r.fulfill({
    body: fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'countries-110m.json')),
    contentType: 'application/json',
  }));
  // cdnjs is unreachable in CI sandboxes; serve the pinned node_modules copies.
  // NOTE: this substitutes bytes for the cdnjs URL, so neither the URL nor its
  // SRI hash is validated here — see docs/load-performance-findings.md §4.2.
  await pg.route('**/cdnjs.cloudflare.com/**', r => {
    const u = r.request().url();
    const pick =
      u.includes('react-dom') ? 'react-dom/umd/react-dom.production.min.js' :
      u.includes('/react/') ? 'react/umd/react.production.min.js' :
      u.includes('d3') ? 'd3/dist/d3.min.js' :
      u.includes('topojson') ? 'topojson/dist/topojson.min.js' : null;
    if (!pick) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ body: fs.readFileSync(path.join(NM, pick)), contentType: 'application/javascript' });
  });

  await pg.goto(`http://127.0.0.1:${PORT}/index.html#/browse`, { waitUntil: 'load' });
  await pg.waitForSelector('.browse-table tbody tr', { timeout: 30000 });

  // ── Phase 1: cold load, no interaction ────────────────────────────────
  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    samples.push(await pg.evaluate(sample));
    await pg.waitForTimeout(150);
  }

  // ── Phase 2: scroll to the end ────────────────────────────────────────
  const cold = samples[samples.length - 1];
  let stable = 0;
  for (let i = 0; i < 400 && stable < 3; i++) {
    await pg.evaluate(() => { const s = document.querySelector('.browse-scroll'); if (s) s.scrollTop = s.scrollHeight; });
    await pg.waitForTimeout(150);
    const s = await pg.evaluate(sample);
    stable = s.n === samples[samples.length - 1].n ? stable + 1 : 0;
    samples.push(s);
  }
  const end = samples[samples.length - 1];

  // ── Verdict ───────────────────────────────────────────────────────────
  let drops = 0, maxN = 0, hChanges = 0, h0 = null;
  for (const s of samples) {
    if (s.n < maxN) drops++;
    maxN = Math.max(maxN, s.n);
    if (h0 === null && s.h) h0 = s.h;
    else if (h0 !== null && s.h && Math.abs(s.h - h0) > 0.5) hChanges++;
  }

  console.log(`samples: ${samples.length}`);
  console.log(`cold-load rows: ${cold.n} (elements ${cold.els})`);
  console.log(`after scroll:   ${end.n} of ${end.total} (elements ${end.els})`);

  if (drops) fail(`reveal window collapsed ${drops}x — mounted rows must never decrease`);
  else console.log('row-count drops: 0 — monotonic ✓');

  if (hChanges) fail(`first-row height changed ${hChanges}x — column widths are re-negotiating`);
  else console.log('row-height changes: 0 — stable ✓');

  if (cold.n > COLD_ROW_MAX) fail(`cold load mounted ${cold.n} rows (max ${COLD_ROW_MAX}) — the reveal is not demand-driven; Lighthouse's axe gatherer will time out`);
  else if (cold.els > COLD_ELEMENT_MAX) fail(`cold load mounted ${cold.els} elements (max ${COLD_ELEMENT_MAX})`);
  else console.log(`cold load bounded: ${cold.n} rows ≤ ${COLD_ROW_MAX} ✓`);

  if (end.n <= cold.n) fail(`scrolling did not grow the window (${cold.n} → ${end.n}) — demand-driven reveal is broken`);
  else if (end.total && end.n < end.total) fail(`scrolling stalled at ${end.n} of ${end.total} rows — the corpus is not fully reachable`);
  else console.log(`scroll reached the full corpus: ${end.n} rows ✓`);

  await b.close(); srv.close();
  if (process.exitCode) console.error('\nverify-coldload: FAILED');
  else console.log('\nverify-coldload: PASSED');
})().catch(e => { console.error(e); process.exit(1); });
