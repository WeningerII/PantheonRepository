# Ptolemaic branch presentation audit

Reviewed against `aeb903c` for the Thais and Artakama expansion. This audit
covers shared behavior; it does not certify the historical research or the
subsequent integrated deployment.

## Model and interactive behavior retained

- Only recorded `parentIds` feed the default lineage and reverse children.
  Unions, claimed ancestry, royal patronage and cross-tradition associations
  remain typed relationships. They do not import another figure's parents.
- `projectLineageAccounts` replaces the selected subject's parents in a local
  projection and rebuilds its reverse children. Accounts are never unioned;
  choices reset with the focus. The default record is not mutated.
- The account selector continues to warn that selected accounts change the
  displayed tree while descent calculations use the recorded default.
  Derived divinity and inherited powers remain precomputed default values.
- The lazy edge tier retains complete account objects, including citations;
  full detail shards retain relationship notes and sources. This change does
  not alter tier generation, fetching, browse row limits or initial tree caps.
- Detail relationships retain notes and native target anchors. Explicit source
  URLs survive the interactive Sources section. Unresolved external names
  remain text; relationship navigation does not certify identity.

Two existing interactive limits remain: the selected account shows its
description and account-level citations, but not each alternative parent's
individual notes/citations; the epithet row prefers the translation over the
original instead of displaying both. Material uncertainty for this batch must
therefore also be stated in account descriptions/labels and relationship notes.
This batch does not claim to replace legacy descent arithmetic or redesign
the interactive account/epithet interface.

## Static gaps repaired

`scripts/build-static.cjs` previously omitted every parentage account,
variant account and explicit name target. It rendered relationship kind and
target without their notes or evidence, discarded unresolved external names,
and emitted only an epithet's `original`. It also discarded explicit citation
URLs in favor of reference-based lookup. These gaps removed material
qualifications from the no-JavaScript mirror.

The generic renderer now preserves:

- Default parent roles, notes and attached citations.
- Separate parentage account labels, descriptions, linked parents, per-parent
  notes/citations, account citations and a warning about default calculations.
- Explicitly empty accounts without interpreting ordinary missing parentage
  as self-creation. Uncreated claims are stated by the authored account text.
- Relationship uncertainty, external-reference names, variant descriptions
  and claim-level citations.
- Explicit name links with their tradition, disputed/unresolved/same-record
  status and sources. Text without a target is never guessed into a link.
- Epithet `original` and `translation`, metadata, notes and citations.
- Explicit HTTP(S) citation URLs with escaped text/attributes. The summary
  catalog also retains these URLs and labels its parent/child arrays as the
  recorded default; full account claims remain on the linked detail pages.

Children continue to derive only from default parents. Alternative parents,
partners, remote ancestors and counterpart associations acquire no inferred
children from rendering. No record identifier or proper name selects behavior.

## Validation before integration

- Seven neutral synthetic static tests pass: account separation, reverse
  children, missing versus explicitly empty parentage, uncertain unions,
  unresolved references, epithets, qualified names, citation URLs/escaping and
  identifier-renaming invariance. Tests execute the actual renderer against a
  tiny substituted corpus, without adding another full-corpus test worker.
- Existing lineage, counterpart navigation, supplement, claim-correction and
  relationship-revision tests: **32 passed**.
- Pages/static build against the 7,803-record baseline succeeded; existing
  static tests plus the seven new tests: **29 passed**. The pre-existing
  iconography warning for an unknown figure remained visible in build output.
- Chromium inspected all five founder-pilot static profiles at desktop
  (1,400 px) and mobile (390 px) widths: **10 profile checks, 66 local target
  checks, zero horizontal overflow, zero browser errors**. The royal title's
  English translation and the account/default warning were present.

Only source code, focused tests and this audit are committed by this agent.
The coordinator owns integrated regeneration, full tests, cold-load checks,
new-figure browser verification, review, publication and deployment verification.
