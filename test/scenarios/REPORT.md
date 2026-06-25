# Capability scenario report

Evaluation: binary PASS/FAIL via assertions over the real app booted in jsdom.
Quality bar: every scenario PASS. **Result: 34/34 passed.**

| ID | Capability | Criterion | Result | Evidence |
|----|-----------|-----------|--------|----------|
| S01 | Boot & data load | app boots to completion with zero runtime errors | ✅ PASS | bootDone=true, errors=0 |
| S02 | Browse | the full corpus renders as table rows | ✅ PASS | 2674 figure rows |
| S03 | Search / filter | typing in search narrows the table; clearing restores it | ✅ PASS | full=2674, "thor"→6, restored=2674 |
| S04 | Command palette | Cmd+K and Ctrl+K open the palette, Esc closes it | ✅ PASS | meta+K open, Esc close, ctrl+K open |
| S05 | Detail — core boxes | a figure detail renders powers and material culture | ✅ PASS | powers + material rendered for Heracles |
| S06 | Detail — etymology | a figure with a sourced etymology renders the etymology section | ✅ PASS | etymology rendered (591 chars) |
| S07 | Detail — genealogy/parentage | a figure with a resolvable parent links to that parent | ✅ PASS | parentage links to paternalAcrisiusGreek · Mortal |
| S08 | Detail — multi-script names | Heracles surfaces cross-tradition / original-script names | ✅ PASS | multi-script names rendered |
| S09 | Divinity computation | Heracles shows the 9⁄16 divinity descent breakdown | ✅ PASS | 9⁄16 demigod by descent |
| S10 | Power scope-tags | faculties render their derived scope-tag chips | ✅ PASS | scope chip: "weather" |
| S11 | Inheritance | a Heraclid surfaces inheritable-from-ancestry power candidates | ✅ PASS | inherited candidates labelled not-attested |
| S12 | Graph view | the default graph mounts a populated node-link diagram | ✅ PASS | 770 graph nodes |
| S13 | Graph focus | deep-linking #/graph/<id> focuses that figure | ✅ PASS | focused "Heracles" with neighbor list |
| S14 | Graph path-finding | path mode finds a shortest relation path between two figures | ✅ PASS | path found: "Path · 1 hopclearZeusDeity · Greek↓parentHeraclesDemigod · G" |
| S15 | Atlas view | the atlas mounts all mapped territories | ✅ PASS | 331 paths, 238 traditions |
| S16 | Atlas deep-link | #/atlas/<tradition> focuses that territory | ✅ PASS | focused Greek territory |
| S17 | Lifecycle | a dense lifecycle lays out stages without overlap | ✅ PASS | 17 stages, min gap 30px |
| S18 | Items registry | the Items view lists the object corpus grouped by kind | ✅ PASS | 1802 item rows, grouped |
| S19 | Item custody | an item detail names its custody chain and links registry holders | ✅ PASS | custody chain with linked holder |
| S20 | Keyboard nav | j/k move the cursor, Enter opens it, Escape closes | ✅ PASS | cursor "'Adi ibn Hatim" opened + closed |
| S21 | Persistence — quota | oversized corpus stays in memory; the atlas still persists | ✅ PASS | people=null (quota), atlas persisted, UI populated |
| S22 | Persistence — corruption | corrupted localStorage JSON falls back to the seed | ✅ PASS | fell back to seed (2674 rows), no errors |
| S23 | Persistence — user edit | a user-edited corpus in storage wins over the seed | ✅ PASS | stored 2-figure corpus won over seed |
| S24 | Search — empty state | a no-match query yields zero rows without error | ✅ PASS | no-match → 0 rows, no error, restores |
| S25 | Routing — unknown id | deep-linking a non-existent figure does not crash the app | ✅ PASS | unknown id handled gracefully |
| S26 | Detail — minimal figure | a figure with no powers/items/domains renders cleanly | ✅ PASS | minimal figure rendered, no powers, no errors |
| S27 | Detail — cult block | a major deity renders festivals, priesthoods, and offerings | ✅ PASS | cult block: "4 centers · 3 festivals · 3 priesthoods · 3 offerings" |
| S28 | Detail — iconography | a figure with iconography renders the iconography block | ✅ PASS | iconography rendered (705 chars) |
| S29 | Browse — sort | sorting by tradition reorders the table | ✅ PASS | reordered from alpha "'Abla bint Malik" |
| S30 | Browse — tradition filter | selecting a tradition in the rail narrows the table | ✅ PASS | Norse filter: 2674 → 67 → 2674 |
| S31 | Command palette — navigate | typing a name and confirming opens that figure | ✅ PASS | palette opened "Heracles" |
| S32 | Graph — year scope | toggling year-scope engages without error | ✅ PASS | year-scope engaged and reverted, no errors |
| S33 | Detail → Graph cross-link | the "show in graph" control opens the graph focused on the figure | ✅ PASS | show-in-graph → focused "Heracles" |
| S34 | Detail — figure nav | Prev/Next step through the filtered list and return | ✅ PASS | Prev/Next: "'Abla bint Malik" ↔ "'Adi ibn Hatim" |
