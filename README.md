# Pantheon Registry

**[www.listofgods.com](https://www.listofgods.com/)**

One index of the world's mythologies: **5,721 figures across 560 traditions**,
every one of them source-cited, cross-linked by genealogy, and browsable as a
table, a relation graph, or a map of where each tradition was attested.

Most mythology references are one tradition deep. This one is built to compare
across them — Odin and Woden are the same record's two attestations; the
graph will show you which traditions actually share figures, and the atlas will
show you where they overlapped on the ground.

## What's in it

| | |
|---|---|
| Figures | 5,721 |
| Traditions | 560 |
| Domains | 5,212 |
| Powers | 7,877 |
| Items | 3,148 |
| Mapped territories | 241 |

Each figure carries parentage and children, domains, powers, epithets in their
original script, relations to other figures, cult practice where it is attested
(sites, festivals, priesthoods, offerings), and the primary and secondary
sources the entry rests on.

## What makes it different

- **Everything is cited.** Entries name the primary text or scholarly source
  behind them, and `test/content.test.cjs` fails the build on an uncited claim,
  an invented native term, or a coined name. The corpus is regenerated from
  committed research transcripts in `data-sources/`, and CI proves it is
  byte-exact reproducible from them — the data cannot drift from its sources by
  hand-editing.
- **Public-domain images only.** Portraits are Public Domain / PD-art / CC0 or
  they are not shipped, gated on machine-readable rights flags from Wikimedia
  Commons and four museum open-access APIs — never a human-written caption.
  Files are self-hosted, never hotlinked. See
  [`docs/image-licensing.md`](docs/image-licensing.md).
- **First load doesn't scale with the corpus.** The site is a static, no-server
  React SPA on GitHub Pages, and the corpus blob is off the critical path:
  projection tiers mean adding figures doesn't slow the first paint. Design
  record and measurements in
  [`docs/load-time-architecture.md`](docs/load-time-architecture.md).
- **Readable without JavaScript.** `/registry/` is a full static mirror — a
  master index, a hub page per tradition, and one cited page per figure — so
  crawlers, link unfurlers and LLMs reading the URL get the real content rather
  than a boot shell. There is an `/llms.txt` front door and a per-tradition
  Markdown dump beside it.
- **Queryable by an agent.** An MCP connector (`mcp/`) exposes the corpus as
  tools, so a model can ask real questions of it instead of scraping pages.

## Quick start

### Development (in-browser Babel)

Serve the repository root with any static file server and open it in a browser:

```bash
python3 -m http.server 8000   # or: npm run dev
```

Then visit <http://localhost:8000/>. `index.html` loads React, ReactDOM, d3, and
topojson from a CDN and transforms `app/*.jsx` in the browser via Babel standalone.

### Single-file build (pre-transformed)

For a self-contained HTML file you can open from disk, host as a static asset, or
drop into a Claude.ai artifact:

```bash
npm install        # installs @babel/standalone (pinned; lockfile committed)
python3 build.py   # or: npm run build
```

This pre-transforms every `app/*.jsx` through Babel (no in-browser transformer),
inlines `app/data.js` and `app/styles.css`, and writes
`dist/pantheon-registry.html`.

## Deployment (GitHub Pages)

`.github/workflows/deploy-pages.yml` runs the test suite, verifies byte-exact
regeneration, rebuilds both distributions (`python3 build.py` and
`python3 build.py --pages`), and deploys them through GitHub's native Pages
pipeline (`actions/deploy-pages`) on every push to `main` (or on demand via the
**Actions** tab → *Run workflow*) at
`https://<owner>.github.io/PantheonRepository/`. The deployed site serves:

- **`/`** — the multi-file shell (production React, SRI-pinned CDN libraries):
  a small page that mounts immediately and fetches the corpus asynchronously
  from the content-hashed data files under **`/data/`**. If those files are
  missing or fail to load, the shell fails loudly in the boot overlay rather
  than rendering an empty registry.
- **`/registry/`** — a crawlable, JavaScript-free static mirror of the corpus
  (`scripts/build-static.cjs`): a master index, a hub page per tradition under
  **`/registry/tradition/`**, and one cited page per figure, with
  **`/sitemap.xml`** and **`/robots.txt`**. The app is a client-rendered
  SPA, so a fetch of `/` — by a search crawler, a link unfurler, or an LLM
  reading the URL — would otherwise see only the boot shell; the shell's
  `<noscript>` routes those clients to `/registry/`, where the full content is
  readable without executing any JavaScript.
- **`/artifact.html`** — the single-file artifact, unchanged from
  `dist/pantheon-registry.html`, kept as a first-class downloadable secondary
  distribution (works from `file://`, srcdoc iframes, or any static host).

One version-skew caveat: Pages caches with `max-age=600`, and a stale shell
references hashed data files from the previous deploy, so a mid-rollout visitor
can hard-fail until their cache expires (the boot overlay shows the error
loudly).

One-time setup: enable Pages under **Settings → Pages → Build and deployment →
Source: GitHub Actions**, and if the `github-pages` environment has a
deployment-branches rule, allow `main` (Settings → Environments → github-pages).
After that, deploys are automatic.

## Tests

```bash
npm install   # installs the test-only devDependencies (jsdom + the React/d3/
              # topojson builds the app otherwise loads from a CDN)
npm test      # builds the gitignored test fixtures (python3 build.py --pages),
              # then node --test --test-force-exit test/*.test.cjs — fixtures
              # are built up front because test files run concurrently and
              # must never rewrite the shared dist/ trees mid-run
```

- `test/seed.test.cjs` runs `app/data.js` in an isolated VM and checks the seeded
  corpus (the full 5,721-figure corpus, exactly 241 territories, the `window.__PR`
  surface, no hard-schema violations, and ceilings on warn-level integrity drift).
- `test/render.test.cjs` boots the whole app in jsdom and exercises the views,
  keyboard navigation (j/k/Enter/Escape, ⌘K and Ctrl+K), the detail panel, the
  Atlas (against a committed basemap fixture), and the localStorage-quota
  fallback — including a regression test for the Lifecycle column layout.
- `test/content.test.cjs` runs content-truth checks (citation completeness,
  coinage ban, native-term scrubbing) across the full corpus.
- `test/dogfood.test.cjs` walks a deterministic figure sample through the Detail
  panel the way the human dogfood pass does.
- `test/storage.test.cjs` covers the localStorage contract: user edits win over
  the seed, corrupted/empty values fall back to the in-memory corpus.
- `test/manifest.test.cjs` asserts `index.html`, `build.py`, and the test
  harness load the same `app/*.jsx` files in the same order.
- `test/scenarios.test.cjs` boots the app and walks deterministic end-to-end UI
  scenarios (browse, search, facets, detail panel, keyboard navigation).
- `test/tiers.test.cjs` validates the lazily-loadable tiered-data export
  (`dist/data/`) reproduces the live corpus.

`.github/workflows/ci.yml` runs the suite and byte-exact regeneration on every
pull request and on pushes to `main` and `claude/**` branches.

## Project layout

```
index.html                    Dev entry point (in-browser Babel)
build.py                      Builds the single-file dist artifact
package.json                  Scripts + pinned @babel/standalone dependency
DOGFOOD.md                    Generated human sign-off checklist (seeded sample)
app/
  data.js                     Pantheon constants, seed builders, helpers (plain JS)
  state.jsx                   Data, filter, and selection hooks; type-tier metadata
  Shell.jsx                   Top bar, left rail, main column; owns keyboard nav
  Browse.jsx                  Dense table view (type tier / tradition / era)
  Graph.jsx                   Cross-tradition relation graph (d3)
  Atlas.jsx                   Natural Earth world map of tradition territories
  Items.jsx                   Material-culture registry: index + item detail
  Powers.jsx                  Faculties (powers) registry: index + power detail
  Domains.jsx                 Domains registry: index + domain detail
  Detail.jsx                  Slide-over entry detail panel
  Lineage.jsx                 Per-entry parentage tree (ancestors / descendants)
  Lifecycle.jsx               Era-scaled timeline of a figure's status transitions
  CommandPalette.jsx          ⌘K fuzzy figure jump
  main.jsx                    Entry point; mounts the Shell with an error boundary
  styles.css                  Application styles
data-sources/
  transcripts/                Committed research transcripts the generators consume
  existing-ids.json           Base-id snapshot the new-figures generator dedups against
scripts/
  gen-new-figures.cjs         Regenerates the NEW_FIGURES block from transcripts
  gen-powers-terms.cjs        Regenerates native power/domain terms
  gen-powers-items.cjs        Regenerates the POWERS/ITEMS blocks
  harvest-sources.cjs         One-shot: harvested transcripts out of a live session
  dogfood-sample.cjs          Regenerates DOGFOOD.md (seeded, deterministic)
  verify-regen.sh             CI gate: byte-exact regeneration from data-sources/
test/
  *.test.cjs                  The suite described above
  helpers/boot.cjs            jsdom boot harness (shared by render/dogfood tests)
  fixtures/countries-110m.json  Minimal topojson basemap for Atlas tests
dist/
  pantheon-registry.html      Generated single-file artifact (run build.py)
```

## How it works

- **Data layer.** `app/data.js` is plain, IIFE-wrapped JavaScript (no JSX, no
  React). On load it builds the seed data, exposes it on `window.__PR`, and
  *attempts* to persist it to `localStorage` (`pantheon_registry_v9` for figures,
  `pantheon_atlas_v3` for territories). The figure corpus is seeded only when
  storage is empty (preserving edits where a write can succeed at all); the
  atlas — pure seed data with no editing UI — is overwritten on every load so
  returning visitors can never be pinned to a stale territory set. The
  corpus now exceeds the ~5 MB localStorage quota in every mainstream browser, so
  the figure write is refused and the UI runs from the in-memory seed on
  `window.__PR` — meaning **edits to the figure corpus do not survive a reload at
  current corpus size**. The small atlas seed does persist. The loaders prefer
  localStorage when a value exists (so a future smaller corpus, or an
  environment with a raised quota, keeps user edits), and fall back to the
  in-memory seed otherwise.
- **Views.** Figures are organized along three preattentive axes — **type tier**
  (deity → demigod → quartigod → scion → mortal), **tradition**, and **era** —
  and explored through Browse, Graph, Atlas, Items, Powers, Domains, and per-figure Lineage /
  Lifecycle panels.
- **No framework tooling.** React 18 and friends come from `cdnjs.cloudflare.com`,
  every tag pinned with a Subresource Integrity hash. Development transforms JSX
  in the browser; the build pre-transforms it so the shipped artifact carries no
  Babel runtime.

## Requirements

- A modern browser.
- Python 3 (for the dev server and the build script).
- Node.js + npm (for `build.py`'s Babel transform, `npm test`, and the
  generator scripts).

## License

The **source code** is licensed under the [MIT License](LICENSE).

The **figure data** — the seeded corpus in `app/data.js`, the cited research in
`data-sources/`, and the exported data tiers in `dist/data/` — is licensed under
[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/):
reuse it freely with attribution. Each figure additionally cites its underlying
primary and secondary scholarly sources.
