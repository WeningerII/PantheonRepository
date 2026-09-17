# Lane 16 — Hindu audit

**Status: PARTIAL.** Corpus 6,318 → 6,362 figures. Hindu 133 → 177 records.

Census: 109 rows — **44 ADD, 6 ALIAS, 24 EXISTING, 7 CROSS-TRADITION SAME
FIGURE, 8 REJECT, 20 BLOCKED**. Full rows in `hindu-census.tsv`; the records in
`data-sources/transcripts/hindu-expansion.txt`.

## The registry held the Pandavas and not the Kauravas

A 138-name check across the whole registry returned 17 hits and **121
absences**. Six of the seventeen hits are false — "Uttara" matched `mon_uttara`,
"Kurma" matched `fur_kuruma`, "Sati" matched `egyptian_satis`, "Mangala" matched
`mandinka_maa_ngala`, "Ila" matched `koryak_illa`, and "Bali" matched
`hindu_vali`, the *vanara* king of the Ramayana rather than the asura king of
the Vamana story. Six more were aliases already carried on existing records.

The 133 records were not thinly spread. They are dense in places: the corpus
holds **five sons of Karna**. What it did not hold is the other side of
anything.

All five Pandavas were there. Draupadi, Kunti, Madri, Pandu, Dhritarashtra,
Bhishma, Vyasa, Satyavati, Drupada, Dhrishtadyumna, Abhimanyu, Karna and those
five sons were there.

There was not one Kaurava. No **Duryodhana**. No **Gandhari**. No
**Dushasana**, no **Shakuni**, no **Vikarna**. And none of the men the war is
actually fought by on that side: no **Drona**, who taught both houses; no
**Kripa**; no **Ashwatthama**; no **Kritavarma**; no **Jayadratha**.

The Mahabharata is a war between two families and the registry held one of them.

## The same fault, four more times, in the god-and-adversary pairs

| God (held) | Adversary (absent) | What the killing is |
|---|---|---|
| Indra | **Vritra** | Indra's standing Rigvedic epithet is *Vritrahan*, "slayer of Vritra" |
| Durga | **Mahishasura** | her commonest cult name is *Mahishasuramardini*, "crusher of Mahishasura" |
| Narasimha | **Hiranyakashipu** | the avatar exists for this one killing and no other |
| Varaha | **Hiranyaksha** | likewise |

Two of those gods are named after the being they kill, and the registry held
the name and not the being. Alongside them, **Prahlada** — the boy the Narasimha
avatar comes to save, and the founding figure of the bhakti tradition's
self-understanding — was also absent.

**Diti** states it most precisely. The corpus held Kashyapa and held **Aditi**,
the mother of the gods. It did not hold Diti, the mother of their opponents, by
the same father. The registry's Hindu holdings were a family tree with the
losing side pruned.

## Dasharatha had three queens and the corpus held two

**Kausalya and Sumitra** — the mothers of Rama and of Lakshmana, that is, the
two whose sons were *already in the registry*. Not **Kaikeyi**, whose two boons
crown Bharata and exile Rama for fourteen years, which is the event the Ramayana
consists of.

This is lane 14's five-of-six-idols pattern in its worst form, and it has a
mechanism rather than a run of bad luck: **a corpus that adds people because
other people it holds are related to them will always produce this shape.** It
reaches a queen through her son and stops where no son is held.

The rest of the Ramayana's missing half follows the same logic: **Manthara**,
who puts the idea in Kaikeyi's head; **Mandodari**, who tells Ravana to give
Sita back; **Shurpanakha**, whose mutilated face is why he takes her;
**Maricha**, who becomes the golden deer; **Tataka**, the first being Rama
kills; **Ahalya**; and **Valmiki**, who wrote the poem — in a corpus holding
twenty-odd of its characters and holding **Vyasa**, the other epic's author,
with his parents and his sons.

## The two houses had no common ancestor

The corpus held the Kuru line back as far as Pratipa and the Yadavas back as far
as Shura, and nothing above either. The Kauravas and the Yadavas — the two
families the whole epic is about — had no reason in the data to be related.

They descend from **Yayati** by two different wives: **Devayani**'s son
**Yadu** founds the Yadavas, and **Sharmishtha**'s son **Puru** founds the line
that becomes the Kurus. The quarrel between those two women is where the split
begins, and **Shukra**'s curse on Yayati is what the story turns on. Seven
records, and the two great families are now each other's cousins in the data
rather than only in the story.

## Method: the sweep was run twice

- **First sweep, 138 names: 17 hits, 121 absences.**
- **Second sweep, 242 names, run after the 44 records were generated: 99 hits,
  143 absences.** All 44 new records resolve.

The second sweep is what produced the strongest BLOCKED rows — **Kuru** himself,
the eponym of both the Kauravas and Kurukshetra; **Shakuntala, Dushyanta and
the Bharata the country is named after**; **Dushala**, the Kauravas' one
daughter and Jayadratha's wife; and the whole **solar dynasty**, which the
corpus holds nothing of, so it cannot say that Rama is an Ikshvaku.

## Zero pre-existing records mutated

Every edge toward a pre-existing record uses a non-symmetric kind. The
load-bearing ones:

- **Vritra `slain-by` Indra**, **Mahishasura `slain-by` Durga**,
  **Hiranyakashipu `slain-by` Narasimha**, **Hiranyaksha `slain-by` Varaha**.
- **Kaikeyi `exiled` Rama** — one edge, and it is the Ramayana.
- **Shurpanakha `incited` Ravana**; **Maricha `lured` Rama**.
- **Gandhari `intervened-for` Draupadi** — the two women stand on opposite sides
  of the hall in the epic's worst scene, and the one who stops it is the mother
  of the men who caused it.
- **Duryodhana `befriended-by` Karna** — the corpus held Karna and five of his
  sons and not the man whose friendship explains his whole position in the war.
- **Jarasandha `slain-by` Bhima**; **Rukmini `queen-consort-of` Krishna**, who
  was held with no wife at all.
- **Kaikeyi `mother-of` Bharata** and **Tahmineh-style asymmetry again**: the
  corpus holds Bharata with `parentIds` naming Dasharatha alone, exactly as lane
  15 found Sohrab held with his father alone. The mother goes in as a relation
  rather than by mutating the record.

## Two corrections the test suite forced

**1. Ashwatthama's type.** He was first authored as `demigod`, on the strength
of the sources making him a combined incarnation of Shiva, Yama, Kama and
Krodha. `npm test` rejected it as tier-classification drift: this corpus
computes the tier from descent, both his parents are mortals in this batch, and
an authored `demigod` against a computed `mortal` is a divergence the suite
counts at a hard zero. The corpus's own rule wins. The incarnation claim stays
in the lifecycle, where it is a statement about him rather than about his
parents.

**2. The detail-shard size tripwire fired, and the pre-agreed response
executed.** `test/scale-gates.test.cjs` budgets each lazily-fetched detail shard
at 150KB gz. At 6,362 figures, bucket 8 reached **151KB**. The documented
response for that tripwire is *"BUCKETS steps up via the deterministic
formula"*, so `bucketCountFor()` in `scripts/build-tiers.cjs` had its per-shard
target moved from 100 to 80, which takes the corpus from 64 shards to 128.

This is a correction to the formula's own assumption, not a bump to green a
build. The formula's comment claimed 100 records a shard would keep every shard
inside the budget; real data at 6.36k falsified that, because the hash does not
distribute evenly — the corpus average was 99.4 records a shard while the
largest shard was over. After the step-up the largest shard is **79.9KB** and
the median **56.4KB**, and the documented 30k → 512 anchor is unchanged.

`test/tiers.test.cjs` mirrors the same constant and was updated with it. No test
was skipped, disabled or quarantined; the assertion still requires the bucket
count to follow the formula exactly.

**The load-time invariants are unaffected and were re-checked:** shards are
fetched lazily per figure-open, so more of them means fewer bytes per open and
nothing added to first load; `dist/site/index.html` is **40.4KB gz** and its
`app-<hash>.js` is still `defer`red.

## Contradictions and restraint

- **The blindfold is not on Gandhari's record.** The fact everyone knows about
  her — that she bound her own eyes for life on marrying a blind man — is not in
  the treatments consulted, and the record does not assert it. That restraint is
  worth being visible on a figure this well known.
- **Dushasana's record does not narrate the disrobing**, and **Vikarna's does
  not say he objected to it**, and **Shishupala's does not give the hundred
  offences or the beheading**. All three are famous; none is in the citations in
  hand.
- **Ahalya's curse is recorded as "a curse"**, not as the turning-to-stone. The
  versions differ, and whether she was complicit or deceived is the point the
  tradition argues about for two thousand years.
- **Puru and Yadu are `sibling` and not `half sibling`.** The corpus's symmetric
  vocabulary carries both; the treatment states the shared father without using
  either term, and the `parentRoles` carry the actual mothers, which is where
  the distinction is visible.

## Two within-tradition id collisions

`hindu_chitrasena_kaurava`, because the corpus already holds
`hindu_chitrasena_karna` — a son of Karna with the same name. And
`hindu_mahabali`, because `hindu_vali` is the vanara king and a bare
`hindu_bali` would have collided with the sweep's own false hit.

Both are *within* one tradition, not across two. A corpus this size will keep
meeting them, and the fix is a qualified id plus a qualifier in the primary
name, not a silent merge.

## Twenty BLOCKED, and one of them is a schema question

The strong ADDs, in order of how badly they are missed: **Kuru** himself;
**Shakuntala, Dushyanta and Bharata**, after whom the country is named, where
the corpus holds a *different* Bharata; **Sati, Daksha and Andhaka**, so that
the corpus holding Shiva and Parvati has something of the cycle that connects
them; **the Navagraha**, of which the corpus holds none as grahas and which are
the most widely worshipped set of figures in living practice; **the solar
dynasty**, so that a corpus holding Rama can say he is an Ikshvaku; and
**Ekalavya**, the epic's sharpest story about caste.

**Escalated, and not a figure:** the corpus files `hindu_dhritarashtra` at era
`epic-period` and his nephews the Pandavas at `dvapara-yuga`, which is *earlier*
in the registered Hindu era order. The Kauravas added here are therefore filed
at `epic-period` to match their father, because the suite enforces that a parent
may not be later than a child — so first cousins now sit in two different eras.
This batch declines to fix a pre-existing inconsistency by mutating records it
did not author, and it will recur in every future Mahabharata pass.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 44 figures
- full regeneration, then `scripts/verify-regen.sh` → byte-exact
- `npm test` → 302/302
- record-level diff: 44 added, 0 removed, **0 pre-existing records mutated**
- zero dangling references, zero new era inversions, zero unverified kinless
  figures, zero tier-classification drift
- detail shards: 128, largest 79.9KB gz, median 56.4KB, budget 150KB
- `dist/site/index.html` 40.4KB gz, `app-<hash>.js` still deferred
- README and `package.json` counts refreshed to 6,362 / 560 / 5,344 / 7,929 /
  3,198

## Status: PARTIAL

The next Hindu lane writes itself: **the Navagraha and the remaining Rigvedic
gods**, then the **solar dynasty**, then the rest of the Kaurava-war principals
(Shalya, Sanjaya, Virata, Satyaki, Yuyutsu), then the Devi Mahatmya's other
asuras, then the three missing avatars. Hindu is still the largest absolute gap
in this corpus at 177 records, and this lane took the conflicts because they
were the part where holding one side of a pair was doing active harm.
