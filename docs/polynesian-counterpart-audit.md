# Polynesian counterpart network

Research remains in progress. The lane starts at Māori Tangaroa and follows
incoming and outgoing counterpart and family relationships, including the
Rarotongan and Manihiki contexts and the newly identified Tokelauan comparison.
The machine-readable inventory is `data-sources/audits/polynesian-counterparts/ledger.json`.
Its category statuses are passage-bounded reviews, not an assertion of exhaustive
historical coverage. Discovered but unfinished branches remain explicit.

## Shared integration

PR #145 supplies the generic cited correction contract. This lane incorporates
it and uses exact-value preconditions to correct the Mangaian divine-birth sides,
Tangaroa/Rongo precedence, the Tonga-iti/Motoro conflation, distinct Ina accounts,
and source-specific Tongan royal lifecycle claims. Superseded values remain
visible in correction history and cited variants. Source-summary corrections
in owned transcripts additionally preserve the superseded text in the lane audit.
No shared generator, loader, schema, or UI behavior is implemented in this lane.
The Manihiki era vocabulary is authored data; narrative dates remain undated.

## Authored work and evidence

The lane transcript adds independently cited family records; relationship
supplements use explicit IDs and separately selectable parentage accounts.
Punga’s sea-progeny account and the conflicting Tongan Maatu, Takataka, Lomu and
Collocott-as-reported-by-Gifford accounts do not replace default genealogies.
Different island portrayals, the named Tongan Tangaloa, the unnamed-membership
Tangaloa group, and the two explicitly distinguished Te-manava-roa figures stay
separate. Hawaiian Maui narratives no longer need to be attached to a Māori ID.

Reviewed sources include Gill (1876), Turner (1884), Tregear (1891),
Liliuokalani (1897), Dixon (1916), Fornander (1916), Gifford (1924),
Beckwith (1940), and the cited Te Ara articles. Exact passages accompany claims
and the ledger records the scope of review. A citation’s presence alone never
closes a category.

Seventy-two legacy comparison edges were changed from `equated-with` to
`counterpart-of`; this removes blanket identity but does not certify their
original vague references. Those legacy assertions and the additional broad
identifications discovered during closure still need full passage-level review.
Ordinary aliases remain on their figure; explicit name links connect records.

## Remaining work and access

Accessible research remains, including the named Hawaiian genealogical sequences,
additional Samoan and Tongan contexts, Mangaian eclipse figures, and primary checks
for Tahitian, Marquesan, Rapa Nui and Rarotongan claims. These are unfinished work.
Gill, Tregear and Gifford were recovered through public Internet Archive texts;
none is an access blocker. Initial JPS/ANU access failures do not block claims
which Gifford directly supports. Gifford identifies the relevant Collocott paper
as *A Tongan theogony*, Folk-Lore 30 (1919), pp. 234–238; the earlier 1921
JPS attribution in this lane’s working notes was incorrect.

Local browser launch currently fails at Chromium socket creation in this
execution environment. CI browser gates remain required and unchanged.
No claim of completed research, final verification, merge, or deployment is made.

## Current research extension

The lane now authors 327 new source-specific records. The repeated inventory
also includes explicitly seeded Kumulipo spouse-pair branches: the source gives
those spouses, but a sequence of rows alone does not prove immediate parentage.
Fornander's separate child-column tables supply further evidence and are
preserved verbatim in `source-tables.json` for continued row-by-row review.
Repeated names and variant spellings must receive explicit identity decisions.
The island genealogies now retain alternative parentage for the personified
islands, and Molokini's afterbirth origin is not converted into invented parents.

`nameReviews` records exact authored name decisions separately from navigation
identity status. The lane-only ledger overlay validates that each reviewed form
exists; it does not infer identity from spelling. A neutral synthetic test checks
citation preservation, target-status preservation and identifier-renaming behavior.

Shared PR #147 is incorporated from main 4910adc, including its additional actual-browser
relationship-list and graph-neighbor checks and visibly qualified disputed name
links. Its implementation was inspected; this lane does not duplicate that work.
The published head 36edafb passed full CI, including Chromium names/account checks,
cold-load stability, MCP smoke and exact regeneration. Subsequent research changes
require fresh verification; that passing checkpoint is not a final-head result.
