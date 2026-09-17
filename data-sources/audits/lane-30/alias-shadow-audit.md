# Lane 30 — the 25 same-tradition alias shadows

Owner: `lane-30-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,707 figures. **No figures added or removed — this lane only fixes names.**

Census: 28 rows — **13 ALIAS-REMOVED, 9 ALIAS-QUALIFIED, 6 BLOCKED**.
Same-tradition shadows: **25 → 1.**

## What was wrong

Lane 29's corpus-wide scan found 710 aliases that are also another record's primary
name. 685 were cross-tradition — the deliberate one-cult-two-keys pattern this
programme has documented six times, and not defects.

The other **25 were same-tradition**, and every one of them meant a search for a
name returned the wrong figure of the same tradition. This lane fixes 24 of them.

**No new research was possible — the web-search budget was spent in lane 28 — and
none was used. Every judgement below comes from the corpus's own notes and
sources**, which turned out to be enough, because in most cases the corpus had
already written down the very distinction its alias list was violating.

## The corpus kept contradicting itself, and that is what made this fixable

The strongest cases needed no outside evidence at all:

- **`ingessana_sun` carried "Tel".** Its own notes say the sun is "the visible seat
  of the creator **whose name it shares**"; the creator's record says "the sun is
  only the foremost of the things Tel brought into being". Two records, both
  insisting the sun is *not* the creator — and an alias making the created thing
  answer for its creator. **The clearest case in the set, settled by the corpus
  against itself.**
- **`greek_anticleia_periphetes` carried "Anticlea".** Both records already said
  "Distinct from…" in their own notes.
- **`egyptian_khaemwaset_c` carried "Khaemweset".** Its own notes call him "named
  after Ramesses II's famous antiquarian son" — an explicit namesake.
- **`insikiran` carried "Anikê".** Its own notes list "(Makunaima, Anikê,
  Insikiran)" as *three brothers*. The alias was his brother's name.

## Three kinds of fix

**Removed (13)** — where the alias was simply another figure's name, an
unsupported assertion, or not a name at all:

| record | alias | why |
|---|---|---|
| `greek_hesiod_zeus` | "Dia" | **the accusative of Zeus** — a grammatical form, which this programme's founding rules already bar. It was shadowing the mortal Lapith princess Dia, so a search for the mother of Pirithous answered with Zeus. |
| `greek_anaxibia_atreid` | "Astyoche" | **triply ambiguous** — it shadowed three separate Astyoches — and unsupported by its holder's own notes |
| `egyptian_isis` ↔ `egyptian_iset_priestess` | "Iset" / "Isis" | a **mutual** shadow: each answered for the other |
| `ingessana_sun` | "Tel", "tel" | above |
| `mesopotamian_ninurta` | "Ningirsu" | the record **already carried the qualified "Ninĝirsu (Lagash form)"**; the bare duplicate went |
| + `greek_polydorus_thebes`, `greek_anticleia_periphetes`, `egyptian_khaemwaset_c`, `insikiran`, `chibiabos`, `ngabe_nubu`, `nuuchahnulth_kwatyat` | | |

**Qualified (9)** — where the alias was a *genuine* name for the holder that
happened to collide. Deleting it would have destroyed real information, so it was
disambiguated in place:

| record | before | after |
|---|---|---|
| `greek_hesiod_artemis` | "Phoebe" | "Phoebe (epithet of Artemis)" |
| `hindu_krishna` | "Vasudeva" | "Vāsudeva (patronymic of Krishna)" |
| `hindu_vishnu` | "Vāsudeva" | "Vāsudeva (divine name; distinct from Vasudeva the Yadava prince)" |
| `hindu_durga` | "Ambika" | "Ambika (epithet of Durga)" |
| `finnish_lemminkainen` | "Ahti" | "Ahti (Kalevala by-name of Lemminkäinen)" |
| `asha_pava` | "Tasorentsi" | "Tasorentsi (divine title)" |
| + `hindu_yudhishthira`, `hindu_satyavati`, `roman_agrippina_the_elder` | | |

**The parenthetical convention is the corpus's own** — it already used
"Ninĝirsu (Lagash form)", "Anikê (Macuxi rendering)" and "Mahākāla (Indian
origin)". This lane applies an existing house style rather than inventing one.

**`hindu_krishna` is worth singling out: the corpus had written the father's name
on the son.** Krishna's patronymic is *Vāsudeva*, "son of Vasudeva"; the record
carried the short form, which is literally `hindu_vasudeva`, the Yadava prince who
*is* his father. The long form is not invented here — the corpus already used it
on Vishnu.

## The one that was not fixed, and why

**`greek_apollod_mentor_eurystheus` and `greek_apollod_thespiad_mentor` both carry
the primary name "Mentor".** That is not an alias defect and no alias edit can
touch it: two records simply share a primary. Fixing it means editing a **primary
name**, which is a naming decision beyond the permission given for alias lists.

The corpus's own convention supplies the fix — "Polydorus of Thebes", "Anticleia of
Epidaurus" and "Khaemwaset C" are all disambiguated primaries. **Proposal: "Mentor
son of Eurystheus" and "Mentor the Thespiad".** One word from the owner applies it.

## What was deliberately left open

Three of the removals end a shadow without settling the deeper question behind it,
and the audit says so rather than implying the pair is resolved:

- **`chibiabos` / `jiibayaabooz`** — Chibiabos is a common anglicisation of
  Jiibayaabooz and the corpus holds both as separate demigod records.
- **`ngabe_nubu` / `ngabe_ngobo`** — Nubu the benevolent creator, Ngöbö the supreme
  being.
- **`nuuchahnulth_kwatyat` / `nuuchahnulth_quawteaht`** — the transformer and the
  creator, widely treated as one being in different transcriptions.

**Merging two records is not an alias edit**, and deciding it needs sourcing this
session cannot do. All three are blocked with the question stated.

A fourth is a contradiction *inside* one record: `insikiran`'s notes make Anikê his
brother while his alias list calls Anikê his own Macuxi rendering. The bare alias
is removed; **the qualified one is left exactly as found and the contradiction is
handed over rather than guessed at.**

## Two edit surfaces, and why that matters

The 25 records live in two places, and the distinction governs how each was edited:

- **10 are in the hand-maintained base corpus** inside `app/data.js` (before the
  `NEW_FIGURES_START` sentinel at line 43230), written as JS object literals.
  Those were edited in `app/data.js` directly, which is correct — the generators
  never rewrite that region.
- **12 are generated** from `data-sources/transcripts/`. Those were edited **in the
  transcripts**, never in the generated output.

`verify-regen.sh` passing byte-exact is what proves the split was respected: had a
generated record been edited in `app/data.js`, regeneration would have overwritten
it and the check would have failed.

## Verification

- all 24 edits asserted a **unique match** before applying — the qualified variants
  already present (`'Anikê (Macuxi rendering)'`, `'Ninĝirsu (Lagash form)'`)
  correctly did not match the bare forms
- rescan after regeneration: **same-tradition shadows 25 → 1**, the remainder being
  the Mentor primary-primary collision above
- full regeneration (4 generators, both build modes), then `scripts/verify-regen.sh`
  → **byte-exact**
- `npm test` → **302/302 across 220 subtests**
- **a test-count scare, chased down and disproved**: one run reported 293 tests /
  211 subtests. Rather than accept it, the suite was run against this lane's tree
  and against a stashed clean tree and the subtest *names* compared — **identical
  220 both times, no test lost**. The short reading was a truncated report, the
  same wobble seen earlier in this session. It is recorded because a silent drop of
  nine tests would have been the worst possible thing to wave through.
- record-level diff: **0 added, 0 removed, 22 mutated** — every one an intended
  alias edit
- figure count unchanged at **6,707**; README and `package.json` untouched, because
  nothing was added

## Status: PARTIAL

24 of 25 same-tradition shadows are gone. The 25th needs a primary-name decision
the owner has not delegated, and has a one-line proposal waiting.

What remains measured rather than guessed: **603 shared-alias pairs** (the same
alias string on two records) and **686 cross-tradition shadows**, the latter almost
entirely the deliberate diaspora pattern. Neither is fixed here, and the counts are
recorded so the next lane starts from a baseline instead of a hunch.
