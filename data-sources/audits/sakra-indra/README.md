# Śakra / Indra lane — work in progress

Baseline: `44b249a039c6824feba0429eda5442c18008d522` (PRs 139–141 merged).
Owner: Śakra/Indra counterpart-network instance. This document is not a completeness claim.

## Ownership

This lane owns Śakra, Sujā, Vemacitrin, Indra and his family, the connected
Burmese, Korean, Chinese, Kalash and Mongolic counterpart records. Shiva-specific
portrayals and their family remain with the Shiva lane. Shared ancestors such as
Daksha connect both lanes: this lane may reference their existing identifiers but
will not change their records without a recorded ownership decision. Names of
other traditions are not enough to assert an identity or transfer a genealogy.

## Shared correction requirement and resolution

The current relationship supplement only adds relations. It cannot withdraw or
qualify an existing `equated-with` assertion or correct existing unsourced
faculties, names, or objects. Review found `buddhist_sakra` cites SN 11.3 for
hurling a thunderbolt, but the reviewed passage concerns standards, fear and
recollection; it does not attest that weapon. The Jade Emperor equation also
needs an evidence-qualified claim rather than unconditional equivalence.
A generic, validated, cited correction/retraction facility is needed. Preserve
superseded evidence and distinguish disputed identifications from resolved
counterpart navigation. This lane will not duplicate shared implementation.
This original requirement was resolved by PR #145 and verified by final-pass correction tests.

## Evidence discipline

Every generated inventory category starts as awaiting-research. Only an explicit
review decision changes it. Read passages, not existing citation labels, establish
review. Rebirth is not parentage. No default parent is inferred from an identity.

## Implementation update

Shared PR #145 is incorporated from main merge 52d0810; PR #146 is incorporated from main merge 9b82608. The lane
now authors exact-precondition corrections in
`data-sources/corrections/sakra-indra-network.json`. The dependency is not merely
documented: final-pass values and retained prior evidence have dedicated tests.
Merge/deployment verification remains a separate gate. The complete current
review limitations are in `docs/sakra-indra-counterpart-audit.md`.

Ownership decision before reciprocal edits: the Hindu Āditya sibling assertions
are Indra-family claims and belong to this lane under the explicit Indra-family
assignment. The reciprocal endpoints are Vishnu, Aryaman, Tvashtr, Pushan, Surya,
Mitra, Varuna, Amsha and Bhaga. Only this cited sibling assertion is authored on
those records; this does not claim ownership of Shiva-specific portrayals.
Daksha and Brahma remain reference-only shared ancestors with open reciprocals.
