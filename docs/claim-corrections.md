# Cited corrections for all research lanes

Author `data-sources/corrections/<lane>.json` as an object mapping explicit figure
IDs to ordered correction arrays. Run `node scripts/gen-enrich.cjs` and the usual
remaining generators/build. Corrections apply **after every legacy, enrichment,
item, faculty derivation and scope pass**. No later corpus pass restores a removed
claim. This facility is shared and has no figure-specific behavior.

```json
{
  "N0": [{
    "id": "source-review-01",
    "path": ["faculties", 0],
    "op": "remove",
    "expected": {"id": "F0", "name": "Earlier claim"},
    "reason": "The reviewed passage does not support this claim.",
    "sources": [{"kind": "primary", "reference": "Text A, section 2", "url": "https://example.org/a"}]
  }]
}
```

This is a schema example, not a corpus fixture. Copy `expected` from the complete
**pre-correction final corpus value**, preserving JSON property order. It must
match exactly. `op: replace` additionally requires `value`. A path is a top-level
field or a sequence of object keys / integer array indexes; removal splices an
array entry. Subsequent operations see earlier operations, so remove array
indexes in descending order or replace the entire array. Replacing a whole array
also supports inserting new claims. No fuzzy selection or missing-path creation.

Allowed fields: name, names, notes, parentIds, parentRoles, relations, faculties,
materialCulture, iconography, cult, linguistic, lifecycle, domains, epithets,
nameLinks, parentageAccounts. Identity, tradition and schema metadata cannot be
rewritten through this interface. All operations need a reason and citations;
stale expected values, repeated IDs, unsafe paths and missing graph targets fail
the whole batch before the original corpus changes. Reapplication is idempotent;
reusing a correction ID with different data fails.

The previous value and entire cited decision survive in `record.corrections`.
The reason/citations also become a visible Variant account. Old evidence is
retained as historical evidence, not asserted as a current claim. Changes to
parentIds must also correct corresponding parentRoles/relations where needed.
An empty corrected parentIds means unknown/unasserted parentage. Only a separately
cited parentageAccount may assert an explicitly uncreated origin.

Relationship supplements additionally accept `relationRevisions` (exact
personId/fromKind, replacement kind, notes, sources) and `parentageCorrections`
(id, expected parent IDs, replacement parent claims, reason, sources). These
preserve previous assertions and provide convenient structured operations.
They apply at the relationship supplement stage; use the final correction
facility for fields populated by later passes.

No lane owns another lane's claims. Cross-lane authors reference the existing
endpoint and record the reciprocal work for its owner. The generic interface is
implemented here; each lane must still author, integrate and verify its data.
