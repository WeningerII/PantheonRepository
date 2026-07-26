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
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'dist', 'data');
const SHELL = path.join(ROOT, 'dist', 'site', 'index.html');
const NM = path.join(ROOT, 'node_modules');
const read = (p) => fs.readFileSync(p, 'utf8');

// dist/site and dist/data are gitignored and built by the `npm test` command
// itself before the runner starts (one `--pages` build covers both trees, so
// the hashed names pinned in the shell always agree with the tiers beside
// it). This file must never build them: test files run concurrently, and a
// sibling rewriting dist/data mid-run breaks every reader of the tree.
if (!fs.existsSync(SHELL) || !fs.existsSync(path.join(DATA, 'meta.json'))) {
  throw new Error('dist/site or dist/data missing — run `python3 build.py --pages` first (npm test does this automatically)');
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

async function bootShell(opts = {}) {
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

  // Hand-released fetch over dist/data: the index and corpus bodies resolve
  // only when the stage that consumes them is under observation. Every OTHER
  // dist/data artifact (projection tiers, registries, detail shards) serves
  // immediately — those are explicit loadTier/loadRegistry/loadDetail calls,
  // never part of the plain boot (asserted below). Anything outside dist/data
  // is a failure.
  const release = {};
  const gates = {
    index: new Promise((res) => { release.index = res; }),
  };
  const fetched = [];
  window.fetch = (url) => {
    const u = String(url);
    fetched.push(u);
    if (!u.startsWith('data/')) return Promise.reject(new Error('no network in tests: ' + u));
    // Serve past a cache-busting query string, as a real static host does —
    // pr-boot's manifest refresh appends ?rev= to data/meta.json.
    const fp = path.join(DATA, u.slice('data/'.length).split('?')[0]);
    if (!fs.existsSync(fp)) return Promise.reject(new Error('no such tier artifact: ' + u));
    const body = read(fp);
    const gate = u === `data/${meta.files.index}` ? gates.index : Promise.resolve();
    return gate.then(() => ({
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

  // Projections shell: releasing the index IS the boot — pr-boot resolves
  // ready on it, main.jsx labels and hides the overlay, and dataReady stays
  // false forever (it means "full corpus resident", which no longer happens).
  let bootStepAtReady = null;
  await act(async () => {
    release.index();
    await PR.ready;
    await new Promise((r) => setTimeout(r, 0)); // main.jsx ready.then → labelBoot/hideBoot
    const step = D.getElementById('boot-step');
    bootStepAtReady = step ? step.textContent : null;
  });
  await flush();
  const indexed = snap(); // stage 1: skinny rows, ready resolved, overlay gone

  return { window, document: D, PR, scripts, fetched, errors, mounted, indexed, bootStepAtReady, act, flush, snap };
}

// The one shared boot. Failures surface per-test through withTimeout below;
// this guard only keeps an early rejection from doubling as an unhandled one.
const booted = bootShell();
booted.catch(() => {});
const shell = () => withTimeout(booted, 120000, 'multi-file shell boot');

test('the shell pins __PR_DATA to the index tier only (no corpus URL)', async () => {
  const b = await shell();
  assert.deepStrictEqual({ ...b.window.__PR_DATA }, {
    index: `data/${meta.files.index}`,
  }, '__PR_DATA must name only the index — the corpus is off the fetch path');
  const oneLiner = b.scripts.find((s) => !s.src && s.body.includes('window.__PR_DATA'));
  assert.ok(oneLiner, 'no inline __PR_DATA script in the shell');
  assert.ok(oneLiner.body.includes(`data/${meta.files.index}`), 'index hash missing from the shell source');
  assert.ok(!oneLiner.body.includes('corpus'), 'the shell must not reference a corpus URL');
});

test('the shell pins __PR_TIER_DATA and __PR_DETAILS_DATA to the hashed names in meta.json', async () => {
  const b = await shell();
  assert.deepStrictEqual({ ...b.window.__PR_TIER_DATA }, {
    atlas: `data/${meta.files.atlas}`,
    edges: `data/${meta.files.edges}`,
  });
  assert.strictEqual(b.window.__PR_DETAILS_DATA.buckets, meta.buckets);
  assert.deepStrictEqual([...b.window.__PR_DETAILS_DATA.shards], meta.details.shards);
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

test('the index IS the boot: rows render, ready resolves, overlay hides, dataReady stays false', async () => {
  const b = await shell();
  assert.ok(b.indexed.rows >= 2700, `expected >= 2700 skinny rows, got ${b.indexed.rows}`);
  assert.strictEqual(b.indexed.dataReady, false, 'dataReady must stay false — no corpus ever arrives');
  assert.strictEqual(b.indexed.corpusVersion, 1, 'corpusVersion reaches 1 (the index install)');
  assert.strictEqual(b.indexed.skeleton, false, 'the skeleton must be gone once real rows exist');
  assert.strictEqual(b.indexed.bootHidden, true, '#boot must hide on ready — which the index resolves');
  assert.strictEqual(b.indexed.bootDone, true, '__bootDone must flip once the app is interactive');
  assert.strictEqual(b.bootStepAtReady, `loaded ${meta.figures} figures`,
    'the boot label must carry the live figure count');
});

test('loadTier(atlas) installs the derived layers and persists the atlas', async () => {
  const b = await shell();
  assert.strictEqual(b.PR.tierReady.atlas, false, 'atlas tier must start un-ready');
  const v0 = b.PR.corpusVersion;
  await b.act(async () => { await b.PR.loadTier('atlas'); await new Promise((r) => setTimeout(r, 0)); });
  await b.flush();
  assert.strictEqual(b.PR.tierReady.atlas, true);
  assert.strictEqual(b.PR.corpusVersion, v0 + 1, 'corpusVersion must bump on the atlas install');
  const file = JSON.parse(read(path.join(DATA, meta.files.atlas)));
  for (const k of ['seedAtlas', 'divinity', 'traditionMix', 'inheritedPowers']) {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(b.PR[k])), file[k], `__PR.${k} != atlas tier ${k}`);
  }
  // The returning-visitor stale-map fix must survive the corpus removal.
  const stored = JSON.parse(b.window.localStorage.getItem(b.PR.ATLAS_KEY));
  assert.deepStrictEqual(stored, file.seedAtlas, 'ATLAS_KEY must be overwritten on the atlas install');
});

test('loadTier(edges) rehydrates every record — runtime render parity (2b hard gate)', async () => {
  const b = await shell();
  await b.act(async () => { await b.PR.loadTier('edges'); await new Promise((r) => setTimeout(r, 0)); });
  await b.flush();
  assert.strictEqual(b.PR.tierReady.edges, true);
  const edges = JSON.parse(read(path.join(DATA, meta.files.edges)));
  const corpusFile = JSON.parse(read(path.join(DATA, meta.files.corpus)));
  const buildLinks = (people) => {
    const links = [];
    for (const id of Object.keys(people).sort()) {
      const p = people[id];
      for (const pid of (p.parentIds || [])) links.push([pid, id, 'parent']);
      for (const r of (p.relations || [])) if (r && r.personId) links.push([id, r.personId, r.kind]);
    }
    return links;
  };
  const got = buildLinks(JSON.parse(JSON.stringify(b.PR.seedPeople)));
  const want = buildLinks(corpusFile.seedPeople);
  assert.deepStrictEqual(got, want, 'tier-rehydrated adjacency differs from the corpus adjacency');
  for (const [id, e] of Object.entries(edges)) {
    if (e.pr) assert.deepStrictEqual(JSON.parse(JSON.stringify(b.PR.seedPeople[id].parentRoles)), e.pr, `${id}: parentRoles`);
  }
});

test('loadDetail(id) hydrates the figure from its content-hashed shard', async () => {
  const b = await shell();
  const id = 'greek_hesiod_zeus';
  assert.ok(b.PR.seedPeople[id] && !b.PR.seedPeople[id]._full, 'record must start skinny');
  await b.act(async () => { await b.PR.loadDetail(id); await new Promise((r) => setTimeout(r, 0)); });
  await b.flush();
  const rec = b.PR.seedPeople[id];
  assert.strictEqual(rec._full, true, 'record must be marked _full after hydration');
  for (const k of ['domains', 'epithets', 'sources', 'relations']) {
    assert.ok(rec[k] && rec[k].length, `full-record field ${k} missing after shard hydration`);
  }
  assert.ok(b.PR.divinity && b.PR.divinity[id] != null, 'divinity must be present after hydration');
  assert.strictEqual(b.PR.dataReady, false, 'dataReady must stay false — hydration is per-figure');
});

test('detail hydration is invisible to the list: row HTML identical, no pr:tier storm', async () => {
  const b = await shell();
  // A figure guaranteed on-screen unfiltered: take the first rendered row's
  // name, resolve it to an id, and hydrate that figure's bucket.
  const rowsBefore = await (async () => b.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)'))();
  assert.ok(rowsBefore.length > 50, 'need rendered rows');
  const sample = [...rowsBefore].slice(0, 40).map((tr) => tr.outerHTML);
  const firstName = rowsBefore[0].querySelector('.name-text').textContent;
  const target = Object.values(JSON.parse(JSON.stringify(b.PR.seedPeople)))
    .find((p) => p.name && p.name.primary === firstName);
  assert.ok(target, 'first row name did not resolve to a record');
  const tierEvents = [];
  const onTier = () => tierEvents.push('pr:tier');
  b.window.addEventListener('pr:tier', onTier);
  await b.act(async () => { await b.PR.loadDetail(target.id); await new Promise((r) => setTimeout(r, 0)); });
  await b.flush();
  b.window.removeEventListener('pr:tier', onTier);
  assert.strictEqual(b.PR.seedPeople[target.id]._full, true, 'target must hydrate');
  assert.deepStrictEqual(tierEvents, [], 'hydration must not dispatch pr:tier (the render-thrash event)');
  const rowsAfter = [...b.document.querySelectorAll('.browse-table tbody tr:not(.browse-group-header)')].slice(0, 40).map((tr) => tr.outerHTML);
  assert.deepStrictEqual(rowsAfter, sample, 'hydration changed rendered row HTML — layout snap regression');
});

// Pick a figure whose detail bucket the boot has not already hydrated, so the
// shard name under test is one loadDetail will actually go to the network for.
const unhydratedVictim = (b) => {
  const DET = b.window.__PR_DETAILS_DATA;
  const bucketOfId = (id) => { let s = 0; for (let k = 0; k < id.length; k++) s = (s + id.charCodeAt(k)) % DET.buckets; return s; };
  const zeusBucket = bucketOfId('greek_hesiod_zeus');
  const id = Object.keys(JSON.parse(read(path.join(DATA, meta.files.edges))))
    .find((x) => bucketOfId(x) !== zeusBucket && !(b.PR.seedPeople[x] && b.PR.seedPeople[x]._full));
  assert.ok(id, 'no un-hydrated victim figure found');
  return { id, bucket: bucketOfId(id), DET };
};

// THE deploy-skew case, and the regression guard for the black-page bug: the
// shell was cached across a deploy, so it pins the PREVIOUS build's shard hash
// and that file no longer exists. Because build-tiers content-hashes each shard
// separately, only the CHANGED buckets 404 — an arbitrary subset of figures
// breaks while the rest of the app is fine. data/meta.json is unhashed and
// always current, so pr-boot re-pins from it and the figure opens anyway. It
// must never surface to the user, and it must never navigate out of the app.
test('a stale pinned shard name self-heals from data/meta.json (deploy skew)', async () => {
  const b = await shell();
  const { id, bucket, DET } = unhydratedVictim(b);
  const real = DET.shards[bucket];
  DET.shards[bucket] = `${bucket}-deadbeefdead.json`; // last deploy's hash
  await b.act(async () => { await b.PR.loadDetail(id); await new Promise((r) => setTimeout(r, 0)); });
  assert.ok(b.PR.seedPeople[id] && b.PR.seedPeople[id]._full,
    'a stale shard hash must recover via the manifest refresh, not fail the figure');
  assert.ok(b.fetched.some((u) => u.startsWith('data/meta.json')), 'the manifest must be re-read');
  assert.strictEqual(b.window.__PR_DETAILS_DATA.shards[bucket], real,
    'the refresh must re-pin the current shard name for later opens');
});

test('a genuinely unreachable shard rejects loadDetail — the Shell renders its in-app error', async () => {
  const b = await shell();
  const { id, bucket, DET } = unhydratedVictim(b);
  const real = DET.shards[bucket];
  // Break the shard name AND take the manifest offline, so the refresh cannot
  // repair it — this is offline/blocked, not deploy skew.
  DET.shards[bucket] = 'no-such-shard.json';
  const realFetch = b.window.fetch;
  b.window.fetch = (url) => (String(url).startsWith('data/meta.json')
    ? Promise.reject(new Error('no network in tests: ' + url))
    : realFetch(url));
  try {
    await assert.rejects(() => b.PR.loadDetail(id), /no such tier artifact|HTTP/,
      'an unrepairable shard must reject so the Shell can offer a retry');
  } finally {
    b.window.fetch = realFetch;
    DET.shards[bucket] = real;
  }
});

// The bug this whole seam exists to prevent: a failed detail fetch used to run
// window.location.assign('registry/<id>.html'), throwing the reader out of the
// app and onto the JS-free crawler mirror — a different stylesheet, a different
// layout, dark where the app is cream. One dropped request must never cost the
// user the UI.
test('the Shell never navigates to the static mirror on a detail failure', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'Shell.jsx'), 'utf8');
  const nav = /(location\s*\.\s*(assign|replace|href)|window\s*\.\s*open)[^\n]*registry\//;
  assert.ok(!nav.test(src),
    'Shell.jsx must not navigate to registry/<id>.html — degrade inside the app instead');
});

test('the boot fetches exactly one tier: the index', async () => {
  const b = await shell();
  assert.strictEqual(b.fetched[0], `data/${meta.files.index}`, 'the index must be the first fetch');
  const bootFetches = b.fetched.filter((u) => u === `data/${meta.files.corpus}`);
  assert.deepStrictEqual(bootFetches, [], 'nothing may fetch the corpus — it is off the fetch path');
});

test('the whole boot surfaces no errors', async () => {
  const b = await shell();
  assert.deepStrictEqual(b.errors, [], `boot errors:\n${b.errors.join('\n')}`);
});
