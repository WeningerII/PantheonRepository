# Lane 31 — the Mentor primary names

Owner: `lane-31-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Corpus: **6,707 figures, unchanged.** Nothing added, nothing removed.
Census: 22 rows — **2 PRIMARY-RENAMED, 20 BLOCKED**.

This closes the single item lane 30 left open.

## The fix

```
greek_apollod_mentor_eurystheus   'Mentor' -> 'Mentor son of Eurystheus'
greek_apollod_thespiad_mentor     'Mentor' -> 'Mentor the Thespiad'
```

Both disambiguators come from the records' own `parentIds` — Eurystheus for the
first, Heracles and Asopis for the second — and follow patterns the corpus already
uses: **"Amenhotep son of Hapu"**, "Anticleia of Epidaurus", "Polydorus of Thebes".
Nothing was invented; the information was already in the records.

The bare string "Mentor" now resolves to **no record at all**, which is correct —
see below.

## The original author disambiguated by id, on purpose, and that is now recorded

`greek_apollod_mentor_eurystheus` carried this in its own etymology:

> "The name pattern is shared with the Odyssean Mentor son of Alcimus
> (Hom. Od. 2.225) and others; **the id-suffix `_eurystheus` disambiguates.**"

That is a deliberate design choice, not an oversight, and it deserved to be
honoured rather than silently overwritten. **An id disambiguates for a programmer;
it does nothing for a reader**, who sees two entries both titled "Mentor". The
sentence is **updated rather than deleted**, so the record now says the primary
name disambiguates and the id still does so at record level.

## The corpus names the famous Mentor and does not hold him

The same etymology cites **"the Odyssean Mentor son of Alcimus (Hom. Od. 2.225)"**
— the Mentor, the one the English word *mentor* descends from.

**The corpus holds two obscure Mentors and not him.** That is this programme's
recurring finding arriving in the smallest possible space: a record naming, in its
own etymology field, a figure the registry does not have.

**He is not authored here.** The only evidence in hand is a citation I have not
read; this session's web-search budget was exhausted in lane 28; and authoring a
figure from a *reference to* a source rather than from the source is what this
programme does not do. It is censused BLOCKED with the citation preserved, and the
absence is now written into the data itself rather than living only in an audit.

## Mentor was one of twenty, and the other nineteen are listed, not fixed

Lane 30's scan checked alias→primary shadows. **It never checked whether two
records share a *primary* name** — which is exactly the Mentor case, and is why
Mentor surfaced only incidentally, through a `"Mentōr"` alias that happened to
shadow the other record's primary. Had it lacked that alias, the collision would
have been invisible to every check this programme has run.

Closing that gap: **254 primary-primary collisions corpus-wide, 20 of them
same-tradition.** With Mentor fixed, **19 remain**:

| name | tradition | records |
|---|---|---|
| Astyoche | Greek | ×3 |
| Antiope | Greek | ×3 |
| Glaucus, Chione, Iphigenia, Creusa, Eurypylus, Anaxibia, Astyanax, Creon, Laomedon, Nicippe, Praxithea, Procris, Electra | Greek | ×2 each |
| Poïa | Blackfoot | ×2 |
| Śatānīka | Hindu | ×2 |
| Tiye | Egyptian | ×2 |
| Ambat | Malekula | ×2 |

**These are listed rather than guessed at.** Each needs a disambiguator chosen per
figure, and although most are derivable from the ids themselves
(`greek_glaucus_corinth` → "Glaucus of Corinth", `greek_antiope_amazon` → "Antiope
the Amazon"), that is nineteen naming decisions nobody asked for. The request was
to fix Mentor.

**One local inconsistency is stated rather than hidden**: the other hundred
Thespiadae keep bare primaries. Mentor the Thespiad is disambiguated only because
he is the one that collides.

## Verification

- both edits asserted a **unique match** before applying
- rescan: same-tradition primary collisions **20 → 19**; `"mentor"` no longer
  collides; **zero records** now answer to the bare name
- two edit surfaces again: the Eurystheus record is a base JS literal in
  `app/data.js`, the Thespiad record is generated from
  `data-sources/transcripts/thespiades-seed.txt` — each edited on its own surface
- full regeneration (4 generators, both build modes), `scripts/verify-regen.sh`
  → **byte-exact**
- `npm test` → **302/302**
- record-level diff: **0 added, 0 removed, 2 mutated**, both `name` only
- figure count unchanged at 6,707; README and `package.json` untouched

## Status: PARTIAL

Mentor is fixed and lane 30 has no open items left. **Nineteen same-tradition
primary collisions remain, now measured and listed** — and a new check is
warranted in CI, because nothing in the suite would have caught any of them.
