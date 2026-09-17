# Lane 26 — Buddhist audit

Owner: `lane-26-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,607 total figures, 14 of them Buddhist.

Corpus: **6,607 → 6,641 figures**. Buddhist **14 → 48**.
Census: 93 rows — **34 ADD, 15 ALIAS, 14 EXISTING, 8 CROSS-TRADITION SAME
FIGURE, 10 REJECT, 12 BLOCKED**.

## The registry held Māra and his three daughters and not the man they were sent to tempt

The Buddhist key held fourteen records. This is all of them:

| record | what it is |
|---|---|
| Māra | the tempter |
| Taṇhā, Aratī, Rāgā | his three daughters |
| Śakra | king of the Trāyastriṃśa heaven |
| Sujā | Śakra's wife |
| Vemacitrin | the asura lord Śakra fights |
| Brahmā Sahāmpati | who asks the Buddha to teach |
| Pṛthivī | the earth, called to witness |
| Yama | the judge of the dead |
| Dhṛtarāṣṭra, Virūḍhaka, Virūpākṣa, Vaiśravaṇa | the Four Heavenly Kings |

Every one is a **deva or an adversary** — a figure Buddhism inherited from the
Indian pantheon and filed into its cosmology.

**There was no Buddha in it.** No Śākyamuni, no Amitābha, no Vairocana, no
Bhaiṣajyaguru, no Dīpaṃkara. **No bodhisattva**: no Avalokiteśvara, no
Mañjuśrī, no Maitreya, no Kṣitigarbha, no Tārā. **Nobody from the household**:
no Māyā, no Śuddhodana, no Yaśodharā, no Rāhula, no Mahāprajāpatī. **Not one
disciple**: no Śāriputra, no Maudgalyāyana, no Ānanda, no Devadatta.

Four of the fourteen exist *in order to* attack or petition a man the registry
did not hold. **Pṛthivī is in the corpus because she was called to witness, and
the corpus did not hold who called her.**

This is the programme's recurring finding at the largest scale it has yet
reached. Not a missing adversary (Arawn without Hafgan), not a missing household
(Weohstan and Wiglaf without Eanmund), not a missing antagonist at the centre of
a cycle (Kumarbi without Anu) — but **a world religion filed entirely through the
beings on its margins**.

## A schema problem this batch cannot solve and will not hide

The registry's `type` vocabulary is `deity | numen | demigod | quartigod | scion
| mortal`.

**Buddhism does not regard a Buddha as a god**, and a bodhisattva is not a god
either. The devas this corpus already holds are, in this tradition's own account,
unenlightened beings inside saṃsāra — and it is precisely the Buddhas and
bodhisattvas, who are *not* gods, that stand above them. The vocabulary has no
category for that, so the batch chose the two least-wrong assignments and said so
on every affected record:

- **Śākyamuni is `mortal`**, with Śuddhodana and Māyā in `parentIds` and the
  awakening on his lifecycle, which is where the tradition puts it. His household
  and disciples are `mortal` for the same reason — 17 records.
- **The Buddhas and bodhisattvas are `deity`**, the nearest category the
  vocabulary has — 17 records, **each of which states in its notes that the
  tradition does not call them gods.**

**Escalated, not papered over.** It is the same class of problem lane 23 raised
about the Armenian era labels: a vocabulary that fits most of the corpus and
misdescribes one tradition. The difference is scale — here it misdescribes the
tradition's two central categories.

## And one registered era for everything

The Buddhist era vocabulary has exactly one entry, `mythic`. So the historical
Buddha's lifetime, the celestial Buddhas of the pure lands, and Maitreya — who
has not come yet — are all filed in the same bucket. All 34 new records are
`mythic` because there is nothing else to be.

**This batch does not extend the vocabulary.** Lane 22 extended the Continental
Germanic list because a label's stated date range *contradicted* the material
filed under it. Here the single label is **coarse, not wrong**, and splitting a
tradition's era vocabulary is a claim about that tradition's shape that the owner
should make, not a side effect of an ingest lane.

## Five of the sweep's nineteen hits are false, and one is false inside this tradition

A 66-name check returned **19 hits and 47 absences** before this batch. The hits
flatter the corpus in the way lane 25 first documented — and worse:

| name | what the sweep hit | what it is not |
|---|---|---|
| **Sujātā** | `buddhist_suja` | Śakra's wife, not the woman who gives the Buddha milk-rice |
| **Rāhula** | `tibetan_buddhist_za_rahula` | a wrathful protector, not the Buddha's son |
| **Tārā** | `hindu_tara` | Bṛhaspati's wife, not the bodhisattva |
| **Gautama** | `hindu_gautama_maharishi` | a Vedic ṛṣi, not Siddhārtha |
| **Guanyin** | `chinese_guanyin` | a real record of the same cult under another key |

**The Sujātā hit is the sharpest thing this programme has found about its own
method.** Lane 25 established that a name-sweep over a tradition-filed corpus
reports a tradition as better covered than it is, wherever that tradition took
gods in from elsewhere. Sujātā shows the failure can occur **inside a single
tradition key**: two different people in the same tradition whose names normalise
together, so the sweep reports the tradition's own figure as present when what is
present is somebody else entirely.

After this batch: **54 hits, 12 absences**, all 34 new records resolving.

## Guanyin: one cult, two keys, and no duplicate

`chinese_guanyin` already exists. Avalokiteśvara is the same cult under the
Indic name, and Chenrezig and Kannon are the Tibetan and Japanese forms.

The batch **creates the Buddhist record and does not create a duplicate of the
Chinese one, and draws no edge between them** — an equation is a claim, and this
programme does not write equations it did not have to make. Chenrezig and Kannon
are carried as **aliases on the new record, deliberately**: lane 25's Umbu catch
happened *because* an alias surfaced an overlap on the second sweep. An alias
that collides is the mechanism working, not a defect.

Avalokiteśvara's notes name `chinese_guanyin` explicitly, so the next lane to
touch either key finds the overlap stated rather than having to rediscover it.

This is now the fourth lane to raise tradition-key duplication: Finnish/Karelian
(lane 20), Korean/Jeju (lane 24, four pairs), Hittite/Hattic Telipinu (lane 25),
and now Buddhist/Chinese — plus the Tibetan Buddhist key, which holds wrathful
protectors the Buddhist key holds none of.

## What the batch added

- **The Buddha and his household (8)** — Siddhārtha Gautama; Māyā and
  Śuddhodana, his parents; Mahāprajāpatī, her sister, who raised him and who
  founded the order of nuns; Yaśodharā; Rāhula, their son; Devadatta, his
  cousin, disciple and rival; Ānanda, his attendant, who argued for the nuns.
- **The ten great disciples (8)** — Śāriputra and Maudgalyāyana, foremost in
  wisdom and in psychic power, who came to the Buddha together and appear
  together in every list; Mahākāśyapa; Subhūti; Pūrṇa; Kātyāyana; Aniruddha;
  Upāli, the barber who recited the Vinaya at the first council.
- **The eight great bodhisattvas and Tārā (9)** — Avalokiteśvara, Mañjuśrī,
  Vajrapāṇi, Maitreya, Kṣitigarbha, Samantabhadra, Ākāśagarbha,
  Sarvanivāraṇaviṣkambhin, and Tārā.
- **The Buddhas (8)** — the five wisdom Buddhas (Vairocana, Akṣobhya,
  Ratnasambhava, Amitābha, Amoghasiddhi), Bhaiṣajyaguru, Dīpaṃkara, and
  Prabhūtaratna, whose stūpa appears wherever the Lotus Sūtra is recited.
- **Sumedha (1)** — the ascetic who lies down in the mud for Dīpaṃkara to walk
  over and is prophesied to become Śākyamuni. He is the Buddha's own earlier
  life, and the corpus held neither end of that prophecy.

**The registry held Yama, the judge of the dead, and not Kṣitigarbha, who vows to
empty the hells.** That pairing is this lane's version of the same fault.

## Zero pre-existing records mutated

47 of the 50 relations are **in-batch**; only three point at pre-existing
records, and all three are non-symmetric: Śākyamuni `tempted-by` Māra,
`called-to-witness` Pṛthivī, `entreated-by` Brahmā Sahāmpati.

Every in-batch symmetric relation is reciprocated: Śākyamuni/Yaśodharā `spouse`,
Śuddhodana/Māyā and Śuddhodana/Mahāprajāpatī `spouse`, Māyā/Mahāprajāpatī
`sibling`, Yaśodharā/Devadatta `sibling`, Śāriputra/Maudgalyāyana `companion`.

**Only two records carry `parentIds`** — Śākyamuni (Śuddhodana, Māyā) and Rāhula
(Śākyamuni, Yaśodharā). Both are literal parentage in the sources, and both
compute `mortal` from descent, which is what the records are authored as.

**Set membership is written as relations, never as `parentIds`.** The eight great
bodhisattvas, the five wisdom Buddhas and Tārā's place in Avalokiteśvara's
tradition are attested groupings, and a grouping is not a genealogy — lane 23's
rule, applied here to sets rather than to offering lists. Those edges took the
batch from 16 kinless records to 2, without asserting any descent.

## What is not asserted

- **No edge to `chinese_guanyin`**, for the reason above.
- **No edge to `hindu_yama` or `hindu_tara`.** The Buddhist Yama and the Hindu
  Yama share a name and a history; that is a fact about how Buddhism absorbed the
  Indian pantheon, not a relation between two records.
- **No mother for the bodhisattvas or the Buddhas.** Māyā is Śākyamuni's mother
  and nobody else's; the celestial Buddhas do not have parents in the sources,
  and inventing them to fill `parentIds` would be inventing the tier.
- **The thirty-two marks, the seven steps and the birth from the side are on
  Śākyamuni's record as what the sources say, not as dates.** His lifecycle
  carries the awakening; it does not carry a birth year the traditions disagree
  about.
- **Sumedha is not merged into Śākyamuni.** The sources treat the earlier life as
  a distinct person with his own act; two records and an edge is what the
  material supports.

## Twelve BLOCKED

**Sujātā is the sharpest**, for the reason in the sweep section: the woman whose
milk-rice ends the fasting and begins the middle way, blocked for want of a
retrievable treatment, and simultaneously the name the sweep resolves onto
somebody else inside her own tradition.

**Channa**, the charioteer who drives him out and who names the old man, the sick
man and the corpse, is named in every life and carried by none of the retrieved
material. **Asita**, who reads the marks and weeps. **Mucalinda**, the nāga who
raises his hoods over seven days of rain — a serpent with an act of his own,
which would fall on the Twrch Trwyth side of the line rather than the Kaṇṭhaka
side. **Hārītī**, the child-eating yakṣiṇī the Buddha converts by hiding one of
her five hundred children.

**Mahākāla, Yamāntaka and Acala** are a **tradition-key question before they are
an evidence question**: this corpus holds wrathful protectors under the Tibetan
Buddhist key — Begtse, Palden Lhamo, Pehar — and none under the Buddhist one.

**Nāgārjuna** reopens the scope question for the third time. He is a historical
philosopher with a legend attached (the nāgas give him the Prajñāpāramitā
sūtras), which is exactly what lane 23 left open with Trdat III and lane 24 with
Jumong's successors. **Bimbisāra, Ajātaśatru and Aśoka** are the same question one
step further into history.

Two of the twelve are not figures at all: **the era vocabulary** and **the type
vocabulary**, blocked because they are owner decisions, recorded as blockers
because they are the largest things this lane could not do.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 34 figures, no outstanding
  reciprocals
- sweep run against both heads with the same 66-name list: **before 19 hits / 47
  absences, after 54 hits / 12 absences**, all 34 new records resolving
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**
- `npm test` → **302/302**, first run
- record-level diff against the previous head: **34 added, 0 removed, 0
  pre-existing records mutated**
- zero dangling references, zero era inversions, zero tier-classification drift
- **two new verified-solitary verdicts**: Bhaiṣajyaguru and Prabhūtaratna
- README and `package.json` counts refreshed to 6,641 / 560 / 5,437 / 7,929 /
  3,198

## Status: PARTIAL

Buddhist goes from 14 to 48, and the corpus now holds the man Māra was sent to
tempt, the woman who called the earth to witness him, the son he left on the
night he went, the disciples who carried the teaching, and the Buddhas and
bodhisattvas the tradition actually addresses.

What remains: **Sujātā**, **Channa**, **Asita**, **Mucalinda** and **Hārītī**,
who are blocked on sourcing and not on judgement; the **wrathful protectors**,
who are blocked on the Buddhist/Tibetan Buddhist key question; **Nāgārjuna** and
the kings, who are blocked on the historical-persons scope question now open in
three traditions; and the **two vocabulary escalations**, which are the owner's
to decide and which this lane deliberately did not decide for them.
