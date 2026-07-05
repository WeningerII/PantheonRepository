// Multi-file shell boot: dist/site/index.html's real script sequence executed
// in jsdom, the CDN libraries swapped for the same pinned node_modules UMD
// builds boot.cjs uses, and the data tiers served from dist/data behind a
// hand-released fetch stub — so the two-stage arrival (skinny index, then the
// full corpus) is observed deterministically instead of raced.
//
// CI budget: ONE boot shared by every test below. An earlier end-to-end smoke
// re-committed all 4,014 Browse rows repeatedly under development React and
// took ~18 minutes; the deep-link/interaction surface is already proven on
// the sync path (render/scenarios exercise the same components), so this file
// asserts only what no other test can: the shipped shell's own scripts boot
// against fetched tiers.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'dist', 'data');
const SHELL = path.join(ROOT, 'dist', 'site', 'index.html');
const NM = path.join(ROOT, 'node_modules');
const read = (p) => fs.readFileSync(p, 'utf8');

// dist/site and dist/data are gitignored — generate when absent. --pages
// regenerates dist/data itself, so one command covers both trees and the
// hashed names pinned in the shell always agree with the tiers beside it.
if (!fs.existsSync(SHELL) || !fs.existsSync(path.join(DATA, 'meta.json'))) {
  execFileSync('python3', [path.join(ROOT, 'build.py'), '--pages'], { cwd: ROOT, stdio: 'ignore' });
}

const meta = JSON.parse(read(path.join(DATA, 'meta.json')));
const shellHtml = read(SHELL);

// The shell pins production CDN builds; tests run offline against the same
// versions from devDependencies (development React — its invariant warnings
// are part of the failure net). react-dom must match before react.
const LIB_MAP = [
  [/react-dom/, 'react-dom/umd/react-dom.development.js'],
  [/react/, 'react/umd/react.development.js'],
  [/\/d3\//, 'd3/dist/d3.min.js'],
  [/topojson/, 'topojson/dist/topojson.min.js'],
];

const withTimeout = (p, ms, label) => Promise.race([
  Promise.resolve(p),
  new Promise((_, rej) => {
    const t = setTimeout(() => rej(new Error(`${label} timed out after ${ms} ms`)), ms);
    if (t.unref) t.unref();
  }),
]);

// Parse without executing: every <script> in document order (src or inline
// body, exactly as a browser's HTML parser would see the escaped payloads),
// then strip them so the execution DOM is the shipped markup — #boot overlay,
// #app mount, styles — with the scripts re-run one by one under the stubs.
function parseShell() {
  const dom = new JSDOM(shellHtml);
  const doc = dom.window.document;
  const scripts = [...doc.querySelectorAll('script')].map((s) => ({
    src: s.getAttribute('src'),
    body: s.textContent,
  }));
  for (const s of [...doc.querySelectorAll('script')]) s.remove();
  return { scripts, strippedHtml: dom.serialize() };
}

async function bootShell() {
  const { scripts, strippedHtml } = parseShell();
  const dom = new JSDOM(strippedHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;

  const errors = [];
  window.addEventListener('error', (e) => errors.push('error: ' + (e.error?.stack || e.message)));
  window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + (e.reason?.stack || e.reason)));
  // Same rule as boot.cjs: a boundary-eaten render crash only ever surfaces
  // through console.error, so it must count as a failed boot.
  {
    const realErr = window.console.error.bind(window.console);
    window.console.error = (...a) => {
      const line = a.map(String).join(' ');
      // Expected: the initial mount runs at module scope (main.jsx), outside act().
      if (!/not wrapped in act/.test(line)) errors.push('console.error: ' + line);
      realErr(...a);
    };
  }

  // Browser APIs the app touches that jsdom lacks (mirrors boot.cjs).
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  window.MessageChannel = require('worker_threads').MessageChannel; // React scheduler
  window.Element.prototype.scrollIntoView = function () {};
  window.Element.prototype.getBoundingClientRect = function () {
    return { width: 1200, height: 600, top: 0, left: 0, right: 1200, bottom: 600, x: 0, y: 0, toJSON() {} };
  };
  window.IS_REACT_ACT_ENVIRONMENT = true;

  // Hand-released fetch over dist/data: each tier's response body resolves
  // only when the stage that consumes it is under observation. Anything but
  // the two pinned tier URLs is a failure — the shell may fetch nothing else
  // during boot.
  const release = {};
  const gates = {
    index: new Promise((res) => { release.index = res; }),
    corpus: new Promise((res) => { release.corpus = res; }),
  };
  const fetched = [];
  window.fetch = (url) => {
    const u = String(url);
    fetched.push(u);
    const tier = u === `data/${meta.files.index}` ? 'index'
      : u === `data/${meta.files.corpus}` ? 'corpus' : null;
    if (!tier) return Promise.reject(new Error('no network in tests: ' + u));
    const body = read(path.join(DATA, u.slice('data/'.length)));
    return gates[tier].then(() => ({
      ok: true, status: 200,
      text: () => Promise.resolve(body),
      json: () => Promise.resolve(JSON.parse(body)),
    }));
  };

  const runScript = (code) => {
    const s = window.document.createElement('script');
    s.textContent = code;
    window.document.body.appendChild(s);
  };
  for (const { src, body } of scripts) {
    if (!src) { runScript(body); continue; }
    const lib = LIB_MAP.find(([re]) => re.test(src));
    if (lib) { runScript(read(path.join(NM, lib[1]))); continue; }
    // data/core-<hash>.js is the only non-CDN external script the shell loads.
    assert.match(src, /^data\//, `unexpected external script in the shell: ${src}`);
    runScript(read(path.join(DATA, src.slice('data/'.length))));
  }

  const act = window.React.act;
  const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  await flush(); // mount + passive effects (the skeleton commit)

  const D = window.document;
  const PR = window.__PR;
  const snap = () => ({
    dataReady: PR.dataReady,
    corpusVersion: PR.corpusVersion,
    rows: D.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)').length,
    skeleton: !!D.querySelector('.empty-loading'),
    bootStep: D.getElementById('boot-step') ? D.getElementById('boot-step').textContent : null,
    bootHidden: !D.getElementById('boot') || D.getElementById('boot').classList.contains('hidden'),
    bootDone: window.__bootDone === true,
  });

  const mounted = snap(); // stage 0: all scripts ran, nothing released yet

  await act(async () => {
    release.index();
    await new Promise((r) => setTimeout(r, 0));
  });
  await flush();
  const indexed = snap(); // stage 1: skinny Browse rows

  let bootStepAtReady = null;
  await act(async () => {
    release.corpus();
    await PR.ready; // resolves after the snapshot merge + persist + 'pr:ready'
    await new Promise((r) => setTimeout(r, 0)); // main.jsx ready.then → labelBoot/hideBoot
    // Captured here, not in the settled snapshot: hideBoot removes #boot on a
    // 500 ms timer, which the heavy full-corpus commit can outlast.
    const step = D.getElementById('boot-step');
    bootStepAtReady = step ? step.textContent : null;
  });
  await flush();
  const settled = snap(); // stage 2: full corpus

  return { window, document: D, PR, scripts, fetched, errors, mounted, indexed, settled, bootStepAtReady };
}

// The one shared boot. Failures surface per-test through withTimeout below;
// this guard only keeps an early rejection from doubling as an unhandled one.
const booted = bootShell();
booted.catch(() => {});
const shell = () => withTimeout(booted, 120000, 'multi-file shell boot');

test('the shell pins __PR_DATA to the exact hashed tier names in meta.json', async () => {
  const b = await shell();
  assert.deepStrictEqual({ ...b.window.__PR_DATA }, {
    index: `data/${meta.files.index}`,
    corpus: `data/${meta.files.corpus}`,
  }, '__PR_DATA does not name the tiers meta.json records');
  // And in the static markup, not just the executed window: the inline
  // one-liner is what a stale shell would carry into a skewed deploy.
  const oneLiner = b.scripts.find((s) => !s.src && s.body.includes('window.__PR_DATA'));
  assert.ok(oneLiner, 'no inline __PR_DATA script in the shell');
  assert.ok(oneLiner.body.includes(`data/${meta.files.index}`), 'index hash missing from the shell source');
  assert.ok(oneLiner.body.includes(`data/${meta.files.corpus}`), 'corpus hash missing from the shell source');
});

test('the shell inlines app/pr-boot.js verbatim', async () => {
  const b = await shell();
  const inlined = b.scripts.find((s) => !s.src && s.body.includes('pr-boot.js — async data loader'));
  assert.ok(inlined, 'no inlined pr-boot script in the shell');
  assert.strictEqual(inlined.body.trim(), read(path.join(ROOT, 'app', 'pr-boot.js')).trim(),
    'the inlined pr-boot body drifted from app/pr-boot.js — rebuild dist/site');
});

test('stage 0: skeleton mounts before any tier arrives, boot overlay up, dataReady false', async () => {
  const b = await shell();
  assert.deepStrictEqual(b.mounted, {
    dataReady: false,
    corpusVersion: 0,
    rows: 0,
    skeleton: true,
    bootStep: 'loading corpus…',
    bootHidden: false,
    bootDone: false,
  });
});

test('stage 1: released index → skinny Browse rows render, dataReady still false', async () => {
  const b = await shell();
  assert.ok(b.indexed.rows >= 2700, `expected >= 2700 skinny rows, got ${b.indexed.rows}`);
  assert.strictEqual(b.indexed.rows, b.settled.rows, 'skinny and full row counts must agree');
  assert.strictEqual(b.indexed.dataReady, false, 'dataReady must not flip on the index alone');
  assert.strictEqual(b.indexed.corpusVersion, 1);
  assert.strictEqual(b.indexed.skeleton, false, 'the skeleton must be gone once real rows exist');
  assert.strictEqual(b.indexed.bootHidden, false, 'the boot overlay must outlive the skinny stage');
  assert.strictEqual(b.indexed.bootDone, false, '__bootDone must not flip before the corpus');
});

test('stage 2: released corpus → ready resolves, boot hidden, __bootDone, counted boot label', async () => {
  const b = await shell();
  assert.strictEqual(b.settled.dataReady, true, 'dataReady must flip with the corpus');
  assert.strictEqual(b.settled.corpusVersion, 2, 'corpusVersion must reach 2 (index, then corpus)');
  assert.ok(b.settled.rows >= 2700, `expected >= 2700 rows after ready, got ${b.settled.rows}`);
  assert.strictEqual(b.settled.skeleton, false);
  assert.strictEqual(b.settled.bootHidden, true, '#boot must be hidden (or removed) after ready');
  assert.strictEqual(b.settled.bootDone, true, '__bootDone must flip once the app is interactive');
  assert.strictEqual(b.bootStepAtReady, `loaded ${meta.figures} figures`,
    'the boot label must carry the live figure count');
});

test('a known figure carries its full record fields after ready — not the skinny shape', async () => {
  const b = await shell();
  const zeus = b.PR.seedPeople['greek_hesiod_zeus'];
  assert.ok(zeus, 'greek_hesiod_zeus missing from __PR.seedPeople');
  assert.strictEqual(zeus.name.primary, 'Zeus');
  for (const k of ['domains', 'epithets', 'sources', 'cult', 'relations']) {
    assert.ok(zeus[k] && typeof zeus[k] === 'object', `full-record field ${k} missing after ready`);
  }
  assert.ok(zeus.domains.length > 0, 'domains must be populated');
  assert.ok(zeus.sources.length > 0, 'sources must be populated');
  assert.ok(!('_dates' in zeus), 'the skinny-index marker must not survive the corpus swap');
});

test('the boot fetches exactly the two pinned tiers, index first', async () => {
  const b = await shell();
  assert.deepStrictEqual(b.fetched, [`data/${meta.files.index}`, `data/${meta.files.corpus}`]);
});

test('the whole boot surfaces no errors', async () => {
  const b = await shell();
  assert.deepStrictEqual(b.errors, [], `boot errors:\n${b.errors.join('\n')}`);
});
