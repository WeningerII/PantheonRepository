# Load performance — measured findings, 2026-07-26

A record of a Lighthouse investigation prompted by a PageSpeed Insights run on
the deployed site. **§3.1 was implemented on 2026-07-27** (see its before/after
table); §3.2 and §4 remain open, and this exists so that work can be picked up
later without re-deriving it.

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

### 3.1 Browse mounts the entire corpus — IMPLEMENTED 2026-07-27

`app/Browse.jsx` ramped an unconditional rAF reveal until all 5,721 rows were
mounted: **100,167 DOM elements, 151,797 LayoutObjects, 92% of all Style &
Layout time.** Cost is linear in mounted rows (~1.15 ms/figure at mobile 4×
CPU), so at 10,000 figures that shape was ~15 s of mobile Style & Layout.

Replaced with demand-driven growth: an `IntersectionObserver` sentinel inside
`.browse-scroll` (800 px margin), the rAF ramp kept only to chase a distant
`coverIdx`, and a ratchet effect persisting whatever either produced.

#### It was also nulling two whole categories

This is the finding that made §3.1 urgent rather than optional, and it was
**not** understood when this document was first written. A PageSpeed Insights
run on the deployed site showed Accessibility and SEO as `!` — not a low score.
Reproduced locally on the pre-fix build, both form factors:

```
accessibility  NULL (unscored)     66 audits: scoreDisplayMode 'error'
seo            NULL (unscored)     errorMessage: "Required Accessibility
                                    gatherer encountered an error:
                                    PROTOCOL_TIMEOUT"
```

The chain: Lighthouse runs the whole axe sweep inside one
`executionContext.evaluate`, capped at 60,000 ms
(`core/gather/driver/execution-context.js:170`). Over a 100 k-element DOM that
evaluate exceeds the cap. Every audit depending on the Accessibility artifact
errors, and an errored audit scores `null`. `core/scoring.js:25` — *"If there is
1 null score, return a null average"* — then nulls the entire category. SEO is
collateral: it re-lists two axe-backed audits, `document-title` and `image-alt`,
which is exactly the pair PSI showed erroring. Best Practices survived at 96
because it contains no axe-backed audit — a useful control.

**Do not attribute the 60 s to axe's own run time.** Measured directly with
Lighthouse's exact gatherer options, `axe.run` over the full 100,206-element DOM
is **1,516 ms** (mobile 1×) / 3,652 ms (2× CPU) — nowhere near the cap. The cost
that blows the budget lives in the gatherer around the run (result serialization
and node-details resolution across CDP), not in rule evaluation. An early draft
of this file claimed 55–154 s of axe time; that was wrong and is corrected here.

#### Measured, real Lighthouse 13.4.1, before → after

Same harness, same machine, `dist/site` over gzip:

| | mobile before | mobile after | desktop before | desktop after |
|---|---:|---:|---:|---:|
| Performance | 48 | 51 | 65 | **94** |
| Accessibility | **NULL** | **100** | **NULL** | **100** |
| SEO | **NULL** | **100** | **NULL** | **100** |
| Best practices | 96 | 96 | 96 | 96 |
| Errored audits | 66 | **0** | 66 | **0** |
| A11y gatherer | `PROTOCOL_TIMEOUT` | 1,608 ms | `PROTOCOL_TIMEOUT` | 2,221 ms |

Cold-load DOM: 100,206 → **5,545 elements**, 5,721 → **150 rows**. Scrolling
still reaches all 5,721 (`verify-coldload.cjs` asserts both ends).

Desktop performance moved most (65 → 94) because it was never throttling-bound;
mobile stays TBT-bound and needs §3.2 to move further — the §3.1-alone figure
predicted here earlier was 56, measured 51, and the residual is the idle warm.

**Accepted trade:** the browser's own Ctrl+F now reaches only mounted rows,
where it previously reached all 5,721 after ~2.6 s. The app's own search still
covers the full corpus. The scrollbar thumb also grows as you scroll. Both were
signed off deliberately against two nulled Lighthouse categories.

Four things a naive implementation gets wrong (all four were hit and handled):

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
   exists for. Rewritten with a scroll-to-bottom phase and two new assertions
   (cold load bounded ≤ 1,000 rows; scrolling must still reach every row), plus
   the three §5 defects fixed. Verified to fail on the pre-fix build, exit 1.
4. **A full virtualizer is harder than it looks.** Not attempted — the sentinel
   grows the window and never unmounts, so no row is ever displaced and none of
   the estimate-vs-real machinery below is in play. Kept as the reason NOT to
   reach for windowing if this is revisited. Rows are variable height by
   design: `styles.css:780-791` floors plain rows at 52 px, `:792-796` gives
   `tr:has(.alt-line)` `height:auto; min-height:58px`, producing a trimodal
   distribution (52.00 × 59, ~58.5 × 3,115, ~63.05 × 2,480) interleaved with
   sticky variable-count group headers inside `table-layout: fixed`. That
   estimated-vs-real mismatch is what causes scroll jumps.

### 3.3 The page had no large contentful element, and the document was 149 KB gz — IMPLEMENTED 2026-07-27

The finding that actually explains the field score. A PSI run reported
**FCP 2,622 / SI 2,622 / LCP 8,011 / TBT 1,589 / CLS 0**, scoring mobile 46.
Reproduced in the Lighthouse scoring model to the digit (all five metric
sub-scores: 63 / 97 / 3 / 13 / 100), so the weighting below is arithmetic, not
estimation. **LCP scored 3/100 at 25% weight.** That was the whole problem.

**Why LCP was 8 s.** The LCP element was `div#placeholder` — the *placeholder
text inside the search input*, 279×19 px, rendered by React. This page has no
hero image and no large text block; it is uniformly small dense text, so the
largest contentful element on it was a 5,301 px² placeholder. The boot splash's
own title was ~5,200 px² and lost **by 2%**. LCP was therefore pinned to "React
finished mounting", and nothing about the table mattered.

**Why FCP was 2.6 s.** The shell inlined every UI source: 588 KB raw / **149 KB
gz**, of which 122 KB gz was inline `<script>`. Lantern has no streaming model,
so nothing paints until the whole document lands — the entire app sat on the
first-paint critical path. Confirmed by elimination: moving react/react-dom out
of `<head>` (the obvious suspect) moved FCP 2,328 → 2,286, i.e. not at all.

Three changes, each measured:

1. **The UI sources ship as one hashed external file** (`app-<hash>.js`, beside
   the shell, `defer`red). Document 149 KB gz → **39.9 KB gz**. Concatenation is
   semantics-preserving because the 13 blocks already shared one global lexical
   environment (§6). `defer` is load-bearing: without it the bundle is simply
   render-blocking again — measured at 1,370 ms, with FCP regressing to 2,262 ms.
2. **The boot overlay carries a real lead paragraph** — the site's own
   canonical description, the same sentence as `og:description`. It is static,
   so it cannot drift; it is the largest text on the boot screen, so it owns
   LCP; and it sits in the `position:fixed` overlay, so its removal on ready
   cannot shift layout. A waiting visitor now reads what the site is instead of
   watching a bare spinner.
3. **`preconnect` to cdnjs.** Reasoned, not measured — see §1.

Real Lighthouse 13.4.1, medians of 3 runs:

| | mobile before | mobile after | desktop before | desktop after |
|---|---:|---:|---:|---:|
| FCP | 2,199 | **1,526** | 523 | **395** |
| LCP | 4,787 | **1,676** | 932 | **608** |
| TBT | 533 | 525 | 28 | 17 |
| CLS | 0.0005 | 0.0005 | 0.0001 | 0.0001 |
| **Performance** | **67** | **86** | **99** | **100** |

Metric sub-scores now: FCP 96, SI 100, LCP 99, CLS 100, **TBT 56**. TBT is the
only remaining lever on mobile — everything else is effectively maxed. Deferring
react/react-dom as well (they remain render-blocking at 928 ms combined, and the
Pages shell *could* now defer them since its UI bundle is deferred) models at
**+1 point** and was not done.

**The honest limit of change 2.** LCP now times the boot overlay's paragraph
rather than the figure table. That is a genuine improvement — real content at
1.5 s instead of 5 s — but it does mean the metric no longer tracks when the
*table* appears. Making LCP measure the table would need build-time prerendering
of the first screenful plus hydration, which is a much larger change and carries
a real CLS risk that this one does not.

### 3.2 The idle warm violates the flat-first-load invariant — IMPLEMENTED 2026-07-27

**The "one point" verdict below was wrong by the time it mattered.** It was
measured while Browse still mounted the whole corpus and TBT was 6,760 ms, where
the warm was lost in the noise. Once §3.1 landed, the warm was most of what
remained. Re-measured, medians of 3:

| | mobile TBT | mobile perf | desktop perf |
|---|---:|---:|---:|
| with warm | 1,440 ms | 56 | 94 |
| without | **533 ms** | **67** | **99** |

Shipped without the §4.1 trade below: rather than accept a 7.7 s wait on first
Powers open, the view buttons prefetch their registry tier on
hover/focus/pointerdown (`Shell.jsx`), and Shell's existing effect still fetches
on demand for deep links and keyboard. Verified in a browser: zero registry
fetches after 9 s idle on Browse, prefetch fires on hover, no refetch on a
second hover, click still lands. The projection tiers (atlas 163 KB gz, edges)
stay warmed — they are a twentieth of the registries and have no equivalent seam.

Original analysis follows.



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
- ~~`app/Browse.jsx:26-29` carries a stale comment claiming reveal work scales
  rows²/batch.~~ **Done** — the block was rewritten wholesale with §3.1. For the
  record: layout is linear, not rows²/batch. `table-layout: fixed` keeps mounted
  rows clean, so each pass dirties a flat ~12,900 LayoutObjects; quadratic
  predicts batch=250 costing ~11× batch=5,721, measured ratio is **1.24×**. The
  comment also said "~4,000 BrowseRows"; it is 5,721.

### 4.4 Add a first-load byte tripwire

Put it in `test/scale-gates.test.cjs`, which already runs in `npm test`, already
gzips `dist/data` by name from `meta.json`, and owns a BUDGET ladder with
pre-agreed responses. Add `BUDGET.firstLoad` summing exactly the tiers the shell
fetches unconditionally. **Not** in `verify-coldload.cjs` — see §5.

---

## 5. `verify-coldload.cjs` did not guard anything — FIXED 2026-07-27

`CLAUDE.md` stated cold-load stability "is guarded by
`scripts/verify-coldload.cjs`". That claim was false three ways:

1. It was in **neither** CI workflow. `ci.yml` ran `npm test`, the MCP smoke
   suite, and `verify-regen.sh`; `deploy-pages.yml` ran the first and last.
2. It **could not fail**. It only `console.log`ed its verdict; the sole
   `process.exit(1)` was the crash catch. A detected collapse or row-resize
   printed and exited 0.
3. It **could not run in a clean checkout**. It `require`d `playwright-core`,
   which was in neither `package.json` nor `node_modules`, and hardcoded
   `/home/user/PantheonRepository` and `/opt/pw-browsers/chromium`.

All three are fixed. The script now asserts four invariants and sets a non-zero
exit code on any violation; `playwright-core` is a declared devDependency;
paths resolve from `__dirname` and Chromium is discovered via
`PLAYWRIGHT_CHROMIUM_PATH` / `PLAYWRIGHT_BROWSERS_PATH` / the standard
Playwright cache, failing loudly rather than skipping when absent. `ci.yml`
installs Chromium and runs it as a blocking step (job timeout raised 15 → 25
minutes to cover the download).

Two assertions are new, and they are what make the probe non-vacuous under a
demand-driven reveal: cold load must stay **≤ 1,000 rows**, and scrolling must
still reach **every** row. Confirmed to behave in both directions — it passes on
the current build (150 rows cold, 5,721 after scrolling) and fails with exit 1
on the pre-§3.1 build (5,721 rows cold, no growth on scroll).

Still not covered, and worth knowing: the cdnjs route interception substitutes
`node_modules` bytes, so neither the vendor URL nor its SRI hash is validated
here — see §4.2.

---

## 6. Investigated and rejected

Recorded so nobody re-derives them. Each was measured, not reasoned about.

| Candidate | Why not |
|---|---|
| Tune `REVEAL_BATCH` | Layout is linear, not rows²/batch. 500 → 2000 measured perf 51 → 51. And 500 sits at the blocking-time minimum: longest single task is 202/253/635/1,795 ms across 250/500/2000/5721. Leave it. |
| Per-row `content-visibility: auto` | Cuts mobile S&L 86% but **nulls the accessibility and SEO categories** (scored `null`, rendered `!` — same mechanism as §3.1) — Lighthouse's axe gatherer hits `PROTOCOL_TIMEOUT`, reproduced 3×. A full-document `getBoundingClientRect`+`getComputedStyle` sweep goes 219 ms → 31,729 ms (145×) because each skipped subtree un-skips individually. That sweep is what axe, Ctrl+F, print and screen readers all do. |
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

**§3.1, §3.2, §3.3 and §5 all shipped 2026-07-27.** The original order here was
wrong twice over: it filed §3.1 as an optimisation when it was actually nulling
two whole categories, and it never contained §3.3 at all — the finding that
explained the field score. Local mobile went 51 → 67 → **86**, desktop 94 → 99 →
**100**, across those three commits.

Remaining, in order:

1. **TBT.** It is the only mobile metric not effectively maxed (56/100 at 30%
   weight; everything else is ≥96). 525 ms → 300 ms models at 93, → 200 ms at 96.
   §4.3's `comments: false` is the cheap start (−36,722 B gz, untried); beyond
   that this needs main-thread profiling, not a known fix.
2. §4.4 — the first-load byte tripwire, in `test/scale-gates.test.cjs`.
3. §4.1 and §4.2 afterwards, independently. Note §4.2's premise has weakened:
   d3/topojson are already `defer`red and no longer appear in the
   render-blocking set at all.

`load-time-architecture.md` needs updating regardless: its "Critical-path
transfer (gzip) ~0.35 MB" row (:19) is stale at 0.63 MB measured, it has never
recorded *total* first-load transfer (which is why the 3.7 MB warm stayed
invisible), and it does not document the idle warm at all.
