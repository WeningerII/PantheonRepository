# Lane 25 — Hurrian audit

Owner: `lane-25-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,586 total figures, 14 of them Hurrian.

Corpus: **6,586 → 6,607 figures**. Hurrian **14 → 35**.
Census: 69 rows — **21 ADD, 9 ALIAS, 14 EXISTING, 8 CROSS-TRADITION SAME FIGURE,
5 REJECT, 12 BLOCKED**.

## The corpus held Kumarbi and not Anu

The Kumarbi cycle turns on one act. In the *Song of Emergence*, **Alalu** is king
in heaven; in the ninth year his cup-bearer **Anu** overthrows him; nine years
later Anu's own cup-bearer **Kumarbi** overthrows him and, in the struggle,
**bites off his penis and swallows it**. Anu curses him: from the seed now inside
him five gods will be born who will depose him, and the first is **Teshub**.

The registry held Alalu. It held Kumarbi. It held Teshub. **It held no Hurrian
Anu** — the god who is bitten, whose curse sets the cycle running, and who
fathers the god the cycle is about.

**The corpus held both ends of a swallowing and not the thing swallowed.**

It also held **Ullikummi** and not **Upelluri**, the giant on whose shoulder he
was set to grow — the being already alive when heaven and earth were separated,
who carries them on his back and does not notice a mountain rising on him. And it
held two of Kumarbi's champions, Ullikummi the stone and Hedammu the sea-serpent,
and not **Silver**, the one who actually reached the throne and has a song of the
cycle to himself.

## Four of the sweep's twenty-one hits are false, and that is part of the finding

A 46-name check returned **21 hits and 25 absences** before this batch — and the
hits flatter the corpus badly:

| name | what the sweep hit | what it is not |
|---|---|---|
| **Anu** | `mesopotamian_anu`, `irish_danu` | the Anu of the Kumarbi cycle |
| **Ishara** | `eblaite_ishara` | the Hurrian Ishara of the Allaiturahi ritual |
| **Adamma** | `eblaite_adamma` | the Adamma of Hebat's circle |
| **Kubaba** | `lydian_kuvava` | the Kubaba of the kaluti |
| **Nikkal** | `canaanite_nikkal` | Kushuh's consort in the Hurrian lists |

Every one of those is a real record of a real figure in another tradition, and
none of them is this tradition's record of the same cult. **A name-sweep over a
corpus that files by tradition will always report a tradition as better covered
than it is**, wherever that tradition's gods came from somewhere else — and the
Hurrian pantheon is explicitly described as one that took gods in from Eblaite
and Mesopotamian sources.

After this batch: **39 hits, 7 absences**, all 21 new records resolving.

## The circle of Hebat

Hurrian offering lists — the *kaluti* — are organised around a principal deity
and name the circle that goes with them. **In this material a principal deity is
documented through that circle**, so holding the principal without it is holding
half the attestation.

The corpus held **Hebat** and **Sharruma** and nobody else of hers: not
**Takitu** her attendant, not **Allanzu** and **Kunzishalli** her other children,
not **Shuwala**, **Adamma**, **Kubaba** or **Nabarbi**.

It held **Teshub** and not **Sheri** and **Hurri**, the two bulls that pull his
wagon, whose names are the words for *day* and *night* — nor **Tilla**, who
stands in Hurri's place in the eastern tradition.

It held the moon god **Kushuh** and not **Nikkal**, his consort. And it held one
of the three goddesses the scholarship calls primary — **Shaushka** — and neither
**Allani**, goddess of the underworld and one of the determiners of mortal fates,
nor **Ishara**, invoked beside her to keep demons out of a household.

## The second sweep caught a duplicate and the batch dropped a record

**An `hurrian_umbu` record was authored and then removed.** The sources place
Nikkal in the kaluti "after Ishara and before the pair Umbu-Nikkal", and Umbu
looked like a separate deity worth a record.

**The post-generation sweep resolved "Umbu" onto `hurrian_kushuh`, which already
carries it as an alias.** A second record would have been the within-tradition
duplicate this programme forbids, so the record was deleted and Nikkal's pairing
edge rewritten to point at Kushuh, where the name already lives.

**This is the clearest thing the twice-run sweep has caught in eleven lanes.**
The method has been to sweep once before authoring and once after generation;
until now the second sweep's value was better BLOCKED rows. Here it stopped a
duplicate from shipping.

## A build-hygiene finding, reported because it cost a test run

Deleting that record made `npm test` fail — not on the data, but on
`test/static.test.cjs`: *figure pages (6608) vs corpus figures (6607)*.

**`scripts/build-static.cjs` does not prune static pages for figures that have
been removed.** `dist/site/registry/hurrian_umbu.html` survived the rebuild and
the per-figure page count no longer matched the corpus. Removing the stale file
by hand restored 302/302.

This cannot bite CI, which builds from a clean checkout into an empty `dist/`,
and `dist/site` is gitignored — so it is a working-tree-only hazard, and it only
appears when a record is *deleted* between builds, which almost never happens in
an append-only corpus. **It is reported rather than fixed**, because a pruning
step in the static builder is a change to the build and the owner should decide
whether the builder should clean its output directory.

## Two decisions about how the corpus files adopted gods

The Hurrian pantheon took gods in from elsewhere, and the corpus already holds
four of them under the keys they came from. This batch creates Hurrian records
beside them and draws **no edges**:

- **Ishara** and **Adamma** are of Eblaite background and held as
  `eblaite_ishara` and `eblaite_adamma`.
- **Kubaba** is the goddess of Carchemish and the sweep resolves her onto
  `lydian_kuvava`.
- **Nikkal** comes from Mesopotamian Ningal by way of Ugaritic, and is held as
  `canaanite_nikkal`.

**This is the Greek/Roman pattern and not the Finnish/Karelian one.** Lane 20
criticised holding Väinämöinen twice because Finnish and Karelian are the same
body of material under two keys; Eblaite, Lydian, Canaanite and Hurrian are
different peoples, languages and millennia, and each has its own attestation of
the cult. What each record holds is what *its* sources say.

**And the Anatolian keys have the Finnish/Karelian problem anyway**, which this
batch met and did not touch: the corpus holds **`hittite_telipinu` and
`hattic_telipinu`** — two records for one god across two keys of the same
Anatolian religious world. That is lane 20's finding and lane 24's, in a third
part of the corpus, and it is a census row.

## Two pairs, two decisions, opposite ways

- **Hutena and Hutellura are ONE record.** The offering lists write them as a
  hyphenated unit and give neither a separate act. Splitting them would invent
  two designations the evidence does not have — the ground lane 22 gave the
  Alcis.
- **Hurri and Tilla are TWO records.** The sources say Hurri's *name* is replaced
  by Tilla in the eastern tradition, which is a statement about two regional
  traditions and not about one being with two names. Neither record says they are
  the same, and neither says they are not.

## Zero pre-existing records mutated

Every symmetric relation is reciprocated in-batch: Sheri and Hurri `sibling`,
Shuwaliyatti and Nabarbi `consort-of` both ways, Allanzu and Kunzishalli
`sibling`, Allani and Ishara `invoked-with`.

Fourteen edges point at pre-existing records and all are non-symmetric —
`overthrew`, `overthrown-by`, `father-of`, `child-of`, `bore-on-his-shoulder`,
`draws-the-wagon-of`, `attendant-of`, `of-the-circle-of`, `sibling-of`,
`consort-of`, `attested-with`.

**Allanzu and Kunzishalli carry `child-of` Hebat as a relation and not as
`parentIds`**, for lane 23's reason: an offering list's *ordering* is not a
genealogy, and in this corpus `parentIds` drives the computed tier.

**Anu's `father-of` Teshub is the strangest edge in the corpus.** The father is
bitten, the seed is swallowed, and the mother is the man who swallowed it. It is
written from Anu's end only, because Teshub is a pre-existing record.

## What is not asserted

- **No edge from Anu to `mesopotamian_anu`.** The Hurrian succession myth takes
  the Mesopotamian sky god's name; that is a fact about how the myth was built.
- **No edge from Upelluri to any Atlas-figure.** The comparison is a scholar's.
- **Nothing about Kubaba and Kybele.** A proposal, not a source.
- **Ullikummi's mother is not decided.** The sources give the sea god's daughter
  Sertapsuruhi, whom the corpus holds, *or* a female cliff; the record notes both
  and chooses neither.
- **The five gods of Anu's curse are not manufactured.** The sources name a
  number and name Teshub as the first; four more records from a number is what
  this programme does not do.

## Twelve BLOCKED

**Kiashe the Sea God is the sharpest**: Kumarbi's ally, whose daughter
**Sertapsuruhi the corpus already holds**. The registry has the daughter and not
the father — this programme's recurring fault at one remove.

**LAMMA** is the strangest: one of the five songs of the cycle is the *Song of
LAMMA*, and LAMMA is a **logogram** standing for a tutelary god whose Hurrian or
Hittite name is not settled. Lane 22 met the reverse case in Mars Thingsus, where
a Roman name carried a Germanic epithet that gave something to hold the god by.
**Here there is no epithet and no name — only a sign.**

## Verification

- `scripts/validate-transcripts.cjs` → clean, 21 figures, no outstanding
  reciprocals
- sweep run against both heads with the same 46-name list: **before 21 hits / 25
  absences, after 39 hits / 7 absences**, all 21 new records resolving — and the
  second run caught the Umbu duplicate before it shipped
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**
- `npm test` → **302/302**, after removing a stale static page left by the
  deleted record; see the build-hygiene section
- record-level diff against the previous head: **21 added, 0 removed, 0
  pre-existing records mutated**
- zero dangling references, zero era inversions, zero tier-classification drift
- **two new verified-solitary verdicts**: Ashtabi and the Goddess of the Night
- README and `package.json` counts refreshed to 6,607 / 560 / 5,427 / 7,929 /
  3,198

## Status: PARTIAL

Hurrian goes from 14 to 35, and for the first time the corpus holds the act the
Kumarbi cycle turns on, the giant the world sits on, and the circle that
documents Hebat.

What remains: **Kiashe the Sea God**, whose daughter is already held;
**Impaluri** and **Shalash**; the **Hurrian primeval deities**, which need the
per-name sourcing lane 17 gave the Navagraha; **LAMMA**, who needs a name before
he can have a record; and the **Anatolian tradition-key question** — Telipinu
held twice, Shuwaliyatti beside the Hittite Suwaliyat, and a Hittite Anu that may
or may not need to exist.
