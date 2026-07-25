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
Cold-load stability (no row resizing) is guarded by `scripts/verify-coldload.cjs`.
