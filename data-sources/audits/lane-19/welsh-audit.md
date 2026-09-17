# Lane 19 — Welsh audit

Owner: `lane-19-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,421 total figures, 40 of them Welsh.

Corpus: **6,421 → 6,446 figures**. Welsh **40 → 65**.
Census: 98 rows — **25 ADD, 14 ALIAS, 26 EXISTING, 5 CROSS-TRADITION SAME
FIGURE, 10 REJECT, 18 BLOCKED**.

## Six registered eras in a row held nothing

The Welsh era vocabulary has **nine** eras. The corpus held records in **three**.

| era | before | after |
|---|---|---|
| `mythic-prehistoric` | 9 | 13 |
| `mabinogion-mythological` | 30 | 31 |
| `mythological-cycle` | 1 | 1 |
| `roman-british` | **0** | **2** |
| `post-roman` | **0** | **18** |
| `norman-and-edwardian` | 0 | 0 |
| `late-medieval` | 0 | 0 |
| `early-modern` | 0 | 0 |
| `modern` | 0 | 0 |

Lane 18 found one empty registered era — `fenian-cycle` — and called it the
clearest statement a corpus can make about what it is missing. **This lane found
six in a row**, and they are not a random tail: they are exactly the span the
Welsh Arthurian material lives in. *Culhwch ac Olwen*, the Triads, the Three
Romances, the Dream of Macsen, the Myrddin poems — everything after the Four
Branches — had nowhere to be and nobody in it.

Two of the six now hold records. Four remain empty and are flagged forward.

## The registry did not hold Arthur

A registry indexing 560 traditions and 6,421 figures did not hold **Arthur**.

Nor **Cai**, nor **Bedwyr**, nor **Gwenhwyfar**, nor **Medrawd**. Nor
**Culhwch** or **Olwen**, whose tale is the oldest Arthurian story in any
language. Nor **Myrddin**, in either of the two forms the tradition
distinguishes.

An 83-name check across the whole registry returned 33 hits and 50 absences.
The 33 hits are almost entirely the Four Branches, which the corpus held nearly
complete — the Welsh holdings were not thin, they were **one text deep**.

Arthur is ingested from the **Welsh** material: the Triads, the Annales
Cambriae entry for Camlann, *Culhwch ac Olwen*, and the poem *Pa Gur*. Not from
Geoffrey of Monmouth and not from the French romances, which are a different
body of literature about a figure with the same name. The distinction is on the
record.

## The same fault as everywhere else, inside the layer the corpus did hold

The programme's recurring finding — the registry holds the famous name and not
the thing it is defined against — recurs three times **inside the Mabinogi
material the corpus already held well**:

- **Arawn without Hafgan.** The corpus held Arawn, king of Annwn, and Pwyll,
  who takes his shape for a year and a day. The only thing that happens in that
  year is that Pwyll kills **Hafgan**, Arawn's rival, with a single blow —
  because a second blow would heal him. The corpus held the swap and not the
  reason for it.
- **Ceridwen without Morfran.** The corpus held Ceridwen, the cauldron, Tegid
  Foel the father, and **Taliesin — the servant the three drops landed on by
  accident.** It did not hold **Morfran**, the son the year of brewing was for.
  Nor **Creirwy**, the beautiful daughter Morfran's ugliness is measured
  against. *The registry held the beneficiary of an accident and not the
  intended recipient.*
- **Gwyn ap Nudd held with an empty relations array.** His one story is that he
  and **Gwythyr** fight for **Creiddylad** every May Day until Judgement Day.
  The corpus held neither combatant's opponent nor the woman. An empty relations
  array on a figure whose entire tradition is a relationship is the record-level
  version of the empty era.

And **Mabon ap Modron** — one of the oldest divine names attested in Britain,
the Romano-British *Maponos* in Welsh dress, the greatest huntsman there is —
was absent.

## Two Merlins, and the tradition says so itself

This batch ingests **two records** where the popular tradition has one.

By the end of the twelfth century **Giraldus Cambrensis distinguishes them in as
many words**: *Merlinus Ambrosius*, found at Carmarthen, fatherless, who
prophesies the two dragons before Vortigern; and *Merlinus Silvester* or
*Celidonius*, a northerner, contemporary of Arthur, driven mad at the battle of
Arfderydd and living out his life in the Caledonian forest. **Geoffrey of
Monmouth combined them**, and the combined figure is the one the world knows.

A registry that indexes traditions should be able to say that. So:

- `welsh_myrddin_emrys` and `welsh_myrddin_wyllt` are two records.
- They carry a **`distinguished-by-the-sources-from`** edge to each other —
  symmetric, reciprocated in-batch.
- **Neither record asserts they are the same person and neither asserts they
  are not.** The merger is recorded as a fact about the sources.

"Merlin" is a census **ALIAS** row spanning both, and it is the first alias row
in this programme that spans two records rather than sitting on one.

## Gwenhwyfach, and a Camlann with no Lancelot in it

Triad 53 names the blow **Gwenhwyfach** struck her sister **Gwenhwyfar** as one
of the Three Harmful Blows of the Island of Britain, and makes it the cause of
the battle of Camlann.

That is a Welsh account of the end of Arthur's court **in which the adultery
does not appear at all** — no Lancelot, no Medrawd-as-seducer, a quarrel between
two sisters. The Annales Cambriae entry, which this batch also carries, says
only that Arthur and Medrawd fell at Camlann; **it does not say they fought each
other.** Both records carry the entry and not the later reading.

The corpus now holds a version of Camlann older than the one it would have got
from a Galfridian source, and holds **Gwenhwyfach**, who exists for no other
reason.

## The boar is ingested; the birds and the hounds are not

**Twrch Trwyth** is ingested on the ground lane 18 stated when it took the two
bulls of the Táin and rejected five named horses. He is **a king transformed
into a boar for his sins**; he is named in the *Historia Brittonum* three
centuries before *Culhwch*; he carries comb, razor and shears between his ears;
he speaks; and the hunt across Ireland, Wales and Cornwall costs Arthur most of
his men. That is a figure with a history, not an animal with an owner.

**Adar Rhiannon** and the **Cwn Annwn** are rejected in the same batch, because
they are collectives of unnamed animals — the rejection lane 18 applied to Bran
and Sceolang.

## Zero pre-existing records mutated — and the cost, for the fourth lane running

Every symmetric relation in this batch is reciprocated inside it. Every edge
toward a pre-existing record uses a non-symmetric kind: `lord-of`, `sworn-to`,
`rescued`, `slew`, `struck`, `taken-by`, `rival-of`, `slain-by`,
`supplanted-by`, `prophesied-before`, `of-the-court-of`.

The cost lane 17 named and lane 18 paid twice is paid again here, and this time
it costs a **betrothal and a marriage**:

- **Creiddylad `taken-by` Gwyn ap Nudd**, because `welsh_gwyn_ap_nudd` is
  pre-existing and cannot be given the reciprocal.
- **Gwythyr `perpetual-adversary-of` Gwyn ap Nudd**, where the honest kind is
  `rival` and it is symmetric.
- **Creiddylad's father is `welsh_lludd_llaw_eraint`**, who is pre-existing, so
  she names him in a relation and **not in `parentIds`** — the same asymmetry
  lane 15 found with Sohrab and lane 16 with Kaikeyi and Bharata.
- **Morfran and Creirwy carry `parentIds: ["welsh_ceridwen"]` and not Tegid
  Foel**, who is pre-existing; his fatherhood is on their records as prose and
  in a relation, not in descent.

Four lanes have now reported this. It is no longer an observation; it is a
structural property of an append-only corpus, and it is **escalated again**.

## Type computed from descent, applied before authoring

Lanes 16, 17 and 18 each lost a test cycle to tier-classification drift. This
lane applied the rule up front: **`type` is a function of parentage, not a
description of status.** Morfran and Creirwy are `demigod` because Ceridwen is a
deity and Tegid Foel is not; Arthur, Cai, Bedwyr, Culhwch, Olwen, Gwenhwyfar,
Medrawd, the two Myrddins, Vortigern, the three Romance heroes, Macsen and Elen
are all `mortal`.

**`npm test` passed 302/302 on the first run.** Four lanes to internalise a rule
the test suite states precisely, and the fix is free once it is applied before
authoring rather than after testing.

## What is not asserted

- **No identity between Myrddin Emrys and Myrddin Wyllt**, in either direction.
- **No identification of Myrddin Emrys with Ambrosius Aurelianus**, though the
  name invites it. Whether the boy-prophet is a doubling of Gildas's Ambrosius
  is exactly the question the sources leave open; Ambrosius is BLOCKED and
  carries no edge.
- **No identity between Elen Luyddog and Saint Helena.** Welsh tradition
  conflates them; they are a fourth-century empress and the wife of Magnus
  Maximus, and the record says the conflation exists rather than adopting it.
- **No cross-tradition edges.** Nodens, Nuada and Nudd are one name in three
  languages; Manawydan and Manannán, Llyr and Lir likewise. A shared etymology
  is a fact about traditions and not a relation between beings — the rule since
  lane 13. **Maponos** is recorded on Mabon's own etymology rather than as a
  second record.
- **No account of what the Twrch Trwyth's sin was.** The tale does not say.

## Eighteen BLOCKED

**Modron is the one that costs the most.** This batch ingests **Mabon ap
Modron** — a name that *means* "Son, son of Mother" — and does not hold the
Mother. The patronymic is half the record's significance and the other half is
missing. It is lane 18's Macha exactly: the corpus holds the consequence and not
the cause.

Six more are strong ADDs held only for a citation, and all six are in *Culhwch*:
**Glewlwyd Gafaelfawr**, the porter whose doorway dialogue opens the tale;
**Gwrhyr Gwalstawd Ieithoedd**, who speaks to every animal in the Oldest Animals
sequence; **Menw fab Teirgwaedd**, the shape-shifter who takes the shears from
between the boar's ears; **Custennin** and **Goreu**, without whom this batch
ingests Ysbaddaden and cannot narrate his death; and **Cilydd and Goleuddydd**,
who would give `welsh_culhwch` real `parentIds`.

The northern Myrddin material is blocked nearly entire — **Gwenddydd**,
**Gwenddoleu**, **Rhydderch Hael** — which means the corpus holds Myrddin Wyllt
and not the battle that maddens him or the sister the poems are addressed to.

And **Cynon fab Clydno**, who tells the story of the fountain before Owain rides
out, is **the third framing narrator this programme has found missing in three
lanes** — after Sanjaya and the *Bhagavad Gita* in lane 17 and Oisín and the
*Acallam* in lane 18. Three unrelated traditions, three literatures whose
narrator the registry did not hold. This one is BLOCKED rather than ingested,
which is the honest disposition and also the unsatisfying one.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 25 figures
- sweep run twice: 83 names first (33 hits, 50 absences), then **121 names after
  generation — 60 hits, 61 absences**, all 25 new records resolving
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**
- `npm test` → **302/302**, first run
- record-level diff against the previous head: **25 added, 0 removed, 0
  pre-existing records mutated**
- zero dangling references, zero era inversions, zero unverified kinless
  figures, zero tier-classification drift
- README and `package.json` counts refreshed to 6,446 / 560 / 5,389 / 7,929 /
  3,198

## Status: PARTIAL

Welsh goes from 40 to 65 and from one text deep to five. What remains, in order
of how badly it is missed: **Modron**; the rest of *Culhwch*'s named band; the
northern Myrddin cycle; **Urien Rheged** and the Taliesin praise-poetry, which
would give the corpus a historical sixth-century layer it has none of; **Enid**,
**Luned** and the Lady of the Fountain, so the Three Romances hold their women;
and the four Welsh eras that are still empty — `norman-and-edwardian` and later,
which is where **Owain Glyndŵr**, the Tylwyth Teg material and the folklore
collections live.
