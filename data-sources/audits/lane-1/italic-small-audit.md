# Lane 1 — Oscan, Messapian and Sicel audit

Owner: `lane-1-claude-opus-5`. Branch: `claude/friendly-cerf-lgoxfz`.
Baseline: 5,767 total figures — Oscan 6, Messapian 6, Sicel 9.

One census covers all three traditions
(`audits/lane-1/italic-small-census.tsv`) because the batch is a single
coherent pass over the smaller pre-Roman Italic and Italic-adjacent traditions,
and because two of its dispositions are cross-tradition handoffs that only make
sense read together.

Corpus: **5,767 → 5,786 figures**. Oscan **6 → 19**, Messapian **6 → 9**,
Sicel **9 → 12**.

Census: 28 rows — 19 ADD, 1 EXISTING, 1 ALIAS, 3 REJECT, 2 CROSS-TRADITION,
2 BLOCKED.

## Oscan — the Agnone Tablet

Almost the whole Oscan half of this batch comes from one object: the **Agnone
Tablet** (Tabula Osca), a bronze of the 3rd–2nd century BCE found near Agnone
in Molise in 1848, sold to the British Museum in 1873, where it is
`G_1873-0820-149`. It carries lists of divine names in the dative, all honoured
in the Garden of Ceres, and it is one of the longest Oscan texts we have. The
existing `oscan_kerres` record already cited it; this pass works through the
list.

**Three entries were REJECTED as power-classes**, not individuals: Diumpaís
Kerriíaís (the spring-nymphs, Latin *Lymphae*), Anafríss Kerriíúís (the
rain-powers, *Imbres*) and Maatúís Kerriíúís (the dew-powers). This registry
does not ingest creature or power classes, and a plural collective under a
cult-title is exactly that.

**One entry was dispositioned ALIAS**: Hereklúí Kerriíúí is the existing
`oscan_hercle` under his Cereal cult-title, and the existing Kerres record
already says so.

**Cult-title variants were split, not folded.** The tablet names Jupiter twice
and never bare — Diúveí Verehasiúí and Diúveí Regatureí. Both are recorded as
their own entries beside a base `oscan_diuvei`, joined by `manifested-as`. This
follows the corpus's own practice in these traditions: Messapian already keeps
`messapian_zis`, `messapian_zis_menzanas` and `messapian_zis_batas` as three
records on exactly that pattern, and Umbrian keeps Tursa Cerfia and Tursa Iovia
apart. There was no Oscan Jupiter record at all before this pass.

**Glosses are marked as glosses.** The readings of several Agnone names are
secure; the identifications proposed for them mostly are not. Evklúí is glossed
in the literature as Mercury *or* as Hades — two very different gods — and that
disagreement is recorded on the entry rather than resolved. Liganakdíkeí,
Patanaí Piístíaí and Pernaí carry source weight `low` because their glosses are
uncorroborated outside the list.

**Angitia** is the one Oscan addition not from the tablet: the goddess of
healing, magic and serpents whose grove stood by Lake Fucinus. She is filed
under the Oscan key because that is the Oscan-Sabellic key this registry
carries; her cult is Marsian at its centre, and a future Marsian tradition
should coordinate with `oscan_angitia` rather than duplicate her.

Status is **PARTIAL**, not DONE. Every candidate the Agnone Tablet yields has
been treated, but the tradition has further epigraphic sources — the Tabula
Bantina, the Pietrabbondante and Capua material, the minor inscriptions — that
this pass did not work through. There is no concrete blocker, so BLOCKED would
be wrong too; `PARTIAL` is used to say plainly that the work is real and
unfinished. It is a status this manifest had not used before.

## Messapian — the inherited theonyms

**Venas** and **Taotor** matter because they are not borrowings. Venas is the
Messapic reflex of the same Indo-European word behind Latin *Venus* and Old
Indic *vánas*, 'desire'; Taotor comes from PIE *\*teutéha-*, 'the people', the
root behind Oscan *touto* and Irish *túath*. The literature describes Taotor
candidly as an unknown god, and the record says so rather than inventing a
portfolio for him. Both are regularly invoked alongside Zis, already in the
corpus.

**Athana** is added for the same reason `messapian_aprodita` already exists:
the local cult is what is attested, and a borrowed name does not make the
worship Greek.

**Lahona** is BLOCKED. It is reported as a Messapic deity name worshipped *as
an epithet attached to Aphrodite* — `ana aprodita lahona` in votives from
Ceglie Messapica. Whether that names a distinct goddess absorbed into
Aprodita's cult, or is only a cult-title, decides whether it is a figure at
all. **Evidence needed:** *Monumenta Linguae Messapicae* on the Ceglie votives,
or a treatment of Lahona independent of the Aprodita formula. Ingesting it now
would be a coin-flip between a real goddess and a transparent epithet, which is
precisely the bar this audit programme sets.

## Sicel — western Sicily, and a boundary

**Krimisos**, **Segesta** and **Eryx** are added: the river-god of the Egestan
territory, the nymph who bears the city's founder to him and gives it her name,
and the eponymous hero of Mount Eryx. Eryx carries `greek_hesiod_aphrodite` as
his mother — cross-tradition parentage already has precedent in this corpus —
and only the maternal line, because his paternity is given as Butes in some
accounts and Poseidon in others.

Two candidates were handed off rather than ingested. **Anapos** and **Kyane**
are river- and spring-figures of *Syracuse*, represented and honoured there in
Greek colonial cult. They are Sicilian by geography and Greek by religion, and
the Sicel key in this registry is for the indigenous figures known through
Greco-Roman report. Both are dispositioned `CROSS-TRADITION SAME FIGURE` and
belong to whoever takes Greek.

**Daphnis** is BLOCKED on the same boundary: Sicilian by setting, Greek by
parentage and by the whole bucolic tradition that carries him. **Evidence
needed:** a treatment establishing an indigenous Sicel cult of Daphnis distinct
from the Greek pastoral figure. Without it, adding him to Sicel would assert a
classification the evidence does not support, and adding him to Greek is not
this batch's call.

A general caveat on the Sicel key: the **Elymians** of the west — Eryx, Segesta,
Entella — were a distinct people from the Sicels. The registry has no Elymian
key, so the three western figures here are filed under Sicel with this note. A
future Elymian tradition should build on `sicel_krimisos`, `sicel_segesta` and
`sicel_eryx` rather than duplicate them.

## Relations

Every Agnone deity carries an `ally` edge to `oscan_kerres`, and the eleven
reciprocals were added to her existing record in `data-sources/transcripts/oscan.txt` —
the tablet makes her the deity of the sanctuary they all share, so the hub is a
fact about the object, not a modelling convenience. Ammaí and Futreí, the
Mother and the Daughter, are linked to each other as co-invoked under the same
Cereal title, with an explicit note that **the tablet does not state that they
are kin**; no mother/daughter edge is authored. Venas and Taotor are linked
because the dedications invoke them together. Krimisos and Segesta are linked
as the parents of the Egestan founder.

Two figures are genuinely kinless — `oscan_angitia` and `messapian_athana` —
and carry cited verdicts in `data-sources/verified-solitary.json`.

## Sourcing constraint

No direct outbound web access in this session; research went through
server-side web search, which returns the substance of reference pages without
fetching them. Citations name the attesting object or the reference work, and
no printed monograph is cited as though it had been read.
