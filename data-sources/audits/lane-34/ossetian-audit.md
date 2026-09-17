# Lane 34 — the Ossetian expansion

Owner: `lane-34-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Census: [`ossetian-census.tsv`](ossetian-census.tsv) — 49 rows, every candidate
with an explicit disposition.

    candidates censused   49
    ADD                   27   ingested
    EXISTING              10   already held
    BLOCKED                6   genuine blockers, exact uncertainty recorded
    REJECT                 6   out of scope by standing rule

    corpus   6,707 -> 6,734 figures
    Ossetian     10 -> 37 records
    traditions          560, unchanged

## The gap

The Ossetian key held **ten records, and nine of them are one household** —
Wærxæg, his twin sons Akhsar and Akhsartæg, Dzerassæ whom one of them marries,
their three children Uryzmæg, Khæmyts and Satana, Khæmyts's wife Bytsenon, and
her son Batraz. The tenth is Donbettyr, the water-god that lineage married into.

Two things were missing from that.

**The entire pantheon.** Not a thin patch — the whole layer. No Xucau, the
supreme god who rules every other spirit in the system. No Uastyrdzhi, the patron
of men and guarantor of oaths, who is the most invoked figure in Ossetian
religion. No Uacilla, Safa, Kurdalægon, Æfsati, Tutyr, Fælværa, Alardy, Barastyr,
Aminon, Galægon or Khur. The corpus held an Ossetian genealogy and no Ossetian
religion.

**The two Narts the stories are actually about.** Soslan, whose cycle is the
largest in the Ossetian Nartiada, and Syrdon, the trickster Dumézil identified as
the closest known Indo-European parallel to Loki. The corpus had the family tree
and not the protagonists.

## Three figures were already in the corpus — as other traditions' aliases

The corpus-wide NFKD sweep over sixty-two candidate names returned **three hits,
and every one was an alias string on a record belonging to a different
tradition**:

| candidate | what the corpus actually answered with |
|---|---|
| `Soslan` | `circassian_sosruquo`, which carries "Soslan" in its alt list |
| `Afsati` | `karachay_balkar_apsati` **and** `svan_apsat`, both carrying "Afsati" |
| `Totur`  | `karachay_balkar_totur` |

These are the legitimate **one-cult-many-keys** pattern — the same figure really
is held under several tradition keys, and lane 33's gate deliberately does not
fire on cross-tradition shadows because 685 of 710 of them are correct. But they
make an absence **invisible**: the name resolves, nothing looks missing, and the
Ossetian figure has no record. A search for the central Ossetian hero answered
with a Circassian one.

This is a **fourth failure mode** to add to the three this programme has already
documented (lane 27's false absences, lane 29's figures hiding inside alias
lists, lane 31's primary-primary collisions): **a correct cross-tradition alias
concealing a real gap in another key.** No scan can catch it, because the scan's
answer is not wrong — it is just about somebody else.

A second sweep pass on substring containment, run to catch lane 27's
false-absence mode, returned eighteen near-matches and **all eighteen were
coincidental collisions in unrelated traditions** (Uacilla against Koryak "Illa",
Taranjelos against "Tārā" and "Aran", Ælbeg against a Tuvan "Yelbeghen"). No
Ossetian figure was hiding under a longer name.

## The corpus had already written down three things it did not hold

The pattern lanes 30, 31 and 32 kept finding — a record carrying, in its own
fields, the very thing the corpus lacked — turns up three more times here:

* `ossetian_batraz` carries the domain **"forge-tempered-warrior — tempered in
  the (Kurdalægon) smithy"**. The corpus named the heavenly smith inside a domain
  label and held no record for him.
* `ossetian_batraz` also carries **"sacred-spring-tear-progenitor — holy
  spring(s) arising from God's tears"**. The corpus recorded the three tears and
  not the three heavenly-dwellers that grew where they fell: Rekom, Mykalgabyrtæ
  and Taranjelos, the three great sanctuaries of Ossetia.
* `ossetian_khaemyts` is recorded as murdered and `ossetian_batraz` as the
  avenger who "brutally took revenge". **Neither the man who did the killing
  (Saynag-Aldar) nor the man who paid for it (Burafærnyg) was in the corpus.**
  The corpus held both ends of a blood-feud and neither of its two killers.

## One genealogical contradiction, flagged rather than resolved — ESCALATION

The sources say plainly that **Uastyrdzhi is the father of Satana** in the Nart
epic. The pre-existing `ossetian_satana` record gives her parents as **Akhsartæg
and Dzerassæ**.

This lane does not change it, and the reason is arithmetic as much as authority.
Rewriting her `parentIds` would also change her **computed tier**: today it is
quartigod (mortal father 0.0 + demigod mother 0.5, halved to 0.25); with
Uastyrdzhi as father it would be 0.75 and she would classify **demigod**. A
lane's authorisation to edit *alias lists* does not extend to rewriting genealogy
and silently reclassifying a pre-existing figure.

So the claim is recorded where a reader will meet it — as a relation on
Uastyrdzhi's own record, kind `named-as-father-of-in-the-nart-epic`, carrying a
note that states the conflict in full — and it is escalated here. **The registry
now holds both readings and says which record asserts which**, instead of holding
one and behaving as though the other did not exist.

**For the owner:** either `ossetian_satana` gets Uastyrdzhi as a third parent (or
in place of Akhsartæg) and moves to demigod, or the epic's paternity is recorded
as a variant claim only. Both are defensible; neither is a lane's call.

## Judgement calls worth stating

**Safa and Kurdalægon are identified with each other in the sources, and both are
held.** They are linked by a reciprocated `equated-with` rather than merged,
because the hearth chain and the forge are distinct cults with distinct rites —
folding either into the other would lose one of them.

**Fælværa and Tutyr are both authored because each explains the other.** Fælværa
the shepherd-god has one eye; Tutyr the wolf-lord struck out the left one *so
that wolves could come at the flock from the blind side*. Holding either alone
leaves the injury with no cause, which is the Legba-without-Kalfou fault this
programme has now found in twenty traditions.

**Soslan is authored with EMPTY parentIds, deliberately.** The Ossetian tradition
makes him stone-born of an unnamed shepherd whose identity varies by region, and
the corpus's own `ossetian_satana` record calls her his **foster**-mother, not
his mother. Rather than pick a side the tradition itself does not settle — and
write a `parentId` that would then compute a tier off that guess — the record
carries `fostered-by` and states the split in its notes. He is typed **demigod**
to match the two records of the same hero the corpus already holds under the
Circassian and Karachay-Balkar keys.

**Three records carry parentIds, and each was checked against the registry's own
tier arithmetic before authoring**, so the tier-classification-drift test cannot
fire:

| record | parents | fraction | tier |
|---|---|---|---|
| `ossetian_atsyrukhs` | Khur (deity 1.0) | 1.0 / 2 = 0.5 | demigod |
| `ossetian_syrdon` | Gætæg (numen 1.0) + Dzerassæ (demigod 0.5) | 1.5 / 2 = 0.75 | demigod |
| `ossetian_agunda` | Saynag-Aldar (mortal 0.0) | 0.0 / 2 = 0 | mortal |

The other twenty-four author no parentIds at all, so drift is impossible by
construction for them.

**Gætæg is typed `numen`** — the registry's category for a non-pantheon divine
race — which is the same call the corpus already makes for the Circassian
water-sprite Lady Isp. That typing is what makes Syrdon compute as a demigod
rather than a scion, so it is stated rather than buried.

## What was blocked, and exactly why

Six candidates are BLOCKED, each with the uncertainty written out in the census
rather than reduced to the word "unclear":

* **Rynybardwag** — a name carried into this lane as "lord of diseases". Two
  searches, under the name and under variants, **returned nothing at all**. Not
  authored on the strength of a half-remembered gloss.
* **Uac Nikkola** — the only attestation found is the name-equation "the Ossetian
  name for Saint Nicholas, *uac-* meaning saint". A name-equation is not a figure.
* **Balsæg** — **the sources themselves state his identity remains unknown.** He
  exists only inside the compound "the Wheel of Balsæg", his variants
  Balsæg/Barsæg/Marsug are unresolved, and in some accounts the Wheel belongs to
  Father Ojnon instead. The Wheel is carried as `materialCulture` on Soslan,
  which is where the evidence actually is.
* **Ælbeg** — attested only as Totradz's patronymic.
* **Crym-Sultan** — attested in a single clause of a single source. Carried
  inside Safa's source text, as evidence about Safa.
* **Ærfæn** — a candidate Nart horse; the search returned nothing. Blocked on
  **evidence, not on category**: the registry does hold an animal as a figure
  where it is a cult object in its own right (`egyptian_apis`), so the question
  stays open.

## What was rejected, and under which standing rule

* **The three Nart families** — Æxsærtæggatæ, Alægatæ, Boratæ. A lineage is a
  collective, and this registry does not ingest collectives; the same rejection
  was applied to the nanchon, the Gede, the nagas and the tsen. The Borata
  household appears as a **domain on Burafærnyg**, which is where it belongs.
* **zædtæ / dawdžytæ** — the classes of heavenly spirits. A category, not a
  figure; carried inside Xucau's own source text.
* **The Wheel of Balsæg** — an object. Carried as `materialCulture` on Soslan.
* **The Wacamongæ / Nartamongæ cup** — an object, and **already in the corpus**
  as a domain on `ossetian_satana`.

## Sourcing discipline

Source references record the **substance found** rather than a bibliographic
citation that was not read, following the house pattern established in lane 28.
Where a search result explicitly attributed a claim to a named work, that work is
named: **Dumézil's 1948 monograph *Loki*** for the Syrdon identification,
**Dumézil** on the iron wheel as an echo of the solar cult, and the
**Encyclopaedia Iranica** articles *ŠOŠLAN*, *ŠỊRDON* and *UASTYRDŽI*.

**Cyrillic script values are supplied only where the research actually returned
them** — Хуыцау, рæхыс, ацы, рухс, Мыкалгабыртæ. Every other record's term value
is left **empty** rather than reconstructed, and every unresolved etymology says
"not resolved in the sources consulted" instead of guessing. **Four of the
twenty-seven records carry a native form and twenty-three ship with an explicitly
empty one** — including Uastyrdzhi and Soslan, the two most important figures in
the batch. That is the rule — *do not invent values to make an entry look
complete* — applied where it costs something.

No image was ingested, so the image-licensing rule is not engaged.

## Verification

* `validate-transcripts.cjs` — **27 figures, clean on the first pass**, no
  problems and no RECIPROCAL-NEEDED warnings: every symmetric relation inside the
  batch is reciprocated, and every link to a pre-existing record uses a
  **non-symmetric** kind written from this end only.
* Full regeneration — all four generators, then `build.py --pages` **and** plain
  `build.py`.
* `verify-regen.sh` — byte-exact after commit.
* Record-level diff against the pre-lane corpus: **27 added, 0 removed, 0 mutated
  pre-existing.** No pre-existing record was touched by this batch, including the
  four it links to (`ossetian_batraz`, `ossetian_khaemyts`, `ossetian_satana`,
  `ossetian_dzerassae`) and the four cross-tradition counterparts.
* Four new figures have neither parents nor relations and were given written
  verdicts in `data-sources/verified-solitary.json` (Xucau, Uacilla, Alardy,
  Galægon) — each solitary **by the nature of its cult**, not by missing research.
* Lane 33's name-collision gate stays green: no new primary collides with another
  Ossetian primary, no new alias shadows another Ossetian primary, and the three
  cross-tradition hits are outside what the gate scopes, by design.
* `npm test` — full suite green.
