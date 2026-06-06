# Pantheon Registry

A multi-tradition registry of mythological and historical figures — **601 entries
across 50 traditions**, presented as a single-page app you can browse, search,
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
npm install        # installs @babel/standalone
python3 build.py   # or: npm run build
```

This pre-transforms every `app/*.jsx` through Babel (no in-browser transformer),
inlines `app/data.js` and `app/styles.css`, and writes
`dist/pantheon-registry.html`.

## Deployment (GitHub Pages)

`.github/workflows/deploy-pages.yml` rebuilds the artifact and deploys it through
GitHub's native Pages pipeline (`actions/deploy-pages`) on every push to the trunk
(or on demand via the **Actions** tab → *Run workflow*). The first run enables Pages
automatically (`actions/configure-pages` with `enablement: true`) and creates a
`github-pages` Deployment with a clickable URL, serving the production build
(production React, SRI-pinned CDN libraries) at
`https://<owner>.github.io/PantheonRepository/`.

## Project layout

```
index.html                    Dev entry point (in-browser Babel)
build.py                      Builds the single-file dist artifact
package.json                  Scripts + @babel/standalone dependency
app/
  data.js                     Pantheon constants, seed builders, helpers (plain JS)
  state.jsx                   Data, filter, and selection hooks; type-tier metadata
  Shell.jsx                   Top bar, left rail, main column; owns keyboard nav
  Browse.jsx                  Dense table view (type tier / tradition / era)
  Graph.jsx                   Cross-tradition relation graph (d3)
  Atlas.jsx                   Plate-carrée world map of tradition territories
  Detail.jsx                  Slide-over entry detail panel
  Lineage.jsx                 Per-entry parentage tree (ancestors / descendants)
  Lifecycle.jsx               Era-scaled timeline of a figure's status transitions
  CommandPalette.jsx          ⌘K fuzzy figure jump
  main.jsx                    Entry point; mounts the Shell with an error boundary
  styles.css                  Application styles
dist/
  pantheon-registry.html      Generated single-file artifact (run build.py)
```

## How it works

- **Data layer.** `app/data.js` is plain, IIFE-wrapped JavaScript (no JSX, no
  React). On load it builds the seed data and writes it to `localStorage`
  (`pantheon_registry_v8` for figures, `pantheon_atlas_v2` for territories),
  seeding only when storage is empty so user edits are preserved. The UI reads
  from the same keys, so the seed is shared across views.
- **Views.** Figures are organized along three preattentive axes — **type tier**
  (deity → demigod → quartigod → scion → mortal), **tradition**, and **era** —
  and explored through Browse, Graph, Atlas, and per-figure Lineage / Lifecycle
  panels.
- **No framework tooling.** React 18 and friends come from `cdnjs.cloudflare.com`.
  Development transforms JSX in the browser; the build pre-transforms it so the
  shipped artifact carries no Babel runtime.

## Requirements

- A modern browser.
- Python 3 (for the dev server and the build script).
- Node.js + npm (only for `build.py`, which uses `@babel/standalone`).
