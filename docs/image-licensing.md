# Image licensing — hard policy

Status: **binding rule.** Applies to every image ingested into this project
from any source, forever, unless the owner changes it in writing here.

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

1. **Commons proper only.** Ingest only files whose repository is
   `commons.wikimedia.org`. Never a local Wikipedia upload (`en.wikipedia.org`
   etc.) — those are frequently non-free fair-use and are not reusable.
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
