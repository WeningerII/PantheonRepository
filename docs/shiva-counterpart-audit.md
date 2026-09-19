# Shiva counterpart network: source review and remaining evidence questions

This lane adds 73 records and authors 96 endpoints, with 20 selectable parentage
accounts, 36 explicit name decisions, eight relationship revisions, two default
parentage corrections, and five exact-precondition name corrections. These are
source-bounded repairs, **not a declaration of exhaustive historical coverage**.
The repeated incoming/outgoing inventory currently reaches 330 records. Every
record has all sixteen review categories; existing citations and populated fields
do not count as completed review. `awaiting-research` remains unfinished.

## Baseline and ownership

Read `CLAUDE.md`, the tradition and connected audits, lineage contract, generators,
relationship supplements, lazy tier loader, detail, graph and lineage code.
PRs 139, 140 and 141 supplied structural lineage and explicit navigation/accounts;
the baseline main was `44b249a039c6824feba0429eda5442c18008d522`.
Open PRs 142–144 were inspected before source edits and again during integration.

`data-sources/audits/shiva-counterparts/OWNERSHIP.md` records endpoint decisions.
The Śakra lane owns Mahandeo/Moni and the Indra family overlap. Only Shiva's
Mahandeo comparison endpoint is authored here. Its `interpretatio` kind remains
for compatibility with the existing reciprocal endpoint; the new cited note
explicitly withholds validation pending the scholarship. PR 142 assigns Daksha's
reciprocal Rigveda 10.72 account to this lane; Aditi is untouched here. The Maruts
remain a collective reference, not a guessed individual father or a Vayu alias.

Shared exact corrections were implemented and merged separately in PR 145.
PR 146 supplies generic graph classification requested by PR 142: qualified
identifications, adaptations and regional cult associations remain visible under
Cross-tradition while their precise evidence labels remain intact. No named
figure gets a program branch, privileged default or synthetic fixture.

## Resolved starting inventory

| Earlier display label | Actual record | Evidence decision |
| --- | --- | --- |
| Shiva | `hindu_shiva` | Separate textual and cult portrayals; no universal family |
| Oesho | `bactrian_oesho` | Disputed identification, not unqualified identity |
| Lord Teacher | `balinese_batara_guru` | Balinese Batara Guru; wayang names are not Balinese aliases |
| Supreme Elder God | `bodo_bathoubwrai` | Bathou/Bathau; Endle's localized assimilation is qualified |
| Lord of Crops and War | `kalash_mahandeo` | Mahandeo; source verification and reciprocal endpoint belong to Śakra |
| Ōkuninushi | `japanese_okuninushi` | Indirect association through registered Daikokuten |
| Sky Father | `kirati_paruhang` | Paruhang; pan-Kirati Śaiva identification unverified |

## Reviewed passages and implemented distinctions

The authored passage register has 47 exact references, with citations attached to
individual descriptions, names, relations, variants and accounts. The register
includes translations and museum/scholarly descriptions actually read; it does
not certify the bibliographies inherited elsewhere in the registry.

- **Oesho:** Malandra's Iranica *Vāyu* discussion relates the name to Iranian
  Vayu; Met object 2000.42.4 supplies Shiva-like Bactrian iconography. Neither
  licenses importing Shiva's parents or consort. Both prior equations retain
  their old evidence in revision history and become disputed identifications.
- **Rigvedic and Śaiva portrayals:** Rigveda 2.33 supplies the distinct hymn
  portrayal of Rudra; Shiva Purana 2.1.15 describes unborn manifestation through
  Brahma. Menā, Vīriṇī/Asiknī and the maternal prediction in 2.3.2 supply missing
  women and husbands without erasing other genealogies. The Goloka Radha record
  is distinct from Karna's foster-mother. Rigveda 10.72's reciprocal Aditi/Daksha
  cosmogony is selectable, not flattened into later descent.
- **Creation and social kinship:** Ganesha's fashioned-body narrative, Mangala's
  sweat origin and earthly nursing, Kartikeya's chain of carriers, Nandi's
  non-womb birth and divine social-son account, Virabhadra's hair manifestation,
  and the Mahakali portrayal are explicitly distinguished from sexual generation.
  Nandi's Shilada/Salankayana and Suyasa branches and Ganesha's Siddhi/Buddhi,
  Visvarupa, Kshema and Labha family are cited separately. Kartikeya's bachelor
  account does not negate regional marriage traditions.
- **Forms:** Ardhanarishvara, Nataraja and Mallikarjuna remain cited same-record
  forms. The narrated Bhairava of the Śatarudra account has its own explicit
  endpoint, with the different Vidyesvara outcome acknowledged. Cult image
  iconography does not create a new genealogy.
- **Bodo:** Endle pp.35–37 calls Mainao Bathou's wife, not daughter. The former
  default father is withdrawn with evidence preserved; an empty unknown default
  is not an assertion of being uncreated. Endle's appendix p.82 describes local
  Mech substitution of Shiva in worship, not a universal Bodo theological identity.
- **Japanese:** Kojiki XX and XXVI provide the full named ancestral and descendant
  chains, including other parents. Yashimajinumi and Yashimamuji remain distinct.
  A corrupt maternal reading is retained as a variant without an invented target.
  Oath-born goddesses are assigned kinship through ownership of the sword; magical
  creation by Amaterasu is a different relationship. The spouse narratives add
  Suseri, Yakami, Nunakawa and Ki-no-mata/Mi-wi. Nihongi I preserves a direct
  Susanoo/Kushinada account alongside longer descent variants, conflicting
  Ukanomitama and Sukunabikona parentage, tree-planting children, the Miwa cult
  spirit, and distinct Isuzuhime accounts. Unnamed intermediate generations are
  not filled with conjecture. The spirit manifestation is not a biological child.

## Evidence limitations

`scope.json` records individual names, record/category statuses, ambiguous names,
collectives, contextual discoveries, ownership and access attempts. The generated
`ledger.json` inventories all claims, aliases, external references and relationships
in the closure. `passages.json` distinguishes what was read from bibliography.

Concrete access failures remain: Harvard and Heidelberg Kalasha Religion PDF
routes (including an Anubis denial); Cambridge EBHR/Schlemmer routes; unavailable
Gaenszle/Chemjong passages; Bernet Kempers p.83 beyond a quoted encyclopedia
passage; Bugis/Batak/Malay primary family material; the British Museum Oesho/Ommo
coin page. Repeated alternative searches did not recover those passages. Iranica
*Nūrestān* was read for regional distinctions, not treated as proof of Mahandeo's
identity. No family or native script was invented to fill these gaps.

Other work remains expressly unfinished rather than mislabeled inaccessible:
further named Śaiva forms and regional spouses; broader local Guru traditions;
Japanese contextual entities and later cult histories; native-script validation;
and inherited powers, objects and rituals across the wider discovery frontier.
The implemented repairs are independently supported. They do not make the entire
network meet a historical-completeness claim.

## Reproduction and verification

Authored files are lane-specific under transcripts, relationships, enrichments,
corrections and audits. Rebuild using the four existing generators and `build.py`,
then run `node scripts/audit-counterparts.cjs` and
`node scripts/audit-shiva-counterparts.cjs`. The latter recomputes closure until
stable and never turns presence into research completion.

Lane tests verify every authored endpoint/citation, correction history, exact
parentage decisions, ownership boundaries and byte-exact ledger reconciliation.
The shared neutral tests cover atomic corrections, ambiguous same-name targets,
alias separation, conflicting accounts, citation retention and identifier renaming.
Existing full-suite, real-browser keyboard/account/navigation, demand-loading,
bounded rendering, MCP and regeneration gates remain unchanged. Chromium cannot
launch in this local sandbox (`socket(): Operation not permitted`); the required
CI browser probe is the verification authority. Final-head CI and deployment
status are reported in the PR after publication, not presumed here.
