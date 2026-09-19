# Connected tradition audit and implementation status

Baseline: main `4ca02f7e3776fce6508db148fd276203bf7f9b96`, including merged
PRs #139 and #140. PR #140's head was
`12c518fdf390cd7f4367386e3f82c8e7a46cb9b7`. Its 80 records and relationships
are retained; this work extends the same transcript and supplement pipeline.

## Coverage ledger

`data-sources/audits/connected-counterparts/scope.json` defines the inclusion
boundary and review decisions. `ledger.json` is its deterministic reconciliation
against the generated corpus. Run `node scripts/audit-counterparts.cjs` after
any corpus change. A test rejects a stale ledger.

The inventory follows both directions of counterpart, identification, syncretic,
cult-form, aspect and family edges, including explicit name targets and account
parents. Repeated relation kinds to one target do not create extra records.
Every discovered record has all 16 information categories, names, outgoing
relationships, sources and accounts accounted for. Descriptive discoveries not
yet represented by an identifier are listed separately. This is a structural
inventory, **not a completed historical review**. `present` does not mean
complete; an `added` claim does not certify the rest of its category.

Review status vocabulary: `added`, `already-complete`, `not-applicable`,
`not-attested-in-reviewed-sources`, `disputed`, and `awaiting-research`.
Negative findings require a stated source boundary. Unreviewed material remains
`awaiting-research`; it must not be relabeled as unattested to close the audit.

## Implemented claims

- Eight new records from Apollodorus 3.12.6, Hesiod's river catalogue, and Ovid's
  Alcmena narrative: Asopus, Metope, Ladon (river), Aegina, Pero (Asopus account),
  Ismenus and Pelagon (sons of Asopus), and Roman Alcmena. Pero is distinct from
  the existing daughter of Neleus. These additions are source-bounded, not fully
  enriched biographies.
- Explicit counterpart name targets distinguish aliases from independent
  portrayals, including Heracles/Hercle/Hercules, Apollo in two traditions,
  Alcmene/Alcmena, Ammon, Zeus-Oromasdes, Aramazd and Beelsamen's Greek gloss.
- Resolved exact external names retain original relationship citations; missing
  symmetric reciprocal links were added where the existing type requires them.
- Cited selectable parentage accounts preserve three accounts for Asopus,
  Hyginus and Ovid's accounts for Mars, full Apollodoran parentage for Aeacus,
  and the uncreated and Zurvanite accounts discussed by Boyce for Ahura Mazda.
- Ovid's Roman Hercules narrative supplies powers, objects and apotheosis;
  the Orphic hymn supplies its own ritual and deliverance claims. No identity
  edge imports the other portrayal's parents or possessions.
- Public descriptions replacing implementation commentary are source-cited.

Individual source passages and URLs are attached to authored claims in the
transcripts, enrichment file and relationship supplement, rather than using
this document as a blanket citation. Consult those files for precise boundaries.

## Explicitly unfinished research

The ledger is marked `complete: false`. It includes the starting inventory's
Egyptian, Phoenician, Canaanite, Roman, Lydian, Mesopotamian, Thracian, Scythian,
Etruscan, Luwian, Zoroastrian, Orphic, Messapian and Commagene contexts, with
connected families. Existing rich records still require claim-by-claim review.

Retrieval failed for ORACC's Marduk and Nabu pages (including the correctly
capitalized Marduk path), the attempted Taranto Zis Batas page, and the full
Nemrud cult inscription. The accessible Iranica discussion supports selected
Commagene links but does not substitute for reading the complete inscription.
These failures and affected claims are recorded in `sourceBlockers`.

Other work is **awaiting research**, not access-blocked: the discovered Aeacid
intermediates and alternative Telamon branch, Plouto's identity, the Etruscan
Alchumena reference, Mesopotamian intermediate family and syncretic figures,
and Philo's independent Phoenician genealogical portrayals. The ledger retains
all unresolved external references and every unreviewed category. Neither the
record increase nor software verification establishes full task completion.

## Verification boundaries

Neutral synthetic fixtures exercise exact target validation, shared names,
aliases, atomic rejection, independent accounts, empty parentage, conflicting
assertions, citation preservation and identifier renaming. Data-driven tests
reconcile authored links/accounts and the ledger against the generated corpus.
The existing browser gate now exercises every authored resolved name link by
keyboard and every authored account selection. Its original bounded-rendering
and cold-load assertions remain intact. Local Chromium launch is denied by
this environment's socket restriction; CI must provide the real browser result.

All four generators and both required committed artifacts remain part of the
byte-exact regeneration gate. No gate has been weakened.
