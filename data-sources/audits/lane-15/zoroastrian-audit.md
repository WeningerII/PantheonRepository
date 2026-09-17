# Lane 15 — Zoroastrian audit

**Status: PARTIAL.** Corpus 6,281 → 6,318 figures. Zoroastrian 33 → 70 records.

Census: 99 rows — **37 ADD, 8 ALIAS, 22 EXISTING, 4 CROSS-TRADITION SAME FIGURE,
8 REJECT, 20 BLOCKED**. Full rows in `zoroastrian-census.tsv`; the records
themselves in `data-sources/transcripts/zoroastrian-expansion.txt`.

## The registry did not hold Zarathustra

A 95-name check across the whole registry returned 13 hits and 82 absences. Six
of the thirteen hits were aliases already carried on existing records — Jamshid
on Yima, Zahhak on Azhi Dahaka, Fereydun on Thraetaona, Garshasp on Keresaspa,
Bahman on Vohu Manah, Anahita on Aredvi Sura Anahita — and two were false.

The corpus held Ahura Mazda, Angra Mainyu, all six Amesha Spentas, nine yazatas
and fifteen figures of the Iranian legendary cycle. It did not hold the prophet
the religion is named after: the man whose hymns are the oldest layer of the
Avesta and who is the speaker of the Gathas the whole tradition is built on.

It also did not hold anyone he is named with. The Gathas mention a handful of
human beings — Vishtaspa his patron, Jamasp and Frashaoshtra of the Hvogva clan,
Pouruchista his daughter — and the registry held none of them either.

## Four more structural holes, all the same shape

**The six Amesha Spentas were present and all six of their opponents were
absent.** The Vendidad sets an arch-daeva against each, one to one:

| Amesha Spenta (held) | Arch-daeva (absent) | Opposition |
|---|---|---|
| Vohu Manah | Aka Manah | good thought / evil thought |
| Asha Vahishta | Indra | best truth / frozen minds |
| Khshathra Vairya | Saurva | desirable dominion / oppression |
| Spenta Armaiti | Nanghaithya | holy devotion / discontent |
| Haurvatat | Taurvi | wholeness / destruction |
| Ameretat | Zairich | immortality / poison |

Six for six. In a dualist religion that is not a gap in the margins — it is half
the system.

**Tishtrya was in the corpus with an empty relations array.** His entire myth is
a horse-fight with **Apaosha**, the drought demon, for the waters of Vourukasha:
Tishtrya loses, Ahura Mazda sacrifices to him, and he goes back and wins, which
is why it rains. The registry held a fight with one fighter in it. This is the
cleanest single instance of the pattern this programme has now found in ten
traditions.

**No creation account at all.** No **Gayomart**, the first man, made shining and
white, whose mere existence immobilises Ahriman and who is destroyed after
thirty years; no **Mashya and Mashyana**, who grow from his body; no
**Gavaevodata**, the sole-created ox. The corpus held Ahura Mazda and the being
he creates against, and nothing either of them made.

**No eschatology.** No **Saoshyant**, no **Hushedar**, no **Hushedar-mah** — the
three saviours born a thousand years apart from the prophet's seed, preserved in
Lake Kansaoya under the guard of ninety-nine thousand nine hundred and
ninety-nine fravashis. A world with a datable end, a final battle, a general
resurrection and a universal restoration is the thing this religion is most
often credited with introducing, and the registry recorded none of it.

## A new variety of the recurring fault: the corpus held the borrower, not the lender

**Aeshma**, the demon of wrath and the most prominent daeva of the older texts,
was absent — in a registry that already holds `jewish_ashmedai`. Asmodeus, who
in the Book of Tobit kills the seven husbands of Sarah before Raphael defeats
him, carries strikingly similar themes to the Avestan demon of wrath, and the
derivation is the standard reading.

Every previous instance of this programme's recurring finding has been a gap
*within* one tradition — the hero without the monster, the god without the
adversary. This one runs across two: the tradition that borrowed the figure was
in the corpus and the tradition it borrowed from was not.

No `equated-with` edge is written. The treatment consulted describes similar
themes and a likely derivation rather than an identity, and the kind is
symmetric, so writing it would rewrite a record in another tradition on the
strength of a scholarly reading.

## The Shahnameh was held from the middle

The corpus held Rostam, Sohrab, Zal, Rudaba, Kay Kavus, Kay Khosrow and Siyavash
— and almost nothing that produces them or opposes them.

- **Zal was held with an empty `parentIds` array**, and his son Rostam with both
  parents named. Two generations above Rostam the genealogy simply stopped, in a
  corpus whose whole subject is descent. This batch adds **Sam**, who abandoned
  Zal in the Alborz for being born white-haired; **Nariman**, Sam's father; and
  the **Simurgh**, who found the child, considered feeding him to her chicks, and
  raised him instead.
- **Afrasiab** — king of Turan, chief antagonist of the entire epic, and already
  in the Avesta as Frangrasyan — was absent, in a corpus holding five figures
  whose stories are all about him.
- **Tahmineh**, Sohrab's mother, was absent. The corpus held the most famous
  father-and-son killing in Persian literature with the father's parents
  recorded and the son's mother not.
- **Salm, Tur and Iraj**, Fereydun's three sons, were absent — so the quarrel
  that makes Iran and Turan enemies for the rest of the book had no parties in it.
- **Kaveh the blacksmith**, whose leather apron on a spear becomes the standard
  of Iran for a thousand years, was absent: the one commoner in a cycle the
  registry held only the kings and heroes of.

## Method: the sweep was run twice, as lane 14 proposed

Lane 14 found that a corpus sweep tests the registry against the author's recall,
and proposed re-running it after the batch is in place as standard. Applied here:

- **First sweep, 95 names: 13 hits, 82 absences.**
- **Second sweep, 168 names, run after the 37 records were generated: 95 hits,
  73 absences.** All 37 new records resolve. The 73 remaining absences are the
  BLOCKED rows, and the second sweep is what surfaced several of them —
  Pourushaspa and Dughdova, Hvovi, Hutaosa, Vivanghant, Hushang and Tahmuras.

The second sweep did not change this batch, because it ran after the records
were written rather than before. That is the honest report: in lane 14 the
re-run found four ingestible figures, and here it found a better BLOCKED list.
Both are worth the cost of running it.

## Relation kinds chosen deliberately

Every edge toward a pre-existing record uses a non-symmetric kind, so **zero
pre-existing records are mutated**:

- Six arch-daevas `opposes` their six Amesha Spentas.
- **Apaosha `defeated-by` Tishtrya** — and the direction matters, because
  Apaosha wins the first round.
- **Gayomart `slain-by` Angra Mainyu**.
- **Daena `presents-the-soul-before`** Mithra, Sraosha and Rashnu — three edges
  that complete the Chinvat tribunal the corpus held three quarters of.
- **Sam `father-of` Zal** and, as a **separate** edge, **Sam `abandoned` Zal**:
  the abandonment is not an incident of the fatherhood in this story, it is the
  event the whole Sistan cycle proceeds from, and a reader following edges
  should meet it.
- **Simurgh `foster-parent-of` Zal**; **Tahmineh `mother-of` Sohrab**;
  **Afrasiab `manipulated` Sohrab**; **Kaveh `rebelled-against` Azhi Dahaka**.
- **Zurvan `progenitor-of-in-zurvanite-doctrine`** Ahura Mazda and Angra Mainyu
  — the kind names the doctrine inside itself, because the claim is true only
  within it, and nothing is entered in anyone's `parentIds`.
- **Tur `ancestor-of` Afrasiab**, not `father-of`: one treatment makes Tur his
  father directly and the Shahnameh puts Pashang between them. Descent is
  agreed, the number of generations is not, and 'ancestor' is true on both
  readings.

## Contradictions carried, not smoothed

- **The lists of the six arch-daevas do not agree.** One enumeration gives Aka
  Manah, Indra, Saurva, Nanghaithya, Taurvi and Zairich; another substitutes
  **Nasu**. Nasu is ingested on his own footing, with **no `opposes` edge**,
  because drawing one would mean picking his slot and the source does not supply
  it.
- **Gayomart is the first man in the Bundahishn and the first king in the Persian
  epic.** Both names are on the record and the difference is noted rather than
  merged away.
- **Afrasiab's genealogy**, as above.

## What is not asserted

- **No date for Zarathustra.** The question is one of the longest-running open
  arguments in Iranian studies, with serious proposals spanning roughly a
  thousand years. Any date on that record would be picking a side.
- **No identification of Vishtaspa with Hystaspes the father of Darius.** The
  Greek form is carried as an alias and nothing more; the equation is a pivot of
  the dating question and asserting it would smuggle a date in through the back
  door.
- **No sibling edges among Jamasp and Frashaoshtra.** The tradition generally
  makes them brothers; the source consulted states only that both are named
  members of the Hvogva clan, so the edge says `kinsman-of`.
- **No cross-tradition edge from the daeva Indra to `hindu_indra`, or from
  Nanghaithya to the Ashvins.** That three of the six arch-daevas carry names
  that are gods on the Indian side of the Indo-Iranian split is a fact about two
  traditions, not a relation between two individuals.
- **No sibling edges among the three saviours.** They share a father and a lake
  and are separated by two thousand years; ordered `successor-of` edges say what
  the tradition actually asserts.
- **No `equated-with` from Aeshma to Asmodeus**, as above.

## The tradition-key question, raised for the seventh lane running

The corpus already holds `sogdian_zurvan`. This batch adds `zoroastrian_zurvan`
and **does not merge them**, on a precedent the corpus itself sets: it holds
`zoroastrian_mithra` and `roman_mithraic_mysteries_mithras` as two records,
because a divine name inside two religious systems is two figures for a registry
that indexes traditions. Whether that is the right general rule is the owner's
call. What this batch does not do is decide it by quietly merging, which would
be destructive and irreversible.

## Two animals ingested, one rejected, on a stated rule

**Gavaevodata** and the **Simurgh** are ingested. **Rakhsh**, Rostam's horse, is
a REJECT row — on exactly the ground that rejected four Norse horses in lane 13
and Sivka-Burka in lane 14: identified only by a name and an owner. The two that
go in are not that. The ox is a singular created being with a name, a
cosmogonic role, its own three thousand years and its own death; the Simurgh has
a name, a will, a moral decision, a household and a continuing role.

## Twenty BLOCKED

Seven are flagged upward as **strong ADDs**, and the first two are the same
fault this lane exists to correct, one generation up:

- **Pourushaspa and Dughdova** — the prophet's own parents. This batch adds the
  prophet without them.
- **Hvovi** — his wife, and in the tradition the daughter of Frashaoshtra, who
  *is* ingested here.
- **Vivanghant** — Yima's father. The corpus holds Yima with no parents.
- **Hushang and Tahmuras** — the first two Pishdadian kings. The corpus holds the
  third king of a dynasty and not the first two.
- **Manuchehr** — who avenges Iraj. This batch adds the crime and not the
  reckoning.
- **Esfandiyar** — the invulnerable prince Rostam kills, one of the three or four
  largest figures in the epic, searched twice without a retrievable treatment.
- **Hvare-khshaeta and Mah** — the sun and the moon, in a corpus that now holds
  Tishtrya *and* Apaosha.

**Two blockers are schema questions, not research questions.** The tradition's
registered era vocabulary is `primordial | legendary` and nothing else. That is
why Kartir, Adurbad, Tansar and Mazdak are blocked, and why the entire Sasanian
half of the Shahnameh — Ardashir, Bahram Gur, Khosrow Parviz, Shirin — is
blocked: there is no historical era to file them in. Compare lane 14, where the
Slavic vocabulary registers `kievan-rus-historical` and holds almost nothing.
**Both are one decision for the owner**, and it gates more candidates than any
citation gap in this census.

**One blocker is a coverage observation worth acting on.** The registry's Iranian
holdings are overwhelmingly male, and Bizhan and Manizheh, Sudabeh and
Gordafarid — the epic's love-plots and a warrior woman who fights Sohrab to a
standstill — are where that would begin to change.

## Four kinless figures carry cited verified-solitary verdicts

`zoroastrian_bushyasta`, `zoroastrian_ashi`, `zoroastrian_apam_napat`,
`zoroastrian_drvaspa`. Two others that would have been kinless were given
properly cited edges instead rather than a verdict: Nariman gained `father-of`
Sam, and Nasu gained two `named-among-the-arch-daevas-with` edges, which is what
the enumeration actually supports.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 37 figures
- full regeneration (4 generators + `build.py --pages` + `build.py`), then
  `scripts/verify-regen.sh` → byte-exact
- `npm test` → 302/302
- record-level diff: 37 added, 0 removed, **0 pre-existing records mutated**
- zero dangling references, zero new era inversions, zero unverified kinless
  figures
- README and `package.json` counts refreshed to 6,318 / 560 / 5,333 / 7,929 /
  3,197

## Status: PARTIAL

The obvious shape of the next Zoroastrian lane is a **Yasht-by-Yasht pass**:
twenty-one hymns, each dedicated to a yazata, several of whom are still absent
(Chista, Zam, Arshtat, Vanant, Satavaesa, Ushah, Airyaman, Neryosang,
Hvare-khshaeta, Mah). After that, the rest of the Kayanian cycle and — once the
era-vocabulary decision is made — the Sasanian material, which is currently
unreachable for schema reasons rather than evidential ones.
