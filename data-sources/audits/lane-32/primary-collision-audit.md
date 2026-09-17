# Lane 32 — the remaining 19 primary-name collisions

Owner: `lane-32-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Corpus: **6,707 figures, unchanged.** Nothing added, nothing removed.
Census: 18 rows — **13 PRIMARY-RENAMED, 1 PRIMARY-KEPT, 4 BLOCKED**.

**Same-tradition primary collisions: 19 → 1.** 28 records renamed.

## The rule, stated once and applied throughout

> **Where one record is the tradition's dominant bearer of a name and the other
> is a minor homonym, rename only the minor one. Where neither dominates, rename
> all of them.**

Dominance was judged from evidence the corpus already holds — relation counts,
source counts, notes length, and whether a record is a member of a *catalogue
list* — never from outside knowledge. **No web-search budget remained and none
was used.**

**Ten records keep bare primaries because of that rule**: Iphigenia, Astyanax,
Creon, Laomedon, Nicippe, Praxithea, Procris, Electra, Tiye, Ambat. Renaming
Hector's son away from "Astyanax" to satisfy a catalogue entry would have made the
corpus worse, not better.

## Six collisions had the same shape

Six were a famous bearer against a member of the **Thespiadae** or **Thespiades** —
the fifty sons and fifty daughters of Thespius, catalogued in a single Apollodorus
passage. In every case the catalogue member was renamed `… the Thespiad` and the
famous bearer kept the bare name:

| bare name kept by | renamed |
|---|---|
| Hector's infant son | Astyanax the Thespiad |
| the king of Thebes | Creon the Thespiad |
| the Trojan oath-breaker | Laomedon the Thespiad |
| the mother of Eurystheus | Nicippe the Thespiad |
| the queen of Athens | Praxithea the Thespiad |
| the wife of Cephalus | Procris the Thespiad |

## Where the corpus had already written the distinction down — again

The pattern from lanes 30 and 31 held once more. Four records were carrying, in
their own notes, the very distinction their primary name was destroying:

- `greek_iphigenia` — "the dominant tradition; cf. the separate demigod
  Helen-Theseus entry" → she keeps the name, the variant is renamed
- `greek_creusa_troy` — "the Creusa of Troy (distinct from the registered
  `greek_creusa_athens`)"
- `hindu_shatanika` — "Distinct from the later Śatānīka who is Janamejaya's son"
- `greek_anaxibia_bias` — **"Distinguished by id from Anaxibia the Atreid"** — an
  id doing a name's job, the identical fault lane 31 found on Mentor, in a second
  place

Two records already carried the corrected name **as an alias**:
`greek_astyoche_laomedon` had "Astyoche daughter of Laomedon" and
`greek_anaxibia_atreid` had "Anaxibia daughter of Atreus". Both were promoted to
primary and the now-redundant alias removed, so nothing is stored twice.

## The one collision not fixed — and it must not be

**`poia` and `blackfoot_poia` are not homonyms. They are the same figure recorded
twice.**

| | `poia` | `blackfoot_poia` |
|---|---|---|
| parentIds | ipisowaahs, soatsaki | **identical** |
| era | star-stories | **identical** |
| aliases | Scarface, Star Boy, Awunna | Star Boy, Scarface, … |
| notes | 222 chars | **empty** |
| relations | 0 | 3 |

**Disambiguating them would entrench the duplicate** by giving it a
distinct-looking name — the opposite of a repair. This needs a **merge**, which is
not a rename, and which lane 30 already blocked for three other pairs.

Recommendation recorded: keep one and fold the other in — `blackfoot_poia` holds
the relations, `poia` holds the fuller notes and sources, so neither is simply
discardable.

## One record turned out to be a collective

`malekula_ambat_brother` is not a sixth brother. Its own notes say the elder
brothers are "lightly individuated, appearing as a company" — so the record holds
them **collectively**. It is renamed to **"Ambat's elder brothers"** to say what it
actually is.

**Whether it should exist at all is a separate question and is blocked.** This
programme does not ingest collectives — the rejection applied to the nanchon, the
Gede, the nāgas and the tsen — but this record predates that rule and deleting it
would destroy sourced material.

## Verification

- all 28 renames asserted a match on the record's own `id` before touching
  anything; both syntaxes handled (base JS literals and transcript JSON)
- **alias de-duplication**: where the new primary already existed in that record's
  `alt`, it was removed, so no name is stored twice
- rescan: same-tradition primary collisions **19 → 1**, the remainder being the
  Poïa duplicate
- ten edit surfaces — `app/data.js` for base records, nine transcripts for
  generated ones; `scripts/verify-regen.sh` → **byte-exact**, which proves the
  split was respected
- `npm test` → **302/302**
- record-level diff: **0 added, 0 removed, 28 mutated**, every one `name` only
- figure count unchanged at 6,707; README and `package.json` untouched

## Status: PARTIAL

18 of 19 groups resolved. The 19th is a duplicate record needing a merge, not a
rename.

**The real fix is still unbuilt.** Nothing in the 302-test suite catches a
primary-name collision, an alias shadow, or an alias that is really a separate
figure. **Lanes 29–32 found all three by hand.** A scripted check over
`seedPeople` would make the whole class regression-proof, needs no research
budget, and would have caught every defect these four lanes repaired.
