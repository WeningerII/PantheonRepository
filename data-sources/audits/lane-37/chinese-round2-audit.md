# Lane 37 — Chinese round 2: the incomplete sets

Owner: `lane-37-claude`. Branch: `claude/friendly-cerf-lgoxfz`.
Census: [`chinese-round2-census.tsv`](chinese-round2-census.tsv) — 53 rows.

    ADD 32 · EXISTING 11 · BLOCKED 5 · REJECT 5
    corpus 6,786 -> 6,818 figures · Chinese 98 -> 130 · traditions 560, unchanged

## The gap was not absent names — it was broken sets

The Chinese key is one of the corpus's largest at 98 records and looks well
covered: all eight Immortals, the whole Journey to the West cast, the Three Pure
Ones. But:

| set | corpus held |
|---|---|
| The Ten Kings of Diyu | **2 of 10** (Qinguang, Yanluo) |
| The Four Dragon Kings | **1 of 4** (Ao Guang) |
| The storm quartet | **1 of 4** (Leigong) |
| The Three Officials | **0 of 3** |

And the registry **said so in its own data**: `chinese_yanluo_wang`'s record
already reads "fifth of the Ten Kings of Hell". The corpus named a set of ten
inside a record and held two of them — the lane-30/34 pattern again.

The sharpest case is **Leigong without Dianmu**. Leigong is 雷公, "thunder LORD";
Dianmu is 電母, "lightning MOTHER"; the sources are explicit that *gong* and *mu*
mark the yang and yin halves of one storm. **The two names encode each other**,
and the corpus held one. Twenty-second tradition for this fault, and its most
literal instance yet.

Below the top of the hierarchy the corpus had nothing: no **Tudigong**, the god of
the shrine at the end of the street, and no **Chenghuang**, the City God. A
celestial bureaucracy recorded only from the Jade Emperor down to the Immortals
is not a bureaucracy.

## The sweep: one hit in fifty, and it was an alias

`Marshal Tianpeng` → `chinese_zhu_bajie`. Correct, and not a gap: it is Zhu
Bajie's rank *before* his fall, so the name is an alias of a held record. Censused
REJECT on that ground. The other forty-nine candidates were absent outright —
which is what a broken set looks like from outside: not a near-miss, just nothing.

## The family-link ceiling caught a real omission again — and I checked before concluding

`noFam` came in at **1603 against a ceiling of 1600**, exactly as in lane 36. I did
not reach for the ceiling. I re-read the sources for all five edgeless additions,
and **three had a directly stated relation I had failed to write**:

* **Tai Sui** — "each personified as a celestial general **in service of** the Jade
  Emperor".
* **Wu Gang** — "**punished by the Jade Emperor**, who sent him to the Moon
  Palace". A second search found this; the first had not asked.
* **Houtu** — "**one of the Four Heavenly Ministers** … subordinate only to the
  Great Jade Emperor, **who assist him** in administering all phenomena".

The same re-read also supplied relations I had missed on already-edged records
(the Three Officials "subordinate only to the Jade Emperor"; the Dragon Kings
"serve under" him), which are now written for accuracy rather than for the count.

**Lu Ban and Yue Lao were checked the same way and genuinely have none** — a craft
patron whose cult runs through a trade, and a matchmaker who arranges other
people's marriages and has none of his own. Both keep written solitary verdicts.

`noFam` landed at **1600**.

## ⚠ Escalation: the ceiling now has ZERO margin

1600 against a ceiling of `<= 1600` passes, but **the next ingest lane that adds a
single genuinely kinless figure will fail this test.** That is not a comfortable
place to leave the programme, and it is a decision for the owner, not a lane:

1. **Raise the ceiling with a written rationale**, as the test's own comment
   records being done repeatedly before — its history explicitly cites "lone
   creators, solitary monsters/demons, impersonal directional powers" and "a
   personified quality has no parents". Most of this lane's kinless figures are
   exactly that class.
2. **Or make set-binding a lane requirement**, so that every batch writes the
   relations that bind its own sets. Lanes 36 and 37 both tripped this guard for
   the same reason and both fixes were real attested relations, which suggests the
   omission is systematic rather than accidental.

Related, and still open from lane 36: **66 entries in `verified-solitary.json`
describe figures that now carry edges**, and nothing prunes them.

## Judgement calls

* **Wuguan Wang ships with no Chinese form.** His first element is written both 五官
  and 仵官 with no settled form, so the field is left empty and the etymology note
  says exactly that. Thirty-one of thirty-two records carry Chinese script.
* **Zhinü's era is her father's** (`mythic-prehistory`), not the `mythic` her story
  would take: the registry's era ordering puts `mythic` *earlier*, so authoring her
  there would have made a daughter older than her father and tripped the
  era-inversion check.
* **Bixia Yuanjun asserts no parentage.** The tradition commonly makes her Dongyue
  Dadi's daughter; this pass's research did not return that filiation, so the link
  records only the shared mountain cult the sources do attest.
* **Houtu's sex changed in history and the record says so**: male before the Tang,
  female from Wu Zetian's reign. Authored female as the later and dominant form,
  with the earlier recorded rather than erased. Fengbo is handled the same way
  (Earl of Wind, later Old Lady Wind).
* **Tai Sui, Tudigong and Chenghuang are authored as offices**, not as the many
  holders who fill them; the sixty Tai Sui are censused REJECT as a class.
* **Two symmetric facts use non-symmetric kinds on purpose.** The dragon brothers'
  link to Ao Guang and Dianmu's to Leigong both target pre-existing records this
  lane does not mutate, so a symmetric kind would leave a one-way relation
  dangling. `validate-transcripts` flagged exactly that on the first pass and
  **the kinds were changed rather than the warning accepted** — my own stated rule
  since lane 34, which I had broken here.

## Verification

* `validate-transcripts.cjs` — 32 figures, clean, no RECIPROCAL-NEEDED warnings.
* Two records carry parentIds, both checked against the tier arithmetic **and** the
  era ordering: Ao Bing (0.5 → demigod, era `mythic` = his father's) and Zhinü
  (0.5 → demigod, era `mythic-prehistory` = her father's). The other thirty author
  none.
* All four generators, then `build.py --pages` **and** plain `build.py`.
* `verify-regen.sh` byte-exact after commit.
* Record diff: **32 added, 0 removed, 0 mutated pre-existing.** Every link to the
  eleven pre-existing records touched uses a non-symmetric kind written from this
  end only.
* Lane 33's name-collision gate green (7/7). `npm test` **309/309**.
