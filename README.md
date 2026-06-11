# Pantheon Registry

A multi-tradition registry of mythological and historical figures — **1,851 entries
across 232 traditions**, presented as a single-page app you can browse, search,
graph, and map.

The whole thing runs from static files with React loaded over a CDN. There is no
bundler and no build step required for development; a Python script produces an
optional self-contained single-file artifact for distribution.

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
regeneration, rebuilds the artifact, and deploys it through GitHub's native Pages
pipeline (`actions/deploy-pages`) on every push to `main` (or on demand via the
**Actions** tab → *Run workflow*), serving the production build (production
React, SRI-pinned CDN libraries) at
`https://<owner>.github.io/PantheonRepository/`.

One-time setup: enable Pages under **Settings → Pages → Build and deployment →
Source: GitHub Actions**, and if the `github-pages` environment has a
deployment-branches rule, allow `main` (Settings → Environments → github-pages).
After that, deploys are automatic.

## Tests

```bash
npm install   # installs the test-only devDependencies (jsdom + the React/d3/
              # topojson builds the app otherwise loads from a CDN)
npm test      # node --test
```

- `test/seed.test.cjs` runs `app/data.js` in an isolated VM and checks the seeded
  corpus (≥1,850 figures, exactly 238 territories, the `window.__PR` surface,
  no hard-schema violations, and ceilings on warn-level integrity drift).
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
  and explored through Browse, Graph, Atlas, Items, and per-figure Lineage /
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
