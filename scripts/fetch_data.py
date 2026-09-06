#!/usr/bin/env python3
"""
Builds the JSON feed the site reads instead of calling Yahoo / FRED from the
browser (neither of them sends CORS headers, and every free CORS proxy has
died). Runs in GitHub Actions on a schedule; output is force-pushed to the
`data` branch and served from raw.githubusercontent.com, which does send
Access-Control-Allow-Origin: *.

Outputs (into --out, default ./out):
  market.json  Yahoo quotes (price, previous close, currency) for every symbol
               the site shows, plus Mag-7 price history for the chart modal.
  fred.json    FRED observations for every series the stressboard uses.
"""
import json, os, sys, time, urllib.request, urllib.parse, urllib.error, http.cookiejar
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(ROOT, 'out')
FRED_KEY = os.environ.get('FRED_API_KEY', '')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

# One cookie-carrying opener for everything; Yahoo wants a session cookie + crumb.
_cj = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_cj))
OPENER.addheaders = [('User-Agent', UA), ('Accept', 'application/json,text/plain,*/*')]


def get_json(url, timeout=20, tries=3):
    last = None
    for i in range(tries):
        try:
            with OPENER.open(url, timeout=timeout) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429:
                time.sleep(5 * (i + 1))
            elif e.code == 404:
                break
            else:
                time.sleep(1.5 * (i + 1))
        except Exception as e:  # noqa
            last = e
            time.sleep(1.5 * (i + 1))
    print(f'  ! {url[:100]} -> {last}', file=sys.stderr)
    return None


# ───────────────────────────── Yahoo ─────────────────────────────
_crumb = None


def yahoo_crumb():
    """Yahoo's public endpoints need a cookie (from any yahoo.com page) and a crumb."""
    global _crumb
    if _crumb:
        return _crumb
    for warm in ('https://fc.yahoo.com', 'https://finance.yahoo.com'):
        try:
            OPENER.open(warm, timeout=15).read(0)
        except urllib.error.HTTPError:
            pass  # fc.yahoo.com 404s but still sets the cookie
        except Exception:  # noqa
            continue
        if any(c.domain.endswith('yahoo.com') for c in _cj):
            break
    try:
        _crumb = OPENER.open('https://query2.finance.yahoo.com/v1/test/getcrumb', timeout=15).read().decode().strip()
    except Exception as e:  # noqa
        print('  ! crumb failed:', e, file=sys.stderr)
        _crumb = ''
    return _crumb


OVERVIEW = ['^GSPC', '^DJI', '^VIX', 'CL=F', 'BZ=F', 'GC=F', 'SI=F', 'DX-Y.NYB', 'JPY=X',
            'XLE', 'ITA', 'XLP', 'MOO', 'RB=F', 'HO=F', 'NG=F']
MAG7 = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA']
MACRO = ['^TNX', '^GDAXI', '^FTSE', '^HSI', '000300.SS', '^N225', '^BVSP', 'IMOEX.ME',
         'EURUSD=X', 'GBPUSD=X', 'CNY=X', 'BRL=X', 'RUB=X']


def holdings_symbols():
    """Yahoo symbols declared in data/holdings.json (first symbol of each row)."""
    try:
        with open(os.path.join(ROOT, 'data', 'holdings.json'), encoding='utf-8') as f:
            rows = json.load(f)['holdings']
    except Exception as e:  # noqa
        print('  ! holdings.json unreadable:', e, file=sys.stderr)
        return []
    syms = []
    for h in rows:
        for s in (h.get('yahoo') or []):
            if s and s not in syms:
                syms.append(s)
    return syms


def yahoo_chart(symbol, rng, interval):
    q = urllib.parse.quote(symbol, safe='')
    url = f'https://query2.finance.yahoo.com/v8/finance/chart/{q}?range={rng}&interval={interval}&crumb={urllib.parse.quote(yahoo_crumb())}'
    j = get_json(url)
    try:
        return j['chart']['result'][0]
    except Exception:  # noqa
        return None


def yahoo_quotes(symbols):
    """Batch quote endpoint — one request per ~40 symbols."""
    out = {}
    fields = 'regularMarketPrice,regularMarketPreviousClose,regularMarketTime,currency,exchange,fullExchangeName,shortName'
    for i in range(0, len(symbols), 40):
        chunk = symbols[i:i + 40]
        url = ('https://query2.finance.yahoo.com/v7/finance/quote?symbols=' + urllib.parse.quote(','.join(chunk), safe='')
               + f'&fields={fields}&crumb={urllib.parse.quote(yahoo_crumb())}')
        j = get_json(url)
        for r in ((j or {}).get('quoteResponse') or {}).get('result') or []:
            sym, price = r.get('symbol'), r.get('regularMarketPrice')
            if not sym or not isinstance(price, (int, float)):
                continue
            out[sym] = {
                'price': price,
                'prevClose': r.get('regularMarketPreviousClose'),
                'currency': r.get('currency'),
                'exchange': r.get('fullExchangeName') or r.get('exchange'),
                'name': r.get('shortName'),
                'time': r.get('regularMarketTime'),
            }
        time.sleep(0.5)
    # Anything the batch endpoint did not return: fall back to the chart meta.
    for s in symbols:
        if s in out:
            continue
        res = yahoo_chart(s, '5d', '1d')
        if not res:
            continue
        m = res.get('meta', {})
        price = m.get('regularMarketPrice')
        if not isinstance(price, (int, float)):
            continue
        closes = [c for c in (res.get('indicators', {}).get('quote', [{}])[0].get('close') or []) if isinstance(c, (int, float))]
        prev = m.get('chartPreviousClose') or m.get('previousClose')
        if len(closes) >= 2:
            prev = closes[-2] if abs(closes[-1] - price) < 1e-9 else closes[-1]
        out[s] = {'price': price, 'prevClose': prev, 'currency': m.get('currency'),
                  'exchange': m.get('exchangeName'), 'time': m.get('regularMarketTime')}
        time.sleep(0.5)
    return out


def yahoo_history(symbol, rng, interval):
    res = yahoo_chart(symbol, rng, interval)
    if not res:
        return None
    ts = res.get('timestamp') or []
    closes = res.get('indicators', {}).get('quote', [{}])[0].get('close') or []
    pairs = [[t, round(c, 4)] for t, c in zip(ts, closes) if isinstance(c, (int, float))]
    return pairs


def build_market():
    quotes, history = {}, {}
    symbols = []
    for s in OVERVIEW + MAG7 + MACRO + holdings_symbols():
        if s not in symbols:
            symbols.append(s)
    print(f'Yahoo: {len(symbols)} quotes')
    quotes = yahoo_quotes(symbols)
    print(f'Yahoo: {len(quotes)} returned; Mag-7 history')
    for tk in MAG7:
        h = {}
        for key, rng, itv in (('5d_15m', '5d', '15m'), ('1y_1d', '1y', '1d'), ('10y_1wk', '10y', '1wk')):
            p = yahoo_history(tk, rng, itv)
            if p:
                h[key] = p
            time.sleep(0.6)
        history[tk] = h
    return {'ts': int(time.time()), 'generated': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'quotes': quotes, 'history': history}


# ───────────────────────────── FRED ──────────────────────────────
# series_id -> number of most-recent observations the site needs
FRED_SERIES = {
    'SAHMREALTIME': 1, 'ICSA': 1, 'T10Y2Y': 1, 'BAMLH0A0HYM2': 1, 'MORTGAGE30US': 1,
    'INDPRO': 2, 'PERMIT': 2, 'UMCSENT': 1, 'CPIAUCSL': 14, 'T5YIE': 1, 'NFCI': 1,
    'WCESTUS1': 2, 'WCSSTUS1': 1, 'WCRFPUS2': 1, 'GASREGW': 1, 'DDFUELUSGULF': 1,
    'DJFUELUSGULF': 1, 'DCOILWTICO': 80, 'DCOILBRENTEU': 1, 'DHHNGSP': 1,
    'ECBMRRFR': 1, 'ECBDFR': 1, 'DEXUSEU': 1, 'CP0000EZ19M086NEST': 13, 'LRHUTTTTEZM156S': 1,
    'CSCICP02EZM460S': 1, 'CPALTT01CNM657N': 1, 'CHNPIEATI01GYM': 1, 'DEXCHUS': 1,
    'IRSTCB01JPM156N': 1, 'IRLTLT01JPM156N': 1, 'JPNCPIALLMINMEI': 13, 'DEXJPUS': 1,
    'NIKKEI225': 1, 'BOERUKM': 1, 'DEXUSUK': 1, 'GBRCPIALLMINMEI': 13, 'LRHUTTTTGBM156S': 1,
    'DGS2': 260, 'DGS10': 260, 'SP500': 80,
    'DFEDTARU': 1, 'IRLTLT01DEM156N': 1, 'IRLTLT01GBM156N': 1,
    'CPALTT01GBM657N': 1, 'CPALTT01JPM657N': 1, 'CPALTT01BRM657N': 1, 'CPALTT01RUM657N': 1,
    'IRSTCB01BRM156N': 1,
}


def fred_series(sid, limit):
    url = ('https://api.stlouisfed.org/fred/series/observations?'
           f'series_id={sid}&api_key={FRED_KEY}&sort_order=desc&limit={limit + 5}&file_type=json')
    j = get_json(url)
    if not j or 'observations' not in j:
        return None
    vals, dates = [], []
    for o in j['observations']:
        if o.get('value') in (None, '.', ''):
            continue
        try:
            vals.append(float(o['value']))
            dates.append(o['date'])
        except ValueError:
            continue
        if len(vals) >= limit:
            break
    return {'values': vals, 'dates': dates}


def build_fred():
    if not FRED_KEY:
        print('FRED_API_KEY missing — skipping FRED', file=sys.stderr)
        return None
    out = {}
    print(f'FRED: {len(FRED_SERIES)} series')
    for sid, lim in FRED_SERIES.items():
        s = fred_series(sid, lim)
        if s and s['values']:
            out[sid] = s
        time.sleep(0.2)
    return {'ts': int(time.time()), 'generated': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'series': out}


def merge_previous(name, fresh, key):
    """Keep the previous run's entries for anything that failed this time."""
    path = os.path.join(OUT, name)
    try:
        with open(path, encoding='utf-8') as f:
            prev = json.load(f)
    except Exception:  # noqa
        return fresh
    if not fresh:
        return prev
    for k, v in (prev.get(key) or {}).items():
        fresh[key].setdefault(k, v)
    if key == 'quotes':
        for tk, h in (prev.get('history') or {}).items():
            if not fresh['history'].get(tk):
                fresh['history'][tk] = h
    return fresh


def main():
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else 'all'
    if only in ('all', 'market'):
        market = merge_previous('market.json', build_market(), 'quotes')
        # keep last good histories too
        with open(os.path.join(OUT, 'market.json'), 'w', encoding='utf-8') as f:
            json.dump(market, f, separators=(',', ':'))
        print(f'market.json: {len(market["quotes"])} quotes, {sum(1 for h in market["history"].values() if h)} histories')
    if only not in ('all', 'fred'):
        return
    fred = merge_previous('fred.json', build_fred(), 'series')
    if fred:
        with open(os.path.join(OUT, 'fred.json'), 'w', encoding='utf-8') as f:
            json.dump(fred, f, separators=(',', ':'))
        print(f'fred.json: {len(fred["series"])} series')


if __name__ == '__main__':
    main()
