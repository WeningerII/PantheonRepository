# Lane 36 — the pre-Islamic Arabian expansion

Owner: `lane-36-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Census: [`arabian-census.tsv`](arabian-census.tsv) — 48 rows, every candidate with
an explicit disposition.

    candidates censused   48
    ADD                   25   ingested
    EXISTING              12   already held
    BLOCKED                7   genuine blockers, exact uncertainty recorded
    REJECT                 4   out of scope by standing rule

    corpus   6,761 -> 6,786 figures
    Arabian      12 -> 37 records
    traditions          560, unchanged

## The gap: four gods, eight poets, and not one other idol

The Arabian key held **twelve records** — Hubal, Allat, al-'Uzza and Manat, plus
eight figures of the Mu'allaqat and the poetic tradition.

The four deities are **exactly the four the Qur'an argues with**: Hubal at the
Ka'ba, and the three of Surat al-Najm. Beyond them the key held **no idol at
all** — not the five of Surat Nuh, not Isaf and Na'ila on the two hills of the
Meccan rite, not Manaf, whom the sources say was once the most important deity in
Mecca.

It also held **no people of the cult**. No Amr ibn Luhayy, who in the tradition's
own telling brought Hubal to Mecca; no Qusayy ibn Kilab, who set Isaf and Na'ila
by Zamzam; and **not one kahin**, though the sources are explicit that the kahins
were the religious leaders of pre-Islamic Hijazi spirituality. Eight poets and no
priests.

## A scope correction made before authoring, not after

This lane began from the assumption that the Arabian key was also missing the
South Arabian and Nabataean pantheons. **The sweep disproved that before a line
was written.** The corpus already holds them under their own keys:

| key | records |
|---|---|
| Sabaean | Almaqah, Athtar, Shams, Sin, Wadd, ʿAmm (6) |
| Nabataean | Dushara, Allat, al-Uzza, Manat, Qaws (5) |
| Palmyrene | Bel, Baalshamin, Aglibol, Yarhibol, Malakbel (6) |
| Aksumite | Almaqah, Astar, Beher, Mahrem, Medr, Hawbas, Dat Himyam (7) |

So the lane was rescoped to the layer that genuinely has no key of its own: the
**Hijazi and North Arabian** idols and the people of their cult. Deities
belonging to the Nabataean or Sabaean keys are censused BLOCKED **with the
blocker being the key, not the evidence** — al-Kutba, Shay al-Qawm, Ta'lab,
Anbay, Nakrah and Dhat-Badan are real and should be ingested, in their own lanes.

Recording that distinction matters: a BLOCKED row that means "no evidence" and
one that means "wrong key" are different instructions to whoever reads the census
next, and collapsing them would waste a future lane's time.

## The source, and its reliability, carried in the data

Nearly all of this batch rests on **Ibn al-Kalbi's Kitab al-Asnam** (early 9th c.
CE) — which the corpus's four existing Arabian deity records already cite as a
primary source, so the lane follows the key's own established sourcing.

**It is also a source many historians today do not consider reliable** for
Arabian religion before Islam. Ibn al-Kalbi wrote in the early ninth century,
from Arab oral tradition, about a religion suppressed two hundred years earlier,
and with an evident interest in its suppression.

That caveat is written **inside the source blob attached to every record that
rests on it** — not left in this audit. It travels with the data rather than with
the paperwork, so a reader who never opens this file still meets it.

## The fourth sweep failure mode, in a third consecutive tradition

**Only one of the five idols of Qur'an 71:23 resolved in the corpus, and it
resolved to the wrong key.** `Wadd` matched `sabaean_wadd`, the South Arabian
moon-god — not the Qur'anic Wadd of the Kalb at Dumat al-Jandal.

Lane 34 named this mode, lane 35 reproduced it with Michael, Gabriel and Raphael
under the Beta Israel key, and it appears here a third time. The pattern is now
firmly established rather than anecdotal: **a correct cross-tradition record
makes a real gap invisible, because the name resolves and nothing looks missing.**

## Judgement calls worth stating

**The pre-Islamic Allah record is this lane's most sensitive call.** It is scoped
**by its primary name** — "Allah (the pre-Islamic Meccan deity)" — to the figure
the sources describe, and records exactly what they say: a deity some scholars
count among those the Ka'ba was dedicated to, the guardian of contracts, of
little relevance in the Meccan religion, whose chief god was Hubal. **The 1901
lunar-deity theory of Hugo Winckler is recorded only together with its
rejection** — opponents reject it as speculative and unsupported by any
archaeological or textual evidence from pre-Islamic Arabia — and this registry
does not carry it as a live reading. No parentage is written: the "daughters of
Allah" formula is Qur'anic polemic rather than a genealogy the pre-Islamic
evidence establishes, and the solitary verdict says so.

**Two records carry a deliberately imprecise `sex`, because the evidence is what
is imprecise.** Ruda is `varies` — male in the Lihyanite and north-western
inscriptions, female among the Safaitic Bedouin, and the sources say so
explicitly; picking one would have concealed the most interesting fact about the
deity. Atarsamain is `unknown` — the evidence names the figure only as the third
of a trinity.

**Isaf and Na'ila, and Satih and Shiqq, are each authored as pairs.** The Meccan
running-rite has two hills and the kahins are consulted together; authoring one
of either pair would have turned a pair into a singleton, which is the fault this
programme has now found in twenty-one traditions and avoided in three consecutive
lanes.

**All twenty-five carry the era `pantheon-era`.** The key's other registered era,
`mu-allaqat-poetic`, is specifically the poetic tradition, and it is **not**
stretched to cover a cult-founder, a seeress or a soothsayer.

**Four cults in this batch have an idol that is geology rather than sculpture**:
Sa'd's standing stone in open desert, al-Fals's red granite outcrop on a black
mountain, and the two petrified Meccans. That is recorded in the domains rather
than smoothed into a generic "cult image".

## What was blocked, and exactly why

* **al-Kutba, Shay al-Qawm** (Nabataean) and **Ta'lab, Anbay, Nakrah,
  Dhat-Badan** (South Arabian) — real figures, wrong key. See above.
* **al-Uqaysir** — the evidence describes **a place, not a figure**: "a place to
  which tribes were wont to go on pilgrimage and at the shrine of which they used
  to shave their heads." Ibn al-Kalbi lists it among idols, but a figure is not
  authored on a listing alone.
* **Kahl** of Qaryat al-Faw — the search surfaced the reference-work **article
  title and no content whatever**. A title is not evidence.
* **'Awd, Suwayr, Bajar, al-Jalsad, Ya'bub, Muharriq** — names that appear in
  lists of the Book of Idols' contents, for which this pass returned **no
  description at all**: no tribe, no place, no form.
* **Rabi'a ibn Nasr** — found only in his role as the kahins' questioner; whether
  he belongs to this key or to a Lakhmid one is unresolved.

## What was rejected, and under which standing rule

* **The jinn** — a class of being, not a figure; the rule that rejected the
  nanchon, the Gede, the nagas, the tsen and the zædtæ. A *named* jinni with
  substance would be a different matter; none was found.
* **The ghul / si'lat** — classes of desert spirit.
* **"The 360 idols of the Ka'ba"** — a count, not a set of figures. The number is
  evidence about the sanctuary and is carried inside the pre-Islamic Allah
  record's source text.
* **Dhat Anwat** — the tree weapons were hung on: a cult object, not a person.

## Sourcing discipline

**Arabic script is supplied only where the name stands in a text this pass
actually cites** — the five of Qur'an 71:23 — **or where the romanisation maps to
a single unambiguous Arabic spelling.** Where a romanisation could map to more
than one plausible consonantal skeleton (Umyanis, Ri'am, Dhu'l-Ka'bat,
Atarsamain, Nuhm, Dhu al-Kaffayn, Ruda, Nuha, Satih, Shiqq) the field is left
**empty** rather than reconstructed. **Fifteen of twenty-five records carry an
Arabic form and ten do not.**

Every unresolved etymology says "not resolved in the sources consulted".

No image was ingested, so the image-licensing rule is not engaged.

## Verification

* `validate-transcripts.cjs` — **25 figures, clean on the first pass**, no
  problems and no RECIPROCAL-NEEDED warnings.
* **No figure authors any parentIds**, so tier-classification drift is impossible
  by construction. Twenty are `deity` and five are `mortal`, matching the existing
  split in this key exactly.
* Full regeneration through all four generators, then `build.py --pages` **and**
  plain `build.py`.
* `verify-regen.sh` — byte-exact after commit.
* Record-level diff: **25 added, 0 removed, 0 mutated pre-existing.** The two
  pre-existing records this batch links to, `arabian_hubal` and `sabaean_wadd`,
  are untouched; both links use a non-symmetric kind written from this end only.
* Ten new figures have neither parents nor relations and were given written
  verdicts in `data-sources/verified-solitary.json` — tribal idols are recorded by
  cult and territory, not by kin, and each verdict says which kind of solitude it
  is.
* Lane 33's name-collision gate green (7/7).
* `npm test` — **309/309 across 227 subtests**, after the fix described below.

## A guard caught a real omission in this batch — and it was the data that was wrong

The first full run of `npm test` **failed**:

    family-graph parity floors hold (wave-7 enrichment)
    figures with no family links grew to 1603 (ceiling 1600)

The obvious move was to raise the ceiling. That would have been wrong: the guard
exists precisely so a batch cannot quietly fill the registry with disconnected
entries, and raising it because my own batch tripped it is quarantining a test to
get green.

**The guard was right and the batch was incomplete.** Two relations were genuinely
attested and I had simply not written them:

* **The five idols of Qur'an 71:23 are a set named in a single verse**, and the
  commentators treat them as one list with one form assigned to each. That is an
  attestation, not an inference — and it is the same kind of relation this batch
  already wrote for the North Arabian trinity and for the two authored pairs. It
  is now written for all five, not only for the four that needed it to clear a
  counter.
* **Allah's rank below Hubal is stated directly by the source**, which says in one
  breath that the chief god in pre-Islamic Arabia was Hubal and that Allah "had
  little relevance" in the Meccan religion. That belonged in a relation, not only
  in a note.

`noFam` fell to **1598** and the suite went green. Five ledger entries were then
**deleted**, because a figure that now carries edges must not be recorded in
`verified-solitary.json` as kinless — leaving them would have made the ledger
assert something false about the corpus.

What was **not** done: no relation was invented to reach a number. Manaf, for
instance, stays solitary. The sources say he was once the most important deity at
Mecca and separately that Hubal became chief idol; "displaced by Hubal" is an
inference I was not willing to write as data, so his solitary verdict stands.

## Escalation: the solitary ledger has no stale-entry gate, and 66 entries are stale

While pruning the five, a measurement: **66 entries in
`data-sources/verified-solitary.json` describe figures that now carry edges.**
They accumulated as later lanes added relations to figures an earlier lane had
recorded as kinless, and nothing removes them.

This is exactly the failure lane 33 built a gate against for the name-collision
allowlist, for exactly the stated reason — *an allowlist nobody prunes is how a
ratchet quietly stops ratcheting*. The `noFam` ceiling test enforces that every
kinless figure HAS a verdict, but nothing enforces that every verdict describes a
still-kinless figure.

**This lane does not build that gate**, because it is an ingest lane and the fix
is a tooling change with its own verification burden. It is recorded here with the
measurement so the decision has a number attached: a stale-verdict gate would
start by pruning 66 entries.
