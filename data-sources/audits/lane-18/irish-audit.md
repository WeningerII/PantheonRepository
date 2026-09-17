# Lane 18 — Irish audit

**Status: PARTIAL.** Corpus 6,393 → 6,421 figures. Irish 43 → 71 records.

Census: 88 rows — **28 ADD, 6 ALIAS, 25 EXISTING, 3 CROSS-TRADITION SAME FIGURE,
7 REJECT, 19 BLOCKED**. Full rows in `irish-census.tsv`; the records in
`data-sources/transcripts/irish-expansion.txt`.

## The registry had an era registered for the Fenian Cycle and not one figure in it

`fenian-cycle` is the sixth era in the Irish vocabulary. **Nothing was filed
there.**

The Fenian or Fianna Cycle is one of the four great cycles of Irish literature.
It is the one that survived longest in living oral tradition on both sides of
the Irish Sea. The corpus held **no Fionn mac Cumhaill**, no **Oisín**, no
**Oscar**, no **Diarmuid**, no **Gráinne**, no **Caoilte**, no **Niamh**, no
**Sadhbh**.

**An empty registered era is the clearest statement a corpus can make about what
it is missing**, and this programme has now found two: lane 15 found the
Zoroastrian vocabulary registering nothing between `primordial` and `legendary`
for a tradition with a Sasanian history; this one found an era with a name, a
position in the order, and nobody in it. **The `fenian-cycle` era now holds 13
records.** `early-christian`, which also held nothing, now holds Saint Patrick.

The census flags **`cycles-of-kings`** as the next of these: it holds three
records for a cycle with a king-list.

## The Táin is a story about a bull and the corpus did not hold the bull

The registry held Medb, Ailill, Cú Chulainn, Fergus, Ferdiad and Findabair —
everyone who fights over **Donn Cúailnge**, the Brown Bull of Cooley — and
neither him nor **Finnbhennach**, the white-horned bull of Connacht.

Medb and Ailill's pillow talk is about whose wealth is greater. Ailill has the
white bull. Medb has nothing to match it, because the only bull of that caliber
is in Ulster. She raises an army. At the end the two bulls fight each other
across the whole of Ireland in a battle that reshapes the landscape; the Brown
Bull kills the white one, and then goes mad from its wounds and dies.

**These two are ingested where five named horses were rejected** in lanes 13, 14,
15 and 17 — and on the ground those rejections stated. Sleipnir's companions,
Rakhsh and Sivka-Burka were identified by a name and an owner. These two have a
quarrel of their own, fight it out, change the map doing it, and kill each other.
The war is fought to acquire them and ends when they have settled it themselves.

## The two trios the corpus held one third of

**Ernmas**, whom the corpus holds, is the mother of two trinities:

| trio | held | absent |
|---|---|---|
| the eponymous goddesses | **Ériu** | **Banba**, **Fódla** |
| the war goddesses | **the Mórrígan** | **Badb**, **Macha** |

The corpus held the mother and one daughter from each. And the mechanism is
lane 16's: **Ériu is the one modern Éire is named after, and the Mórrígan is the
famous one.** A registry that grows by adding the name people know will produce
exactly this shape, twice, in one tradition.

**Macha is the one that costs the most.** Her curse is why the men of Ulster lie
helpless through the Táin and why Cú Chulainn — whom the corpus holds — has to
fight the entire war by himself. That is a BLOCKED row for want of a citation.
The corpus holds the consequence and not the cause, again.

## Everything else missing had the same shape

- **No Deirdre**, in a corpus holding Conchobar, who wants her, and Fergus, who
  goes into exile over how the wanting ends. And no **Naoise**, and no
  **Cathbad** — the corpus held an entire Ulster court and no druid, in a
  literature where the druid tells everyone what is going to happen and is
  always right.
- **Dian Cécht without Miach and Airmed**, who are the reason **Nuada** — held —
  gets a working hand and his kingship back.
- **Nuada restored without Bres**, the half-Fomorian king whose ungenerous reign
  fills the gap and whose deposition starts the second battle of Mag Tuired. He
  is the most interesting political figure in the material: **a king deposed for
  meanness**, in a literature where a king's first duty is hospitality.
- **No Amergin**, who leads the Milesians and is the man the three goddesses name
  the island to. With his edge, the corpus's Ériu is finally connected to the
  event she is famous for.

## The frame of the whole cycle was missing, all three people in it

Two of the Fianna outlive their world and meet the man who ends it: **Saint
Patrick** sits with **Oisín** and listens to his story, and baptises
**Caoilte**. That is not a coincidence of two tales — it is the frame of the
*Acallam na Senórach*, the twelfth-century Colloquy of the Ancients, in which
the survivors walk around Ireland with Patrick naming places and telling him
what happened at each. **It is how most of the Fenian Cycle survives**, and the
corpus held none of the three people in it.

Oisín is also the *narrator* of the cycle, which is the fault lane 17 found one
day earlier with **Sanjaya and the Bhagavad Gita**: the framing device of a body
of literature is itself a character, and the registry held neither the character
nor the literature. Twice, in two unrelated traditions.

The Patrick record is **the Patrick of this literature and says so on its face**.
The Confessio, the fifth century and the question of how many Patricks there were
are not on it, because the treatments consulted are of Irish legendary material.
A later pass with hagiographical sources can deepen the record; it should not
have to create it.

## One correction the test suite forced — the third lane running, and the same one

**Fionn** was authored `demigod`, which is how the tradition treats him. `npm
test` rejected it as tier-classification drift: this corpus computes the tier
from **descent**, and his father Cumhall is a mortal. **Oscar**, two generations
down from a demigod father, computes `quartigod`.

Lane 16 hit this with Ashwatthama, lane 17 with Shani, and now lane 18 with two
records at once. **The rule is now understood and should be applied before
authoring rather than after testing:** in this schema `type` is a function of
parentage, not a description of status, and a figure's tier is settled by who
its parents are *in this corpus*.

## Two things this lane could not express, both escalated

**1. The geis.** It is the machinery of the entire Fenian Cycle — a binding
obligation that makes a person act against their own interest — and this registry
has no field for it. Diarmuid is under one to take Gráinne and another never to
hunt a boar, and both of them kill him. It is not a relation, not a domain and
not an item. **Escalated to the owner as a schema question**, alongside lane 17's
question about a relation kind for identity across rebirths.

**2. The sovereignty and war trios could only be half-joined.** Banba and Fódla
carry a symmetric `sibling` edge to each other and a non-symmetric
`one-of-the-three-with` to Ériu; Badb and Macha the same toward the Mórrígan.
The honest kind in both cases is `sibling`, and it cannot be used, because Ériu
and the Mórrígan are pre-existing records and a symmetric edge would mutate
them. **This is exactly the cost lane 17 named** — each lane's additions become
the next lane's immovable objects — and it is the first time it has cost the
data a genuine sisterhood rather than a rivalry. Both records say so in their
edge notes.

## A sweep-tool finding, recorded so the next lane does not repeat it

Two names returned ABSENT from the 81-name check that are in fact present:
**the Dagda** and **the Morrígan**. The corpus files them with the definite
article and the sweep's normaliser does not strip it — two false absences out of
ten hits, a 20% error rate on the hit side. **A sweep over this tradition should
strip a leading "the".** This is a property of the tool, not of the corpus, and
it is in the census as a row.

The genuinely false hit was **"Net" matching `egyptian_neith`**.

## One within-tradition id collision, handled as in lanes 16 and 17

`irish_donn_cuailnge`, because the corpus already holds `irish_donn`, the god of
the dead. Qualified id, qualifier in the primary name, no silent merge. The
census flags a second one waiting: **the Aoife of the Children of Lir is not the
`irish_aife` of the Ulster Cycle**, and whoever ingests her will need a qualified
id too.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 28 figures
- sweep run twice: 81 names first (10 hits, 71 absences), then **140 names after
  generation — 62 hits, 78 absences**, all 28 new records resolving
- full regeneration, then `scripts/verify-regen.sh` → byte-exact
- `npm test` → 302/302
- record-level diff: 28 added, 0 removed, **0 pre-existing records mutated**
- zero dangling references, zero new era inversions, zero unverified kinless
  figures, zero tier-classification drift
- README and `package.json` counts refreshed to 6,421 / 560 / 5,380 / 7,929 /
  3,198

## Status: PARTIAL

The next Irish block is the rest of the **Ulster Cycle principals** — Cú Roí,
Conall Cernach, Lóegaire Búadach, Bricriu, Laeg and **Fedelm**, who tells Medb
"I see it crimson, I see it red" before the army marches — and **Dáire mac
Fiachna**, the bull's owner, whom this batch ingests the bull without.

Then **Étaín, Fuamnach and Eochaid Airem**, because the corpus holds Midir and
none of the three people his story is with; the **earlier invasions** of the
Lebor Gabála, of which this batch ingests only the last; the **Cycles of Kings**,
which is the next near-empty registered era; and the **Children of Lir**, where
the corpus holds Lir and neither the wife who transforms his children nor the
daughter who leads them for nine hundred years.

And, for whoever has the sources: **the curse of Macha**, **Airmed's herbs** and
**Dian Cécht's killing of Miach** — three episodes this batch ingests every
participant of and cannot narrate.
