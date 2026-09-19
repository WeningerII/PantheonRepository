# Polynesian counterpart network

Work in progress against main 44b249a039c6824feba0429eda5442c18008d522.
Research is not complete. The original nine-record network expands to more than
130 records when incoming and outgoing family links are followed. Existing
citation presence is not treated as historical verification.

## Shared integration requirements

The Shiva owner controls generic correction support. The Polynesian lane needs
cited, exact-precondition corrections preserving superseded evidence for legacy
claims that additive supplements cannot replace. Concrete cases:

- `mangaian_tangaroa`: legacy lifecycle and source summary say Vatea favoured
  Rongo; Gill 1876 pp. 10–11 says Vatea favoured Tangaroa and Papa obtained
  precedence for Rongo. The new description is corrected; legacy fields still
  require correction.
- `mangaian_vari_ma_te_takere`: existing lifecycle puts Tango on the right and
  Tu-metua on the left; Gill pp. 5–6 puts Tango on the left, Tu-metua on the right.
- `mangaian_tonga_iti`: alias Motoro conflates the lizard god with the separately
  deified son of Tangiia (Gill pp. 19–20). An identity split must preserve cited
  claims with their respective figures.
- `mangaian_ina`: the current combined lunar/eel portrayal needs claim-level
  separation. Gill pp. 45, 77, 95 distinguishes several daughters of Kui and
  explicitly distinguishes Ngaetua’s voyager daughter, now independently added.

These requirements remain OPEN until incorporated and verified; this document
is coordination, not implementation. No shared model/UI code is changed here.
The new Manihiki entry in the hand-maintained era vocabulary is lane-owned data,
not a generator or UI special case. Mythic dates remain null; 1876 dates only
the reviewed publication.

## Authored work

`data-sources/transcripts/polynesian-counterparts.txt` adds independently cited
family records. `relationships/polynesian-counterparts.json` carries resolved
name links and separately selectable parentage. Punga’s existing default
parents remain; his Tangaroa account is selectable. Mangaian Maui’s full
Ru/Buataranga account likewise preserves the existing arithmetic baseline.
Names do not transfer ancestry. The Manihiki narrative is kept separate.

Seventy-two original Tangaroa-network comparison edges are reclassified from
`equated-with` to `counterpart-of`, preserving their old references while
removing the blanket assertion of identity. Their original vague comparative
citations still need passage-level review; reclassification is not certification.

## Access limitations

The Auckland JPS archive failed for Collocott 1921 (both URL forms tried).
The Polynesian Society website reports archive access restrictions. An alternate
ANU thesis download also returned HTTP 403. Tongan parentage, the distinct
Tangaloa figures and Rarotongan genealogies still need their supporting texts.
NZETC retrievals of Gill and Tregear failed. Gill was successfully recovered
through Internet Archive and read; Gill is NOT an access blocker.

There is also independently accessible research still to finish. No claim of
exhaustive completion, final verification, merger or deployment is made here.
