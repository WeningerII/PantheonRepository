# Lane 3 — Canaanite (Ugaritic) and Phoenician audit

Owner: `lane-3-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 5,959 total figures — 19 Canaanite, 7 Phoenician.

Corpus: **5,959 → 5,992 figures**. Canaanite **19 → 42**, Phoenician **7 → 17**.
Census: 65 rows — **33 ADD, 3 ALIAS, 12 EXISTING, 5 CROSS-TRADITION SAME
FIGURE, 6 REJECT, 6 BLOCKED**.

## The gap

Ugarit gave us three continuous narrative poems with named casts — the Baal
Cycle, the Kirta epic, the Aqhat epic — and the registry was carrying the
principals without the casts. A 56-name check across the whole registry
returned five hits and fifty-one absences. The shape of what was missing:

- **Athtar**, who climbs onto Baal's empty throne and finds his feet do not
  reach the footstool. The registry carried the South Arabian and Aksumite
  gods of that same theonym (`sabaean_athtar`, `aksumite_astar`) and not the
  Ugaritic god the Baal Cycle is actually about.
- **All three of Baal's daughters** — Pidray, Tallay, Arsay — and **both of his
  messengers**, Gupan and Ugar, and **Athirat's** messenger Qudshu-wa-Amrur.
- **Lotan**, the seven-headed serpent. The registry held `yahwism_leviathan`
  and not the Ugaritic serpent whose epithets the Hebrew text is quoting
  nearly word for word. Also **Tunnanu**, the *tannin*.
- **Shahar and Shalim** — Dawn and Dusk, who have a tablet to themselves and
  whose names sit inside "Helel ben Shachar" and "Jerusalem".
- **The whole human cast of the Kirta epic**: Pabil, Hurraya, Yassib, Ilhu,
  Thitmanat — and Shataqat, the being El makes out of nothing when he has
  asked the divine assembly seven times who will cure the king and no one
  answers. The registry held Kirta alone.
- **Yatpan**, who kills Aqhat, in a registry holding both Aqhat and Paghat.
- **Baalat Gebal**, chief deity of Byblos, and most of the cast of the one
  surviving Phoenician cosmogony.

## Philo of Byblos, and why his cast is admitted

Ten of the thirty-three are Phoenician, and six of those come from Philo of
Byblos's *Phoenician History* — Elioun, Berouth, Baetylos, Taautos, Chousor,
Sydyk and Misor. Philo survives only because Eusebius quoted him at length in
order to refute him, he claims to be translating a much older writer
(Sanchuniathon), and he is euhemeristic throughout: he presents gods as early
kings and inventors.

That is a lot of reasons for caution, and the records say all of it on their
face. The reason the material is admitted rather than rejected is that the Ras
Shamra tablets, excavated in 1929, corroborated a substantial amount of what
Philo reports — **Chousor turned out to be Kothar-wa-Hasis**, whom nobody in
1850 had heard of. A source that gets a Bronze Age craftsman god right two
thousand years later is transmitting something.

**Sanchuniathon himself is dispositioned REJECT**: he is a claimed transmitter,
not a figure of the mythology, and everything known about him comes from the
person claiming to translate him.

## Two pre-existing records modified, and why

`enemy` is a symmetric relation kind, and the single defining fact about each
of the two sea monsters is who kills it. So:

- `canaanite_baal` gains `enemy → canaanite_lotan`
- `canaanite_anat` gains `enemy → canaanite_tunnanu`

Both are added to their own transcript, both are one relation, and the
record-level diff against `origin/main` confirms these are the only two
pre-existing records touched: **33 added, 0 removed, 2 mutated, both in
`relations` only.** Baal's transcript record had no `relations` key at all —
his existing `equated-with` and `interpretatio` edges come from
`data-sources/enrichments/enrich-06.json` — so the key was added and the
regenerated corpus was checked to confirm the enrichment edges survive
alongside the new one. They do.

## A pre-existing duplication, observed and not touched

The corpus carries **Danel twice** — `canaanite_daniel` and `levantine_danel`
— and **Paghat twice**, as `canaanite_paghat` and `levantine_pughat`. These are
the same two figures from the same poem under two tradition keys. The census
records both as CROSS-TRADITION SAME FIGURE.

They are **not merged here**. Merging records is destructive, it is outside
what an additive pass should do on its own authority, and the right answer
depends on whether "Levantine" is meant as a tradition key for the Ugaritic
material or for something else — which is the owner's call. Flagging it is
the useful thing this pass can do.

## Rejected

Six REJECT rows, and five of them are the same kind of thing — a transparent
epithet, which this programme does not ingest:

- **Nahar**, "Judge River", is half of Yam's standing double title
  (*zbl ym tpt nhr*), not a second god.
- **Baal Zaphon** is Baal with a mountain attached.
- **Athtart-shem-Baal**, "Athtart name-of-Baal", is a cult title of Athtart.
- **Athirat's seventy sons** are a collective with no individual names.
- **Ithm** is a name in an offering list with no recoverable character.

Plus **Sanchuniathon**, for the reason given above.

## Six BLOCKED

| candidate | exact uncertainty | evidence needed |
|---|---|---|
| Chemosh | whether to open a Moabite tradition key | the owner's call on tradition granularity |
| Ashtar-Chemosh | distinct deity, compound, or epithet | a treatment of the Moabite pantheon |
| Kinnaru | whether anything beyond the name in the god-lists is attested | a treatment of the deified objects at Ugarit |
| Sheger | god at Ugarit, or a common noun Hebrew fossilised | a treatment of Sheger and Ashtaroth-of-the-flock |
| Mikal | his sphere, and his relation to Resheph | a treatment of the Beth Shean Mekal stele |
| Anat-Yahu | distinct goddess, consort title, or hypostasis | a treatment of the Elephantine pantheon |

**Chemosh is the one worth naming twice.** He is the national god of Moab,
named repeatedly on the Mesha Stele, and he is absent from the registry under
*any* tradition — which is a real hole. He is blocked rather than added because
Moab has no tradition key in this corpus at all, and inventing one for a single
god is a scoping decision that should be made deliberately rather than as a
side effect of a Canaanite pass.

## Solitary verdicts

Five of the 33 end with no parent and no relation, each with a cited verdict:
Horon, Ilib, Adon, Baetylos, Shadrafa.

Two of them are interesting rather than merely thin. **Ilib** is "god of the
father" — his name is also the common noun for an ancestor's spirit, so being
kinless is almost definitional: he is what a family's dead are collectively
called. **Adon** has an enormous Greek genealogy (Myrrha, Cinyras, Aphrodite,
Persephone) which is precisely the wrong kin to hang on the Phoenician record,
because it belongs to the Greek reception of him and not to Byblos.

## Sourcing

No direct outbound web access in this session — every fetch is refused at the
proxy — so research went through server-side search and the citations name what
was consulted. Primary texts are cited as primary where the claim comes from
the text: the Baal Cycle (KTU 1.6 for the Athtar scene), KTU 1.23 for Shahar
and Shalim, KTU 1.100 for Horon, the Kirta and Aqhat epics, and Philo of Byblos
as preserved in Eusebius. No printed monograph is cited as though it had been
read. Where the literature records a live disagreement the record states it
instead of settling it: Arsay's membership of the triad rests on one passage
and her record carries a `variants[]` entry saying so; whether Milku and Rapiu
are one god is recorded as a link, not a merge; which of El's two partners
bears which twin is left unassigned.

## Verification performed

- `node scripts/validate-transcripts.cjs data-sources/transcripts/canaanite-expansion.txt` → clean, 33 figures
- full regeneration (4 generators + `build.py`), then `bash scripts/verify-regen.sh` → byte-exact
- `npm test` → full suite green
- record-level diff of `app/data.js` against `origin/main`: **33 added, 0 removed, 2 pre-existing records mutated** (`canaanite_baal`, `canaanite_anat`, `relations` only)
- relation edges 9,746 → 9,794; kinless figures 1,464 → 1,469 (ceiling 1,600, unchanged)
- zero dangling references and zero era inversions in the corpus warn stream

## Status: PARTIAL

The Ugaritic narrative material is now substantially covered — the Baal Cycle,
the Kirta epic and the Aqhat epic have their casts. What remains:

- **Chemosh and the Moabite pantheon**, pending the tradition-key decision
- the Ammonite (Milcom) and Edomite (Qos) national gods, the same question
- the Ugaritic god-lists' long tail: deified objects (Kinnaru the lyre),
  the minor names in the offering texts, the Hurrian gods worshipped at Ugarit
- the Phoenician and Punic city pantheons beyond Byblos — Sidon, Tyre, Carthage
  are represented by their chief gods and not their households
- the deferred **Levantine-imports** group named in the Egyptian audit (Reshep,
  Anat, Astarte, Baal and Qetesh in their Egyptian cults), which touches this
  tradition from the other side

No blocker prevents that work; it is more than one coherent PR.
