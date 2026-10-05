# Legacy inventory: lima-spielhofen.com

Source: `RealNovice/RealNovice.github.io`, local checkout `~/projects/lima-spielhofen`, HEAD `1501e99` (2026-09-06).
Written 2026-10-05 as the first task of the rebuild. Nothing below is a recommendation; it records what the site does, how, and where it is unfinished.

Note on the brief: it describes the site as "a single HTML file". That was true until 2026-09-06 (commit `054ee9d`), when it was split into one HTML file, one stylesheet, four scripts, a data file and a scheduled feed. The single-file version is preserved in `~/projects/lima-spielhofen-legacy-2026-05-03`.

---

## 1. Copies on this machine

| Location | Last change | Git | What it is |
|---|---|---|---|
| `~/projects/lima-spielhofen` | 2026-09-06 | yes, remote `RealNovice/RealNovice.github.io`, equal to `origin/main` | **Current.** What the domain serves. Moved here from `Desktop\Dillettanteism\lima-spielhofen` on 2026-09-30. |
| `~/projects/lima-spielhofen-legacy-2026-05-03` | 2026-05-03 | yes, same remote, HEAD `27d49d3` | The 3,884-line single-file version. Moved from `Desktop\Dillettanteism\Stressboard_repo`. |
| `~/projects/lima-spielhofen-legacy-2026-06-12` | 2026-06-12 | no | A four-file prototype (`index.html`, `styles.css`, `feed.js`, `tweets.js`), unrelated to the live site. **Copied**, not moved: the original stays at `Desktop\Stressboard` because that folder is a Claude session's working directory. |

GitHub (`gh repo list`): `RealNovice.github.io` is the only matching repo. It is **public**, which GitHub Pages on a free account requires.

`Desktop\Dillettanteism\Portfolio Editor.exe` (2026-09-06 16:48, 10.9 MB) is the current editor build and was left where it is. An older build (13:01) sits untracked in the repo folder.

## 2. Hosting, domain, deployment

- **Domain:** `lima-spielhofen.com` (`CNAME` file in the repo root). HTTPS enforced.
- **Host:** GitHub Pages, source = branch `main`, path `/`. No build step: Pages serves the files as they are. A push to `main` is live in about one minute.
- **No** `netlify.toml`, `vercel.json`, FTP config or bundler.
- **Data branch:** an orphan branch `data` holds `market.json` and `fred.json`, force-pushed by a workflow, one commit deep. The page reads them from `raw.githubusercontent.com`.
- **Workflow** `.github/workflows/data.yml` ("Market data feed"): cron every 15 min Mon–Fri 13–22 UTC, every 2 h otherwise; also on push to `data/holdings.json` or `scripts/fetch_data.py`, and manually. Runs `scripts/fetch_data.py` (Python stdlib only). Last runs checked 2026-09-30: all green.
- **Secret:** `FRED_API_KEY` (repository secret). The same key is still readable in git history before `054ee9d` and has not been rotated.
- Where the domain is registered and where its DNS lives is **unknown** from the repo. Ask.

## 3. Pages and sections

One page, `index.html` (586 lines). Five views switched by JavaScript, URL hash kept in sync (`#finance`, `#passion`, `#languages`, `#vita`).

| View | Element | Content |
|---|---|---|
| Home | `#hubHome` | Round photo, name, motto "Per Aspera Ad Astra", one line, four buttons. Three drifting colour fields behind it; photo hovers. |
| Finance | `#sec-finance` | Two tabs. **Current Holdings** (default): donut by market value, legend with gain per row, one thesis card per position. **Stressboard**: see §5. |
| Professional Dilettante | `#sec-passion` | Seven cards: Sheet Cheater app, this site, CFA Level 1, motorbike licence A, DGfM mushroom exam, hunting licence, vegetable garden. |
| Languages | `#sec-languages` | Six cards: Portuguese, German (native), English C2 with certificate lightbox, Japanese B2, French, Spanish. |
| Vita | `#sec-vita` | One italic paragraph, then five dated entries in three groups (markets, professional, education). |

Chrome: fixed top bar inside a section (Home button, section title, four section links, hidden under 860 px), footer "© Johannes Lima Spielhofen", certificate lightbox, Mag 7 chart modal, hover tooltip.

**All text as it stands:** `docs/legacy-text.md`. Position names and theses: `data/holdings.json`.

## 4. Links and assets

Internal links: the four hash anchors only. There are **no outbound links** to other sites anywhere on the page (no email, no social, no GitHub, no link to SheetCheater).

Requests the page makes, all checked 2026-10-05:

| URL | Purpose | Status |
|---|---|---|
| `lima-spielhofen.com/` , `/css/site.css`, `/js/*.js` | the site | 200 |
| `/data/holdings.json` | portfolio | 200 |
| `/profile.jpg`, `/certificates/cpe.jpg` | images | 200 |
| `raw.githubusercontent.com/RealNovice/RealNovice.github.io/data/market.json` | Yahoo quotes + Mag 7 history | 200 |
| `…/data/fred.json` | FRED series | 200 |
| `fonts.googleapis.com/css2?family=Cormorant+Garamond…&family=DM+Sans…` | fonts | 200 |
| `api.hyperliquid.xyz/info` (POST) | live prices, oil perps | 200 |

Called by the workflow, not the browser: `query2.finance.yahoo.com` (cookie + crumb, `v7/finance/quote`, `v8/finance/chart`), `api.stlouisfed.org/fred/series/observations`.

Assets:

| File | Size | Notes |
|---|---|---|
| `profile.jpg` | 77,526 B | 567 × 626, black and white |
| `certificates/cpe.jpg` | 630,150 B | Cambridge CPE scan, 1400 px wide; loaded only when the lightbox opens |
| `index.html` | 41,681 B | |
| `css/site.css` | 33,011 B | |
| `js/stressboard.js` | 71,830 B | about half is data (thresholds, tooltips) |
| `js/holdings.js` / `feed.js` / `nav.js` | 10,625 / 4,495 / 5,847 B | |
| `data/holdings.json` | 4,292 B | 11 positions |

No favicon, no Open Graph tags, no `robots.txt`, no sitemap, no analytics.

## 5. The Stressboard, block by block

1. **Header**: title, live dot, Refresh, counts of concern / watch / normal, next-release countdown (NFP computed, FOMC and CPI from hard-coded 2026 lists).
2. **Indices & Volatility**: S&P 500, Dow, VIX. **Commodities & FX**: WTI, Brent, gold, DXY, USD/JPY. **Sector ETFs**: XLE, ITA, XLP, MOO.
3. **Yield curve**: 10y−2y spread, two 12-month sparklines, daily change in bp with a "shock" rule at 15 bp, strip with USD/JPY, WTI-vs-S&P 30-day correlation, DXY.
4. **Oil & Energy**: six exchange futures, three manual physical benchmarks, four Hyperliquid perps with funding and oracle, WTI–Brent spread, eight manual energy benchmarks.
5. **Global Macro Snapshot**: 7 regions × 6 columns, 42 editable cells, most now filled from the feed.
6. **Magnificent 7**: price, day change, 1-year sparkline, editable P/E; click opens a chart modal (1D to 10Y).
7. **Borrowing rates**: one FRED row, five manual.
8. **US Stress Indicators**: six FRED rows, two manual.

Each row is coloured against thresholds in `TH`; tooltips explain the metric and its levels.

## 6. Styling approach

Hand-written CSS in one file, custom properties on `:root`, no framework, no preprocessor. Light paper-toned scheme. Two Google fonts: Cormorant Garamond (serif, headings) and DM Sans. Three breakpoints (860, 600, 400 px). Motion: drifting radial gradients on the home, hovering photo, staggered entrance; disabled under `prefers-reduced-motion`.

## 7. Scripts and what they call

| File | Does | Calls |
|---|---|---|
| `js/feed.js` | Loads the two feed files, caches them in `localStorage` (`feed-cache-v1`), polls every 5 min; queries Hyperliquid | raw.githubusercontent.com, api.hyperliquid.xyz |
| `js/nav.js` | View switching, history, certificate lightbox, tooltip | — |
| `js/holdings.js` | Fetches `data/holdings.json`, prices rows, draws donut, legend, cards; Holdings/Stressboard tabs | via `Feed` |
| `js/stressboard.js` | Everything in §5 | via `Feed` |
| `scripts/fetch_data.py` | Builds the feed in CI | Yahoo, FRED |
| `tools/portfolio_editor.py` | Tkinter desktop editor; commits `data/holdings.json` through `gh api`, triggers the feed, polls the live site until the change is served | GitHub API via `gh` |

No forms that submit anywhere. `localStorage` keys: `feed-cache-v1`, `holdings-prices-v4`, `fin-view`.

## 8. Unfinished, stale or wrong

- **29 metrics are fetched and evaluated but have no element on the page** (`indpro`, `permits`, `umcs`, `cstocks`, `spr`, `prod`, `gas`, `diesel`, `jet`, `wtispot`, `brentspot`, `yc`, and all EU / China / Japan / UK rows). They are leftovers of a removed carousel. Their thresholds and tooltips are still in the file.
- **18 manual inputs + 7 P/E fields** carry hard-coded values from early 2026 that nobody updates; visitors can type in them and nothing is saved.
- Macro table: China policy rate, China 10y, Russia 2y/10y/policy have no live source and show the old defaults.
- The Dilettante card "Presenting a personal hub" and the static Finance intro still name Stooq, which is no longer used.
- The Sheet Cheater card says "Currently on iOS"; the app has not been built for a device.
- FOMC and CPI dates end in December 2026.
- `README.md` says the editor is "on the Desktop"; it is in `Desktop\Dillettanteism`.
- FRED key not rotated (§2).
- Holdings, share counts and entry prices are public in a public repo.
- No tests, no linter, no type checking, no CI other than the feed.
- A redesign mockup from 2026-09-19 (one scrolling page, holdings first, single typeface) is in `docs/mockup/` and at `https://claude.ai/artifact/YF5dzpWfZUhptRkbMoHzuK`. Not implemented.

## 9. The owner's verdict

Recorded verbatim so the rebuild is judged against it: the site "look[s] a bit artificial" (2026-09-06), should have "a less pretentious layout" (2026-09-19), and "the site is too pretentious" (2026-10-05). What reads that way in the current build: the Latin motto, the name "Professional Dilettante", the landing gate before any content, the serif display face, the Vita paragraph, six cards for a list of languages, and a dashboard of editable cells presented to visitors.
