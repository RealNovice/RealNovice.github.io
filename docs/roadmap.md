# lima-spielhofen.com — Roadmap

Written 2026-10-05 from the owner's answers. `docs/legacy-inventory.md` is the
reference for what exists; this file is the order of work.

**Rule for every step:** the live site works at the end of it. No step depends
on a later one. One PR per step. Each step names what the owner can actually
do once it lands.

## What the owner asked for

- Personal representation that looks professional. "A bit of a flex", carried
  by facts and numbers, never by adjectives or decoration.
- An inconspicuous nod to SheetCheater: one line with a link, not a section.
- Mostly static, as few pages as possible.
- Editable without touching code.
- Keep GitHub Pages unless there is a better idea. There is not.
- Must survive: portfolio contents and the stress monitor, tucked away behind
  a sub-link; an overview of what he does and how, not exhaustive.
- **Share counts must not be public. Percentage distribution should be.**

## The stack

**Astro, static output, TypeScript strict, built and deployed to GitHub Pages
by a workflow. Content in files under `content/` and `data/`. Edited in the
browser through Pages CMS; holdings through the existing Portfolio Editor.**

Why: two pages of mostly text need no framework at runtime, and Astro ships
none unless a component asks for it. It gives the typecheck, lint and build
the workflow rule needs, which the current hand-written files cannot. Content
lives in Markdown and JSON, apart from code, which is what makes "edit without
code" possible at all. Hosting, domain, feed and editor stay as they are.

Alternative: **no build at all.** Keep plain HTML, CSS and JS, move text into
one `content.json`, and grow the Portfolio Editor into a site editor. Fewer
moving parts and nothing to install, but no type checking, editing only from
the one Windows machine, and a Tkinter app that keeps growing.

## Pages

| Path | Contains |
|---|---|
| `/` | Name, one sentence, small photo. What I do and how, in a few short paragraphs. "Currently", a handful of lines, one of which is SheetCheater with a link. CV as dated lines. Languages as one line. A plain link to Markets. |
| `/markets` | Holdings by percentage, then the stress monitor. |
| `/impressum` | Only if the owner decides one is needed (see Open decisions). |

Old hash links (`#finance`, `#vita`, …) keep working through a redirect.

## Carried over, changed, removed

Nothing from the inventory is dropped silently.

| Legacy item | Fate |
|---|---|
| Holdings donut, legend, gain per position, theses | Kept on `/markets`. Share counts no longer published (Step 1). |
| Stress monitor: indices, FX, commodities, yield curve, US indicators, macro table, Mag 7 with chart | Kept on `/markets`, driven by a config file. |
| Oil and energy block, Hyperliquid perps, borrowing rates | Kept, collapsed by default under "More". |
| 18 manual inputs, 7 P/E fields, 42 editable macro cells | **Removed.** Stale, unsaved, and meaningless to a visitor. Rows with a live source stay as read-only rows; rows without one go. |
| 29 metrics fetched with no element | **Removed** from the scripts and the feed. |
| Vita paragraph and five entries | Becomes four or five dated CV lines. The paragraph's facts move into "What I do". |
| Seven "Professional Dilettante" cards | Becomes "Currently", one line each. The card about this website goes. |
| Six language cards, certificate lightbox | One line; the certificate is a plain link to the image. |
| Motto, landing gate, drifting colour fields, hovering photo, serif display face | **Removed** (CLAUDE.md, Decided 6). |
| Section switching in JavaScript, loaders, tooltips | Replaced by two real pages. Tooltips stay on `/markets` only. |
| Data feed, `fetch_data.py`, `data` branch | Kept unchanged. |
| Portfolio Editor | Kept; changed in Step 1. |

## Open decisions (owner)

- **Impressum / Datenschutz.** A purely private site in Germany generally
  needs neither; a site that reads as professional self-presentation may. Not
  legal advice; decide before cutover. Default if unanswered: none.
- **Public history.** Share counts and the old FRED key are in the public git
  history. Step 2 proposes replacing it; that needs an explicit yes.
- **Domain registrar.** Unknown; only matters if DNS ever has to change.

---

# Phase A — privacy first, on the current site

## Step 1 — Share counts leave the public repo

The public `data/holdings.json` stops carrying `shares`. The Portfolio Editor
keeps the full book in a private place (a local file, backed up to a new
private repo `lima-spielhofen-private`) and, on Publish, writes a public file
with, per position: ticker, name, type, currency, entry price, symbols, thesis,
`weight` and the `refPrice` the weight was computed at. The page derives live
weights as `weight × price / refPrice`, renormalised, so the donut still moves
with the market and the book's size cannot be recovered. Cash is a weight like
any other.

**Acceptance:** no share count or absolute value in any file served by the
site or in any new commit; weights and gains on the page match the previous
version to one decimal at the moment of the switch; editor round-trip works.

**Working after this:** the owner publishes a trade and the site shows the new
percentages, with nobody able to read position sizes.

## Step 2 — Clean the public history (needs an explicit yes)

Push the complete current history to a new private repo
`lima-spielhofen-archive`, then replace the public `main` with a single fresh
commit of the current tree. Rotate the FRED key. This is a force-push and
cannot be undone on the public side; the archive keeps everything.

Honest limit: the numbers were public from May to October 2026 and may be
cached elsewhere. This stops them being one click away; it does not unpublish
them.

**Acceptance:** `git log -S shares` on the public repo finds nothing; the old
key returns an error from FRED; the feed is green with the new one.

**Working after this:** the public repo contains only what the owner wants
public.

# Phase B — the rebuild, on a branch

`main` stays production throughout. Work happens on `rebuild`; nothing is
deployed from it until Step 8.

## Step 3 — Scaffold and checks

Astro project with TypeScript strict, ESLint, Prettier, Vitest. A CI workflow
runs `astro check`, lint, test and build on every push. `CLAUDE.md`'s workflow
section is updated to name the three commands.

**Acceptance:** CI green on an empty two-page site; live site untouched.

**Working after this:** every later change is checked before it can merge.

## Step 4 — Content model

`content/home.md` (intro, what I do), `content/currently.json`,
`content/cv.json`, validated by a schema at build time. All text is taken from
`docs/legacy-text.md` and shortened; the owner rewrites freely afterwards.
`data/holdings.json` keeps its path so the editor keeps working.

**Acceptance:** a typo in a content file fails the build with a readable
message; no visible string lives in a component.

**Working after this:** every word on the site is in a file a non-programmer
can read.

## Step 5 — Home page

Built from the content files, following `docs/mockup/` with the owner's
objections applied. One self-hosted typeface (no request to Google, which is
also the safe choice under German data-protection rulings). No JavaScript on
this page.

**Acceptance:** renders complete with scripts disabled; under 100 KB without
the photo; every item marked "kept" for `/` in the table above is present.

**Working after this:** the owner can read his own front page and judge the
tone.

## Step 6 — Markets page

Holdings, then the monitor. The monitor is rendered from `data/monitor.json`
(metric, source, format, thresholds, tooltip), replacing the hand-written rows
and the 1,000-line script. Threshold and correlation logic become pure
functions with tests. Dead metrics and manual inputs are gone.

**Acceptance:** every number matches the live site for the same feed file;
adding a metric is one entry in one file; tests cover every threshold tier.

**Working after this:** the monitor is a list the owner can prune.

## Step 7 — Finish

Mobile, keyboard and screen-reader pass; contrast checked; favicon, page
titles, description and share image; redirects for the old hash links;
`prefers-color-scheme` only if it costs nothing.

**Acceptance:** Lighthouse accessibility and best-practices at 100 on both
pages; old links land on the right place.

**Working after this:** the site is presentable to anyone the owner sends it
to.

# Phase C — cutover and editing

## Step 8 — Go live

Merge `rebuild`, switch Pages to deploy from the workflow, tag the previous
commit `legacy-site`. Verify the feed, the editor round-trip and the domain.

**Acceptance:** lima-spielhofen.com serves the new site over HTTPS; a holdings
publish appears within two minutes; rollback is one revert.

**Working after this:** the rebuild is the site.

## Step 9 — Editing without code

Pages CMS configured for the content files: a form per file in the browser,
signed in with GitHub, saving as a commit that the workflow deploys. If it
does not hold up in practice, fall back to extending the Portfolio Editor.

**Acceptance:** the owner changes a sentence on his phone and sees it live
without opening a code editor.

**Working after this:** the owner maintains the site alone.

## Step 10 — Housekeeping

README rewritten for the new layout; old files deleted; the editor's stale
copy removed; `docs/status.md` records the final state; FOMC and CPI dates
for 2027 added or the countdown made to hide itself when the list runs out.

**Acceptance:** a fresh clone builds with two commands from the README.

**Working after this:** nothing in the repo describes a site that no longer
exists.
