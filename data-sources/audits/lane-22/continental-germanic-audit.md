# Lane 22 — Continental Germanic audit

Owner: `lane-22-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,510 total figures, 8 of them Continental Germanic.

Corpus: **6,510 → 6,536 figures**. Continental Germanic **8 → 34**.
Census: 87 rows — **26 ADD, 12 ALIAS, 8 EXISTING, 11 CROSS-TRADITION SAME
FIGURE, 15 REJECT, 15 BLOCKED**.

## Eight goddesses and not one god

A 62-name check across the whole registry returned 14 hits and 48 absences.

The Continental Germanic key held **eight records**, and every one of them was a
goddess: Baduhenna, Beda, Boudihillia, Fimmilena, Friagabis, Nehalennia, Nerthus
and Tamfana — Tacitus and a set of Roman-era altars.

**There was no god in it at all.**

Not **Wodan**. Not **Donar**. Not **Saxnot**. Those three are the exact list a
Saxon convert was made to renounce by name — *ec forsacho Uuoden ende Thunaer
ende Saxnote* — in a ninth-century manuscript from Mainz, and the registry held
none of them.

Nor **Tuisto** and **Mannus**, whom Tacitus says the Germanic peoples sang about
as their origin, and who are therefore **the first Germanic figures named in any
written source at all**.

Nor one figure from the **Merseburg Incantations** — the only surviving text in
Old High German that names the heathen gods, twelve lines in a Fulda manuscript
naming Phol, Wodan, Sinthgunt, Sunna, Frija and Volla.

After this batch the key holds **34 records: 22 female, 11 male, 1 unknown.**

## The altars do not stop at eight either

The eight held records were a sample of a much larger body of dedications. Also
attested, each on its own stone or tablet, and none in the registry:

| goddess | attestation |
|---|---|
| **Hludana** | five inscriptions, Rhineland and Frisia, 197–235 CE |
| **Hariasa** | Cologne, 187 CE — the stone is now lost |
| **Vagdavercustis** | Cologne, 2nd century |
| **Sandraudiga** | North Brabant, 2nd century |
| **Vihansa** | a bronze tablet near Tongeren |
| **Harimella** | Birrens, Dumfriesshire |

**Hludana is attested five times and was not in a corpus that held Beda and
Fimmilena, who are attested at one site each.** That is not a judgement about
importance; it is what happens when a corpus grows by whichever name a
particular source happened to put in front of it.

And **Mars Thingsus** — a god of the *assembly* under the Roman name for a god
of war — stands on the Housesteads stones **beside four of the goddesses the
corpus already held**. It held the four and not him.

## A vocabulary extension, made deliberately and documented

The Continental Germanic era vocabulary registered **exactly one era**:
*Continental Germanic religion under Rome (1st c. BCE – 3rd c. CE)*.

That bucket cannot honestly hold this material. The Merseburg charms are 9th or
10th century. The Old Saxon Baptismal Vow is 9th. The *Origo gentis
Langobardorum* is 7th. Tacitus's origin songs are about a time before any of it.
**Filing them under a label that ends in the third century would put a date on
each record that the record's own sources contradict.**

So this batch adds two era keys to `ERA_ORDER` and `ERA_DATES` in `app/data.js`
— which is the maintenance path that file's own integration-points comment
documents (*"When adding a new era key: update ERA_ORDER[tradition] and
ERA_DATES[tradition][era]"*):

```
continental-germanic-mythic-origins                          textual  −50 …  100
continental-germanic-migration-and-conversion (4th–10th c.)  textual  350 … 1000
```

**The existing era key is unchanged, in the same position, with the same dates.
Nothing already filed moves.** The resulting distribution is 3 / 20 / 11.

This is the first time this programme has changed a tradition's era vocabulary
rather than working around it. It is recorded here because a vocabulary change
is a claim about a tradition's shape and should be arguable, not silent.

## Godan and Frea are not new records, and that is the point

The *Origo gentis Langobardorum* is the textual source of the Lombard theonym
**Godan**, and names **Frea** beside him. Gambara asks Frea for help; Frea tells
the Winnili women to tie their hair across their faces and stand where Godan
will see them at dawn; Godan asks who the long-beards are; and a people's name
is fixed by a joke at the god's expense.

**Godan is Wodan and Frea is Frija.** They are recorded as **aliases** on the two
records this batch creates, with the Lombard episode on those records'
lifecycles, and not as two further records.

Lane 20 found the corpus holding Väinämöinen and Ilmarinen twice each under two
keys and said that duplicating a figure in order to record a second attestation
makes the registry worse. **This is that decision taken in advance, inside one
tradition key, where the temptation is strongest** — because Godan and Frea look
like different names and come from a different century and a different language.

## What the inscriptions say, and what they do not

Three records in this batch are **Germanic gods under Roman names**: Hercules
Magusanus, Mars Thingsus, Mercurius Cimbrianus. The corpus files its Sogdian and
Bactrian cult-forms the same way.

The pairing on the stone **is** the fact: a dedicator wrote a Roman theonym and a
Germanic epithet together. **Which Germanic god stands behind the Roman name is
the disputed part, and no record answers it.**

- No edge from **Mars Thingsus** to `anglosaxon_tiw` or `norse_tyr`, though the
  equation is standard.
- No edge from **Mercurius Cimbrianus** to the Wodan ingested in this same batch,
  though Tacitus says the Germanic peoples worship Mercury above all others and
  every modern reader takes that to mean Wodan.

**A registry can hold both records and let the reader make the equation the
Romans made.** Making it in the data would turn a Roman's description of a cult
into a statement about a being.

The same restraint covers Tacitus's own equation of **the Alcis** with Castor and
Pollux, which is on that record as prose.

## Two women who are in a registry of gods because the sources put them there

**Veleda**, seeress of the Bructeri, predicted the rebels' first successes in the
Batavian revolt of 69–70 CE. She lived in a tower and was not spoken to directly:
a relative carried questions in and answers out, and Rome negotiated with her as
a power.

**Ganna**, of the Semnones, *succeeded* her at the head of a Germanic alliance
and travelled to Rome to be received by Domitian.

**The succession is the finding.** That one seeress follows another at the head
of an alliance means the position was an *office* and not a personal reputation,
and an office is exactly the kind of thing a registry of religion should be able
to show. The corpus held neither holder of it.

**Albruna** is the third, and her record carries its own textual problem on its
face: *Aurinia* is what the manuscripts of Tacitus give, *Albruna* is what most
editors print, and both are on the record rather than one being chosen silently.

**Civilis is rejected in the same batch**, and the line is worth stating: what
the sources record of Veleda is a religious office, and what they record of him
is a campaign.

## Phol is ingested and Balder is not

The Second Merseburg Incantation names **Phol** in its first line and **Balder's
foal** in its second. Whether that is one figure under two names or two figures
in one scene is the charm's central crux.

The corpus holds `norse_baldr`. Creating a Continental Germanic Balder would
either duplicate that record or assert an answer. **Phol is ingested, Balder is a
census row, and neither decides it** — the handling lane 21 gave the two
Hengests and lane 20 gave Turisas.

## Zero pre-existing records mutated

Every symmetric relation is reciprocated in-batch: Frija and Volla `sibling`,
Sunna and Sinthgunt `sibling`, Ibor and Aio `sibling`, Wodan and Frija
`consort-of` both ways. No edge is written toward any of the eight pre-existing
records at all, because the sources give none: the Roman-era altars do not
relate their goddesses to each other, and inventing edges between them to make
the tradition look connected is exactly what this programme does not do.

## What is not asserted

- **No identity between Phol and Balder**, in either direction.
- **No identification of Tuisto with Ymir**; the comparison is a proposal.
- **No identification of Hludana with the Norse Hlóðyn**; likewise.
- **No cross-tradition edges at all** — to `anglosaxon_woden`, `norse_odin`,
  `anglosaxon_seaxneat`, `anglosaxon_thunor`, `norse_sol`, `norse_frigg` or
  `greek` Castor and Pollux. Four Germanic tradition keys now hold Wodan-figures
  and the corpus says nothing about their relationship, which is the rule since
  lane 13.
- **Sinthgunt's name is not glossed.** The glosses disagree and each of them is
  an argument about what kind of goddess she would then be; reading her as a
  moon-goddess because her sister is the sun is precisely the inference this
  registry declines. The etymology field records the disagreement instead.
- **Tuisto's sex is recorded as unknown.** The "twofold one" reading and the
  hermaphrodite inference are readings of an etymology, not statements of
  Tacitus.
- **Donar carries no hammer, chariot or goats.** Those are Norse, and this is a
  continental record built from a continental text.

## Fifteen BLOCKED

**Viradecdis and Ricagambeda are blocked on a tradition question, not an
evidence one.** The sources consulted describe them as Celtic *or* Germanic
without settling which, and **this registry files by tradition**, so an
unresolved tradition is a blocker rather than a detail.

**Fosite** is the strongest plain ADD held for a citation: the god of Helgoland
in the *Life of Saint Willibrord*, whose spring the saint baptised in, and the
Frisian counterpart of the Norse Forseti.

**Ziu** is blocked on lane 21's Wyrd reasoning: an Old High German cognate of Tiw
surviving chiefly in a Bavarian weekday name and in glosses, where whether there
is a figure under the word is the doubt itself.

**The drowned attendants of Nerthus** are a rite and a category of person rather
than a figure — recorded as a row because the corpus holds Nerthus and cannot
state the most-quoted thing about her cult.

And **Balder's foal** is a blocked row for the same reason five horses and two
hounds were rejected in lanes 13 through 19: an animal identified by an owner.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 26 figures, no outstanding
  reciprocals
- sweep run twice: 62 names first (14 hits, 48 absences), then the same list
  after generation — **42 hits, 20 absences**, all 26 new records resolving
- era-vocabulary extension applied to `ERA_ORDER` and `ERA_DATES`, the existing
  key unchanged and in place
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**
- `npm test` → **302/302**, first run, the fourth lane running — including the
  era-inversion and era-registration checks against the extended vocabulary
- record-level diff against the previous head: **26 added, 0 removed, 0
  pre-existing records mutated**
- zero dangling references, zero era inversions, zero tier-classification drift
- **twelve new verified-solitary verdicts**: an altar gives a name and a
  dedicator and no kin, and twelve of these records are altars or single lines
- README and `package.json` counts refreshed to 6,536 / 560 / 5,409 / 7,929 /
  3,198

## Status: PARTIAL

Continental Germanic goes from 8 to 34, from one era to three, and from no gods
to eleven. For the first time the corpus holds Tacitus's origin, the Merseburg
charm, the Old Saxon renunciation formula and the Lombard origin legend.

What remains: **Fosite** first; **Viradecdis** and **Ricagambeda** once their
tradition is settled; **Irmin** and the Irminsul question; the **Matronae**,
which are hundreds of collectives and need a decision about whether this registry
holds group-dedications at all; and the **Gothic** material, which is a further
tradition-key question before it is an evidence question — Jordanes on the
Gothic gods, and the Amal line.
