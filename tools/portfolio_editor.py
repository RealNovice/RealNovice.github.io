#!/usr/bin/env python3
"""
Portfolio Editor — desktop tool for lima-spielhofen.com.

Edits data/holdings.json in the GitHub repository through the GitHub CLI
(`gh`, already logged in on this machine). Publishing a change commits the
file to `main`; GitHub Pages redeploys within a minute or two and the
Holdings view on the site picks it up on its next load. Saving also kicks
the market-data workflow so a newly added ticker gets a price quickly.

Build as a Windows executable with tools/build_exe.bat (PyInstaller).
"""
import base64, json, os, subprocess, sys, threading, tkinter as tk, datetime
from tkinter import ttk, messagebox

REPO = 'RealNovice/RealNovice.github.io'
FILE_PATH = 'data/holdings.json'
SITE = 'https://lima-spielhofen.com/#finance'
TYPES = [('eq', 'Equity'), ('fd', 'Fund / ETF'), ('cr', 'Crypto'), ('cm', 'Commodity'), ('fi', 'Fixed income'), ('cs', 'Cash')]
TYPE_LABEL = dict(TYPES)
LABEL_TYPE = {v: k for k, v in TYPES}
CCYS = ['EUR', 'USD', 'GBP']

HERE = os.path.dirname(os.path.abspath(sys.argv[0]))
LOCAL_FALLBACKS = [os.path.join(HERE, 'data', 'holdings.json'), os.path.join(HERE, '..', 'data', 'holdings.json')]


# ────────────────────────── GitHub via gh ──────────────────────────
def _run(args, input_text=None, timeout=60):
    kw = {}
    if os.name == 'nt':
        kw['creationflags'] = 0x08000000  # CREATE_NO_WINDOW — no console flash from the .exe
    p = subprocess.run(['gh'] + args, capture_output=True, text=True, encoding='utf-8', input=input_text, timeout=timeout, **kw)
    if p.returncode != 0:
        raise RuntimeError((p.stderr or p.stdout or 'gh failed').strip())
    return p.stdout


def gh_available():
    try:
        _run(['auth', 'status'], timeout=20)
        return True
    except FileNotFoundError:
        return False
    except Exception:
        return False


def fetch_remote():
    out = _run(['api', f'repos/{REPO}/contents/{FILE_PATH}', '--jq', '{sha:.sha,content:.content}'])
    j = json.loads(out)
    data = json.loads(base64.b64decode(j['content']).decode('utf-8'))
    return data, j['sha']


def push_remote(data, sha, message):
    payload = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    body = json.dumps({
        'message': message,
        'content': base64.b64encode(payload.encode('utf-8')).decode('ascii'),
        'sha': sha,
        'branch': 'main',
    })
    out = _run(['api', '-X', 'PUT', f'repos/{REPO}/contents/{FILE_PATH}', '--input', '-', '--jq', '.content.sha'], input_text=body)
    return out.strip()


def trigger_feed():
    try:
        _run(['workflow', 'run', 'data.yml', '-R', REPO], timeout=30)
        return True
    except Exception:
        return False


def load_local():
    for p in LOCAL_FALLBACKS:
        if os.path.exists(p):
            with open(p, encoding='utf-8') as f:
                return json.load(f), p
    return None, None


# ────────────────────────────── UI ─────────────────────────────────
class Editor(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('Portfolio Editor — lima-spielhofen.com')
        self.geometry('1040x640')
        self.minsize(900, 560)
        self.configure(bg='#f3f1ec')
        self.holdings = []
        self.sha = None
        self.dirty = False
        self.remote_ok = False
        self._build()
        self.after(50, self.load)

    # ---- layout
    def _build(self):
        st = ttk.Style(self)
        try:
            st.theme_use('clam')
        except Exception:
            pass
        st.configure('.', background='#f3f1ec', foreground='#1b1a17', font=('Segoe UI', 10))
        st.configure('Treeview', background='#fbfaf7', fieldbackground='#fbfaf7', rowheight=24)
        st.configure('Treeview.Heading', font=('Segoe UI', 9, 'bold'))
        st.configure('TButton', padding=(10, 5))
        st.configure('Accent.TButton', padding=(14, 7), font=('Segoe UI', 10, 'bold'))
        st.configure('Status.TLabel', foreground='#5b5953')
        st.configure('Err.TLabel', foreground='#b13a2c')

        top = ttk.Frame(self, padding=(14, 10, 14, 4)); top.pack(fill='x')
        ttk.Label(top, text='Holdings', font=('Georgia', 16)).pack(side='left')
        self.status = ttk.Label(top, text='loading…', style='Status.TLabel'); self.status.pack(side='left', padx=16)
        ttk.Button(top, text='Reload from GitHub', command=self.load).pack(side='right')
        self.publish_btn = ttk.Button(top, text='Publish to website', style='Accent.TButton', command=self.publish)
        self.publish_btn.pack(side='right', padx=8)

        body = ttk.Frame(self, padding=(14, 4, 14, 10)); body.pack(fill='both', expand=True)
        body.columnconfigure(0, weight=3); body.columnconfigure(1, weight=2); body.rowconfigure(0, weight=1)

        # table
        left = ttk.Frame(body); left.grid(row=0, column=0, sticky='nsew', padx=(0, 12))
        cols = ('ticker', 'name', 'type', 'shares', 'avg', 'ccy')
        self.tree = ttk.Treeview(left, columns=cols, show='headings', selectmode='browse')
        for c, w, a in (('ticker', 70, 'w'), ('name', 210, 'w'), ('type', 90, 'w'), ('shares', 90, 'e'), ('avg', 100, 'e'), ('ccy', 50, 'w')):
            self.tree.heading(c, text={'ticker': 'Ticker', 'name': 'Name', 'type': 'Type', 'shares': 'Shares', 'avg': 'Avg. buy', 'ccy': 'Ccy'}[c])
            self.tree.column(c, width=w, anchor=a, stretch=(c == 'name'))
        sb = ttk.Scrollbar(left, orient='vertical', command=self.tree.yview); self.tree.configure(yscrollcommand=sb.set)
        self.tree.pack(side='left', fill='both', expand=True); sb.pack(side='right', fill='y')
        self.tree.bind('<<TreeviewSelect>>', lambda e: self.show_selected())

        btns = ttk.Frame(body); btns.grid(row=1, column=0, sticky='w', pady=(8, 0))
        ttk.Button(btns, text='+ Add', command=self.add_row).pack(side='left')
        ttk.Button(btns, text='Delete', command=self.delete_row).pack(side='left', padx=6)
        ttk.Button(btns, text='▲', width=3, command=lambda: self.move(-1)).pack(side='left')
        ttk.Button(btns, text='▼', width=3, command=lambda: self.move(1)).pack(side='left', padx=(4, 0))

        # form
        right = ttk.LabelFrame(body, text='Selected holding', padding=12); right.grid(row=0, column=1, rowspan=2, sticky='nsew')
        right.columnconfigure(1, weight=1)
        self.f = {}
        rows = [('ticker', 'Ticker'), ('name', 'Name'), ('type', 'Type'), ('shares', 'Shares / units'), ('avgBuy', 'Average buy price'),
                ('ccy', 'Currency of that price'), ('hl', 'Hyperliquid symbols'), ('yahoo', 'Yahoo symbols'), ('thesis', 'Thesis')]
        for i, (key, label) in enumerate(rows):
            ttk.Label(right, text=label).grid(row=i, column=0, sticky='nw', pady=3, padx=(0, 8))
            if key == 'type':
                w = ttk.Combobox(right, values=[v for _, v in TYPES], state='readonly')
            elif key == 'ccy':
                w = ttk.Combobox(right, values=CCYS, state='readonly')
            elif key == 'thesis':
                w = tk.Text(right, height=7, wrap='word', font=('Segoe UI', 10), relief='solid', bd=1)
            else:
                w = ttk.Entry(right)
            w.grid(row=i, column=1, sticky='ew' if key != 'thesis' else 'nsew', pady=3)
            self.f[key] = w
            if key == 'thesis':
                right.rowconfigure(i, weight=1)
            elif key not in ('type', 'ccy'):
                w.bind('<KeyRelease>', lambda e: self.apply_form())
            else:
                w.bind('<<ComboboxSelected>>', lambda e: self.apply_form())
        self.f['thesis'].bind('<KeyRelease>', lambda e: self.apply_form())
        hint = ('Hyperliquid / Yahoo symbols: comma-separated, first match wins.\n'
                'Leave Yahoo empty for things that only trade on Hyperliquid (HYPE).\n'
                'European ETFs: use the EUR listing, e.g. VWRL.AS, CSPX.AS, EMIM.AS.\n'
                'Metals: GC=F / SI=F (USD per oz) — enter your avg. buy in EUR per oz.')
        ttk.Label(right, text=hint, style='Status.TLabel', font=('Segoe UI', 8), justify='left').grid(row=len(rows), column=0, columnspan=2, sticky='w', pady=(10, 0))

        self.foot = ttk.Label(self, text='', style='Status.TLabel', padding=(14, 0, 14, 8)); self.foot.pack(fill='x')
        self.protocol('WM_DELETE_WINDOW', self.on_close)

    # ---- data
    def load(self):
        if self.dirty and not messagebox.askyesno('Discard changes?', 'You have unpublished changes. Reload and discard them?'):
            return
        self.set_status('loading from GitHub…')
        def work():
            try:
                if not gh_available():
                    raise RuntimeError('GitHub CLI (gh) not found or not logged in.\nInstall from https://cli.github.com and run:  gh auth login')
                data, sha = fetch_remote()
                self.after(0, lambda: self._loaded(data, sha, True))
            except Exception as e:
                data, path = load_local()
                msg = str(e)
                self.after(0, lambda: self._loaded(data, None, False, msg))
        threading.Thread(target=work, daemon=True).start()

    def _loaded(self, data, sha, remote, err=None):
        self.remote_ok = remote
        self.sha = sha
        if data is None:
            self.holdings = []
            self.set_status('could not load holdings', err=True)
            messagebox.showerror('Load failed', err or 'No holdings found.')
        else:
            self.holdings = [dict(h) for h in data.get('holdings', [])]
            self.set_status(f"{len(self.holdings)} holdings · {'GitHub' if remote else 'LOCAL copy — publishing disabled'}", err=not remote)
            if not remote and err:
                self.foot.configure(text='GitHub unreachable: ' + err.splitlines()[0][:160])
        self.dirty = False
        self.publish_btn.state(['!disabled'] if remote else ['disabled'])
        self.refresh_table()
        if self.holdings:
            first = self.tree.get_children()[0]
            self.tree.selection_set(first); self.tree.focus(first)
            self.show_selected()

    def refresh_table(self, keep=None):
        sel = keep if keep is not None else self.selected_index()
        self.tree.delete(*self.tree.get_children())
        for i, h in enumerate(self.holdings):
            self.tree.insert('', 'end', iid=str(i), values=(h.get('ticker', ''), h.get('name', ''), TYPE_LABEL.get(h.get('type', 'eq'), h.get('type', '')),
                                                          self._num(h.get('shares')), self._num(h.get('avgBuy')), h.get('ccy', 'EUR')))
        if sel is not None and 0 <= sel < len(self.holdings):
            self.tree.selection_set(str(sel)); self.tree.focus(str(sel))

    @staticmethod
    def _num(v):
        try:
            v = float(v)
            return f'{v:,.4f}'.rstrip('0').rstrip('.') if v != int(v) else f'{int(v):,}'
        except Exception:
            return ''

    def selected_index(self):
        s = self.tree.selection()
        return int(s[0]) if s else None

    def show_selected(self):
        i = self.selected_index()
        self._loading_form = True
        try:
            if i is None:
                for k, w in self.f.items():
                    self._set(w, '')
                return
            h = self.holdings[i]
            self._set(self.f['ticker'], h.get('ticker', ''))
            self._set(self.f['name'], h.get('name', ''))
            self.f['type'].set(TYPE_LABEL.get(h.get('type', 'eq'), 'Equity'))
            self._set(self.f['shares'], self._plain(h.get('shares')))
            self._set(self.f['avgBuy'], self._plain(h.get('avgBuy')))
            self.f['ccy'].set(h.get('ccy', 'EUR'))
            self._set(self.f['hl'], ', '.join(h.get('hl') or []))
            self._set(self.f['yahoo'], ', '.join(h.get('yahoo') or []))
            self._set(self.f['thesis'], h.get('thesis', ''))
        finally:
            self._loading_form = False

    @staticmethod
    def _plain(v):
        try:
            v = float(v)
            return str(int(v)) if v == int(v) else repr(v)
        except Exception:
            return ''

    @staticmethod
    def _set(w, text):
        if isinstance(w, tk.Text):
            w.delete('1.0', 'end'); w.insert('1.0', text)
        elif isinstance(w, ttk.Combobox):
            w.set(text)
        else:
            w.delete(0, 'end'); w.insert(0, text)

    @staticmethod
    def _get(w):
        return w.get('1.0', 'end').strip() if isinstance(w, tk.Text) else w.get().strip()

    def apply_form(self):
        if getattr(self, '_loading_form', False):
            return
        i = self.selected_index()
        if i is None:
            return
        h = self.holdings[i]
        h['ticker'] = self._get(self.f['ticker']).upper()
        h['name'] = self._get(self.f['name'])
        h['type'] = LABEL_TYPE.get(self.f['type'].get(), 'eq')
        h['shares'] = self._float(self._get(self.f['shares']), h.get('shares', 0))
        h['avgBuy'] = self._float(self._get(self.f['avgBuy']), h.get('avgBuy', 0))
        h['ccy'] = self.f['ccy'].get() or 'EUR'
        h['hl'] = [s.strip() for s in self._get(self.f['hl']).split(',') if s.strip()]
        h['yahoo'] = [s.strip() for s in self._get(self.f['yahoo']).split(',') if s.strip()]
        h['thesis'] = self._get(self.f['thesis'])
        self.dirty = True
        self.refresh_table(keep=i)
        self.set_status('unpublished changes')

    @staticmethod
    def _float(s, fallback):
        try:
            return float(s.replace(',', '.').replace(' ', ''))
        except Exception:
            return fallback

    # ---- row ops
    def add_row(self):
        self.holdings.append({'ticker': 'NEW', 'name': '', 'type': 'eq', 'shares': 0, 'avgBuy': 0, 'ccy': 'EUR', 'hl': [], 'yahoo': [], 'thesis': ''})
        self.dirty = True
        self.refresh_table(keep=len(self.holdings) - 1)
        self.show_selected()
        self.f['ticker'].focus_set(); self.f['ticker'].select_range(0, 'end')

    def delete_row(self):
        i = self.selected_index()
        if i is None:
            return
        if not messagebox.askyesno('Delete', f"Remove {self.holdings[i].get('ticker')} from the portfolio?"):
            return
        del self.holdings[i]
        self.dirty = True
        self.refresh_table(keep=min(i, len(self.holdings) - 1))
        self.show_selected()

    def move(self, d):
        i = self.selected_index()
        if i is None:
            return
        j = i + d
        if 0 <= j < len(self.holdings):
            self.holdings[i], self.holdings[j] = self.holdings[j], self.holdings[i]
            self.dirty = True
            self.refresh_table(keep=j)

    # ---- publish
    def validate(self):
        seen = set()
        for h in self.holdings:
            t = h.get('ticker', '').strip()
            if not t or t == 'NEW':
                return f"A holding has no ticker (row '{h.get('name') or '?'}')."
            if t in seen:
                return f'Ticker {t} appears twice.'
            seen.add(t)
            if float(h.get('shares', 0)) < 0 or float(h.get('avgBuy', 0)) < 0:
                return f'{t}: shares and price must be positive.'
            if h.get('type') != 'cs' and not h.get('hl') and not h.get('yahoo'):
                return f'{t}: give at least one Hyperliquid or Yahoo symbol so it can be priced.'
        return None

    def publish(self):
        err = self.validate()
        if err:
            messagebox.showwarning('Check the data', err); return
        if not self.remote_ok:
            messagebox.showwarning('Offline', 'GitHub is not reachable — cannot publish.'); return
        self.publish_btn.state(['disabled'])
        self.set_status('publishing…')
        data = {'updated': datetime.date.today().isoformat(), 'holdings': self.holdings}
        def work():
            try:
                new_sha = push_remote(data, self.sha, f'Holdings update ({datetime.datetime.now():%Y-%m-%d %H:%M}) via Portfolio Editor')
                feed = trigger_feed()
                self.after(0, lambda: self._published(new_sha, feed))
            except Exception as e:
                self.after(0, lambda: self._publish_failed(str(e)))
        threading.Thread(target=work, daemon=True).start()

    def _published(self, sha, feed):
        self.sha = sha; self.dirty = False
        self.publish_btn.state(['!disabled'])
        self.set_status('published ✓')
        self.foot.configure(text=f"Committed to GitHub. The site updates in about 1–2 minutes ({SITE}). "
                                 + ('Price feed refresh started.' if feed else 'Price feed will refresh on its next scheduled run.'))

    def _publish_failed(self, msg):
        self.publish_btn.state(['!disabled'])
        self.set_status('publish failed', err=True)
        if 'sha' in msg.lower() or '409' in msg:
            msg += '\n\nThe file changed on GitHub since it was loaded. Click "Reload from GitHub" and re-apply your edits.'
        messagebox.showerror('Publish failed', msg)

    def set_status(self, text, err=False):
        self.status.configure(text=text, style='Err.TLabel' if err else 'Status.TLabel')

    def on_close(self):
        if self.dirty and not messagebox.askyesno('Unpublished changes', 'You have changes that were not published. Quit anyway?'):
            return
        self.destroy()


if __name__ == '__main__':
    Editor().mainloop()
