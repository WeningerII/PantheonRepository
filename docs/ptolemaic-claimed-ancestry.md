# Ptolemaic claimed ancestry: transmitted chains

This repair supplies every named generation from Ptolemy I back to Heracles and
Dionysus in the pedigree quoted by Theophilus, *To Autolycus* 2.7. The chain is a
selectable, cited royal ancestry claim. It is not substituted for conventional
historical parentage and does not make a distant ancestor a direct parent.

## Directly consulted evidence

- [Theophilus 2.7, Greek text and older English translation](https://bkv.unifr.ch/en/works/cpg-1107/compare/ad-autolycum/24/theophilus-to-autolycus).
  The Greek text supplies Cleodaeus, Thestius, and Aristodamidas where the English
  column prints Cleodemus, Thestrus, and Aristomidas. The Greek also retains
  Ptolemy II in the later royal sequence where that translation omits him.
  This repair stops its newly authored chain at Ptolemy I.
- [Herodotus 8.139](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Herodotus/8c*.html#139).
  His Macedonian genealogy inserts Argaeus between Perdiccas and Philip; it is a
  separate account, not an unmarked correction to the quotation of Satyrus.
- [Apollodorus 1.8.1](https://www.theoi.com/Text/Apollodorus1.html).
  Deianira is listed among the children of Oeneus and Althaea, alongside the
  report that Dionysus fathered her. Both accounts remain available.
- [Theocritus 17.13–33](https://www.theoi.com/Text/TheocritusIdylls3.html#17).
  This poem attests Heraclid descent and divine honors, but does not enumerate
  the intervening ancestors. It therefore supports the existing descent claim,
  not additional invented generations.
- [Chris Bennett, Arsinoe: Dynastic Origins, note 2](https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/arsinoe.htm).
  Consulted directly as modern commentary, not as a primary ancient witness.
  His discussion distinguishes transmitted names from emendations and conjecture.
  P.Oxy. 2465 and the scholarship he cites were not directly inspected here.

## Complete transmitted route

| Child | Named parent or parents in Theophilus 2.7 |
|---|---|
| Ptolemy I | Lagus; Arsinoe |
| Arsinoe | Meleager |
| Meleager | Bocrus |
| Bocrus | Amyntas |
| Amyntas | Alcetas |
| Alcetas | Aeropus |
| Aeropus | Philip |
| Philip | Perdiccas |
| Perdiccas | Tyrimmas |
| Tyrimmas | Coenus |
| Coenus | Caranus |
| Caranus | Aristodamidas |
| Aristodamidas | Acous |
| Acous | Thestius, son of Maron |
| Thestius, son of Maron | Maron, son of Ceisus |
| Maron, son of Ceisus | Ceisus |
| Ceisus | Temenus |
| Temenus | Aristomachus |
| Aristomachus | Cleodaeus |
| Cleodaeus | Hyllus |
| Hyllus | Heracles; Deianira |
| Heracles | Zeus; mother unnamed in this passage |
| Deianira | Dionysus; Althaea |
| Althaea | Thestius of Aetolia |

Names at the mythical end reuse existing records. Eighteen absent identities are
added. The two Thestius figures, the two Maron figures in the source, Philip I and
Philip II, and the ancestral Bocrus and historical commanders called Balacrus are
kept distinct. The existing Thespius record has a Thestius alias, but its Boeotian
identity is not the Aetolian father of Althaea.

## Uncertainty retained

The quotation jumps from Amyntas to Bocrus. Bennett discusses a chronological
problem and Beloch's proposed insertion of Alexander I and another Amyntas.
Those names are not inserted into this transmitted account. The name Balacrus
is an emendation of Bocrus, not independent evidence for identifying this ancestor
with another named Balacrus. Unknown coparents receive no invented identities.
These limitations qualify historical generation counts and divine fractions.

Herodotus' account ends upward at Perdiccas, whose more distant Temenid descent
is not supplied as a complete chain by that passage. It does not import the
Satyrus generations automatically. The missing generations and the transmitted
chain remain distinguishable from any independently researched paternal route.

The Egyptian titles involving Amun and Re remain patronage/royal affiliation;
no biological parent link is inferred from them. Posthumous divine honors remain
separate from descent.

## Shared account contract

Every linked Satyrus account has `lineageGroup: satyrus-ptolemaic-pedigree` and
`kind: claimed-genealogy`. A single focus selection must apply the same group to
reachable ancestors; individually choosing a different account overrides it.
The Herodotean group is `herodotus-macedonian-pedigree`, with
`kind: biological` (the labels retain its status as a reported pedigree). Source-specific omissions must not erase separately
supported parentage elsewhere in the corpus.

New records and their supplements are in the two dedicated source files. Shared
existing-record changes are delivered to the coordinator as an explicit manifest;
particularly, the pre-existing Arsinoe account must be updated rather than added
a second time. Full regeneration and integrated behavior checks belong to the
coordinator.
