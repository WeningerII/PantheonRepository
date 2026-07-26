# Outreach kit

Ready-to-paste copy for the places worth telling about this. Everything here is
drafted against the corpus as it actually is — if you change a number, run
`npm test`, because `test/static.test.cjs` checks the README's counts against
`dist/data/meta.json` and will catch drift there, though not in this file.

Why this exists: as of 2026-07-26, Search Console shows the corpus discovered
but largely uncrawled — `norse_odin.html` reports *Discovered – currently not
indexed* with `Last crawl: N/A`, meaning Google knows the URL and has never
fetched it. That is crawl priority, and crawl priority follows from other sites
linking to you. The per-tradition hub pages help internally; this is the
external half.

**One honest caveat up front:** links are a byproduct of being worth
referencing, not a thing you install. Everything below is an invitation for
someone to look, not a placement.

---

## 1. Show HN

Highest ceiling per minute spent. A post that does moderately well produces
dozens of organic links from blogs and newsletters within days.

**Title** (80 char limit; pick one):

```
Show HN: Pantheon Registry – 5,721 source-cited mythological figures, mapped
```
```
Show HN: A cross-tradition index of 5,721 gods, with citations for every claim
```

**Body** (Show HN posts take a URL plus a short text body):

```
https://www.listofgods.com/

I got annoyed that mythology references are almost always one tradition deep,
so you can read about Odin or about Woden but nothing tells you they are the
same figure attested twice. This is an attempt at the cross-tradition version:
5,721 figures across 560 traditions, linked by genealogy, and browsable as a
table, a relation graph, or a map of where each tradition was actually attested.

Two rules I set early and then had to build real machinery to keep:

Every entry cites its sources, and the build fails on an uncited claim, an
invented native term, or a coined name. The corpus is regenerated from committed
research transcripts, and CI proves byte-exact reproducibility from them — so
the data physically cannot drift from its sources by hand-editing.

Images are Public Domain / PD-art / CC0 or they don't ship. The gate reads
machine-readable rights fields from Wikimedia Commons and four museum
open-access APIs, never a human-written caption, and fails closed. Files are
self-hosted rather than hotlinked.

Technically it's a static, no-server React SPA on GitHub Pages with no bundler.
The interesting constraint was that first load must not scale with corpus size —
the corpus blob is off the critical path behind projection tiers, so adding
figures doesn't slow the first paint. There's also a fully JS-free static mirror
at /registry/ (crawlers and LLMs reading the URL get real content, not a boot
shell) and an MCP connector so a model can query the corpus as tools.

Source: https://github.com/WeningerII/PantheonRepository
Code MIT, data CC BY 4.0.

Happy to go into the citation pipeline or the load architecture if either is
interesting.
```

**Prepared first comment** — post this yourself a few minutes in; it gives the
thread somewhere to go and pre-empts the obvious question:

```
The question I expect: how is this different from just reading Wikipedia?

It isn't trying to beat Wikipedia on any single figure — Wikipedia will always
have more prose about Odin. What it has that a per-article encyclopedia
structurally can't is the cross-tradition shape: which traditions actually
share figures (Norse and Anglo-Saxon share 8), where they overlapped
geographically, and a genealogy graph you can walk across tradition boundaries.

The other difference is falsifiability. Every claim names the primary text
behind it, and the corpus regenerates from committed transcripts under CI, so
"where did this come from" always has an answer. Comparative mythology is a
field with a lot of confident 19th-century invention in it, and I wanted the
data to be auditable rather than asserted.

Known weak spots, since someone will find them: coverage is uneven — the
Greek/Hindu/Egyptian traditions are far deeper than most of the 560, and small
traditions often have a handful of figures each. And the mobile browse table
gets heavy at full corpus size; that's measured and being worked on.
```

**Timing:** weekday mornings US Eastern do best. Don't ask anyone to upvote —
HN detects voting rings and it will sink the post.

---

## 2. Dataset publication

Publishing the corpus as a dataset gets citations, and citations are links.
`registry/figures.json` (7.4 MB, 5,721 records) is already built on every deploy
and is the natural artifact.

**Where:** Hugging Face Datasets and Kaggle are the low-friction options.
**Zenodo** is the one worth doing properly — it mints a DOI, which is what makes
the corpus citable in a paper, and academic citations are the most durable links
there are.

**Datacard:**

```markdown
# Pantheon Registry — 5,721 source-cited mythological and historical figures

A cross-tradition registry of mythological and historical figures spanning 560
traditions, with genealogy, domains, powers, epithets, cult practice, and the
primary and secondary sources each entry rests on.

## Contents

5,721 figure records. Each record:

| Field       | Description |
|-------------|-------------|
| `id`        | Stable identifier, `<tradition>_<name>` |
| `name`      | Primary display name |
| `altNames`  | Attested alternates, including original-script forms |
| `tradition` | One of 560 traditions |
| `type`      | Tier: deity, numen, demigod, quartigod, scion, mortal |
| `era`       | Attested period |
| `divinity`  | Computed divinity tier |
| `parents`   | Parent figure ids |
| `children`  | Child figure ids |
| `domains`   | Governed spheres (5,212 distinct across the corpus) |
| `powers`    | Faculties (7,877 distinct) |
| `summary`   | Prose entry |
| `url`       | Canonical page on listofgods.com |
| `sources`   | Primary and secondary citations |

Alongside the figures: 3,148 material-culture items and 241 mapped tradition
territories.

## Provenance

Generated from committed research transcripts rather than scraped. CI verifies
the corpus is byte-exact reproducible from those transcripts, and content tests
fail the build on an uncited claim, an invented native term, or a coined name.

## Licence

Data: CC BY 4.0. Code: MIT. Figure images, where present, are Public Domain /
PD-art / CC0 only, gated on machine-readable rights flags from Wikimedia Commons
and museum open-access APIs.

## Limitations

Coverage is uneven by design of the sourcing rather than by intent: traditions
with a large surviving textual record (Greek, Hindu, Egyptian, Norse) are
represented far more deeply than traditions attested mainly through oral or
ethnographic material. Tier assignments involve editorial judgement in
genuinely ambiguous cases; those are documented as authored stances rather than
presented as consensus.

## Source

https://www.listofgods.com/ · https://github.com/WeningerII/PantheonRepository
```

---

## 3. Awesome-list PRs

These accept pull requests — adding yourself is normal and expected, unlike
Wikipedia. Match each list's existing entry format; most want one line.

**Suggested line:**

```markdown
- [Pantheon Registry](https://www.listofgods.com/) — 5,721 source-cited mythological and historical figures across 560 traditions, with genealogy graph, territory atlas, JSON export and an MCP connector. ([source](https://github.com/WeningerII/PantheonRepository))
```

Worth targeting: `awesome-datasets`, `awesome-public-datasets`,
`awesome-mcp-servers`, and any mythology/folklore/humanities resource list.
Search GitHub for `awesome mythology`, `awesome humanities data`.

Also add the GitHub repo's own **topics** — `mythology`, `comparative-mythology`,
`dataset`, `open-data`, `mcp`, `folklore` — under the repo's About panel. Topic
pages are browsed and indexed.

---

## 4. Library research guides

Subject librarians build mythology and classics resource pages constantly and
link to reference tools. A short, specific email is a normal thing to send.

```
Subject: Open mythology reference for your [classics/folklore] guide

Hi [name],

I saw your [Mythology / Classics] research guide at [URL]. I've built a free
open reference that might fit alongside the entries there:

https://www.listofgods.com/

It's a cross-tradition index of 5,721 figures across 560 traditions. Each entry
cites its primary and secondary sources, and the underlying corpus is openly
licensed (CC BY 4.0) with a JSON export, so it's usable for student projects as
well as for lookup.

The angle that may be useful for teaching is the comparative structure — a
relation graph that crosses tradition boundaries and a map of where each
tradition is attested, which is hard to get from per-article references.

No obligation at all; I just thought it might be relevant. Happy to answer
questions about sourcing or methodology.

[name]
```

Keep it to one paragraph of substance. Don't follow up more than once.

---

## 5. Subreddit and community wikis

r/mythology, r/folklore, r/AskHistorians and similar keep **resource wikis**.
Message the moderators and suggest it for the wiki — that's the channel. Do not
drop it into comment threads.

---

## What not to do

- **Comment-section link dropping.** This is the exact pattern Google's link
  spam policies name. Best case ignored; it can actively hurt.
- **Adding it to Wikipedia yourself.** Against their conflict-of-interest and
  external-links guidelines, reverted by editors who watch for it, and their
  external links are `nofollow` so it wouldn't pass signal anyway. If the
  registry becomes a recognised reference, other editors will cite it.
- **Expecting social links to move ranking.** Pinterest, Instagram, Facebook and
  Reddit all mark outbound links `nofollow`/`ugc`. They can send real people —
  which is how good links eventually happen — but they don't pass signal.
  Instagram captions aren't even clickable.
- **Paying for links or using a "submit to 500 directories" service.** Actively
  penalised.

## Calibration

Five to ten genuine links from places Google already trusts would meaningfully
change crawl rate at this stage. You do not need hundreds. One Show HN that
lands could do it alone.
