# Pantheon Registry — working notes for Claude

## Image licensing — HARD RULE (owner-set; amended 2026-07-24 with owner sign-off)

Only ever ingest images that are **Public Domain / PD-old / PD-art / CC0**.
Never CC BY, CC BY-SA, GFDL, or any attribution/share-alike-encumbered license
— we do not carry per-image legal obligations into the product. Source ONLY
from the **approved source list**, each gated on its own machine-readable
rights flag (never a human-written caption): `commons.wikimedia.org` (primary;
extmetadata license fields), plus the museum open-access APIs — Met
(`isPublicDomain`), Cleveland (`share_license_status: CC0`), Art Institute of
Chicago (`is_public_domain`), Smithsonian (`metadata_usage.access: CC0`,
requires the `SI_API_KEY` secret). Gates fail closed; museum hits are
review-only (never auto-ship); self-host optimized copies (never hotlink).
Full spec: [`docs/image-licensing.md`](docs/image-licensing.md). Ingest
architecture (tiered: curated Wikidata P18 auto-ships, search hits go to human
review — wrong image ≫ no image): [`docs/image-pipeline.md`](docs/image-pipeline.md).

## Load-time architecture

The site is a static, no-server React SPA on GitHub Pages. First load stays
flat regardless of corpus size via projection tiers (the corpus blob is off
the fetch path); figure detail, atlas, graph, and registries each load their
own small tier lazily. Keep this property: nothing new may reintroduce a
single fetch or parse that scales with the whole corpus. Design record and
measured results: [`docs/load-time-architecture.md`](docs/load-time-architecture.md).

The same rule applies to **rendering**, not just fetching. Browse mounts rows
on demand (a scroll sentinel; `app/Browse.jsx`) and must keep cold load bounded
at a screenful. Mounting the whole corpus does not merely cost layout time — it
pushes Lighthouse's Accessibility gatherer, one CDP evaluate under a hard 60 s
cap, into `PROTOCOL_TIMEOUT`, which errors 66 audits and nulls the
**Accessibility and SEO categories outright** (they render as `!`, not as a low
score). Measured before/after in
[`docs/load-performance-findings.md`](docs/load-performance-findings.md) §3.1.

`scripts/verify-coldload.cjs` guards four invariants — monotonic row growth, no
row resizing, bounded cold load, and that scrolling still reaches every row. It
runs in CI (`ci.yml`), needs a real browser, and exits non-zero on violation.

Third rule: **the Pages shell is not the place to put code.** Its UI sources
ship as one hashed `app-<hash>.js` beside it, `defer`red; inlining them put
149 KB gz on the first-paint critical path, because Lantern paints nothing until
the whole document lands. Keep `dist/site/index.html` small (~40 KB gz) and keep
that script deferred — dropping `defer` makes it render-blocking again. The
single-file artifact still inlines everything, and must: it opens over `file://`
with no siblings. Also note the boot overlay's lead paragraph is deliberately
the largest text on screen — it is what LCP times, since the app is
client-rendered and has no other large contentful element.
[`docs/load-performance-findings.md`](docs/load-performance-findings.md) §3.3.
