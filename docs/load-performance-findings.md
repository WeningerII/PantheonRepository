# Load performance — measured findings, 2026-07-26

A record of a Lighthouse investigation prompted by a PageSpeed Insights run on
the deployed site. Nothing in section 3 or 4 has been implemented; this exists
so the work can be picked up later without re-deriving it.

Companion to [`load-time-architecture.md`](load-time-architecture.md), which
records the original tiering design. Where the two disagree, this file is the
newer measurement — see §5.

---

## 1. Method, and what is NOT verified

The live site was **never sampled**. `www.listofgods.com`, `cdnjs.cloudflare.com`
and `*.github.io` are all unreachable from the environment this ran in (HTTP 403
on CONNECT), and the keyless PageSpeed Insights API is quota-capped at zero
requests/day, so both PSI attempts returned 429.

Everything below is real Lighthouse 13.4.1 against `dist/site` — the same
artifact CI deploys — served from localhost **with gzip**, which is what GitHub
Pages does. Two deliberate differences from production remain:

1. The four cdnjs `<script>`s were rewritten to same-origin `/vendor/` paths
   (same bytes, same parse/exec, same render-blocking position) with `integrity`
   and `crossorigin` stripped. **Production additionally pays a cold DNS + TCP +
   TLS handshake in front of render-blocking react/react-dom.** Lantern models
   that at ~675 ms cold vs ~75 ms warm. Offsetting this, Lantern has no
   preload-scanner model and serialises react behind the whole document, a
   ~657 ms error in the other direction. **Net sign is indeterminate.**
2. Google Fonts hard-failed (`transferSize: 0`), so a stylesheet plus three
   woff2 families never loaded. GA4 self-disabled via its `127.0.0.1` guard.

Also unverified: **CrUX field data**. Every number here is lab-simulated
(`throttlingMethod: "simulate"`), so LCP and TTI are Lantern *estimates*, not
paint timestamps. TBT is a lab proxy for INP, which is what actually ships in
Core Web Vitals — meaning §3.1's win is probably larger in the field than its
Lighthouse delta suggests.

### Reading the scores

Performance weighting is **TBT 30 / LCP 25 / CLS 25 / FCP 10 / SI 10**.
`interactive` carries **weight 0** (dropped in Lighthouse 10) — quoting TTI as
if it moved the score is a mistake. TBT scores 0.00 on both form factors, so it
is the only lever with real headroom.

---

## 2. Scores

Measured after the two fixes in §2.1 landed.

| | Mobile | Desktop |
|---|---:|---:|
| Performance | 50 | 67 |
| Accessibility | 100 | 100 |
| Best practices | 96 \* | 96 \* |
| SEO | 100 | 100 |

\* The sole remaining `errors-in-console` item is a `fonts.googleapis.com`
certificate failure that is an artifact of the sandbox network policy, not of
the site. **Production should reach 100, but this is unverified.** Three
production-only sources could still hold it below: a cdnjs outage or SRI
mismatch, the GA4 snippet (never executed locally), and `pr-boot.js:168/186`
firing on a hashed-tier 404 during a partially-propagated Pages deploy. Verify
with a PSI run reading `audits['errors-in-console'].details.items`.

Metrics, gzip runs:

| | Mobile | Desktop |
|---|---:|---:|
| FCP | 2.3 s | 0.59 s |
| LCP | 4.7 s | 0.98 s |
| TBT | 6,760 ms | 2,890 ms |
| CLS | 0 | 0 |
| Style & Layout | 7,005 ms | 5,323 ms |

Beware: an earlier non-gzip run scored mobile 27 and reported Style & Layout at
10.1 s. Those numbers are wrong for production and should not be quoted.

### 2.1 Already fixed

- **`target-size`** (`app/styles.css`) — rail rows are `role="checkbox"` with
  `tabindex=0`, so they are real targets, and rendered 227×22 px against WCAG
  2.2 SC 2.5.8's 24×24 floor. `min-height: 44px` existed but only inside
  `@media (pointer: coarse)`, which is why mobile scored 100 and desktop 96.
  **axe-core does not implement `target-size`**, so an axe sweep passes while
  Lighthouse fails — worth remembering when choosing a11y tooling.
- **Favicon** (`build.py`, `index.html`) — nothing declared one and no `.ico` is
  served, so every load took a `/favicon.ico` 404, which `errors-in-console`
  counts. Declared as a data: URI because the single-file artifact opens over
  `file://` with no siblings, where a path-based icon would 404 too.

---

## 3. The dominant cost

### 3.1 Browse mounts the entire corpus

`app/Browse.jsx:231-239` ramps an unconditional rAF reveal until all 5,721 rows
are mounted: **100,167 DOM elements, 151,797 LayoutObjects, 92% of all Style &
Layout time.** Cost is linear in mounted rows (~1.15 ms/figure at mobile 4×
CPU), so at 10,000 figures today's shape is ~15 s of mobile Style & Layout.

Measured by freezing the reveal at 150 rows (medians, interleaved, fresh
Chromium per run):

| | mobile perf | mobile TBT | mobile S&L | desktop perf |
|---|---:|---:|---:|---:|
| base | 51 | 6,445 ms | 6,546 ms | 63 |
| reveal capped | 56 | 1,310 ms | 541 ms | **97** |
| capped + §3.2 | **73** | 362 ms | 521 ms | — |

Element count 100,167 → 5,564. FCP/LCP/CLS do not move.

**The real fix is demand-driven growth** — an `IntersectionObserver` bottom
sentinel inside `.browse-scroll`, keeping the rAF ramp only for a distant
`coverIdx` (deep links, cross-view jumps).

**Why this is a product decision, not a merge:** Ctrl+F would permanently see
only loaded rows. Today it reaches all 5,721 after ~2.6 s. On a reference
registry that is a genuine regression, not a footnote. The scrollbar thumb also
grows as you scroll.

Four things a naive implementation gets wrong:

1. **Ratchet the window on cursor coverage.** `revealCount` (`Browse.jsx:229`)
   is render-derived; only the rAF effect persists it into `reveal.count`. Gate
   that effect to distant targets and j/k stepping past 150 mounts rows that
   unmount when the cursor steps back — mounted rows go *down*. Add an effect
   raising `reveal.count` whenever `revealCount` exceeds it.
2. **Put the new trigger behind `REVEAL_ALL`** (`Browse.jsx:40-42`).
   `test/helpers/boot.cjs:64` stubs rAF, so it is the `/jsdom/i` UA regex that
   keeps `render.test.cjs:20-21` and `scenarios.test.cjs:25` green. Skipping
   this breaks ~20 assertion sites across five files, including the shared
   `openFirstFigure` helper, which silently no-ops at 0 rows.
3. **`verify-coldload.cjs` becomes vacuous** — it never scrolls, so rows sit at
   150 for all 8 s and it "passes" while no longer observing the failure it
   exists for. Add a scroll-to-bottom phase.
4. **A full virtualizer is harder than it looks.** Rows are variable height by
   design: `styles.css:780-791` floors plain rows at 52 px, `:792-796` gives
   `tr:has(.alt-line)` `height:auto; min-height:58px`, producing a trimodal
   distribution (52.00 × 59, ~58.5 × 3,115, ~63.05 × 2,480) interleaved with
   sticky variable-count group headers inside `table-layout: fixed`. That
   estimated-vs-real mismatch is what causes scroll jumps.

### 3.2 The idle warm violates the flat-first-load invariant

`app/pr-boot.js:528-530` unconditionally warms items + powers + domains on first
idle: **3,059,169 B gzipped (15.5 MB raw), 77% of first-load transfer**, at High
priority, for views the visitor has not opened.

CLAUDE.md forbids first load reintroducing "a single fetch or parse that scales
with the whole corpus." This is exactly that. `test/scale-gates.test.cjs`
classifies each tier as a **per-view** cost budgeted at 2 MB gz; the warm
silently attaches 6 MB gz of per-view headroom to cold start, covered by no
budget.

**Sell this on the invariant, not the score** — measured, removing it is
transfer 3,920,166 → 902,062 B (−77%) but performance **51 → 52**. One point.
Do not claim an LCP win: observed LCP (549 ms) precedes the burst's first byte
(3,046 ms) by 2.5 s. Do not claim a large parse win either — measured
`JSON.parse` is 97 ms total (~390 ms at 4× CPU).

Coverage on removal is complete: `app/Shell.jsx:396-405` calls `loadRegistry`
the moment the view or a detail id demands it, and it is idempotent per kind.
The warm is dead across all 297 tests (gated on `requestIdleCallback`, which
jsdom lacks).

**Trade:** first cold Powers open then pays 1,436,637 B gz on demand behind
`ViewLoading` (~7.7 s of simulated Slow 4G). §4.1 is the pre-built answer.

---

## 4. Worth doing, lower priority

### 4.1 Wire the skinny list tiers

The build **already emits them and nothing consumes them** —
`scripts/build-tiers.cjs:327-377`, recorded under `meta.lists`, with its own
comment: *"Phase 1 dual emission; unconsumed until the full-registry budget
tripwire fires."*

| | full gz | skinny gz |
|---|---:|---:|
| items | 536,594 | 179,164 |
| powers | 1,436,637 | 422,020 |
| domains | 1,085,938 | 219,488 |
| **total** | **3,059,169** | **820,672** (−73%) |

`build.py:418-434` pins `meta.files`/`meta.registry`/`meta.details` but never
`meta.lists`, so no list URL reaches the browser. Build-side parity is already
locked by `test/tiers.test.cjs:248-272`; what is missing is *runtime render*
parity. Remaining work: pin `meta.lists`; teach `state.jsx`'s
`allItems`/`allPowers`/`allDomains` to render the skinny shape (`h`/`n` decode
against the index tier's sorted id order); add a per-registry shard fetch on
single-record open, mirroring `loadDetail`. Precedent for care:
`build-tiers.cjs:130-139` documents an insertion-order bug that already broke
exactly this parity for 6 powers.

### 4.2 Lazy-inject d3 + topojson

`d3.min.js` is 93,520 B gz and **82.5% unused** at cold load — the largest
`unused-javascript` item and the only audit in either LHR with a non-zero
`overallSavingsMs` (600 ms mobile). Usage is confined to `Atlas.jsx` and
`Graph.jsx`, both already gated behind `ViewLoading`.
`load-time-architecture.md:44` and `:251` already list this as planned.

Measured: mobile 50 → **54**, LCP 4,683 → 4,172. **Desktop 67 → 67** (absorbed
at 10 Mbps / 1× CPU). TBT does not move — d3's whole main-thread cost is 57 ms.

Three traps:
- **d3 is used in Atlas's *render* phase**, not only effects: `projection`
  (`Atlas.jsx:201`) and `basemapPaths` (`:231`) are `useMemo`s guarded by
  `if (!window.d3) return null` with deps `[size.w, size.h]`. A late-arriving d3
  never retriggers them — Atlas stays blank until a resize. A vendor-ready flag
  must enter those dep arrays.
- **`build.py:377-378` is in the SHARED template**, so deleting the tags strips
  d3 from `dist/pantheon-registry.html` too. That artifact runs from `file://`
  and inside a srcdoc iframe, so injection must carry an absolute cdnjs URL —
  keep SRI by setting `s.integrity` and `s.crossOrigin` before `appendChild`
  (`build.py:71-73` already injects gtag.js this way).
- Trigger on hover/focus of the Graph/Atlas nav buttons, **not** queued behind
  the existing idle callbacks.

Near-free adjacent win: `Atlas.jsx:55-56` calls only `tc.feature` and `tc.merge`.
Swapping the topojson meta-package (6,757 B gz) for `topojson-client`
(2,594 B gz) is a `src`+`integrity` edit. **Caveat: nothing in CI validates the
cdnjs URL or SRI hash** — `verify-coldload.cjs:24` and `multifile.test.cjs:40-44`
both intercept cdnjs and substitute `node_modules` bytes, so a wrong hash passes
all 297 tests and fails only in production, invisibly, on first Atlas mount.

### 4.3 Cheap build wins

- `build.py:99`: `compact: false,` → `compact: false, comments: false,`. The 15
  inlined JS sources are 24.5% comment by byte (`pr-boot.js` alone 53.5%);
  measured **−36,722 B gz**, ~86% of the entire whitespace+comment win. Worth
  ~+1-2 mobile points. `@babel/standalone` is pinned exactly (7.29.7, no caret)
  and deterministic, so `verify-regen.sh` stays green.
  **Stop there** — minifying `pr-boot.js` (a further −7.2 KB gz) breaks
  `test/multifile.test.cjs:212`, which locates the block by a comment string and
  asserts byte-equality with the source. Not worth weakening a verbatim-inlining
  guard for 7 KB.
- `app/Browse.jsx:26-29` carries a stale comment claiming reveal work scales
  rows²/batch. It does not — `table-layout: fixed` keeps mounted rows clean, so
  each pass dirties a flat ~12,900 LayoutObjects. Quadratic predicts batch=250
  costing ~11× batch=5,721; measured ratio is **1.24×**. It also says
  "~4,000 BrowseRows"; it is 5,721.

### 4.4 Add a first-load byte tripwire

Put it in `test/scale-gates.test.cjs`, which already runs in `npm test`, already
gzips `dist/data` by name from `meta.json`, and owns a BUDGET ladder with
pre-agreed responses. Add `BUDGET.firstLoad` summing exactly the tiers the shell
fetches unconditionally. **Not** in `verify-coldload.cjs` — see §5.

---

## 5. `verify-coldload.cjs` does not guard anything

`CLAUDE.md` states cold-load stability "is guarded by
`scripts/verify-coldload.cjs`". That claim is currently false, three ways:

1. It is in **neither** CI workflow. `ci.yml` runs `npm test`, the MCP smoke
   suite, and `verify-regen.sh`; `deploy-pages.yml` runs the first and last.
2. It **cannot fail**. `verify-coldload.cjs:38-48` only `console.log`s its
   verdict; the sole `process.exit(1)` is the crash catch. A detected collapse
   or row-resize prints and exits 0.
3. It **cannot run in a clean checkout**. It `require`s `playwright-core`, which
   is in neither `package.json` nor `node_modules`, and hardcodes
   `/home/user/PantheonRepository` and `/opt/pw-browsers/chromium`.

It was executed during this investigation (after manually installing
`playwright-core`) and did report monotonic row growth with zero row-height
changes — but that result carries less weight than it appears to, because the
script has no failing branch. Either wire it into CI with real assertions and a
declared dependency, or correct `CLAUDE.md`. Do not leave the claim standing.

---

## 6. Investigated and rejected

Recorded so nobody re-derives them. Each was measured, not reasoned about.

| Candidate | Why not |
|---|---|
| Tune `REVEAL_BATCH` | Layout is linear, not rows²/batch. 500 → 2000 measured perf 51 → 51. And 500 sits at the blocking-time minimum: longest single task is 202/253/635/1,795 ms across 250/500/2000/5721. Leave it. |
| Per-row `content-visibility: auto` | Cuts mobile S&L 86% but **zeroes the accessibility and SEO categories** — Lighthouse's axe gatherer hits `PROTOCOL_TIMEOUT`, reproduced 3×. A full-document `getBoundingClientRect`+`getComputedStyle` sweep goes 219 ms → 31,729 ms (145×) because each skipped subtree un-skips individually. That sweep is what axe, Ctrl+F, print and screen readers all do. |
| `content-visibility` on `<tr>` | Silent no-op — size containment does not apply to internal table boxes. `getComputedStyle` reports `auto` while layout ignores it. |
| `content-visibility` on all `<td>` | Buys 71%, but `contain-intrinsic-size` is inert on `table-cell`, so scroll height under-reports by **64%** and drifts as you scroll. Untunable. |
| Convert the table to block/flex rows | Desktop 67 → 88, but without containment it overflows horizontally, so correctness *depends* on `content-visibility` support; Safari <18 / Firefox <125 get a broken table and no speed win. Carries the same 145× traversal regression. |
| terser / csso / esbuild | terser+csso reaches −69 KB gz vs Babel-only −54.9 KB: ~1 extra mobile point for two new deps that `verify-regen.sh`'s byte-exactness would then rest on, forcing a 31.9 MB re-commit on every minifier bump. The 13 inlined blocks share one global lexical environment, so `mangle.toplevel` produces `SyntaxError: Identifier 'e' has already been declared` ×12 and a blank page (measured). **esbuild is disqualified outright** — 26 platform-specific native binaries as optionalDependencies, so a macOS-arm64 maintainer and linux-x64 CI run different binaries and no lockfile can prove they agree. |
| Worker / chunked JSON parsing | Total decode+parse for all five warmed tiers is ~165 ms (~660 ms at 4×) against TBT 6,757. Routing through `parseOnIdle` buys **zero** — TBT counts any >50 ms task wherever scheduled, and its `{timeout: 2000}` forces the same blocking parse. It also moves `JSON.parse` outside `fetchPinned`'s catch, killing the deploy-skew re-pin/retry seam pinned by `multifile.test.cjs:341-353`. |
| Chasing `unused-css-rules` (17 KB) | The figure is `Math.round(contentLength * 0.2)` — a hardcoded HTTPArchive constant for inline stylesheets, not a measurement. ~46% of the sheet is views that cannot mount on cold Browse; ~12% is comments. Unmatched selectors cost nothing (Blink buckets by rightmost compound; `ParseAuthorStyleSheet` measured **0.0 ms**). Genuinely dead CSS is 519 B across 7 rules. |
| Self-hosting react/d3/topojson | GitHub Pages has a fixed `max-age=600` (`load-time-architecture.md:168-169`), so this moves vendor code from cdnjs's immutable cache to 10-minute revalidation — a repeat-visit regression — and discards the SRI pins. Cheap version instead: `<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>`, since the cdnjs tags sit 25,830 gz bytes into the document vs the font preconnects at 1,927. Lantern cannot measure it (no preload-scanner model). |
| Reducing per-row DOM | Cost is text-run shaping, not element count — `.alt-xlit` is 11% of row DOM but 23-32% of S&L (native script on 97.5% of records). If §3.1 lands this evaporates. |

---

## 7. Suggested sequencing

1. §3.2 + §4.3 — one commit. −3.1 MB gz first-load transfer, −37 KB gz shell,
   ~+3 mobile points, restores the flat-first-load invariant.
2. Decide on §3.1. Everything else is rounding error next to it. Ship it *with*
   §3.2 already landed, or the mobile number barely moves (capping alone is +5;
   the residual 1,310 ms of TBT is the warm).
3. §4.4 + §5 alongside it — tripwire, doc corrections, and the CLAUDE.md
   retraction.
4. §4.1 and §4.2 afterwards, independently.

`load-time-architecture.md` needs updating regardless: its "Critical-path
transfer (gzip) ~0.35 MB" row (:19) is stale at 0.63 MB measured, it has never
recorded *total* first-load transfer (which is why the 3.7 MB warm stayed
invisible), and it does not document the idle warm at all.
