# Lane 28 — Haitian Vodou audit

Owner: `lane-28-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,680 total figures, 12 of them Haitian Vodou.

Corpus: **6,680 → 6,703 figures**. Haitian Vodou **12 → 35**.
Census: 80 rows — **23 ADD, 18 ALIAS, 15 EXISTING, 6 CROSS-TRADITION SAME
FIGURE, 7 REJECT, 11 BLOCKED**.

## The corpus held Papa Legba and not Kalfou

Papa Legba is the benevolent opener of the way at the crossroads. **Kalfou is his
cousin-brother and his dark counterpart** — the literal embodiment of the
crossroads, the spirit of dangerous crossroads, of confusion and of blocked
pathways.

The corpus held the one who opens the way and not the one who blocks it. Arawn
without Hafgan, Beowulf without Grendel, Kumarbi without Anu, Shinje without
Yamāntaka — **the same fault, in a nineteenth tradition.**

## An entire rite was missing

The lwa divide into *nanchon*, "nations". The **Rada** are cool and
sweet-tempered and are held to come from the African homeland; the **Petwo** are
hot and volatile and are described in the sources as born out of the harsh
conditions of slavery and resistance in the New World.

**All twelve pre-existing records are Rada or Gede. Not one is Petwo.** No Dan
Petro, whose rite it is; no Ti Jean Petro; no Marinette; no Bosou; no Kalfou.

This is not a gap in coverage of a tradition — it is **half of what the religion
is**, and the half that is specifically about the Middle Passage. An
African-diaspora key that holds only the Rada holds only the part that came from
Africa and none of the part that was made in Haiti.

It also held **no priest and no priestess**. Papa Loko Atisou and Manbo Ayizan
Velekete are the archetypal houngan and manbo, who confer the office of
priesthood in the kanzo rite and hand over the asson. **A religion whose entire
structure runs through initiation was in the corpus without the two lwa who
perform it.**

And no lwa of the fields: a key that ran from the supreme God through the
serpent, the sea and the graveyard had nothing like **Azaka**, the harvest lwa
the sources describe as a country bumpkin who loves to eat, kind and gentle.

## Three figures were hiding inside other figures' alias lists

This is the sharpest structural finding the programme has produced, and it is
new.

| the hidden figure | where it is | what the sources say it is |
|---|---|---|
| **Baron La Croix** | alias on `vodou_bawon_samdi` | a distinct aspect of Bawon — guardian of the **gravestone** |
| **Baron Cimetière** | alias on `vodou_bawon_samdi` | a distinct aspect of Bawon — guardian of the **grave** |
| **Ogou Badagri** | alias on `vodou_ogou` | a distinct lwa of the Nago nation, **a general in the armies of Ogou** |

And one family name collapsed onto one of its members: `vodou_gede_nibo` carries
the bare **"Gede"** and **"Ghede"**, so the name of the **largest family of lwa in
the religion** resolves onto a single member of it.

Lane 27 found that a **false absence** invites a lane to create a duplicate. This
is the matching failure and it is worse: **an alias that is really a separate
figure makes a real absence invisible.** No sweep will ever report Baron La Croix
missing. No lane will ever be prompted to add him. And a lane that did try would
collide with the alias and be told the figure is already there.

**This batch creates none of them**, because each would duplicate a name the
corpus already resolves and fixing the alias lists would mean mutating
pre-existing records. All four are censused `EXISTING` with the reason.

**Unblocking this needs exactly one owner decision: whether a lane may edit an
alias list on a pre-existing record.** That is the most actionable row in this
census. Seventh lane to pay the never-mutate cost, and the first where the cost is
not a missing alias but a missing *record*.

## The research budget ran out, and this batch is bounded by that

**This session's web-search budget was exhausted before this lane was authored.**
Every record here rests on material retrieved while it lasted.

**That is why this is 23 figures and not the thirty-odd the tradition would
support.** Ezili Kokobe gets a name and a gloss because a name and a gloss is what
the retrieved treatment gives her, and her record says so on its face. Marinette
gets a domain and nothing else for the same reason. Nothing is padded, no
attribute is supplied from general knowledge, and every figure the sources named
but did not describe is censused **BLOCKED — sourcing**, with the name recorded so
the next lane starts from it rather than rediscovering it.

The count is below the 25-figure floor the programme normally holds to. **The
floor is not worth meeting by inventing**, and the shortfall has two causes, both
recorded: the budget, and the fact that two of this lane's candidates turned out
to be aliases on an existing record rather than absences.

## The batch reproduced a known bug in its own authoring, and the second sweep caught it

The Marasa were first authored with the primary name **"the Marasa"**. The
post-generation sweep then reported **"Marasa" ABSENT** — against a record that
had just been created — because a leading article normalises into the indexed
string.

That is precisely the false-absence failure lane 27 documented in *Pehar* and
*Tonpa Shenrab*, and lanes 18 and 19 found before them. **This time the programme
introduced it itself.** The second sweep caught it, the primary was changed to
"Marasa" with "the Marasa" kept as an alias, and the record now carries the whole
episode in its notes.

**Third lane running in which the twice-run sweep has been the thing that
mattered** — lane 25's Umbu duplicate, lane 27's Pehar near-duplicate, and now
this.

## What the batch added

- **The crossroads, the priesthood and the forest (5)** — **Kalfou**; Papa Loko
  Atisou and Manbo Ayizan Velekete, who confer the priesthood; Gran Bwa, master
  of the forest, whose leaves heal and harm; the Marasa.
- **The Petwo rite, and the ancestor raised to divinity (7)** — **Dom Pedro**,
  the houngan named as the rite's founder, and **Dan Petro**, his deification;
  Ti Jean Petro his son; Marinette; Bosou Twa Kon; **Agasou**, the Dahomean king
  raised to divinity, and **Aligbonu**, the princess the sources make his origin.
- **The weather, the harvest and the fresh water (7)** — Sobo who brings the
  lightning, Badè who brings the winds, and Agau whom the two of them together
  summon; Azaka; Simbi, Simbi Andezo and Simbi Makaya.
- **The Ezili the corpus did not hold, and an Ogou who heals (4)** — Ezili Je
  Wouj, Gran Ezili, Ezili Kokobe; Ogou Balendjo, lwa of healing and spiritual
  medicine, in a corpus whose only Ogou was a warrior-smith.

**The three weather spirits are ingested as a complete set in one batch**, rather
than leaving the corpus holding two of three — which is the state this programme
has repeatedly found it in.

## Zero pre-existing records mutated

23 records, 31 relations. **Only five point at pre-existing records and every one
is non-symmetric** — `dark-counterpart-of` Legba, three `of-the-ezili-with` Ezili
Freda, and `of-the-ogou-with` Ogou Feray. Eighth consecutive lane.

**No record in this batch carries `parentIds`**, for the second lane running. Two
genealogical claims are in the sources and both are written as relations:
Agasou is `born-of` Aligbonu — his father in the source is a leopard, which is
not a record and will not become one — and Ti Jean Petro is `son-of` Dan Petro,
where a seeded parentage would make the corpus compute him a demigod, which is
not what the sources say he is. So all 23 records return their authored type and
there is no classification drift to check for.

## What is not asserted

- **No edge and no equation to `fon_legba`, `fon_sogbo`, `ewe_so`, `kongo_simbi`,
  `ogun` or `santeria_oggun`.** That these names crossed the Atlantic is a fact
  about the crossing, not a relation between beings. **The corpus holds one West
  African god three times** — `ogun`, `santeria_oggun`, `vodou_ogou` — and this
  batch duplicates none of them and relates none of them.
- **The Marasa are one record, not two or three.** The source's whole point is
  that they resist being counted: twins and yet three, male and female and both
  male and both female. Splitting them would assert a resolution the tradition
  specifically refuses. `sex` is `other` for the same reason.
- **The Catholic syncretism is recorded and not drawn as an edge.** Cosmas and
  Damian are not in this corpus, and a syncretism is a fact about how a tradition
  was practised under pressure.
- **The leopard is not ingested.** An animal identified by its role in a mating
  is not a figure — Kaṇṭhaka, five horses, two hounds, Balder's foal.
- **Dosou Agadja is not ingested.** He is a historical Dahomean king who appears
  in the Bosou source only as a reign-marker, and he belongs to another key.

## Eleven BLOCKED

**The research budget is the first row**, because it is the binding constraint on
the whole lane and naming it as a blocker is more honest than letting a short
count speak for itself.

**The alias lists on `vodou_bawon_samdi`, `vodou_gede_nibo` and `vodou_ogou`** are
the most actionable row: while they stand, no sweep reports the hidden figures
absent and no lane can create them without colliding.

**Aligbonu's tradition key** is blocked as a question rather than answered: she is
filed under Haitian Vodou because the retrieved treatment reaches her through
Agasou's Haitian cult, and the corpus holds a Fon key she may belong to instead.

**The diaspora tradition-key question** — Ogun three times, Legba twice, Simbi
twice — is the sixth lane to raise tradition-key duplication, after
Finnish/Karelian, Korean/Jeju, Hittite/Hattic, Buddhist/Chinese and the three
Tibetan keys.

**The type vocabulary** hits its third tradition: Agasou is a king *raised up to
divinity*, and `deity | numen | demigod | quartigod | scion | mortal` has no way
to say that.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 23 figures, no outstanding
  reciprocals
- sweep run against both heads with the same 51-name list: **before 17 hits / 34
  absences, after 49 hits / 2 absences** — and the two remaining absences are
  Bawon Simitye and Brav Gede Nibo, both of them the alias-collapse case above,
  correctly censused `EXISTING` rather than created
- the second sweep also caught this batch's own "the Marasa" article bug before
  it shipped
- collision scan across all 6,703 records: **no within-tradition duplicate**; the
  only cross-record collisions touching new ids are the intended Sogbo and Simbi
  overlaps, both stated in the records
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**
- `npm test` → **302/302**
- record-level diff against the previous head: **23 added, 0 removed, 0
  pre-existing records mutated**
- zero dangling references, zero era inversions, **zero tier drift — no
  `parentIds` in the batch**
- **two new verified-solitary verdicts**: the Marasa and Azaka
- README and `package.json` counts refreshed to 6,703 / 560 / 5,494 / 7,930 /
  3,204

## Status: PARTIAL

Haitian Vodou goes from 12 to 35, and the corpus now holds the spirit who blocks
the crossroads, the rite that was made in Haiti rather than brought to it, the
two lwa who make priests, the lwa of the fields, the three weather spirits as a
complete set, and three of the six Ezili it was missing.

What remains, and why: **the rest of the Gede**, the largest family in the
religion, blocked on sourcing *and* tangled in an alias; **Marinette's,
Ayizan's and Simbi Makaya's narratives**, blocked on a research budget that ran
out mid-lane; **Aligbonu's key** and **the diaspora key question**, which are the
owner's; and **the three alias lists**, which need one decision — whether a lane
may edit an alias on a pre-existing record — to unblock a whole class of work.
