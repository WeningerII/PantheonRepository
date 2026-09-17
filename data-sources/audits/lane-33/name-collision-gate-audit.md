# Lane 33 — the name-collision CI check

Owner: `lane-33-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Corpus: **6,707 figures, untouched.** No record changed; this lane adds a gate.

Suite: **302 → 309 tests / 220 → 227 subtests**, 0 failures.

## Why

Lanes 29–32 repaired 60 name defects across 54 records. **Every one was found by
hand**, and nothing in the 302-test suite would have caught any of them: a name
search returning the wrong figure produces no test failure, no id collision and
no build error. The class could silently regress on the next ingest.

This lane makes it regression-proof.

## What is gated

| gate | catches | found by |
|---|---|---|
| **primaryCollisions** | two records of one tradition sharing a primary name | lanes 31, 32 |
| **aliasShadows** | an alias that is another record's primary, same tradition | lane 30 |
| **conflationAliases** | a record whose own prose flags one of its aliases as a separate figure | lane 29 (heuristic) |

Plus two gates on the allowlist itself: **no stale entries**, and **every entry
carries a reason of at least 20 characters**.

It lives in `test/name-collisions.test.cjs`, so it runs under `npm test` — which
CI already invokes. **No workflow change was needed**, and it runs locally for
anyone authoring a lane, which is where the defects are actually introduced.

## What is deliberately NOT gated, and why

**Cross-tradition collisions.** 685 of the 710 alias shadows and 235 of the 254
primary collisions are the one-cult-two-keys pattern this corpus holds *on
purpose* — Ogun under the Yoruba, Santería and Vodou keys. Gating them would fail
on correct data, so the gates are all scoped to a single tradition.

**Aliases identical to their own record's primary.** Measured before committing
to it: **920 records**, almost all legitimate diacritic variants ("Danaë" beside
"Danae") that help search. Not a defect rule; dropped.

## The honest limit of gate C

**The defect lane 29 actually fixed is not decidable from the data.** A figure
that exists *only* as a string in someone else's alias list has no record to
collide with, so no scan can see it — that is exactly why Baron La Croix was
invisible for as long as he was.

Gate C is a **proxy**: it fires when a record's own notes use conflation language
naming one of its own aliases. That is the shape `vodou_bawon_samdi` had, and it
is the only automatable signal for the class. **It is labelled a heuristic in the
test file rather than dressed up as a proof**, and three of its current flags are
allowlisted as benign or unresolved — which is what a heuristic looks like when
it is being honest.

## The allowlist is the census

Four accepted exceptions live in `data-sources/name-collision-allowlist.json`,
each with a written reason. **This lane files no separate census TSV on purpose**:
the allowlist is machine-read by the test, so a census duplicating it would be a
second source of truth free to drift out of sync with the gate.

| entry | why accepted |
|---|---|
| `poia` / `blackfoot_poia` | **not a homonym** — the same figure recorded twice; lane 32 refused to disambiguate it because renaming would entrench a duplicate. Needs a merge. |
| `dan_bugle::Bagle` | **unresolved in the source itself** — the notes say bugle "is sometimes conflated with, or distinguished from" bagle |
| `kalenjin_chemosit::Kerit` | benign — Kerit is a cryptid label for the same creature, not a separate figure |
| `mangaian_tangiia::Tangiia` | heuristic false positive — the tell names a Rarotongan figure absent from the corpus |

**Stale entries fail the build.** An allowlist nobody prunes is how a ratchet
quietly stops ratcheting, so when a collision is genuinely fixed its entry must
be deleted or the suite goes red.

## Every gate was proved to fail before being trusted

A green test that cannot go red is worthless, so each gate was fired
deliberately against an injected defect and the corpus restored afterwards:

| injected | result |
|---|---|
| a second Greek record renamed to "Glaucus son of Minos" | **primaryCollisions failed**, naming both ids |
| alias "Iphigenia" added to Zeus | **aliasShadows failed**, naming the shadowed record |
| conflation tell + matching alias on Zeus's notes | **conflationAliases failed** |
| a fake allowlist entry matching nothing | **stale gate failed**, naming the entry |

**The conflationAliases probe did not fire on the first attempt.** The injected
text had landed in a nested `notes:` field rather than the record's top-level
one, so the gate was right and the probe was wrong. Rather than record a pass,
the probe was corrected to patch the top-level notes and the gate then fired as
designed. A gate whose negative test was never actually verified is not a gate.

## Verification

- `npm test` → **309/309 across 227 subtests**, up from 302/220; all seven new
  tests present and passing
- **a test-count scare, chased down again**: one run reported 300 tests. The
  counts were re-read from a clean run — **309 tests, 227 subtests, 0 failures,
  all 7 new tests present** — confirming the same truncated-report wobble lane 30
  documented, not a lost test
- each gate verified to fail on an injected defect (table above) and the corpus
  restored byte-for-byte afterwards
- `app/data.js` untouched; `scripts/verify-regen.sh` not re-run because no
  generated file changed and `git status` shows only the two new files
- corpus unchanged at 6,707 figures; README and `package.json` untouched

## Status: COMPLETE

The three classes lanes 29–32 found by hand are now enforced on every push and
every local `npm test`.

What this does **not** do, stated so nobody mistakes the gate for full coverage:
it cannot find a figure that exists only inside an alias list, and it says so.
That still needs someone reading sources against alias lists — which is how lane
28 found the Barons in the first place.
