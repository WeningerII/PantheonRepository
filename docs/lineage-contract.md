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

## Explicit names and selectable accounts

Relationship supplements can author `nameLinks` with `value`, `tradition`,
`status`, `sources`, and a `personId` for resolved cross-record targets.
A disputed identification may also carry an explicit existing, nonself target;
it is navigable while retaining its visible disputed label. Navigation does not
certify theological identity. A disputed name without a target remains text.
`same-record` keeps ordinary aliases attached to the figure; `unresolved` remains
text. Both prohibit cross-record targets. The generator validates targets; the interface never guesses an
identity from a name. Native anchors in Names, relationships and graph neighbor
lists preserve keyboard and modified-click navigation.

`parentageAccounts` contains stable account IDs, labels, cited parent assertions,
and account citations. Each selected account replaces that subject's parents in
a temporary lineage projection and rebuilds reverse child edges. Accounts are
not unioned. An explicitly cited empty parents array can assert uncreated
parentage; ordinary missing data cannot. Account citations survive both the
full detail shard and lazy edge tier, so a visible ancestor can be selected
without downloading the full corpus. Controls follow rendered cards and selected
accounts, retaining bounded initial rendering.

Selections are local to the current focus. The shared account model drives the
displayed tree, parentage, classification, descent calculation and inherited-power
candidates together. Default `parentIds` and persisted baseline consumers remain
unchanged. An optional `lineageGroup` selects matching accounts on reachable
ancestors in one action; explicit per-person choices take precedence. Conflicting
groups remain unresolved until explicitly selected. `kind: claimed-genealogy`
marks a claimed pedigree rather than established biological history; individual
edges retain their own citations. Other ancestors retain recorded parentage.

Missing co-parents, cycles, unresolved endpoints and uncertain status at conception
prevent an exact fraction. Known divine ancestry remains visible even when its
degree cannot be quantified. Mortal classification does not erase a selected
ancestral path. Apotheosis is not silently projected back to conception, and
within-person lifecycle ordering is not a shared chronology between people.
Inherited powers are model candidates, never evidence of an attested power.
The static mirror exposes grouped pedigrees, account-specific descent summaries
and reciprocal links to children in alternative accounts. A displayed account is
not a universal reconciliation of all traditions or other biographical claims.

Initial tree depth and row limits remain bounded. “Show all ancestors” is an
explicit, cycle-safe action that reveals the entire reachable ancestry without
requiring repeated single-generation clicks. Account calculation metadata loads
with the lazy edges tier; it does not add a full-corpus fetch to initial browsing.

## Remaining completeness requirements

Selectable accounts are supported but not exhaustively authored for the corpus.
The connected audit ledger explicitly distinguishes structural presence from
source review. Individual claims, uncertain identity, source-supported absence,
and tradition boundaries still require research. No figure-specific branch or
fixture is needed for that work. See `docs/connected-counterpart-audit.md` for
coverage and unfinished evidence questions.
