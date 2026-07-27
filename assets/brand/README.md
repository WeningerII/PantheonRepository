# Brand icons

The owner's alpha-omega drawing, exported at the sizes where its detail
survives. These are **large-only** on purpose.

| File | Used for |
|---|---|
| `apple-touch-icon.png` (180) | iOS home screen |
| `icon-192.png`, `icon-512.png` | Android / PWA install, via `site.webmanifest` |

`scripts/build-static.cjs` copies these to the site root and generates the
manifest; `enrichShell()` links them from the Pages shell.

**Not** the tab favicon. The drawing is a family of 20-60 offset strokes with
soft gradients over a paper ground; at 16px it resolves to a pale smudge, and
the baked-in light background becomes a white tile on a dark tab strip. The
tab icon is `assets/favicon.svg`, a redraw of the same form in six strokes.

Two files from the generated set were deliberately not used:

- `favicon.svg` (5.9 MB) is not vector — it is a single `<image>` element
  wrapping a base64 raster. Inlining it as a data: URI would add 5.9 MB to
  every page and it would still be a bitmap.
- `favicon.ico` renders the detailed art at 16/32/48, which is the smudge this
  set exists to avoid.
