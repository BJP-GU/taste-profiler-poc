# Taste Profiler

A minimal, single-user prototype for testing whether a designer's visual
taste can be usefully represented as a set of scored facets across a small
catalog of graphic design references (posters). Built as a proof-of-concept,
not a production app: no auth, no multi-user support, local storage only.

## Setup

Requires Node 18+.

```
npm install
cp .env.example .env.local
```

Open `.env.local` and set `ANTHROPIC_API_KEY` to your own Anthropic API key.
`ANTHROPIC_MODEL` defaults to a vision-capable Claude model; if that model
ID has since been deprecated, swap in a current one from
https://docs.claude.com/en/docs/about-claude/models.

```
npm run dev
```

Open http://localhost:3000.

## How it works

**Upload & Score** (`/`) — upload a poster image. Claude's vision model
looks at it once and suggests a short, neutral description for each of six
facets (it describes what it sees, it doesn't tell you whether to like it).
Edit any of those descriptions if they're off, then score each facet
Dislike / Neutral / Like based on whether it's part of why you react to the
piece the way you do. Save.

**Catalog** (`/catalog`) — a grid of everything you've scored, with a
colored dot per facet (green = liked, red = disliked, gray = neutral) so you
can scan your catalog at a glance. Click any item to edit its scores.

**Taste Profile** (`/profile`) — once you've scored at least 5 references,
this computes your average score per facet and sends the aggregated data
(averages plus the specific descriptors tied to your liked and disliked
scores) to Claude, asking it to write a short plain-language summary of your
taste, e.g. "the designer favors serif display type and broken grids, and
tends to avoid flat, glossy textures." The bars below the summary show the
underlying per-facet averages so the prose claim has numeric grounding next
to it, not just a black-box assertion.

## The six facets

Color, Typography, Composition & Layout, Imagery & Illustration Style,
Form & Shape Language, Texture & Materiality. Defined in
`src/lib/facets.js` if you want to add, remove, or rename any.

There's also a free-text "anything else driving your reaction" field per
reference for whatever doesn't fit a facet (concept, wordplay, a specific
detail), since not everything that drives a reaction to a piece of design
is a formal quality that reduces cleanly to a score.

## Data

Everything is stored in `data/references.json`, a flat file, on purpose.
It's plain-text and inspectable rather than a real database, since this is
a single-user prototype meant to be poked at directly if you want to see
exactly what's been recorded. Uploaded images live in `public/uploads`.
Neither directory is meant to be committed to git (see `.gitignore`).

## Known limitations (by design, for a v0)

- Scoring happens at the whole-reference level, not the element level. If
  a poster's typography drew you in but its color didn't, you can say so,
  but you can't yet point at the specific line of type versus the specific
  swatch. That's the natural next version.
- The taste profile page requires 5+ scored references before it will call
  the synthesis API, to avoid drawing conclusions from too little data.
- With very few references, or references that are all similar, the
  written profile summary may end up thin or repetitive. That's expected:
  it's reporting on the data it's given, not filling gaps with invented
  detail.
