# Lane 27 — Tibetan Buddhist audit

Owner: `lane-27-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,641 total figures, 9 of them Tibetan Buddhist.

Corpus: **6,641 → 6,680 figures**. Tibetan Buddhist **9 → 48**.
Census: 107 rows — **39 ADD, 18 ALIAS, 15 EXISTING, 9 CROSS-TRADITION SAME
FIGURE, 12 REJECT, 14 BLOCKED**.

## Nine records, and every one of them a guard at the door

The Tibetan Buddhist key held nine records:

| record | what it is |
|---|---|
| Pehar Gyalpo | oath-bound protector of Samye and Nechung |
| Palden Lhamo | protectress of Tibet and of the Dalai Lamas |
| Begtse | armoured war god |
| Dorje Legpa | oath-bound protector of the termas |
| Za Rahula | planetary protector of the mind-revelations |
| Dorje Shugden | sectarian protector |
| Tsiu Marpo | monastery guardian |
| Tashi Tseringma | chief of the Five Long-Life Sisters |
| Shinje | Yama Dharmarāja, lord of death |

**Every single one is a wrathful protector.** Nine records, one category.

No Padmasambhava — **the figure Tibet calls the second Buddha, and the man who
bound four of those nine under oath.** No yidam: no Yamāntaka, no Cakrasaṃvara,
no Hevajra, no Guhyasamāja, no Kālacakra, no Vajrayoginī, no Vajrakīlaya. No
Vajradhara, whom every tantric lineage of two of the four schools traces itself
back to. No Tārā in any Tibetan form. No Yeshe Tsogyal. No Gesar. No king. **No
monkey and no ogress** — the Tibetans' own account of where the Tibetans came
from was not in the corpus under any key.

Lane 26 found a world religion filed entirely through the beings on its margins.
**This is the same fault rotated ninety degrees: a tradition filed entirely
through its doorkeepers.** The corpus held the ones who guard the shrine and
nobody who is in it.

## Two of three, and one of five

The Nyingma school names **three root protectors**: Ekajaṭī guards the mantras —
the speech of the Buddha; Za Rāhula guards the wisdom-revelations — the mind;
Dorje Legpa guards the termas — the body.

**The corpus held the second and the third and not the first.** Two of three, in
a key of nine, with nothing anywhere in the corpus to indicate a third existed.

The **Five Long-Life Sisters** are a fixed set of five, bound by Padmasambhava
and made protectors of the Kagyü teachings by Milarepa. The corpus held **Tashi
Tseringma**, their chief, and **none of the other four** — among them
**Miyolangsangma, who lives on the summit of Chomolungma.**

This programme has found "holds one of a set and not the set" in Welsh,
Anglo-Saxon, Hurrian and Buddhist material. **Here it found it twice inside nine
records.**

And a third time in miniature: the corpus held **Shinje — Yama Dharmarāja, the
lord of death — and not Yamāntaka, whose entire name means "the one who ends
him"**. That is lane 26's Yama-without-Kṣitigarbha finding, repeated one key
over.

## The sweep has a second failure mode, and this is the one that makes duplicates

Lanes 25 and 26 documented the sweep's **false hits** — a name resolving onto a
different tradition's record, or, in Sujātā's case, onto a different figure in
the same tradition. This lane found the opposite failure:

| name checked | sweep said | the corpus actually holds |
|---|---|---|
| **Pehar** | ABSENT | `tibetan_pehar`, primary "Pehar Gyalpo" |
| **Tonpa Shenrab** | ABSENT | `tibetan_tonpa_shenrab`, primary "Tönpa Shenrab Miwoche" |
| **Nechung** | ABSENT | reachable only as "Nechung deity" on `tibetan_pehar` |

All three are the same mechanism: **the corpus holds a longer form of the name,
and the bare form normalises to something the index does not contain.** It is the
third variant of the article-and-epithet bug lanes 18 and 19 found, and it is
strictly more dangerous than a false hit. A false hit makes a lane *skip* a
figure it should have added. **A false absence invites a lane to add a figure the
corpus already has.** A lane that trusted "Pehar ABSENT" would have shipped a
duplicate Pehar.

It did not happen here because the method reads the existing key by hand before
authoring and runs the sweep again after generating. **That is the second time in
three lanes the double-check has been the thing that mattered** — lane 25's Umbu
catch was the first.

Before this batch: **26 hits / 72 absences** on a 98-name list. After: **68 hits /
30 absences**, all 39 new records resolving.

## Gesar: the corpus had him in two neighbouring traditions and not his own

`buryat_geser` and `mongol_gesar` were both in the corpus. **The Tibetan key the
epic belongs to held nothing.** A reader asking whether the registry "had Gesar"
would have been told yes.

This is the false-hit mechanism doing real damage rather than cosmetic damage:
lane 25 showed it flattering a tradition's coverage, and here it **hid an absence
in plain sight**. No edge and no equation is written to either neighbouring
record — how the epic travelled between Tibet, Mongolia and Buryatia is a
question about transmission, and this programme does not write transmission as a
relation between beings.

## The line this lane draws, stated so it need not be derived a fifth time

Four lanes have now hit the same question: what to do with a figure who was a
historical person and whose surviving transmission is legend. Lane 23 left it
open with Trdat III, lane 24 with Jumong's successors, lane 26 with Nāgārjuna —
while lane 26 ingested **Śākyamuni**, who is that same kind of figure.

The line the corpus has in fact been drawing, stated plainly:

> **A figure is ingested when the tradition's own transmission of them is mythic
> narrative** — a birth without parents, a descent on a cord, a binding of
> spirits, an emanation identified — **and blocked when the retrievable material
> is a dated biography with legend attached.**

In: **Padmasambhava** (appears already eight years old in a lotus, departs
without dying), **Yeshe Tsogyal**, **Mandarava**, **Śāntarakṣita** (whose
retrievable act is a monastery the land's spirits pull down each night),
**Trisong Detsen**, **Nyatri Tsenpo**, **Drigum Tsenpo**, **Songtsen Gampo**.

Blocked: **Milarepa, Marpa, Naropa, Tilopa, Tsongkhapa, Atiśa, Machig Labdrön,
Longchenpa, Sakya Paṇḍita** and the incarnation lineages.

**This is a stance, not a licence**, and it is recorded in one place so the owner
can overturn it in one place. **Its cost is recorded too**: the retrieved source
for the Five Long-Life Sisters says *Milarepa* made them protectors of the Kagyü
teachings, so the corpus now holds four goddesses whose station he conferred and
not him. That is this programme's recurring fault, **created deliberately this
time**, and written into the census rather than hidden.

## The three Tibetan keys

Tibetan religion is filed under **three** tradition keys — `Tibetan Buddhist`
(9), `Bön` (6), `Tibetan Bön` (2) — and the id prefixes do not follow them:
`tibetan_tonpa_shenrab` sits under `Bön`, `tibetan_nyenchen_tanglha` under
`Tibetan Bön`, `tibetan_palden_lhamo` and `tibetan_pehar` under `Tibetan
Buddhist` beside six `tibetan_buddhist_*` ids.

**Nyenchen Tanglha, filed under Tibetan Bön, is a mountain god bound under oath
by Padmasambhava.** The boundary between the keys does not track anything in the
material.

**This batch merges and renames nothing.** Every new record goes under `Tibetan
Buddhist`; three edges cross into the other keys because the sources cross them
(Padmasambhava binds Nyenchen Tanglha; Machen Pomra and Yarlha Shampo are named
with him as the three Tibetan mountain gods); the question is escalated. Fifth
lane to raise tradition-key duplication, after Finnish/Karelian, Korean/Jeju,
Hittite/Hattic and Buddhist/Chinese.

## What the batch added

- **Padmasambhava and the taming of Tibet (6)** — Padmasambhava; Yeshe Tsogyal,
  who recorded the teachings and hid the terma; Mandarava; Śāntarakṣita, who
  could not build Samye and sent for him; Trisong Detsen, who invited them both;
  Dorje Drakden, Pehar's chief minister and **the voice Pehar actually speaks
  with through the Nechung oracle**.
- **The yidams (8)** — Yamāntaka, Cakrasaṃvara, Vajrayoginī, Hevajra,
  Guhyasamāja, Kālacakra, Vajrakīlaya, Hayagrīva.
- **The protectors the sets were missing (8)** — Mahākāla; Ekajaṭī; Siṃhamukhā;
  the four remaining Long-Life Sisters; Jambhala.
- **The primordial buddha and the female deities (7)** — Vajradhara;
  Vajrasattva; White Tārā, Kurukullā, Uṣṇīṣavijayā, Sitātapatrā, Mārīcī.
- **Where the Tibetans came from, and the kings (7)** — Pha Trelgen Changchup
  Sempa and Ma Drag Sinmo; Nyatri Tsenpo and Drigum Tsenpo; **Lo-Ngam**, the
  stable master who cut the cord; Songtsen Gampo and the supine demoness.
- **Gesar and the mountain gods (3)** — Gesar of Ling, Machen Pomra, Yarlha
  Shampo.

**Lane 26 blocked Mahākāla, Yamāntaka and Acala on a tradition-key question.
This lane answers it**: they belong under the key that already holds nine
protectors, and the Buddhist key is left alone. Two of the three are here;
Acala is not, for want of a retrievable treatment.

## Zero pre-existing records mutated

39 records, 58 relations. **22 point at pre-existing records and every one is
non-symmetric** — `bound-under-oath`, `chief-minister-of`, `wrathful-form-of`,
`of-the-three-nyingma-root-protectors-with`, `of-the-five-long-life-sisters-with`,
`counted-among-the-twenty-one-taras-with`, `of-the-forms-of`, `authorised-by`,
`held-to-be-a-manifestation-of`, `of-the-tibetan-mountain-gods-with`. Seventh
consecutive lane with zero mutation.

**No record in this batch carries `parentIds` at all.** Every genealogical claim
the sources make is a *line* — Nyatri Tsenpo to Drigum Tsenpo to Songtsen Gampo
to Trisong Detsen, and Yarlha Shampo as the Yarlung kings' ancestor god — and a
dynastic line is not a seeded parentage. In this corpus `parentIds` drives the
computed tier, so all 39 records return their authored type and there is no
classification drift to check for. Lane 23's rule, applied to a whole batch.

## What is not asserted

- **No edge and no equation between Vajradhara and `buddhist_samantabhadra`.**
  Which buddha is primordial is a difference between schools, not a fact about
  two beings.
- **No edge from Yamāntaka to `tibetan_shinje`.** The sources give it as an
  etymology, and this programme does not write etymology edges.
- **No edge from Gesar to `buryat_geser` or `mongol_gesar`.**
- **Ma Drag Sinmo and the supine demoness are kept apart**, deliberately. Both
  are *srin mo*, the names overlap and the figures do not, and both records say
  so — the Sujātā lesson of lane 26 applied *before* the sweep rather than after.
- **No mother, no father and no consort is invented anywhere.** The mountain
  gods' consorts, Hevajra's Nairātmyā and Kuntuzangmo are all named in the
  practice traditions and absent from the retrieved treatments; none is written.
- **Songtsen Gampo is not called an emanation of Avalokiteśvara.** The tradition
  says it; the retrieved sources do not; the record does not.

## Fourteen BLOCKED

**Wencheng** is the sharpest, because blocking her creates a visible gap: she is
the bride the source credits with telling Songtsen Gampo the shape of the land,
and the corpus now holds the king who mapped the demoness and not her. She is
blocked rather than filed here because she has a Chinese historical record and
the corpus files Chinese material under its own key — the care lane 21 took over
Hengist and Vortigern.

**Amitāyus** is blocked on a genuine ambiguity: the practice traditions treat him
as a distinct deity with distinct iconography and function, and the retrieved
treatments do not separate him from `buddhist_amitabha`. Blocked rather than
guessed — and the alternative, amending the Amitābha record, would mutate a
pre-existing entry.

**Bhṛkuṭī** appears in the same source set as two different claims — Songtsen
Gampo's Nepali bride, and one of the goddesses counted among the Twenty-One
Tārās — and is blocked rather than merged into one record.

Three of the fourteen are not figures: **the three Tibetan keys**, **the
historical-persons scope question**, and **the type and era vocabularies**.

## The never-mutate cost, sixth lane running

`buddhist_tara` is the base Tārā record and the green form. The correct edit is
to add "Green Tārā" as an alias there and let the new record carry only the white
form. This batch cannot make that edit without mutating a pre-existing record, so
White Tārā is a separate record stating the relation, and the census carries
Green Tārā as `EXISTING` with the reason. **Sixth lane to pay this cost; it is
now the most frequently recurring structural finding in the programme after the
missing-counterpart one.**

## Verification

- `scripts/validate-transcripts.cjs` → clean, 39 figures, no outstanding
  reciprocals
- sweep run against both heads with the same 98-name list: **before 26 hits / 72
  absences, after 68 hits / 30 absences**, all 39 new records resolving — and the
  second run surfaced the three false absences above
- collision scan across all 6,680 records: **no within-tradition duplicate**; the
  only cross-record collisions touching new ids are the intended Gesar/Geser
  overlap and the pre-existing Rāhula one
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**
- `npm test` → **302/302**, first run — eighth consecutive lane
- record-level diff against the previous head: **39 added, 0 removed, 0
  pre-existing records mutated**
- zero dangling references, zero era inversions, **zero tier-classification
  drift, trivially: no record in the batch carries `parentIds`**
- **two new verified-solitary verdicts**: Gesar and Jambhala
- README and `package.json` counts refreshed to 6,680 / 560 / 5,475 / 7,930 /
  3,202

## Status: PARTIAL

Tibetan Buddhist goes from 9 to 48, and the corpus now holds the man who bound
its protectors, the yidams the practice is built on, the buddha the lineages
trace to, the third of the three Nyingma protectors, four of the five sisters,
the monkey and the ogress, the king who came down the cord and the man who cut
it, and Gesar of Ling in the tradition the epic belongs to.

What remains: **Wencheng**, blocked across a key boundary with the gap recorded;
**Amitāyus** and **Bhṛkuṭī**, blocked on real ambiguities; **Acala**, **Dorje
Yudronma**, **Setrap** and **Kuntuzangmo**, blocked on sourcing; the **masters**
— Milarepa above all, whose four sisters this batch ingested without him; and the
three escalations, which are the owner's: **the three Tibetan keys**, **the
historical-persons line this lane states rather than decides**, and **the type
and era vocabularies lane 26 raised and this lane leaves exactly where it found
them.**
