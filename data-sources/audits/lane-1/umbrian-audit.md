# Lane 1 — Umbrian audit

Owner: `lane-1-a425c0b1417b`. Claim branch: `audit/lane-1-umbrian`.
Baseline: `b4d8918ae913d45d146d71ae3fc8301d503efa12`, 5,721 total figures.

## Scope and status

This is an ingestion-ready census with explicitly blocked research, **not a
claim that the Umbrian tradition or Lane 1 is exhaustive**. It covers all seven
existing Umbrian entries, the divine recipients and relevant landmark names in
the seven Iguvine Tablets, minor-inscription leads, and three individually named
local cult figures in Roman-era Umbria. Remaining philological questions and
unverified epigraphic leads are retained in the census rather than converted
into confident new identities.

The census has 48 rows: 13 ADD, 9 EXISTING (including two Roman comparison
records), 8 ALIAS, 16 BLOCKED, and 2 REJECT. Counts refer to reviewed candidate
rows, including separately evaluated names; they are not a count of distinct
ancient beings. `duplicate_count` combines EXISTING and ALIAS. ADD means accepted
for this batch; `added_count` is only advanced after generation. The TSV is the
authoritative per-candidate disposition record.

## Sources actually consulted

- **TI / P59**: [Iguvine Tablets, complete English translation by J. W. Poultney](https://www.attalus.org/docs/iguvium.html), from *The Bronze Tables of Iguvium* (1959). All tablet sections were reviewed. References in the census are tablet/face/line references, not invented book page numbers. The full printed commentary was **not** consulted. Translation choices alone do not resolve disputed divine identities.
- **OB19**: Donald O'Brien, [*Umbrian: lexicon of the Tabulae Iguvinae + the minor inscriptions*, 18 October 2019](https://www.academia.edu/40662492/Umbrian_lexicon_of_the_Tabulae_Iguvinae_the_minor_inscriptions_2019_10_18). Used as a discovery index and locator for variant readings, particularly pp. 13–19 and the entries *purtuvies* and *stafli*. This compilation is not treated as sufficient independent authority to ingest disputed figures. Its reports of Rix, Untermann, and Poultney are explicitly indirect.
- **L21**: Jean-Claude Lacam, [“Géométrie rituelle : les triades divines dans la cérémonie de purification (Étude eugubine)”](https://www.persee.fr/doc/rbph_0035-0818_2021_num_99_1_9630), *Revue belge de Philologie et d'Histoire* 99.1 (2021), 201–227, DOI 10.3406/rbph.2021.9630. Accessible opening page consulted for the ritual-network framing; later pages were not available as readable text. No specific later-page finding is attributed to it.
- **M16**: Francesco Marcattili, [“Tra Venere, Bona Dea e Cupra. Note a margine della lamina di Fossato di Vico”](https://www.academia.edu/32290373/Tra_Venere_Bona_Dea_e_Cupra_Note_a_margine_della_lamina_di_Fossato_di_Vico_in_A_Ancillotti_A_Calderini_R_Massarelli_a_cura_di_Forme_e_Strutture_della_Religione_nellItalia_mediana_antica_Atti_del_Convegno_Internazionale_IRDAU_Perugia_Gubbio_2011_Roma_2016_pp_469_489), in *Forme e strutture della religione nell'Italia mediana antica* (2016), 469–489. In particular pp. 478–480 support the Fossato di Vico sanctuary and the comparison with Bona Dea; an interpretive comparison is not encoded as identity.
- **C01**: Alberto Calderini, [“Cupra. Un dossier per l'identificazione”](https://www.academia.edu/2702518/A_Calderini_Cupra_Un_dossier_per_l_identificazione_Eutopia_n_s_1_1_2_2001_pp_45_129), *Eutopia* n.s. 1.1–2 (2001), 45–129. Bibliographic/identification lead; not relied on as a fully read monograph.
- [Photographed and transcribed Cupra dedications from Plestia and Fossato di Vico](https://www.keytoumbria.com/Perugia/Sala_dei_Bronzi.html). Object texts and find contexts cross-checked with M16. **ST Um** denotes the conventional *Sabellische Texte* inscription identifiers supplied by these sources, not a claim to have consulted that entire corpus.
- [Pliny, *Epistles* 8.8](https://www.attalus.org/old/pliny8.html#8), J. B. Firth translation (1900): Clitumnus, sanctuary, oracle, statue and offerings. [Suetonius, *Caligula* 43](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Suetonius/12Caesars/Caligula*.html#43), J. C. Rolfe translation (1913): independent sacred-grove attestation. No Oceanus/Tethys parentage was accepted.
- [Tertullian, *Apologeticum* 24.8](https://www.tertullian.org/anf/anf03/anf03-05.htm), *Ante-Nicene Fathers* translation: Valentia of Ocriculum and Visidianus of Narnia. These are local Italian cult figures reported by a Christian author, not Christian figures. Sparse attestation is stated rather than padded with invented attributes.

## Search and review log

1. Inspected generated runtime corpus, original Umbrian transcript, the
   generator's ID deduplication, source structures, schema comments, and tests.
   Reviewed the seven existing Umbrian records before adding candidates.
2. Searched “Iguvine Tables deities Hontus Tefrus Fisus Sancius Vesuna Puemonus”
   and “Umbrian religion gods Cupra Vesta Hondia Hunte Iuvie Padella”. These led
   to the complete TI translation, epigraphic material, and lexical bibliography.
3. Read TI I–VII, following ritual groupings outward instead of selecting major
   gods. Recorded alternate names and adjectival/inflectional forms separately.
4. Reviewed OB19's theonym index and its non-name entries where readings differ.
   Followed minor-inscription leads for Cupra, Supunne, Arentia, and Uoburi.
5. Independently searched Cupra's archaeological record and consulted M16;
   followed the primary literary accounts for Clitumnus and municipal cults.
6. Further queries for Ahtus/Stafli/Hula/Purdovif and the minor inscriptions
   returned inconclusive, empty, or unrelated results. The IRDAU original-text
   link was unavailable; the accessible HAL/OpenEdition versions of additional
   Lacam commentary returned access-denied or bot-check pages. These failures
   are **not evidence of absence** and do not establish source saturation.
7. Compared canonical names, aliases, attested inflections, and native forms
   against the entire runtime corpus with Unicode normalization and manually
   reviewed the resulting identity questions. None of the 13 ADD candidates
   matches an existing canonical name, alias, or name-attestation form. Fuzzy
   textual hits in notes were also examined; resemblance alone was not treated
   as identity.

## Identity and existing-record review

- The repository keeps Roman Jupiter, Greek Zeus, and Etruscan Tinia separately,
  while some transferred heroes share records. That precedent is preserved.
- Fisus/Fisovius are retained in one new record, with the interpretive distinction
  acknowledged. Hondus's two cult affiliations are not made into two persons.
- Jupiter Sancius, Mars Hodius and Iupater receive alias dispositions pointing to
  the existing Umbrian gods. This census does not imply that their aliases were
  added to the original transcript: it documents identity resolution.
- Puemonus and Vesuna have a reciprocal cult association. The inscription's
  possessive phrase does not by itself establish marriage, descent, or siblings.
- Cupra's Umbrian local cults are consolidated. Comparisons with Hera, Venus or
  Bona Dea require distinct evidence and do not justify automatic merging.
- The seven original entries have no established genealogical extensions in
  the consulted inscriptions. In particular, the pre-existing `twin sibling`
  link between the two Tursa records is not demonstrated by the tablets. That
  legacy assertion is flagged for correction after scholarly review, rather
  than reused as evidence for new genealogies.
- Older transcript references to specific pages of Weiss/Poultney were reviewed
  as existing claims, **not independently authenticated**. They are not copied
  into the new entries as if the books had been read.
- The three Roman-era local figures use explicit textual dates and no invented
  Iguvine-era assignment. Those dates describe attestation, not divine births.

## Remaining blockers and handoffs

The 16 BLOCKED census rows require critical editions, object publications, or
identity review. Every row specifies the text and question. Umbrian exhaustive
status additionally requires a wider review of local cult publications and
legendary-founder traditions outside these sources. No `DONE` status is justified.

Lane 1 follow-up: Cupra has Picene evidence; coordinate any later Picene record
with `umbrian_cupra`. Keep Roman Picus separate from the narrowly attested
Iguvine Picus Martius until identity evidence is assessed. Tertullian 24.8 also
names Delventinus (Casinum), Ancharia (Asculum), Nortia (Volsinii), Hostia
(Satrium) and Pater Curis (Falisci): leads for the appropriate future Lane 1
traditions, not added to this Umbrian batch.

Cross-lane lead: Arentia in OB19's compiler-numbered Um 202 needs findspot and
original-publication verification before any comparison with Iberian Arentia.
No Lusitanian tradition has been claimed or modified.

Other Lane 1 traditions remain UNCLAIMED in this manifest. Mycenaean, Minoan,
Eleusinian, Homeric, Hellenistic, Sabine, Samnite, Latin/Latial, Picene and
Faliscan were not separate runtime tradition keys at the baseline. Their
absence as keys does not mean their subtraditions have been audited. Roman
Mithraic Mysteries is a separate key and needs an ownership agreement at the
Roman/Iranian boundary; it is not silently claimed here.

## Ingestion record — the 13 accepted candidates (second pass)

PR #102 merged as a **census only**: all 13 candidates dispositioned `ADD` above
stayed out of the corpus, and `added_count` stood at 0. This pass ingests them.

- Transcript: `data-sources/transcripts/umbrian-expansion.txt` (13 figures).
- Corpus figure count: **5,721 → 5,734**. Umbrian tradition: **7 → 20** records.
- Ids as proposed in the census, unchanged: `umbrian_trebus_jovius`,
  `umbrian_fisus_sancius`, `umbrian_tefer_jovius`, `umbrian_hondus`,
  `umbrian_vesticius_sancius`, `umbrian_spector`, `umbrian_puemonus_popricus`,
  `umbrian_vesuna`, `umbrian_cupra`, `umbrian_picus_martius`,
  `umbrian_clitumnus`, `umbrian_valentia`, `umbrian_visidianus`.
- A second era key, `"Roman-era Umbria; 1st-3rd c. CE"`, was registered in
  `ERA_ORDER["Umbrian"]` and `ERA_DATES["Umbrian"]` for the three figures whose
  attestation is Roman-imperial (Clitumnus, Valentia, Visidianus). The Iguvine
  key was left untouched and still carries the other ten.
- Seven figures carry cited relations (the inner-gate triad Trebus/Fisus/Tefer;
  the Puemonus–Vesuna pair; the Vesticius–Spector pair in the Tabula II
  remedial rite). All relation edges are co-invocation in a shared ritual
  passage — no marriage, parentage or siblinghood was inferred, per the census.
- The remaining six are genuinely kinless and are recorded in
  `data-sources/verified-solitary.json` with cited reasons, satisfying the
  corpus's "every name is verified" invariant.
- Comparative identifications stayed out of the relation graph and were written
  into `variants[]` and prose instead: Fisus Sancius ~ Semo Sancus / Dius
  Fidius, Puemonus ~ Pomona, Vesticius ~ Vesta, Spector ~ Culśanś, Cupra ~ Bona
  Dea / Venus, Clitumnus ~ Jupiter. `roman_pomona` and `roman_vesta` exist in
  the corpus and were deliberately **not** linked or merged.
- Latin Picus's royal genealogy and Circean transformation, and the
  Oceanus/Tethys parentage conventional for river gods, were both checked and
  refused; neither figure carries parents.

### Sourcing constraint on this pass

The ingesting session had no direct outbound web access — `attalus.org`,
`en.wikipedia.org`, `tertullian.org`, `perseus.tufts.edu`, `persee.fr`,
`keytoumbria.com` and `archive.org` are all refused by the environment's egress
proxy. Research was done through server-side web search, which returns the
substance of those pages without fetching them. Accordingly:

- Tablet/face/line references are carried forward from the census rows above,
  where the first pass recorded them from Poultney's translation, and are cited
  as tablet references with this census named as the proximate record. No page
  of the printed 1959 commentary is cited as though it had been read.
- Ritual detail (victim, gate, cake, libation) is cited to the reference works
  that state it and were consulted in this pass.
- Etymologies are attributed to the scholar proposing them and marked as
  proposals.

`status` is therefore `BLOCKED`, not `DONE`: every `ADD` row is now in the
corpus, but the 16 blocked philological/identity cases stand unresolved and
exhaustive completion of the tradition is still not claimed.
