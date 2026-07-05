// pr-boot tests: capability-detected no-op everywhere the corpus is already
// synchronous, and — in async mode — the two-stage tier load plus all-figures
// parity of the ported getEntryDates/formatFraction against app/data.js.
// data.js is the oracle: it runs in one VM (the seed.test.cjs harness), pr-boot
// runs in another against the real dist/data tiers behind a fetch stub, and
// every figure/fraction must agree — this is the permanent drift net the
// load-time plan requires for the dual implementations.
//
// The embedded source (the single-file artifact's inert application/json
// blocks) shares the fetched path's install functions, so its coverage below
// asserts the source-specific seams only: element reads instead of fetches,
// the document-parsed gate, the optional index stage, and the same loud
// failure semantics on malformed or missing blocks.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'data');
const BOOT = fs.readFileSync(path.join(ROOT, 'app', 'pr-boot.js'), 'utf8');

// dist/data is gitignored — generate when absent. (tiers.test.cjs regenerates
// unconditionally, so a stale tree cannot survive a full CI run.)
if (!fs.existsSync(path.join(OUT, 'meta.json'))) {
  execFileSync('node', [path.join('scripts', 'build-tiers.cjs')], { cwd: ROOT, stdio: 'ignore' });
}
const meta = JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8'));
const CORE = fs.readFileSync(path.join(OUT, meta.files.core), 'utf8');
const indexRecords = JSON.parse(fs.readFileSync(path.join(OUT, meta.files.index), 'utf8'));
const corpusHost = JSON.parse(fs.readFileSync(path.join(OUT, meta.files.corpus), 'utf8'));

// vm objects live in a foreign realm whose prototypes fail deepStrictEqual's
// === prototype check. rt() re-homes deep structures via JSON; hostify()
// re-homes the flat getEntryDates result without losing undefined-vs-null or
// extra-key drift the way a JSON round-trip would.
const rt = (x) => JSON.parse(JSON.stringify(x));
const hostify = (o) => Object.assign({}, o);

const withTimeout = (p, ms, label) => Promise.race([
  Promise.resolve(p),
  new Promise((_, rej) => {
    const t = setTimeout(() => rej(new Error(`${label} timed out after ${ms} ms`)), ms);
    if (t.unref) t.unref();
  }),
]);

// ── Reference __PR: app/data.js in a VM, same harness as seed.test.cjs ──────
function loadReference() {
  const store = new Map();
  const ctx = {
    window: { dispatchEvent: () => true },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    console: { log() {}, warn() {}, error() {}, info() {} },
    CustomEvent: class { constructor(t, o) { Object.assign(this, { type: t }, o || {}); } },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
  return ctx.window.__PR;
}
const refPR = loadReference();

// ── pr-boot VM: core.js then pr-boot.js, tiers served by a fetch stub ───────
// opts: preload (localStorage k→v), quotaBytes (setItem throws above this),
// deny (RegExp of URLs to 404), embedded ({ indexText|null, corpusText|null,
// readyState } — boot from in-document JSON blocks; a null text drops that
// block AND its id from __PR_DATA, readyState 'loading' arms the
// DOMContentLoaded gate, released via the returned fireDCL()).
function bootVM(opts = {}) {
  const store = new Map(Object.entries(opts.preload || {}));
  const logs = { warn: [], error: [] };
  const events = [];
  const snapshots = {};
  const fetched = [];
  const dclListeners = [];
  const els = {
    'boot-step': { textContent: 'loading…', style: {} },
    'boot-err': { textContent: '', style: { display: 'none' } },
  };
  if (opts.embedded) {
    if (opts.embedded.indexText != null) els['pr-data-index'] = { textContent: opts.embedded.indexText };
    if (opts.embedded.corpusText != null) els['pr-data-corpus'] = { textContent: opts.embedded.corpusText };
  }
  const cap = opts.quotaBytes || Infinity;
  const ctx = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => {
        if (String(v).length > cap) throw new Error('QuotaExceededError (stub)');
        store.set(k, String(v));
      },
      removeItem: (k) => store.delete(k),
    },
    console: {
      log() {}, info() {},
      warn: (...a) => logs.warn.push(a.map(String).join(' ')),
      error: (...a) => logs.error.push(a.map(String).join(' ')),
    },
    CustomEvent: class { constructor(t, o) { Object.assign(this, { type: t }, o || {}); } },
    setTimeout,
    document: {
      getElementById: (id) => els[id] || null,
      // Absent readyState reads as parsed — pr-boot only waits on 'loading'.
      readyState: (opts.embedded && opts.embedded.readyState) || undefined,
      addEventListener: (type, fn) => { if (type === 'DOMContentLoaded') dclListeners.push(fn); },
    },
    fetch: (url) => {
      fetched.push(String(url));
      return new Promise((resolve) => {
        const bad = { ok: false, status: 404, text: () => Promise.resolve('not found'), json: () => Promise.reject(new Error('404 body')) };
        if (opts.deny && opts.deny.test(String(url))) return resolve(bad);
        fs.readFile(path.join(OUT, String(url).replace(/^data\//, '')), 'utf8', (err, body) => {
          if (err) return resolve(bad);
          resolve({ ok: true, status: 200, text: () => Promise.resolve(body), json: () => Promise.resolve(JSON.parse(body)) });
        });
      });
    },
  };
  ctx.window = {
    // Embedded __PR_DATA always names the corpus block (a null corpusText
    // keeps the id but drops the element — the missing-block failure path);
    // a null indexText drops the id too, exercising the skipped stage 1.
    __PR_DATA: opts.embedded
      ? { embeddedIndex: opts.embedded.indexText != null ? 'pr-data-index' : null, embeddedCorpus: 'pr-data-corpus' }
      : { index: `data/${meta.files.index}`, corpus: `data/${meta.files.corpus}` },
    requestIdleCallback: (cb) => setTimeout(cb, 0),
    dispatchEvent: (e) => {
      const PRc = ctx.window.__PR || {};
      events.push({ type: e.type, corpusVersion: PRc.corpusVersion, dataReady: PRc.dataReady });
      // The skinny map is replaced at stage 2 — keep a live reference, and
      // record that the persist tail already ran when 'pr:ready' fires.
      if (e.type === 'pr:index') snapshots.skinny = PRc.seedPeople;
      if (e.type === 'pr:ready') snapshots.peopleKeySeededAtReady = store.has(PRc.PEOPLE_KEY);
      return true;
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  // The shell loads core.js (module-scope constants incl. ERA_DATES,
  // PEOPLE_KEY, ATLAS_KEY) before pr-boot — replicate that order.
  vm.runInContext(CORE, ctx, { filename: meta.files.core });
  vm.runInContext(BOOT, ctx, { filename: 'pr-boot.js' });
  const PR = ctx.window.__PR;
  return {
    ctx, PR, store, logs, events, els, snapshots, fetched,
    fireDCL: () => { for (const fn of dclListeners.splice(0)) fn(); },
    // Captured synchronously, before any fetch can have resolved: the UI
    // scripts that run right after pr-boot must already see this surface.
    syncShape: {
      dataReady: PR.dataReady,
      corpusVersion: PR.corpusVersion,
      getEntryDates: typeof PR.getEntryDates,
      formatFraction: typeof PR.formatFraction,
      readyThenable: !!(PR.ready && typeof PR.ready.then === 'function'),
    },
  };
}

// One shared async boot for the happy-path tests. Preloaded storage proves the
// purge (five stale keys) and the atlas OVERWRITE (not seed-if-empty).
const STALE = ['pantheon_registry_v7', 'pantheon_registry_v8', 'pantheon_atlas_v1', 'pantheon_atlas_v2', 'pantheon_constants_v1'];
const main = bootVM({
  preload: Object.fromEntries([...STALE.map((k) => [k, 'stale']), ['pantheon_atlas_v3', '{"old":1}']]),
});
const mainDone = withTimeout(main.PR.ready, 120000, 'main async boot');

// ── No-op paths ─────────────────────────────────────────────────────────────

test('no-ops when the corpus is already present synchronously (artifact/dev page that also loads pr-boot)', async () => {
  const seed = { probe: { id: 'probe' } };
  let fetches = 0;
  const ctx = {
    window: {
      __PR: { seedPeople: seed, PEOPLE_KEY: 'pantheon_registry_v9' },
      __PR_DATA: { index: 'data/x.json', corpus: 'data/y.json' },
      dispatchEvent: () => { throw new Error('no events may fire in sync mode'); },
    },
    fetch: () => { fetches++; return Promise.reject(new Error('no fetch in sync mode')); },
  };
  vm.createContext(ctx);
  vm.runInContext(BOOT, ctx, { filename: 'pr-boot.js' });
  const PR = ctx.window.__PR;
  assert.strictEqual(PR.dataReady, true);
  assert.strictEqual(PR.seedPeople, seed, 'seedPeople must be untouched');
  assert.strictEqual(await withTimeout(PR.ready, 5000, 'sync ready'), PR, 'ready must resolve immediately with __PR');
  assert.strictEqual(fetches, 0, 'sync mode must never fetch');
  assert.ok(!('corpusVersion' in PR) && !('getEntryDates' in PR), 'sync mode must not add async-mode keys');
});

test('no-ops when the page defines no __PR_DATA (jsdom harness, dev index.html)', async () => {
  let fetches = 0;
  const ctx = { window: {}, fetch: () => { fetches++; return Promise.reject(new Error('no fetch')); } };
  vm.createContext(ctx);
  vm.runInContext(CORE, ctx, { filename: meta.files.core });
  vm.runInContext(BOOT, ctx, { filename: 'pr-boot.js' });
  const PR = ctx.window.__PR;
  assert.strictEqual(PR.dataReady, true);
  assert.strictEqual(await withTimeout(PR.ready, 5000, 'no-__PR_DATA ready'), PR);
  assert.strictEqual(fetches, 0);
});

test('does nothing at all without a window (Node/VM require)', () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BOOT, ctx, { filename: 'pr-boot.js' });
  assert.deepStrictEqual(Object.keys(ctx), [], 'a window-less context must stay untouched');
});

// ── Async mode: surface + two-stage flow ────────────────────────────────────

test('async mode exposes the full __PR surface synchronously, before any data arrives', () => {
  assert.deepStrictEqual(main.syncShape, {
    dataReady: false,
    corpusVersion: 0,
    getEntryDates: 'function',
    formatFraction: 'function',
    readyThenable: true,
  });
});

test('two-stage flow: pr:index then pr:ready, corpusVersion 1→2, dataReady flips with the corpus', async () => {
  const resolved = await mainDone;
  assert.strictEqual(resolved, main.PR, 'ready must resolve with __PR');
  assert.deepStrictEqual(rt(main.events), [
    { type: 'pr:index', corpusVersion: 1, dataReady: false },
    { type: 'pr:ready', corpusVersion: 2, dataReady: true },
  ]);
  assert.strictEqual(main.PR.dataReady, true);
  assert.strictEqual(main.PR.corpusVersion, 2);
});

test('stage 1: skinny records carry exactly the Browse/search/facet fields, for every figure', async () => {
  await mainDone;
  const skinny = main.snapshots.skinny;
  assert.ok(skinny, 'no seedPeople captured at pr:index');
  assert.strictEqual(Object.keys(skinny).length, indexRecords.length, 'skinny map must cover the whole index');
  assert.strictEqual(indexRecords.length, meta.figures, 'index length vs meta.figures');
  for (const r of indexRecords) {
    const p = skinny[r.i];
    assert.ok(p, `${r.i}: missing from skinny map`);
    assert.deepStrictEqual(rt(p), {
      id: r.i,
      name: { primary: r.n, alt: r.a },
      tradition: r.t,
      type: r.y,
      temporal: { era: r.e },
      origin: r.o,
      _dates: r.d,
    }, `${r.i}: skinny record shape`);
    // The exposed getEntryDates must return the pre-resolved pair for skinny
    // records — on the mythic axis, which both entryDateRange and
    // entryAnchorYear read first.
    assert.deepStrictEqual(hostify(main.PR.getEntryDates(p)), {
      mythicStart: r.d ? r.d[0] : null,
      mythicEnd: r.d ? r.d[1] : null,
      textualStart: null,
      textualEnd: null,
      precision: null,
    }, `${r.i}: getEntryDates on skinny record != index date pair`);
  }
});

test('stage 2: __PR.seedPeople deep-equals the corpus snapshot, and every snapshot layer lands', async () => {
  await mainDone;
  assert.deepStrictEqual(rt(main.PR.seedPeople), corpusHost.seedPeople, 'seedPeople != corpus.json seedPeople');
  for (const k of ['divinity', 'traditionMix', 'inheritedPowers', 'items', 'seedAtlas']) {
    assert.ok(main.PR[k] && typeof main.PR[k] === 'object', `__PR.${k} missing after pr:ready`);
  }
  // The ports must survive the snapshot merge (the snapshot carries no functions).
  assert.strictEqual(typeof main.PR.getEntryDates, 'function');
  assert.strictEqual(typeof main.PR.formatFraction, 'function');
});

// ── localStorage contract (mirrors the data.js tail) ────────────────────────

test('persist: stale keys purged, atlas overwritten, corpus seeded as the bare map before pr:ready', async () => {
  await mainDone;
  for (const k of STALE) assert.ok(!main.store.has(k), `stale key ${k} survived`);
  assert.ok(!main.store.has('pantheon_quota_probe'), 'quota probe key must be removed');
  // Atlas is OVERWRITE, not seed-if-empty: the preloaded {"old":1} must be gone.
  assert.deepStrictEqual(JSON.parse(main.store.get(main.PR.ATLAS_KEY)), corpusHost.seedAtlas, 'ATLAS_KEY != snapshot seedAtlas');
  // PEOPLE_KEY carries the bare id→person map (loadPeople's expected shape),
  // never the whole snapshot.
  const seeded = JSON.parse(main.store.get(main.PR.PEOPLE_KEY));
  assert.ok(!('seedPeople' in seeded), 'PEOPLE_KEY must not be the whole snapshot');
  assert.strictEqual(Object.keys(seeded).length, meta.figures, 'PEOPLE_KEY figure count');
  assert.strictEqual(seeded['greek_hesiod_zeus'].name.primary,
    corpusHost.seedPeople['greek_hesiod_zeus'].name.primary, 'PEOPLE_KEY sample record');
  assert.strictEqual(main.snapshots.peopleKeySeededAtReady, true, 'persist must run before pr:ready fires');
  assert.deepStrictEqual(main.logs.warn, [], `unexpected persist warnings: ${main.logs.warn}`);
});

test('persist: seed-if-empty leaves a user-edited PEOPLE_KEY alone', async () => {
  const b = bootVM({ preload: { pantheon_registry_v9: '{"user":"edit"}' } });
  await withTimeout(b.PR.ready, 120000, 'user-edit boot');
  assert.strictEqual(b.store.get('pantheon_registry_v9'), '{"user":"edit"}', 'user edits were clobbered');
  assert.deepStrictEqual(JSON.parse(b.store.get(b.PR.ATLAS_KEY)), corpusHost.seedAtlas, 'atlas must still be overwritten');
});

test('persist: a refused quota probe skips the corpus seed, keeps the atlas, and never fails the boot', async () => {
  const b = bootVM({ quotaBytes: 5 * 1024 * 1024 }); // real-browser-shaped cap: probe (6 MB) throws
  await withTimeout(b.PR.ready, 120000, 'quota-capped boot');
  assert.strictEqual(b.PR.dataReady, true, 'a persist failure must not fail the boot');
  assert.ok(!b.store.has(b.PR.PEOPLE_KEY), 'corpus must not be seeded when the probe is refused');
  assert.ok(b.store.has(b.PR.ATLAS_KEY), 'the small atlas write must still land');
  assert.ok(b.logs.warn.some((w) => w.includes('pantheon seed persist failed')), 'the skip must warn, as data.js does');
});

// ── Parity: the drift net for the dual implementations ─────────────────────

test('getEntryDates parity with data.js across every figure in the corpus', () => {
  const ids = Object.keys(refPR.seedPeople);
  assert.ok(ids.length >= 2700, `reference corpus unexpectedly small: ${ids.length}`);
  for (const id of ids) {
    const p = refPR.seedPeople[id];
    assert.deepStrictEqual(
      hostify(main.PR.getEntryDates(p)),
      hostify(refPR.getEntryDates(p)),
      `getEntryDates drift on ${id}`);
  }
});

test('formatFraction parity over every fraction the divinity/traditionMix tables surface, plus edge cases', () => {
  const vals = new Set([0, 1, 0.5, 1 / 3, 2 / 3, 0.25, 0.75, 0.125,
    0.5625, 3 / 1024, 1 / 7, 0.123456789, Math.PI / 10]);
  for (const d of Object.values(refPR.divinity)) {
    if (!d) continue;
    if (typeof d.fraction === 'number') vals.add(d.fraction);
    for (const c of d.contributions || []) if (typeof c.fraction === 'number') vals.add(c.fraction);
    if (d.override && typeof d.override.divinityFraction === 'number') vals.add(d.override.divinityFraction);
  }
  for (const mix of Object.values(refPR.traditionMix)) {
    for (const v of Object.values(mix)) if (typeof v === 'number') vals.add(v);
  }
  assert.ok(vals.size >= 20, `suspiciously few fraction values collected: ${vals.size}`);
  for (const v of vals) {
    assert.strictEqual(main.PR.formatFraction(v), refPR.formatFraction(v), `formatFraction drift on ${v}`);
  }
  assert.strictEqual(main.PR.formatFraction(null), refPR.formatFraction(null));
  assert.strictEqual(main.PR.formatFraction(undefined), refPR.formatFraction(undefined));
  // Pin a few absolutes so identical-but-wrong ports can't pass on parity alone.
  assert.strictEqual(main.PR.formatFraction(0.5), '½');
  assert.strictEqual(main.PR.formatFraction(1 / 3), '⅓');
  assert.strictEqual(main.PR.formatFraction(0.5625), '9⁄16');
  assert.strictEqual(main.PR.formatFraction(null), '—');
});

// ── Failure paths: loud, painted, rejected ──────────────────────────────────

test('an index fetch failure rejects ready and paints the boot overlay', async () => {
  const b = bootVM({ deny: /index-/ });
  const err = await withTimeout(
    b.PR.ready.then(() => { throw new Error('ready must reject'); }, (e) => e),
    30000, 'index-404 boot');
  assert.match(String(err && err.message), /HTTP 404/, 'rejection must carry the fetch failure');
  assert.strictEqual(b.els['boot-step'].textContent, 'failed');
  assert.strictEqual(b.els['boot-err'].style.display, 'block');
  assert.match(b.els['boot-err'].textContent, /HTTP 404/);
  assert.ok(b.logs.error.some((m) => m.includes('[pr-boot]')), 'failure must console.error');
  assert.deepStrictEqual(b.events, [], 'no events may fire when stage 1 fails');
});

test('a corpus fetch failure after a good index rejects ready but keeps the skinny stage', async () => {
  const b = bootVM({ deny: /corpus-/ });
  const err = await withTimeout(
    b.PR.ready.then(() => { throw new Error('ready must reject'); }, (e) => e),
    60000, 'corpus-404 boot');
  assert.match(String(err && err.message), /HTTP 404/);
  assert.deepStrictEqual(rt(b.events), [{ type: 'pr:index', corpusVersion: 1, dataReady: false }]);
  assert.strictEqual(b.PR.dataReady, false, 'dataReady must not flip on failure');
  assert.strictEqual(Object.keys(b.PR.seedPeople).length, meta.figures, 'the skinny index must survive the failure');
  assert.strictEqual(b.els['boot-step'].textContent, 'failed');
  assert.match(b.els['boot-err'].textContent, /HTTP 404/);
});

// ── Embedded source: the single-file artifact's inert JSON blocks ──────────
// One shared embedded boot over the REAL tier payloads, preloaded like the
// fetched `main` — the install functions are shared, so what these tests pin
// is the source seam: element reads instead of fetches, and byte-identical
// outcomes from either source.

const INDEX_TEXT = fs.readFileSync(path.join(OUT, meta.files.index), 'utf8');
const CORPUS_TEXT = fs.readFileSync(path.join(OUT, meta.files.corpus), 'utf8');
const emb = bootVM({
  embedded: { indexText: INDEX_TEXT, corpusText: CORPUS_TEXT },
  preload: Object.fromEntries([...STALE.map((k) => [k, 'stale']), ['pantheon_atlas_v3', '{"old":1}']]),
});
const embDone = withTimeout(emb.PR.ready, 120000, 'embedded boot');

// Cheap synthetic tiers for the flow-shape tests below — no need to re-parse
// 20+ MB per boot to prove ordering and failure semantics.
const TINY_INDEX = [{ i: 'probe', n: 'Probe', a: [], t: 'test', y: 'deity', e: '', o: '', d: null }];
const TINY_CORPUS = {
  seedPeople: { probe: { id: 'probe', name: { primary: 'Probe', alt: [] }, tradition: 'test' } },
  divinity: {}, traditionMix: {}, inheritedPowers: {}, items: {}, seedAtlas: { sites: [] },
};

test('embedded: the async __PR surface is identical to the fetched source, and nothing ever fetches', async () => {
  assert.deepStrictEqual(emb.syncShape, main.syncShape, 'embedded and fetched sync surfaces differ');
  await embDone;
  assert.deepStrictEqual(emb.fetched, [], 'the embedded source must never call fetch');
});

test('embedded: two-stage install — pr:index then pr:ready, skinny map covers the index, corpus lands whole', async () => {
  const resolved = await embDone;
  assert.strictEqual(resolved, emb.PR, 'ready must resolve with __PR');
  assert.deepStrictEqual(rt(emb.events), [
    { type: 'pr:index', corpusVersion: 1, dataReady: false },
    { type: 'pr:ready', corpusVersion: 2, dataReady: true },
  ]);
  assert.strictEqual(Object.keys(emb.snapshots.skinny).length, meta.figures, 'skinny map must cover the whole index');
  assert.deepStrictEqual(rt(emb.PR.seedPeople), corpusHost.seedPeople, 'seedPeople != corpus.json seedPeople');
  for (const k of ['divinity', 'traditionMix', 'inheritedPowers', 'items', 'seedAtlas']) {
    assert.ok(emb.PR[k] && typeof emb.PR[k] === 'object', `__PR.${k} missing after pr:ready`);
  }
});

test('embedded: the shared persist tail runs before pr:ready — purge, atlas overwrite, corpus seed', async () => {
  await embDone;
  for (const k of STALE) assert.ok(!emb.store.has(k), `stale key ${k} survived`);
  assert.deepStrictEqual(JSON.parse(emb.store.get(emb.PR.ATLAS_KEY)), corpusHost.seedAtlas, 'ATLAS_KEY != snapshot seedAtlas');
  assert.strictEqual(Object.keys(JSON.parse(emb.store.get(emb.PR.PEOPLE_KEY))).length, meta.figures, 'PEOPLE_KEY figure count');
  assert.strictEqual(emb.snapshots.peopleKeySeededAtReady, true, 'persist must run before pr:ready fires');
  assert.deepStrictEqual(emb.logs.warn, [], `unexpected persist warnings: ${emb.logs.warn}`);
});

test('embedded: a null embeddedIndex skips stage 1 — no pr:index, ready lands straight on the corpus', async () => {
  const b = bootVM({ embedded: { indexText: null, corpusText: JSON.stringify(TINY_CORPUS) } });
  await withTimeout(b.PR.ready, 30000, 'no-index embedded boot');
  assert.deepStrictEqual(rt(b.events), [{ type: 'pr:ready', corpusVersion: 1, dataReady: true }]);
  assert.deepStrictEqual(rt(b.PR.seedPeople), TINY_CORPUS.seedPeople);
  assert.deepStrictEqual(b.fetched, []);
});

test('embedded: nothing installs while the document is parsing; DOMContentLoaded releases both stages', async () => {
  const b = bootVM({
    embedded: { indexText: JSON.stringify(TINY_INDEX), corpusText: JSON.stringify(TINY_CORPUS), readyState: 'loading' },
  });
  // The blocks follow pr-boot in the artifact — an install before the parser
  // finishes would read a half-built document and flip main.jsx to the sync
  // boot. Give any wrongly-scheduled microtask/timeout room to fire first.
  await new Promise((r) => setTimeout(r, 30));
  assert.deepStrictEqual(b.events, [], 'no stage may install before DOMContentLoaded');
  assert.strictEqual(b.PR.corpusVersion, 0);
  b.fireDCL();
  await withTimeout(b.PR.ready, 30000, 'gated embedded boot');
  assert.deepStrictEqual(rt(b.events).map((e) => e.type), ['pr:index', 'pr:ready']);
  assert.strictEqual(b.PR.dataReady, true);
});

test('embedded: malformed corpus JSON rejects ready and paints the overlay, keeping the skinny stage', async () => {
  const b = bootVM({ embedded: { indexText: JSON.stringify(TINY_INDEX), corpusText: '{"seedPeople": tru' } });
  const err = await withTimeout(
    b.PR.ready.then(() => { throw new Error('ready must reject'); }, (e) => e),
    30000, 'malformed-corpus embedded boot');
  assert.match(String(err), /JSON|Unexpected/i, 'rejection must carry the parse failure');
  assert.deepStrictEqual(rt(b.events), [{ type: 'pr:index', corpusVersion: 1, dataReady: false }]);
  assert.strictEqual(b.PR.dataReady, false, 'dataReady must not flip on failure');
  assert.deepStrictEqual(rt(b.PR.seedPeople.probe.name), { primary: 'Probe', alt: [] }, 'the skinny index must survive the failure');
  assert.strictEqual(b.els['boot-step'].textContent, 'failed');
  assert.strictEqual(b.els['boot-err'].style.display, 'block');
  assert.ok(b.logs.error.some((m) => m.includes('[pr-boot]')), 'failure must console.error');
});

test('embedded: a missing corpus block rejects ready naming the element — never silent', async () => {
  const b = bootVM({ embedded: { indexText: JSON.stringify(TINY_INDEX), corpusText: null } });
  const err = await withTimeout(
    b.PR.ready.then(() => { throw new Error('ready must reject'); }, (e) => e),
    30000, 'missing-corpus embedded boot');
  assert.match(String(err && err.message), /pr-data-corpus/, 'the rejection must name the missing block');
  assert.strictEqual(b.els['boot-step'].textContent, 'failed');
  assert.match(b.els['boot-err'].textContent, /pr-data-corpus/);
});

test('embedded: malformed index JSON rejects ready before any event fires', async () => {
  const b = bootVM({ embedded: { indexText: '[{"i": nope', corpusText: JSON.stringify(TINY_CORPUS) } });
  const err = await withTimeout(
    b.PR.ready.then(() => { throw new Error('ready must reject'); }, (e) => e),
    30000, 'malformed-index embedded boot');
  assert.match(String(err), /JSON|Unexpected/i);
  assert.deepStrictEqual(b.events, [], 'no events may fire when stage 1 fails');
  assert.strictEqual(b.els['boot-step'].textContent, 'failed');
});
