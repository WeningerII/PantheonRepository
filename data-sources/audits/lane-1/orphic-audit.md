# Lane 1 — Orphic audit

Owner: `lane-1-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 5,830 total figures, 11 of them Orphic.

Corpus: **5,830 → 5,839 figures**. Orphic **11 → 20**.
Census: 17 rows — **9 ADD, 2 ALIAS, 6 REJECT, 0 BLOCKED**.

## The scoping question, which is the whole of this audit

The existing 11 records already carried the Orphic core: Phanes (with
Protogonos, Erikepaios, Metis and Eros as aliases), Chronos, Ananke, Nyx,
Zagreus, the Orphic Zeus, Persephone, Dionysos, Mnemosyne, Melinoe, Orpheus.

This registry keeps an Orphic record beside the Greek one where the Orphic
material treats a figure distinctively — `orphic_nyx` stands apart from
`greek_hesiod_nyx`, `orphic_persephone` from `greek_hesiod_persephone`. Applied
without limit, that practice would justify an Orphic record for **every one of
the deities addressed in the 87 Orphic Hymns**: dozens of near-duplicates of
Greek gods differing only in which hymn addresses them. That would raise the
corpus count substantially and the corpus's knowledge not at all.

The bar applied here is therefore narrower: **the figure's existence or
character must come from the Orphic material itself**, not from a Greek god
happening to receive an Orphic hymn.

Nine candidates clear it:

- **First principles the Orphic theogonies name and Hesiod does not** —
  Hydros, Thesis, Aither, Physis. Hydros and Thesis emerge with Mud at the very
  beginning; Aither is one of the two principles Chronos produces in the
  Rhapsodies; Physis is Nature given cult-language.
- **Gold-leaf deities** — Eukles and Brimo, named on the inscribed sheets
  buried with initiates.
- **Anatolian hymn-goddesses** — Hipta and Mise. These are the exact peers of
  **Melinoe, already in this registry**: all three were known only from the
  Hymns until inscriptions from western Asia Minor confirmed their cult.
  Admitting Melinoe and excluding the other two would have been inconsistent,
  and that inconsistency is the main thing this pass repairs.
- **Musaeus**, the addressee of the proem that heads the Hymns.

Six were REJECTED as near-duplicates: an Orphic Chaos, Gaia, Ouranos, Kronos
and Rhea. Each already exists in the Greek tradition, and the Orphic material
gives them a different *place in the sequence* rather than a different
character. **Mud** was also rejected — it is named among the first entities but
as a substance that solidifies into Gaia, not as an individuated figure.

Two were dispositioned ALIAS: Eubouleus is already carried on
`orphic_dionysos`, and Protogonos/Erikepaios/Metis on `orphic_phanes`.

## Identity notes

- **Eukles** is very probably a *title* — "the glorious one", a respectful way
  of naming the lord of the dead, on the same instinct that produced Plouton,
  "the wealthy one", instead of Hades. He is recorded as his own entry because
  the leaves address him as a distinct addressee alongside Eubouleus, with the
  alternative stated in `variants[]` rather than decided.
- **Brimo** is identified now with Demeter, now with Hekate. The record keeps
  both readings and merges her with neither.
- **Aither** exists in Greek tradition too, as son of Erebos and Nyx in Hesiod.
  The Orphic record is justified by his derivation *from Chronos* and his role
  as one of the two Rhapsodic principles — a different position, and in this
  case a different account of where he comes from.
- **Musaeus** is called both pupil and son of Orpheus. The record authors the
  pupil relation, which the proem supports directly, and notes the filiation
  without asserting it.

## Relations

Every symmetric relation is between figures authored here, so no existing
transcript needed editing. Relations toward records already in the corpus use
non-symmetric kinds: Hydros `father-of` Chronos and Ananke; Hipta `nurse-of`
`orphic_dionysos` and `subordinate-to` `phrygian_sabazios` (who hands her the
newborn god in the hymn); Musaeus `student-of` `orphic_orpheus`.

**No figure in this batch is kinless**, so no `verified-solitary.json` entries
were needed — the first time that has been true in this lane.

## Sourcing

No direct outbound web access; research went through server-side search.
Citations name the ancient source or the class of object. The Orphic theogonies
survive mostly at second hand — Damascius outlines the Hieronyman theogony,
Proclus quotes the Rhapsodies — and the records say so rather than presenting
the theogonies as continuous texts.

## Status: PARTIAL, not DONE

The Derveni papyrus, the fullest Rhapsodic sequence and the remaining Hymns
were not worked through, and a later pass may find further figures that clear
the bar above. There is no concrete blocker, so `BLOCKED` would be wrong.
