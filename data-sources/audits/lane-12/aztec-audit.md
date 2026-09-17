# Lane 12 — Aztec/Mexica audit

Owner: `lane-12-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 5,992 total figures, 21 of them Aztec/Mexica.

Corpus: **5,992 → 6,031 figures**. Aztec/Mexica **21 → 60**.
Census: 69 rows — **39 ADD, 5 ALIAS, 12 EXISTING, 7 REJECT, 6 BLOCKED**.

## Two distinct gaps

A 60-name check across the whole registry returned three hits and
fifty-seven absences, and they fell into two quite different holes.

### The pantheon

Absent: **Xolotl**, the dog-headed evening star. **Tlahuizcalpantecuhtli**,
Venus in the morning. **Nanahuatzin and Tecciztecatl** — the two gods who
stand at the bonfire at Teotihuacan, one of whom jumps and becomes the sun.
**Itzpapalotl**, in a registry that already carried her son Mixcoatl.
**Chicomecoatl and Xilonen**, the mature and the tender maize, in a registry
that carried Centeotl alone out of at least three maize deities.
**Patecatl**, in a registry that carried his wife Mayahuel. **Xochipilli**
and both his brothers. **Cihuacoatl**, whose name the second office of the
Mexica state carried as its title.

And **Tonacatecuhtli and Tonacacihuatl** — the names the Aztec sources
actually use where modern writing says Ometeotl.

### The rulers

The registry's twenty-one Aztec records were **twenty-one deities and zero
rulers.** Acamapichtli, Huitzilihuitl, Chimalpopoca, Itzcoatl, Moctezuma I,
Axayacatl, Tizoc, Ahuitzotl, Moctezuma II, Cuitlahuac, Cuauhtemoc — the whole
tlatoani line, in a corpus that carries Egyptian pharaohs, Mesopotamian kings
and ten Mixtec lords by their calendar names. Plus **Nezahualcoyotl** of
Texcoco and **Tlacaelel**, who held the office of Cihuacoatl for some fifty
years and is generally reckoned to have run the state from it.

Thirteen of the thirty-nine additions are that line.

## The Ometeotl decision

The registry already held `aztec_ometeotl`. The pair the Aztec sources name
are Tonacatecuhtli and Tonacacihuatl, "Lord and Lady of Our Flesh";
Ometecuhtli and Omecihuatl are the same couple under other names. And whether
a fused single deity called Ometeotl existed at all is a live dispute — Haly
(1992) argued the figure is a Trinity read into translated texts; Maffie has
answered him.

This pass authored **two records, not four**: the Tonaca- pair, each carrying
the Ome- name as an alias, each linked `counterpart-of` to the existing
Ometeotl, and each carrying a `variants[]` entry stating the dispute. Four
records for what may be one couple under two name-pairs would have been
exactly the duplicate this programme forbids.

## Where the registry's own aliases did the work

Three candidates were turned away by the corpus rather than by the sources:

- **Toci** and **Teteoinnan** are the Ochpaniztli goddess under two further
  names, and the registry already carries Toci as an alias on
  `aztec_coatlicue`. Adding either would duplicate a record already held.
- **Camaxtli** is already an alias on `mixcoatl`.
- **Metztli** is the ordinary word for the moon and is generally the moon
  Tecciztecatl became; recorded as an alias on his record rather than
  duplicated.

## Rejected

Seven REJECT rows. **Six are collectives**, which this programme does not
ingest: the Centzon Totochtin (four hundred pulque gods), the Centzon
Huitznahua (four hundred southerners), the Tlaloque, the Cihuateteo, the
Tzitzimimeh and the Ahuiateteo. In every case the *named members* are
recorded where they exist — Tepoztecatl from the four hundred rabbits,
Opochtli and Nappatecuhtli from the Tlaloque, Itzpapalotl from the
tzitzimimeh, Macuilxochitl from the Ahuiateteo — which is the right treatment:
the class is not a figure, but the figures in it are.

The seventh is **Ehecatl**, the wind aspect of Quetzalcoatl: a transparent
aspect-name of a god the registry already holds.

Two aspects of Tezcatlipoca, by contrast, *are* recorded — Tepeyollotl and
Chalchiuhtotolin — and the difference is worth stating. Ehecatl is Quetzalcoatl
doing something; Tepeyollotl and Chalchiuhtotolin have their own names, their
own day-signs, their own iconography and their own spheres, and the sources
treat them as deities that are also Tezcatlipoca rather than as Tezcatlipoca
in a hat. Both records carry `counterpart-of` to him and say so.

## Six BLOCKED

Four are names in modern deity lists whose attestation base could not be
established in this session — **Atlaua, Amimitl, Atlacoya, Chalmecacihuatl**.
That caution is deliberate: the Mexica lists in circulation contain a number
of entries that turn out to be nineteenth- and twentieth-century inventions,
and a registry that ingests a name because a list has it will acquire those.

**Acolmiztli** is blocked for a different reason: the name belongs both to a
lord of Mictlan and to a ruler of Coatlichan, and which is which needs
resolving before a record can be written.

**Huemac** is blocked on scope. He is the last ruler of Tollan and belongs to
the Toltec material; the registry has no Toltec tradition key, and opening one
is a decision to make deliberately — the same question the Canaanite pass
raised about Moab.

## Solitary verdicts

Three of the 39 end with no parent and no relation, each with a cited verdict:
Cihuacoatl, Huixtocihuatl and Yacatecuhtli.

**Huixtocihuatl** is the instructive one. She has exactly one kin claim in the
sources — that she was the elder sister of the rain gods, who quarrelled with
her and cast her out, so she went to the salt water and invented salt. But the
rain gods are the Tlaloque, a collective this programme does not record as a
figure, so the claim has nothing in the corpus to point at. It is stated in
her record in prose and the verdict says why.

## Sourcing

No direct outbound web access in this session — every fetch is refused at the
proxy — so research went through server-side search and the citations name what
was consulted: the standard reference treatments of the Mexica deities and
rulers, resting on the Florentine Codex, the Leyenda de los Soles, and the
Codices Chimalpahin, Aubin and Chimalpopoca. No printed monograph is cited as
though it had been read.

**Reign dates are given as the treatments give them, with the codices'
disagreements stated rather than averaged.** For Acamapichtli the three codices
give 1367–1387, 1376–1395 and 1350–1403 — a spread of forty years — and his
record says so. From Itzcoatl onward the dates are firm and the records give
them plainly.

## Verification performed

- `node scripts/validate-transcripts.cjs data-sources/transcripts/aztec-expansion.txt` → clean, 39 figures
- full regeneration (4 generators + `build.py`), then `bash scripts/verify-regen.sh` → byte-exact
- `npm test` → full suite green
- record-level diff of `app/data.js` against `origin/main`: **39 added, 0 removed, 0 pre-existing records mutated**
- relation edges 9,794 → 9,848; kinless figures 1,469 → 1,472 (ceiling 1,600, unchanged)
- zero dangling references and zero era inversions in the corpus warn stream

## Status: PARTIAL

The Mexica pantheon's principal register and the whole tlatoani line are now
in. What remains:

- the four BLOCKED list-names, pending a source citation each
- the **Toltec** material — Huemac, Tollan, the Quetzalcoatl-as-king traditions
  — pending a tradition-key decision
- the rulers of Texcoco and Tlacopan beyond Nezahualcoyotl (Nezahualpilli,
  Totoquihuaztli and their lines)
- the day-sign lords and the night lords as individual patrons, which is a
  large and systematic body the registry touches only through the gods who
  happen to hold those offices
- the Tlaxcalan and other Nahua pantheons outside the Triple Alliance

No blocker prevents that work; it is more than one coherent PR.
