# Load-time re-architecture proposal

Status: proposal (no code changes yet). Produced from a measured audit of the
current boot path — real Chromium benchmarks of `dist/pantheon-registry.html`,
an anatomy of `app/data.js`, a data-flow map of the UI, and an evaluation of
three candidate architectures against the project's constraints.

## TL;DR

Boot is >99 % CPU-bound, and ~83 % of the time to first React commit is spent
on one thing: the 23 MB corpus shipping as *executable JavaScript* that also
*re-runs its entire deterministic build pipeline in every visitor's browser*.
The fix is not a framework migration. It is:

1. ship data as **data** (inert JSON, parsed off the critical path), not as JS
   source;
2. run the deterministic seed pipeline (33 passes + derived layers) **once at
   build time** — the repo already has 90 % of this in `scripts/build-tiers.cjs`,
   currently tested in CI but consumed by nothing;
3. keep the synchronous `window.__PR` contract intact behind a
   capability-detected dual-mode boot, so dev mode, the single-file artifact,
   the jsdom suite, and the Node-VM consumers (`seed.test`, `mcp/corpus.mjs`,
   `build-tiers.cjs`) are byte-for-byte unaffected.

Predicted result on the benchmark machine: first React commit drops from
**2.4 s → ~0.3 s** on the Pages deploy, with real Browse rows at ~0.5 s.
Real-world critical-path transfer drops from **4.95 MB gz → ~0.25 MB gz**
(~20×). The single-file artifact roughly halves its boot via the same
precompute + an inert-JSON payload encoding.

## Measured diagnosis

Benchmarks: Chromium 141 headless, cold profile, loopback server, 4-vCPU Xeon
2.10 GHz; medians of 3 runs. CDN bodies were served locally after verifying
sha384-identity with the SRI pins (the sandbox proxy blocks cdnjs), so these
numbers are pure CPU — real networks add transfer time on top.

Production artifact (`dist/pantheon-registry.html`, 24.6 MB / 4.95 MB gz):

| Milestone | Time |
|---|---|
| HTML fetched (loopback) | 14 ms |
| Boot splash first paint | 132 ms |
| `window.__PR` defined | 989 ms |
| `seedPeople` built | 1,843 ms |
| `__bootDone` | 2,009 ms |
| First React commit (`#app` has children) | 2,388 ms |
| DOMContentLoaded | 3,316 ms |

Where the 2.4 s to first commit goes:

| Cost | Time | Nature |
|---|---|---|
| Tokenize + JS-parse 23.2 MB inline data script | ~915 ms | Pure overhead of shipping data as JS source. Inlining also costs ~400 ms vs the same bytes as an external `<script src>` (external scripts stream-compile off-thread; `__PR` appears at 586 ms in dev mode vs 989 ms in the single file). |
| Seed pipeline + derived layers | ~854 ms | 33 deterministic passes (`SEED_PIPELINE`, `app/data.js` ~L614587) merging overlays into the 4,014-figure map, warn-only integrity detectors, then per-figure `divinityBreakdown` / `traditionFractions` / `inheritablePowers` and `buildItemRegistry` (2,687 items). Output is a pure function of the file's own literals — 100 % build-time computable. |
| Persist tail | ~166 ms | `JSON.stringify` of the 19.5 MB corpus followed by a `localStorage.setItem` that is **guaranteed** to throw `QuotaExceededError` (quota ≈ 5 MB). Pure waste, every load, forever — the seed-if-empty guard can never trip. |
| React initial render/commit/effects | ~1,330 ms window | Browse renders all 4,014 rows unvirtualized (`Browse.jsx:263-293`); `Shell.jsx:224-229` eagerly builds item/power/domain lists regardless of route. ~380 ms is the commit; the rest is post-commit effect work (unprofiled — see open questions). This is also why DOMContentLoaded lags `__bootDone` by 1.3 s. |

Two additional findings:

- **Google Fonts is a render-blocking single point of failure.** The
  stylesheet `<link>` (`index.html:83`, `build.py:169`) blocks rendering; in
  one measured degraded-network run it stalled **12.66 s** and pushed
  `__bootDone` to **14.3 s**. If a user ever reports "sometimes it takes 15
  seconds", this is it.
- **Dev mode's in-browser Babel is not the problem.** All 13 JSX files (306 KB)
  transform in ~610 ms; the corpus dominates dev boot too (`__bootDone`
  2,216 ms).

`app/data.js` anatomy: 24.17 MB / 614,702 lines, of which ~99.5 % is inert
data (12.5 MB generated corpus, 3.0 MB hand-authored seed, ~5.8 MB enrichment
overlays, ~1.1 MB item/power seeds, 203 KB atlas polygons, ~276 KB constants);
runtime helper code is only ~90 KB. The UI consumes exactly 16 keys off
`window.__PR`, and the first-paint view (Browse + rail + search) needs only
index-level fields — everything else is behind user navigation.

The lazy-load foundation already exists: `scripts/build-tiers.cjs` (schema 2)
emits `index.json` (691 KB raw / 166 KB gz — 0.7 % of today's upfront data),
`edges.json` (458 KB / 63 KB gz), 64 detail shards with precomputed derived
layers (20.4 MB / ~5.1 MB gz), and per-view aggregates. It runs on every
`npm test` and is then thrown away: nothing fetches it, and the Pages deploy
ships only the single file.

## Target architecture: capability-detected dual-mode boot

One principle: **"is `__PR.seedPeople` already present synchronously?"** decides
the mode. If yes (dev `index.html`, single-file artifact, jsdom, Node VM),
everything runs exactly as today. If no (the new multi-file Pages entry), a
small loader fetches precomputed data. The `window.__PR` seam — the contract
every consumer was authored against — is preserved in both modes.

### Mode A — GitHub Pages (multi-file, the primary fix)

- **Shell** (~350 KB): the existing template with the `__DATA_JS__` inline block
  replaced by two script tags. UI scripts stay inline and pre-transformed.
  Emitted by a new `build.py --pages` mode; the default `build.py` output is
  unchanged.
- **`data/core-<hash>.js`** (~160 KB, synchronous): constants the UI reads at
  module scope (`ERA_ORDER`, `ERA_DATES`, `TRADITION_PIGMENTS`, `TYPE_META`,
  `PEOPLE_KEY`, `ATLAS_KEY`) assigned onto `window.__PR` — satisfies
  `state.jsx`'s top-level reads without touching those files.
- **`app/pr-boot.js`** (~150-200 lines, hand-written, classic script): no-ops
  when `seedPeople` is already present. Otherwise: fetch
  `data/index-<hash>.json` → adapt into skinny person records → real Browse
  rows; then fetch the full corpus snapshot → `JSON.parse` on idle →
  `Object.assign` onto `__PR` → resolve `__PR.ready`, bump a `corpusVersion`
  counter, dispatch events. Ports the only two `__PR` functions the shipped
  JSX consumes (`getEntryDates`, `formatFraction`), with an all-figures parity
  test against `data.js` to prevent drift. Reimplements the localStorage
  contract (stale-key purge, atlas overwrite, seed-if-empty — seeding
  `PEOPLE_KEY` with `JSON.stringify(seedPeople)` specifically, not the whole
  snapshot, so `loadPeople`'s shape expectations hold).
- **`scripts/build-tiers.cjs` → schema 3**: adds `corpus-<hash>.json` — the
  *post-pipeline* `__PR` snapshot ({seedPeople, divinity, traditionMix,
  inheritedPowers, items, seedAtlas}, ~23 MB raw / ~5.1 MB gz) — plus `core.js`,
  date/origin/alt-name fields on index records, full-fidelity powers/domains
  aggregates (the schema-2 ones are lossy vs the runtime registries), and
  content-hashed filenames (the only cache-busting available under Pages'
  fixed `max-age=600`). This *is* the build-time precompute: the 854 ms
  pipeline runs once in CI instead of in every visitor's browser.
- **App seams** (small, surgical): `useData` keeps its synchronous `useState`
  initializer (existing tests unaffected) and gains one refresh effect on
  `pr:index`/`pr:ready`; module caches (`_powerReg`/`_domainReg`, Shell memos)
  invalidate on `corpusVersion`; views other than Browse gate on `dataReady`;
  `main.jsx` mounts a skeleton immediately in async mode and flips
  `__bootDone` when the corpus lands; deep links defer selection via
  `__PR.ready`.
- **Deploy**: `_site/index.html` = multi-file shell, `_site/data/` = tiers,
  `_site/artifact.html` = the single file kept as a downloadable secondary
  distribution. Fetching JSON.parse's cost for the 23 MB snapshot was measured
  at **~118-124 ms** — versus 520 ms tokenizer cost for the same bytes as JS.

Why JSON.parse wins: data crossing the JS parser as object literals pays full
tokenization/codegen; the same bytes through `JSON.parse` are 2-4× cheaper per
byte, and an external fetch streams while the shell parses.

### Mode B — single-file artifact (file://, Claude.ai srcdoc, open-from-disk)

Unchanged in role and constraints (no fetch of app data ever runs from
`file://` or srcdoc), but two upgrades apply the same insights inside one file:

1. **Precomputed payload**: inline the *post-pipeline* snapshot instead of
   re-running the pipeline — removes the ~854 ms.
2. **Inert-JSON encoding**: carry the corpus in a
   `<script type="application/json">` block the JS parser never tokenizes; a
   tiny loader `JSON.parse`s it after first paint. Measured A/B on identical
   bytes: **640 ms vs 1,065 ms** for the data step.

Combined with the persist-guard fix below, artifact boot should land near
**~1 s** (from 2.0 s) with no change to its distribution story.

### What deliberately does not change

- Dev mode (`index.html` + in-browser Babel + synchronous `data.js`): untouched.
  Zero-build-step development is a stated project goal and its boot is
  corpus-dominated anyway.
- The byte-exact regeneration gate: `app/data.js` and the committed artifact
  stay under `verify-regen.sh`; `dist/data/` and `dist/site/` remain
  gitignored, CI-built, determinism enforced by `tiers.test.cjs`.
- The Node-VM consumers and the whole existing test suite exercise the
  synchronous path, which is preserved verbatim — they are the regression net
  for the migration.
- No bundler, no ESM conversion, no service worker *initially*. (A service
  worker for repeat-visit caching can be added later from the plain-JS shell;
  a Vite/ESM migration was evaluated and rejected: it trades away the
  no-bundler dev contract and fights the byte-exact gate for gains this design
  gets more cheaply.)

## Migration plan (each step ships and is testable alone)

1. **Fonts + persist guard** (universal, immediate, no architecture): make the
   Google Fonts stylesheet non-render-blocking (`media="print"
   onload="this.media='all'"` or self-host with `font-display: swap`) in both
   `index.html` and the `build.py` template — kills the measured 12.66 s
   worst-case stall. Gate the doomed corpus seed-if-empty behind a quota probe
   (try a ~6 MB `setItem`, remove it, only then stringify) in the hand-authored
   `data.js` tail (outside generator markers; regenerate + commit dist in the
   same commit so `verify-regen` stays green). Saves ~166 ms every load in
   every mode; existing seed/storage tests still pass because their stubs
   accept the probe.
2. **Schema 3 in `build-tiers.cjs`** (inert until consumed): `corpus.json`,
   `core.js`, enriched index, full-fidelity aggregates, hashed filenames;
   parity test asserting `corpus.json` deep-equals the VM-loaded `__PR`.
3. **`app/pr-boot.js`** with the no-op sync path + ported
   `getEntryDates`/`formatFraction` + all-figures parity test. Not loaded by
   any page yet.
4. **Async seams in app code**, sync-path-preserving (`state.jsx` refresh
   effect, `corpusVersion` cache invalidation, Shell `dataReady` gating,
   `main.jsx` dual boot). The full existing suite must pass with zero fixture
   changes — that is the proof the diff is additive.
5. **Browse chunked row reveal** (first ~150 rows sync, rest in rAF batches;
   full render under jsdom so `render.test`'s single-flush assertion holds).
   Ordered *before* the deploy flip so first-commit numbers hold on day one.
6. **`build.py --pages`** + offline fixture-backed multi-file jsdom tests +
   `manifest.test` extension.
7. **Deploy flip**: `deploy-pages.yml` assembles shell + `data/` + artifact;
   DOGFOOD pass against the Pages URL, `file://`, and a srcdoc iframe before
   flipping.
8. **Artifact upgrade** (independent): inert-JSON + precomputed payload for the
   single file, measured before flipping.
9. **Later, as needed**: lazy-inject d3/topojson on first Graph/Atlas visit
   (~440 KB off the critical path); service worker for repeat visits; swap
   `corpus.json` for per-shard Tier-3 hydration when the corpus outgrows
   ~5 MB gz (the seam built in steps 3-4 is exactly the one shard hydration
   needs — this is the 50k-figure endgame `build-tiers.cjs`'s header already
   anticipates).

## Expected numbers

| Surface | Today (measured) | After (predicted) |
|---|---|---|
| Pages: first React commit | 2,388 ms | ~250-350 ms |
| Pages: real Browse rows | 2,388 ms | ~400-500 ms |
| Pages: fully interactive (`__bootDone`) | 2,009 ms* | ~0.8-1.0 s |
| Pages: DOMContentLoaded | 3,316 ms | ~300 ms |
| Pages: critical-path transfer | 4.95 MB gz | ~250 KB gz |
| Artifact (file://, srcdoc) boot | ~2.0 s | ~1.0 s |
| Fonts worst case | +12.7 s render-blocked | 0 (async) |

\* today `__bootDone` flips before React commits; in the new boot it flips when
the app is genuinely interactive, so the semantics tighten.

CPU numbers are from a 4-vCPU server-class Xeon; consumer/mobile hardware is
typically 1.5-3× slower, which scales the *savings* proportionally. On a
5 Mbps connection the Pages first-content path drops from ~8 s of transfer to
~0.4 s, with the corpus streaming behind an interactive skeleton.

## Risks and open questions

- **The ~950 ms of post-commit React effect work is unprofiled.** All
  sub-second TTI predictions assume it shrinks under row-chunking and memo
  gating. Profile it (React Profiler / performance marks around Shell effects)
  before treating the step-5/7 numbers as commitments.
- **Dual implementations** of `getEntryDates`/`formatFraction` (data.js vs
  pr-boot.js) can drift — the all-figures parity test must live in the suite
  permanently. Alternative: generate pr-boot's copies from data.js at build
  time.
- **Version skew under Pages caching**: a visitor holding a ≤10-min-stale
  shell will fetch old-hash data files; either keep the previous deploy's data
  files for one release cycle or accept the loud error path. Needs an explicit
  policy at step 7.
- **The quota-probe threshold is a heuristic**, not a contract; a
  larger-quota browser would regress to today's (working) behavior at worst.
- **Test-matrix growth**: four boot modes (dev, artifact, Pages, jsdom). srcdoc
  and `file://` remain manual-DOGFOOD-only; keep them in the step-7/8 gates.
- **Bandwidth shape**: full-visit bytes on Pages are unchanged (~5.3 MB gz)
  until Tier-3 shard hydration lands; what changes now is *when* they arrive
  (behind interactivity) and *whether* they block anything.
