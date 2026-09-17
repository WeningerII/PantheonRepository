# Lane 9 — Yoruba audit

Owner: `lane-9-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,031 total figures, 20 of them Yoruba.

Corpus: **6,031 → 6,063 figures**. Yoruba **20 → 52**.
Census: 102 rows — **32 ADD, 8 ALIAS, 20 EXISTING, 6 CROSS-TRADITION SAME
FIGURE, 10 REJECT, 26 BLOCKED**.

## The gap

A 72-name check across the whole registry returned 24 hits and 48 absences.
Three of the 24 hits are false positives on the normalised name: `idoma_aje`
is an Idoma figure and not Aje the orisha of wealth; `tahitian_oro` has
nothing to do with the Yoruba Oro; and `santeria_elegua` is the Cuban form of
Eshu, who was already present under his own name.

Yoruba tradition counts its own divinities at four hundred and one by the
commonest formula, and one reference treatment puts the number as high as six
thousand. The registry held twenty records. The interesting thing is not the
size of the shortfall but its shape.

### The diaspora was here and the original was not

**Oshosi**, the hunter orisha, was in the registry — as `santeria_ochosi`,
under Cuban Santería. The Yoruba figure the Cuban one descends from was
absent. This programme has now hit the same inversion three times: Nanaya
absent while the Sogdian Nana that derives from her was present; Lotan absent
while the Hebrew Leviathan that quotes him was present; and now Oshosi. It is
a systematic artefact of how the corpus was assembled, not three coincidences,
and it is worth the owner's attention as a class.

The new record carries `counterpart-of → santeria_ochosi` in the Yoruba
direction. The Cuban record is untouched.

### Households with a member missing

- **Oba**, senior wife of Shango, in a registry holding Shango, Oya and
  Oshun — three of the four principals of that household and not the fourth.
- **Yemowo**, consort of Obatala, in a registry holding Obatala.
- **Aje**, orisha of wealth, in a registry holding her parent Olokun.
- **Ori** — the inner head, the destiny each person kneels and chooses before
  Olodumare — which is by some distance the most-invoked religious object in
  Yoruba practice and which the registry simply did not have.
- **Iku**, death, head of the eight chief Ajogun.

### The Oyo ruling line

The registry held Shango, Aganju and Ajaka and then stopped. Everything with
a date on it was missing: Orompoto the first female Alaafin; Ojigi who brought
Dahomey to tribute in 1730; the whole eighteenth-century sequence of Alaafins
destroyed by their own council; Bashorun Gaa who destroyed four of them;
Abiodun, Aole, Afonja, Oluewu, Atiba. Nineteen of the thirty-two additions
are people, not gods.

And **Moremi Ajasoro**, in a registry that held her husband Oranmiyan.

## What the constitution did

The single most consequential fact about Oyo is institutional and the registry
could not previously express it, because none of the parties were in it.

The Oyo Mesi, the council of seven under the Bashorun, could reject an
Alaafin: a covered calabash or a parrot's egg was sent, and the king was then
obliged to take his own life. Ajagbo, in the seventeenth century, created the
counterweight — the Are Ona Kakanfo, a standing field marshal appointed by
the Alaafin and outranking the council in war.

Both instruments then destroyed the thing they were built to protect. Gaa
used the calabash four times in twenty years. Afonja used the marshalate to
take Ilorin out of the empire in 1817. The batch records eight of the men on
the receiving end — Gberu, Amuniwaiye, Onisile, Labisi, Awonbioju, Agboluaje,
Majeogbe, and Aole — alongside the two who wielded the instruments.

Labisi lasted seventeen days and was never crowned. Awonbioju lasted a hundred
and thirty. Both died in 1754, between June and October. A list of Alaafins
that omits them is a list of the ones who survived, which is a different
subject.

## Corrections and contradictions carried, not smoothed

Four disagreements in the reachable sources are recorded on the face of the
records rather than resolved:

1. **Ajagbo's 140-year reign.** Attributed in the tradition, disbelieved by
   scholars who hold that other Alaafins' reigns — Oluodo's among them — have
   been folded into his. The record says both things.
2. **Gberu c. 1735-1746 against Amuniwaiye c. 1738-1742.** His successor's
   reign cannot fall inside his. Both records state the overlap.
3. **Onisile acceding in 1746 while the Dahomey campaigns credited to his
   reign are dated 1742 and 1743.** Stated on the record.
4. **Afonja's death** — c. 1813 in one reference treatment, 1823 or early
   1824 in others. The earliest of these cannot be reconciled with the 1817
   secession being his, and the record says so instead of choosing.

## Scoping decisions

**One pre-existing record modified: none.** Every symmetric relation in this
batch is reciprocated inside the batch, so no record outside it was touched.
Relations toward pre-existing records use non-symmetric kinds only —
`counterpart-of → santeria_ochosi`, `consort-of → oranmiyan`,
`subordinate-to → olodumare`, `parentIds: [olokun]`.

**Ibadan deferred.** Oluyole is in, because the settlement that ended the Oyo
collapse had two parties and he is the other one — Abiodun's grandson,
Bashorun of Ibadan, the man Atiba talked into accepting a nominal sovereign.
The rest of the nineteenth-century Ibadan leadership — Oluyedun, Oderinlo,
Ogunmola, Ibikunle, Latoosa — is real, absent, and partially reachable, and
is BLOCKED as a unit rather than sampled. Taking one of them here would be
exactly the arbitrary partial the census exists to prevent.

**Dahomey and Sokoto deferred.** Agaja and Tegbesu of Dahomey and the Fulani
cleric Alimi are named in the Ojigi, Onisile and Afonja records and are
claimed by none of them. They are CROSS-TRADITION rows for a Fon pass and a
Sokoto pass respectively. The registry holds nine Fon records and no Dahomean
kings at all.

**Observed and not touched:** the corpus carries `edo_olokun`/`olokun`,
`fon_nana_buluku`/`nana_buruku` and `edo_esu`/`eshu` as pairs across
tradition keys. These are pre-existing cross-tradition duplications, flagged
in the census and not merged — merging is destructive and the tradition-key
question is the owner's.

## What is BLOCKED and why

Twenty-six rows, each carrying the exact uncertainty, the sources checked and
the evidence that would unblock it. They fall into three kinds.

**Diaspora contamination (Logunede, Ayao).** Everything reachable is
Candomblé or Santería practice presented as Yoruba practice. The two have
diverged over four centuries and this batch does not treat one as evidence for
the other.

**Genuinely ambiguous referents (Obalufon, Odu, Onile, Agbonyin).** Obalufon
is at least two people in the Ife king-lists. Odu is both the 256-sign Ifa
corpus and a female figure said to own the calabash of existence, and the
session could not establish which the tradition treats as a person. Agbonyin,
Abiodun's daughter murdered by Gaa, may or may not be the same woman as
Agbonrin, Abiodun's daughter who was Oluyole's mother; two treatments spell it
two ways and neither cross-references the other.

**Names with nothing attached (Oke, Olosa, Aroni, Eguguojo, Oluodo, Jayin,
Abipa, Obalokun, Odarawu, Ajiboyede, Ayibi, Elewi-odo, Jambu, Olukoyisi,
Laderin, Pasin, Alugbin, Oyabi).** Reference treatments exist for several of
these — the search returns their titles — but nothing beyond a name and a
role was retrievable from this session, and a record consisting of a name and
a role is not a record. Eguguojo is the sharpest case: he is Orompoto's
brother and predecessor, which makes him the reciprocal her record cannot
carry, and there is nothing else about him to write.

Ten further candidates were REJECTED rather than blocked, all on the standing
rule against generic classes and offices: Orisha, Irunmole, Ajogun, Egungun,
Abiku, Emere, Oyo Mesi, Are Ona Kakanfo, Bashorun, Oro. Where the class has a
named head the head is ingested and the class is not — Iku is in, the Ajogun
are not; Ajagbo and Afonja are in, the marshalate is not; Gaa and Oluyole are
in, the Bashorunate is not.

## Sourcing

No direct outbound web access from this session — fetches are refused at the
proxy — so all research went through server-side web search, and every
citation names what was consulted rather than pretending to a monograph. No
Ifa verse is cited that the search did not return. One search returned
"unavailable" and offered the model's general knowledge instead; that offer
was declined and the affected candidates are BLOCKED rather than written from
recall.

## State

**PARTIAL.** Thirty-two additions take Yoruba from 20 records to 52, against a
tradition that counts its own divinities in the hundreds. What remains, in
rough order of size: the Ibadan war-chiefs; the rest of the Alaafin list, some
forty names; the Ife dynastic material around Obalufon; the Ekiti, Ijebu and
Egba local orisha; and the hundreds of town-level and lineage orisha that the
"four hundred and one" formula is pointing at, most of which will need
sources this session cannot reach.
