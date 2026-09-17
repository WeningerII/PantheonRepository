# Lane 1 — Roman audit (first pass)

Owner: `lane-1-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 5,786 total figures, 66 of them Roman.

## Why this batch exists

The Roman tradition held 66 records, but only about 27 of them were gods. The
rest are the Julio-Claudian dynasty and the Alban king-list — real figures and
properly in scope, but they had crowded out the pantheon.

A corpus-wide name check (canonical names, aliases and transliterations,
Unicode-normalised) found **48 significant Roman figures absent from the entire
registry**, not merely from the Roman tradition. Among them:

- **Quirinus**, third god of the Archaic Triad, with one of only three
  *flamines maiores* and one of the oldest festivals in the calendar.
- **Venus** — the only record answering to the name was an unrelated Pawnee
  evening star.
- **Roman Apollo**, present only in his Greek form, though the Roman cult is
  attested in the Campus Martius from the mid-5th century BCE.
- **Cupid.**
- The **entire Roman state cult of deified abstractions**: Victoria, Fides,
  Concordia, Spes, Salus, Libertas, Pax, Pietas, Virtus, Honos, Felicitas,
  Juventas — each with a temple, a dedication and a festival.

That last group is the important one. Rome deified abstract qualities outright
and gave them state cult, which Greek religion did only lightly. A registry of
Roman religion without them is missing a structural feature of the system.

## What this pass adds

44 figures. Census: 51 rows — **44 ADD, 3 ALIAS, 4 REJECT, 0 BLOCKED**.

| Group | Figures |
|---|---|
| Major absences | Quirinus, Venus, Cupido, Apollo |
| Sky and oath | Caelus, Tellus, Semo Sancus, Summanus, Vediovis |
| Deified abstractions | Victoria, Fides, Concordia, Spes, Salus, Libertas, Pietas, Virtus, Honos, Pax, Felicitas, Juventas, Annona, Abundantia |
| Archaic and agricultural | Consus, Flora, Robigus, Feronia, Silvanus, Portunus, Angerona, Furrina, Vacuna, Laverna, Libitina |
| The Camenae and birth | Carmenta, Egeria, Antevorta, Postvorta, Anna Perenna, Mater Matuta, Cloacina |
| The door | Cardea, Forculus, Limentinus |

## Dispositions that are not additions

- **Dis Pater**, **Orcus** → ALIAS. Both are already carried as aliases of
  `roman_pluto`.
- **Lupercus** → ALIAS of `roman_faunus`.
- **Camenae** → REJECT as a collective; the four individual Camenae are added.
- **Lares**, **Penates**, **Genius** → REJECT. These are classes of tutelary
  spirit, not named individuals. A *genius* is always someone's or somewhere's;
  individual instances are named for their bearer, not in their own right.
- **Flora is NOT treated as a duplicate** of `oscan_fluusa`, which carries
  "Flora" among its aliases. The two are cognate and belong to the same Italic
  stock, but Fluusa is attested in the Oscan cult circle and Flora has her own
  Roman festival, flamen and temple — the same principle that keeps Oscan
  Kerres and Roman Ceres apart.

## Sourcing discipline

No direct outbound web access in this session; research went through
server-side web search. Citations name the ancient author, the temple and its
dedication, or the reference work; no printed monograph is cited as though it
had been read.

**Dedication dates were verified rather than recalled, and two of the
recollections that went into planning this batch turned out to be wrong** —
Concordia's shrine is the 304 BCE vow of Cn. Flavius, not a 367 BCE vow of
Camillus, and Libertas's Aventine temple is 297 BCE, not 238. Both are recorded
as verified. Where a date could **not** be verified in this pass, the record
says so instead of guessing: `roman_felicitas` carries temple cult with no
dedication date and an explicit note to that effect.

Popular god-list sites were used for discovery only and are not cited as
authority.

## Relations

All **symmetric** relations in this batch are between figures authored here, so
no existing transcript needed editing. Relations toward records already in the
corpus use non-symmetric kinds only:

- `roman_quirinus` → `counterpart-of` → `roman_romulus`. Deliberately not
  `equated-with`: the identification is ancient (Ovid) but secondary, and
  Quirinus was very probably an independent Sabine god whose altar stood on the
  Quirinal before Rome absorbed the cult. The record states both.
- `roman_venus` → `counterpart-of` → `greek_hesiod_aphrodite`;
  `roman_apollo` → `counterpart-of` → `greek_hesiod_apollo`.
- `roman_caelus` → `father-of` → Saturn, Ops, Janus; `roman_tellus` →
  `mother-of` → Saturn, Ops.
- `roman_semo_sancus` → `counterpart-of` → `umbrian_fisus_sancius`, the record
  added in this lane's Umbrian pass, which shares the Sancius element.

Within-batch pairs: Caelus–Tellus (spouse); Virtus–Honos (the Porta Capena
complex, arranged so Honos is reached through Virtus); Flora–Robigus (she
flowers the crop, he is asked to keep the blight off it); the four Camenae;
the three powers of the doorway.

**26 figures are genuinely kinless** and carry cited verdicts in
`verified-solitary.json`. Deified abstractions have no kin by nature — that is
what distinguishes them from gods with myths — and the same is true of the
archaic functional deities like Robigus and Furrina.

### Family-graph ceiling

`test/seed.test.cjs` caps figures with no family links. This batch takes the
count to the existing ceiling exactly, so the ceiling is raised with a
documented reason, as previous waves did. The justification is specific: Roman
deified abstractions and archaic functional deities are kinless *by
definition*, and Roman religion contains many more of them than this pass
ingests.

## Status: PARTIAL, not DONE

Every candidate in this census is dispositioned and every ADD is ingested, but
the Roman tradition is nowhere near exhausted. Still outstanding:

- The rest of the **indigitamenta** — Varro's catalogues of functional deities,
  preserved largely through Augustine's hostile quotation.
- The **imperial cult** and its personifications beyond Annona and Abundantia.
- Further **river and spring deities** beyond Tiberinus and Juturna.
- The **Sabine stratum** proper, which has no tradition key in this registry.
- **Feronia, Semo Sancus and Vacuna** are filed under Roman but are Sabine or
  wider Italic in origin; a future Sabine tradition should coordinate with
  these records rather than duplicate them.

There is no concrete blocker, so `BLOCKED` would be wrong; `PARTIAL` records
that the work is real and unfinished.
