# Lane 29 — the alias-list unblock

Owner: `lane-29-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,703 total figures, 35 of them Haitian Vodou.

Corpus: **6,703 → 6,707 figures**. Haitian Vodou **35 → 39**.
Census: 22 rows — **4 ADD, 4 ALIAS-EDIT, 2 NOTE-CORRECTION, 6 EXISTING, 2
REJECT, 4 BLOCKED**.

**The record-level diff reports `mutated pre-existing: 5`.** That number is
correct and it is the point of this lane, so here is its breakdown before
anything else:

| records | what changed | why |
|---|---|---|
| `vodou_bawon_samdi`, `vodou_gede_nibo`, `vodou_ogou` | `name` (and one `epithets`) | **the three alias edits this lane exists to make** |
| `vodou_kalfou`, `vodou_ogou_balendjo` | `relations[].notes`, `notes` | **corrections to two records this programme wrote one lane ago**, whose notes this lane makes false |

The diff tool counts anything in the baseline as pre-existing, which is the right
default. The distinction between the two rows is editorial, not technical — but
it is the difference between *editing somebody else's record* and *correcting
your own*, and it should not be hidden inside a single number.

## What this lane is

Lane 28 found three figures that existed in the corpus only as strings inside
other figures' alias lists, could not create them, and escalated a single
question: **may a lane edit an alias list on a pre-existing record?**

The owner answered yes. This lane spends that answer.

## The defect, stated once more because it is the whole reason for the lane

| the hidden figure | where it was | what the sources say it is |
|---|---|---|
| **Baron La Croix** | alias on `vodou_bawon_samdi` | an aspect of Bawon — guardian of the **gravestone** |
| **Baron Cimetière** | alias *and epithet* on `vodou_bawon_samdi` | an aspect of Bawon — guardian of the **grave** |
| **Ogou Badagri** | alias on `vodou_ogou` | a lwa of the Nago nation, **a general in the armies of Ogou** |
| **"Gede" / "Ghede"** | aliases on `vodou_gede_nibo` | the **family name** of the largest family of lwa in the religion |

Lane 27 established that a **false absence** invites a lane to ship a duplicate.
This is the mirror image and it is worse: **an alias that is really a separate
figure makes a real absence invisible.** No sweep would ever report Baron La
Croix missing. No lane would ever be prompted to add him. A lane that tried would
be told he was already there.

The most telling single case is **Ogou Badagri**, whom the source calls *a
general in the armies of Ogou*. That is a relation between two figures. The
corpus was storing it as two names for one.

## Eight lanes of "zero mutated" was a constraint, not an achievement

Lanes 21–28 each reported **zero pre-existing records mutated**, and the phrase
had started to read like a quality metric. It was not. It was a rule, and lane 28
found the case where the rule was the thing doing the damage — it had made a
class of defect not merely unfixed but **unfixable and undetectable**.

This lane deliberately breaks that streak. The count is stated in the audit, in
the commit and in the PR rather than folded into a total, because a reader who
sees `mutated: 5` after eight lanes of zero deserves to know it was intended and
exactly what it covers.

## What was edited, exactly

Four deletions, all in `data-sources/transcripts/haitian-vodou.txt` — the source
the records are generated from. **Nothing was hand-edited in `app/data.js`**; the
generators reproduce it, and `verify-regen.sh` is byte-exact.

```
vodou_ogou         alt:      removed "Ogou Badagri"
vodou_bawon_samdi  alt:      removed "Baron La Croix", "Baron Cimetière"
vodou_bawon_samdi  epithets: removed "Baron Cimetière / Baron of the Cemetery"
vodou_gede_nibo    alt:      removed "Gede", "Ghede"
```

**No other field of any pre-existing record is touched** — not a name, not a
domain, not a relation, not a source, not a note. Each deletion is its own census
row so any one can be reversed without disturbing the others.

### The one judgement call, flagged rather than slipped through

The owner authorised editing **alias lists**. The third deletion is an
**epithet**. It read "Baron Cimetière", which is a *name* for a figure this batch
establishes is somebody else — a name-bearing field doing an alias's job — so the
same reasoning applies and the epithet is restored on `vodou_bawon_simitye`,
where it belongs.

**It has its own census row so it can be reversed alone** if the owner meant
alias lists strictly.

### What was deliberately left alone

`vodou_bawon_samdi`'s notes still read *"He is often paired or conflated with
Baron Lacroix and Baron Cimetière."* **That sentence is true.** The conflation is
real and the sources report it. The edit removes the corpus's *participation* in
the conflation, not its *record* of it.

## No record is created for the Gede

The bare "Gede" and "Ghede" come off Gede Nibo and **nothing replaces them**. The
Gede are a **family**, and a family is a class of spirit — the rejection this
programme applied to the nāgas, tsen, gyalpo and mamo in lane 27 and to the
nanchon in lane 28.

A sweep for "Gede" now returns **nothing**, where before it returned Gede Nibo.
**That is an improvement.** The corpus holds no figure simply called Gede, and it
should say so rather than answer with one member of the family.

## What the batch added

- **Bawon** — the lwa the alias list was standing in for. The sources name him as
  a lwa with three aspects; the corpus held one aspect with the other two folded
  into its alt list, so the shared figure had no record at all.
- **Baron La Croix** — guardian of the gravestone.
- **Baron Cimetière** — guardian of the grave, of the Gede nation.
- **Ogou Badagri** — lwa of the Nago nation, general in the armies of Ogou.

**Three stations that had been one record are three records**: Bawon Samdi rules
the *graveyard*, Baron La Croix guards the *gravestone*, Baron Cimetière guards
the *grave*.

## An edge lane 28 could not draw

Lane 28's Kalfou record said, in as many words, that no edge was drawn to Bawon
*"because which Baron the source means is exactly what the alias list has made
unanswerable."*

It is now answerable. `vodou_bawon --of-the-master-magicians-with-->
vodou_kalfou` completes the triad the source names — Gran Bwa, Kalfou and Baron,
counted together among the master magicians of the lwa for their role in the
Haitian secret societies. **Two of the three were already in the corpus and the
third was inside an alias list.**

## Two of this programme's own records are corrected

Lane 28 wrote two notes that this lane makes false, and both are rewritten rather
than deleted — each now tells the whole story, including why the record could not
be created at the time:

- **`vodou_ogou_balendjo`** — "NO RECORD IS CREATED FOR OGOU BADAGRIS…" He has
  one now.
- **`vodou_kalfou`** — the unanswerable-Baron note above.

These are records this programme authored one lane ago. **They still count in the
diff's `mutated: 5`** — the tool is right to count them, and the table at the top
of this audit separates them rather than arguing they don't exist. They are
censused separately as `NOTE-CORRECTION`. **Leaving a corpus that contradicts
itself would have been the worse outcome.**

## No new research, and none needed

This session's web-search budget was exhausted during lane 28. **Every claim in
this batch comes from treatments already retrieved and already cited in lane 28's
transcript** — the Gede and Bawon material, and the Ogou material. Nothing here
required a fact the corpus did not already have a citation for; the blocker was
never evidence, it was permission.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 4 figures, no outstanding
  reciprocals
- targeted sweep of the freed names: **all ten resolve to the correct record**,
  and "Gede"/"Ghede" correctly return nothing
- collision scan across all 6,707 records: **zero collisions touching the four
  new ids** — every freed name now has exactly one home
- full regeneration (4 generators, both build modes), then
  `scripts/verify-regen.sh` → **byte-exact**, which is what proves the alias
  edits were made in the source transcript and not in the generated file
- `npm test` → **302/302** (one intermediate failure, the README count assertion,
  caught before commit and fixed)
- record-level diff against the previous head: **4 added, 0 removed, 5 mutated**
  — 3 alias edits to records from an earlier lane, plus 2 note corrections to
  records this programme authored in lane 28; intended, authorised and itemised
  at the top of this audit
- zero dangling references, zero era inversions, zero tier drift — no `parentIds`
  in the batch, third lane running
- README and `package.json` counts refreshed to 6,707 / 560 / 5,499 / 7,930 /
  3,204

## Status: PARTIAL

The three figures lane 28 could not create exist, the family name no longer
answers for one of its members, and the edge lane 28 documented as undrawable is
drawn.

**The recommendation this lane ends on is a corpus-wide alias audit.** This
defect was found by hand, in one tradition, because lane 28 happened to read an
alias list closely. **Nothing in CI would have caught it** — a name that is
really a separate figure sitting in another figure's alt list produces no test
failure, no id collision and no sweep miss. It is very unlikely that Haitian
Vodou is the only tradition in 6,707 records where this has happened. A scripted
pass is now possible because the permission exists: **every alias that is also a
primary name elsewhere, and every alias a source describes as a distinct
figure.** That is the highest-value next lane in the programme, and it needs no
research budget at all.
