# Ptolemaic founding-family pilot

Historical pilot report: its endpoint-only ancestry and display-only account
limitations are superseded by the [ancestry and account repair](ptolemaic-lineage-repair.md).
The original validation and scope below describe the pilot at publication.

Five additions requested as a test run on 2026-09-25. This is a bounded pilot,
not a claim that the dynasty's spouses, children, descendants, or divine
pedigrees have been completed.

| Record | Default parentage | Separate account or qualification |
|---|---|---|
| `greek_lagus` | Unknown | Conventional father of Ptolemy; attested father of Menelaus. |
| `greek_arsinoe_mother_ptolemy` | Unknown | Meleager as father in Satyrus's dynastic pedigree. |
| `greek_meleager_father_arsinoe` | Not reconstructed | Father of Arsinoe in that pedigree; distinct from the hero and later king. |
| `greek_menelaus_son_lagus` | Lagus; mother unnamed | Arsinoe's maternity is a modern inference, selectable separately. |
| `greek_ptolemy_i` | Lagus and Arsinoe | Philip II paternity is an alternative ancient report. |

The transcript provides the five records. The matching relationship supplement
provides three default parent links, five cited selectable accounts, and 21
other relationships, including reciprocal links to existing figures. No named
person requires a program branch or a new algorithm.

## Evidence reviewed

- Pausanias, *Description of Greece* 1.1.1 and 1.6.2: the Lagid patronymic and
  alternative Philip paternity report.
  <https://www.theoi.com/Text/Pausanias1A.html>
- Satyrus, FGrH 631 F 2, preserved in Theophilus, *To Autolycus* 2.7: Meleager,
  Arsinoe, Lagus, and Ptolemy in the claimed pedigree. The transmitted chain
  has problems elsewhere; this pilot does not reconstruct its missing steps.
  <https://www.earlychristianwritings.com/text/theophilus-book2.html>
- Plutarch, *Demetrius* 15.2 and 16.1–4: Menelaus as Ptolemy's brother and
  their defeat in Cyprus.
  <https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Demetrius*.html#15>
- Theocritus, *Idyll* 17.13–33: divine honors and claimed Heraclean descent.
  <https://www.theoi.com/Text/TheocritusIdylls3.html#17>
- Chris Bennett, *Egyptian Royal Genealogy*, Menelaus, notes 1–3: documentary
  patronymic and the distinction between attested father and inferred mother.
  The cited papyri are mediated through this secondary discussion here.
  <https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/menelaus.htm>
- Bennett, Ptolemy I, notes 12 and 15: the Egyptian throne name recorded on
  Stele Vienna 153, invoking Re and Amun. The monument is cited through this
  secondary discussion rather than claiming a fresh epigraphic collation.
  <https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/ptolemy_i.htm>

## Semantics retained in this pilot

The five records have a mortal baseline. Ptolemy's posthumous divine honors
are separately cited in his lifecycle. Distant Heraclean/Dionysian descent
claims remain relationships, not invented direct parents. His Egyptian title
is represented by `chosen-by` Re and `beloved-of` Amun relationships; neither
deity enters his biological parent list. Unknown parents are not described
as an assertion of self-creation.

The existing lineage selector changes the displayed graph, not the legacy
descent calculation. Its warning remains visible. Every immediate parent in
this pilot's alternatives has a mortal baseline, so these choices do not
change the pilot's calculated divine fraction. Unifying all projections and
calculations remains work for the wider specification; this pilot does not
claim that architecture has been implemented.

## Validation

Run the transcript preflight before regeneration; it deliberately rejects IDs
already loaded in the corpus. Then run the existing corpus/account/lineage,
build, and export tests. Exercise all five records, the five account choices,
and navigation to their named relationship targets in the built site. Check
that selecting Philip replaces Lagus, and that selecting inferred maternity
does not mutate the default record. Regeneration must remain byte-exact.

The pilot's browser pass exercised all five profiles, five parentage-account
selections, and 24 relationship navigations, including a mobile viewport.
It made no full-corpus request and reported no browser errors after fixing a
stale lifecycle resize callback discovered during navigation. A generic
component regression test covers fallback transitions, replaced containers,
active resizing, and callbacks delivered after unmount.

The connected-family audit inventory was regenerated: five records were added,
no records were removed, and five existing records gained the reciprocal
relationships. Its broader research-completeness status remains unchanged.
Transcript preflight, all unit-test files, the MCP smoke test, and byte-exact
regeneration passed. The rendering suite passed all 50 checks and the scenario
suite passed all 34. Local memory pressure required serial and isolated test
reruns; the ordinary parallel run did not complete successfully in this
environment.

The complete cold-load/browser regression probe also passed when run in
isolation: bounded initial rendering, scrolling to all 7,803 figures, all 204
authored name-navigation targets, and all 517 parentage-account selections.
