# lima-spielhofen.com

Personal website of Johannes Lima Spielhofen: who he is, what he holds, and a
market stress monitor he built for himself. Live at https://lima-spielhofen.com,
served by GitHub Pages from `main` of `RealNovice/RealNovice.github.io`.

This file is read at the start of every Claude Code session. It is the single
source of truth for how this repo works. `docs/roadmap.md` is the order of
work; `docs/legacy-inventory.md` documents the site as it stands;
`docs/legacy-text.md` holds every visible string. Where they disagree, the
roadmap wins.

## Status

**Phase: roadmap written, awaiting the owner's go-ahead.** Work through
`docs/roadmap.md` in order, one PR per step. Do not skip ahead. Current
position: `docs/status.md`.

## What exists today

- Static files, no build: `index.html`, `css/site.css`, `js/{feed,nav,holdings,stressboard}.js`.
- `data/holdings.json` is the portfolio. It is edited with
  `Desktop\Dillettanteism\Portfolio Editor.exe` (`tools/portfolio_editor.py`),
  which commits straight to `main`. **Pull before working; the editor pushes
  without telling you.**
- `.github/workflows/data.yml` runs `scripts/fetch_data.py` on a schedule and
  force-pushes `market.json` / `fred.json` to the orphan `data` branch. The
  page reads them from raw.githubusercontent.com. Hyperliquid is queried live
  in the browser.

## Decided — do not reopen without a written reason

1. **`main` is production.** A push is live in a minute. Until the rebuild has
   its own branch and preview, change nothing on `main` except docs and
   holdings.
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
   gate, no display serif, no decorative effects, no self-description in the
   third-person-CV voice. Plain words, content first. When in doubt, cut.
   "A bit of a flex" is carried by facts and numbers, never by adjectives.
7. **Share counts and absolute values are never public.** Percentages are.
   No file served by the site and no commit to this repo carries them
   (roadmap Step 1).
8. Stack for the rebuild: Astro static, TypeScript strict, GitHub Pages,
   content in `content/` and `data/`. Two pages: `/` and `/markets`.

## Conventions

- Plain, hand-written code a teacher can read. No framework is assumed until
  the roadmap names one.
- Data that changes (holdings, thresholds, metric lists) lives in `data/` as
  JSON, not in markup or scripts.
- Small descriptive commits. Commit messages say what changed for a visitor.

## Workflow

There is no typecheck, lint or build yet; the roadmap's first step adds them
for whatever stack is chosen. Until then, after any change: serve the folder
(`python -m http.server 8765`), open every view, and confirm the console is
clean. Then commit and push. Never end a session with a dirty tree; end every
session by updating `docs/status.md`.
