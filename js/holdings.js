/* Holdings view.
   The portfolio itself lives in data/holdings.json (edited with the desktop
   Portfolio Editor). Prices come from Hyperliquid live (perps/spot for the
   US names, HYPE and PAXG) and from the market feed (Yahoo, via the GitHub
   Actions job) for everything else. All values are converted into EUR. */
(function(){
  let HOLDINGS=[];
  let eurusd=null;           // USD per EUR
  let lastLive=0;

  const HOLD_TYPES={
    eq:{label:'Equity',       grad:['#2c7a4b','#8cc4a3']},
    fd:{label:'Fund',         grad:['#465a9c','#a5b0dd']},
    cr:{label:'Crypto',       grad:['#bf6d1e','#ecb877']},
    fi:{label:'Fixed Income', grad:['#3676a3','#9ec4de']},
    cm:{label:'Commodity',    grad:['#9c8433','#dccf95']},
    cs:{label:'Cash',         grad:['#8a877f','#c9c6bd']}
  };
  const CACHE_KEY='holdings-prices-v4';

  const $=id=>document.getElementById(id);
  const fmtPct=v=>`${v>=0?'+':''}${v.toFixed(1)}%`;
  const fmtNum=(v,d=2)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  function lerpHex(a,b,t){
    const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
    const [r1,g1,b1]=p(a),[r2,g2,b2]=p(b);
    const c=v=>Math.round(v).toString(16).padStart(2,'0');
    return '#'+c(r1+(r2-r1)*t)+c(g1+(g2-g1)*t)+c(b1+(b2-b1)*t);
  }
  function palette(){
    const byType={};
    HOLDINGS.forEach(h=>{ (byType[h.type]=byType[h.type]||[]).push(h); });
    const m=new Map();
    Object.entries(byType).forEach(([t,list])=>{
      const g=(HOLD_TYPES[t]||HOLD_TYPES.cs).grad;
      list.forEach((h,i)=>m.set(h.ticker,lerpHex(g[0],g[1],list.length>1?i/(list.length-1)*0.8:0)));
    });
    return m;
  }

  function toEur(px,ccy){
    if(!ccy||ccy==='EUR') return px;
    if(ccy==='USD') return px/(eurusd||1.08);
    if(ccy==='GBP') return px*1.27/(eurusd||1.08);
    if(ccy==='GBp'||ccy==='GBX') return px/100*1.27/(eurusd||1.08);
    return px;
  }

  /* ---------- render ---------- */
  function render(){
    const pie=$('holdPie'),legend=$('holdLegend'),cards=$('holdCards');
    if(!pie||!HOLDINGS.length) return;
    const colours=palette();
    const rows=HOLDINGS.map(h=>{
      const shares=+h.shares||0, buy=+h.avgBuy||0, last=(typeof h.last==='number'&&h.last>0)?h.last:buy;
      const value=shares*toEur(last,h.ccy), cost=shares*toEur(buy,h.ccy);
      const gain=buy>0?((last-buy)/buy)*100:0;
      return {...h,_value:value,_cost:cost,_gain:gain,_last:last};
    });
    const totalValue=rows.reduce((s,r)=>s+r._value,0)||1;
    const totalCost=rows.reduce((s,r)=>s+r._cost,0)||1;
    const totalGain=((totalValue-totalCost)/totalCost)*100;
    const anyLive=rows.some(r=>r._src);

    // donut
    const R=88,SW=26,C=2*Math.PI*R,MIN=0.018;
    const fr=rows.map(r=>Math.max(r._value/totalValue,0));
    const vis=fr.slice(); let deficit=0;
    vis.forEach((f,i)=>{ if(f>0&&f<MIN){ deficit+=MIN-f; vis[i]=MIN; } });
    if(deficit>0){ const el=vis.map((f,i)=>f>MIN?i:-1).filter(i=>i>=0); const tot=el.reduce((s,i)=>s+vis[i],0); el.forEach(i=>{ vis[i]-=deficit*(vis[i]/tot); }); }
    let off=0;
    pie.innerHTML=rows.map((r,i)=>{
      const len=C*vis[i]; const col=colours.get(r.ticker);
      const s=`<circle class="hold-pie-slice" r="${R}" cx="0" cy="0" fill="none" stroke="${col}" stroke-width="${SW}" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}"><title>${esc(r.ticker)} · ${esc(r.name)} — ${(fr[i]*100).toFixed(1)}% · ${fmtPct(r._gain)}</title></circle>`;
      off+=len; return s;
    }).join('');

    const centre=$('holdPieCount'),sub=$('holdPieSub');
    if(centre){
      if(!anyLive){ centre.textContent='…'; centre.className='hold-pie-center-val muted'; sub.textContent='fetching prices'; }
      else { centre.textContent=fmtPct(totalGain); centre.className='hold-pie-center-val '+(totalGain>=0?'up':'down'); sub.textContent='unrealised · EUR book'; }
    }

    const tip=r=>{
      if(r.type==='cs') return 'Cash position';
      const src=r._src||'no live price yet — showing entry';
      return `Last: ${fmtNum(r._last,r._last<10?4:2)} ${r.ccy||'EUR'}\nSource: ${src}\nEntry: ${fmtNum(+r.avgBuy)} ${r.ccy||'EUR'}\nShares: ${r.shares}`;
    };
    legend.innerHTML=rows.map(r=>{
      const pct=(r._value/totalValue*100).toFixed(1);
      const gain=r.type==='cs'?'':(r._src?`<span class="hold-legend-gain ${r._gain>=0?'up':'down'}">${fmtPct(r._gain)}</span>`:`<span class="hold-legend-gain muted">…</span>`);
      return `<div class="hold-legend-item" data-tip="${esc(tip(r))}">
        <span class="hold-legend-sw" style="background:${colours.get(r.ticker)}"></span>
        <span class="hold-legend-name"><strong>${esc(r.ticker)}</strong>${esc(r.name)}<span class="hold-legend-sub">${(HOLD_TYPES[r.type]||{}).label||''}</span></span>
        ${gain||'<span></span>'}
        <span class="hold-legend-pct">${pct}%</span>
      </div>`;
    }).join('');

    cards.innerHTML=rows.filter(r=>r.type!=='cs').map(r=>{
      const pct=(r._value/totalValue*100).toFixed(1);
      const gain=r._src?`<span class="hold-card-gain ${r._gain>=0?'up':'down'}">${fmtPct(r._gain)}</span>`:`<span class="hold-card-gain muted">…</span>`;
      return `<div class="hold-card">
        <div class="hold-card-hdr" data-tip="${esc(tip(r))}">
          <div class="hold-card-t"><span class="hold-card-tick">${esc(r.ticker)}</span><span class="hold-card-name">${esc(r.name)}</span><span class="hold-card-tag">${(HOLD_TYPES[r.type]||{}).label||''}</span></div>
          <div class="hold-card-r">${gain}<span class="hold-card-pct">${pct}%</span></div>
        </div>
        ${r.thesis?`<div class="hold-card-thesis">${esc(r.thesis)}</div>`:''}
      </div>`;
    }).join('');
  }

  /* ---------- prices ---------- */
  function applyFeed(){
    const q=Feed.quote('EURUSD=X'); if(q&&q.price>0) eurusd=q.price;
    const weekday=(()=>{const d=new Date().getDay();return d>=1&&d<=5;})();
    let touched=false;
    HOLDINGS.forEach(h=>{
      if(!h.yahoo||!h.yahoo.length) return;
      // On weekdays Yahoo's exchange print is authoritative; at weekends keep HL's 24/7 mark if we have one.
      if(h._src&&h._src.startsWith('HL')&&!weekday) return;
      for(const sym of h.yahoo){
        const r=Feed.quote(sym); if(!r||!(r.price>0)) continue;
        const target=h.ccy||'EUR';
        const px=(r.currency&&r.currency!==target)?(target==='EUR'?toEur(r.price,r.currency):r.price):r.price;
        h.last=+px.toFixed(4); h._src=`Yahoo ${sym} (${r.currency||'?'})`; h._ts=(r.time||0)*1000; touched=true; break;
      }
    });
    if(touched) render();
  }

  async function applyHL(){
    let prices;
    try{ prices=await Feed.hlPrices(); }catch(_){ return; }
    if(!prices||!prices.size) return;
    let touched=false;
    HOLDINGS.forEach(h=>{
      if(!h.hl||!h.hl.length) return;
      for(const a of h.hl){
        const p=prices.get(a.toUpperCase()); if(!p) continue;
        const target=h.ccy||'EUR';
        const px=target==='USD'?p.px:toEur(p.px,'USD');
        h.last=+px.toFixed(4); h._src=`Hyperliquid ${a}`; h._ts=Date.now(); touched=true; break;
      }
    });
    if(touched){ lastLive=Date.now(); render(); saveCache(); }
  }

  function saveCache(){
    try{ localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),eurusd,prices:Object.fromEntries(HOLDINGS.map(h=>[h.ticker,{last:h.last,src:h._src}]))})); }catch(_){}
  }
  function loadCache(){
    try{
      const j=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(!j||Date.now()-j.ts>6*3600*1000) return;
      if(j.eurusd) eurusd=j.eurusd;
      HOLDINGS.forEach(h=>{ const c=j.prices&&j.prices[h.ticker]; if(c&&c.last>0){ h.last=c.last; h._src=c.src?c.src+' · cached':null; } });
    }catch(_){}
  }

  function badge(){
    const b=$('holdLiveBadge'); if(!b) return;
    const live=HOLDINGS.filter(h=>h._src&&h.type!=='cs').length, total=HOLDINGS.filter(h=>h.type!=='cs').length;
    const ts=Feed.marketTs();
    if(live===0){ b.textContent='no prices yet'; b.className='hold-live off'; return; }
    const age=ts?Math.round((Date.now()-ts)/60000):null;
    b.textContent=`live · ${live}/${total} priced${age!==null?` · feed ${age<1?'just now':age<60?age+' min ago':Math.round(age/60)+' h ago'}`:''}`;
    b.className='hold-live on';
    b.title='Hyperliquid: live from the browser. Yahoo: refreshed by the GitHub Actions feed every 15 minutes in trading hours.';
  }

  async function refreshAll(){
    applyFeed();
    await applyHL();
    applyFeed();   // Yahoo wins on weekdays for names it covers
    render(); badge();
  }

  /* ---------- boot ---------- */
  async function loadHoldings(){
    try{
      const r=await fetch('data/holdings.json?v='+Math.floor(Date.now()/60000),{cache:'no-store'});
      const j=await r.json();
      HOLDINGS=(j.holdings||[]).map(h=>({...h,last:h.avgBuy,_src:null}));
    }catch(e){ console.error('holdings.json failed',e); HOLDINGS=[]; }
    loadCache();
    render();
    Feed.ready.then(refreshAll).catch(()=>{});
    Feed.onUpdate(()=>{ applyFeed(); badge(); });
    setInterval(()=>{ applyHL().then(badge); },60000);
    const b=$('holdLiveBadge'); if(b) b.addEventListener('click',()=>{ b.textContent='refreshing…'; Feed.refresh().then(refreshAll).catch(()=>{}); });
  }

  /* Finance sub-nav (Holdings / Stressboard) */
  const INTROS={
    'fin-holdings':"These are my current holdings. Prices come live from Hyperliquid and, for the ETFs and exchange closes, from Yahoo Finance through a scheduled feed. Everything is converted into a EUR book; the wheel is sized by market value and the centre shows the running unrealised P/L.",
    'fin-stressboard':"A one-page stress monitor: indices, rates, credit, energy and a handful of macro prints across the main economies, each colour-coded against thresholds that matter. Hover any figure for what it is and where the lines are."
  };
  function switchFinView(id){
    document.querySelectorAll('.fin-pill').forEach(p=>p.classList.toggle('active',p.dataset.view===id));
    document.querySelectorAll('.fin-view').forEach(v=>v.classList.toggle('active',v.id===id));
    const intro=$('finIntro'); if(intro&&INTROS[id]) intro.textContent=INTROS[id];
    try{ localStorage.setItem('fin-view',id); }catch(_){}
  }
  document.querySelectorAll('.fin-pill').forEach(p=>p.addEventListener('click',()=>switchFinView(p.dataset.view)));
  let initial='fin-holdings'; try{ initial=localStorage.getItem('fin-view')||initial; }catch(_){}
  switchFinView(document.getElementById(initial)?initial:'fin-holdings');

  loadHoldings();
})();
