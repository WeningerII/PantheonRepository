# Lane 24 — Korean audit

Owner: `lane-24-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,558 total figures, 13 of them Korean.

Corpus: **6,558 → 6,586 figures**. Korean **13 → 41**.
Census: 87 rows — **28 ADD, 12 ALIAS, 13 EXISTING, 8 CROSS-TRADITION SAME
FIGURE, 12 REJECT, 14 BLOCKED**.

## Nine registered eras, six of them empty

A 68-name check across the whole registry returned **21 hits and 47 absences**.

| era | before | after |
|---|---|---|
| `primordial` | 3 | 3 |
| `mythic-prehistoric` | 4 | 4 |
| `gojoseon` | **0** | **0** |
| `mythic` | 6 | 18 |
| `three-kingdoms` | **0** | **14** |
| `unified-silla` | **0** | **2** |
| `goryeo` | **0** | **0** |
| `joseon` | **0** | **0** |
| `modern` | **0** | **0** |

**Everything from the Three Kingdoms onward was empty.** Two of the six are now
filled; four are not, and the census says which figures would fill each.

There is a smaller oddity worth stating: **`gojoseon` holds nobody, and the
corpus holds Tangun** — the founder of Gojoseon — filed at
`mythic-prehistoric`. The registry has an era named for a kingdom and files that
kingdom's founder outside it.

## The corpus held one of the four foundation myths and none of the other three

The *Samguk Yusa* exists to record the state-foundation myths, and there are four
of them. The registry had **Goguryeo complete** — Haemosu, Habaek, Yuhwa, Jumong,
Yuri — and **not one figure from Silla, Gaya or Baekje**.

- No **Bak Hyeokgeose**, hatched from a heavenly egg, nor **Aryeong**, born of a
  water dragon at the well she is named after. The sources set the two births
  against each other as complementary opposites, one out of the sky and one out
  of the water — **a symmetry a registry can only show if it holds both halves,
  and it held neither.**
- No **Seok Talhae**, who comes over the sea, nor **Kim Alji**, found as an
  infant in a golden box hanging in a wood, whose finding gave the wood the name
  Gyerim and the kingdom one of its names. **Silla has three royal surnames and
  each has its own arrival story; the corpus had none of the three.**
- No **Suro**, first of six golden eggs out of a chest that came down after nine
  leaders sang and danced, nor **Heo Hwang-ok**, who came to him by boat from
  Ayuta at sixteen.
- No **Onjo** and no **Biryu**, and no **Soseono** — **who is the join between
  two of the four myths**, the widow of Holbon whom Jumong married and whose sons
  took a second kingdom south. The corpus held one foundation myth complete and
  could not reach the next one along.

It also held Jumong without the court he grew up in: no **Hae Buru**, no
**Geumwa** the golden frog who sheltered him, no **Daeso** who drove him out.
**The registry held the river-crossing and not the pursuit.**

## The shamans' own origin story was not in it

**Princess Bari** is the seventh daughter of a king who wanted a son, thrown away
at birth, who comes back when her parents are dying and walks to the underworld
for the Water of Revival. **Korean shamans call her myth their origin story**;
the *Barigongju bon-puri* has been collected nationwide in more than a hundred
versions.

The corpus held six figures of the Jeju bon-puri tradition and not her.

Nor **Yeomra**, who judges the dead — **ten kings of the underworld and the
corpus holds one** — nor **Gangnim**, the mortal sent to arrest the King of Death
who came back with him.

## Not one household god

The *gasin* are the gods of the house, and they are the part of Korean religion
that was practised daily in every home for centuries, by the women of the house,
without a temple or a priest. All eight are new:

| | |
|---|---|
| **Seongjusin** | the ridge-beam, and the fortune of the family |
| **Jowangsin** | the hearth — a bowl of fresh water, refilled every morning |
| **Teojusin** | the ground the house stands on |
| **Munsin** | the door |
| **Samsin Halmoni** | childbirth and children's health |
| **Eopsin** | the storehouse, and the family's wealth |
| **Cheuksin** | the outhouse |
| **Seonangsin** | the village boundary |

**Jowangsin carries the most precisely attested rite in this batch, and it is a
cup of water**: a goddess of *fire*, embodied in *water*, in a bowl on a clay
altar above the stove, renewed every morning from the well by the woman of the
house, who knelt in front of it. That is the kind of thing a registry of cult
practice exists to record, and it had nowhere to put it.

**Cheuksin is ingested and the record does not treat her as a joke.** A system
that gives a god to every part of a house gives one to that part too, and leaving
her out because the room is undignified would be a modern reader's edit of a
religion.

## Four figures are held twice — the second instance of lane 20's finding

`korean_cheonjiwang` and `jeju_cheonjiwang`. `korean_daebyeolwang` and
`jeju_daebyeolwang`. `korean_sobyeolwang` and `jeju_sobyeolwang`.
`korean_jacheongbi` and `jeju_jacheongbi`.

Lane 20 found exactly this between the Finnish and Karelian keys, where
Väinämöinen and Ilmarinen are each held twice. **This is the same fault in a
different part of the corpus.** Jeju shamanism is a regional tradition inside
Korean religion; the registry files some of its figures under both keys, some
under one, and nothing decides which.

**This batch adds nothing under `jeju_` and creates no new duplicates.**
**Yeongdeung Halmang** — the wind-and-sea goddess who comes to Jeju once a year
and sows the fish and the shellfish — is in **neither** key, and she is a census
row rather than a record for exactly this reason: she belongs beside Seolmundae
Halmang under `jeju_`, and a `korean_` copy would make the problem worse.

## Two brothers and one throne

The histories name the founder of Baekje as **Onjo *or* Biryu**. Both are
ingested and **neither record chooses**; each names the other and says the sources
give both.

That is lane 19's two-Myrddins handling and lane 21's two Hengests, arrived at
from a third direction. There the question was whether two names are one figure.
**Here it is one office and two claimants** — and a registry that picked one
would be deciding a disagreement between the *Samguk Sagi* and the *Samguk
Yusa*.

## Type computed from descent, applied before authoring — the sixth lane running

**`npm test` passed 302/302 on the first run.**

Three places where descent was deliberately not written:

1. **Princess Bari is `mortal`.** She is a king's daughter; what she *becomes* is
   on her lifecycle, where the tradition puts it. Lanes 16, 17 and 18 each lost a
   test cycle to authoring a type from status rather than parentage.
2. **Aryeong's `parentIds` is empty.** The sources say she is "tied to a water
   dragon" and do not name the dragon; writing an unnamed dragon into descent
   would invent a record, and `parentIds` drives the computed tier besides.
3. **Geumwa is `raised` by Hae Buru, not `parentIds`.** The tradition has him
   found under a stone rather than begotten, and a child found under a stone has
   no descent to compute from.

**Onjo and Biryu do carry both parents** — `korean_jumong` and
`korean_soseono` — which computes `demigod` through Jumong's own fraction, and
that is the honest filing.

## What is not asserted

- **No edge from Yeomra to `hindu_yama`**, though the name reaches Korean from
  Sanskrit by way of Chinese Yanluo. Eighth lane running; the fact is in the
  etymology.
- **Ayuta is not located.** India, Thailand and Central Asia have all been argued
  and none is settled; a registry that picked one would take a side in a live
  argument about where a queen came from.
- **No claim that Hyeokgeose existed.** The sources note that archaeology finds
  gradual chiefdom emergence rather than divine origins, and the record dates
  nothing.
- **Nothing about Cheoyong's wife after the episode.** The sources do not say.
- **The other five Gaya brothers are not ingested.** The source names a number
  and six kingdoms, not five more men — the rule that kept lane 17 from
  manufacturing sixty thousand sons of Sagara and lane 16 ninety-six Kauravas.
- **Samsin Halmoni is one record though the name is plural.** *Samsin* means
  "three gods" and the tradition prays to a grandmother in the singular; the
  plural is in the etymology.

## Twelve REJECT

**Jeoseung saja are rejected and Gangnim is ingested.** The sources call them "a
class of spectral bureaucrats" in as many words — the rejection this programme
has applied to the Cwn Annwn (lane 19), the Matronae (lane 22) and the aralez
(lane 23) — and Gangnim is the one they name, with an act of his own.

**The *Samguk Yusa* and *Samguk Sagi* are rejected as figures**, which is now the
fourth time this programme has declined to promote a source into the corpus it
sources: Lönnrot in lane 20, Bede and Asser in lane 21, Khorenatsi and
Srvantdziants in lane 23.

## Fourteen BLOCKED

**Four empty eras have named candidates and a single scope question behind all of
them.** `unified-silla` was filled by Cheoyong — and **King Heongang**, whom
Cheoyong follows to the capital, is blocked; `goryeo` waits on **Wang Geon** and
**Gyeonhwon**, both with birth-legends; `joseon` waits on **Yi Seong-gye**, and
on **Simcheong**, the pansori heroine who sells herself to sailors for her blind
father's sight and comes back out of the sea as a queen.

**Every one of them is a historical person with a legend attached, or a figure of
vernacular literature.** That is the same question lane 23 left open with Trdat
III and Gregory the Illuminator, and it is now the single largest open scope
question in this programme: **four of this tradition's nine eras cannot be filled
until it is answered.**

**Danggeum-aegi and the Jeseok bon-puri** is the other strong absence — beside
Bari's, one of the most widely recited shamanic narratives in Korea.

And a smaller one worth naming: **Jowangsin, Cheuksin and Munsin are characters
in one narrative together** in the Jeju tradition, with a plot that connects
them. This batch ingests all three as household gods and cannot state the story
that joins them.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 28 figures, no outstanding
  reciprocals
- sweep run against both heads with the same 68-name list: **before 21 hits / 47
  absences, after 52 hits / 16 absences**, all 28 new records resolving
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**
- `npm test` → **302/302**, first run, the sixth lane running
- record-level diff against the previous head: **28 added, 0 removed, 0
  pre-existing records mutated**
- zero dangling references, zero era inversions, zero tier-classification drift
- **nine new verified-solitary verdicts**: the eight gasin, each of whom has a
  station in the house and no kin, and Kim Alji, who by definition has no parents
  and whose finder the retrieved treatment does not name
- README and `package.json` counts refreshed to 6,586 / 560 / 5,423 / 7,929 /
  3,198

## Status: PARTIAL

Korean goes from 13 to 41, from three occupied eras to five, and from one
foundation myth to four. For the first time the corpus holds the gods of the
house, the shamans' own origin story, and the kings of Silla, Gaya and Baekje.

What remains: **Danggeum-aegi and the Jeseok bon-puri**; **Sansin** and
**Chilseong** once their class-or-figure question is settled; the **Jeju key**,
which should be reconciled with the Korean one rather than grown, and which is
missing **Yeongdeung Halmang** entirely; and the four empty eras, which wait on a
decision about historical figures with legends attached and about the vernacular
literature of Joseon.
