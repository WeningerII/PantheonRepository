# Brand icons

The owner's alpha-omega drawing. This is the icon set, everywhere — tab,
home screen, PWA install, and the static pages.

| File | Used for |
|---|---|
| `favicon.ico` (16/32/48) | browser tab, the size browsers actually draw |
| `favicon-96x96.png` | high-DPI tab / bookmark, and the offline artifact |
| `apple-touch-icon.png` (180) | iOS home screen |
| `icon-192.png`, `icon-512.png` | Android / PWA install, via `site.webmanifest` |

`scripts/build-static.cjs` copies these to the site root, generates the
manifest, and links them from every page it writes. `build.py` links the same
files in the Pages shell, and inlines `favicon-96x96.png` as a data: URI in the
single-file artifact — that one opens over `file://` with no siblings to fetch,
so a path-based icon would 404 there.

## One file from the generated set is deliberately unused

`favicon.svg` (5.9 MB) is **not vector**. It is a single `<image>` element
wrapping a base64-encoded 1593x1593 PNG — the same pixels as the PNGs beside
it, at roughly 400 times the size. Linking it would make every visitor
download 5.9 MB for the favicon and would look identical to `favicon-96x96.png`
at every size a browser draws, because it is a bitmap either way. If a true
vector version is ever exported (real `<path>` data, no `<image>`), it should
replace the .ico and .png links here — that would be strictly better.
