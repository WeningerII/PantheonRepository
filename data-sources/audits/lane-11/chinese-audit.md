# Lane 11 — Chinese audit

Owner: `lane-11-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 6,127 total figures, 48 of them Chinese.

Corpus: **6,127 → 6,177 figures**. Chinese **48 → 98**.
Census: 121 rows — **50 ADD, 10 ALIAS, 30 EXISTING, 5 CROSS-TRADITION SAME
FIGURE, 11 REJECT, 15 BLOCKED**.

## Seventy absences out of seventy-two

A 72-name check across the whole registry returned **two hits, and both are
false**. "Yanluo Wang" matched `buddhist_yama` and `hindu_yama` — related
figures at the other end of a transmission, not the Chinese magistrate.
"Tudigong" matched `baule_asie`, an unrelated West African earth deity, on a
normalised alias.

That is the worst hit rate this programme has recorded, in the religious
corpus with more adherents and more surviving text than any other in the
registry. What was missing was not a periphery:

- **The Three Pure Ones.** Yuanshi Tianzun, Lingbao Tianzun and Daode Tianzun
  are the highest deities in Daoism and all three were absent, in a corpus
  that held the Jade Emperor — who is below them.
- **Six of the Eight Immortals.** The registry held Lü Dongbin and He Xiangu.
  The Eight are a set: they are painted, carved and invoked together, and
  "the Eight Immortals cross the sea" is one of the best-known scenes in
  Chinese art. Holding two of them is holding a fragment of one object.
- **The entire underworld.** No Yanluo Wang. No Meng Po, whose soup of
  forgetting every Chinese soul drinks before rebirth. No Zhong Kui, whose
  image is on more doors than most gods'. No Ox-Head and Horse-Face, no Black
  and White Impermanence.
- **The casts of the two novels the popular pantheon comes from.** The
  registry held Sun Wukong and nobody he travelled with — the Monkey King
  without the pilgrimage. It held Li Jing, Nezha, Jinzha and Muzha from the
  *Fengshen Yanyi* and not Jiang Ziya, who is its protagonist and the man
  holding the roster by which every god in the book is appointed.
- **Chiyou, Xingtian, Kuafu, Jingwei** — the four most-quoted figures in early
  Chinese myth after the sovereigns, in a corpus that held the sovereigns.
- **The Four Perils.**
- **Guan Yu and Mazu**, who between them have more temples than any other two
  figures in the Chinese world.

## Patterns this batch repeats from earlier lanes

**The famous name without the thing it is defined against.** The registry held
Huangdi and not Chiyou, whom he fought for ten years; Houyi, who shot nine
suns, and not Xihe, whose children they were; Shennong and not Jingwei, his
daughter; Guanyin and not Red Boy, whom she took; Chang'e and not Zhu Bajie,
who was banished for propositioning her. This is now the fifth tradition where
that shape has turned up.

**The group held as a fraction.** Two of eight Immortals, three of the five
Four-Clans culture heroes, one of four Dragon Kings, one of ten Kings of Hell.

## Two scoping decisions

**Offices are not figures.** Chenghuang the City God and Tudigong the Earth God
are divine offices held by a different deified local person in every town and
every field; the reference treatments define them that way. They are REJECT
rows on the same rule that turned away the Ajogun, the Bacabs-as-a-class and
the Are Ona Kakanfo. If the owner wants office-deities as records, these two
are the first ADDs and the census says so.

**The imperial line is deferred as a unit.** Two thousand years of emperors,
absent entirely. Sampling three of several hundred would be the arbitrary
partial this census exists to prevent, and the corpus's treatment of Egyptian,
Mexica and Maya royal lines argues for taking a dynasty at a time. What is
here from the historical record is the *deified*: Zhang Daoling, Guan Yu,
Mazu.

## Where the batch says what it is reading

Fifteen of the fifty come from two sixteenth-century novels, and every one of
those records says so on its face. The *Fengshen Yanyi* tells the Shang-Zhou
transition as a war whose casualties are enfeoffed as gods off a roster; the
*Xiyouji* tells a seventh-century pilgrimage as a comic epic. Both are
unambiguous evidence for what Ming and later Chinese people believed about
where their gods came from, and neither is presented here as ancient myth.

The `Fengshen Yanyi` records carry one further disclosure: King Zhou, King
Wen, King Wu and Bo Yikao are historical or quasi-historical figures of the
eleventh century BC as well as characters in a novel of the sixteenth century
AD, and the records give both, with the novel's additions marked as the
novel's.

## Letter-labels, aliases and one identification not made

**Laozi is an alias on Daode Tianzun, not a record.** That is the tradition's
own arrangement: in Daoist terms the man who wrote the *Daodejing* is a descent
of the deity, and treating the deity as the deification of a philosopher
inverts the sources. The historicity of Laozi as a person is separately
disputed and this batch takes no position on it.

**Yanluo Wang is linked to `buddhist_yama` with `counterpart-of`, not merged.**
The name is the Chinese form of Yama and the institution came with Buddhism,
but a magistrate who is fifth of ten courts and reports upward to a mountain's
ministry is a different office in a different system.

**No relation is written between Xihe and Houyi**, though he shot nine of her
ten children, because the tradition does not state one and inventing an enmity
would be worse than recording the absence. The record says what is certain.

## Fifteen BLOCKED

Three kinds, as in every lane.

**Named and not retrieved** (Taiyi Jiuku Tianzun, Houtu, Yuelao, Changxi,
Longmu, Huang Feihu, Yin Jiao, Yang Ren, Leizhenzi, Yunzhongzi): searched and
returned nothing beyond a name. Each row says what was searched.

**Reciprocals this batch's own records cannot carry** (Di Jun, who is Xihe's
husband; Liu Bei and Zhang Fei, who are Guan Yu's sworn brothers; the other
three Dragon Kings; the other eight Kings of Hell). Recording eight kings as
eight names with an ordinal each would be filling a table rather than
ingesting figures.

**Not searched, and named as such** (Confucius; Zhuge Liang, Yue Fei, Baosheng
Dadi; the imperial line). **Confucius is the notable one**: he has had state
temples across China for two thousand years and is a cult figure on this
registry's own terms rather than a philosopher to be excluded. He is not here
because he was not researched in this session, and writing him from recall is
what this programme does not do. He is a strong ADD for the next pass.

## Verification

- `scripts/validate-transcripts.cjs` → clean, 50 figures
- full regeneration, then `scripts/verify-regen.sh` → byte-exact
- record-level diff against the previous head: 50 added, 0 removed, 0
  pre-existing records mutated
- zero dangling references, zero era inversions, zero unverified kinless
  figures; ten new solitary verdicts, each citing why
- `npm test` → 302/302

## Status: PARTIAL

Fifty additions take Chinese from 48 records to 98, against a corpus that
counts its gods in the thousands. What remains: Confucius and the other
deified historical figures; the imperial line, dynasty by dynasty; the rest of
the Ten Kings and the Dragon Kings; the *Fengshen Yanyi*'s middle cast; the
Daoist celestial bureaucracy below the Three Pure Ones; the regional deities
of Fujian, Guangdong and Taiwan; and the Buddhist-Daoist figures the corpus
currently splits between its `Chinese` and `Buddhist` keys, which is the
tradition-key question this programme has now raised in four lanes running.
