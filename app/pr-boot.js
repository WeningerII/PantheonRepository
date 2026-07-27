// ═══════════════════════════════════════════════════════════════════════════
//  pr-boot.js — async data loader for the Pages shell and the artifact
//
//  Loaded by the multi-file Pages shell AND the single-file artifact, after
//  the core constants (data/core-<hash>.js as a tag, or its body inlined) and
//  before the UI scripts. Everywhere else — dev index.html, jsdom, the
//  Node-VM consumers — the corpus is already present synchronously and this
//  file must change nothing: the capability check below is the seam that
//  keeps those modes untouched.
//
//  Async contract — window.__PR_DATA names ONE source for the tiers:
//    fetched   { index: url, corpus: url }   (Pages shell; page-relative)
//    embedded  { embeddedIndex: elementId|null, embeddedCorpus: elementId }
//              (single-file artifact; ids of inert <script type=
//              "application/json"> blocks — no fetch() ever runs, so
//              file:// and srcdoc keep working)
//  Either way the same two stages install through the same functions:
//    stage 1  index records → skinny id→person map on __PR.seedPeople (only
//             the fields Browse/search/facets read), corpusVersion++,
//             CustomEvent 'pr:index' on window. Skipped when the source
//             carries no index (embeddedIndex absent/null).
//    stage 2  the full post-pipeline __PR snapshot, JSON.parsed off the
//             critical path, Object.assign onto __PR, corpusVersion++,
//             dataReady = true, the localStorage contract mirrored from the
//             data.js tail, 'pr:ready', resolve __PR.ready.
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
  // The registry views build from the synchronously-present corpus — nothing to
  // fetch, everything ready. loadRegistry is a resolved no-op so the shared
  // consumer code (Shell's per-view load trigger) is mode-agnostic.
  PR.registryReady = { items: true, powers: true, domains: true };
  PR.registryVersion = 0;
  PR.loadRegistry = function () { return PR.ready; };
  // Same mode-agnostic no-ops for the projection tiers (atlas, edges) — the
  // sync corpus already carries everything they would deliver.
  PR.tierReady = { atlas: true, edges: true };
  PR.loadTier = function () { return PR.ready; };
  PR.loadDetail = function () { return PR.ready; };
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
  // Per-view registry readiness — each flips true when its tier installs (or
  // when the full corpus lands). registryVersion bumps on every install so the
  // UI's list memos re-read the newly-available registry. See loadRegistry.
  registryReady: { items: false, powers: false, domains: false },
  registryVersion: 0,
  // Projection-tier readiness (the corpus-blob replacements): atlas unblocks
  // the Atlas view + divinity/mix lookups, edges unblocks Graph/Lineage.
  // Either the tier install or the full corpus flips these. See loadTier.
  tierReady: { atlas: false, edges: false },
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

// A corpus failure AFTER the index installed is NOT fatal: Browse runs off the
// skinny index, so blanking the whole app behind the boot overlay throws away a
// working experience over a lost enhancement (Graph / Atlas / figure relations /
// the Items·Powers·Domains registries). Reject ready so awaiters settle, and log
// loudly — but leave the overlay untouched. main.jsx reveals the index-only app
// on this rejection. Contrast fail(), reserved for an index failure with nothing
// to render.
const corpusFail = (err) => {
  console.error('[pr-boot] corpus load failed — running on the skinny index. Browse works, and any view whose own tier landed (Atlas / Graph / Items / Powers / Domains) keeps working; figure detail and anything still corpus-bound stay unavailable until reload.', err);
  PR.corpusFailed = true;
  rejectReady(err);
};

const fetchTier = (url, as) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('HTTP ' + res.status + ' fetching ' + url);
  return as === 'text' ? res.text() : res.json();
});

// Parse the 20+ MB snapshot off the critical path — the skinny Browse rows
// already on screen must not jank behind it. Accepts the text or a thunk for
// it: the embedded source defers even the textContent read (materializing a
// 20+ MB string) into the idle slot.
const parseOnIdle = (text) => new Promise((res, rej) => {
  const run = () => { try { res(JSON.parse(typeof text === 'function' ? text() : text)); } catch (e) { rej(e); } };
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
      // r.x is the first transliterations entry [key, value] — the one piece
      // of the map Browse rows display (the native-script sub-line). Carrying
      // it keeps a skinny row pixel-identical to its hydrated full record.
      name: { primary: r.n, alt: r.a || [], ...(r.x ? { transliterations: { [r.x[0]]: r.x[1] } } : {}) },
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

// ─── Deploy-skew recovery: re-pin hashed tier names from data/meta.json ─────
// Every lazy tier is fetched by a CONTENT-HASHED filename pinned into the shell
// at build time — the only cache-bust available under Pages' fixed max-age=600.
// That max-age cuts the other way on the shell itself: for up to ten minutes
// after a deploy (and indefinitely in a tab left open across one) a browser
// holds a shell pinning the PREVIOUS build's hashes, while /data/ already holds
// only the new ones. Every such fetch 404s.
//
// Because build-tiers hashes each shard by ITS OWN content, a deploy renames
// only the shards whose figures actually changed — so the 404s land on an
// arbitrary SUBSET of figures. That is the whole shape of the bug: a handful of
// figures fail while the rest of the app works perfectly.
//
// data/meta.json is UNHASHED and always current, so one cache-busted fetch of
// it re-pins every tier name and the retry succeeds — the skew heals itself
// without a reload. Fetched at most once per page load; concurrent callers
// share the promise, and a failed refresh drops it so a later attempt retries.
let manifestPromise = null;
const refreshManifest = () => manifestPromise || (manifestPromise = fetch(
  'data/meta.json?rev=' + Date.now(), { cache: 'reload' })
  .then((res) => {
    if (!res.ok) throw new Error('HTTP ' + res.status + ' fetching data/meta.json');
    return res.json();
  })
  .then((meta) => {
    // Re-pin exactly the globals build.py writes into the shell, in the same
    // shapes, so every loader below picks the fresh names up transparently.
    if (meta.files) {
      if (window.__PR_DATA && window.__PR_DATA.corpus && meta.files.corpus) {
        window.__PR_DATA.corpus = 'data/' + meta.files.corpus;
      }
      if (meta.files.atlas && meta.files.edges) {
        window.__PR_TIER_DATA = { atlas: 'data/' + meta.files.atlas, edges: 'data/' + meta.files.edges };
      }
    }
    if (meta.registry) {
      window.__PR_REGISTRY_DATA = {
        items: 'data/' + meta.registry.items,
        powers: 'data/' + meta.registry.powers,
        domains: 'data/' + meta.registry.domains,
      };
    }
    if (meta.details && meta.details.shards) {
      window.__PR_DETAILS_DATA = {
        dir: 'data/' + meta.details.dir + '/',
        buckets: meta.buckets,
        shards: meta.details.shards,
      };
    }
    console.warn('[pr-boot] tier names re-pinned from data/meta.json (deploy skew recovered)');
    return meta;
  })
  .catch((err) => { manifestPromise = null; throw err; }));
PR.refreshManifest = refreshManifest;

// Fetch a hashed tier, and on failure re-pin from the manifest and retry ONCE
// with the current name. `fresh()` re-reads the (now refreshed) pinned URL for
// this tier — re-read rather than passed in, because the refresh may change the
// bucket count as well as the filename. If the name did not change, the file is
// genuinely unreachable and the ORIGINAL error propagates: callers distinguish
// "stale pin" (invisible, recovered) from "offline" (surfaced) for free.
const fetchPinned = (url, as, fresh) => fetchTier(url, as)
  .catch((err) => refreshManifest().then(() => {
    const next = fresh();
    if (!next || next === url) throw err;
    return fetchTier(next, as);
  }, () => { throw err; }));

// ─── Lazy per-view registry tiers ───────────────────────────────────────────
// Items/Powers/Domains render from their own small precomputed tier (items /
// powers / domains.json — the exact runtime-registry shape state.jsx builds
// from seedPeople), fetched on first navigation instead of gating on the 20 MB
// corpus. This is the Browse-from-the-skinny-index pattern applied to the
// registries: the view unblocks the moment its ~0.4-0.9 MB gz tier lands.
// Idempotent per kind; a failed fetch (or the corpus arriving first) falls back
// to the corpus, which carries the same data.
const registryPromises = {};
const installRegistry = (kind, map) => {
  PR[kind] = map;                     // PR.items / PR.powers / PR.domains
  PR.registryReady[kind] = true;
  PR.registryVersion++;
  dispatch('pr:registry');
};
const loadRegistry = (kind) => {
  if (!PR.registryReady || !(kind in PR.registryReady)) return ready;
  if (PR.registryReady[kind]) return Promise.resolve(PR);
  if (registryPromises[kind]) return registryPromises[kind];
  const urls = window.__PR_REGISTRY_DATA;
  const url = urls && urls[kind];
  // No tier URL (embedded artifact): the corpus carries every registry — wait
  // on it rather than fetching a file that was never emitted.
  if (!url) return (registryPromises[kind] = ready);
  const p = fetchPinned(url, 'json', () => (window.__PR_REGISTRY_DATA || {})[kind])
    .then((map) => { installRegistry(kind, map); return PR; })
    .catch((err) => {
      // Not fatal: the corpus provides the same data. Fall back to it, and drop
      // the cached rejection so the corpus arrival can still mark this ready.
      console.warn('[pr-boot] registry tier ' + kind + ' failed; falling back to corpus', err);
      delete registryPromises[kind];
      return ready;
    });
  return (registryPromises[kind] = p);
};
PR.loadRegistry = loadRegistry;

// ─── Lazy projection tiers (atlas, edges) ───────────────────────────────────
// The corpus-blob replacements (projections migration Phase 2). Same
// idempotent per-kind promise cache and catch-to-corpus fallback as
// loadRegistry — the production-proven degrade seam.
//
//   atlas  {seedAtlas, divinity, traditionMix, inheritedPowers} — assigned
//          onto __PR verbatim; the Atlas view and the divinity/mix/descent
//          lookups read exactly these keys.
//   edges  id → {p, pr, r} — rehydrated ONTO the skinny index records as
//          parentIds / parentRoles / relations[{kind, personId}]: precisely
//          the fields Graph, Lineage, and childrenOf consume. The transform
//          is specified (and held lossless) by test/scale-gates.test.cjs;
//          test/multifile.test.cjs holds this runtime to the same result.
// Installs bump corpusVersion (these change record-derived caches) and
// announce via 'pr:tier'; state.jsx reloads people/atlas on that event.
const tierPromises = {};
const installAtlasTier = (tier) => {
  Object.assign(PR, tier);
  PR.tierReady.atlas = true;
  // The persist tail's atlas half, moved here for the corpus-less shell: a
  // returning visitor must never keep a stale map (the exact production
  // incident storage.test.cjs pins on the sync path). Small write, own try.
  try {
    const ATLAS_KEY = PR.ATLAS_KEY || 'pantheon_atlas_v3';
    localStorage.setItem(ATLAS_KEY, JSON.stringify(tier.seedAtlas));
  } catch (e) { console.warn('pantheon atlas persist failed', e); }
  PR.corpusVersion++;
  dispatch('pr:tier');
};
const installEdgesTier = (edges) => {
  const P = PR.seedPeople || {};
  for (const id of Object.keys(P)) {
    const rec = P[id];
    const e = edges[id];
    rec.parentIds = (e && e.p) ? e.p : [];
    if (e && e.pr) rec.parentRoles = e.pr;
    rec.relations = (e && e.r) ? e.r.map((x) => ({ kind: x.k, personId: x.id })) : [];
  }
  PR.tierReady.edges = true;
  PR.corpusVersion++;
  dispatch('pr:tier');
};
const loadTier = (kind) => {
  if (!PR.tierReady || !(kind in PR.tierReady)) return ready;
  if (PR.tierReady[kind]) return Promise.resolve(PR);
  if (tierPromises[kind]) return tierPromises[kind];
  const urls = window.__PR_TIER_DATA;
  const url = urls && urls[kind];
  // No tier URL (embedded artifact): the corpus carries everything — wait on it.
  if (!url) return (tierPromises[kind] = ready);
  const p = fetchPinned(url, 'json', () => (window.__PR_TIER_DATA || {})[kind])
    .then((data) => {
      (kind === 'atlas' ? installAtlasTier : installEdgesTier)(data);
      return PR;
    })
    .catch((err) => {
      console.warn('[pr-boot] tier ' + kind + ' failed; falling back to corpus', err);
      delete tierPromises[kind];
      return ready;
    });
  return (tierPromises[kind] = p);
};
PR.loadTier = loadTier;

// ─── Lazy figure detail (content-hashed shards) ─────────────────────────────
// loadDetail(id) fetches the hash-bucketed shard carrying the figure's FULL
// record (plus precomputed _divinity/_inherited/_traditionMix) and merges the
// whole bucket into __PR.seedPeople — full records replace skinny ones, each
// marked _full so the Shell can gate Detail per figure instead of on the
// whole corpus. Derived layers install into the same lookups the atlas tier
// fills, so divinityInfo()/traditionMix() work figure-by-figure even before
// that tier lands. Merging into the shared map (never "set current figure")
// makes late responses harmless: a stale shard arrival just hydrates more
// records — the render keys off selectedId, not off the response.
// The manifest travels in window.__PR_DETAILS_DATA {dir, buckets, shards[]},
// pinned by the build like every other hashed tier name.
const shardPromises = {};
const detailBucketOf = (id, n) => { let s = 0; for (let k = 0; k < id.length; k++) s = (s + id.charCodeAt(k)) % n; return s; };
const loadDetail = (id) => {
  if (PR.dataReady) return Promise.resolve(PR);
  const DET = window.__PR_DETAILS_DATA;
  if (!DET || !DET.shards || !id) return ready;
  const have = PR.seedPeople && PR.seedPeople[id];
  if (have && have._full) return Promise.resolve(PR);
  const b = detailBucketOf(id, DET.buckets);
  if (shardPromises[b]) return shardPromises[b];
  // A 404 here is almost always deploy skew: this shell pins the previous
  // build's shard hash. fetchPinned re-pins from data/meta.json and retries with
  // the current name — recomputing the bucket from the fresh manifest, since a
  // corpus that crosses a size threshold changes the bucket count too. The user
  // never sees it; the figure just opens.
  const p = fetchPinned(DET.dir + DET.shards[b], 'json', () => {
    const D2 = window.__PR_DETAILS_DATA;
    if (!D2 || !D2.shards) return null;
    return D2.dir + D2.shards[detailBucketOf(id, D2.buckets)];
  })
    .then((recs) => {
      const P = PR.seedPeople || (PR.seedPeople = {});
      PR.divinity = PR.divinity || {};
      PR.inheritedPowers = PR.inheritedPowers || {};
      PR.traditionMix = PR.traditionMix || {};
      for (const rid of Object.keys(recs)) {
        const rec = recs[rid];
        // Merge INTO the existing skinny record — never replace it. Object
        // identity is what keeps this invisible: the people array, the byId
        // map, and every React.memo'd Browse row hold references to these
        // objects, so an identity-preserving merge means no rebuilt arrays,
        // no cache invalidation, no row re-renders — hydration cannot cause
        // layout shift. (Replacing records here churned every memo and
        // re-rendered the whole list per hovered bucket — the "UI seizure".)
        const existing = P[rid];
        if (existing) {
          Object.assign(existing, rec);
          // The skinny fast-path marker must not survive hydration: the full
          // record computes dates (identical output — build-tiers derived
          // _dates from the same rule) and carries precision/axes Detail uses.
          delete existing._dates;
          existing._full = true;
        } else {
          rec._full = true;
          P[rid] = rec;
        }
        if (rec._divinity != null && PR.divinity[rid] == null) PR.divinity[rid] = rec._divinity;
        if (rec._inherited && !PR.inheritedPowers[rid]) PR.inheritedPowers[rid] = rec._inherited;
        if (rec._traditionMix && !PR.traditionMix[rid]) PR.traditionMix[rid] = rec._traditionMix;
      }
      // A LIGHT event, deliberately not 'pr:tier': detail hydration changes
      // no list-visible data, so state.jsx must not reload people/atlas (that
      // rebuild — searchHaystacks, filtered, byId — on every hovered bucket
      // was the render-thrash half of the seizure). The bump only lets the
      // open Detail pane re-read its now-full record.
      PR.detailVersion = (PR.detailVersion || 0) + 1;
      dispatch('pr:detail');
      return PR;
    })
    .catch((err) => {
      console.warn('[pr-boot] detail shard ' + b + ' failed', err);
      delete shardPromises[b]; // next call retries the fetch
      // Legacy shells (corpus URL present) fall back to the corpus, which
      // carries the same records. Projection shells have no corpus: rethrow so
      // the Shell can surface a retryable in-app error. It must NOT navigate
      // away — registry/<id>.html is the crawler mirror, a different design in
      // a different stylesheet, and sending a reader there over one dropped
      // request ejects them from the app with no way back.
      if (TIERS.corpus) return ready;
      throw err;
    });
  return (shardPromises[b] = p);
};
PR.loadDetail = loadDetail;

// ─── Install stages — ONE path for both sources ─────────────────────────────
// Everything behavioral (corpusVersion, the events, dataReady, the persist
// tail, ready resolution) lives here so the fetched and embedded sources
// cannot drift. Persist runs BEFORE 'pr:ready' so a listener that re-runs
// loadPeople sees localStorage in its settled state, same as the sync boot.
const installIndex = (records) => {
  PR.seedPeople = adaptIndex(records);
  PR.corpusVersion++;
  dispatch('pr:index');
  // The registry tiers (items + powers + domains) are NOT warmed here. They
  // total 3,017,420 B gzipped — 77% of first-load transfer — for three views
  // the visitor has not opened, and CLAUDE.md forbids first load carrying a
  // cost that scales with the whole corpus. Warming them measured mobile TBT
  // 1,440 ms -> 489 ms and performance 56 -> 68 on its own.
  //
  // Instant navigation is preserved without the cold-load cost: the view
  // buttons prefetch on hover/focus/pointerdown (Shell.jsx), which beats the
  // click by far more than enough, and Shell's own effect still fetches on
  // demand for anyone who arrives by deep link or keyboard.
  //
  // The projection tiers below stay warmed — atlas is 163 KB gz against the
  // registries' 3 MB, and Graph/Atlas have no equivalent cheap seam.
  if (typeof window.requestIdleCallback === 'function' && window.__PR_TIER_DATA) {
    window.requestIdleCallback(() => { loadTier('atlas'); loadTier('edges'); });
  }
};
const installCorpus = (snapshot) => {
  // {seedPeople, divinity, traditionMix, inheritedPowers, items, seedAtlas}
  Object.assign(PR, snapshot);
  PR.corpusVersion++;
  PR.dataReady = true;
  // The full corpus carries every registry's source data (seedPeople faculties
  // / domains, PR.items) — any registry tier that never arrived is now
  // satisfiable, so unblock all three views. No separate 'pr:registry' dispatch:
  // the 'pr:ready' below already refreshes the UI, which re-reads registryReady.
  for (const k of Object.keys(PR.registryReady)) PR.registryReady[k] = true;
  PR.registryVersion++;
  // Likewise the projection tiers: the snapshot IS their superset.
  for (const k of Object.keys(PR.tierReady)) PR.tierReady[k] = true;
  persist(snapshot);
  dispatch('pr:ready');
  resolveReady(PR);
};

if (TIERS.embeddedCorpus) {
  // Embedded source (single-file artifact): the tiers sit in inert
  // <script type="application/json"> blocks the JS parser never tokenized.
  // The blocks follow this script in the document, and the UI scripts must
  // take the skeleton boot (main.jsx keys it off seedPeople's absence), so
  // stage 1 waits for the document to finish parsing — never a microtask
  // that would land between inline scripts.
  const whenParsed = new Promise((res) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => res(), { once: true });
    } else res();
  });
  const readBlock = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error('embedded data block #' + id + ' is missing');
    return el.textContent;
  };
  whenParsed
    .then(() => {
      if (TIERS.embeddedIndex) installIndex(JSON.parse(readBlock(TIERS.embeddedIndex)));
      return parseOnIdle(() => readBlock(TIERS.embeddedCorpus));
    })
    .then(installCorpus)
    .catch(fail);
} else if (TIERS.corpus) {
  // Legacy fetched source (a pre-projections shell cached under Pages'
  // max-age=600 during a deploy): both fetches start now, installs stay
  // ordered (index → corpus). Kept fully functional — the corpus artifact is
  // still emitted — so a skewed deploy never strands an old shell.
  const indexFetch = fetchTier(TIERS.index, 'json');
  const corpusFetch = fetchTier(TIERS.corpus, 'text');
  // Surfaced via the chain below; an index failure must not strand this
  // rejection as a second unhandled error.
  corpusFetch.catch(() => {});

  indexFetch
    .then((records) => {
      installIndex(records);
      // Once the skinny index is in, Browse is fully usable — so the corpus
      // (an enhancement) must degrade, not blank the app. Its failure routes to
      // corpusFail (reject + log, no overlay); only an INDEX failure reaches the
      // fatal .catch(fail) below, where there is genuinely nothing to render.
      return corpusFetch.then(parseOnIdle).then(installCorpus).catch(corpusFail);
    })
    .catch(fail);
} else {
  // Projections source (Phase 3): the index IS the boot. Everything richer
  // arrives through its own tier — atlas/edges on idle or navigation, figure
  // records per detail-shard open, registries per view. ready resolves here
  // (main.jsx hides the boot overlay on it); dataReady stays false forever —
  // it means "full corpus resident", which no longer happens, and every view
  // gate already keys on its own tier flag. The persist tail shrinks to the
  // stale-key purge (the atlas half moved into installAtlasTier; the
  // PEOPLE_KEY seed-if-empty died with the snapshot — it was dead code in
  // real browsers behind the quota probe, and loadPeople still honors a
  // legacy-environment value if one exists).
  fetchTier(TIERS.index, 'json')
    .then((records) => {
      installIndex(records);
      for (const stale of ['pantheon_registry_v7', 'pantheon_registry_v8', 'pantheon_atlas_v1', 'pantheon_atlas_v2', 'pantheon_constants_v1']) {
        try { localStorage.removeItem(stale); } catch (_) {}
      }
      dispatch('pr:ready');
      resolveReady(PR);
    })
    .catch(fail);
}

})();
