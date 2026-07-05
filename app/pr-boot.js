// ═══════════════════════════════════════════════════════════════════════════
//  pr-boot.js — async data loader for the multi-file Pages shell
//
//  Loaded ONLY by the Pages shell, after data/core-<hash>.js (the module-scope
//  __PR constants) and before the UI scripts. Everywhere else — dev
//  index.html, the single-file artifact, jsdom, the Node-VM consumers — the
//  corpus is already present synchronously and this file must change nothing:
//  the capability check below is the seam that keeps those modes untouched.
//
//  Async contract (the shell injects window.__PR_DATA = { index, corpus },
//  URLs relative to the page; core.js is a plain script tag the shell emits):
//    stage 1  fetch index-<h>.json → skinny id→person map on __PR.seedPeople
//             (only the fields Browse/search/facets read), corpusVersion 0→1,
//             CustomEvent 'pr:index' on window.
//    stage 2  fetch corpus-<h>.json (the full post-pipeline __PR snapshot),
//             JSON.parse off the critical path, Object.assign onto __PR,
//             corpusVersion 1→2, dataReady = true, the localStorage contract
//             mirrored from the data.js tail, 'pr:ready', resolve __PR.ready.
//  Failures reject __PR.ready and paint the boot overlay — never silent.
//
//  IIFE-wrapped for the same reason as data.js: state.jsx declares
//  PEOPLE_KEY, ATLAS_KEY, and getEntryDates at classic-script top level, and
//  a second top-level declaration of any of them kills the page.
// ═══════════════════════════════════════════════════════════════════════════

(function () {

if (typeof window === 'undefined') return;

// Capability detection: a synchronously-present corpus (inline data.js ran
// before us) or a page that never declared the tier URLs means the sync
// world — mark it ready and get out of the way. Nothing else may be touched
// here: this branch is what keeps dev mode, the artifact, jsdom, and the
// Node-VM consumers byte-for-byte on today's behavior.
if ((window.__PR && window.__PR.seedPeople) || !window.__PR_DATA) {
  const PR = window.__PR = window.__PR || {};
  PR.dataReady = true;
  PR.ready = Promise.resolve(PR);
  return;
}

const PR = window.__PR = window.__PR || {}; // core.js normally created this
const TIERS = window.__PR_DATA;

// ─── Ported __PR functions ──────────────────────────────────────────────────
// getEntryDates and formatFraction are the only __PR functions the shipped
// JSX calls; data.js is not on this page, so pr-boot carries faithful ports.
// test/prboot-parity.test.cjs holds them equal to data.js over the whole
// corpus — a change to either copy without the other fails there.

// Port of app/data.js getEntryDates (~L40822), plus one skinny-record fast
// path: index records carry the build-resolved [start, end] pair as _dates
// (one axis, mythic first — the same rule build-tiers.cjs used to compute
// it). Returning that pair on the mythic axis reproduces both consumers
// exactly: entryDateRange formats whichever axis is non-null, and
// entryAnchorYear reads mythicStart ?? textualStart. Full records never
// carry _dates and take the compute path below.
const getEntryDates = (entry) => {
  if (entry && entry._dates !== undefined) {
    const d = entry._dates;
    return {
      mythicStart:  d ? (d[0] ?? null) : null,
      mythicEnd:    d ? (d[1] ?? null) : null,
      textualStart: null,
      textualEnd:   null,
      precision:    null,
    };
  }
  const t = entry?.temporal || {};
  const era = t.era;
  const tradition = entry?.tradition;

  // Per-entry overrides come first
  const entryOverride = {
    mythicStart: t.mythicStart,
    mythicEnd: t.mythicEnd,
    textualStart: t.textualStart,
    textualEnd: t.textualEnd,
    precision: t.mythicPrecision,
  };

  // Era default. Unlike data.js, ERA_DATES is not in file scope here — it
  // arrives on __PR via core.js, which the shell loads before this script.
  const ERA_DATES = (window.__PR && window.__PR.ERA_DATES) || {};
  const eraDefault = (ERA_DATES[tradition] && ERA_DATES[tradition][era]) || {};

  return {
    mythicStart:  entryOverride.mythicStart  !== undefined ? entryOverride.mythicStart  : (eraDefault.mythicStart  ?? null),
    mythicEnd:    entryOverride.mythicEnd    !== undefined ? entryOverride.mythicEnd    : (eraDefault.mythicEnd    ?? null),
    textualStart: entryOverride.textualStart !== undefined ? entryOverride.textualStart : (eraDefault.textualStart ?? null),
    textualEnd:   entryOverride.textualEnd   !== undefined ? entryOverride.textualEnd   : (eraDefault.textualEnd   ?? null),
    precision:    entryOverride.precision    !== undefined ? entryOverride.precision    : (eraDefault.precision    ?? null),
  };
};

// Port of app/data.js COMMON_FRACTIONS + formatFraction (~L28731), verbatim.
const COMMON_FRACTIONS = [
  [1, '1'], [0, '0'], [0.5, '½'], [0.25, '¼'], [0.75, '¾'],
  [0.125, '⅛'], [0.375, '⅜'], [0.625, '⅝'], [0.875, '⅞'],
  [1 / 3, '⅓'], [2 / 3, '⅔'],
];
const formatFraction = (f) => {
  if (f === null || f === undefined) return '—';
  for (const [val, sym] of COMMON_FRACTIONS) if (Math.abs(f - val) < 1e-9) return sym;
  // Divinity fractions are dyadic rationals — render as a reduced n⁄d.
  for (let den = 16; den <= 1024; den *= 2) {
    const x = f * den;
    if (Math.abs(x - Math.round(x)) < 1e-9) {
      const gcd = (a, b) => (b ? gcd(b, a % b) : a);
      let num = Math.round(x), d = den;
      const k = gcd(num, d) || 1;
      return `${num / k}⁄${d / k}`;
    }
  }
  return f.toFixed(3);
};

// ─── Async-mode __PR surface ────────────────────────────────────────────────
// Assigned synchronously, before any fetch can resolve: the UI scripts that
// execute after this one must always find the functions, the flags, and the
// promise — only the data itself arrives later.
let resolveReady, rejectReady;
const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
// fail() below already paints the overlay and console.errors; this guard only
// keeps a rejection that fires before any consumer attaches from ALSO
// surfacing as a duplicate unhandledrejection in the head trap.
ready.catch(() => {});
Object.assign(PR, {
  dataReady: false,
  corpusVersion: 0,
  ready,
  getEntryDates,
  formatFraction,
});

const dispatch = (type) => window.dispatchEvent(new CustomEvent(type));

// Same pattern as the head error trap (index.html:17-35): a dead data load
// must be loud and visible in the boot overlay, not just the console.
const fail = (err) => {
  console.error('[pr-boot] data load failed', err);
  if (typeof document !== 'undefined') {
    const step = document.getElementById('boot-step');
    const box = document.getElementById('boot-err');
    if (step) step.textContent = 'failed';
    if (box) { box.style.display = 'block'; box.textContent = String((err && (err.stack || err.message)) || err); }
  }
  rejectReady(err);
};

const fetchTier = (url, as) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('HTTP ' + res.status + ' fetching ' + url);
  return as === 'text' ? res.text() : res.json();
});

// Parse the 20+ MB snapshot off the critical path — the skinny Browse rows
// already on screen must not jank behind it.
const parseOnIdle = (text) => new Promise((res, rej) => {
  const run = () => { try { res(JSON.parse(text)); } catch (e) { rej(e); } };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 0);
});

// Skinny person records: exactly the fields the first-paint views read —
// Browse rows (displayName/altNames/tradition/type/era/origin/date pair) and
// the search/facet layer (state.jsx searchHaystacks, traditionList,
// typeCounts). Transliterations are corpus-stage, so search misses native-
// term spellings only during the skinny window. Everything richer stays
// behind navigation until the full snapshot lands.
const adaptIndex = (records) => {
  const map = {};
  for (const r of records) {
    map[r.i] = {
      id: r.i,
      name: { primary: r.n, alt: r.a || [] },
      tradition: r.t,
      type: r.y,
      temporal: { era: r.e },
      origin: r.o,
      _dates: r.d === undefined ? null : r.d, // pre-resolved [start,end] | null
    };
  }
  return map;
};

// The localStorage contract, mirrored from the data.js tail (~L614676-710):
// purge the retired seed keys; OVERWRITE the atlas in its own try block
// (returning visitors must never keep a stale map, and a corpus quota throw
// must not veto this small write); then seed-if-empty the figure corpus
// behind the same disposable ~6 MB quota probe — real browsers cap
// localStorage near ~5 MB, so the 19.5 MB stringify is skipped outright
// where the write is guaranteed to throw, while quota-free storage (the
// srcdoc Map shim, test stubs) passes the probe and keeps seed-if-empty.
// PEOPLE_KEY gets the bare id→person map — loadPeople expects that shape,
// never the whole snapshot.
const persist = (snapshot) => {
  const PEOPLE_KEY = PR.PEOPLE_KEY || 'pantheon_registry_v9';
  const ATLAS_KEY = PR.ATLAS_KEY || 'pantheon_atlas_v3';
  for (const stale of ['pantheon_registry_v7', 'pantheon_registry_v8', 'pantheon_atlas_v1', 'pantheon_atlas_v2', 'pantheon_constants_v1']) {
    try { localStorage.removeItem(stale); } catch (_) {}
  }
  try {
    localStorage.setItem(ATLAS_KEY, JSON.stringify(snapshot.seedAtlas));
  } catch (e) { console.warn('pantheon atlas persist failed', e); }
  try {
    localStorage.setItem('pantheon_quota_probe', 'x'.repeat(6 * 1024 * 1024));
    localStorage.removeItem('pantheon_quota_probe');
    if (!localStorage.getItem(PEOPLE_KEY)) {
      localStorage.setItem(PEOPLE_KEY, JSON.stringify(snapshot.seedPeople));
    }
  } catch (e) { console.warn('pantheon seed persist failed', e); }
};

// Both fetches start now and stream while the shell's UI scripts parse;
// installs stay ordered (index → corpus) so corpusVersion and the events are
// monotonic. Persist runs BEFORE 'pr:ready' so a listener that re-runs
// loadPeople sees localStorage in its settled state, same as the sync boot.
const indexFetch = fetchTier(TIERS.index, 'json');
const corpusFetch = fetchTier(TIERS.corpus, 'text');
// Surfaced via the chain below; an index failure must not strand this
// rejection as a second unhandled error.
corpusFetch.catch(() => {});

indexFetch
  .then((records) => {
    PR.seedPeople = adaptIndex(records);
    PR.corpusVersion++;
    dispatch('pr:index');
    return corpusFetch;
  })
  .then(parseOnIdle)
  .then((snapshot) => {
    // {seedPeople, divinity, traditionMix, inheritedPowers, items, seedAtlas}
    Object.assign(PR, snapshot);
    PR.corpusVersion++;
    PR.dataReady = true;
    persist(snapshot);
    dispatch('pr:ready');
    resolveReady(PR);
  })
  .catch(fail);

})();
