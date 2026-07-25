# Image pipeline — design record & operating manual

Status: **the production design**, chosen by an adversarial architecture debate
(2026-07-23: four advocated designs — full-auto sweep, human-review-first,
structured-data-first, automated-verification — two critics, one judge;
unanimous synthesis). Licensing policy itself lives in
[`image-licensing.md`](image-licensing.md) and is not restated here: PD /
PD-old / PD-art / CC0 only, approved sources only (Commons primary + the
museum open-access list, owner-amended 2026-07-24), self-host, never hotlink.

## The two verdicts that shaped it

1. **Throughput was never the problem.** Measured: ~3s per image inside a 25s
   CI job. A full-corpus sweep is an afternoon of unattended CI. The binding
   limit is *what exists on Commons under our licenses*: roughly a quarter to
   a third of entities (major pantheons + anything depicted in old 2D art) can
   ever get a clean image — ~2,000–2,600 of ~8,900. For the rest, **"no
   image" is the permanently correct outcome** (photos of statues carry the
   photographer's copyright; obscure traditions have no imagery at all), and
   the UI renders those pages without an image box by design.

2. **The failure that would actually kill scaling is wrong images.** The
   proof: the top CC0 text-search hit for Zeus was a photo of temple ruins.
   So identification does not guess from text — it **joins on Wikimedia's own
   curated entity data**, and *only curated identification auto-ships*.
   Wrong image ≫ no image, encoded structurally.

## Architecture: tiered shipping

```
map ──► qid-map.json          figure → Wikidata QID (wbsearchentities;
        (auto)                 name match + myth-description scoring;
                               intra-corpus name-collision detection —
                               a name under >1 tradition is never confident)

harvest ─► TIER A (auto-ships) confident QID → P18 canonical image
           license gate → file sanity check (no SVG/glyph, no scenery
           title, no panorama) → WebP → commit. P31 negative classes
           (film/asteroid/genus/…) demote a bad mapping instead.

fallback ─► TIER B (review)    everything less certain, from EVERY source,
            deepest first: the QID's P18 lead, its Commons category (P373 —
            the richest, human-curated set of images OF the figure), P180
            "depicts", and text search over primary AND alternate names.
            Deduped, ranked, top 3 → image-review.json → contact sheet.
            (map enriches each mapping with its P18 + P373 so fallback can use
            them; `image-run.json {"rescan":true}` re-runs this deep pass over
            previously-empty figures.)

native ──► NOT a stage but a MODIFIER on map + fallback (added 2026-07-24):
           `image-run.json {"native":true}` makes both search each figure's own
           script/language from `name.transliterations` (present on 97.5% of
           the corpus) — lib/native-names.cjs turns Ἀκεσώ→el, 하백→ko,
           Батраз→ru, Perkūnas→lt into (term, language) queries. Wikidata
           labels are multilingual and Commons descriptions are written in the
           uploading institution's language, so English-only search structurally
           misses entities and files that exist. 2,017 imageless figures have
           native terms; 1,099 in a non-Latin script. Compound values
           ("Сварогъ Svarogŭ") are split per script run, parenthetical reading
           glosses stripped, and scholarly Egyptological/Assyriological
           transliteration ("sꜣt-ı͗mn") excluded — it is not a language anyone
           catalogues in. Native matches count toward entity identification, but
           a sub-3-character native match (dense CJK namespace) can never reach
           high confidence.

sitelinks ─► REVIEW (added 2026-07-24; DEMOTED from Tier A 2026-07-25) — the
wikisearch  ~300 language Wikipedias. `sitelinks` walks each mapped QID's
            editor-made entity→article links; `wikisearch` finds the article
            directly, in the figure's own language, for figures Wikidata entity
            search never resolved (and repairs the mapping from the article's
            own wikibase_item). Both read the article's designated lead image.

articleimages ─► REVIEW (added 2026-07-25) — the images inside the BODY of
            those same articles (`prop=images`). `pageimages` returns only the
            designated lead, and the short articles in the smaller wikis —
            exactly the figures still missing — carry no infobox at all, so
            their one engraving sits in the body where no path could see it.
            Project logos, maintenance boxes and UI glyphs are dropped before
            the license gate (lib/wiki-images.cjs `isChromeFile`).

museums ─► REVIEW-ONLY (added 2026-07-24, owner-approved) — the approved
           museum open-access APIs (Met / Cleveland / AIC / Smithsonian-with-
           key; lib/museum-adapters.cjs) searched for every imageless figure.
           Per-source FAIL-CLOSED CC0 gates; name-hit required; natural-
           history/taxa namespaces rejected; candidates carry culture/object-
           type/date metadata onto the sheet. Museum picks travel as
           "src:id" refs (met:436535) through the same approved→ingest path,
           with the gate re-run at ingest. Own state: museum-scan.json
           (180d TTL). Trigger: image-run.json {"museums":true}.

owner ───► approves on the sheet (keys 1–6/x) → exports
           image-approved.json → push → `approved` ingests
           (license gate RE-RUNS on every file; picks become pins)
```

The license gate (`scripts/lib/commons-license.cjs`) runs at ingest time on
**every** file regardless of discovery path — no path is exempt. Every shipped
image archives its extmetadata + a verification record (tier, method, QID,
signals) under `assets/images/figures/_meta/` so a bad batch is
mass-revertible by cause.

### The mapping is the weakest link (measured 2026-07-25)

Everything entity-derived — P18, the Commons category, P180 "depicts", the
Wikipedia sitelink lead, the article body — inherits the mapped entity's
identity, so **one wrong entity makes all of them wrong at once**. An audit of
all 4,363 mappings (each of the 595 riskiest rejections re-checked by an
independent appeal, which upheld 593) found **45% of the table wrong**:

| what the entity actually was | count |
|---|---:|
| place (village, river, station, airport, country) | 773 |
| real person (politician, athlete, actress, researcher) | 274 |
| modern work (film, game, article, software) | 217 |
| concept (day of the week, kinship term, planet) | 212 |
| other / organization / species / language / ethnic group | 403 |
| a **different deity** | 98 |

Some were absurd — `sua`→*the United States*, `ae`→*the United Arab Emirates*,
`tiw`→*the planet Mars*, `aitar`→*Sunday*. The cause was `pickQid`'s final
fallthrough: when no candidate had a myth-flavored description it returned the
first name match **anyway**, as `ambiguous`. That bucket measured **82% wrong**.
`WRONG_DESC` caught none of it, because it runs as a candidate filter — every
mapping in the table had already passed it.

Three changes, each measured against the audit's judgements:

1. **`WRONG_KIND_DESC`** — a second wrong-kind gate covering what the audit
   actually found. Applied only when the description carries no myth signal
   and no pre-modern era marker, so "river god", "goddess of the city of Uruk"
   and "6th-century Arab chieftain" all survive. **96.6% precision**, catching
   51% of bad mappings, at 35 false positives corpus-wide — and a false
   positive falls back to the text-search review path, not to nothing.
2. **A new `weak` confidence tier** for a mapping whose entity has a non-empty
   description with no myth signal. It is a real mapping but may not seed any
   entity-derived candidate (`usableEntity()`). An *empty* description is
   absence of evidence, not evidence of absence — Wikidata simply has none in
   that language — and measured 18% wrong against 82%, so it stays `ambiguous`
   and usable.
3. **Text search always runs regardless**, since it depends on the figure's own
   names rather than the entity. A rejected or weak mapping never leaves a
   figure with nothing.

Result: `high` 1,235 · `ambiguous` 791 · `weak` 361 · `rejected` 1,976.

### Why only P18 auto-ships (measured 2026-07-25)

The Wikipedia paths originally auto-shipped, on the reasoning that a sitelink is
curated identification of the same class as P18. An audit of every auto-shipped
image — each finding independently confirmed by a second reviewer before
removal — measured otherwise:

| path | wrong subject | shipped | rate |
|------|--------------:|--------:|-----:|
| `p18` | 0 | 328 | **0%** |
| `sitelink` | 231 | 382 | **60%** |
| `wikisearch` | 17 | 38 | **45%** |
| reviewed (Tier B) | 0 | 536 | **0%** |

The asymmetry is structural, not incidental. A P18 claim states *"this image
depicts this entity"* — an assertion about the image. A sitelink states *"this
article is about this entity"*, and the lead image is then curated for the
**article**, one inference removed. So a sitelink lead is only as right as the
entity mapping that reached it, and the mapping is the weakest link in the
chain: `abkhaz_dzhadzha` was mapped to *Q920233 "Chaga people, ethnic group in
Kenya and Tanzania"*, `aymara_amaru` to a commune in Buzău County, Romania.
Each mis-mapping became a published factual error at the top of a figure's
page. P18 is immune because an entity carrying a curated P18 claim is a
well-described entity that the mapper matches correctly in the first place.

248 images were purged and blocklisted; the 172 that survived the audit were
re-tiered **A → B**, since what justifies them is the review, not the path.
`test/image-pipeline.test.cjs` now pins the invariant: **Tier A is reachable
only by `p18`.** Every other path — sitelinks, wikisearch, articleimages,
proposals, museums, text fallback — earns its place through review, where the
measured error rate is 0%.

## Parallelism — fan out, don't monolith

The sweep does NOT run as one long job. `image-sweep.yml` shards the corpus by
id (same bucket scheme as the detail shards) and runs a **matrix of shard
jobs** — each maps → harvests → falls back over its own disjoint slice —
capped at `max-parallel: 6` so we stay polite to the Wikimedia APIs. Each shard
uploads only its slice's outputs (+ the images it newly fetched); a single
**collector** job merges the disjoint results (`ingest-images.cjs merge`,
range-restricted per bucket so additions, updates, and deletions are all
correct) and makes **one commit**. No shard ever pushes, so there's no
push race, and a shard that fails only defers its slice to the next wave —
the rest still land. 12 shards × ~285 figures ≈ a ~15–25 min wall-clock wave
instead of a 4-hour monolith. The light per-figure paths (`auto`, `approved`,
`fetch`, `check`) stay in `ingest-images.yml` — single-committer, no fan-out.

## Cadence — self-scheduling retries

"No result" outcomes are recorded with timestamps in `image-scan-state.json`
and carry TTLs: `no-qid` retries after **90 days**, `no-image` after **365
days**; `reviewed-none` (the owner said no) is permanent. The monthly cron
fires a sweep wave; stale misses age past their TTL and get retried — that
**is** the quarterly map refresh and yearly re-scan, with no extra scheduling
machinery. Every mode skips ids already resolved in committed outputs, so
waves only move forward. (`delta` — prune → map → harvest → fallback in one
process — remains for local/serial runs; the CI sweep parallelizes the same
work across shards.)

## Operating manual (the owner's cheat sheet)

| I want to… | Do this |
|---|---|
| Image one specific figure | Add its id to `data-sources/image-request.json`, push. Tier-A ships it if curated data allows; otherwise its candidates land on the review sheet. |
| Run the next sweep wave | Bump `data-sources/image-run.json` (e.g. `{"shards":12,"run":2}`), push — fans out across `shards` parallel jobs, one merged commit. |
| Review pending candidates | Pull, open `data-sources/image-review.html` in a browser. Keys: **1–6** approve, **x** none, **j/k** move, **e** export. Save the export as `data-sources/image-approved.json`, commit, push. |
| Reject a shipped image | Add its `File:` title (Commons) or its `src:id` ref (museum picks, e.g. `met:436535` — shown in the manifest entry's `ref`) under the figure's id in `data-sources/image-blocklist.json`, push any trigger file (or wait for the cron). It's pruned everywhere and never re-picked. |
| Pin an exact image | Put `"figure_id": "File:…"` in `data-sources/image-sources.json` and run `fetch` (dispatch). Pins always win. |
| Audit licenses now | Actions tab → Ingest Commons images → `check`. |

The contact sheet is an internal review tool — its thumbnails reference
Commons directly, which is fine there; the **product** never hotlinks.

## File inventory

| File | Written by | Meaning |
|---|---|---|
| `data-sources/qid-map.json` | `map` | figure → Wikidata QID + confidence |
| `data-sources/images.json` | shipping paths | the manifest that ships to detail shards |
| `data-sources/image-sources.json` | shipping paths + owner | id → `File:` ledger of every shipped/pinned choice |
| `data-sources/image-review.json` / `.html` | `fallback`/`sheet` | the Tier-B queue + its contact sheet |
| `data-sources/image-approved.json` | the owner (sheet export) | decisions to ingest; consumed on success |
| `data-sources/image-blocklist.json` | the owner | banned titles per figure (`_global` for all) |
| `data-sources/image-scan-state.json` | all modes | timestamped no-result outcomes (drives TTL retries) |
| `data-sources/image-request.json` | the owner | ids for `auto` |
| `data-sources/image-run.json` | the owner | push-trigger for the parallel sweep: `{"shards": N, "run": k, "rescan": bool, "museums": bool, "native": bool}` |
| `data-sources/museum-scan.json` | `museums` | timestamped museum-search coverage (180d TTL) |
| `assets/images/figures/` | shipping paths | self-hosted WebP portraits + `_meta/` provenance |

## Invariants (CI-enforced or structural)

- License gate on every file, at ingest, plus the monthly drift audit.
- Images attach to lazy **detail shards only** — first-load bytes are
  invariant at any corpus size (`test/scale-gates.test.cjs`).
- Only curated identification (P18) or the owner's own click ships an image;
  search hits never auto-ship.
- Blocklist beats everything, including stale pins; one line reverts any
  mistake.
- Items (`Mjǫllnir`, …) are a planned extension: the pipeline operates on the
  figure corpus today; the item registry needs its own infobox UI first.
