# Lane 12 — Japanese audit

Owner: `lane-12-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,177 total figures, 48 of them Japanese.

Corpus: **6,177 → 6,224 figures**. Japanese **48 → 95**.
Census: 109 rows — **47 ADD, 9 ALIAS, 23 EXISTING, 6 CROSS-TRADITION SAME
FIGURE, 11 REJECT, 13 BLOCKED**.

## The 48 were not what the number suggested

A 61-name check across the whole registry returned 10 hits and 51 absences,
and six of the ten were deliberate controls. Two of the remaining four are
false positives:

- **"Takemikazuchi" matched `japanese_kojiki_takemikazuchi_miwa`**, who is a
  human scion of the Miwa line, not the thunder kami of Kashima. The new
  record is given a distinguishing id and the census records the collision.
- **"Bishamonten" and "Emma" matched `buddhist_vaishravana` and
  `buddhist_yama`** — the Indian ends of two transmissions.

More to the point, the baseline of 48 was misleading. **Roughly twenty of the
48 are a single late-Heian Minamoto genealogy** — Yoshiie, Yoshitomo, Yoritomo,
Yoshitsune and their kin — and another seven are a Kojiki mythohistorical
sub-branch around the Miwa line. The kami pantheon proper was about twenty
records, and it was missing its structure rather than its ornament.

## What was missing was the structure

- **The Kotoamatsukami.** All five of the first kami, who come into being
  alone in Takamagahara without procreation — including Ame-no-Minakanushi,
  who is the first being in the Kojiki and therefore the first sentence of
  Japanese literature.
- **The rock cave.** The registry held Amaterasu, who hid, and Ame-no-Uzume,
  who danced. It did not hold Omoikane, whose plan it was; Ame-no-Tajikarao,
  who hauled the door open; Ishikoridome, who made the mirror; Tamanooya, who
  strung the jewels; or Ame-no-Koyane and Futodama, who did the divination and
  are the ancestral deities of the two clans that ran Japanese court ritual
  for a thousand years.
- **The Izumo serpent.** Susanoo was here. Yamata-no-Orochi, whom he killed,
  Kushinada-hime, whom he married, and her parents were not.
- **The kuni-yuzuri.** Ōkuninushi was here. The two envoys who came to take
  the land and the two sons who answered them were not — so the transaction on
  which the imperial house's legitimacy rests had exactly one party present.
- **The Hyūga cycle.** Ninigi and Konohanasakuya-hime were here; their sons,
  the sea-god's two daughters and Ugayafukiaezu were not, so the descent from
  Amaterasu to the first emperor broke off two generations short of arriving.
- **Jimmu, Yamato Takeru and Empress Jingū.**
- **Five of the Seven Lucky Gods.**
- **Tenjin** — Sugawara no Michizane, the most widely worshipped deified human
  in Japan, whose shrines every examination candidate in the country visits.

## One pre-existing record modified, and why

`japanese_konohanasakuya_hime` gains a reciprocal `sibling` edge to the new
Iwanaga-hime record. The two sisters are defined entirely against each other —
blossom and rock, beauty and permanence — and the Kojiki's point is that by
sending the rock back Ninigi traded his descendants' immortality for their
looks. A one-way symmetric edge would have left that pairing visible from one
side only. The change is 13 inserted lines in
`data-sources/transcripts/a577b80600b7956a8.txt` and nothing else in the corpus
is touched.

## What this batch deliberately does not do

**It does not ingest yōkai as classes.** Tengu, kappa, kitsune, oni and tanuki
are kinds of being. Three *named* yōkai are here — Shuten-dōji, Tamamo-no-Mae
and Yamata-no-Orochi — because they are individuals with names, acts and
opponents.

**It does not resolve the Buddhist/Japanese tradition-key split.**
Bishamonten is recorded here with a `counterpart-of` link to
`buddhist_vaishravana` rather than merged or omitted, because the member of
the Shichifukujin who hears demons coming and the Vedic lord of wealth are
different offices. **Kannon, Jizō, Amida, Fudō Myōō and Emma are BLOCKED on
the same question** — they are major Japanese cult figures and also Buddhist
ones, and which key they belong under is the owner's decision. That is now the
fifth lane in a row to raise a tradition-key question (Canaanite, Yoruba, Maya,
Chinese, Japanese), which is a pattern rather than a series of coincidences.

**It does not add Ōjin.** He is deified as Hachiman, whom the registry already
holds, and whose own record derives the name from the eight banners at Ōjin's
birth. Empress Jingū's `mother-of` edge points at the Hachiman record and the
census states the identification rather than creating a duplicate.

## Contradictions carried, not smoothed

- **The first kami.** Ame-no-Minakanushi in the Kojiki; Kuninotokotachi in the
  Nihon Shoki's main narrative, where Ame-no-Minakanushi appears only in
  passing in one variant. Both are records and neither is presented as the
  true opening. This mattered politically for a thousand years.
- **Who killed the food goddess.** Susanoo in the Kojiki, Tsukuyomi in the
  Nihon Shoki — and in the second version the murder is why the sun and moon
  are never in the sky together.
- **Who exposed Tamamo-no-Mae.** Abe no Seimei in some accounts, his successor
  Abe no Yasunari in others.
- **Jimmu's historicity.** The chronicles give 660 BC; historians hold there is
  no evidence he existed. Both statements are on the record.

## Thirteen BLOCKED

Three kinds, as always.

**Tradition-key decisions** (Kannon, Jizō, Amida, Fudō Myōō, Emma): not
evidence problems at all. Flagged upward.

**Named and not retrieved** (Hosuseri, Abe no Yasunari, Kuraokami,
Shinatsuhiko, Wakumusubi, Himetataraisuzu-hime, Amenohohi and Ame-no-Wakahiko).
Two of these are worth escalating: **Sukunabikona**, the dwarf kami who helps
Ōkuninushi build the land, is one of the best-known figures in the Izumo
material and the search that returned four of his neighbours returned nothing
for him; and **Emperor Sutoku**, the third of the three greatest yōkai, which
this batch consequently holds as two of three — the exact fault it has spent
five traditions objecting to. Both are strong ADDs for a second pass.

**Scope decisions** (Momotarō and Urashima Tarō as folk-tale heroes without
cult; the legendary and historical imperial lines as a unit; the Kintarō
identification, which is standard in Japan and was not returned by the sources
consulted and is therefore not asserted).

## Verification

- `scripts/validate-transcripts.cjs` → clean, 47 figures, no outstanding
  reciprocals after the Konohanasakuya-hime edit
- full regeneration, then `scripts/verify-regen.sh` → byte-exact
- record-level diff against the previous head: 47 added, 0 removed, **1
  pre-existing record mutated** — `japanese_konohanasakuya_hime`, gaining one
  relation, as described above
- zero dangling references, zero era inversions, zero unverified kinless
  figures; four new solitary verdicts, each citing why
- `npm test` → 302/302

## Status: PARTIAL

Forty-seven additions take Japanese from 48 records to 95, and the twenty-odd
Minamoto of the baseline are now a minority of the tradition rather than half
of it. What remains: Sukunabikona and Emperor Sutoku first; the Buddhist key
decision; the earlier kuni-yuzuri envoys; the kami born from Izanagi's
purification, which is a list of a dozen the Kojiki gives in one passage; the
legendary and historical imperial lines; the regional kami of Izumo and
Kumano; and the Ainu and Ryukyuan traditions the corpus holds at 12 and 10
records, which are separate peoples and separate lanes.
