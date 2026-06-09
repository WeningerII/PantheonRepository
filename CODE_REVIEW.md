# Pantheon Registry — Repository Code Review

**Commit reviewed:** `adce2fc` ("Bump seed cache key v8→v9 to flush stale localStorage corpus")
**Date:** 2026-06-09
**Scope:** entire repository — `app/*.jsx`, `app/data.js` (all executable regions + programmatic audit of the generated corpus), `app/styles.css` (structural pass), `index.html`, `build.py`, `package.json`, `.github/workflows/*`, `scripts/*`, `test/*`, `dist/` (seams + reproducibility), `data-sources/` (consumption), `README.md`, `DOGFOOD.md`.

## How this review was conducted

Five parallel deep-review passes (core UI, d3 visualizations, data layer, build/CI/tooling, tests/docs), each reading its files line-by-line, followed by independent re-verification of every Critical/High claim against the source. Claims about runtime behavior were **executed, not guessed**:

- `npm test` run twice: **39/39 pass**, ~12s, deterministic.
- `python3 build.py` + `scripts/verify-regen.sh`: committed `dist/pantheon-registry.html` (7,925,616 bytes) reproduces **byte-for-byte** from committed sources (with Babel 7.29.7 — see finding D1). Working tree restored clean afterward.
- `app/data.js` executed in a node VM (quota-simulating localStorage shim) for a full data-integrity audit across all 1,845 figures, 232 traditions, 1,240 items, 56 territories — results in Appendix A.
- Dev-mode crash (E1) reproduced in jsdom using `index.html`'s exact script list; reversed date ranges (A4), `figureActiveAt` (B3), lineage duplicates (B2), era-band inversions (B7), and the dead/deceased census (B1) verified against the live seed.
- All four CDN SRI hashes in `dist` and `index.html` validated against npm-published bytes.

Each finding carries a stable ID (A=UI, B=visualizations, C=data layer, D=build/CI, E=tests/docs), location, evidence, a concrete fix, and a confidence rating. Duplicated discoveries across reviewers are merged with cross-references.

---

## Verdict

The repository is in **better shape than most of its genre** — the artifact is byte-reproducible from committed sources and CI enforces that; SRI pinning is real and verified; there is no XSS surface in the app; the data corpus is referentially clean (0 duplicate ids, 0 genealogy cycles, 0 mojibake, divinity math exact across all 1,845 figures); the test suite is honest about content truth.

The problems cluster in four places:

1. **The dev entry point is broken** — `index.html` omits `Items.jsx`, so the README's primary "Quick start" mode crashes the entire app on a common interaction (Critical, one-line fix).
2. **The corpus outgrew its constants.** The wave-based growth from 599 → 1,845 figures never backfilled the tradition-keyed tables: 182 of 232 traditions (933 figures, 62.7% of date lookups) have no eras, dates, pigments, or map territory — and the newest commit's umbrella-tradition split regressed 31 more figures that previously worked.
3. **A recurring date-pairing bug pattern**: three independent sites (`Detail`, `Graph`, `Lifecycle`) resolve `mythicStart/textualStart` and `mythicEnd/textualEnd` *per-field* instead of *per-axis*, producing reversed ranges ("1900 CE – 1500 CE"), a year slider with zero active figures at its maximum, and nonsense ruler labels.
4. **Deployment is wired to a deleted branch** and the toolchain floats (lockfile gitignored, Babel on caret, actions tag-pinned), so the production site cannot currently update and the byte-exact CI gate survives on codegen luck.

Counts: **1 Critical · 11 High · 22 Medium · 28 Low · 12 Nit** (after merging cross-reviewer duplicates).

---

## Fix-first list (highest leverage, roughly in order)

1. **E1/D3** — add `<script … src="app/Items.jsx">` to `index.html` (1 line; un-bricks dev mode).
2. **C1** — backfill `Māori`/`Hawaiian`/`Kamilaroi`/`Kulin`/`Noongar`/`Worrorra` into `ERA_ORDER`/`ERA_DATES`/`TRADITION_PIGMENTS`/atlas (regression in HEAD).
3. **D2/D6** — point workflows at real branches; fix the Pages environment rule; production deploys are currently impossible.
4. **D1/E9** — commit `package-lock.json`, pin `@babel/standalone` exactly, switch CI to `npm ci`.
5. **B1** — accept `deceased` alongside `dead` in Lifecycle (2 lines; fixes 78 wrongly-alive renders).
6. **A4 + B3 + B7** — fix the per-axis date-pairing pattern in its three sites.
7. **A2 + A1** — stop the global Enter handler hijacking focused controls; clear `selectedItemId` on ⌘K pick.
8. **B2** — dedupe lineage placement (duplicate React keys today).
9. **E4/D11/A10 + E3/E14** — one docs/splash truth pass (601→1,845 etc.; rewrite the localStorage paragraph).
10. **E2 + E5 + E6** — harden the suite: local atlas fixture, ratchet floors to ~actuals, assert the populated graph branch.
11. **C2** — the big content task: backfill constants for the 182 missing traditions (or alias them) so 933 figures regain dates/colors/territories.

---

# Findings

## Critical

### E1 (= D3) · `index.html:189-198` · Dev entry point omits `Items.jsx`; documented dev mode crashes the whole app
`index.html` loads 10 of the 11 JSX files — `Items.jsx` is missing — while `build.py` (`JSX_FILES`, build.py:26-29) and `test/helpers/boot.cjs` both include it. `app/Shell.jsx:456` renders `<window.Items …>` unguarded (contrast `Detail.jsx:664`, which guards `window.Lineage &&`). Under the README's first Quick-start mode (`npm run dev`), clicking the **Items** tab — or **any material-culture cross-link in any figure's Detail panel** (Shell's `openItem` switches to the items view) — throws `Element type is invalid … got: undefined` and the ErrorBoundary replaces the entire shell.
**Proven:** jsdom booted with `index.html`'s exact script list → `window.Items: undefined`, error boundary shown, Browse table gone. The test suite stays green because `boot.cjs` uses build.py's list, not `index.html`'s — the harness exercises a script set that exists in no shipped dev page.
**Fix:** add `<script type="text/babel" data-presets="react" src="app/Items.jsx"></script>` after the Detail line in `index.html`. Then prevent recurrence: derive the three manifests (index.html / build.py / boot.cjs) from one list, or add a test that parses `index.html`'s script tags and asserts parity. Also add `Items.jsx` to README's layout listing. *(certain; reproduced)*

## High

### C1 · `app/data.js:168657-168688` · Umbrella-tradition split orphans 31 figures from every tradition-keyed constant — regression in HEAD
`consolidateRegistry` retags 27 `polynesian_*` figures to `Hawaiian`/`Māori` and 4 `aboriginal_*` to `Kamilaroi`/`Kulin`/`Noongar`/`Worrorra` (commit `529e203`), but `TRADITION_PIGMENTS` (data.js:58), `ERA_ORDER` (:34271), `ERA_DATES` (:34781), and `buildTerritorySeed` (:150) still key only `Polynesian`/`Aboriginal Australian`. The figures' eras were valid under the umbrella keys; post-retag they resolve to nothing: `getEntryDates` returns all-nulls (verified: `polynesian_maui` → all-null; same entry under `Polynesian` → `{mythicEnd:-1200, textualStart:1800}`), `Lifecycle`'s `ERA_ORDER[tradition]` is empty, era sort loses its anchor, pigments fall back to the 10-color hash, and the Polynesian/Aboriginal atlas polygons now map zero figures.
**Fix:** add the six new tradition names to all four constants (duplicate the umbrella entries), or add an alias map `TRADITION_PARENT = { 'Māori': 'Polynesian', … }` consulted by `getEntryDates`/`statusAtConception`/`colorForTradition`/the atlas join. *(certain; data-verified)*

### C2 · `app/data.js:58-112, 34271, 34781, 150` · 182 of 232 traditions (933 figures) absent from all tradition-keyed constants
The five corpus waves grew 599 → 1,845 figures and 53 → 232 traditions; the constants were never backfilled. Measured: **1,156 figures (62.7%) have fully-null `getEntryDates`** (era sort dumps them at the end; Lineage/Lifecycle timelines unanchored), half the corpus has no map territory, and 182 traditions share 10 fallback colors (state.jsx:195-198) — heavy collisions in every tradition-colored view. Largest gaps: Zoroastrian (25 figures), Māori (20), Scythian (20), Thracian (19), Lusitanian (18), Canaanite (17).
**Fix:** generate `ERA_ORDER`/`ERA_DATES`/pigment/territory entries alongside each wave (gen-new-figures already knows the traditions); add a startup coverage-ratio log so the gap stays visible. *(certain; measured)*

### D2 (+D6, E14a/b) · `.github/workflows/deploy-pages.yml:8-17`, `ci.yml:5-9` · Deploys and push-CI are wired to a deleted session branch; trunk deploys blocked
Both workflows' `on.push.branches` list `main` and `claude/intelligent-volta-ZwLAt` — a branch that no longer exists. The deploy workflow's own comment states the `github-pages` environment's deployment-branches rule does **not** permit `main`. Net: no push can deploy; the production site is frozen at whatever the dead branch last published; pushes to working `claude/*` branches trigger no CI at all (only PRs gate). README.md:42-44 ("deploys on every push to the trunk") and :62-63 ("ci.yml runs … on every push") are both false in practice.
**Fix:** set the environment rule to allow `main`; replace the stale branch with `claude/**` (or drop the push filter) in both workflows; delete the lines 8-12 comment; correct the README. *(certain on repo contents; the GitHub-side environment rule is asserted by the workflow's own comment)*

### D1 (= E9) · `.gitignore:5`, `package.json:12`, `ci.yml` · Lockfile deliberately gitignored while the build-critical compiler floats on a caret
`package-lock.json` is gitignored and `@babel/standalone` is `^7.28.4`; CI `npm install` resolves whatever 7.x is newest (today 7.29.7). The byte-exact-regeneration gate passes only because Babel codegen happens to be output-stable across 7.28.4 → 7.29.7. Any output-changing Babel release breaks `verify-regen` on every PR with a failure unrelated to the PR; a compromised `@babel/standalone` publish would execute at build time and ship into the production artifact with no lockfile integrity check. Missing lockfile also blocks `npm ci` and `setup-node` caching (neither workflow has `cache:`).
**Fix:** remove `.gitignore:5`, commit the lockfile, pin `"@babel/standalone": "7.28.4"` exactly, use `npm ci` + `cache: npm` in both workflows. *(certain)*

### A1 · `app/Shell.jsx:499-514` · ⌘K pick while an item detail is open stacks two slide-overs
`onPick` sets `view='browse'` and the figure selection but never clears `selectedItemId`. Shell renders `Detail` (:466) **and** `ItemDetail` (:484) simultaneously; the stale item panel sits on top of the new figure detail (URL says `#/browse/<figureId>`) and persists across view switches until Escape. `openItem` (:330-335) explicitly clears the figure selection "so the two slide-overs never stack" — this is the forgotten mirror image.
**Fix:** `setSelectedItemId(null)` at the top of `onPick`. *(certain)*

### A2 · `app/Shell.jsx:386-393` (with `:86-88`) · Global Enter handler hijacks Enter on focused buttons/checkboxes
The window-level "table navigation" Enter branch runs whenever no panel is open, regardless of focus, and calls `e.preventDefault()` — suppressing native Enter activation of any focused button (sort buttons, view tabs, Find, filter chips, rail clear) and opening the browse-cursor row's detail instead. The rail's `role="checkbox"` rows handle Enter themselves but don't `stopPropagation`, so the filter toggles **and** an unrelated figure's detail opens. In a keyboard-first app, Tab+Enter is broken almost everywhere in the default state.
**Fix:** gate the table-navigation branch on the target not being interactive: `if (e.target.closest?.('button, a, select, [role="checkbox"], [role="button"], [role="tab"]')) return;` (and/or `stopPropagation` in the rail handlers — the Shell-side guard is more robust). *(certain)*

### B1 · `app/Lifecycle.jsx:194, 253` · `vitalStatus === 'dead'` misses `'deceased'` — 78 of 158 death stages render as alive
The corpus uses two synonyms: `dead` (80 lifecycle stages) and `deceased` (78), verified by census. The timeline only dashes rings/segments for the exact string `'dead'`, so nearly half of all death phases render solid/alive, contradicting the on-screen legend "dashed = deceased" (:397).
**Fix:** `const isDead = v => /^(dead|deceased)$/.test((v || '').toLowerCase())`, used at both sites (or normalize the vocabulary in `migrate`). *(certain; data-verified)*

### B2 · `app/Lineage.jsx:41-53, 75, 140, 247` · Sibling set not deduplicated against ancestor/descendant rows → duplicate cards, duplicate React keys, dropped connectors
A figure can be both sibling and parent of the focus (e.g. focus=Cronus: Uranus is ancestor row 1 *and* sibling via Gaia — 26 real cases at default depth, all twelve Titans included). Consequences: `key={n.id}` collides (React duplicate-key error, unstable reconciliation on depth toggles); `computeEdges`' `byNodeId` is last-wins, resolving Uranus to the focus-row copy and silently dropping the Uranus→Cronus connector while rendering Uranus twice.
**Fix:** track one `placed` set across all three traversals; skip sibling/descendant candidates already placed. (Alternative: row-aware keys + row-aware `byNodeId`, but exclusion is the cleaner semantic.) *(certain; data-verified)*

### B3 · `app/Graph.jsx:560-567` · `figureActiveAt` mixes mythic/textual axes per-field and collapses open-ended ranges
`start = mythicStart ?? textualStart`; `end = mythicEnd ?? textualEnd ?? start` — bounds can come from different axes. Verified: `hindu_dharma` → start=-1500 (textual) / end=-7000 (mythic), inverted, never active; 39 figures collapse to exactly one active year; **at the slider maximum (2025), zero of 1,845 figures are active**, although living-tradition eras are open-ended by design (Lifecycle's `buildEraSpans` extends open ends to ≥2025).
**Fix:** resolve the pair atomically (mythic pair if `mythicStart != null`, else textual pair); treat null end as open (clamp to slider max); guard `end >= start`. *(certain; data-verified)*

### E2 · `test/render.test.cjs:41-42`, `test/helpers/boot.cjs:53` · Atlas assertion passes via the basemap-error placeholder — map rendering has zero effective coverage
`boot.cjs` stubs `window.fetch` to reject; Atlas catches the failure into an error state; `.atlas-canvas` contains only "Could not load the world basemap…" with **0 SVG paths** — and `assert.ok(querySelector('.atlas-canvas'))` passes against it. Projection, the 56 territory polygons, layers, and click-through can all regress invisibly.
**Fix:** commit a small basemap fixture (or resolve `fetch` for that URL from a file) and assert `svg path` count > 0 / 56 territory shapes; test the error state separately. *(certain; probed)*

### E3 · `README.md:90-94, 58-60` · README's data-layer contract is false: nothing is ever persisted
README: seed "writes … to localStorage … seeding only when storage is empty so user edits are preserved. The UI reads from the same keys." The seed JSON is **5,840,130 chars — over the ~5MB quota** — so the write always throws (in real browsers and jsdom), nothing persists, and the UI reads the in-memory `window.__PR.seedPeople` fallback (state.jsx:98-105). Edits could not survive a reload. The code itself documents this (data.js tail comment); the README was never updated. Same section claims seed.test checks "1,845 figures" — it asserts a floor of ≥602 (see E5).
**Fix:** rewrite the paragraph to describe attempt-then-fallback (and that corpus-scale persistence is currently impossible); align the test description. Cross-refs: C5 (code-side consequences), E8 (untested branches). *(certain; observed in every test run)*

### E4 (= D11, A10; +D17d, C14-note) · `index.html:177`, `build.py:247` → `dist:3329`, `package.json:5` · Shipped boot splash understates the corpus 3×, and the two entry points disagree with each other
Dev splash: "601 figures, 50 traditions"; built artifact: "602 figures, 50 traditions"; package.json description: "50 traditions, 601 entries". Actual: **1,845 figures / 232 traditions** (README is right). The production artifact's first visible text is wrong by 3×, and 601-vs-602 is direct evidence of the forked-template drift (build.py embeds a ~180-line copy of the index.html shell with no sync mechanism — see also E1). Stale "601" also lingers in comments (state.jsx:489, Browse.jsx:11).
**Fix:** have `main.jsx` (or `build.py`) derive the subtitle from the loaded corpus; update package.json; ideally single-source the HTML template. *(certain)*

## Medium

### A3 · `app/Shell.jsx:253-297` · First-commit URL-sync race rewrites every deep link to `#/browse` and injects a bogus history entry
On mount, the URL-sync effect runs before `applyHash`'s state lands (React 18 batches), computes `target='#/browse'`, and `replaceState`s over the deep link; after the state lands it `pushState`s the original back. Net: the deep-link history entry is destroyed, the address bar flickers, and Back lands on `#/browse` instead of leaving the page.
**Fix:** make the sync effect's first run record-only (`if (!prev.initialized) { record; return; }`) — the hash is the source of truth at boot; or lazy-initialize view/selection state from `location.hash`. *(certain from React 18 ordering; not browser-recorded)*

### A4 · `app/Detail.jsx:581-584` · Detail header cross-pairs textual/mythic bounds → reversed ranges on 56 entries
`textualStart ?? mythicStart` paired with `textualEnd ?? mythicEnd` mixes timescales when one axis is partial. Verified against the seed: 64 entries cross-pair; **56 render reversed** (e.g. `suludnon_alunsina` → "1900 CE – 1500 CE"). Browse pairs the same data correctly (Browse.jsx:47-49), so table and panel disagree. Same pattern family as B3/B7.
**Fix:** pick the pair atomically: `const [ds,de] = dates.textualStart != null ? [dates.textualStart, dates.textualEnd] : [dates.mythicStart, dates.mythicEnd];`. *(certain; reproduced)*

### A5 · `app/Shell.jsx:232` · `decodeURIComponent` on untrusted hash throws → ErrorBoundary retry loop
`#/browse/%zz` (or a stray `%`) throws `URIError` inside the mount effect; "Retry" remounts Shell, which re-reads the same hash and rethrows — a permanent crash loop until the URL is hand-edited.
**Fix:** wrap in try/catch, fall back to the raw segment. *(certain)*

### A6 · `app/Browse.jsx:64, 277, 24-38` · Hover-driven cursor re-renders all ~1,875 rows per row crossed; hover triggers cursor auto-scroll → jitter and keyboard/mouse fights
(a) `onMouseEnter → setCursorIdx` is Shell-level state and `BrowseRow` isn't memoized: every row the pointer crosses re-renders the full table (each row recomputing `altNames`/`getEntryDates`/`formatEra`) — visible jank on the dev React build. (b) The cursor effect scrolls the container even when the cursor moved via hover, so hovering an edge row scrolls the table, sliding a new row under the pointer → cascade. (c) During j/k, auto-scroll moves rows under a parked mouse; the resulting `mouseenter` snaps the cursor back.
**Fix:** track input modality (keyboard flag set on keydown; ignore `mouseenter` ~100ms after programmatic scroll; only auto-scroll for keyboard moves); `React.memo(BrowseRow)` with stable callbacks. *(mechanics certain)*

### B4 · `app/Graph.jsx:82-118` · Focusing a figure not in the scoped `people` blanks the graph behind the focus card
`buildGraph` adds `focusId` to `used`, but `nodes = people.filter(…)` can't recover a focus outside `people`; the focus BFS then yields zero nodes → empty-state message renders **behind** the still-overlaid FocusCard. Reachable today: Detail → "Show in graph" while a rail filter excludes the figure (Shell.jsx:476-480 sets `graphFocusId` unconditionally), or scrubbing the year slider past the focus's range.
**Fix:** derive `effectiveFocusId` (null when not in scope, with an explicit "filtered out" notice), or inject the focus entry into `nodes` from `byId`. *(certain logic; flows verified)*

### B5 · `app/Graph.jsx:185-231, 956-1003` · Every graph rebuild paints one frame with all nodes at (0,0)
Fresh node objects have no `x/y`; render emits `translate(0,0)`; position seeding lives in a passive effect that runs after paint, and the DOM corrects only on the next d3 tick. Every slider step / focus click / mode switch strobes the layout through the origin — defeating the purpose of `positionsRef`.
**Fix:** seed positions synchronously inside the `graph` useMemo (it owns the fresh arrays; `positionsRef` is in scope). *(mechanism certain; per-frame visibility depends on paint timing)*

### B6 · `app/Graph.jsx:318-323, 785-803` · `setZoomK` per zoom event re-reconciles up to 400 nodes + hundreds of links per wheel tick
The transform is applied imperatively (good) but `setZoomK(e.transform.k)` fires per event, and `zoomK`'s only consumer is the `>= 1.6` label threshold.
**Fix:** store the boolean (or quantize): update state only when crossing 1.6. (Atlas legitimately needs continuous `k`; Graph does not.) *(certain)*

### B7 · `app/Lifecycle.jsx:90-98` · `buildEraSpans` borrows the next era's start across axes → inverted ruler labels like "1830 CE – 500 BCE"
Open-ended eras take `next.mythicStart ?? next.textualStart` regardless of which axis produced the span's own start. Verified on 8 real entries (lakota star_man family, makunaima, manipuri_salailen `[33..-500]`, tagalog_bathala `[1500..-500]`). Layout unharmed (equal-width bands); the printed axis is nonsense.
**Fix:** resolve the neighbor's start on the same axis; clamp `end ≥ start` or suppress the label when inverted. *(certain; data-verified)*

### C3 · `app/data.js:34048-34051, 35653-35657` · 223 figures in *mapped* traditions use eras outside their tradition's vocabulary; validation is silently blind to them
Generic eras (`mythic`, `primordial`, `heroic-age`) appear where the tradition's vocabulary is specific (e.g. Yoruba's `cosmogonic…colonial`). `detectEraInversions` does `indexOf === -1 → return`, so these parent-child edges are never inversion-checked — the "0 inversions" log is partly vacuous — and date/status resolution degrades. Largest: Hindu 50, Egyptian 27, Mesopotamian 19, Chinese 17, Japanese 16, Roman 15, Yoruba 14.
**Fix:** have `validatePersonHard`/`migrate` warn when a non-null era is absent from `ERA_ORDER[tradition]`. *(certain; measured)*

### C4 · `app/state.jsx:98-122, 185-188` · Empty-but-present localStorage value defeats the in-memory fallback and blanks the registry
The fallback triggers only when `readJSON` returns null. A persisted `{}`/`[]`/wrong shape is truthy → `loadPeople` returns `[]`, `ready` stays false forever, app shows an empty registry while the full seed sits in memory — and data.js's seed-if-empty never overwrites, so the state is sticky across reloads. `hasSeededPeople` and `loadAtlas` share the hole.
**Fix:** after shape-normalization, `if (result.length === 0) return memFallback()`. *(logic certain; in-the-wild occurrence likely)*

### C5 · `app/data.js:168731-168738` · Seeding: the people write can never succeed, the atlas write is collateral damage, and a success would pin clients to a stale corpus
(a) 5,840,130 chars > every mainstream quota → `setItem(PEOPLE_KEY)` always throws; the corpus is stringified (~27ms) every load just to be discarded. (b) The 60KB atlas write sits **after** the people write in the same try block, so it never runs (verified: only `pantheon_constants_v1` lands). (c) Where a write *could* succeed (Electron, raised quota, smaller future corpus), seed-if-empty under a fixed key pins that client to the corpus at first write — the exact failure the v8→v9 bump (HEAD) was made to flush — and old-key blobs are never `removeItem`d, permanently taxing origin quota.
**Fix:** separate try/catches (atlas first); skip the people stringify when length exceeds a known bound (or persist only user deltas); `removeItem` prior key versions on bump; store a corpus version and re-seed when the shipped seed is newer. *(certain; VM-verified)*

### C6 · `app/data.js:29322-29325` · Cited item batches for 4 nonexistent figures silently dropped
`ITEMS_GEN` keys `greek_hesiod_erinyes`, `greek_hesiod_tyche`, `hindu_vishnu_narasimha`, `hindu_vishnu_varaha` resolve to no figure; their researched, citation-bearing items (e.g. the Erinyes' brazen scourge) never reach any registry. Only a console.warn marks the loss.
**Fix:** author the four figures, or re-home the batches under ITEM_LORE with externalRef; make `gen-powers-items.cjs` fail on unknown keys. *(certain)*

### D4 · `build.py:56-58, 73-78` · Script-termination guards miss case/whitespace `</script` variants and `<!--` entirely
The abort check matches only lowercase `</script>` exactly; `safe()` replaces only lowercase `</script`. Per HTML spec a script element also closes at `</ScRiPt ` etc., and `<!--` inside script content enters the double-escaped parser state. Today the 7.6MB payload contains zero of either (verified) — but the corpus is regenerated from research transcripts, so the input is not tightly controlled, and one future `<!--` in mythological prose would silently mis-parse the artifact.
**Fix:** `re.sub(r'(?i)</script', r'<\\/script', …)` and abort on `re.search(r'(?i)<!--|</script[\s/>]', body)`. *(gap certain; trigger possible)*

### D5 · `build.py:65, 70-71, 278, 46-49` · No explicit encoding on any file I/O or the Babel subprocess — Windows builds crash
All `read_text`/`write_text`/`subprocess.run(text=True)` use the locale encoding. On Windows (cp1252), `app/data.js` contains 4,417 lines with bytes undefined in cp1252 → `UnicodeDecodeError`; the write side would also CRLF-translate, breaking byte-exact regen. Linux/macOS CI never catches it.
**Fix:** `encoding='utf-8'` everywhere (+ `newline='\n'` on writes). *(certain)*

### D7 · `ci.yml:20-29`, `deploy-pages.yml:36-84` · All actions pinned by mutable tag, not commit SHA
`checkout@v4`, `setup-node@v4`, `setup-python@v5`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`. A hijacked tag executes with `id-token: write`/`pages: write` and can publish arbitrary content to the production site.
**Fix:** pin to full SHAs with version comments; add Dependabot/Renovate to manage them. *(certain)*

### D8 · `deploy-pages.yml:31-73` · Deploy builds and publishes without running the test suite
The build job runs install → build.py → dogfood → upload; `npm test` never runs and there's no dependency on the CI workflow. A push with failing tests deploys anyway.
**Fix:** add `npm test` (and `verify-regen.sh`) before upload. *(certain)*

### D9 · `scripts/harvest-sources.cjs:94-97` · Harvester deletes the committed transcripts, then crashes on its nonexistent input
`fs.rmSync(OUT_TX, {recursive, force})` runs before reading `TASKS`, which defaults to a dead ephemeral `/tmp/claude-0/…/tasks` path. Running the script today wipes all 104 committed transcripts and throws ENOENT. Recoverable via git and verify-regen would fail loudly — but it's a destructive footgun whose header invites running it.
**Fix:** `fs.existsSync(TASKS)` guard before the rm; or write to a temp dir and swap on success. *(certain)*

### D10 (= E17) · `deploy-pages.yml:54-63`, `scripts/dogfood-sample.cjs:18, 50` · The published dogfood sign-off is regenerated blank at deploy time and all its links 404
The deploy job re-runs `dogfood-sample.cjs` (seeded by today's date) and ships the freshly **unticked** checklist — a never-reviewed document replacing the committed sign-off, defeating DOGFOOD.md's stated goal. Every row links to `dist/pantheon-registry.html#/browse/<id>`, a path that doesn't exist on the Pages site (artifact deploys as `index.html`); on github.com the link hits a 7.9MB raw blob.
**Fix:** deploy the committed DOGFOOD.md verbatim; make the link base configurable (`./index.html#/browse/…` for the site). *(certain)*

### E5 · `test/seed.test.cjs:46,145,168`, `content.test.cjs:107-111`, `render.test.cjs:21,117` · Regression floors stale by ~3× and duplicated inconsistently
Floors vs actuals: figures ≥602 vs 1,845 (three copies, one at 900); faculties ≥1,200 vs 2,666; materialCulture ≥900 vs 1,286; items >30 / ≥78 / >30 vs 1,240. A generator bug silently dropping two-thirds of the corpus — and committed, so verify-regen passes — stays green.
**Fix:** hoist one shared `FLOORS` constant and ratchet near actuals (figures ≥1,800, items ≥1,200, faculties ≥2,600); delete the duplicate assertion. *(certain)*

### E6 · `test/render.test.cjs:40` · Graph assertion accepts the empty state
`querySelector('.graph-canvas svg, .graph-empty')` passes when Graph renders its "no edges" placeholder. Today the real branch is taken (46 circles, 18 edges probed) — but a regression that empties the default graph flips the test to the vacuous branch.
**Fix:** assert `.graph-canvas svg` **and** `circle` count ≥ 20; test `.graph-empty` separately under a legitimately empty filter. *(certain)*

### E7 · `test/dogfood.test.cjs:1-6` · No automated test executes the built artifact
The "dogfood" test boots via boot.cjs (Babel-transforms `app/*.jsx`); it never opens `dist/pantheon-registry.html`. Dist-only code paths (early error trap, srcdoc storage/history shims, production React, SRI tags — build.py:93-148, 232-239) have zero behavioral coverage. Byte-reproducibility (enforced in CI) is not behavior: a build.py template bug ships reproducibly broken.
**Fix:** add a variant that loads dist into JSDOM (`runScripts:'dangerously'`, CDN libs injected from node_modules) and runs the same Detail assertions. *(certain)*

### E8 · `app/state.jsx:88-116` · The storage-populated and corruption branches of `loadPeople` are untested; the quota fallback only incidentally covered
Only the empty-storage→seed-fallback branch runs in tests (by accident of the quota failure). Untested: pre-existing localStorage preferred over seed (the contract the v8→v9 bump exists for), legacy wrapper shapes (`v.people`, `v.entries`, array), corrupted-JSON catch, and no assertion pins which path was taken.
**Fix:** VM/jsdom tests pre-seeding (a) a small edited map → wins over seed; (b) garbage → graceful fallback; plus one assertion that the quota path is active. *(certain)*

## Low

### A7 · `app/Shell.jsx:386-393` · Table-navigation keys not view-gated
In Graph/Atlas/Items with no panel open, j/k move an invisible Browse cursor and Enter opens a seemingly random figure's Detail over the current view. **Fix:** gate the branch on `view === 'browse'`. *(behavior certain; intent likely)*

### A8 · `app/Detail.jsx:546-561`, `app/Items.jsx:265-273` vs `Shell.jsx:466,484` · Exit-animation machinery is unreachable dead code
Shell renders both panels conditionally (`{selectedEntry && <Detail/>}`), so `entry` is never null while mounted; the 180ms closing state machines and `.closing` CSS (styles.css:933-945) never execute — panels vanish with no slide-out. **Fix:** render unconditionally and let the components own the exit, or delete the machinery. *(certain)*

### A9 · `app/Shell.jsx:184-189` · Shortcuts legend advertises "e — emend" with no handler anywhere
Legacy-editor leftover; the legend lies. **Fix:** remove the hint or implement it. *(certain)*

### A11 · `app/Shell.jsx:319-325` vs `app/Items.jsx:64-80` · ItemDetail Prev/Next walks a different order than the visible Items index
`moveItem` walks `allItems` order (holderCount desc); the index renders kind-grouped, text-filtered rows. Prev/Next jumps to entries far from adjacent on-screen rows and ignores the filter. **Fix:** derive the nav sequence from the same grouped/filtered projection the index renders. *(certain)*

### A12 · `app/Detail.jsx:69-74, 42, 124-127, 233`, `app/Items.jsx:186-204` · `role="button"`+`tabIndex` elements with no key activation; other links not focusable at all
Parentage rows and custody steps are announced as buttons but keyboard-inert (no onKeyDown); relation targets, descent parent names, and "via" links are click-only spans with no role/tabIndex. Material-culture rows correctly use `<button>` — the panel is inconsistent. **Fix:** shared Enter/Space handler or real `<button>`s. *(certain)*

### A13 · `app/Detail.jsx:592-597`, `app/Items.jsx:288-292`, `app/CommandPalette.jsx:89-96` · Dialogs lack focus management
No focus move on open, no restore on close, no `aria-modal`, no trap; Tab walks the obscured background. For a keyboard-first app this is the one ARIA gap that matters. **Fix:** focus the panel on open (`tabIndex={-1}` + `.focus()`), `aria-modal="true"`, restore on close, minimal Tab loop. *(certain)*

### A14 · `app/styles.css:1327-1332` vs `app/Detail.jsx:307-312, 479-500` · 4 of 6 section accent-stripe rules can never match
`.section.section-cult`/`.section-festivals` render as `subsection section-cult` (no `.section`); `.section.section-faculties .rich-rows` and `.section-material .rich-rows` match nothing (Powers uses `section-powers`; material uses `.material-list`). Only domains/epithets stripes render. **Fix:** relax selectors; re-point or delete the dead rules. *(certain)*

### A15 · `app/Shell.jsx:303-316` · Detail Prev/Next and j/k silently dead when the open entry isn't in the filtered list
⌘K picks, item-holder cross-links, and deep links can open entries excluded by active filters → `selIdxInFiltered === -1` → buttons look enabled but no-op. **Fix:** disable the buttons when out-of-filter (or fall back to the first filtered row). *(certain)*

### A16 · `app/Detail.jsx:428` · Per-citation `kind.toLowerCase()` on an unvalidated stored field
Everywhere else the panel string-coerces; here a non-string `kind` (user-editable storage is the source of truth) throws into the boundary. Seed is clean today (0 non-string kinds verified). **Fix:** type-guard. *(robustness; requires edited storage)*

### B8 · `app/Lifecycle.jsx:230-237` · ResizeObserver never attaches when the first render is fallback-mode
The `[]`-dep mount effect bails on `!containerRef.current`; the fallback branch returns before the container div renders. If the first lifecycle entry of a Detail session is one of the 58 fallback-mode entries, later scaled timelines are stuck at the 640px default until the panel remounts. **Fix:** re-run on `[plot.mode]` or use a callback ref. *(mechanism certain; narrow trigger)*

### B9 · `app/Lineage.jsx:171, 218-221` vs `styles.css:2845-2856` · Edge SVG offset +6px from the card coordinate origin
`.lineage-canvas` has `padding: 6px`; absolutely-positioned cards measure from the padding edge, but `.lineage-edges` is positioned at `top:6px; left:6px` while `computeEdges` emits card-space coordinates — every connector draws 6px right/below its anchor. **Fix:** position `.lineage-edges` at 0,0. *(likely; CSS-spec-derived, not browser-verified)*

### B10 · `app/Atlas.jsx:25-42` · A failed basemap fetch is cached forever
`__basemapPromise` is module-level and never cleared on rejection; one transient failure bricks the atlas until full page reload, despite the error panel implying transience. **Fix:** clear the cache in a `.catch`; add a retry button. *(certain)*

### B11 · `app/Atlas.jsx:419-424, 138-141, 444-497` · Unthrottled mousemove/zoom state updates re-render the whole map
`setHover({…h, x, y})` per mousemove re-renders 144 paths + basemap + the inline greedy label-collision layout. **Fix:** move tooltip positioning to a ref (it's `position:fixed`, `pointer-events:none`); memoize the label layout. *(certain mechanism; modest impact)*

### B12 · `app/Lifecycle.jsx:138-144` · Stages with unmatched eras silently dropped from the scaled plot
The heading still counts them; the progression line bridges the gap. Zero occurrences today (all 501 lifecycles resolve) — but C1/C3 make unmatched eras a live class. **Fix:** render unmatched stages in a trailing "undated" band. *(logic certain; trigger possible)*

### B13 · `app/Atlas.jsx:44-54` · `polyPath` projects vertices pointwise with no antimeridian handling
A ring spanning ±180° would smear across the map. None of the current 144 polygons spans >180° longitude — latent until a Pacific/circumpolar territory lands. **Fix:** split at the antimeridian or route through `d3.geoPath`. *(logic certain; trigger possible)*

### C7 · `app/data.js:168723-168727, 168740`, `app/state.jsx:169-191` · Dead persistence/event seams
`pantheon_constants_v1` (47KB) written every load, read by nothing; `pantheon:constants-ready` dispatched with zero possible listeners (data.js runs synchronously before any UI script); `hydrateConstants`/`hasSeededPeople` exported but uncalled. **Fix:** delete (or wire main.jsx back onto them). *(certain)*

### C8 · `app/data.js:25479`, `app/state.jsx:8,181`, `app/main.jsx:58` · Storage key duplicated across four call sites
`'pantheon_registry_v9'` declared in data.js and state.jsx and hardcoded in `hasSeededPeople` and main.jsx's boot counter; `__PR.PEOPLE_KEY` exists precisely to share it but has no consumer. The next bump (history shows they recur) must touch four places. **Fix:** read `window.__PR.PEOPLE_KEY` everywhere downstream. *(certain)*

### C9 · `app/data.js:35656-35671` · `statusAtConception` relies on array order, and posthumous phases aren't excluded
12 figures have non-monotonic lifecycles (eraOrdering resets per era), violating the "last candidate = highest ordering" assumption; `dead` phases pass the filter and the fallback chain can return a vital status (`statusAtConception('inca_pachacuti', …) === 'dead'`). Numerically harmless today (divinityFraction branches only on deity/mortal) but the contract is violated for future callers. **Fix:** sort candidates by (eraIdx, eraOrdering); drop vitalStatus from the fallback chain. *(evidence certain; impact today nil)*

### C10 · `app/data.js:25664-25686, 25497-25555` · Cycle handling silently under-counts tradition shares
On a genealogy cycle, `traditionFractions` returns `{}` for the revisited branch, losing that slot's share (sums < 1, no fallback). Zero cycles exist today, but `migrate` explicitly supports `acceptedCycleReason` cycles as a future pattern. **Fix:** credit the truncated slot with the parent's own tradition, or normalize to sum 1. *(logic certain; latent)*

### C11 · `app/data.js:28844-28889` · Temp fields `_name`/`_term`/`_gloss` leak onto 1,023 of 1,240 registry items
Shipped on `window.__PR.items` to the UI and any serializer. **Fix:** delete them in the finalize loop. *(certain)*

### C12 · `app/state.jsx:216, 244-263` · `parsePeriod`: qualifier branch unreachable with an era suffix; BCE range formula assumes descending authoring
"late 19th c. CE" matches the plain-century regex first (qualifier ignored); an ascending "16th-17th c. BCE" would collapse degenerate. Measured on the 144 real atlas periods: 40 nulls (27.8% — purely descriptive strings), 0 inverted, 0 degenerate — the bugs don't fire on current data; the "~85%" coverage comment overstates by ~13 points. **Fix:** order the qualified regex first; min/max-normalize BCE ranges; give the 40 descriptive polygons explicit dates. *(certain; data-verified)*

### C13 · `app/data.js:168693` · Validation runs on a corpus that differs from the shipped one
`validatePersonHard`/drift/dangling/inversion/cycle checks run inside `migrate`, i.e. **before** the item/powers merges and before `consolidateRegistry`'s retag + parentIds scrub. Everything merged post-migrate is never schema-validated, and the "0 era inversions" log was computed under pre-retag traditions that no longer exist in the shipped map. **Fix:** re-run (or move) the validation layers after `consolidateRegistry`. *(certain)*

### D12 · `deploy-pages.yml:21-24` · `pages: write` + `id-token: write` granted at workflow level
The build job (npm install + third-party actions + corpus scripts) runs with an OIDC-capable identity it never uses. **Fix:** move the grants into the `deploy` job; default the workflow to `contents: read`. *(certain)*

### D13 · `ci.yml:25`, `deploy-pages.yml:41` · Node 20 is past end-of-life
Maintenance ended 2026-04-30; CI and the artifact's Babel transform run on an unsupported runtime. **Fix:** bump to `'22'`. *(likely per published schedule)*

### D14 · `build.py:46-49` · Missing `node` produces a raw traceback
`FileNotFoundError` is unhandled, unlike the clean missing-Babel path. **Fix:** try/except → actionable exit message. *(certain)*

### E10 · `test/render.test.cjs:24-36` vs `app/Shell.jsx:340-394` · Keyboard coverage is a sliver of the implemented map
Covered: `/`, meta+K, Escape (palette branch). Untested: ctrl+K, the four-level Escape cascade, j/k/arrows in all three contexts, Enter-to-open — exactly what a Shell refactor would break silently. (Harness mechanics are fine: Shell listens on window keydown, so dispatched KeyboardEvents are real.) **Fix:** add a keyboard block. *(certain)*

### E11 · `test/helpers/boot.cjs:47-48, 59-68` · Error capture misses console.error; mount runs outside `act`
React reports boundary-swallowed crashes via console.error, which boot.cjs never captures; the act warning on every run trains readers to ignore warnings. **Fix:** VirtualConsole → push console.error into `app.errors` (allowlist the act warning or eliminate it); assert `.error-boundary` absent after view switches. *(certain)*

### E12 · `test/render.test.cjs:8-10, 74-76` · One shared app instance across all 14 subtests; first-row coupling
`before` (not `beforeEach`) boots once; tests mutate shared state in declaration order; the lifecycle test depends on the current default sort putting ʿAntara first. **Fix:** reset state in `beforeEach`; use `openFigure` with a named multi-era id. *(certain)*

### E13 · `test/seed.test.cjs:72-75` · Only "Layer 1" console.errors asserted; warn-level integrity drift unbounded
The tolerated warn stream (28 tier drifts, 3 dangling parentIds, 4 unknown-figure items) could grow 100× with no test movement. **Fix:** assert ceilings on the known counts; add a final-seed referential check for relation targets/holders. *(certain)*

### E14 · `README.md` · Remaining accuracy bundle (beyond E3/E4 and D2's claims)
(c) "Node.js + npm (only for build.py)" — Node is also required for `npm test` and every script. (d) Tests section omits content.test.cjs and dogfood.test.cjs. (e) The third localStorage key `pantheon_constants_v1` is undocumented. (f) Layout listing omits `app/Items.jsx` (see E1) and `scripts/`, `test/`, `data-sources/`, `DOGFOOD.md`, `.github/`. **Fix:** one README pass. *(certain)*

## Nits

### A17 · `app/Shell.jsx:13, 414` · Brand meta bound to the filtered count
"Pantheon Registry — 12 figures" under active filters; bind `people.length` or rename.

### A18 · `app/CommandPalette.jsx:50-66` · Cursor can be −1 on empty results; match provenance computed then discarded
`viaAlt`/`viaTradition` are built and thrown away at `.map(s => s.p)`, so the list shows `alts[0]` rather than the alt that matched.

### A19 · `app/styles.css` · Dead CSS
`.stub` (:1755-1766), `.tags`/`.tag` (:1294-1306), `.filter-chip .x` (:589,593) match no JSX; `#boot complete` class has no rule; `.etym-family` declares `text-transform` twice (:1461,1463). (`.tier-tag`/`.btn-accent` were checked and are used by Graph/Atlas — not dead.)

### B14 · `app/Graph.jsx:334-341` · `FocusCard` early-returns before its `useMemo`
Dead guard today (parent guarantees `entry`), but a latent conditional-hook crash if ever rendered nullable. Move the guard below the hooks.

### B15 · `app/Graph.jsx:584-586, 943-954` · Stale `zoomK` after the SVG remounts
Empty-then-repopulated graph remounts the svg with identity transform while `zoomK` keeps its old value; label visibility can disagree until the next zoom event. Reset on rebind.

### C14 · `app/data.js:49-55` vs `app/state.jsx:18-24` · Two divergent tier palettes; `TYPE_META` is dead
Every view uses state.jsx `TYPE_TIER`; `__PR.TYPE_META` (different hex values) is consumed by no UI but asserted by seed.test. Delete or document.

### D15 · `scripts/gen-powers-items.cjs:10-11` · Header describes obsolete behavior
Claims it writes `/tmp/powers-items-parsed.json`; it actually rewrites `app/data.js` between sentinels. Update the comment (it misleads safety assessment).

### D16 · `scripts/*.cjs:16-19` · Dead machine-specific `/tmp/claude-0/…` fallback paths in all four generators
Permanently dead on any other machine; the live half of D9's footgun. Require `TASKS_DIR` explicitly when transcripts are absent.

### D17 · CI/housekeeping bundle
(a) ci.yml builds the artifact, then verify-regen rebuilds it — the standalone step is redundant. (b) No `concurrency` group or `timeout-minutes` on ci.yml. (c) `_site/` missing from .gitignore. *(d — package.json description — merged into E4.)*

### E15 · `test/dogfood.test.cjs:36,44` · Test title names `.power-term`; the selector is `.power-term-native`
Greppers will miss it; fix the title.

### E16 · `test/seed.test.cjs:14-39`, `content.test.cjs:14-30`, `scripts/dogfood-sample.cjs:26-30` · VM seed loader triplicated
Three hand-copied sandboxes already diverging (log capture). Extract `test/helpers/vm-seed.cjs`. Note the shim's unbounded-Map localStorage exercises a persist-success path no real browser can take.

### E18 · `test/seed.test.cjs:62-69` · Type check is skip-if-absent
All 1,845 figures carry `type` today — assert presence, and pin `p.id === key` (currently 0 mismatches).

### E19 · `package.json:9` · `--test-force-exit` can mask leaked handles
Close jsdom windows in `after` hooks and drop the flag.

---

# Appendix A — Data-integrity audit (executed against the live pipeline)

| Check | Result |
|---|---|
| Corpus | 1,845 figures · 232 traditions · 1,240 items · 56 territories (599 v2 + 1,246 generated; v1 list empty) |
| Duplicate ids | **0** |
| Dangling parentIds | 3 pre-scrub (`buganda_kibuka→buganda_wanema`, `buganda_mukasa→buganda_wanema`, `hurrian_kumarbi→hurrian_alalu`), **0 post-scrub**; scrub ordering is safe (runs before all derivations) |
| Dangling relations / death-agents / posthumous refs | **0** post-pipeline |
| Genealogy cycles | **0** (max ancestry depth 10; max distinct root paths 7 — no exponential-blowup exposure) |
| Era inversions | 0 reported — partially vacuous: 223 edges skipped via C3 |
| Mojibake U+FFFD | **0** across every string field of figures, atlas, items (deep scan incl. epithets/notes/etymology/lore) |
| Era values unresolvable vs `ERA_ORDER[tradition]` | **1,191** (968 from unmapped traditions = C2; 223 in mapped traditions = C3) |
| Traditions missing from pigments/atlas/ERA_ORDER/ERA_DATES | **182 of 232** (933 figures); figures with fully-null dates: **1,156 (62.7%)** |
| Divinity fractions | clean ×1,845: 0 NaN, 0 outside [0,1], every deity=1.0, every mortal=0.0; 28 warn-level tier drifts (by design) |
| traditionFractions | all sum to 1.0 ± 1e-6; 22 genuinely multi-tradition figures |
| Items | all 1,240 holders + custody refs resolve; 4 ITEMS_GEN keys unresolved (C6); 1,023 items leak `_`-fields (C11) |
| Lifecycle | 407 multi-phase; 12 non-monotonic (C9); vitalStatus census: dead 80 stages / deceased 78 (B1) |
| Atlas | 144 polygons, 0 degenerate, none >180° lon; periods: 104/144 parse (72%), 40 descriptive nulls |
| ERA_ORDER ↔ ERA_DATES | 0 key mismatches (54/54 traditions) |
| localStorage (5MB quota sim) | people write **always denied** (5,840,130 chars); atlas write never attempted (C5); only `pantheon_constants_v1` (47,490 chars) persists |
| data.js evaluation cost | ~310ms in node/V8 (compile ~110ms + execute ~199ms incl. validation + derivations); per-figure derivation loops 9-20ms each; ~27ms wasted stringify per load (C5) |

# Appendix B — Test coverage map (39/39 passing, ~12s)

| View / behavior | Covered? | By |
|---|---|---|
| Boot, zero runtime errors | Yes | render #1, dogfood |
| Browse: row count | Floor only (602 vs 1,845 — E5) | render #2 |
| Browse: search, rail toggles, era grouping, sort | **No** | — |
| Detail: open via click/hash; descent; powers; multi-script names; material-culture links | Yes | render #6,9-11,14; seed #17-20 |
| Detail: close, Prev/Next, "show in graph" | **No** | — |
| Lifecycle: node-spacing regression (sparse+dense) | Yes (layout only) | render #7-8 |
| Lifecycle: stage content/era scaling correctness | **No** | — |
| Lineage panel | Mount-only, zero assertions | — |
| Graph: mounts with nodes | Weak — empty state also passes (E6) | render #5 |
| Graph: node click, modes, path finder, zoom | **No** | — |
| Atlas: mounts | **Vacuous — asserts the error placeholder (E2)** | render #5 |
| Atlas: basemap, 56 polygons, layers, click-through | **No** | — |
| Items: index, item detail, cross-links | Yes | render #12-14; seed #21-26 |
| CommandPalette: open/close | Yes | render #4 |
| CommandPalette: typing, fuzzy filter, Enter-jump; ctrl+K | **No** | — |
| Keyboard: `/`, meta+K, Esc (palette) | Yes | render #3-4 |
| Keyboard: j/k/arrows ×3 contexts, Enter, Esc cascade | **No** (E10) | — |
| Routing: deep-link at load, back/forward, invalid hash id | **No** | — |
| Data layer: seed shape, __PR, divinity/items, content truth | Yes | seed #11-26, content #1-6 |
| localStorage: edits-win, legacy shapes, corrupted JSON, quota assertion | **No** (E8) | — |
| Error boundary | **No** | — |
| Built dist artifact behavior | **No** (E7; byte-reproducibility is enforced) | — |
| index.html dev script set | **No — and currently broken (E1)** | — |

# Appendix C — Verified sound (so it isn't re-litigated)

- **Security:** no `dangerouslySetInnerHTML`/`innerHTML`/`document.write` anywhere in app/; all rendering through React text interpolation; boot error paths use `textContent`; inline styles from code constants only; no data-derived hrefs. All four CDN tags in dist and all five in index.html carry SRI `integrity`+`crossorigin`; **every sha384 hash validated against npm-published bytes** (including babel-standalone 7.28.4). No build-time network fetches (fs/vm only).
- **Build:** dist reproduces byte-for-byte; `verify-regen.sh` is correct (`set -euo pipefail`, repo-root cd, git-diff gate) and runs in CI on every PR; generators are idempotent; all 104 transcripts feed ≥1 generator (0 orphans); Python splicing uses `str.replace` (no regex-backslash corruption); inline order matches dev dependency order (modulo E1).
- **Graph:** buildGraph dedupe/caps/BFS correct (max 2-hop neighborhood 134 < 400 cap); path mode BFS + 8-hop bound + reconstruction correct, built over unscoped people so year scoping can't break an active path; force-sim lifecycle managed correctly for d3 7.9.0 (no handler stacking, no setState in tick, single instance, clean unmount); zoom rebinds replace namespaced listeners (no accumulation); React never fights d3 over the zoomed `<g>`.
- **Atlas:** equirectangular projection math exact (scale = w/2π); NaN-filtering; shoelace only for z-order; basemap via geoPath with clipping; atlas data clean.
- **Lineage/Lifecycle:** per-direction cycle guards + depth caps make infinite loops impossible; band layout, fanning, divide-by-zero guards, label-fit truncation all correct.
- **Data layer:** divinityFraction is cycle-safe (per-path visited sets), deity/mortal short-circuits correct, Heracles = 9/16 → demigod matches tests; inheritablePowers BFS generation-bounded and seen-guarded; migrate normalizes all three name shapes with 0 hard-schema errors; mergeMaterialCulture/populateCustodyHolders/buildItemRegistry referentially complete; ERA_ORDER↔ERA_DATES perfectly consistent for mapped traditions; state.jsx hook memoization correct and keystroke-cheap; storage keys match across files today.
- **Shell plumbing:** the ref-refreshed window keydown listener attaches once with cleanup and never goes stale; palette capture-phase listener symmetric; no leaks across view switches (every listener/timer cleaned); URL push-vs-replace continuation logic correct after first paint (A3 is first-commit only).
- **Tests:** 39/39 deterministic across runs; event simulation is real (window keydown listeners, native `.click()` reaching React 18 root delegation); content-truth tests iterate the full corpus with no vacuous early returns; hard counts that should be hard are (56 territories, Heracles 9/16, Mjǫllnir, Shabaka Stone); DOGFOOD.md reproduces byte-exact from its committed seed.

---

*Review conducted with five parallel specialist passes plus orchestrator re-verification of all Critical/High findings. Confidence labels: certain = verified by execution or unambiguous code reading; likely = mechanism verified, magnitude or trigger unconfirmed; possible = plausible, needs a repro.*
