# Image licensing — hard policy

Status: **binding rule.** Applies to every image ingested into this project
from any source, forever, unless the owner changes it in writing here.
Amended 2026-07-24 with the owner's sign-off: sourcing widened from
Commons-only to the **approved source list** below (same license standard,
machine-verified per source).

## The only licenses we accept

**Public Domain / PD-old / PD-art / CC0 — and nothing else.**

We deliberately do **not** use CC BY, CC BY-SA, GFDL, or any other
attribution- or share-alike-encumbered license, even though they are free.
The point is to never carry a per-image legal obligation (mandatory credit
lines, share-alike, license-notice retention) into the product. PD/CC0 images
carry **no copyright conditions**: we may copy, crop, recolor, embed, and use
them commercially with nothing owed.

Rationale: this site's subject is deities, mythology, and historical religious
art — which is overwhelmingly old, public-domain artwork already. Restricting
to PD/CC0 costs us very little coverage and removes the entire compliance
"rat's nest" of attribution-required reuse.

## Sourcing rules (all mandatory)

1. **Approved sources only — each with a machine-readable rights flag.**
   A source qualifies only if every file's PD/CC0 status is a structured API
   field our code verifies at ingest (never a human-written caption). The
   approved list (owner-amended 2026-07-24):

   | Source | Rights flag (exact, fail-closed) |
   |---|---|
   | `commons.wikimedia.org` (primary) | `extmetadata` license fields, rule 2 below |
   | Met Museum Open Access | `isPublicDomain === true` |
   | Cleveland Museum of Art | `share_license_status === "CC0"` |
   | Art Institute of Chicago | `is_public_domain === true` |
   | Smithsonian Open Access (`SI_API_KEY`) | `metadata_usage.access === "CC0"` |

   Gates FAIL CLOSED: a missing or renamed flag rejects, so upstream schema
   drift can never ship an image. Museum candidates are **review-only** —
   they reach the product exclusively through the owner's approval on the
   contact sheet, and the source's gate re-runs at ingest time
   (`scripts/lib/museum-adapters.cjs`). Never a local Wikipedia upload
   (`en.wikipedia.org` etc.) — those are frequently non-free fair-use and are
   not reusable. Why museums: their open-access programs release their OWN
   photography of their OWN 3D objects (masks, figures, ritual items) as CC0,
   dissolving the photographer-copyright problem that blocks Commons photos
   of sculpture — precisely the traditions with the least coverage.
2. **License gate — accept only these machine-readable `License` keys** from
   the Commons API `extmetadata`:
   - `pd`, `pd-old`, `pd-old-*` (e.g. `pd-old-100`, `pd-old-70`), `pd-art`,
     `pd-us`, `pd-self`, and other `pd-*` variants,
   - `cc-zero`.
   Equivalently: accept when `extmetadata.Copyrighted.value === "False"` **or**
   `License` starts with `pd`/is `cc-zero`. **Reject everything else** — any
   `cc-by*`, `cc-by-sa*`, `gfdl`, `nc`, `nd`, "fair use", "non-free", or a
   missing/ambiguous license. When in doubt, reject.
3. **Non-empty `Restrictions` → reject (or hold for manual review).** A
   copyright-clean license does **not** clear trademark, personality/publicity
   rights, or freedom-of-panorama. For a mythology site these are rare; never
   auto-publish one.
4. **Cross-border PD caveat.** "PD in the US" ≠ PD everywhere. Prefer
   `pd-old-100` / `pd-old` (author long dead) over US-only tags. This is a
   judgment flag, not a hard gate, but bias toward the safest tag.
5. **Self-host, never hotlink.** Download an optimized copy to our own origin;
   do not point `<img src>` at `upload.wikimedia.org`. (See
   `docs/load-time-architecture.md` — self-hosting is same-origin + CDN-cached,
   so it is faster and reliable, and hotlinking-at-scale violates Wikimedia
   etiquette.)
6. **Audit trail.** Store the full `extmetadata` block (license state at time
   of ingest) alongside each image, so the license basis is provable later.

## Attribution

Legally **not required** for PD/CC0. We still render a small courtesy credit
(author + "via Wikimedia Commons" + link to the file page) where it fits —
good manners and helps readers find the source — but nothing about the product
depends on it, and its absence is never a compliance problem.

## API note

One `action=query&prop=imageinfo&iiprop=url|extmetadata` call per file returns
the image URL and the machine-readable license fields; gate on `License` /
`Copyrighted` per rule 2. A descriptive, contactable `User-Agent` (or
`Api-User-Agent` header from browser JS) is mandatory or the API returns 403.

## Implementation

The production ingest architecture (tiered auto-ship vs. human review, Wikidata-
joined identification, cadences, and the operating manual) is specified in
[`image-pipeline.md`](image-pipeline.md). The rules above are enforced in code,
in one place each:

- **The gate** — `scripts/lib/commons-license.cjs` `classify(extmetadata)` is the
  single implementation of rules 2–3 (accept PD/CC0, reject everything else,
  veto on non-empty `Restrictions`). Unit-tested in
  `test/commons-license.test.cjs`.
- **The pipeline** — `scripts/ingest-images.cjs` runs in CI (not the build
  sandbox, which can't reach Commons): `discover` proposes PD/CC0 candidates for
  human review → `data-sources/image-candidates.json`; a human copies chosen
  `File:…` titles into `data-sources/image-sources.json`; `fetch` re-verifies the
  license, downloads a Commons server-sized thumbnail (`iiurlwidth`, so no local
  resize), optimizes to WebP, self-hosts under `assets/images/figures/`, archives
  the `extmetadata` for the audit trail (rule 6), and writes the manifest
  `data-sources/images.json`; `check` re-verifies committed files still pass.
  Driven by `.github/workflows/ingest-images.yml`.
- **Where it ships** — the manifest merges onto the per-figure **detail shards
  only** (`scripts/build-tiers.cjs`), never the skinny first-load index, so a
  portrait per figure costs nothing at first load (`test/scale-gates.test.cjs`
  holds this). The image renders as a top-right infobox in the app
  (`app/Detail.jsx` `LeadImage`) and on the static pages
  (`scripts/lib/lead-figure.cjs`), each with the courtesy credit from the
  Attribution section, self-hosted (rule 5) and `width`/`height`-reserved so it
  never shifts the layout on load.
