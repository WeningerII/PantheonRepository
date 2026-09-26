# Artakama branch evidence and decisions

Reviewed 2026-09-26 against founder-pilot baseline `aeb903c`. This batch adds
`achaemenid_artakama` and `achaemenid_artabazus_ii` and reuses
`greek_ptolemy_i`. Both additions have a mortal baseline. An identifier/name/
alias search of the loaded baseline found no existing identity for either
addition, nor records for the named external parents below.

## Claim evidence

All passages in this table were opened and read directly in the linked online
text. “Primary” refers to the ancient work consulted in translation, not to
an eyewitness document newly examined. Modern conclusions remain secondary.

| Claim or boundary | Evidence and access | Data decision |
|---|---|---|
| Daughter and Susa marriage | [Arrian, *Anabasis* 7.4.4–8, especially 7.4.6](https://en.wikisource.org/wiki/The_Anabasis_of_Alexander/Book_VII/Chapter_IV), Chinnock translation; primary text directly consulted | Father link to Artabazus II; spouse link to the existing Ptolemy I. Reciprocal father-of link authored; coordinator receives reciprocal spouse proposal. |
| Persian standing and career | Arrian [3.23.7](https://en.wikisource.org/wiki/The_Anabasis_of_Alexander/Book_III/Chapter_XXIII), [3.29.1](https://en.wikisource.org/wiki/The_Anabasis_of_Alexander/Book_III/Chapter_XXIX), and [4.17.3](https://en.wikisource.org/wiki/The_Anabasis_of_Alexander/Book_IV/Chapter_XVII); primary texts directly consulted | Artabazus’s Persian background, Bactrian governorship and retirement are supported independently of the marriage. No birth or death date inferred from retirement. |
| Fourth-century identity and parentage | [Dandamayev, “Artabazus,” §2, *Encyclopaedia Iranica*](https://www.iranicaonline.org/articles/artabazus-gk/); secondary discussion directly consulted | Distinguish this satrap from the earlier Artabazus son of Pharnaces (§1). Pharnabazus II and Apame, daughter of Artaxerxes II, remain explicitly named external references, not invented record IDs or an uncreated account. |
| Name conflict | [Plutarch, *Eumenes* 1.3](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Eumenes*.html#1.3), Perrin translation; primary text directly consulted | The bride’s reported name Apama is qualified in both searchable aliases and cited same-record name evidence. It cannot silently resolve to another Apama. |
| Interpretations of that conflict | [Bennett, “Artakama,” note 1](https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/artakama.htm) and [Shahbazi, “Apamā,” §2](https://www.iranicaonline.org/articles/apama-women-achaemenid-and-hellenisiic/); secondary discussions directly consulted | Preserve their disagreement: error/confusion versus alternative name. A visible variant names both interpretations without settling them. |
| Date and absent evidence | [Bennett, “Artakama,” text and notes 3–5](https://www.instonebrewer.com/TyndaleSites/Egypt/ptolemies/artakama.htm); secondary discussion directly consulted | Use conventional 324 BCE wedding date in prose, avoiding the more precise reconstructed month. Mother and repudiation remain uncertain. No known children of this marriage does not assert lifelong childlessness. |

## Identity and tradition contract

`Achaemenid Persian` is a historical/cultural classification. It does not
assert a personal religious adherence. Both figures explicitly author
`tradition`, `primaryTradition`, and `traditions` so neither marriage nor a
parent link automatically relabels them Greek or Zoroastrian. Greek-language
sources do not alone establish a separate Greek tradition portrayal.

The agreed `late-achaemenid-alexandrian` era is a broad fourth-century BCE
context for both records, not a lifespan. The coordinator owns its shared
vocabulary and metadata. No duplicate Hellenistic record is created for the
same historical person. Artakama’s marriage crosses the tradition boundary
through an explicit spouse relationship, without importing parents or divine
ancestry.

Artakama’s proposed Rhodian mother is unnamed and not securely identified;
no placeholder person is created. Bennett’s citation of Diodorus 16.52.4 for
the family is secondary reporting here; that passage was not independently
collated for this batch. No divorce event or child is reconstructed. Artabazus’s
wider family is outside these two targets; no claim of exhaustive coverage is
made. The next Ptolemaic spouse branches remain untouched.

## Owned files and integration

- `data-sources/transcripts/ptolemaic-artakama.txt`: two records and cited external parents.
- `data-sources/relationships/ptolemaic-artakama.json`: father, father-of, spouse, qualified name evidence, and three uncertainty variants.
- This evidence ledger.

The coordinator has a separate uncommitted reciprocal proposal for
`greek_ptolemy_i`; source integration must apply it before central regeneration.
This agent does not regenerate corpus, audits, tiers or distribution artifacts.
Preflight must run against the coordinator’s added vocabulary before the full
regeneration. Full generated-corpus and browser checks belong to integration.

## Agent verification

- Parsed both source files and applied both owned and proposed shared supplements
  to an in-memory baseline corpus; uniqueness, idempotence, explicit father and
  reverse link, reciprocal spouse, external parents, qualified name evidence,
  three uncertainty variants, and mortal/tradition metadata passed.
- Five existing focused relationship-supplement tests passed: cited parent
  additions, identity separation, atomic rejection, exact external resolution,
  and identifier-renaming invariance.
- Transcript preflight found exactly two errors, both the expected missing
  `Achaemenid Persian` era vocabulary on this source-only branch. No other
  preflight problem was reported. This is not a passing integrated preflight.
- `git diff --check` passed. No generated artifacts were modified.
