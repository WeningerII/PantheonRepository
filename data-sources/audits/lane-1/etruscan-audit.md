# Lane 1 — Etruscan audit

Owner: `lane-1-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: `5ee23a365e20d5579369697a735f0f8492fd863d`, 5,734 total figures,
17 of them Etruscan.

## Scope and status

This is an ingestion pass with an explicitly blocked remainder, **not a claim
that the Etruscan tradition is exhausted**. It covers the powers named on the
Liver of Piacenza that can be corroborated independently, the gods of the
Etruscan league and of Volsinii, the gate and underworld figures, the named
divinities of the engraved bronze mirrors, the Greek-reception gods that the
Etruscans naturalised, and the legendary founders and seers of the tomb
paintings.

The census has 47 rows: 33 ADD, 2 EXISTING, 1 ALIAS, 10 BLOCKED, 1 REJECT.
`duplicate_count` combines EXISTING and ALIAS. Counts are of reviewed candidate
rows, not of distinct ancient beings.

Corpus: **5,734 → 5,767 figures**; Etruscan **17 → 50 records**.

## Sources actually consulted

This session has no direct outbound web access — `en.wikipedia.org`,
`britishmuseum.org`, `perseus.tufts.edu`, `britannica.com`, `archive.org` and
the rest are refused by the environment's egress proxy. Research was done
through server-side web search, which returns the substance of those pages
without fetching them. Citations therefore name the reference work or the
attesting object, and no printed monograph is cited as though it had been read.

Evidence classes used, in descending order of weight:

1. **Objects.** The Liver of Piacenza; the Portonaccio sanctuary at Veii and its
   terracotta Apollo; the Pyrgi sanctuary; the sarcophagus of Hasti Afunei at
   Chiusi; the Tomb of Orcus at Tarquinia; the François Tomb at Vulci; the
   corpus of inscribed bronze mirrors.
2. **Ancient text.** Varro on Voltumna as *deus Etruriae princeps*; Livy on the
   Fanum Voltumnae and on the nail-rite of Nortia; Tertullian *Apol.* 24.8 on
   Nortia of Volsinii; Virgil *Aen.* on Tarchon; Claudius's Senate speech on
   Caelius Vibenna and Mastarna; the prophecy of Vegoia in the land surveyors'
   corpus.
3. **Reference works** consulted for each theonym, used for etymology,
   iconography and the state of scholarly opinion.

Low-quality god-list sites were checked and **not** relied on. One claim
encountered there — that Thalna is a god of trade — is contradicted by the
mirror evidence and is explicitly rejected on that record.

## Identity decisions

- **Etruscan counterparts stay separate.** The corpus already keeps Tinia apart
  from Zeus and Jupiter, and already carries `oscan_hercle` separately from
  `greek_apollod_heracles`. Hercle, Aplu, Artume and Letun are therefore
  recorded in their own right. Reviewers should note that
  `greek_apollod_heracles` carries "Hercle" among its alternate names as the
  Italic form; the census row flags this so the overlap is visible rather than
  hidden.
- **Aplu and Śuri.** Current reference treatment makes Apulu/Aplu an *epithet*
  of the fire god Śuri in his chthonic sky-god character; other treatment makes
  Aplu straightforwardly the Etruscan Apollo, with a major native cult at Veii.
  Collapsing the two would settle a live question by data-modelling fiat, and
  leaving them unlinked would hide it. Both records exist and are joined by an
  explicit `equated-with` edge, with the dispute written onto each.
- **Mantus and Mania** are ingested with source weight `low` and an explicit
  caveat: the picture of them as king and queen of the Etruscan dead comes from
  Graeco-Roman and antiquarian report, while the underworld rulers the
  Etruscans themselves name — Aita and Persipnei — are already in the corpus.
- **Calu** was found to be already carried as an alias of `etruscan_aita` and is
  dispositioned ALIAS, not added again.
- **Lasa** is REJECTED as an ingestion. In the evidence "Lasa" works chiefly as
  a class of winged attendant spirits, and this registry does not ingest
  creature classes. Individually named Lasas are treated on their own merits;
  Lasa Vecuvia is carried as an alias of Vegoia.
- **Homonyms.** `Tiur` is filed under that form rather than `Tiv` because an
  unrelated Nigerian `tiv_tiv` already exists; `Alpanu` rather than `Alpan`
  because unrelated Caucasian `lezgin_alpan` and `tsakhur_alpan` exist. In both
  cases the collision is coincidence and is noted on the record.
- **Maris** carries no parentage. One account makes him a son of Hercle, mirror
  scenes place a Maris with Menrva and with Turan, and the epithets Halna,
  Husrnana and Isminthians may distinguish several gods of the name. None of
  that is secure enough to author a filiation.
- **Cacu** is the Etruscan seer of the mirrors, not the Roman fire-breathing
  cattle-thief. The two share a name and nothing else, and the record follows
  the Etruscan evidence only.

## Relations

Every authored edge rests on a scene, an inscription or an ancient statement:
the Usil–Tiur pairing on the liver; Usil with Thesan in the shared-chariot
images (the reciprocal was added to the existing `etruscan_thesan` record);
Alpanu embracing Achvizr and Thanr; Thanr with Thalna in the birth scenes; Mean
crowning Hercle; the Aplu–Artume twinship and their parentage from Tinia and
Letun; Culsans and Culsu as gate-keeping counterparts; Tarchon with Tyrrhenus;
the Vibenna brothers with each other, with Macstrna and with Cacu.

The Cacu edges are marked `enemy` with the ambiguity stated on each: the mirror
scene is read either as the brothers eavesdropping on the prophecy or as their
seizing the seer, and the record keeps both readings.

Ten figures are genuinely kinless and carry cited verdicts in
`data-sources/verified-solitary.json`, per the corpus's "every name is
verified" invariant.

## Blocked candidates

Ten candidates are BLOCKED, in two groups.

**Disputed Liver of Piacenza abbreviations** — `Lvsl`/`Lusa` (region 6),
`Tluscv`/`Tluscva` (12), `Lethns`/`Lethams` (11), `Thufltha` (2), and
`Cilens`/`Cilensl` (1 and 16). The sixteen theonyms on the outer rim are
abbreviated and worn, and consensus on individual readings exists only in a
minority of cases. Ingesting a figure from an abbreviation alone would
manufacture a god out of a contested expansion. **Evidence needed:** van der
Meer's analysis of the bronze liver, or any inscription or image corroborating
the expansion independently. Note the contrast with `Vetis`, which *was*
ingested: there the Roman Vejovis corroborates the liver reading from outside.

**Mirror names this session could not substantiate** — `Munthuh`/`Munthukh`,
`Zirna`, `Atrpa`, `Evan`, `Snenath`. These are reported in the literature as
named figures on engraved mirrors, and several are probably perfectly good
candidates, but accessible sources in this session returned nothing specific
enough to author a record without inventing its content. **Evidence needed:**
the *Corpus Speculorum Etruscorum*, or a reference treatment of each name with
its scene and attributes. Ingesting them now would produce records whose every
field was guesswork.

Because these remain open, the tradition is marked `BLOCKED`, not `DONE`.

## Cross-lane and follow-up leads

- Tertullian *Apol.* 24.8, already mined for Nortia here and for Valentia and
  Visidianus in the Umbrian pass, still names **Delventinus of Casinum**,
  **Ancharia of Asculum**, **Hostia of Satrium** and **Pater Curis** of the
  Falisci. All are Lane 1, in traditions not yet claimed.
- **Śuri / Soranus** touches the Faliscan and Capenate cult of Mount Soracte —
  relevant when a Faliscan tradition is opened.
- **Macstrna / Servius Tullius** and the Vibenna brothers sit on the
  Etruscan–Roman boundary. No Roman king record was merged or modified here;
  whoever takes Roman should decide how to relate them.
- **Cupra** was recorded as Umbrian in the previous pass with her Picene
  sanctuaries as cult sites. A future Picene tradition should coordinate with
  `umbrian_cupra` rather than duplicate her.

## Incidental finding, not fixed here

`parentRoles` is authored in this corpus as a **string array parallel to
`parentIds`** — 184 records at baseline do it that way (`ids: ["a","b"]`,
`roles: ["father","mother"]`), against 2 Kiribati records that use an
object shape. The three records added here that carry parentage (Hercle, Aplu,
Artume) follow the dominant convention.

While checking that convention it became clear that `app/Detail.jsx:64` reads
the field as a **map keyed by parent id**:

```js
const role = entry.parentRoles?.[pid];
```

That lookup returns `undefined` for both authored shapes, so the Parentage
section falls back to the literal label "parent" for every record in the
corpus, and no authored parent role has ever rendered. This is a pre-existing
display bug touching all 186 records that carry the field, not a data problem
in this batch, and fixing it would change rendering well outside an ingestion
PR. Recorded here so it is not lost.
