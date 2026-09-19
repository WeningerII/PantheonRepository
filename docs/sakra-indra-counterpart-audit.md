# Śakra / Indra counterpart research

This implementation records passage-bounded research and a reproducible inventory.
Historical completeness is not certified; evidence questions below remain explicit.

## Baseline and ownership

PRs 139–141 are the technical baseline, at main 44b249a. PR 145 supplies the
shared cited correction facility. This lane does not implement shared generator,
loader or UI behavior. It owns the Śakra/Indra endpoint records and their family
additions. Inventory closure also reaches Shiva-specific records; inclusion in
that inventory does not transfer ownership. The Shiva owner supplied the Daksha/Aditi and Brahma/Marici reciprocals in
commit a8994af. Those sources are incorporated here; PR147 supplies the separate
Rigvedic Daksha account.

## Authored results

The transcript supplies 48 records. These include Śacī and her three sons,
Ekāṣṭakā and the explicitly qualified Prajāpati of her hymn, Marīci, Buddhist
family and previous-life figures, three titled Korean officers, and the royal
parents in the Jade Emperor scripture. A title is not automatically a unique
person shared across texts. Prajāpati here is not resolved to Brahmā or Daksha.

Cited selectable accounts keep Indra's Aditi/Kaśyapa and Ekāṣṭakā parentages
separate. Other accounts cover Soma, Kaśyapa, Aditi, Sujā's asura birth, and the
Jade Emperor's princely manifestation. Magha's rebirth and Sujā's intervening
births do not create biological parent edges. No Hindu genealogy is transferred
to Buddhist or regional counterparts.

Sakka, Dìshì, Dìshìtiān and Taishakuten are same-record names; registered counterparts use
explicit validated IDs. Hwanin's identification is tied to the Samguk yusa gloss.
The Jade Emperor equation is disputed pending the precise Maspero passage.
Heissig's discussion of Qormusta is presented as competing historical
identifications, not a secure single transmission or universal divine identity.
Burmese “King of the Nats” resolves to `burmese_thagyamin`; its primary name is now Thagyamin, with the office retained as an alias.
The NIU Pagan-period study supports its Shwezigon shrine and wooden image.
Temple/Spiro ritual and family claims remain unverified. No duplicate is made.

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
branches, several Sakka
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

Merge acceptance requires final-head browser, corpus and regeneration gates,
with cross-lane endpoints incorporated. Scholarly uncertainty is preserved in
the data rather than represented as an established identity.

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

PR #147 was inspected and incorporated at main merge 4910adc. Its Daksha account represents Rigveda 10.72,
not the VP1.15 genealogy. The reviewed hymn’s Aditi endpoint is now a separate
selectable account in this lane. Both endpoints are integrated; no default biological cycle is created.

## Final research extension

Padma Purāṇa 1.6 supports Danu and Kaśyapa → Puloman → Śacī as separately
cited selectable accounts. Female Pulomā and unrelated Danu namesakes are not
merged. The Purāṇa Index supports Indra → Jayantī and Jayantī/Śukra → Devayānī;
Śacī is not silently assigned as Jayantī’s mother. Jayantī wife of Ṛṣabha is
a distinct namesake. The Sirī dictionary entry supports a separate daughter of
Dhataraṭṭha, without combining her with Sakka’s daughter.

Ding Fubao’s 帝釋 and 帝釋天 entries support Chinese names on the existing
Śakra record. NIU independently resolves the Burmese primary-name and shrine
evidence gap. Its nat images of Min Mahagiri and Shwemyethna are contextual
figures, not additional children of the Buddhist heaven-king.

Ownership: Jayantī and her maternal endpoint belong to this lane. Śukra’s
Shiva-specific portrayal remains untouched. Its Indra-family spouse endpoint
follows the explicit Indra-family assignment in Shiva OWNERSHIP.md; the
ambiguity was recorded before editing (PR147 comments 5745935299 and 5745970751).

The Maruts collective now has independent Rigvedic Rudra/Pṛśni and Purāṇic
Diti/Kaśyapa origin accounts. The collective is not merged with Vāyu’s alias.
Shiva OWNERSHIP.md explicitly assigns this overlap to the Indra lane. Śukra’s
Indra-family spouse endpoint is included under that same ownership boundary;
no Shiva-specific portrayal is edited. The Suyaśā and Rudra reciprocal endpoints
remain requested from their owner (PR147 comment5745970751).

The lane’s data-driven category guard checks every authored counterpart
revision against the shared Cross-tradition classifier. The real-browser gate
found that an ad hoc regional label was invisible in that filter; all four
Burmese endpoints now use the existing Buddhist-adaptation category without
changing their cited qualifications or weakening the browser assertion.
