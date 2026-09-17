# Lane 2 — Egyptian audit

Owner: `lane-2-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 5,885 total figures, 76 of them Egyptian.

Corpus: **5,885 → 5,959 figures**. Egyptian **76 → 150**.
Census: 112 rows — **74 ADD, 7 ALIAS, 22 EXISTING, 4 CROSS-TRADITION SAME
FIGURE, 1 REJECT, 4 BLOCKED**.

## The gap, and why 76 records was worse than it looks

Of the 76 Egyptian records the registry held, roughly **forty were pharaohs,
queens and royal children** — Ramesses II through VIII, Tutankhamun, Akhenaten,
Nefertiti, Hatshepsut, Meritaten, Meketaten, Nefertari, Tiye, Tuya, Tausret,
Setnakhte, Merneptah and the rest. The pantheon itself was carrying about
thirty-six records for one of the largest attested god-lists in the ancient
world.

An 87-name check, over canonical names and aliases with Unicode normalisation
and across the **whole** registry rather than the Egyptian slice, returned
seven hits and **eighty absences**. Among them:

- **Apep.** The registry held Ra, Maat, the solar barque and the entire
  apparatus of the night journey, and not the serpent the apparatus exists to
  resist. This is the single largest hole the check found.
- **Six of the eight members of the Ogdoad.** Nun and Amun were present;
  Naunet, Amaunet, Heh, Hauhet, Kek and Kauket were not — and Nun's record
  carried "Nunet (fem.)" as an *alias*, which collapses one of the eight into
  a footnote on another.
- **All four sons of Horus** — the personified canopic jars, among the most
  physically abundant gods in Egyptian archaeology.
- **All three great bull cults**: Apis, Mnevis, Buchis. And Serapis.
- **The Aten**, in a registry holding Akhenaten, Nefertiti, Meritaten,
  Meketaten and Tutankhamun — the entire Amarna family and not the god the
  episode was about. Likewise **Iah**, the moon, beside the king Ahmose, whose
  name means "the moon is born".
- **Montu**, in a corpus with kings named "Montu is satisfied".
- **Seshat**, beside Thoth. **Heqet, Satis, Anuket and Menhit**, beside Khnum.
  **Anput, Kebechet and Wepwawet**, beside Anubis. **Bat, Hesat and Ihy**,
  beside Hathor. Every one of those is a household the registry held one member of.
- **Shai, Renenutet and Meskhenet** — the three who stand at an Egyptian birth
  and decide what the life will be.

## Three decisions stated on the record rather than buried

**Hapy is two gods and the registry had the other one.** `egyptian_hapi` is the
androgynous Nile-inundation god, and it carries "Hapy" among its aliases. The
Hapy of the four sons of Horus is a baboon-headed guardian of a jar of lungs.
They are written the same and share nothing else. `egyptian_hapy_son_of_horus`
is authored with the collision stated on the record — the same operation this
programme performed on Uttu and Utu in the Mesopotamian pass.

**Naunet gets a record although Nun's lists her as an alias.** The Ogdoad is
four *pairs*. Carrying the female half of one pair as an alias of the male half
means the registry describes an eightfold system with seven-and-a-bit gods.
She is authored with `counterpart-of` pointing at Nun and a note saying the
alias is there.

**Haroeris and Harpocrates are records, not epithets.** This programme forbids
ingesting transparent epithets that are only titles, and the forms of Horus are
exactly where that rule is at risk. Neither of these clears the bar by
accident: Haroeris has his own half of the double temple at Kom Ombo and his own
genealogy (Set's brother, not his nephew), and Harpocrates has a distinct
Late-Period and Greco-Roman cult with its own objects — the cippi — and a
geographic range far beyond Egypt. Both carry `counterpart-of` to
`egyptian_horus` and a `variants[]` entry recording that other treatments read
them as forms rather than gods. **Harsiese**, by contrast, is dispositioned
EXISTING: "Horus son of Isis" simply *is* the registry's Horus.

## The one pre-existing record this pass modifies

`egyptian_ra` gains one relation: `enemy` → `egyptian_apep`. Apep's enmity with
Ra is the fixed point of Egyptian religion and `enemy` is a symmetric kind, so
recording it on the Apep record alone would have left the corpus one-legged.
Ra is a generated record, so the reciprocal is added to his transcript
(`data-sources/transcripts/a93a0a1e5d8f2de7e.txt`) in the same commit. The
record-level diff confirms this is the **only** pre-existing record touched:
74 added, 0 removed, 1 mutated, and the mutation is that one edge.

Relations toward the six seed-core Egyptian records — Osiris, Isis, Horus,
Ptah, Amun, Imhotep — use non-symmetric kinds throughout, because the generator
does not rebuild seed-core figures and a symmetric edge pointed at them could
not be reciprocated.

## What was rejected, blocked and deferred

**One REJECT: Ptah-Sokar-Osiris.** All three of its components are now in the
registry. Recording the compound as a fourth figure would record a theological
operation rather than a deity; it is stated on Sokar's record instead.

**Four BLOCKED** — Tenenet, Qebui, Wepset, Petbe. Each row carries the exact
uncertainty, the sources checked and the evidence needed. All four are real
names in the god-lists; what is missing is enough to populate a record without
inventing the contents.

**Four CROSS-TRADITION SAME FIGURE.** Mandulis is carried as a Beja deity,
which is where the cult comes from. Anat, Astarte and Reshep are Levantine gods
with genuine New Kingdom Egyptian cults, already carried under Canaanite,
Phoenician, Punic, Eblaite and Israelite traditions. Egypt's Levantine imports
— these three plus Baal and Qetesh — are a coherent group and are better done
as one deliberate pass than as three-quarters of one here. That is a deferral,
and it is named as such rather than left silent.

## Solitary verdicts

Twelve of the 74 end with no parent and no relation, and each carries a cited
verdict in `data-sources/verified-solitary.json`: Babi, Nehebkau, Tayt, Pakhet,
Mafdet, Unut, Meretseger, Wadj-wer, Renpet, Wosret, Kherty, Sepa.

Most are the same kind of case: a deified abstraction (Renpet is the word
"year"), an animal power in the apotropaic register (Sepa the centipede, Mafdet
the snake-killer), or a goddess who is a place (Meretseger is a mountain,
Wadj-wer is the sea). Tayt is the interesting one — two gods are named as her
possible consort and *both* sources hedge, so both of those records carry a
hedged link toward her and nothing is asserted outward from hers.

Two figures came off that list during authoring when the other party was
supplied: **Buchis** (linked to Montu) and **Banebdjedet** (linked to
Hatmehit, whose record block VII adds).

## Sourcing

No direct outbound web access in this session — every fetch is refused at the
proxy — so research went through server-side web search, and the citations name
what was actually consulted: the standard encyclopedic and museum reference
treatments, and the primary texts where the claim comes from the text itself
(Pyramid Texts, Book of the Dead spell 125, the Amduat, the Book of Gates, the
Book of Overthrowing Apep in the Bremner-Rhind Papyrus). **No printed monograph
is cited as though it had been read.** Where a source hedges, the record keeps
the hedge: Neper's consort "may have been" Tayt, Hedjhotep is "sometimes
described as" hers, and both records say so in those words.

## Verification performed

- `node scripts/validate-transcripts.cjs data-sources/transcripts/egyptian-expansion.txt` → clean, 74 figures
- full regeneration (4 generators + `build.py`), then `bash scripts/verify-regen.sh` → byte-exact
- `npm test` → full suite green
- record-level diff of `app/data.js` against `origin/main`: **74 added, 0 removed, 1 pre-existing record mutated** (`egyptian_ra`, one relation, as above)
- relation edges 9,665 → 9,746; kinless figures 1,452 → 1,464 (ceiling 1,600, unchanged)
- zero dangling references and zero era inversions in the corpus warn stream

## Status: PARTIAL

The Egyptian pantheon proper is now covered — the Ogdoad, the night journey,
the funerary household, the birth-and-fate triad, the lion goddesses, the
cataract triad, the bull cults, the late syntheses. What remains:

- **The Levantine imports** — Reshep, Anat, Astarte, Baal, Qetesh — as one pass
- the Nubian and Meroitic gods of Egyptian-controlled territory (Dedun, Apedemak,
  Arensnuphis), which are arguably their own traditions and should be audited as such
- the nome gods with no surviving mythology, of which there are dozens
- the remaining pharaohs and royal families, of which the registry already holds
  a substantial and uneven sample
- the Greco-Egyptian magical papyri deities, which are a distinct corpus

No blocker prevents that work; it is more than one coherent PR.
