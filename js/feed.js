/* Data feed.
   Yahoo Finance and FRED do not allow browser requests from other origins, so
   a GitHub Actions job (.github/workflows/data.yml) fetches them and publishes
   market.json / fred.json to the `data` branch. raw.githubusercontent.com does
   allow cross-origin reads, so the page loads those two files directly.
   Hyperliquid has open CORS and is still queried live from the browser. */
window.Feed=(function(){
  const REPO='RealNovice/RealNovice.github.io';
  const BASE=`https://raw.githubusercontent.com/${REPO}/data/`;
  const LS_KEY='feed-cache-v1';
  const state={market:null, fred:null, loadedAt:0, error:null};
  const listeners=[];

  function bust(){ return '?v='+Math.floor(Date.now()/(5*60*1000)); } // new URL every 5 min → skips the CDN cache

  async function getJson(name){
    const r=await fetch(BASE+name+bust(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!r.ok) throw new Error(`${name} HTTP ${r.status}`);
    return r.json();
  }

  function restore(){
    try{
      const j=JSON.parse(localStorage.getItem(LS_KEY)||'null');
      if(j&&j.market){ state.market=j.market; state.fred=j.fred; state.loadedAt=j.at||0; }
    }catch(_){}
  }
  function persist(){
    try{ localStorage.setItem(LS_KEY,JSON.stringify({market:state.market,fred:state.fred,at:state.loadedAt})); }catch(_){}
  }

  async function refresh(){
    const [m,f]=await Promise.allSettled([getJson('market.json'),getJson('fred.json')]);
    let changed=false;
    if(m.status==='fulfilled'&&m.value&&m.value.quotes){ state.market=m.value; changed=true; }
    if(f.status==='fulfilled'&&f.value&&f.value.series){ state.fred=f.value; changed=true; }
    state.error=(m.status==='rejected'&&f.status==='rejected')?(m.reason&&m.reason.message||'feed unreachable'):null;
    if(changed){ state.loadedAt=Date.now(); persist(); }
    listeners.forEach(fn=>{ try{ fn(state); }catch(e){ console.warn('feed listener',e); } });
    return state;
  }

  /* Accessors used by the page ------------------------------------------- */
  function quote(sym){ return state.market&&state.market.quotes&&state.market.quotes[sym]||null; }
  function history(tk,key){ return state.market&&state.market.history&&state.market.history[tk]&&state.market.history[tk][key]||null; }
  /* FRED values, newest first — same shape fredF() used to return. */
  function fred(series,limit){
    const s=state.fred&&state.fred.series&&state.fred.series[series];
    if(!s||!s.values||!s.values.length) return null;
    return limit?s.values.slice(0,limit):s.values.slice();
  }
  function fredDate(series){ const s=state.fred&&state.fred.series&&state.fred.series[series]; return s&&s.dates&&s.dates[0]||null; }
  function marketTs(){ return state.market&&state.market.ts?state.market.ts*1000:0; }
  function fredTs(){ return state.fred&&state.fred.ts?state.fred.ts*1000:0; }
  function onUpdate(fn){ listeners.push(fn); if(state.market) fn(state); }

  /* Hyperliquid — live, direct ------------------------------------------- */
  async function hlPrices(){
    const queries=[
      {type:'metaAndAssetCtxs'},
      {type:'spotMetaAndAssetCtxs'},
      {type:'metaAndAssetCtxs',dex:'xyz'},
      {type:'metaAndAssetCtxs',dex:'km'},
      {type:'metaAndAssetCtxs',dex:'cash'}
    ];
    const prices=new Map();
    await Promise.all(queries.map(async q=>{
      try{
        const r=await fetch('https://api.hyperliquid.xyz/info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q),signal:AbortSignal.timeout(8000)});
        if(!r.ok) return;
        const data=await r.json();
        if(!Array.isArray(data)||data.length<2) return;
        const [meta,ctxs]=data;
        (meta.universe||[]).forEach((asset,i)=>{
          const nm=(asset.name||asset.coin||'').toUpperCase();
          const c=ctxs[i]; if(!c) return;
          const px=parseFloat(c.markPx||c.midPx||c.oraclePx);
          if(!isNaN(px)&&px>0&&!prices.has(nm)) prices.set(nm,{px,funding:c.funding,oracle:c.oraclePx});
        });
      }catch(_){}
    }));
    return prices;
  }

  restore();
  const ready=refresh();
  // Poll the feed every 5 minutes — that is the cadence it is rebuilt at anyway.
  setInterval(()=>refresh().catch(()=>{}),5*60*1000);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden && Date.now()-state.loadedAt>2*60*1000) refresh().catch(()=>{}); });

  return {state,ready,refresh,quote,history,fred,fredDate,marketTs,fredTs,onUpdate,hlPrices};
})();
