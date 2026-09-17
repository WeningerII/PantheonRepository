# Lane 35 — the Jewish (rabbinic–kabbalistic) expansion

Owner: `lane-35-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Census: [`jewish-rabbinic-census.tsv`](jewish-rabbinic-census.tsv) — 51 rows,
every candidate with an explicit disposition.

    candidates censused   51
    ADD                   27   ingested
    EXISTING              12   already held
    BLOCKED                6   genuine blockers, exact uncertainty recorded
    REJECT                 6   out of scope by standing rule

    corpus   6,734 -> 6,761 figures
    this key     12 -> 39 records
    traditions          560, unchanged

## The gap: the corpus held Sandalphon and not Gabriel

The rabbinic–kabbalistic key held twelve records — Metatron, Sandalphon, Raziel,
Samael, Lilith, Naamah, Agrat bat Mahlat, Ashmedai, Behemoth, Leviathan, Ziz and
Adam Kadmon.

**It had no Michael, no Gabriel, no Raphael and no Uriel.** Those four are the
four chief angels the Midrash sets around the divine throne, and by a wide margin
the most attested angelic figures in the tradition. The corpus held the esoteric
ones and not the ones a reader would look up first.

Two sharper versions of the same fault:

* **It held Samael and not Michael.** The midrashic Michael exists largely to be
  set *against* Samael, as Israel's heavenly defender against its accuser. The
  registry held the accuser and not the defender.
* **It held three of the four demon queens.** Lilith, Naamah and Agrat bat Mahlat
  were all records. Eisheth Zenunim was not — a set held incomplete, with nothing
  in the data to mark that anything was missing.

## The fourth sweep failure mode, confirmed in a second tradition running

Lane 34 named a failure mode: a correct cross-tradition record concealing a real
gap in another key. **It reproduced here immediately.** The sweep over eighty-six
candidate names returned:

| candidate | what the corpus answered with |
|---|---|
| `Michael` | `beta_israel_mikael` [Beta Israel] |
| `Gabriel` | `beta_israel_gabriel` [Beta Israel] |
| `Raphael` | `beta_israel_rafael` [Beta Israel] |
| `Suriel`  | `beta_israel_suriel` [Beta Israel] |
| `Rahab`   | `yahwism_rahab` [Ancient Israelite religion / Yahwism] |

Three of the four chief angels were **findable by name under somebody else's
key**. A search for the rabbinic Michael answered with the Ethiopian Beta Israel
Mika'el: a correct record of a real figure, and the wrong answer to the question
being asked.

**Uriel is the control case.** He is the one of the four with no cross-tradition
record to hide behind, and the only one whose absence a name search would
actually have surfaced. That two lanes in a row produced this pattern is the
point: it is not an Ossetian accident, it is structural, and it is invisible to
every check this programme runs.

## The thing this lane refused to ingest

Searching for the kabbalistic angelic hierarchy returns, repeatedly, a tidy
table: Metatron–Kether, Raziel–Chokmah, Tzaphkiel–Binah, Tzadkiel–Chesed,
Kamael–Geburah, Raphael–Tiferet, Haniel–Netzach, Michael–Hod, Gabriel–Yesod,
Sandalphon–Malkuth. It is clean, it is everywhere, and it would have yielded
**five more records for no work at all** — Tzaphkiel, Tzadkiel, Kamael, Haniel
and Jophiel.

**That table is Hermetic Qabalah** — a Western occult system of the Renaissance
and after, not rabbinic and not classical kabbalah. The source producing it says
so itself. Ingesting those five under a key labelled *rabbinic–kabbalistic* would
be exactly the "unsupported modern inventions" case this programme's founding
rules bar, and it would arrive looking like scholarship because it comes in a
table.

They are censused REJECT. **One of the five, Yofiel, is authored** — on a wholly
different basis: Hekhalot literature names him among the Princes of the Presence,
which is a rabbinic attestation. His record says so explicitly, so that his
presence is never mistaken for an endorsement of the table.

This is the most consequential judgement in the lane, and it cost five records.

## Judgement calls worth stating

**Ha-Satan is one record carrying three identities, on the tradition's own
authority.** Reish Lakish holds that Satan, the yetzer hara and the Angel of Death
are all one. The Angel of Death is therefore an **alias**, not a second record —
and **Azrael**, the name popular sources attach to that office, is BLOCKED,
because the research found he appears in neither the Hebrew Bible nor the Talmud
nor the Midrashim. A lane that had reached for Azrael would have added a figure
the tradition does not have.

**Azazel and Shemhazai are both authored because the Talmud pairs them to contrast
them**: Shemhazai repents by hanging upside down between heaven and earth in
perpetual atonement, and Azael refuses and is bound in the desert as the source of
sorcery. Holding one without the other destroys the contrast the story exists for.
So are **Af and Hemah**, "Anger" and "Wrath", whom the sources never name apart.

**`jewish_rahab_sea` carries a qualified primary name** — "Rahab, minister of the
sea" — rather than the bare "Rahab", because `yahwism_rahab` already exists. Lane
33's gate scopes collisions to a single tradition, so the bare name would *not*
have failed CI; it would simply have been the same defect lanes 30–32 spent three
lanes repairing. The corpus's own `jewish_leviathan` beside `yahwism_leviathan`
establishes that the two keys legitimately both hold these figures.

**Sariel is authored with no sphere.** 1 Enoch 20 gives each of the seven a
jurisdiction — and, alone among them, gives Sariel none in the text the research
returned. Rather than assign him one by analogy, the record carries only "one of
the seven who watch".

**Of the twelve pre-existing records, three are female and all three are demon
queens.** This batch adds three more women — Lailah, Shekhinah and Eisheth — and
only one of them is a demon. That is worth recording because the shape of the
previous twelve was not neutral.

## Sourcing discipline

**A tractate folio is cited only where the research actually returned that
folio.** Yoma 67b, Berakhot 18b, Shabbat 152b, Bava Batra 74b, Pesachim 111b,
Taanit 25b and 1 Enoch 20 are cited as primary sources because the research gave
them. Where it gave the tractate but not the folio — Reish Lakish on Satan in Bava
Batra — **the citation stops at the tractate.** Everywhere else the substance
found is recorded instead of a citation that was not read.

**Hebrew script is supplied only for names that stand in the Hebrew Bible**
(מיכאל, גבריאל, עזאזל, עוג, רהב, קטב מרירי, השטן) or whose Hebrew the research
itself returned (שכינה, דומה, לילה, אף, חמה). Raphael, Uriel, Sariel, Raguel,
Saraqael, Remiel and every Hekhalot name ship with **no Hebrew at all** rather
than a reconstructed one. **Twelve of twenty-seven records carry a Hebrew form and
fifteen do not.** Unpointed consonantal text is used, because supplying vowel
points would be reconstruction; the pre-existing records in this key are pointed,
and that inconsistency is deliberate and stated rather than quietly smoothed over.

Every unresolved etymology says "not resolved in the sources consulted".

No image was ingested, so the image-licensing rule is not engaged.

## What was blocked, and exactly why

* **Azrael** — the research found he *is not there*: absent from the Hebrew Bible,
  the Talmud and the Midrashim. A similar name, Azriel, appears in the Zohar.
* **Belial** — the only attestation found says he is mentioned twice in Jubilees
  and is *probably identical* to Mastema. A second record would assert a
  distinction the evidence explicitly declines to make.
* **Zagzagel** — one clause, "the Angel of Wisdom", with no office-detail or locus.
* **Suriya / Seganzegael** — names in a list and nothing more. Akatriel and
  Anafiel are authored from the *same passage* because each has substance there.
* **Abaddon** — searched and not substantiated in this pass.
* **Ein Sof** — **no dedicated research was done.** Whether the attributeless
  Infinite is a figure in this registry's sense is a question for the owner. The
  corpus's existing `jewish_adam_kadmon` shows abstractions *can* be held under
  this key, which is precisely why the question deserves a decision rather than a
  lane's guess.

## What was rejected, and under which standing rule

* **The Hermetic Qabalah sefirot-archangel set** — see above.
* **Yahoel** — attested in the evidence found only as one of Metatron's seventy
  names. An alias of a record already held, not a separate figure.
* **Seraphim / Cherubim / Ophanim / Hayyot** — the angelic orders: generic classes.
* **Nephilim** — a class. Their chief, Mastema, is authored; the class is not.
* **The ten sefirot** — emanations and attributes, not persons. The tenth,
  Malkuth, *is* the Shekhinah, who is authored — as the Presence the tradition
  personifies, not as a slot on a diagram.
* **shedim / mazzikin / dybbuk** — classes of spirit. Named individuals from
  within them (Ashmedai, Ketev Meriri, Agrat bat Mahlat) are held; the categories
  are not.

## Verification

* `validate-transcripts.cjs` — **27 figures, clean on the first pass**, no
  problems and no RECIPROCAL-NEEDED warnings.
* **Every figure is typed `numen`** — the house call for this whole key, since all
  twelve pre-existing records are numen — and **no figure authors any parentIds**.
  Tier-classification drift is impossible by construction: `classifyDivinity`
  returns `'numen'` before it computes anything.
* Full regeneration through all four generators, then `build.py --pages` **and**
  plain `build.py`.
* `verify-regen.sh` — byte-exact after commit.
* Record-level diff: **27 added, 0 removed, 0 mutated pre-existing.** The eight
  pre-existing records this batch links to — Samael, Metatron, Lilith, Naamah,
  Agrat bat Mahlat, `yahwism_rahab` and the four Beta Israel angels — are
  untouched; every link to them uses a non-symmetric kind written from this end
  only.
* Fourteen new figures have neither parents nor relations and were given written
  verdicts in `data-sources/verified-solitary.json` — the high count is a property
  of the material, since an angel attested by an office and a folio genuinely has
  no kin, and each verdict says which kind of solitude it is.
* Lane 33's name-collision gate green (7/7).
* `npm test` — full suite green.
