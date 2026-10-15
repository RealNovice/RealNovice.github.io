# lima-spielhofen.com

Personal website of Johannes Lima Spielhofen: who he is, what he holds, and a
market stress monitor he built for himself. Live at https://lima-spielhofen.com,
served from `main` of `RealNovice/RealNovice.github.io` (GitHub Pages today;
Cloudflare Pages from a private repo once the move is done).

This file is read at the start of every Claude Code session. It is the single
source of truth for how this repo works. `docs/legacy-inventory.md` and
`docs/legacy-text.md` document the site as of 2026-10-05; `docs/roadmap.md`
and `docs/status.md` are dated 2026-10-05 and superseded where this file
differs.

## Status

Static files, live. No rebuild planned (the Astro plan of 2026-10-05 is
dropped).

## What exists today

- Static files, no build: `index.html`, `css/site.css`, `js/{feed,nav,holdings,stressboard}.js`.
- `data/holdings.json` is the portfolio. It is edited with
  `Desktop\Dillettanteism\Portfolio Editor.exe` (`tools/portfolio_editor.py`),
  which commits straight to `main` without asking. **Always pull before
  working.** Share counts stay on the owner's PC
  (`%APPDATA%PortfolioEditorpositions.private.json`); the published file
  carries only each position's `weight`.
- `.github/workflows/data.yml` runs `scripts/fetch_data.py` on a schedule and
  force-pushes `market.json` / `fred.json` to the orphan `data` branch. The
  page reads them from raw.githubusercontent.com. Hyperliquid is queried live
  in the browser.

## Decided — do not reopen without a written reason

1. **Changes go through a branch; the owner approves the push to `main`.** A
   push to `main` is live in a minute. Exception: the Portfolio Editor
   pushes `data/holdings.json` to `main` directly.
2. Yahoo and FRED are never called from the browser (no CORS, proxies are
   dead). They go through the scheduled feed.
3. No secrets in the repo. The FRED key is the `FRED_API_KEY` repository
   secret. (The old key is still in history and should be rotated.)
4. The holdings file, the feed and the editor survive the rebuild unless the
   owner says otherwise.
5. Nothing from the legacy site is dropped silently: every item in
   `docs/legacy-inventory.md` is either carried over or listed as removed in
   the roadmap with a reason.
6. **Tone.** The owner's standing verdict is that the site is too pretentious
   and looks artificial. No Latin motto, no clever section names, no landing
   gate, no decorative effects, no self-description in the
   third-person-CV voice. Plain words, content first. When in doubt, cut.
   "A bit of a flex" is carried by facts and numbers, never by adjectives.
   Type: Literata for headings, the system font for text and numbers
   (approved 2026-10-15).
7. **Share counts and absolute values are never public.** Percentages are.
   No file served by the site and no commit to this repo carries them
   (roadmap Step 1).
8. Commits use the owner's GitHub noreply address, never his real email.

## Relation to Bandwidth

Not part of Bandwidth (`~/projects/bandwidth-hq`). This site may link to
bandwidth.lima-spielhofen.com and to individual products like any outside
site, may read their repos, and may use the Bandwidth brand sync as a
consumer. It never edits them, and Bandwidth sessions never edit this repo.

## Conventions

- Plain, hand-written code a teacher can read. No framework.
- Data that changes (holdings, thresholds, metric lists) lives in `data/` as
  JSON, not in markup or scripts.
- Small descriptive commits. Commit messages say what changed for a visitor.

## Workflow

There is no typecheck, lint or build. After any change: serve the folder
(`python -m http.server 8765`), open every view, and confirm the console is
clean. Commit on a branch; push to `main` only after the owner approves. Never end a session with a dirty tree; end every
session by updating `docs/status.md`.
