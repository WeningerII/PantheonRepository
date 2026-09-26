# Independent review: Ptolemaic expansion

Reviewed 2026-09-26. Reviewer made no source/code changes, commits, pushes,
or publication actions. Review covered the integrated branch through
`741dc2f`, source commits `7b94db1` and `60e682b`, metadata commit `a530f87`,
and the coordinator's regenerated working tree and built static output.

## Findings

No remaining blocking historical, identity, relationship, or presentation
finding in the reviewed batch.

One small claim-citation gap was identified in the early Artabazus draft:
the external mother label included “daughter of Artaxerxes II,” while its
attached Iranica ARTABAZUS citation named Princess Apame without that
patronymic. The implemented source already corrected this in agent commit
`20cdce1`, integrated as `60e682b`. Verified
`data-sources/transcripts/ptolemaic-artakama.txt:192–209` now attaches Iranica
APAMA entry 1 directly to that mother relation. Resolved.

## Evidence independently read

- Athenaeus, *Deipnosophistae* 13.576d–e, Yonge translation, section 37:
  <https://www.attalus.org/old/athenaeus13b.html#37>.
- Plutarch, *Alexander* 38.1–2, Perrin translation:
  <https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Alexander*/5.html#38>.
- Plutarch, *Eumenes* 1.3, Perrin translation:
  <https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Eumenes*.html#1.3>.
- Arrian, *Anabasis* 7.4, particularly the daughters of Artabazus and the
  Susa wedding description, Chinnock translation:
  <https://en.wikisource.org/wiki/The_Anabasis_of_Alexander/Book_VII/Chapter_IV>.
- Arrian, *Anabasis* 3.23, 3.29 and 4.17, Chinnock translation: Artabazus's
  reception, Bactrian appointment and retirement passages at the three
  Wikisource chapter URLs attached to his transcript claims.
- Justin, *Epitome* 15.2.6–8, Watson translation:
  <https://www.attalus.org/translate/justin1.html#15.2>.
- PHI transcription, IG V,2 550, column III, lines 7–9:
  <https://epigraphy.packhum.org/text/32707>.
- E. R. Bevan, *The House of Ptolemy*, chapter II, pp. 52–53:
  <https://penelope.uchicago.edu/Thayer/E/Gazetteer/Places/Africa/Egypt/_Texts/BEVHOP/2*.html#p53>.
- Chris Bennett, *Egyptian Royal Genealogy*: Artakama, Thais, Lagus son of
  Thais, Leontiscus and Eirene daughter of Thais dossiers, including their
  pertinent notes. All five linked `www.instonebrewer.com` pages were read.
- M. A. Dandamayev, “Artabazus,” entries 1–2, Iranica:
  <https://www.iranicaonline.org/articles/artabazus-gk/>.
- A. Sh. Shahbazi, “Apamā,” entries 1–3, Iranica:
  <https://www.iranicaonline.org/articles/apama-women-achaemenid-and-hellenisiic/>.

These consultations support the implemented source distinctions. Athenaeus's
marriage report and Plutarch's earlier mistress description are represented
separately; neither forces an unqualified marriage assertion. The children's
parentage is explicit in the transmitted Athenaeus passage. Bevan's proposed
identification of the two sons survives as a disputed variant, not a merge.
The epigraphic Lagus is explicitly an identification in modern scholarship;
the inscription does not supply his mother. Artakama's marriage and father
are directly attested in Arrian. The Apama name disagreement, unnamed mother,
and uncertain later union status remain visible. Artabazus's namesake and
the different women named Apama/Apame remain distinct.

No independent manuscript or stone collation was performed. Ogden's chapter,
Zelinskiy's article/abstract and the Diodorus passage discussed through Bennett
were not independently reviewed by this reviewer. No implementation finding
depends on treating those unconsulted works as directly read evidence.

## Independent checks performed

- Read repository CLAUDE.md and all four requested pilot/lineage/audit docs.
- Evaluated the actual `aeb903c` corpus and searched IDs, primary names and
  aliases, including the principal spelling variants and parent names. All
  seven target IDs were absent; no target identity already existed.
- Compared the regenerated corpus against that baseline: exactly seven new
  records, one changed existing record (`greek_ptolemy_i`), 7,810 total.
- Asserted all seven are mortal, all new relationship targets exist and have
  claim citations, all new biological links have reverse relations, and
  spouse/sibling/lover/reported-spouse links are reciprocal.
- Asserted default parents, all selectable accounts and calculated divinity
  for the five pilot figures are byte-equivalent to baseline.
- Inspected Achaemenid metadata and source decisions: historical-cultural
  classification, contextual century band rather than invented lifespans,
  no invented territorial polygon or religious adherence.
- Read the actual generic static-renderer changes and seven neutral tests.
  Ran `node --test test/static-lineage.test.cjs` independently in integration:
  **7 passed, 0 failed**.
- Inspected actual `dist/site/registry` output for all seven additions and
  Ptolemy I. Asserted profile notes, every resolved relationship endpoint,
  relationship qualifications, all account-parent links, union/name
  uncertainty and the legacy-calculation warning survive static rendering.
- `git diff --check` passed on the integrated working tree.

An initial reviewer-only HTML check missed apostrophe escaping in an existing
Ptolemy relation; correcting that assertion to match valid HTML escaping made
the complete check pass. This was not a product defect.

## Scope and remaining historical uncertainty

This is approval of the reviewed seven-figure batch, not certification of the
complete dynasty or every wider connected figure. Thais's formal union status,
the two sons' debated identification and chronological details, the
Eirene–Eunostus marriage date and children, Eunostus's suggested father,
Artakama's mother/name interpretation/later fate, and exact lifespans remain
properly bounded. The Eurydice and Berenice I branches are untouched.

The coordinator owns full integrated tests, byte-exact regeneration,
desktop/mobile/cold-load verification, CI, PR and merge, Pages deployment,
and separately reported MCP deployment status. This review does not claim
those external results on the basis of agent assurances.

## Final compatibility delta

Independently inspected `c0a9e2537de35bf3391f971216af88251375fe4d`.
The generic static renderer retains the established “Parentage” heading and
puts an explicit recorded-default qualification directly beneath it when
alternative accounts exist. This preserves both heading compatibility and
the distinction between default and alternative lineage. The seven neutral
static-lineage tests pass after the change. The actual rebuilt Ptolemy page
contains the stable heading, default qualification and calculation warning.
Verified `test/scale-gates.test.cjs` is unchanged from baseline. No new
finding; independent approval also covers this final delta.

## Runtime hydration follow-up

The coordinator's later browser verification exposed a material runtime
defect in `app/pr-boot.js:393–403`. A late edge-tier response replaces rich
relations even on an already hydrated `_full` record. Its compact relation
projection retains only kind and target, so relation notes/citations disappear
and external-reference-only relations disappear entirely. This affects union
qualifications and Artabazus's named external parents in this batch.

Independently reproduced against the integrated implementation using neutral
two-record fixtures and the real loader in a VM: `loadDetail` followed by
`loadTier('edges')` leaves `_full=true`, reduces two rich relations to one thin
relation, and loses the uncertainty note, both citations and external mother.
Runtime presentation approval is held pending correction and verification.
The source records and static output remain valid.

Requested generic correction: preserve rich hydrated records while still
installing topology for skinny records. Also protect the legacy full-corpus
path (`PR.dataReady`), whose records need not carry `_full`. Required checks
include both arrival orders, external references, rich claim evidence,
remaining skinny hydration and unchanged lazy loading.

Correction independently reviewed in agent commit `c651c90`: the loader
skips compact replacement for `_full` records and returns without rewriting
a fully installed legacy corpus. Skinny records continue receiving topology;
no request or rendering behavior is expanded. Reviewed the real-loader tests
and independently ran all three: detail-before-edges, edges-before-detail,
and legacy-corpus-before-pending-edges all passed. The tests check rich claim
evidence, external references, parent roles/accounts, record identity, skinny
hydration and unchanged request count. The original independent two-record
reproducer now also passes with notes, citations and external mother retained.
`git diff --check` passed. The correction is approved at source/test level;
the coordinator's rebuilt browser verification remains required before merge.

Confirmed the same correction integrated as `73d25cd` and independently reran
the three arrival-order tests in the integration worktree: **3 passed, 0
failed**. No additional finding in the integrated delta.
