# Lane 14 — Slavic audit

**Status: PARTIAL.** Corpus 6,258 → 6,281 figures. Slavic 18 → 41 records.

Census: 90 rows — **23 ADD, 12 ALIAS, 18 EXISTING, 3 CROSS-TRADITION SAME
FIGURE, 18 REJECT, 16 BLOCKED**. Full rows in `slavic-census.tsv`; the
records themselves in `data-sources/transcripts/slavic-expansion.txt`.

Eighteen records was the smallest holding of any tradition in this corpus with
a literature.

## The registry held five of the six idols of Kiev

The Primary Chronicle, under the year 980, records that Vladimir set up idols on
the hill outside his hall: Perun with a head of silver and a moustache of gold,
and Khors, Dazhbog, Stribog, Simargl and Mokosh. That single sentence is the
only place an East Slavic ruler's own pantheon is enumerated, and it is the most
important document the tradition has.

The registry held Perun, Dazhbog, Stribog, Simargl and Mokosh.

It did not hold **Khors** — who is, on the frequency count, the most often
mentioned god in the entire East Slavic written record after Perun.

Five-of-six is a worse failure than none-of-six, because a corpus with a hole in
the middle of its only enumerated pantheon looks complete from the outside. The
first sweep of this lane did not catch it. It was caught by re-running the sweep
after the first nineteen records had been generated, with a wider name list —
which is the methodological finding of this lane and is written up below.

## What else was missing

- **The Rügen temples.** Svetovid of Arkona — four heads, a horn read for the
  harvest, a temple Saxo Grammaticus described in detail and the Danes destroyed
  in 1168 — was absent, and so were Rugievit, Porevit and Porenut, the three
  multi-headed gods of the same island. These are the **best-attested Slavic
  deities there are**, because a hostile eyewitness wrote down what the statues
  looked like before knocking them over. The registry instead held the
  reconstructed abstractions: Belobog, Chernobog, Rod, Lada.
- **Three more chronicle-attested West Slavic gods.** Yarovit, whose temple at
  Wolgast held a giant shield in place of a statue and was destroyed in 1128;
  and Prove and Podaga, the two Wagrian gods Helmold names — one worshipped at
  an enclosed oak grove containing no image, the other at an image in a temple
  with no grove. The contrast between those two cults, a few days' travel apart,
  is the best evidence there is that West Slavic religion was not one system.
- **The seasonal cycle.** The registry held Marzanna, who is winter and death,
  and held nothing she acts on: not Jarilo, whom she marries and murders every
  year; not Živa, the life on the other side of her; not Kupala, the midsummer
  night the whole turn happens on.
- **The folklore.** No Baba Yaga. No Koschei the Deathless. No Zmey Gorynych —
  in a registry that held **Dobrynya Nikitich, whose one defining deed is
  killing that dragon.** Ninth tradition running to show that exact fault.
- **The bylina cast beyond three names.** The registry held Ilya Muromets,
  Dobrynya Nikitich and Alyosha Popovich, joined to each other and to nothing
  else: no court to serve at, no opponent for any of them, and neither of the
  two figures the epic itself treats as stronger than all three — Svyatogor,
  whom the earth cannot carry, and Mikula Selyaninovich, the ploughman who lifts
  the bag Svyatogor cannot. Nor Sadko, who belongs to the *other* cycle
  entirely.
- **The bird-maidens.** Alkonost, Sirin and Gamayun.

## The methodological finding: sweep twice

The lane opened with a 48-name check across the whole registry: 19 hits, 29
absences, every hit a deliberate control. That sweep produced the first nineteen
records.

The sweep was then re-run, widened to 92 names, **after those records were in the
corpus** — nominally to confirm the ingest, in fact as a second pass over the
tradition. It returned Khors, Yarovit, Prove and Podaga, all absent, all
chronicle-attested, one of them the single worst gap in the tradition.

The reason is not subtle: the names checked the first time were the names that
came to mind the first time. A corpus sweep tests the registry against the
author's recall, and re-running it once the obvious names are satisfied is what
surfaces the names the first pass was crowding out. **This should be standard
for every remaining lane**, and the four records of block VI are the argument.

## Scope decisions taken explicitly

**The household and landscape spirits are classes and are REJECT rows.**
Domovoi, rusalka, leshy, vodyanoy, bannik, kikimora, vila, poludnitsa, chort,
likho, upyr, bereginya, rozhanitsy. There is a domovoi behind every stove in
the Slavic world, not one Domovoi. This is the same rule that rejected the
Bacabs as a class, the yōkai kinds and the Ajogun in earlier lanes.

**The bird-maidens are not classes.** Alkonost, Sirin and Gamayun are three
named individuals with three distinct offices — joy, sorrow, prophecy — printed
together on the same lubok sheets. Three records, with reciprocated `companion`
edges whose notes state that the grouping is iconographic and not narrative.

**Lel and Polel are rejected where Devana is ingested**, and the distinction is
argued rather than asserted: both come from Długosz, whose Slavic pantheon most
modern scholars reject, but *dziewanna* is an independent Polish plant-name with
a long life outside him, while *lelum polelum* is a burden in a song. Devana is
ingested at **low weight with the objection on the record**; Lel and Polel are
not ingested at all.

**Vesna is not ingested and is not made an alias of Živa.** The equation is
modern: Živa is a Polabian tribal goddess named once, in Latin, by a German
priest; Vesna is a personification of spring in later South Slavic folklore with
no medieval attestation as a deity. Popular sources merge them because both are
the opposite of winter. That is not an identification.

**The Firebird is an item question, not a figure question**, and Sivka-Burka is
a named horse identified only by a name and an owner — the exact ground on which
four Norse horses were rejected in lane 13.

## Relation kinds chosen deliberately

`enemy`, `spouse` and `sibling` are symmetric, so an edge of that kind toward a
pre-existing record cannot be reciprocated without modifying that record. Every
edge this batch points at a pre-existing record therefore uses a non-symmetric
kind — and in each case the non-symmetric kind is also the *truer* one:

- **Jarilo `consort-of` and `killed-by` Marzanna.** The marriage lasts one
  season and ends in a murder. A standing `spouse` edge would state something
  the cycle contradicts every autumn.
- **Zmey Gorynych `slain-by` Dobrynya Nikitich.** Directional, and the direction
  is the informative one.
- **Nightingale the Robber `defeated-by` Ilya Muromets.**
- **Svyatogor `outmatched-by` Mikula**, reciprocated in-batch by Mikula
  `outmatched` Svyatogor. Not a feud and not a rivalry — a test the giant fails
  once, conclusively.
- **Svyatogor `associate-of` Ilya Muromets** — deliberately the weakest kind
  available, because the byliny are inconsistent about what passes between them
  and `companion` would settle a question the sources leave open.
- **Prince Vladimir `overlord-of`** each of the three existing bogatyrs. With
  those three edges the registry's triad stops floating free of the cycle it
  belongs to.
- **Khors `co-enshrined-with`** each of the other five Kiev idols. Not kinship
  and not alliance: the six were erected together in 980 and that joint erection
  is the only relation the source states.
- **Prove and Podaga `named-alongside`** — a textual relation, labelled as one,
  because Helmold names them in one sentence and there is no Polabian myth at
  all for them to appear in together.

## Zero pre-existing records mutated

Every symmetric relation in this batch is reciprocated *inside* the batch. No
transcript outside `slavic-expansion.txt` was touched.

## What is not asserted

- **No relation between Yarovit and Jarilo.** The names share the *jar-* root
  and a connection is a standing scholarly proposal, some treatments going as
  far as making them one god under a western and an eastern name. This
  programme has declined to write edges on proposals in every lane, and declines
  here; the observation is in the record's notes and Yarovit carries a solitary
  verdict.
- **No relation between Baba Yaga and Koschei.** They share the tale of Marya
  Morevna. The sources make them neither allies nor enemies, and two figures
  sharing a page is not an edge.
- **No sun-or-moon ruling on Khors.** The Igor Tale passage that is the main
  evidence either way is ambiguous and the record says so.
- **No identification of the epic Vladimir with Vladimir Svyatoslavich.** The
  record is filed at `kievan-rus-historical` because that is where the cycle
  places him, carries no dates, and states on its face that the epic prince is a
  composite that also draws on Vladimir Monomakh.
- **No Volkhova and no Lyubava on Sadko.** Both are Rimsky-Korsakov's opera of
  1898, not the bylina.
- **No sphere for Prove beyond his cult.** Writing him up as a god of law on the
  strength of a contested etymology would be inventing a sphere out of a guess
  about a name.
- **No domains at all for Podaga**, whose source gives none.

## Evidential weight is recorded, not smoothed

Four records carry weight below `high`, and each says why on its face:

| Record | Weight | Why |
|---|---|---|
| Jarilo | medium | No medieval text tells this story; it is a twentieth-century reconstruction by Katičić and Belaj out of Croatian, Serbian and Russian spring songs. |
| Kupala | medium | The festival is certainly old and pagan; the *god* is probably a back-formation from its name by a clerical writer. |
| Podaga | medium | A name and a temple, and nothing else in the source. |
| Devana | low | Długosz supplies a Slavic Jupiter, Ceres, Pluto and Diana, in order, which is not how pantheons are found. |

The registry's prior state was worse in both directions: it held Marzanna with
no husband to murder, and it held Belobog and Chernobog with no label at all.

## Sixteen BLOCKED

Four are flagged upward as **strong ADDs held only for want of a retrievable
citation**, each searched alongside figures that did come back:

- **Kiy, Shchek, Khoriv and Lybid** — the legendary founders of Kiev, from the
  *same source* this batch used for Khors.
- **Volga Svyatoslavich** — Mikula Selyaninovich's usual companion in the
  byliny. The batch ingests Mikula without the figure he is normally paired
  with.
- **Mat Syra Zemlya**, Moist Mother Earth — invoked in charms and oaths, and the
  thing both Svyatogor and Mikula records turn on.
- **Turupit, Puruvit and Karevit** — three further Rügen gods of the *Knýtlinga
  saga*, which would complete a set this batch holds four of.

**Radegast is a different kind of blocker and the most interesting row in the
census.** Helmold places Radegast at Rethra; Thietmar places Zuarasici —
Svarozhich, *already in the corpus* — at the same sanctuary, and the two are
widely identified. Ingesting Radegast as a new record could duplicate an
existing one under a second name. He stays blocked until a treatment says
whether the name belongs as an alias on `slavic_svarozhich` or as a record of
its own.

**Marya Morevna, Vasilisa and Ivan Tsarevich are blocked on a scope question,
not on evidence**: whether a tale-type role filled by a differently-named
character in each variant is an individual for this registry's purposes. That
is the same question that made the household spirits REJECT rows, and it
deserves a deliberate answer rather than a reflex. It also gates Koschei's
relations, which is why he carries a solitary verdict.

## Seven kinless figures carry cited verified-solitary verdicts

`slavic_svetovid`, `slavic_kupala`, `slavic_devana`, `slavic_baba_yaga`,
`slavic_koschei`, `slavic_sadko`, `slavic_yarovit`. Each verdict names what was
searched and what it would take to give the figure kin — a Sea Tsar record for
Sadko, a wonder-tale pass for Koschei, a decision about the Yarovit–Jarilo
proposal for Yarovit.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 23 figures
- full regeneration (4 generators + `build.py --pages` + `build.py`), then
  `scripts/verify-regen.sh` → byte-exact
- `npm test` → 302/302
- record-level diff: 23 added, 0 removed, **0 pre-existing records mutated**
- zero dangling references, zero new era inversions, zero unverified kinless
  figures
- README and `package.json` counts refreshed to 6,281 / 560 / 5,308 / 7,929 /
  3,197

## Status: PARTIAL

Remaining, in rough order of value: the sixteen BLOCKED rows, starting with the
four strong ADDs and the Radegast question; the Polish and West Slavic
foundation legends (Krak, Wanda, Piast, Popiel, Lech, Czech, Rus); the rest of
the Kievan bogatyrs; Vasily Buslaev and the Novgorodian cycle; the Sea Tsar; and
a deliberate ruling on whether the wonder-tale protagonists are individuals.

Two structural observations for whoever takes the next Slavic pass. First, the
tradition's **era vocabulary invites historical rulers** — `kievan-rus-historical`
is a registered era and nothing currently sits in it except the epic Vladimir
added here. Second, the Baltic keys (`Lithuanian`, `Old Prussian`, `Latvian`)
hold the cognate figures at small counts and share a great deal of this material
under other names; the three CROSS-TRADITION rows in this census are the visible
edge of that.
