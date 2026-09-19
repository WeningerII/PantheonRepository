# Tradition counterpart and genealogy audit

Reviewed 2026-09-19 against main `c4e4d63` (6,818 records).

## Result

This change adds **80 records** (12 Greek, 53 Orphic, 15 Roman), **118 new parentIds edges**, and **355 new or newly resolved relation edges**, producing **6,898 records**. Citations added to existing edges are not counted as new edges. Relationship patches touch 164 subjects; the separate name qualification brings the total changed records to 165.

The source of truth is `data-sources/transcripts/mediterranean-counterparts.txt` plus `data-sources/relationships/mediterranean-counterparts.json`. The relationship file records each target, relation type, source passage and source URL. The generator applies these through an identifier-independent, idempotent supplement; it rejects missing targets, self-links, uncited claims, and additions that would silently combine more than two parents. Tests use synthetic identifiers and load the authored corpus for a separate integration check.

## Source boundaries and decisions

- [Hesiod, Theogony](https://www.theoi.com/Text/HesiodTheogony.html): Titan and Olympian family links; all nine named Muses. The prior Leto record was dated to the Titanomachy while her children were primordial. Her record now belongs to the preceding divine genealogy, matching Theogony 404–409. No validator ceiling changed.
- [Apollodorus, Library 3](https://www.theoi.com/Text/Apollodorus3.html): Maia/Pleione, Cadmus/Harmonia and their daughters, Melicertes/Palaemon.
- [Homer, Odyssey 4](https://classics.mit.edu/Homer/odyssey.4.iv.html): the sea god Proteus, distinct from any human king of that name.
- [Hyginus, Fabulae, Preface and 2](https://www.theoi.com/Text/HyginusFabulae1.html): the Latin genealogical account. Aether and Tellus are Saturn/Ops’s parents here; substituting Caelus would import a different account. Aethra is the luminaries’ mother here; the Greek Theia genealogy is not copied. These records identify a Latin mythographic context, not a claim that every named ancestor had an independent Roman state cult.
- [Orphic Hymns 1–40 in Taylor’s numbering](https://www.theoi.com/Text/OrphicHymns1.html) and [the remaining hymns](https://sacred-texts.com/cla/hoo/index.htm): independently cited ritual portrayals. Modern numbering is one higher because Hecate is separated from the proem. Taylor uses Roman names in translation; the records use the Greek names of the Orphic deities, not a Roman tradition classification.
- [Virgil, Aeneid 8](https://classics.mit.edu/Virgil/aeneid.8.viii.html): Roman Hercules and his cult context.
- [Ovid, Metamorphoses 15.622–745](https://www.poetryintranslation.com/PITBR/Latin/Metamorph15.php): Aesculapius’s Roman reception and his parents.
- [Ovid, Fasti 5.229–260](https://www.poetryintranslation.com/PITBR/Latin/OvidFastiBkFive.php): the mother-only Mars account, retained as a variant rather than blended into the Hyginus account.

The earlier Orphic audit excluded several deities as near-duplicates of Greek entries. That exclusion is superseded for the records below: shared identity does not erase a separately attested tradition context. Orphic Rhea’s Protogonos parentage, the healing pair’s marriage, and the chthonic messenger’s different parents illustrate why those records cannot inherit another tradition’s tree.

`counterpart-of` links connect independently recorded portrayals. They do not assert identical genealogies, transmit descendants, or create implied family links. Resolving existing Hermes placeholders uses the exact authored external name AND tradition; ambiguous names are never auto-resolved. Original relationship citations are retained.

Variant accounts now appear in Detail, and Sources includes relationship citations. ParentIds still represents one selected account: alternative accounts remain cited descriptions and qualified relationship rows, not alternative selectable lineage trees. That limitation remains explicit.

Two ambiguous aliases are qualified: Aphrodite Urania is distinguished from the Muse Urania; Phanes’s Eros identification is distinguished from the separately addressed Eros hymn. Nothing is removed from the name search conceptually.

## What this does not establish

This is a source-bounded repair of the connected Greek, Roman and Orphic records illustrated in the request, with existing Etruscan references resolved where explicit. It is **not** certification that all 560 traditions, every Orphic fragment, every hymn collective, all Roman mythographic figures, or every descendant branch is complete. Other text-only references remain. Missing relatives in a source are not supplied by analogy; the Orphic messenger’s hymn names Maia but does not explicitly name his father, for example.

Further research is needed for additional local cult contexts, the rest of the Orphic fragment tradition and collective hymn addressees, and unregistered figures outside these source passages. Unresolved identities require an explicit source decision before insertion.

## Added records

| Tradition | Record | Identifier |
|---|---|---|
| Greek | Cadmus | `greek_cadmus` |
| Greek | Erato | `greek_hesiod_erato` |
| Greek | Euterpe | `greek_hesiod_euterpe` |
| Greek | Maia | `greek_maia` |
| Greek | Melicertes | `greek_melicertes` |
| Greek | Melpomene | `greek_hesiod_melpomene` |
| Greek | Pleione | `greek_pleione` |
| Greek | Polyhymnia | `greek_hesiod_polyhymnia` |
| Greek | Proteus | `greek_proteus` |
| Greek | Terpsichore | `greek_hesiod_terpsichore` |
| Greek | Thalia | `greek_hesiod_thalia` |
| Greek | Urania | `greek_hesiod_urania` |
| Orphic | Adonis | `orphic_adonis` |
| Orphic | Aphrodite | `orphic_aphrodite` |
| Orphic | Apollo | `orphic_apollo` |
| Orphic | Ares | `orphic_ares` |
| Orphic | Artemis | `orphic_artemis` |
| Orphic | Asklepios | `orphic_asklepios` |
| Orphic | Athena | `orphic_athena` |
| Orphic | Boreas | `orphic_boreas` |
| Orphic | Calliope | `orphic_calliope` |
| Orphic | Clio | `orphic_clio` |
| Orphic | Demeter | `orphic_demeter` |
| Orphic | Eos | `orphic_eos` |
| Orphic | Erato | `orphic_erato` |
| Orphic | Eros | `orphic_eros` |
| Orphic | Euterpe | `orphic_euterpe` |
| Orphic | Gaia | `orphic_gaia` |
| Orphic | Helios | `orphic_helios` |
| Orphic | Hephaistos | `orphic_hephaistos` |
| Orphic | Hera | `orphic_hera` |
| Orphic | Herakles | `orphic_herakles` |
| Orphic | Hermes | `orphic_hermes` |
| Orphic | Hermes Chthonios | `orphic_hermes_chthonios` |
| Orphic | Hestia | `orphic_hestia` |
| Orphic | Hygieia | `orphic_hygieia` |
| Orphic | Hypnos | `orphic_hypnos` |
| Orphic | Korybas | `orphic_korybas` |
| Orphic | Kronos | `orphic_kronos` |
| Orphic | Leto | `orphic_leto` |
| Orphic | Leukothea | `orphic_leukothea` |
| Orphic | Maia | `orphic_maia` |
| Orphic | Melpomene | `orphic_melpomene` |
| Orphic | Nemesis | `orphic_nemesis` |
| Orphic | Nereus | `orphic_nereus` |
| Orphic | Nike | `orphic_nike` |
| Orphic | Okeanos | `orphic_okeanos` |
| Orphic | Ouranos | `orphic_ouranos` |
| Orphic | Palaimon | `orphic_palaimon` |
| Orphic | Pan | `orphic_pan` |
| Orphic | Plouton | `orphic_plouton` |
| Orphic | Polyhymnia | `orphic_polyhymnia` |
| Orphic | Poseidon | `orphic_poseidon` |
| Orphic | Proteus | `orphic_proteus` |
| Orphic | Rhea | `orphic_rhea` |
| Orphic | Selene | `orphic_selene` |
| Orphic | Semele | `orphic_semele` |
| Orphic | Silenos | `orphic_silenos` |
| Orphic | Terpsichore | `orphic_terpsichore` |
| Orphic | Tethys | `orphic_tethys` |
| Orphic | Thalia | `orphic_thalia` |
| Orphic | Thanatos | `orphic_thanatos` |
| Orphic | Themis | `orphic_themis` |
| Orphic | Tyche | `orphic_tyche` |
| Orphic | Urania | `orphic_urania` |
| Roman | Aesculapius | `roman_aesculapius` |
| Roman | Aether | `roman_aether` |
| Roman | Aethra | `roman_aethra` |
| Roman | Atlas | `roman_atlas` |
| Roman | Aurora | `roman_aurora` |
| Roman | Coronis | `roman_coronis` |
| Roman | Dies | `roman_dies` |
| Roman | Dione | `roman_dione` |
| Roman | Hercules | `roman_hercules` |
| Roman | Hyperion | `roman_hyperion` |
| Roman | Latona | `roman_latona` |
| Roman | Maia | `roman_maia` |
| Roman | Phoebe | `roman_phoebe` |
| Roman | Pleione | `roman_pleione` |
| Roman | Polus | `roman_polus` |
