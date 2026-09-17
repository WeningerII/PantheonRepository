# Lane 3 — Mesopotamian audit

Owner: `lane-3-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 5,839 total figures, 41 of them Mesopotamian.

Corpus: **5,839 → 5,885 figures**. Mesopotamian **41 → 87**.
Census: 97 rows — **46 ADD, 14 ALIAS, 23 EXISTING, 9 REJECT, 5 BLOCKED**.

## The gap, and why 41 records was worse than it looks

Of the 41 Mesopotamian records the registry held, roughly eighteen were
historical kings and priestesses — Sargon, Naram-Sin, Rimush, Manishtushu,
Shar-kali-sharri, Shulgi, Amar-Sin, Shu-Sin, Ibbi-Sin, Ur-Nammu, Enheduanna,
Enmahgalanna, Meli-Shipak II, Ashur-dan I, Ninurta-apal-Ekur,
Ninurta-tukulti-Ashur, Geme-Ninlilla, Ur-Nungal. The pantheon itself was
carrying about twenty-three records for one of the best-documented religious
systems in the ancient world.

A corpus-wide name check — canonical names and aliases, NFKD-normalised, across
the **whole** registry and not just the Mesopotamian slice — found these absent:

- **Ninurta**, the warrior son of Enlil and hero of Lugal-e, and **Ashur**,
  head of the Assyrian pantheon. The registry held two Assyrian kings named
  after Ninurta (Ninurta-apal-Ekur, Ninurta-tukulti-Ashur) and one named after
  Ashur (Ashur-dan I) — and neither god.
- **Nusku**, likewise: the king Mutakkil-Nusku was present, the god was not.
- **Ninlil, Damkina, Ningal** — the wives of Enlil, Enki and Nanna. The three
  most important consorts in the pantheon, all missing.
- **Anshar, Kishar, Lahamu** — primordial pairs of Enuma Elish. Lahmu was
  present without Lahamu, which is a pair cut in half.
- **Enkidu.** Half the Epic of Gilgamesh, in a registry that held Gilgamesh,
  Ninsun and Lugalbanda.
- **The whole monstrous register** — Anzu, Asag, Humbaba, Pazuzu, Lamashtu.
- **Gula, Nisaba, Nanshe, Ninkasi, Uttu, Nammu, Ninshubur, Namtar, Ishum,
  Ninazu, Ningishzida, Ishtaran, Ningirsu, Zababa, Enmesharra** — and, from the
  epic, **Siduri, Shamhat, Utnapishtim, Urshanabi** and the **Bull of Heaven**.

## Four identity decisions, stated rather than buried

**The flood hero is one figure, not three.** The reference literature states
plainly that the Sumerian Ziusudra becomes Atra-hasis in the Akkadian flood
epic and Uta-napishti in the Epic of Gilgamesh; Berossus' Xisouthros is the
Greek rendering of Ziusudra. Three records would have been precisely the
duplicate-transliteration error this programme forbids. **One record**, primary
name Utnapishtim, the other three as aliases, and the three-version history in
`variants[]`. The three names appear in the census dispositioned ALIAS.

**Ninurta and Ningirsu are two records, deliberately.** They are identified with
each other by the historical period and the census could defensibly have merged
them. They are kept apart because the Lagash cult has its own millennium of
history, its own temple (the Eninnu), its own wife (Bau) and its own war; the
`equated-with` relation carries the identification in both directions. The same
reasoning produced separate records for **Gula** (Ninurta's wife at Nippur) and
**Bau** (Ningirsu's wife at Lagash), with the note on each explaining that the
two marriages are local faces of one pairing.

**Erra was checked and NOT added.** The registry already carries him as an alias
on `mesopotamian_nergal`, with Erragal and Meslamtaea. Ishum, his herald in the
Epic of Erra, is added and points at the Nergal record. Census row: EXISTING.

**Nanaya is added although the registry already had her name.** `sogdian_nana`
carries "Nanaya" among its aliases and its own note says the Sogdian goddess
descends from the Sumero-Akkadian Nanaya — so the registry held the eastern
end of the line and not the original, which is backwards for a goddess
worshipped at Uruk, Larsa and Borsippa for two thousand years. The Mesopotamian
record is added and linked to the Sogdian one with `counterpart-of`, which is
the same treatment Ninurta and Ningirsu get: two cults, two records, the
relation stating the connection.

## The fourth block: closing the gaps the first three opened

Writing the first three blocks produced a specific, self-inflicted problem.
Ten new records ended up stating a kin fact in prose because the other party
had no record to link to: Nisaba's husband Ḫaya, Ningirsu's wife Bau, Pazuzu
and Humbaba's father Hanbi, Ninkasi's mother Ninti, Etana's son Balih,
Utnapishtim's ferryman Urshanabi, Shara's wife Ninura.

Block IV adds those, and the prose becomes edges:

| stated in prose after block III | now |
|---|---|
| "with Ḫaya as consort" | `nisaba` ⇄ `haya` spouse |
| "the Lagash cult has ... its own consort" | `ningirsu` ⇄ `bau` spouse |
| "Hanbi ... is not given a record here" | `pazuzu`/`humbaba` parentIds → `hanbi` |
| "Ninti is not, and is stated here instead" | `ninkasi` parentIds → `enki`, `ninti` |
| "Balih is not in this registry" | `etana` father-of `balih` |
| Ninlil's parentage unrecorded | `ninlil` parentIds → `haya`, `nisaba` |

Hanbi is the thinnest record in the batch and the audit says so on the record
itself: almost nothing is known about him except who his sons are. He earns his
place because the paternity is on the object — the Louvre's bronze Pazuzu
statuette MNB 467 is inscribed *"I am Pazuzu, son of Hanpa, king of the evil
spirits of the air"* — and because he is the joint that turns two sentences
into two links.

Three block-IV records are there on their own merits, not as connective
tissue: **Nanaya** of Uruk, **Shara** of Umma (the god on the other side of the
Lagash–Umma border war from the Ningirsu added in block I), and **Isimud**,
Enki's two-faced sukkal.

## What was rejected, and why

Nine REJECT rows, all of them the same kind of thing — a class rather than a
figure: **Anunnaki**, **Igigi**, **Apkallu**, **Lamassu/Shedu**, **Udug**,
**Gallu**, **Sebitti**. Also **Kur**, which slides between a common noun
(mountain, foreign land, underworld) and a being without ever settling; and
**Sharur**, Ninurta's talking mace, which is an object however articulate and
belongs to the items layer.

Individuals inside a rejected class are still admitted where they are named
and characterised: Hanbi is king of the udug, Adapa is one of the apkallu,
and both have records. It is the class that is refused, not its members.

## Five BLOCKED

| candidate | exact uncertainty | sources checked | evidence needed |
|---|---|---|---|
| Igalim | function beyond the Eninnu door-god epithet | Oracc AMGG s.v. Baba; reference treatments of Ningirsu and Gudea | a treatment of the divine personnel of the Gudea cylinders |
| Shulshaga | character and cult | Oracc AMGG s.v. Baba | a treatment of the second rank of the Lagash pantheon |
| Ḫegir | whether anything is attested beyond the filiation | Oracc AMGG s.v. Baba; reference treatment of Bau | a treatment of the Lagash divine family |
| Qudmu | whether anything beyond name and office is attested | reference treatment of Ishtaran | a treatment of the Der pantheon |
| Šarrat-Deri | whether a distinct goddess or a title of another | reference treatment of Ishtaran | a treatment of Der's local pantheon |

All five are real figures with real citations for their existence. What is
missing is enough to populate a record without inventing the contents, which
this programme forbids. They are recorded as blocked rather than quietly
dropped.

## One correction the test suite forced

The first full run came back with three Layer-3 era inversions — a parent
placed in a later era than its child:

    hanbi (neo-assyrian-neo-babylonian) → humbaba (mythic)
    haya  (ur-iii)                      → ninlil  (mythic)
    nisaba (early-dynastic-sumer)       → ninlil  (mythic)

All three were the same authoring mistake: `temporal.era` had been set from the
period of the figure's **documented cult** rather than from their **placement
in the mythology**. Hanbi is named on first-millennium amulets but he is the
father of a figure the epic tradition places in mythic time; Haya's cult is
concentrated in Ur III but he is Ninlil's father. The fix is not to break the
genealogy: all three now carry `temporal.era: "mythic"`, and Haya and Hanbi
each gained a second lifecycle phase — `ur-iii` and
`neo-assyrian-neo-babylonian` respectively — that carries the cult evidence
where it belongs. The corpus now reports zero era inversions.

## Solitary verdicts

Two of the 46 end with no parent and no relation, and both carry a cited
verdict in `data-sources/verified-solitary.json`:

- **Ishtaran** — his attested associates are his sukkal Qudmu and the goddess
  Šarrat-Deri, both BLOCKED above. The sources give the god of Der disputes to
  settle rather than a family.
- **Enmesharra** — known from the ancestor god-lists rather than from
  narrative. The lists enumerate generations; they do not tie him to anyone in
  this registry.

Four figures were provisionally on that list during authoring and came off it
when block IV supplied the other party: Nisaba (Haya), Etana (Balih), Gula
(Ninurta) and Ninkasi (Ninti).

## Sourcing

No direct outbound web access in this session; every fetch to
en.wikipedia.org, archive.org, perseus.tufts.edu and the rest is refused at the
proxy. Research therefore went through server-side web search, and the
citations name what was actually consulted. The principal reference is
Oracc's *Ancient Mesopotamian Gods and Goddesses* (AMGG), the University of
Pennsylvania's scholarly deity database, cited by name and entry where it was
the source (Gula/Ninkarrak, Baba, Haya, Nidaba, Ninlil). Primary texts —
Lugal-e, Enuma Elish, the Epic of Gilgamesh, the Descent of Inanna, the
Atra-hasis epic, the Anzu epic, the myth of Adapa, the Sumerian King List, the
Hymn to Ninkasi (ETCSL 4.23.1) — are cited as primary where the claim comes
from the text itself. **No printed monograph is cited as though it had been
read.**

## Verification performed

- `node scripts/validate-transcripts.cjs data-sources/transcripts/mesopotamian-expansion.txt` → clean, 46 figures
- full regeneration (4 generators + `build.py`), then `bash scripts/verify-regen.sh` → byte-exact
- `npm test` → full suite green
- record-level diff of `app/data.js` against `origin/main`: **46 added, 0 removed, 0 pre-existing records mutated**
- relation edges 9,605 → 9,665; kinless figures 1,450 → 1,452 (ceiling 1,600, unchanged)
- zero dangling references and **zero era inversions** in the corpus warn stream

## Status: PARTIAL

Not DONE, and the reason is concrete rather than procedural. The Mesopotamian
pantheon proper is now covered — the great gods, their consorts, the viziers,
the demons, the epic cycle. What remains is the long tail that a single pass
cannot exhaust honestly:

- the rest of the Lagash divine family (the five BLOCKED rows are its first layer)
- the minor city gods of the Ur III archives, of whom there are hundreds
- the Assyrian royal line beyond the four kings already carried
- the deified kings of Ur III, partially present
- the Kish, Uruk and Lagash king-list dynasties, of which only Etana, Balih and
  Ur-Nungal are here
- the Hurrian and Elamite gods absorbed into the Mesopotamian pantheon, which
  are arguably their own traditions and should be audited as such

No blocker prevents that work; it is simply more than one coherent PR.
