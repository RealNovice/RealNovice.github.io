# lima-spielhofen.com

Personal site of Johannes Lima Spielhofen, served by GitHub Pages from the `main` branch.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | Markup only. Home + four sections (Finance, Dilettante, Languages, Vita). |
| `css/site.css` | The stylesheet. One light scheme, no blur/particle effects. |
| `js/nav.js` | Section navigation, certificate lightbox, tooltips. |
| `js/feed.js` | Loads `market.json` / `fred.json` from the `data` branch; queries Hyperliquid live. |
| `js/holdings.js` | Holdings view (donut, legend, thesis cards). Reads `data/holdings.json`. |
| `js/stressboard.js` | The stress monitor (thresholds, yield curve, macro table, Mag 7, tooltips). |
| `data/holdings.json` | **The portfolio.** Edit with the Portfolio Editor, or by hand. |
| `scripts/fetch_data.py` | Builds the market/FRED feed. Run by the workflow below. |
| `.github/workflows/data.yml` | Every 15 min in trading hours (2 h otherwise): fetch Yahoo + FRED, push to the `data` branch. |
| `tools/portfolio_editor.py` | Desktop editor for the holdings (Tkinter). `tools/build_exe.bat` builds `Portfolio Editor.exe`. |

## How prices get onto the page

Browsers cannot call Yahoo Finance or FRED directly (no CORS headers), and the public CORS proxies the old site relied on are gone. So:

1. GitHub Actions runs `scripts/fetch_data.py` on a schedule with the `FRED_API_KEY` repository secret.
2. It force-pushes `market.json` and `fred.json` to the orphan `data` branch (history stays one commit deep).
3. The page fetches them from `raw.githubusercontent.com`, which does allow cross-origin reads. Cache-busting query every 5 minutes.
4. Hyperliquid is queried live from the browser (it allows CORS), so HYPE and the US names update every minute.

Trigger a feed refresh by hand: **Actions → Market data feed → Run workflow**, or `gh workflow run data.yml`.

## Editing the portfolio

Open **Portfolio Editor.exe** (on the Desktop, or built into this folder). It loads `data/holdings.json` from GitHub, lets you add/remove/edit rows, and *Publish* commits the file to `main` and starts a feed run. The site updates within one to two minutes.

Fields per holding: `ticker`, `name`, `type` (`eq`/`fd`/`cr`/`cm`/`fi`/`cs`), `shares`, `avgBuy`, `ccy` (currency of `avgBuy`), `hl` (Hyperliquid symbols, first hit wins), `yahoo` (Yahoo symbols, first hit wins), `thesis`.

## Local preview

Any static server works, e.g. `python -m http.server 8765` in this folder.
