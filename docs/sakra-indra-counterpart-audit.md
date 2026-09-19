# Śakra / Indra counterpart research

Research acceptance remains open. This is a source-bounded implementation and a
reproducible inventory, not a declaration of historical completeness.

## Baseline and ownership

PRs 139–141 are the technical baseline, at main 44b249a. PR 145 supplies the
shared cited correction facility. This lane does not implement shared generator,
loader or UI behavior. It owns the Śakra/Indra endpoint records and their family
additions. Inventory closure also reaches Shiva-specific records; inclusion in
that inventory does not transfer ownership. Daksha is reference-only here; the
reciprocal Aditi account remains for the Shiva owner. No cross-lane reciprocal
work is counted as implemented.

## Authored results

The transcript supplies 42 records. These include Śacī and her three sons,
Ekāṣṭakā and the explicitly qualified Prajāpati of her hymn, Marīci, Buddhist
family and previous-life figures, three titled Korean officers, and the royal
parents in the Jade Emperor scripture. A title is not automatically a unique
person shared across texts. Prajāpati here is not resolved to Brahmā or Daksha.

Cited selectable accounts keep Indra's Aditi/Kaśyapa and Ekāṣṭakā parentages
separate. Other accounts cover Soma, Kaśyapa, Aditi, Sujā's asura birth, and the
Jade Emperor's princely manifestation. Magha's rebirth and Sujā's intervening
births do not create biological parent edges. No Hindu genealogy is transferred
to Buddhist or regional counterparts.

Sakka, Dìshì and Taishakuten are same-record names; registered counterparts use
explicit validated IDs. Hwanin's identification is tied to the Samguk yusa gloss.
The Jade Emperor equation is disputed pending the precise Maspero passage.
Heissig's discussion of Qormusta is presented as competing historical
identifications, not a secure single transmission or universal divine identity.
Burmese “King of the Nats” resolves to `burmese_thagyamin`; its native-name and
cult claims remain pending a reviewed Temple/Spiro passage. No duplicate is made.

The final-pass corrections preserve old evidence. They correct the thunderbolt's
misattribution to SN 11.3, remove an unsupported Vajrapāṇi identity implication,
qualify counterpart equations, remove invented specifications of the Korean
three seals, and distinguish the bear's 21-day transformation from the prescribed
100-day abstinence and Tangun's 1,500-year reign from his 1,908-year age.

## Evidence and unresolved work

`data-sources/audits/sakra-indra/passages.json` records the passages actually read.
`scope.json` records review decisions, source failures and discovered identities.
`ledger.json` is regenerated from the complete corpus and follows incoming and
outgoing counterpart and family links. Every record carries all 16 review
categories, all names, outgoing relationships and existing source claims.
Presence does not mean reviewed. Added/corrected claims do not complete a category.
Unreviewed categories remain awaiting-research; not-applicable and not-attested
are not used as substitutes for missing work.

Source-access blockers: Witzel's Kalash PDF (HTTP and HTTPS, plus the Heidelberg
repository route), attempted Temple Archive scans/full text, and the exact
Maspero identification passage. Searches repeatedly returned unrelated results;
this is not evidence of absent traditions. Direct primary-text alternatives
worked for the Korean and Chinese narratives. Heissig's Archive full text worked,
but does not validate every Buryat/Kalmyk assertion in the legacy records.

Other research is unfinished rather than access-blocked: epic collateral family
branches, Saci's Puloman parentage, several Sakka
cross-references, the Mongol Geser versus
White Brahma conflation, Roy mo's correct narrative endpoint, Chinese household
relationships, and modern Hwanin aliases. Arjuna's Indra/Kunti parentage was
checked against the Ganguli Adi Parva CXXIII birth passage and is already adequate;
Pandu's social fatherhood is not a competing biological default. The many figures
listed merely as witnesses in that birth passage are not inferred relatives.

## Reproduction and integration

Run the four existing generators, `python3 build.py`, then
`node scripts/audit-sakra-indra.cjs` and `node scripts/audit-counterparts.cjs`.
Run `npm test`, the real-browser `scripts/verify-coldload.cjs`, MCP smoke and
`bash scripts/verify-regen.sh`. Lane tests verify exact account preservation,
relationship citations, non-parent rebirth edges, correction history and ledger
reproducibility. Shared neutral tests cover ID renaming, independent accounts and
correction rejection. Local Chromium installation succeeded, but launch fails on
denied socket creation. CI must supply the real-browser result.

Keep PR 142 draft while evidence and cross-lane integration remain unfinished.
No deployment or completion claim follows from a passing structural test.

The lane also carries `follow-up-evidence.json`: the successful Rohinī dictionary
entry and Wilkins's Rāji narrative are implemented follow-up discoveries: Rohinī links to the registered Anuruddha,
and Rāji receives an acknowledged-father relation without biological defaults.
The permanent lane browser gate exercises authored relationship-list links and
a data-selected graph-neighbor link for each endpoint, using keyboard activation.

## Shared navigation integration

PR #146 (main merge 9b82608) supplies the generic Cross-tradition classification
for qualified adaptations and identifications. This lane incorporates that
change without duplicating the shared implementation. The lane browser gate
also exercises every corrected counterpart endpoint in Cross-tradition mode;
within-tradition family neighbors use the All filter.

The primary Jātaka 535 opening resolves its previously pending human ancestral
chain. Five human forebears and two deva endpoints keep fatherhood distinct from
rebirth; the final human father is selectable for Kosiya. The unnamed human wife
and children are not identified with the later heavenly marriage to Hirī.

PR #147 was inspected at 9fb5166. Its Daksha account represents Rigveda 10.72,
not the VP1.15 genealogy. The reviewed hymn’s Aditi endpoint is now a separate
selectable account in this lane. The shared endpoint remains an integration
dependency until #147 is incorporated; no default biological cycle is created.
