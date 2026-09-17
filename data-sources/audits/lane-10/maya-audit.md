# Lane 10 — Maya audit

Owner: `lane-10-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,063 total figures, 26 of them Maya.

Corpus: **6,063 → 6,127 figures**. Maya **26 → 90**.
Census: 151 rows — **64 ADD, 12 ALIAS, 29 EXISTING, 11 CROSS-TRADITION SAME
FIGURE, 10 REJECT, 25 BLOCKED**.

## The gap had two shapes

A 79-name check across the whole registry returned 9 hits and 70 absences, and
several of the 9 are alias matches rather than holdings: "Kisin" resolves to
`maya_ah_puch`, "Ah Mun" to `maya_yum_kaax`, "Chac Chel" to `maya_ix_chel`,
"God D" to `maya_itzamna`, "Maize God" to three records at once.

### The Popol Vuh was here as a cast list with the extras cut

The corpus held the principals — Hun Hunahpu, the Hero Twins, Xquic, Xmucane,
Xpiacoc, Hun-Came, Vucub-Came, Tohil, Vucub Caquix, Zipacna, Cabracan,
Camazotz, Cuchumaquic — and almost nobody else in the book:

- **Hun Batz and Hun Chouen**, the elder half-brothers turned into monkeys,
  who are the patron gods of every Maya scribe and artist and appear on more
  Classic painted vessels than most deities. Both absent. Their mother
  **Xbaquiyalo**, who is the reason the two pairs of brothers are half-brothers
  at all, absent.
- **Nine of the twelve lords of Xibalba.** The corpus held the two supreme
  lords and exactly one of the ten subordinates — Cuchumaquic — so the paired
  structure that is the whole point of that rank (blood, pus, bone, filth,
  the road) was invisible.
- **Avilix and Hacavitz.** Without them Tohil is one god; with them he is one
  of three, carried by three named men into three named temples, which is the
  K'iche' political settlement rather than a deity.
- **The four men made of maize and their four wives** — Balam Quitze, Balam
  Acab, Mahucutah, Iqui Balam, Caha Paluna, Chomiha, Tzununiha, Caquixaha.
  The book exists to explain where these eight came from and the registry had
  none of them.
- **Xulu and Pacam**, the two seers through whom the Hero Twins arrange their
  own resurrection. They are the mechanism of the central episode.
- **Three of the four destroyers of the wooden people.**

### The Classic period was absent entirely

**Not one Maya ruler was in the registry.** Not few — zero. No Pakal, no Yax
K'uk' Mo', no Jasaw Chan K'awiil, no Yuknoom the Great, in a corpus carrying
Egyptian pharaohs, Mesopotamian kings, ten Mixtec lords by their calendar
names, and — as of this programme's Aztec batch — the entire Mexica tlatoani
line.

Nor were the gods the Classic inscriptions actually name. **K'awiil** was
absent from a corpus that would shortly hold six kings named after him, which
is precisely the pattern the Mesopotamian batch found with Ninurta and Ashur:
the registry carried kings *named for* a god it did not carry. **God L** was
absent, though he is on more Late Classic vases than anyone. **Pauahtun and
the four Bacabs** were absent, so the sky had nothing under it.

The Maya are the one Mesoamerican civilisation that wrote its own political
history in a script that has been readable since the 1980s, in day-exact
dates, on monuments that are still standing. The registry had the mythology
and none of the history.

## What twenty-three people make legible

The rulers were chosen so the politics reads rather than samples:

- **Tikal against Calakmul**, two centuries of it, now with both sides
  present: the founder Yax Ehb Xook; the 378 entrada (Siyaj K'ak' entering
  the city on the day its king died, and the child Yax Nuun Ahiin installed
  behind him); Sihyaj Chan K'awiil II, whose Stela 31 is the dynasty's own
  account of that transition; Yuknoom Ch'een II running the Kaanul hegemony
  by clients rather than administration; and Jasaw Chan K'awiil I reversing
  it in 695.
- **Palenque**, where an irregular succession through a woman produced the
  most elaborate theology in the Maya world: Pakal, his mother Lady Sak
  K'uk' from whom his claim came, and Kan Bahlam II, who built three temples
  for three divine brothers to naturalise two royal ones. The Palenque Triad
  is in this batch because he is.
- **Copán and Quiriguá**, where in 738 a client beheaded the overlord who had
  installed him fourteen years earlier — an event that needs both parties in
  the registry and had neither.
- **Yaxchilán**, where Lintels 24 and 25 give the clearest surviving
  statement of how Maya contact with the dead was understood to work, and the
  principal figure in them is a king's wife.
- **El Perú-Waka'**, where Lady K'abel held the title *kaloomte'* and her
  husband did not, and the inscriptions say so.

Three of the twenty-three are women who ruled or outranked: Lady Sak K'uk',
Lady Six Sky, Lady K'abel. A fourth, Lady K'abal Xook, has more monuments
than most kings.

## The tradition-key problem: observed, flagged, not touched

The corpus carries the Maya across five keys — Maya (26), K'iche' (12),
Yucatec Maya (12), Lacandon (12), Tzotzil–Tzeltal (9) — and three of them
overlap badly:

- **All twelve K'iche' records duplicate Maya records** of the same Popol Vuh
  figures: `kiche_hun_came` / `maya_hun_came`, `kiche_tohil` / `maya_tohil`,
  `kiche_xpiyacoc` / `maya_xpiacoc`, and so on through the set.
- **Seven of the twelve Yucatec Maya records duplicate Maya records**: Ah
  Puch, Chaac, Itzamna, Ix Chel, Kinich Ahau, Kukulkan, Yum Kaax.

Nineteen figures held twice. This is pre-existing, it is in the census as
eleven CROSS-TRADITION rows, and **it is not merged here** — merging is
destructive and the tradition-key question is the owner's. It is now the third
tradition in this programme where that has had to be said (Danel and Paghat in
the Canaanite pass, Olokun and Eshu in the Yoruba pass, and this), which
suggests the corpus would benefit from a deliberate tradition-key review
rather than from further case-by-case flags.

This batch goes under **Maya**, because that is the key with periodised eras
(cosmogonic → colonial) that Classic material needs and the key the fuller
Popol Vuh set already sits under. Every new record that pairs with an existing
one points at the `maya_*` id.

## Two things deliberately not added

**The Tonsured Maize God** is identified by the reference treatments with Hun
Hunahpu, who is already in the corpus; a second record would be the duplicate
this programme forbids. **Chac Chel** is already an alias on `maya_ix_chel`.
Both are ALIAS rows with the identification stated, not records.

Letter-labels are handled by one rule: where a Schellhas or Palenque label has
since been resolved to a readable name, the name is primary and the label an
alias (K'awiil/God K/GII, Pauahtun/God N). Where it has not — God L, GI, GIII
— the label is the record's name, because inventing a reading would be worse
than carrying a label that says what is not known.

## Contradictions carried, not smoothed

- **GII's birth date at Palenque** is given as 28 November 2360 BC in one
  treatment and 6 November 2360 BC in another, the latter placing it fourteen
  days after his brother's. Both on the record.
- **Tecun Uman's death** is 12 February 1524 in the Kaqchikel annals as one
  treatment cites them, and 20 February in another.
- **Itzamnaaj Bahlam's numbering** at Yaxchilán is II in some treatments and
  III in others; both carried.
- **Kan Ek's death** is given as execution in some reports and as disease in
  others; the record says the reports vary.

## Twenty-five BLOCKED

Three kinds again.

**List-only deities** (Acat, Kinich Kakmo, Ah Peku, Ah Tabai, Ah Kin Xoc, Ix
Chup): named in circulating Maya deity lists and nowhere reachable else. The
same caution the Aztec pass applied to the Mexica lists applies here, and for
the same reason.

**Ambiguous referents** (Ix Chebel Yax, Itzam Cab Ain, Nim Ac and Nima Tziis):
one treatment makes them separate figures and another makes them names of
figures the corpus already holds. Recording them without resolution would
manufacture duplicates.

**Named but empty** (Spearthrower Owl, Chak Tok Ich'aak, K'an Chitam, Nuun
Ujol Chaak, Yuknoom Yich'aak K'ahk', Smoke Shell, K'ak' Joplaj Chan K'awiil,
Lady K'inich, Lady Ahiin, Lady B'ulu', K'an Mo' Hix, Yopaat): each appears in
this batch's own records as somebody's parent, predecessor or antagonist, and
nothing beyond that was retrievable. **Spearthrower Owl** is the one worth
flagging upward — he is the Teotihuacan figure behind the 378 entrada, there
is substantial scholarship on him, and he may belong to a Teotihuacan lane
rather than a Maya one.

Two further blocks are scoping rather than evidence: **the remaining Tikal and
Copán king-lists** (roughly twenty-five more rulers, enumerable from Altar Q
and from the Tikal sequence), and **the Caste War leaders** of 1847, which
belong to a nineteenth-century pass taken as a unit.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 64 figures
- full regeneration, then `scripts/verify-regen.sh` → byte-exact
- record-level diff against the previous head: 64 added, 0 removed, 0
  pre-existing records mutated
- zero dangling references, zero era inversions, zero unverified kinless
  figures; ten new solitary verdicts, each citing why
- `npm test` → 302/302

## Status: PARTIAL

Sixty-four additions take Maya from 26 records to 90. What remains, in rough
order: the rest of the Tikal and Copán king-lists; the rulers of Palenque,
Yaxchilán, Piedras Negras, Caracol and Naranjo beyond the ones here; the
Dresden and Madrid codices' calendrical deities; the *wayob* of the Classic
ceramics; the Caste War; and the tradition-key review that the K'iche' and
Yucatec duplication now plainly needs.
