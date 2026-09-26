# Ptolemaic expansion: Thais branch evidence

Reviewed 2026-09-26 from the founder-pilot baseline `aeb903c`.
Sources: `data-sources/transcripts/ptolemaic-thais.txt` and
`data-sources/relationships/ptolemaic-thais.json`. The coordinator integrates
reciprocals on the existing `greek_ptolemy_i` record separately.

| Figure | Identity decision | Supported relationships |
|---|---|---|
| `greek_thais` | Thais of Athens; no existing match | Partner of Ptolemy I; marriage reported, formal status qualified; mother of the three named children |
| `greek_lagus_son_ptolemy` | Distinct from existing `greek_lagus`, Ptolemy's father | Son of Ptolemy and Thais; sibling of Leontiscus and Eirene |
| `greek_leontiscus` | Separate from Lagus; proposed identification retained as disputed | Son of Ptolemy and Thais; sibling of Lagus and Eirene |
| `greek_eirene_daughter_ptolemy` | Historical daughter, not the goddess or another royal Eirene | Daughter of Ptolemy and Thais; sister of the two sons; spouse of Eunostus |
| `greek_eunostus_soloi` | Cypriot king, not the Tanagran hero Eunostus | Spouse of Eirene; parents not established |

All five have a mortal baseline. Greek is the existing cultural classification
for the Athenian and Macedonian family and the Hellenistic Soloi context;
Eunostus's Cypriot kingship is explicit in his name, notes and citation. This
is not a claim about each person's religious practice, nor an Egyptian
classification inferred from Ptolemy's later kingship. No new counterpart
identity or imported divine ancestry is asserted.

## Sources directly consulted

- [Athenaeus, *Deipnosophistae* 13.576d–e](https://www.attalus.org/old/athenaeus13b.html#37),
  C. D. Yonge translation (1854), section 37. Names the Athenian Thais, reports
  her marriage to Ptolemy after Alexander's death, lists Leontiscus and Lagus
  as sons and Eirene as daughter, and names Eirene's husband Eunostus as king
  of Soloi in Cyprus. The English translation was consulted directly; no
  fresh Greek manuscript collation is claimed.
- [Plutarch, *Alexander* 38.1–2](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Alexander*/5.html#38),
  Bernadotte Perrin translation (1919). Calls Thais an Athenian and Ptolemy's
  mistress. This earlier relationship description does not itself refute
  Athenaeus's report of a subsequent marriage.
- [Justin, *Epitome* 15.2.6–8](https://www.attalus.org/translate/justin1.html#15.2),
  J. S. Watson translation (1853). Names Leontiscus as Ptolemy's son and reports
  his return by Demetrius after Ptolemy's naval defeat. The event's conventional
  identification and date, Salamis in Cyprus in 306 BCE, follow Bennett below.
- [IG V,2 550, column III, lines 7–9](https://epigraphy.packhum.org/text/32707),
  PHI transcription. The victor list names a Macedonian Lagus son of Ptolemy
  in the two-horse chariot event. The inscription does not name Thais;
  identification with her son is a modern prosopographical conclusion.
  PHI marks the date approximately 308 BCE; Bennett uses 308/307 BCE. Bennett's
  displayed `IG V.2.250` is a reference error: his own hyperlink resolves to
  PHI's `IG V,2 550`. No image of the stone or independent collation was made.
- [E. R. Bevan, *The House of Ptolemy* (1927), chapter II, pp. 52–53](https://penelope.uchicago.edu/Thayer/E/Gazetteer/Places/Africa/Egypt/_Texts/BEVHOP/2*.html#p53).
  Treats Thais as a concubine and conjectures that Leontiscus and Lagus might
  be two names of one son. This is a modern conjecture, not a second ancient
  parentage account; no identity merge follows from it.
- Chris Bennett, *Egyptian Royal Genealogy*:
  [Thais, notes 2–5](https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/thais.htm),
  [Lagus, notes 2–4](https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/lagus_ii.htm),
  [Leontiscus, notes 2–4](https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/leontiscus.htm),
  and [Eirene, notes 2–5](https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/eirene_i.htm).
  The dossiers were read directly. Bennett accepts probable marriage,
  rejects Bevan's conflation, and labels proposed chronology and Eunostus's
  connection to Pasicrates as reconstruction. His discussion of Ogden's
  objections was read; Ogden's chapter was not independently consulted.
- [A. L. Zelinskiy, “The Arcadian Inscription and Sons of Thais,” 2017, publisher's abstract](https://pifk.magtu.ru/en/journal/29-no-4-58-,-2017/595-75.html).
  The abstract independently confirms the inscription number and advocates
  legal marriage by inference from games eligibility. Only the abstract was
  reviewed; its additional legal and family-political deductions are not
  treated as statements on the inscription or implemented as facts.

Some first attempts at the non-`www` Bennett pages and Forum Romanum's Justin
translation failed. The `www` Bennett pages and Attalus Justin translation
were successfully read; there is no source-access blocker for the claims used.

## Boundaries and unresolved questions

The union has two different cited assertions: `lover` and `reported-spouse`.
The latter retains the ancient marriage report and modern disagreement in
its visible qualification and notes. There is no plain spouse assertion for
Thais and no reconstructed date. The children's parentage does not depend on
resolving the legal status of their parents' union.

The default genealogy uses the three children in Athenaeus's transmitted list.
Bevan's proposed single-son emendation remains a cited variant for both sons,
not a merged identity or a different parent set. No birth order is assigned.
No additional selectable parentage account is manufactured where the reviewed
material supplies no materially different parentage.

Thais's parents, all five birth/death dates, the Eirene–Eunostus marriage date,
and that union's children remain unestablished here. Pasicrates is discussed as
Eunostus's conjectural father but is not added as a biological parent. These
are source-bounded omissions, not claims of self-creation or exhaustive
biographical completion. Eurydice and Berenice I remain outside this batch.

## Agent checks

Passed before handoff:

- Transcript preflight: five figures, clean.
- In-memory supplement application over the baseline corpus plus the new records:
  five distinct mortal identities; six parent links; cited, resolved endpoints;
  symmetric spouse, lover, reported-spouse and sibling navigation; idempotence.
- `git diff --check`.

No corpus regeneration or generated-artifact commit was performed by this agent.
Audit refreshes, full validation and browser verification belong to the
coordinator's integrated pass.
