# Pantheon Registry — working notes for Claude

## Image licensing — HARD RULE (owner-set)

Only ever ingest images that are **Public Domain / PD-old / PD-art / CC0**.
Never CC BY, CC BY-SA, GFDL, or any attribution/share-alike-encumbered license
— we do not carry per-image legal obligations into the product. Source from
`commons.wikimedia.org` only, gate on the Commons API license fields, and
self-host optimized copies (never hotlink). Full spec:
[`docs/image-licensing.md`](docs/image-licensing.md).

## Load-time architecture

The site is a static, no-server React SPA on GitHub Pages. First load stays
flat regardless of corpus size via projection tiers (the corpus blob is off
the fetch path); figure detail, atlas, graph, and registries each load their
own small tier lazily. Keep this property: nothing new may reintroduce a
single fetch or parse that scales with the whole corpus. Design record and
measured results: [`docs/load-time-architecture.md`](docs/load-time-architecture.md).
Cold-load stability (no row resizing) is guarded by `scripts/verify-coldload.cjs`.
