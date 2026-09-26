# Philip II alternative ancestry

This source batch supplies the historical paternal branch reached by selecting
Ptolemy I's reported Philip II paternity. It reuses `greek_philip_ii` and the
parallel source batch's `greek_amyntas_i`; it adds nine distinct records:

| Identifier | Identity |
|---|---|
| `greek_alexander_i_macedon` | Alexander I, not Alexander III |
| `greek_amyntas_son_alexander_i` | Amyntas, younger son of Alexander I |
| `greek_arrhidaeus_father_amyntas_iii` | Arrhidaeus, not Philip III or the general |
| `greek_amyntas_iii` | Amyntas III, father of Philip II |
| `greek_menelaus_father_amyntas_iii` | Menelaus in the conflicting paternal report |
| `greek_eurydice_mother_philip_ii` | Eurydice, mother of Philip II, not Ptolemy's wife |
| `greek_sirras` | Sirras, Eurydice's father |
| `greek_arrhabaeus_i_lyncestis` | Arrhabaeus, her maternal grandfather |
| `greek_bromerus` | Bromerus, Arrhabaeus's father |

The generated corpus was searched by identifiers and name variants before
adding them. None of these identities was already present. All are historical
context figures with a mortal baseline. The Greek source-tradition label does
not settle Eurydice's or Sirras's disputed ethnicity.

## Consulted evidence

- [Diodorus 15.60.3](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Diodorus_Siculus/15D*.html#60.3),
  directly read in the public-domain Loeb translation: Amyntas III is son of
  Arrhidaeus and father of Philip.
- [Herodotus 8.139](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Herodotus/8c*.html#139),
  directly read: Alexander I is son of Amyntas I. The earlier king-list is
  implemented by the companion ancestry batch.
- [Bennett, Arsinoe, note 2.v](https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/arsinoe.htm),
  directly read as a **secondary source**: reports Alexander I's younger son
  Amyntas and the line through Arrhidaeus. Syncellus p. 500 and Beloch IV.2
  p. 177 were not independently collated. Bennett's discussion of inserting
  these generations into Satyrus is a conjecture, not adopted here.
- [Justin 7.4](https://www.roger-pearse.com/tertullian/fathers/justinus_03_books01to10.htm)
  and [Aelian 12.43](https://penelope.uchicago.edu/aelian/varhist12.html), both
  directly read in public-domain translations: preserve Menelaus as a competing
  father of Amyntas. Justin also records Eurydice as Amyntas's wife and Philip's
  mother. Justin's compressed chronology does not justify inventing a parent
  for this Menelaus.
- [Strabo 7.7.8, Greek](https://classics.andrewgadsden.com/library/strabo/geography/7),
  directly read: Eurydice is Sirras's daughter and Arrhabaeus's granddaughter
  through his daughter. The older
  [Loeb English version](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/7G*.html#7.8)
  was checked and has a different reading, naming Sirra as a daughter. That
  difference is visible in a record variant.
- [Landucci Gattinoni, Karanos Supplement I (2024), pp. 125–126](https://ddd.uab.cat/pub/karanos/karanos_a2024nMacedonia/karanos_a2024nMacedoniap121.pdf)
  was consulted through indexed excerpts quoting Strabo and discussing the
  inscribed patronymic and contested Illyrian/Lyncestian background. Full PDF
  retrieval timed out and returned HTTP 502 on retry; the inscriptions were
  not independently collated. Strabo’s Greek passage was read directly.

- [Thucydides 4.83.1](https://topostext.org/work/52#4.83), directly read in
  Crawley’s translation: Arrhabaeus, ruler of the Lyncestian Macedonians, is
  son of Bromerus. No earlier named parent is supplied.

## Account semantics and boundaries

The historical chain is Philip II → Amyntas III → Arrhidaeus → Amyntas son of
Alexander I → Alexander I → Amyntas I. Each edge carries its actual source.
The internal group `herodotus-macedonian-pedigree` joins those cited records to
the older Herodotean king-list; it does not assert Herodotus wrote the later
links. The displayed labels name the source at each generation.

Amyntas III's Menelaus account replaces Arrhidaeus. It does not copy
Arrhidaeus's ancestors. Justin's report that Menelaus is Alexander I's brother
is separately navigable and explicitly qualified; it does not infer shared
parents from a sibling report. The historical route stops where its sources cease to
supply immediate named parents; it is not silently spliced into Satyrus's
legendary chain.

Eurydice → Sirras is ordinary parentage. Arrhabaeus is a resolved, clickable
**maternal grandfather** with a reciprocal granddaughter relationship. His
father Bromerus is also recorded. Eurydice’s intervening mother remains
unnamed; no direct parent edge or unnamed-person identity is manufactured.
Unknown parents are not an uncreated-parentage claim. No exact dates are
inferred, no divine parentage is supplied, and no descendants from the deferred
Eurydice or Berenice I branches are added.

Existing Philip II updates and the Ptolemy account's group assignment are
supplied to the coordinator in a separate manifest; this commit edits only its
three owned new files. The coordinator performs regeneration and integrated
navigation/account checks.

## Focused validation

Transcript preflight passes for all nine new figures. The five generic
supplement behavior tests pass. The unregenerated corpus-dependent test cannot
pass before coordinator regeneration; the presentation test additionally needs
the integration worktree's dependencies. The source supplement and proposed
shared patches are separately applied in memory to the current corpus plus the
new transcripts, checking validation, target resolution, account replacement
and idempotence without writing generated artifacts.
