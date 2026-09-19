# Mesoamerican counterpart source review

PR #143 is a source-specific repair and expansion, **not a certification of
historical completeness**. The machine ledger keeps unfinished categories and
unresolved discoveries visible. An existing citation is not a completed review.

## Scope and evidence

The repeated bidirectional counterpart/kinship inventory contains 60 records,
including 24 additions. Its 16 categories cover names, scripts, local tradition,
description, parents, partners, siblings, descendants, lifecycle, domains,
powers, objects, epithets, iconography, cult and sources. Every inventoried name
and outgoing relationship is retained. `scope.json` contains authored review
judgments; `ledger.json` combines them with generated records. Reproduce with
`node scripts/audit-mesoamerican-counterparts.cjs` after corpus generation.

Reviewed passages include Pinturas chapters 1, 2, 6–8; Anales excerpts 43–49 and
62–68; Landa VI and XL (Xul); Popol Vuh opening, p.215, pp.240–243, and the
Cumarcah dynastic narrative with notes 733/775; Annals of the Cakchiquels 38,
43, 46–60; García V.iv as excerpted in Phillips note17; Nicholson’s 1979 essay (2020 reprint), pp.213–220; and Pohl/Powell’s
manuscript discussions. `sources.json` records edition, passage and URL.
Precolonial pictorial evidence, colonial narratives, old translations and modern
scholarly commentary are not interchangeable witnesses.

## Implemented decisions

- Separate creator Qucumatz from ruler Cucumatz, and Gagavitz’s transformation
  from either identity. Add the ruler’s supported daughter, son-in-law and
  source-specific father/son accounts without turning succession into paternity.
- Keep Topiltzin separate from the deity. Add Quetzalpetlatl and the unnamed
  Pinturas mother; offer conflicting cited parentage accounts. Distinguish
  self-immolation from death by illness. Remove transferred Mictlan/wind deeds
  and correct the mask to the turquoise specified in the reviewed Anales text.
- Add Pinturas’ unnamed solar son without inventing a Nanahuatzin identity.
- Retain the Popol Vuh’s explicit Tohil–Yolcuat Quitzalcuat identification with
  its textual scope; add Rabinal One Toh. Identification transfers no genealogy.
- Cross-link duplicate Yucatec portrayals, qualify the Topiltzin equation,
  record Landa’s Maní Xul festival and reported apotheosis, and remove a
  Landa-attributed equinox power unsupported by those passages.
- Separate 9 Wind’s flint birth from the later tree-born ancestors. Remove
  unsupported parent projection and unverified spellings while preserving
  their evidence in correction history. García’s Deer couple has separate
  records: the translation does not supply the calendar number 1.
- Add Kaqchikel family records with political sonship distinguished from
  biological descent. Collective marriage/offspring wording is not turned into
  individual spouse or mother assignments.

## Open evidence questions

The ledger documents the exact attempted sources and effects of access failures.
Dumbarton Oaks returned 403; its download route and the Cervantes Virtual
Michoacán route were inaccessible. Targeted discovery searches repeatedly
returned unrelated pages. Powell remained readable through the web text despite
a direct-download 465. FAMSI access was intermittent. Pohl, Landa, Christenson,
Jordan and Gutenberg provided useful independent alternatives.

An exact-title search later recovered Nicholson’s discussion of codex annotations,
partially resolving scholarly access. It preserves both distinction and fusion in
colonial witnesses and qualifies early imagery. Direct codex commentaries, modern linguistic verification, the stronger
Mixtec/Yucatec historical equations, and the outer Nahua/Purépecha family and
cult claims remain unfinished. Chimalcan, named Mixtec ritual participants,
and ambiguous Kaqchikel collective parentage remain explicitly inventoried.
No unreviewed legacy category is marked adequate, and no claim of exhaustive
research or a completed outer network is made.

## Integration and verification

Shared correction PR #145 is merged and incorporated. All source changes are
lane-owned; no Shiva, Tangaroa or Śakra record is edited. Generated corpus and
standalone artifacts must be regenerated from combined main before merge.

Data-driven tests check authored targets, same-record aliases, separate cited
accounts, revised relationships, retained correction evidence, final-pass
behavior and exact ledger reproduction. Shared neutral fixtures cover account
projection, identifier renaming and atomic validation. Existing CI additionally
checks actual keyboard navigation/account selection, bounded rendering, lazy
loading, MCP smoke and byte-exact regeneration. Local Chromium launch fails
with `socket() ... Operation not permitted`; CI browser success is required.
