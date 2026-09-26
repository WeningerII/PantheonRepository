# Ptolemaic expansion: Thais and Artakama branches

Baseline: `aeb903ce9164fc66956dc787863426aef5b580a9`, merged PR #152.
No open pull requests were present when this batch started.

## Identity and ownership contract

The generated corpus and source transcripts were searched by names and spelling
variants before authoring. None of the seven targets was already registered.
These identifiers were reserved before the editing agents started:

| Target | Identifier | Source owner |
|---|---|---|
| Thais | `greek_thais` | A |
| Lagus, son of Ptolemy I | `greek_lagus_son_ptolemy` | A |
| Leontiscus | `greek_leontiscus` | A |
| Eirene, daughter of Ptolemy I | `greek_eirene_daughter_ptolemy` | A |
| Eunostus of Soloi | `greek_eunostus_soloi` | A |
| Artakama | `achaemenid_artakama` | B |
| Artabazus II | `achaemenid_artabazus_ii` | B |

The pilot records `greek_ptolemy_i`, `greek_lagus`,
`greek_arsinoe_mother_ptolemy`, `greek_meleager_father_arsinoe`, and
`greek_menelaus_son_lagus` remain their existing identities. In particular,
the father and son named Lagus are different people.

Agents A and B own their respective `ptolemaic-thais` and
`ptolemaic-artakama` transcripts, relationship supplements, and evidence
documents. Their supplements may modify only their new subjects. They submit
proposals for existing subjects to the coordinator. Agent C owns the static
renderer and focused generic tests. Agent D independently reviews the changes
without editing the implementation. Each editing agent uses a separate branch
and worktree. Only the coordinator integrates sources, changes existing
subjects and metadata, regenerates the corpus and audit ledgers, and publishes.

## Shared semantics

All seven targets have a mortal baseline. Unknown parentage remains unknown;
it is not an assertion of self-creation. Individual parent assertions and
relationships carry their own citations. Ordinary parentage, alternative
accounts, unions, ancestry claims, divine affiliations, and cult honors remain
separate. A cross-tradition relationship imports neither identity nor parents.

`Achaemenid Persian` is a historical-cultural classification, not an assertion
of either person's religion. Its `late-achaemenid-alexandrian` era provides a
broad fourth-century BCE context band, not personal birth/death dates or a
precise boundary for the dynasty. No territorial polygon is inferred from a
marriage or an individual's itinerary. The Greek marriage context remains in
the cited relationships and narrative rather than replacing this identity.

The existing selectable parentage accounts replace parents only in the
displayed lineage projection and rebuild its reverse child links. Default
`parentIds`, legacy descent calculations, and inherited powers are unchanged.
The warning about that limitation must remain visible. This expansion does not
add the Eurydice or Berenice I branches.

## Evidence and verification

Claim-level references and access boundaries are documented in
`ptolemaic-thais-evidence.md` and `ptolemaic-artakama-evidence.md`.
The generic presentation findings are in `ptolemaic-presentation-audit.md`.
Independent review is recorded in `ptolemaic-expansion-review.md`. All seven
targets are verified additions; no target remains an unresolved identity.
The generated corpus has 7,810 figures across 562 traditions. Only the existing
Ptolemy I record changes, gaining six reciprocal relationships. The five pilot
figures retain their default parents, selectable accounts, and calculated
divinity. The connected inventory has 931 records and remains explicitly
incomplete as a wider research audit.

Integrated preflight passed for all seven additions before regeneration.
The four generators, connected-audit refresh, single-file build, Pages build,
and static mirror build completed. The MCP smoke suite reports the new 7,810
figure count. All 34 static and completeness checks pass, including the
unchanged requirement for the stable Parentage section heading. The renderer
qualifies its contents as the recorded default without renaming that heading.

The initial local full-suite run found that heading regression and exhausted
memory in three browser-like test processes while Chromium checks ran
concurrently. The heading was corrected. The rendering, scenario and storage
test sequence then exited successfully in isolation with a 4 GB Node heap;
the scenario report records 34/34 passing and storage reports 4/4 passing.
The updated scenario report includes the 7,810-record corpus. Browser
verification waits for deferred
profile sections after the header appears and check the calculation warning
while an alternative account is selected. The warning is outside the tree
canvas and intentionally disappears on return to the default.

Required release gates are the full test suite, complete cold-load and
counterpart browser probe, focused desktop/mobile and no-JS profile checks,
MCP smoke, and byte-exact regeneration. Final CI, merge and deployment results
are recorded on the batch pull request. MCP deployment is reported separately
from repository validation and Pages publication; a skipped hook is not a
successful deployment.
