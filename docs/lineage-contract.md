# Structural lineage contract

Every record obeys the same rules. Names, popularity, tradition labels and
corpus identifiers must not select algorithms, depth limits or test behavior.
Fixtures use neutral identifiers; identifier renaming must preserve topology.

## Current graph and projection

Let V be the records indexed by identifier and E the directed parentage pairs
(p, c) explicitly recorded in c.parentIds, with both endpoints in V. Other
relationship types do not belong to E. In particular, an identification between
records does not copy either endpoint's parentage to the other.

For a focus f, show ancestors reachable within u steps, descendants within d
steps, and siblings sharing a recorded parent. A record appears once even if
it has several roles or paths. Placement uses shortest discovered distance;
ancestor placement takes precedence over descendant and sibling placement.
Rows are therefore a navigation projection, not an assertion of historical
chronology or a resolution of conflicting accounts. Connectors retain every
recorded parentage pair whose endpoints are represented, including pairs that
cross rows or connect records on the same row.

Depth controls follow reachable unvisited records, with no fixed generation
ceiling. Traversal terminates on cycles. The initial depth and row cap bound
the initial rendering; expansion is explicit. Reducing both depths to zero
must leave controls available to restore them.

A collapsed row maps each omitted record to its expansion chip. Edges to those
records terminate on the chip and are dashed. Coincident group connectors are
aggregated; they are not counts of individual claims. Expanding the row restores
the individual endpoints. An isolated focus remains visible. An empty projection
means no connected records are available, not that no historical parentage exists.

## Acceptance evidence

`test/lineage.test.cjs` uses synthetic records to check:

- ancestry and descent beyond four steps, including live control interaction;
- wide branches, shared ancestry, cycles, duplicate parent references;
- focus retention and recovery of every collapsed identifier;
- cross-context parentage without inherited equivalence genealogies;
- unresolved endpoints and isolated records;
- keyboard navigation and recovery after hiding all generations;
- topology and layout invariance under identifier renaming.

These checks certify projection behavior only. They do not certify corpus
completeness or historical claims.

## Remaining acceptance requirements for a complete shared template

The current parentIds representation flattens parentage into pairs. It does not
encode a source-specific assertion, alternative account, or an audited absence.
Do not call the entire template complete until the following are implemented
through the transcript/generator pipeline, lazy projections, and interface:

1. Individual relationship assertions retain source references, account context,
   relation type and uncertainty. Multiple assertions may support one pair.
2. Alternative accounts can be inspected separately without treating their union
   as a single consistent genealogy or using that union for descent arithmetic.
3. Identity, cult form, syncretic combination and comparison are distinguished
   without transferring parentage implicitly.
4. Unresolved targets, unaudited records and source-supported absence are distinct
   states, backed by explicit audit evidence rather than inferred from degree.
5. Source-to-record and source-to-edge coverage can be reconciled against a
   documented inclusion boundary. Record count and graph density are insufficient.

No figure-specific implementation or fixture is needed for any requirement.
