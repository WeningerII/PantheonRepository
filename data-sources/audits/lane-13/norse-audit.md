# Lane 13 — Norse audit

Owner: `lane-13-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,224 total figures, 67 of them Norse.

Corpus: **6,224 → 6,258 figures**. Norse **67 → 101**.
Census: 92 rows — **34 ADD, 6 ALIAS, 27 EXISTING, 4 CROSS-TRADITION SAME
FIGURE, 10 REJECT, 11 BLOCKED**.

## The registry held Sigurd and not the dragon

A 51-name check across the whole registry returned 11 hits and 40 absences.
Eight of the eleven were deliberate controls, and the other three are false:
"Sol" matched `roman_sol`, "Mani" matched `nuer_mani`, and "Nerthus" matched
`continental_germanic_nerthus`.

The headline absence is the pattern this programme has now found in eight
traditions running. **The registry held Sigurd — and Fáfnir was not in it.**
Nor Regin, who forged the sword and set him on; nor Ótr, whose skin fixed the
price; nor Hreiðmarr, who demanded it; nor Andvari, whose ring carries the
curse. The corpus already held the whole Völsung cycle — Sigurd, Brynhildr,
Gudrún, Sigmund, Signý, Sinfjötli, Svanhild, Jǫrmunrekkr and a dozen more, all
of whom die because of a bag of gold paid for an otter — and it did not hold
the gold, the otter, or the dragon.

## What else was missing

- **Mímir and Kvasir** — the two beings whose deaths are the source of Odin's
  wisdom and of poetry itself, in a corpus holding Odin and Bragi. Every
  skaldic kenning for poetry refers back to Kvasir.
- **Hœnir**, one of the three gods who make the first humans and one of the two
  hostages of the Æsir-Vanir war.
- **The entire sky.** No Sól, no Máni, no Nótt, no Dagr, and neither wolf.
- **Níðhöggr and Ratatoskr** — the dragon at the root of the world tree and the
  squirrel whose gossip keeps it dying.
- **Every jötunn Thor is famous for fighting**: Hrungnir, Þrymr, Útgarða-Loki,
  Geirröðr, Hymir. The registry had Þjazi and Angrboða and none of the rest,
  which left the Þrymskviða, the Hymiskviða and the Útgarðr episode — three of
  the four best-known Thor stories — without an opponent in the corpus.
- **Brokkr and Eitri**, who made Mjölnir, which the registry holds as an item.
- **Sigyn**, who holds the bowl over Loki's face, in a registry holding Loki,
  the sons whose entrails bind him, and the serpent above him.
- **Sleipnir** — Loki's fourth child, where the registry held the other three.
- **Gullveig**, who is speared and burned three times and is, on the common
  reading, the cause of the Æsir-Vanir war.

## Relation kinds chosen deliberately

Three edges were written with non-symmetric kinds rather than `enemy`, because
`enemy` toward an existing record cannot be reciprocated and because in each
case it would also be wrong:

- **Andvari `robbed-by` Loki.** It is a robbery with a curse attached, not a
  feud, and it runs one way.
- **Geirröðr `captor-of` Loki.** A captivity with a ransom, not an enmity.
- **Hymir `host` Thor.** Thor arrives as a guest, is tested at table and then
  at sea, and leaves with the cauldron. The Norse material is precise about
  the difference between a host and an enemy and so is the edge.

A proposed in-batch edge between Útgarða-Loki and Hrungnir was **written and
then removed**: nothing in the sources connects them beyond both having met
Thor, and an edge asserting a relation the texts do not is exactly what this
programme's census is for. Útgarða-Loki carries a solitary verdict instead.

## Zero pre-existing records mutated

Every symmetric relation in this batch is reciprocated inside it. Relations
toward existing records use non-symmetric kinds only — `killed-by`,
`captor-of`, `robbed-by`, `host`, `consort-of`, `guide-of`, `child-of`,
`tricked-by`.

## One figure, two names

**Eitri and Sindri** are one record. The sources use both names for the same
brother of Brokkr and the treatments consulted do not separate them; two
records would be the duplicate this programme forbids. **Heiðr** likewise is an
alias on Gullveig, because the Völuspá makes the renaming explicit.

**Völundr** is recorded under Norse and not under Continental Germanic, because
the Völundarkviða is a Norse poem — but the figure is pan-Germanic and older
than any of the three languages that name him, he is carved on the Franks
Casket in the eighth century, named in *Beowulf* and *Deor*, and has given his
name to a Neolithic barrow in Berkshire since before the Conquest. Wéland and
Wieland are aliases; a second record under another key would duplicate.

## What is not asserted

- **No relation between Gullveig and Freyja.** The identification is a
  scholarly proposal and this programme does not write edges on proposals.
- **No identification of Lóðurr with Loki**, for the same reason; Lóðurr is
  BLOCKED.
- **No explanation of why Útgarða-Loki shares a name with Loki.** The sources
  do not explain it and neither does the record.

## Eleven BLOCKED

Four are strong ADDs held only for want of a retrievable citation, and are
flagged upward: **Garmr**, the hound at Gnipahellir; **Vafþrúðnir**, the jötunn
who contests wisdom with Odin over a whole Eddic poem; **Ask and Embla**, the
first humans; and **Gylfi**, who is both the king in the Gefjon story and the
frame narrator of the *Gylfaginning*. Each was searched alongside figures that
did come back, and each returned nothing.

The rest are reciprocals this batch's own records cannot carry — Níðuðr and
Bǫðvildr for Völundr, Gilling for Suttungr, Bölþorn and Delling and Narfi for
the night-and-day genealogy, Gríðr and Járnsaxa and Þrúðr around Thor — plus
two scope deferrals: the remaining Gjúkung cast of the Völsung cycle, and the
legendary kings of the fornaldarsögur.

## One correction the test suite forced

Sköll and Hati were first written at era `primordial`, on the reasoning that
the sun and moon they chase are primordial. `npm test` rejected it: both have
`parentIds: ["norse_fenrir"]`, Fenrir is filed at `mythic-prehistoric`, and a
parent cannot be later than a child. The era-inversion check is a hard zero and
it caught the mistake in the run before the commit.

Both wolves are now `mythic-prehistoric`, which is where a son of Fenrir
belongs anyway; the chase itself is dated by the sun's era and not theirs, and
nothing in either record changed but the bucket.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 34 figures, no outstanding
  reciprocals
- full regeneration, then `scripts/verify-regen.sh` → byte-exact
- record-level diff against the previous head: 34 added, 0 removed, 0
  pre-existing records mutated
- zero dangling references, zero era inversions, zero unverified kinless
  figures; four new solitary verdicts, each citing why
- `npm test` → 302/302

## Status: PARTIAL

Thirty-four additions take Norse from 67 to 101, and for the first time the
corpus contains both halves of the Thor stories, both halves of the Sigurd
story and the whole of the sky. What remains: Garmr, Vafþrúðnir, Ask and Embla
and Gylfi first; the rest of the Gjúkungs; the valkyrie names beyond the three
already held; the Ragnarök cast on both sides; the *fornaldarsögur* kings; and
the Continental Germanic and Anglo-Saxon keys, which the corpus holds at small
counts and which share a great deal of this material under other names.
