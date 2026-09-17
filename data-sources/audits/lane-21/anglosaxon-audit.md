# Lane 21 — Anglo-Saxon audit

Owner: `lane-21-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,473 total figures, 22 of them Anglo-Saxon.

Corpus: **6,473 → 6,510 figures**. Anglo-Saxon **22 → 59**.
Census: 124 rows — **37 ADD, 18 ALIAS, 22 EXISTING, 9 CROSS-TRADITION SAME
FIGURE, 18 REJECT, 20 BLOCKED**.

## The registry held Beowulf and not Grendel

A 91-name check across the whole registry returned 25 hits and 66 absences.

The corpus held **Beowulf**. It held his father **Ecgtheow**, his king
**Hygelac**, Hygelac's queen **Hygd**, Hygelac's father **Hrethel**, Hrethel's
three sons and unnamed daughter, Hygelac's son **Heardred**, and the two men who
are with Beowulf at the end, **Wiglaf** and **Weohstan**. Eleven records: the
whole Geatish royal house.

**It did not hold Grendel.** Nor Grendel's mother. Nor the dragon.

*Beowulf* is in three parts and each part is a fight with one of them. The
registry held the man who fights and not one of the three things he fights. This
is the programme's recurring finding in its sharpest form yet — sharper than
Sigurd without Fáfnir in lane 13, because there the corpus held one adversary
and here it held none.

## And it did not hold a single Dane

The poem is set in Denmark for two-thirds of its length, in a hall belonging to
a king the registry had no record for.

| absent | who |
|---|---|
| **Hrothgar** | the king whose hall the poem is about |
| **Wealhtheow** | his queen, who speaks twice in public about the succession |
| **Unferth** | who challenges Beowulf at the feast and lends him a sword |
| **Æschere** | whose death sends Beowulf into the mere |
| **Scyld Scefing** | the first person in the poem |
| **Beow**, **Healfdene** | the line between Scyld and Hrothgar |
| **Heorogar**, **Halga**, **Hrothulf**, **Freawaru** | the rest of the house |

**The corpus held one side of a poem about two courts.**

## The sword in the dragon fight belonged to a man the corpus did not hold

The registry held **Weohstan** and **Wiglaf**, father and son, and the dragon
fight they are in. It did not hold **Eanmund** — the exiled Swedish prince whom
Weohstan kills for Onela, whose sword and mail Weohstan takes and keeps for life,
and which Wiglaf is carrying when he walks into the barrow.

**The registry held the weapon's second owner and not its first.**

Nor did it hold **Ongentheow**, who kills the Haethcyn it held; nor **Onela**,
who kills the Heardred it held; nor **Eofor**, who wins Hygelac's battle for him;
nor **Eadgils**, whose war is the only one Beowulf fights that is not against a
monster. The Swedish wars are a substantial part of the poem by line count and
the corpus held four Geats of them and no Swede at all.

## Bede names two goddesses in one passage and the registry took one

The corpus held **Eostre**, whom Bede names in *De temporum ratione* as the
eponym of Ēosturmōnaþ.

It did not hold **Hretha**, whom Bede names in the same work, by the same
construction, a few lines away: Hrēþmōnaþ "is named for their goddess Hretha, to
whom they sacrificed at this time."

**Same author, same book, same sentence-pattern, same evidentiary standing.** The
difference between them is that one gave her name to Easter. That is lane 16's
mechanism in its purest form — a corpus that grows by adding the name people
know — and it is the cleanest instance this programme has found, because the two
goddesses are not merely comparable but *co-attested*.

Two more were missing on the same footing:

- **Erce**, called three times in the **Æcerbot** field-charm — *Erce, Erce,
  Erce, eorþan modor*. One word, three times, in one manuscript, and the only
  time an English earth-mother is called by name.
- **Ing**, four lines of the Old English Rune Poem: first seen among the East
  Danes, gone east over the wave, his wagon running after him. The sweep resolved
  "Ing" onto `norse_freyr`, because Yngvi is an alias there — **which is exactly
  why the English figure needed a record of his own.**
- **Geat**, of whom **Asser, King Alfred's own biographer, says the pagans long
  worshipped him as a god** — in a sentence written to explain the king's
  ancestry.

## A cross-tradition edge drawn on an event, not an equation

Lane 19 ingested **Vortigern** under the Welsh key. This batch ingests
**Hengist** and **Horsa**, the men the Anglo-Saxon Chronicle says he invited in
449, and draws the edge.

**This is the first cross-tradition relation this programme has written.**
Eighteen lanes have declined to join Nodens to Nuada, Ing to Yngvi, Mitra to
Mithra or Dyaus to Zeus, on the rule that a shared name is a fact about
languages and not a relation between beings. That rule is untouched. This is a
different kind of thing: **one event that two literatures record from opposite
sides**, with two different named people on the two ends. The corpus can now
state it from either.

## Two men named Hengest, and this batch asserts nothing about them

**Hengest** of the Finnsburg episode is a Danish retainer who takes a winter
truce with his lord's killer and breaks it in the spring. **Hengist** of Kent is
the Jutish leader who lands in Thanet. Tolkien argued at length that they are one
man; others do not.

Both are ingested, under **qualified ids**, each built only from its own sources
— nothing about Kent is on the Finnsburg record and nothing about Finnsburg is
on the Kentish one. They carry a `distinguished-by-this-registry-from` edge whose
note says in as many words that **it asserts only that the registry holds two
records and why**.

That is lane 19's two-Myrddins handling arrived at from the opposite direction:
there the tradition distinguished two figures and later scholarship merged them;
here the sources are separate and later scholarship proposes the merger.

## Three places where descent was deliberately not written

The tier in this corpus is computed from parentage, so `parentIds` is where a
claim about descent gets made. Three times this batch declined to make one:

1. **Hrothulf carries no parentIds.** The sources say he is generally taken to be
   Halga's son *on the strength of other texts*, and that *Beowulf* does not say
   so. Halga's record carries the claim as a `reputed-father-of` relation with
   the qualification inside the kind.
2. **Hengist carries no parentIds.** Bede's genealogy — son of Wictgils, son of
   Witta, son of Wecta, son of Woden — is on the record as prose. **A royal
   house's claim to descend from a god is a claim about a dynasty's legitimacy,
   not a fact about a father.** The same reasoning keeps Geat's genealogy off his
   record.
3. **Sceaf carries no edge to Scyld.** Whether "Scefing" makes Scyld his son, his
   descendant, or simply "of the sheaf" is precisely what the sources leave open.
   The two records sit side by side in the corpus with the same arrival story and
   nothing between them, which is the honest shape of the evidence.

## Zero pre-existing records mutated

Every symmetric relation is reciprocated in-batch: Hrothgar and Wealhtheow
`spouse`, Finn and Hildeburh `spouse`, Hildeburh and Hnæf `sibling`, Heorogar and
Halga `sibling`, Ohthere and Onela `sibling`, Eanmund and Eadgils `sibling`,
Hengist and Horsa `sibling`, and the two Hengests' mutual edge.

Every edge toward a pre-existing record is non-symmetric: `killed-by`, `killed`,
`hosted`, `challenged`, `contended-with`, `thegn-of`, `lord-of`, `fought-by`,
`supported-by`, `held-up-as-a-warning-to`, `sang-of`, `invited-by`.

## Type computed from descent, applied before authoring

Third lane running: **`npm test` passed 302/302 on the first run.** The three
monsters are `numen`, which this corpus respects as authored rather than
computing; everyone else is `mortal` and computes to it.

## What is not asserted

- **No identity between the two Hengests**, in either direction.
- **No identification of Erce with Nerthus**, whom the corpus holds under the
  Continental Germanic key.
- **No cross-tradition equations.** Ing beside `norse_freyr`, Weland beside
  `norse_volundr`, Fitela beside `norse_sinfjotli` — all recorded as census rows
  and none as edges.
- **No adjudication of the Breca race.** Unferth's account and Beowulf's differ
  on who won; the record gives both, because the poem stages the disagreement on
  purpose.
- **No claim that Hengist and Horsa existed.** The sources say the ninth-century
  account of them says more about the ninth century than about the fifth, and the
  record dates the entries rather than the men.
- **No description of what Grendel looks like.** The poem withholds it.

## Twenty BLOCKED

**Wyrd is the row this lane thought hardest about.** The word is fate, it is
grammatically feminine, and its Norse cognate *urðr* is a Norn's name. The
sources say directly that scholarship divides: some read Wyrd as a pre-Christian
goddess, others deny a pagan signification in the Old English period while
allowing she may have been a deity earlier. **Whether there is a figure under the
word is the disputed question**, and ingesting her would take a side. Lane 20
blocked Jumala on the same ground.

**Sigemund is lane 20's Turisas again.** He is named in *Beowulf* as a
dragon-slayer with Fitela beside him; the corpus holds `norse_sigmund` and
`norse_sinfjotli`. Ingesting an English Sigemund risks duplicating a held figure;
declining loses an English attestation that is older than the Norse one. Blocked
rather than decided.

**Seven unnamed people are blocked and one was ingested**, and the difference is
worth stating. Grendel's mother is ingested under the phrase the poem uses,
because the poem uses it consistently as her designation. Healfdene's daughter is
not, because the treatments name her Yrse in one place and leave her unnamed in
others — **a disagreement about a name is a different problem from a consistent
silence**, and only the second one this registry can file. The same line keeps
out Ongentheow's wife and Hildeburh's son.

**Hondscio** is the strongest plain ADD held for a citation: the one man Grendel
eats on stage, and the only one of his victims the poem names.

## A sweep-tool finding, third instance

Lane 18 found that the corpus files "The Dagda" with its article and the
normaliser does not strip it. Lane 20 reproduced it with "Maiden of Pohjola".
**This lane found the third variant**: `Wayland` returned ABSENT while `Weland`
hit, because the record is filed as **"Wayland the Smith"** — a trailing epithet
rather than a leading article. The tool matches whole normalised names; it should
also match on a record's name-parts.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 37 figures, no outstanding
  reciprocals
- sweep run twice: 91 names first (25 hits, 66 absences), then **120 names after
  generation — 70 hits, 50 absences**, all 37 new records resolving
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**
- `npm test` → **302/302**, first run
- record-level diff against the previous head: **37 added, 0 removed, 0
  pre-existing records mutated**
- zero dangling references, zero era inversions, zero tier-classification drift
- **five new verified-solitary verdicts**: Hretha, Erce, Ing, Geat and Sceaf are
  each attested by a single notice that gives a function and no kin
- README and `package.json` counts refreshed to 6,510 / 560 / 5,405 / 7,929 /
  3,198

## Status: PARTIAL

Anglo-Saxon goes from 22 to 59, and for the first time the corpus holds both
sides of *Beowulf*, the Swedish wars, the Finnsburg episode, and three gods
attested by Bede, Asser and a field-charm.

What remains: **Hondscio**, **Wulfgar**, **Hrethric and Hrothmund**, **Wulf** and
the other named minor Danes and Geats; the **Offa and Thryth** digression, which
is a textual crux before it is an evidence gap; **Widsith**, the fifth candidate
for the framing-narrator pattern; and **Continental Germanic**, which holds eight
records — all of them goddesses from Roman-era altars — and none of Tacitus's
**Tuisto** and **Mannus**, and which shares a great deal of this batch's material
under other names.
