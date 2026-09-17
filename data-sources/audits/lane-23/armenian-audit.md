# Lane 23 — Armenian audit

Owner: `lane-23-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,536 total figures, 23 of them Armenian.

Corpus: **6,536 → 6,558 figures**. Armenian **23 → 45**.
Census: 93 rows — **22 ADD, 12 ALIAS, 23 EXISTING, 9 CROSS-TRADITION SAME
FIGURE, 12 REJECT, 15 BLOCKED**.

## The corpus held Hayk and not Bel

A 68-name check across the whole registry returned 28 hits and 40 absences.

**Hayk was in the registry. Bel was not.**

The founding act of the Armenian nation, as Movses Khorenatsi tells it, is a
single arrow. Hayk refuses to submit to Bel, the tyrant of Babylon; Bel follows
him north with an army; Hayk draws a wide bow and shoots him through the breast;
and the people take their name — *Hay* — from the man who fired it.

**The corpus held the archer and not the target.** Eleven traditions running, the
same shape.

It also held **Vahagn Vishapakagh**, "Vahagn the Dragon-reaper", and no dragon.
**Azhdahak** is now in the corpus.

And it held Hayk without **Torgom**, his father — the point at which the Armenian
genealogy joins the biblical line from Noah through Japheth, and the name behind
"the house of Togarmah".

## The pantheon was held at four

The `pantheon-era` bucket contained **Aramazd, Anahit, Astghik and Vahagn**, and
nothing else. This batch adds eight:

| | |
|---|---|
| **Mihr** | god of light, heaven and the sun; the Garni temple is his |
| **Nane** | goddess of motherhood, war and wisdom, with spear and shield |
| **Tir** | god of learning and writing, and the interpreter of dreams |
| **Barsamin** | the weather and sky god |
| **Vanatur** | the New Year god of Navasard |
| **Spandaramet** | god of the underworld |
| **Tork Angegh** | the giant who scratches pictures into rock with his nails |
| **Grogh** | "the writer", who settles what becomes of a person |

**Vanatur costs the most.** One account makes him the supreme god of the pantheon
*before Aramazd replaced him* — so the corpus held the replacement and not the
god it is said to have replaced.

**Mihr is the one with the longest reach.** His name becomes Armenian *Mher*, and
the corpus already held **Mher the Elder** and **Mher the Younger** of the Sasna
Tsrer, a thousand years downstream — and did not hold the god they are named
after.

## A registered era with nobody in it — the third case

The Armenian vocabulary registers five eras. Two held nothing.

| era | before | after |
|---|---|---|
| `pantheon-era` | 4 | 12 |
| `haykazuni-mythohistorical` | 12 | 18 |
| `arsacid-historical` | **0** | **4** |
| `medieval-sasna-tsrer` | 7 | 11 |
| `modern-collection` | **0** | **0** |

Lane 19 found six empty registered eras in the Welsh vocabulary and lane 20 found
one in the Finnish. This is the third tradition in five lanes.

`arsacid-historical` is the span of the **Vipasankʻ** — the epic Khorenatsi quotes
and says the minstrels of his own day were still singing. Artashes rides out on a
black charger and throws a red leather cord with a golden ring round the waist of
the Alan princess Satenik; it rains gold when he becomes a bridegroom and pearls
when she becomes a bride; Argavan lays a feast as a trap; and Artashes curses his
own son. **The era now holds four records.**

`modern-collection` still holds none, **and this batch declines to fill it.** It
is the era of **Garegin Srvantdziants**, who wrote the Sasna Tsrer down in 1873.
Lane 20 made the same decision about Elias Lönnrot and lane 21 about Bede and
Asser: a collector is not a figure of the tradition, and an era left empty with
the reason recorded is better than an era filled with a scholar.

## The era label is wrong, and the records say so

`arsacid-historical` is this vocabulary's only bucket for the historical period —
and the Artashes of the tradition is identified with **Artaxias I, an Artaxiad,
not an Arsacid.**

The four Vipasankʻ records are filed there because it is the only era that can
hold them, and because the alternative — filing a second-century BCE king under
`haykazuni-mythohistorical` with Hayk — would be worse. **The mislabel is stated
on Artashes's own record and escalated rather than fixed.**

Lane 22 extended a tradition's era vocabulary where the case was unambiguous: the
Continental Germanic list had a *gap*, and two keys closed it without moving
anything. This is a different problem. **A wrong label on an existing era is the
owner's call**, because renaming it touches every record already filed under it,
and this batch will not do that silently.

The sources add a second wrinkle, which is on Satenik's record: the historical
layer under the Artashes-and-Satenik story is probably **the Alan invasion of the
first century AD**, not the second-century BCE king the epic attaches it to. The
era problem is therefore not only a label.

## Four generations of men and one woman

The corpus held seven records of the house of Sassoun: Sanasar, Baghdasar, Mher
the Elder, David of Sassoun, Mher the Younger, Misra Melik and **Tsovinar**, who
conceives the twins by drinking from a spring.

**Tsovinar was the only woman in it.** **Armaghan**, who is Mher the Elder's wife
and David's mother, and **Khandut**, who is David's wife and Mher the Younger's
mother, were both absent — the two who carry the line through the generations
after her.

That is lane 16's mechanism exactly, the one that lost Kaikeyi: a corpus that
reaches a woman through a son it already holds, and stops where the son's mother
has no story of her own attached. Tsovinar has one — the spring — and the other
two are known as somebody's wife and somebody's mother.

Also missing: **Keri Toros**, the "immutable" mentor the sources say is in all
four branches, and **Dzenov Ohan**, David's uncle, **a hero whose epithet is a
noise**.

## Tigranuhi is the fourth peace-weaver, and the only one it works for

Azhdahak marries **Tigranuhi**, Tigran's sister, *in order to* have a way of
getting her brother into Media and killing him there. She tells her brother.

This programme has now met four women married across a border to make a peace
that is a trap: **Freawaru** (lane 21), whose marriage Beowulf predicts will
fail; **Hildeburh** (lane 21), whose has already failed in front of her;
**Creiddylad** (lane 19), fought over every May Day until Judgement Day; and
Tigranuhi. **She is the only one of the four whose warning works.**

Her name is her brother's with the Armenian feminine suffix on it, which the
record states in the etymology because it is what the tradition did.

## Three decisions about type and status

- **Azhdahak is `mortal`, not `numen`.** The older layer makes him a dragon and
  Khorenatsi makes him a king of Media. The record states the dragon layer in its
  lifecycle and its etymology and files the king, because that is what the
  retrieved evidence supports as a biography.
- **Grogh is `numen`, not `deity`.** The sources name an entity with an act and
  give it no cult and no household. Lane 21 *blocked* Wyrd on a neighbouring
  question — there the scholarship divided on whether there was a figure at all;
  here the sources name a being, and the record holds it at exactly that strength.
- **Artavazd's `vitalStatus` is `living`, and that is the point of him.** The
  tradition does not say he died. It says he is chained in a chasm under Masis,
  that his dogs gnaw at the links, that his escape would end the world, and that
  the smiths strike their anvils at New Year to keep the chains whole. That last
  is on his `cultRecords`.

## Zero pre-existing records mutated

Every symmetric relation is reciprocated in-batch: Artashes and Satenik `spouse`,
Azhdahak and Tigranuhi `spouse`, Tigran and Tigranuhi `sibling`.

Every edge toward a pre-existing record is non-symmetric — and there are ten of
them, which is the most this programme has written toward one tradition's
existing holdings in a single batch: `killed-by` Hayk, `father-of` Hayk,
`descendant-of` Hayk, `last-of-the-line-of` Hayk, `displaced-by` Aramazd,
`child-of` Aramazd (twice), `mentor-of` and `uncle-of` and `married` and
`mother-of` into the house of Sassoun.

**`child-of` is deliberately a relation and not `parentIds`** on Mihr and Nane.
The sources give the filiation as a *position in a pantheon* rather than as a
genealogy, and in this corpus `parentIds` drives the computed tier — so a
pantheon's internal ordering would silently become a claim about descent.

## What is not asserted

- **No cross-tradition edges**, for the seventh lane running: Mihr beside
  `zoroastrian_mithra`, Azhdahak beside `zoroastrian_azhi_dahaka`, Spandaramet
  beside Spenta Armaiti, Bel beside `mesopotamian_marduk`, Barsamin beside
  `phoenician_baalshamin`. **Every one of these five is a name that travelled**,
  and every one is recorded in an etymology rather than as a relation.
- **The ancient equations are recorded as equations.** Tir with Apollo,
  Spandaramet with Hades — the handling lane 22 gave Tacitus's Mercury and the
  Alcis.
- **Tork Angegh is one record, not two.** The sources say the figure is two
  deities run together — the Anatolian Tarku and a god of the province of Angegh
  — and that compound reading is on the etymology. One name with one biography is
  what the tradition has. The onward comparison to Thor and Týr, which the
  sources call conceivable, is not carried onto the record at all.
- **Amanor and Vanatur are one record with two names**, and the record keeps the
  sources' own *"possibly the same god"* rather than hiding it.

## Twelve REJECT, and one of them hurts

**The aralez are rejected**, and they are the most distinctive thing in Armenian
mythology: winged dog-like spirits who come down to lick a dead hero's wounds and
bring him back, and whom Shamiram calls on for Ara. They are **a collective of
unnamed beings**, on the ground that rejected the Cwn Annwn in lane 19 and the
Matronae in lane 22 — and the corpus holds both principals of the story they
belong to and still cannot state it.

**The dogs of Artavazd** are rejected on the same rule that has now turned away
five horses, two hounds and Balder's foal, and here it costs the record its
most-told detail, which the lifecycle carries as prose instead.

## Fifteen BLOCKED

**Trdat III and Gregory the Illuminator** are the interesting pair: a king the
tradition turns into a boar until a bishop heals him, and the bishop, thirteen
years in a pit. **Whether this registry holds a historical person with a
transformation story attached is a question about where the Lönnrot line falls,
not an evidence gap** — and it is the question `modern-collection` and
`arsacid-historical` both raise from their own ends.

**Vahagn's birth-song** is blocked as a text: four lines Khorenatsi quotes — the
reed in the sea, the flame, the smoke, the youth with hair of fire — which are
**the oldest surviving Armenian poetry**, and which the corpus holds the subject
of without them.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 22 figures, no outstanding
  reciprocals
- sweep run against both heads with the same 68-name list: **before 28 hits / 40
  absences, after 51 hits / 17 absences**, all 22 new records resolving
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**
- `npm test` → **302/302**, first run, the fifth lane running
- record-level diff against the previous head: **22 added, 0 removed, 0
  pre-existing records mutated**
- zero dangling references, zero era inversions, zero tier-classification drift
- **four new verified-solitary verdicts**: Tir, Barsamin, Spandaramet and Grogh
  are each given a province and no kin
- README and `package.json` counts refreshed to 6,558 / 560 / 5,412 / 7,929 /
  3,198

## Status: PARTIAL

Armenian goes from 23 to 45, the pantheon from four to twelve, and an empty
registered era to four records. For the first time the corpus holds both sides of
the founding arrow, the dragon Vahagn is named for reaping, and the women of the
house of Sassoun.

What remains: **Yervand and Yervaz**, **Kadmos** and **Shara** of the Haykazuni
line; **Gohar** and **Ismil Khatun** of the Sasna Tsrer; **Trdat and Gregory**
once the line on historical figures with legends attached is settled; and the two
era questions this lane escalates — the `arsacid-historical` mislabel, and an
empty `modern-collection` that should probably not be filled at all.
