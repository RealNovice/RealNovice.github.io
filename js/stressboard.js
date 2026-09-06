// ═══════════════════════════════════════════════════════════════
// ECONOMIC CALENDAR
// NFP = first Friday of the month 08:30 ET (computed). FOMC and CPI dates
// are the published 2026 schedules; extend the lists when new ones are out.
// ═══════════════════════════════════════════════════════════════
const FOMC_DATES=['2026-01-28','2026-03-18','2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-10-28','2026-12-09'];
const CPI_DATES=['2026-01-13','2026-02-11','2026-03-11','2026-04-10','2026-05-12','2026-06-10','2026-07-14','2026-08-12','2026-09-11','2026-10-14','2026-11-10','2026-12-10'];
function etOffset(d){ // US Eastern: DST 2nd Sunday Mar → 1st Sunday Nov
  const y=d.getUTCFullYear();
  const nth=(m,n,dow)=>{const first=new Date(Date.UTC(y,m,1));const day=1+((dow-first.getUTCDay()+7)%7)+(n-1)*7;return Date.UTC(y,m,day,7);};
  const t=d.getTime(); return (t>=nth(2,2,0)&&t<nth(10,1,0))?'-04:00':'-05:00';
}
function nfpDates(){ const out=[]; const now=new Date(); for(let k=-1;k<14;k++){ const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+k,1)); const day=1+((5-d.getUTCDay()+7)%7); out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);} return out; }
const REL=[
  ...nfpDates().map(d=>({name:'NFP RELEASE',dt:`${d}T08:30:00${etOffset(new Date(d))}`})),
  ...CPI_DATES.map(d=>({name:'CPI RELEASE',dt:`${d}T08:30:00${etOffset(new Date(d))}`})),
  ...FOMC_DATES.map(d=>({name:'FOMC DECISION',dt:`${d}T14:00:00${etOffset(new Date(d))}`})),
].map(e=>({...e,ts:new Date(e.dt).getTime()}));
const IMM=5*60000,LWIN=2*60000;let fastP=false;
function nextEv(){const n=Date.now();return REL.filter(e=>e.ts>n-LWIN).sort((a,b)=>a.ts-b.ts)[0]}
function fmtCd(ms){if(ms<0)return'JUST RELEASED';const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4),s=Math.floor(ms%6e4/1e3);if(h>48)return`${Math.floor(h/24)}d ${h%24}h`;if(h>0)return`${h}h ${m}m`;return`${m}m ${s}s`}
function updEv(){const ev=nextEv(),b=document.getElementById('evBanner'),nm=document.getElementById('evName'),dt=document.getElementById('evDate'),cd=document.getElementById('evCd');
if(!b)return;if(!ev){nm.textContent='NO UPCOMING RELEASES';cd.textContent='—';b.className='ev';return}
const now=Date.now(),df=ev.ts-now,isL=df<0&&df>-LWIN,isI=df>=0&&df<IMM;
nm.textContent=ev.name;dt.textContent=new Date(ev.ts).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
cd.textContent=isL?'LIVE NOW':fmtCd(df);const cl=isL?' live':isI?' imm':'';
b.className='ev'+cl;nm.className='ev-name'+cl;cd.className='ev-cd'+cl;
const sf=isL||isI;if(sf!==fastP){fastP=sf;['bl','bi'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.textContent=fastP?'release window':'feed';el.className='pb'+(fastP?' fast':'')})}}

// ═══════════════════════════════════════════════════════════════
// THRESHOLDS
// ═══════════════════════════════════════════════════════════════
const TH={
  sahm:{t:[{s:'concern',l:'Triggered',f:v=>v>=.5},{s:'watch',l:'Elevated',f:v=>v>=.2},{s:'normal',l:'Below trigger',f:()=>1}],fmt:v=>v.toFixed(2)},
  claims:{t:[{s:'concern',l:'Elevated',f:v=>v>=280},{s:'watch',l:'Rising',f:v=>v>=230},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`${Math.round(v)}K`},
  yc:{t:[{s:'concern',l:'Inverted',f:v=>v<0},{s:'watch',l:'Flat',f:v=>v<.5},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`${v>=0?'+':''}${v.toFixed(2)}%`},
  hy:{t:[{s:'concern',l:'Stress',f:v=>v>=600},{s:'watch',l:'Elevated',f:v=>v>=400},{s:'normal',l:'Tight',f:()=>1}],fmt:v=>`${Math.round(v)}bps`},
  mort:{t:[{s:'concern',l:'Very high',f:v=>v>=7.5},{s:'watch',l:'Elevated',f:v=>v>=6.5},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  indpro:{t:[{s:'concern',l:'Contracting',f:v=>v<-.3},{s:'watch',l:'Slowing',f:v=>v<0},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`${v>=0?'+':''}${v.toFixed(1)}%`},
  permits:{t:[{s:'concern',l:'Declining',f:v=>v.p<=-5},{s:'watch',l:'Declining',f:v=>v.p<0},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`${Math.round(v.n).toLocaleString()}K`},
  ismmfg:{t:[{s:'concern',l:'Contracting',f:v=>v<48},{s:'watch',l:'Slowing',f:v=>v<50},{s:'normal',l:'Expanding',f:()=>1}]},
  ismsvc:{t:[{s:'concern',l:'Contracting',f:v=>v<48},{s:'watch',l:'Slowing',f:v=>v<50},{s:'normal',l:'Expanding',f:()=>1}]},
  umcs:{t:[{s:'concern',l:'Pessimistic',f:v=>v<60},{s:'watch',l:'Cautious',f:v=>v<75},{s:'normal',l:'Confident',f:()=>1}],fmt:v=>v.toFixed(1)},
  vixm:{t:[{s:'concern',l:'Fearful',f:v=>v>=30},{s:'watch',l:'Elevated',f:v=>v>=20},{s:'normal',l:'Calm',f:()=>1}]},
  spx:{t:[{s:'concern',l:'Bear market',f:v=>v<=-20},{s:'watch',l:'Pullback',f:v=>v<=-5},{s:'normal',l:'Near high',f:()=>1}]},
  cpi:{t:[{s:'concern',l:'High',f:v=>v>=3.5},{s:'watch',l:'Above target',f:v=>v>=2.5},{s:'normal',l:'Near target',f:()=>1}],fmt:v=>`${v.toFixed(1)}%`},
  bei:{t:[{s:'concern',l:'Unanchored',f:v=>v>=2.8},{s:'watch',l:'Rising',f:v=>v>=2.3},{s:'normal',l:'Anchored',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  pe:{t:[{s:'concern',l:'Extreme',f:v=>v>=30},{s:'watch',l:'Elevated',f:v=>v>=23},{s:'normal',l:'Fair',f:()=>1}]},
  mktm2:{t:[{s:'concern',l:'Extreme',f:v=>v>=270},{s:'watch',l:'Elevated',f:v=>v>=220},{s:'normal',l:'Normal',f:()=>1}]},
  nfci:{t:[{s:'concern',l:'Tight',f:v=>v>=.5},{s:'watch',l:'Neutral',f:v=>v>=0},{s:'normal',l:'Loose',f:()=>1}],fmt:v=>v.toFixed(2)},
  // Oil metrics
  cstocks:{t:[{s:'concern',l:'Very low',f:v=>v.pct<=-5},{s:'watch',l:'Drawing',f:v=>v.pct<0},{s:'normal',l:'Building',f:()=>1}],fmt:v=>`${(v.n/1000).toFixed(0)}M bbl`},
  spr:{t:[{s:'concern',l:'Critical',f:v=>v<400000},{s:'watch',l:'Low',f:v=>v<500000},{s:'normal',l:'Adequate',f:()=>1}],fmt:v=>`${(v/1000).toFixed(0)}M bbl`},
  prod:{t:[{s:'normal',l:'Record',f:v=>v>=13000},{s:'normal',l:'Strong',f:v=>v>=12000},{s:'watch',l:'Declining',f:()=>1}],fmt:v=>`${(v/1000).toFixed(1)}M bpd`},
  gas:{t:[{s:'concern',l:'Very high',f:v=>v>=4.5},{s:'watch',l:'Elevated',f:v=>v>=3.5},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`$${v.toFixed(3)}/gal`},
  diesel:{t:[{s:'concern',l:'Very high',f:v=>v>=4},{s:'watch',l:'Elevated',f:v=>v>=3},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`$${v.toFixed(3)}/gal`},
  jet:{t:[{s:'concern',l:'Very high',f:v=>v>=3.5},{s:'watch',l:'Elevated',f:v=>v>=2.5},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`$${v.toFixed(3)}/gal`},
  wtispot:{t:[{s:'concern',l:'Spike',f:v=>v>=100},{s:'watch',l:'Elevated',f:v=>v>=80},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`$${v.toFixed(2)}`},
  brentspot:{t:[{s:'concern',l:'Spike',f:v=>v>=110},{s:'watch',l:'Elevated',f:v=>v>=85},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`$${v.toFixed(2)}`},
  // EU
  ecbrate:{t:[{s:'concern',l:'Very tight',f:v=>v>=4},{s:'watch',l:'Tight',f:v=>v>=2.5},{s:'normal',l:'Accommodative',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  eurusd:{t:[{s:'concern',l:'Weak EUR',f:v=>v<=1.0},{s:'watch',l:'Under pressure',f:v=>v<=1.05},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>v.toFixed(4)},
  eucpi:{t:[{s:'concern',l:'Hot',f:v=>v>=4},{s:'watch',l:'Above target',f:v=>v>=2.5},{s:'normal',l:'Near target',f:()=>1}],fmt:v=>`${v.toFixed(1)}%`},
  euunemp:{t:[{s:'concern',l:'High',f:v=>v>=8},{s:'watch',l:'Elevated',f:v=>v>=7},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`${v.toFixed(1)}%`},
  euconf:{t:[{s:'concern',l:'Pessimistic',f:v=>v<=-15},{s:'watch',l:'Cautious',f:v=>v<=-5},{s:'normal',l:'Confident',f:()=>1}],fmt:v=>v.toFixed(1)},
  eupmi:{t:[{s:'concern',l:'Contracting',f:v=>v<48},{s:'watch',l:'Slowing',f:v=>v<50},{s:'normal',l:'Expanding',f:()=>1}]},
  bund:{t:[{s:'concern',l:'Stress',f:v=>v>=250},{s:'watch',l:'Elevated',f:v=>v>=150},{s:'normal',l:'Stable',f:()=>1}]},
  // China
  cncpi:{t:[{s:'concern',l:'Deflation',f:v=>v<0},{s:'watch',l:'Low',f:v=>v<1},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`${v.toFixed(1)}%`},
  cnppi:{t:[{s:'concern',l:'Deflation',f:v=>v<-3},{s:'watch',l:'Falling',f:v=>v<0},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`${v.toFixed(1)}%`},
  cny:{t:[{s:'concern',l:'Weak CNY',f:v=>v>=7.3},{s:'watch',l:'Depreciating',f:v=>v>=7.1},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>v.toFixed(4)},
  cnpmi:{t:[{s:'concern',l:'Contracting',f:v=>v<48},{s:'watch',l:'Slowing',f:v=>v<50},{s:'normal',l:'Expanding',f:()=>1}]},
  cxpmi:{t:[{s:'concern',l:'Contracting',f:v=>v<48},{s:'watch',l:'Slowing',f:v=>v<50},{s:'normal',l:'Expanding',f:()=>1}]},
  cnfx:{t:[{s:'concern',l:'Low',f:v=>v<2.8},{s:'watch',l:'Declining',f:v=>v<3.0},{s:'normal',l:'Adequate',f:()=>1}]},
  // Japan
  bojrate:{t:[{s:'watch',l:'Tightening',f:v=>v>0.25},{s:'normal',l:'Accommodative',f:v=>v>=0},{s:'concern',l:'Negative',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  jgb:{t:[{s:'concern',l:'Spiking',f:v=>v>=1.5},{s:'watch',l:'Rising',f:v=>v>=1.0},{s:'normal',l:'Controlled',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  jpcpi:{t:[{s:'concern',l:'High',f:v=>v>=4},{s:'watch',l:'Above target',f:v=>v>=2.5},{s:'normal',l:'Near target',f:()=>1}],fmt:v=>v.toFixed(1)},
  jpyusd:{t:[{s:'concern',l:'Weak JPY',f:v=>v>=155},{s:'watch',l:'Depreciating',f:v=>v>=145},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>v.toFixed(2)},
  nikkei:{t:[{s:'normal',l:'Bull',f:v=>v>=35000},{s:'normal',l:'Stable',f:v=>v>=30000},{s:'watch',l:'Declining',f:()=>1}],fmt:v=>Math.round(v).toLocaleString()},
  tankan:{t:[{s:'concern',l:'Pessimistic',f:v=>v<0},{s:'watch',l:'Cautious',f:v=>v<10},{s:'normal',l:'Optimistic',f:()=>1}]},
  // UK
  boerate:{t:[{s:'concern',l:'Very tight',f:v=>v>=5},{s:'watch',l:'Tight',f:v=>v>=4},{s:'normal',l:'Moderate',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  gbpusd:{t:[{s:'concern',l:'Weak GBP',f:v=>v<=1.15},{s:'watch',l:'Under pressure',f:v=>v<=1.22},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>v.toFixed(4)},
  ukcpi:{t:[{s:'concern',l:'Hot',f:v=>v>=5},{s:'watch',l:'Above target',f:v=>v>=3},{s:'normal',l:'Near target',f:()=>1}],fmt:v=>v.toFixed(1)},
  ukuem:{t:[{s:'concern',l:'High',f:v=>v>=5},{s:'watch',l:'Rising',f:v=>v>=4.5},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`${v.toFixed(1)}%`},
  ukpmi:{t:[{s:'concern',l:'Contracting',f:v=>v<48},{s:'watch',l:'Slowing',f:v=>v<50},{s:'normal',l:'Expanding',f:()=>1}]},
  gilt:{t:[{s:'concern',l:'Spiking',f:v=>v>=5},{s:'watch',l:'Elevated',f:v=>v>=4.5},{s:'normal',l:'Normal',f:()=>1}]},
  // ── Borrowing rates (US + EU) ───────────────────────────────────
  ccrate:  {t:[{s:'concern',l:'Punitive',f:v=>v>=22},{s:'watch',l:'Elevated',f:v=>v>=18},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`${v.toFixed(1)}%`},
  autoloan:{t:[{s:'concern',l:'Very high',f:v=>v>=8.5},{s:'watch',l:'Elevated',f:v=>v>=7},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  eumort:  {t:[{s:'concern',l:'Very high',f:v=>v>=4.5},{s:'watch',l:'Elevated',f:v=>v>=3.5},{s:'normal',l:'Moderate',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  euccrate:{t:[{s:'concern',l:'Punitive',f:v=>v>=9},{s:'watch',l:'Elevated',f:v=>v>=7},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  euauto:  {t:[{s:'concern',l:'Very high',f:v=>v>=7.5},{s:'watch',l:'Elevated',f:v=>v>=6},{s:'normal',l:'Normal',f:()=>1}],fmt:v=>`${v.toFixed(2)}%`},
  // ── Energy benchmarks ──────────────────────────────────────────
  cnsolar: {t:[{s:'concern',l:'Glut',f:v=>v<=5},{s:'watch',l:'Soft',f:v=>v<=8},{s:'normal',l:'Healthy',f:()=>1}],fmt:v=>`$${v.toFixed(1)}/kg`},
  euwind:  {t:[{s:'concern',l:'High',f:v=>v>=100},{s:'watch',l:'Elevated',f:v=>v>=80},{s:'normal',l:'Competitive',f:()=>1}],fmt:v=>`€${Math.round(v)}`},
  eucarb:  {t:[{s:'concern',l:'High',f:v=>v>=100},{s:'watch',l:'Elevated',f:v=>v>=80},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`€${Math.round(v)}`},
  libat:   {t:[{s:'concern',l:'Crash',f:v=>v<=70000},{s:'watch',l:'Soft',f:v=>v<=90000},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>Math.round(v).toLocaleString()},
  ttf:     {t:[{s:'concern',l:'Spike',f:v=>v>=60},{s:'watch',l:'Elevated',f:v=>v>=40},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`€${Math.round(v)}`},
  jkm:     {t:[{s:'concern',l:'Spike',f:v=>v>=18},{s:'watch',l:'Elevated',f:v=>v>=13},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`$${v.toFixed(1)}`},
  eupow:   {t:[{s:'concern',l:'Spike',f:v=>v>=140},{s:'watch',l:'Elevated',f:v=>v>=100},{s:'normal',l:'Stable',f:()=>1}],fmt:v=>`€${Math.round(v)}`},
  uran:    {t:[{s:'normal',l:'Strong',f:v=>v>=70},{s:'watch',l:'Soft',f:v=>v>=50},{s:'concern',l:'Weak',f:()=>1}],fmt:v=>`$${Math.round(v)}`},
};
function evSt(k,v){
  // Defensive — if a config key is missing, fall back to a neutral verdict
  // rather than throwing and aborting the whole eval pass.
  const cfg=TH[k]; if(!cfg||!cfg.t) return {status:'normal',label:'—'};
  for(const t of cfg.t) if(t.f(v)) return {status:t.s, label:t.l};
  return {status:'normal',label:'Normal'};
}
function setM(id,fmt,st,lb){const d=document.getElementById(`d-${id}`),v=document.getElementById(`v-${id}`),s=document.getElementById(`s-${id}`);if(d)d.className=`md ${st}`;if(v){v.className=`mv ${st}`;v.textContent=fmt}if(s)s.textContent=lb}

// ═══════════════════════════════════════════════════════════════
// DATA — everything below reads the feed (see js/feed.js)
// ═══════════════════════════════════════════════════════════════
async function fredF(series,limit=3){
  const v=Feed.fred(series,limit);
  if(!v||!v.length) throw new Error(`FRED ${series} not in feed`);
  return v;
}
// Yahoo symbols → price-cell ids
const YH_RAW={
  '^GSPC':'spx','^DJI':'dji','^VIX':'vix',
  'CL=F':'wti','BZ=F':'brent','GC=F':'gold',
  'DX-Y.NYB':'dxy','JPY=X':'jpy',
  'XLE':'xle','ITA':'ita','XLP':'xlp','MOO':'moo',
  'RB=F':'rbob','HO=F':'ho','NG=F':'natgas'
};
const OIL_MIRRORS={'wti':'o-wti','brent':'o-brent','xle':'o-xle'};
let prevPr={};

function pollYH(){
  const entries=Object.entries(YH_RAW);
  let ok=0;
  entries.forEach(([sym,id])=>{
    const q=Feed.quote(sym);
    if(q&&isFinite(q.price)){ ok++; updPr(id,q.price,q.prevClose,q.time); if(id==='vix'){const iv=document.getElementById('i-vix');if(iv){iv.value=q.price.toFixed(1);}} }
    else { const el=document.getElementById(`t-${id}`); if(el){el.textContent='no data';el.className='pstale'} }
  });
  setYhSt(ok===0?'error':ok<entries.length?'stale':'live');
  evalManual();
  refreshMacroSnapshot();
}

function updPr(id,price,prevClose,qtime){
  const pE=document.getElementById(`p-${id}`),cE=document.getElementById(`c-${id}`),tE=document.getElementById(`t-${id}`);
  if(!pE)return;const old=prevPr[id],dir=old?(price>old?'up':price<old?'down':''):'';prevPr[id]=price;
  // Index points often run to 4–5 digits; use thousand-separators for readability,
  // but keep small prices (sub-1000) on plain toFixed so spacing stays tight.
  const fmt = price>=1000
    ? price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
    : price.toFixed(2);
  pE.textContent=fmt;pE.className=`pval ${dir}`;pE.classList.add('tick-f');setTimeout(()=>pE.classList.remove('tick-f'),200);
  if(prevClose&&cE){const d=price-prevClose,pct=(d/prevClose)*100;cE.textContent=`${d>=0?'+':''}${d.toFixed(2)} (${pct>=0?'+':''}${pct.toFixed(2)}%)`;cE.className=`pchg ${pct>=0?'up':'down'}`}
  if(tE){const d=qtime?new Date(qtime*1000):new Date();tE.textContent=d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});tE.className='ptime'}
  // Mirror to oil tab (skip if already a mirror target to prevent recursion)
  if(OIL_MIRRORS[id]&&!id.startsWith('o-'))updPr(OIL_MIRRORS[id],price,prevClose);
  // Store for spread calcs
  if(id==='wti')oilPrices.wti=price;if(id==='brent')oilPrices.brent=price;
  if(id==='rbob')oilPrices.rbob=price;if(id==='ho')oilPrices.ho=price;
  if(oilPrices.wti&&oilPrices.brent)calcOilSpreads();

  // Cross-asset strip — JPY/DXY day-change cells under the yield curve.
  if(id==='jpy' || id==='dxy'){
    const stripEl=document.getElementById(id==='jpy'?'jpyStrip':'dxyStrip');
    if(stripEl){
      const dpct = prevClose ? ((price-prevClose)/prevClose)*100 : 0;
      const sign = dpct>=0?'+':'';
      stripEl.textContent=`${price.toFixed(2)} (${sign}${dpct.toFixed(2)}%)`;
      stripEl.className='yc-strip-val '+(Math.abs(dpct)<.05?'':(dpct>0?'up':'down'));
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// OIL SPREADS & HYPERLIQUID
// ═══════════════════════════════════════════════════════════════
const oilPrices={wti:null,brent:null,rbob:null,ho:null};

function calcOilSpreads(){
  // WTI-Brent spread (the crack spread row was retired with the energy ETF block).
  if(oilPrices.wti&&oilPrices.brent){
    const sp=oilPrices.wti-oilPrices.brent;
    const el=document.getElementById('oilSpread');
    if(el){el.textContent=`${sp>=0?'+':''}${sp.toFixed(2)} $/bbl`;
      el.className=`osp-val ${sp>0?'contango':sp<-2?'backw':'neutral'}`}
  }
}

// Hyperliquid API — no CORS issues
const HL_DEXES=[
  {dex:'xyz',coins:{'xyz:CL':'xyzCL','xyz:BRENTOIL':'xyzBRENT'}},
  {dex:'km',coins:{'km:USOIL':'kmUSOIL'}},
  {dex:'cash',coins:{'cash:WTI':'cashWTI'}},
];

async function fetchHL(){
  for(const{dex,coins}of HL_DEXES){
    try{
      const r=await fetch('https://api.hyperliquid.xyz/info',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'metaAndAssetCtxs',dex}),
        signal:AbortSignal.timeout(8000)
      });
      if(!r.ok)continue;
      const[meta,ctxs]=await r.json();
      const universe=meta.universe||[];
      universe.forEach((asset,i)=>{
        const name=asset.name||asset.coin||'';
        const mapped=coins[name];
        if(!mapped||!ctxs[i])return;
        const c=ctxs[i];
        const markEl=document.getElementById(`hl-m-${mapped}`);
        const fundEl=document.getElementById(`hl-f-${mapped}`);
        const oracleEl=document.getElementById(`hl-o-${mapped}`);
        if(markEl){markEl.textContent=`$${parseFloat(c.markPx).toFixed(2)}`}
        if(c.funding!==undefined&&fundEl){
          const fr=parseFloat(c.funding)*100;
          fundEl.textContent=`${fr>=0?'+':''}${fr.toFixed(4)}%`;
          fundEl.className=`hl-funding ${fr>0.005?'pos':fr<-0.005?'neg':'neutral'}`}
        if(c.oraclePx&&oracleEl){oracleEl.textContent=`oracle: $${parseFloat(c.oraclePx).toFixed(2)}`}
      });
    }catch(e){console.warn(`HL ${dex} fail`,e)}
  }
  const hb=document.getElementById('hlBadge'); if(hb) hb.textContent='HYPERLIQUID ✓';
}

function setYhSt(st){const d=document.getElementById('yhDot'),l=document.getElementById('yhLabel');
  const m={live:['live','LIVE'],fetching:['live','...'],stale:['stale','STALE'],error:['err','ERR'],idle:['','IDLE']};
  const[c,t]=m[st]||m.idle;d.className=`yh-dot ${c}`;l.textContent=t}

// ═══════════════════════════════════════════════════════════════
// FETCH ALL (FRED)
// ═══════════════════════════════════════════════════════════════
async function fetchAll(){
  const btn=document.getElementById('refreshBtn');btn.disabled=true;btn.textContent='Loading...';
  if(fetchAll.userTriggered){ try{ await Feed.refresh(); }catch(_){} pollYH(); }
  const run=async(id,fn)=>{try{await fn()}catch(e){setM(id,'ERR','watch','fetch failed')}};
  await Promise.all([
    run('sahm',async()=>{const d=await fredF('SAHMREALTIME',1);const v=d[0];const{status,label}=evSt('sahm',v);setM('sahm',TH.sahm.fmt(v),status,label)}),
    run('claims',async()=>{const d=await fredF('ICSA',1);const v=d[0]/1000;const{status,label}=evSt('claims',v);setM('claims',TH.claims.fmt(v),status,label)}),
    run('yc',async()=>{const d=await fredF('T10Y2Y',1);const v=d[0];const{status,label}=evSt('yc',v);setM('yc',TH.yc.fmt(v),status,label)}),
    run('hy',async()=>{const d=await fredF('BAMLH0A0HYM2',1);const v=d[0];const{status,label}=evSt('hy',v);setM('hy',TH.hy.fmt(v),status,label)}),
    run('mort',async()=>{const d=await fredF('MORTGAGE30US',1);const v=d[0];const{status,label}=evSt('mort',v);setM('mort',TH.mort.fmt(v),status,label)}),
    run('indpro',async()=>{const d=await fredF('INDPRO',2);const v=((d[0]-d[1])/d[1])*100;const{status,label}=evSt('indpro',v);setM('indpro',TH.indpro.fmt(v),status,label)}),
    run('permits',async()=>{const d=await fredF('PERMIT',2);const n=d[0]/1000,p=((d[0]-d[1])/d[1])*100;const{status,label}=evSt('permits',{n,p});setM('permits',TH.permits.fmt({n,p}),status,label)}),
    run('umcs',async()=>{const d=await fredF('UMCSENT',1);const v=d[0];const{status,label}=evSt('umcs',v);setM('umcs',TH.umcs.fmt(v),status,label)}),
    run('cpi',async()=>{const d=await fredF('CPIAUCSL',14);const v=((d[0]-d[12])/d[12])*100;const{status,label}=evSt('cpi',v);setM('cpi',TH.cpi.fmt(v),status,label)}),
    run('bei',async()=>{const d=await fredF('T5YIE',1);const v=d[0];const{status,label}=evSt('bei',v);setM('bei',TH.bei.fmt(v),status,label)}),
    run('nfci',async()=>{const d=await fredF('NFCI',1);const v=d[0];const{status,label}=evSt('nfci',v);setM('nfci',TH.nfci.fmt(v),status,label)}),
    // Oil FRED metrics
    run('cstocks',async()=>{const d=await fredF('WCESTUS1',2);const n=d[0],pct=((d[0]-d[1])/d[1])*100;const{status,label}=evSt('cstocks',{n,pct});setM('cstocks',TH.cstocks.fmt({n,pct}),status,label)}),
    run('spr',async()=>{const d=await fredF('WCSSTUS1',1);const v=d[0];const{status,label}=evSt('spr',v);setM('spr',TH.spr.fmt(v),status,label)}),
    run('prod',async()=>{const d=await fredF('WCRFPUS2',1);const v=d[0];const{status,label}=evSt('prod',v);setM('prod',TH.prod.fmt(v),status,label)}),
    run('gas',async()=>{const d=await fredF('GASREGW',1);const v=d[0];const{status,label}=evSt('gas',v);setM('gas',TH.gas.fmt(v),status,label)}),
    run('diesel',async()=>{const d=await fredF('DDFUELUSGULF',1);const v=d[0];const{status,label}=evSt('diesel',v);setM('diesel',TH.diesel.fmt(v),status,label)}),
    run('jet',async()=>{const d=await fredF('DJFUELUSGULF',1);const v=d[0];const{status,label}=evSt('jet',v);setM('jet',TH.jet.fmt(v),status,label)}),
    run('wtispot',async()=>{const d=await fredF('DCOILWTICO',1);const v=d[0];const{status,label}=evSt('wtispot',v);setM('wtispot',TH.wtispot.fmt(v),status,label)}),
    run('brentspot',async()=>{const d=await fredF('DCOILBRENTEU',1);const v=d[0];const{status,label}=evSt('brentspot',v);setM('brentspot',TH.brentspot.fmt(v),status,label)}),
    // Henry Hub spot → oil tab HH cell
    (async()=>{try{const d=await fredF('DHHNGSP',1);if(d[0])updPr('o-hh',d[0],null)}catch(e){}})(),
    // EU metrics
    run('ecbrate',async()=>{const d=await fredF('ECBMRRFR',1);const v=d[0];const{status,label}=evSt('ecbrate',v);setM('ecbrate',TH.ecbrate.fmt(v),status,label)}),
    run('eurusd',async()=>{const d=await fredF('DEXUSEU',1);const v=d[0];const{status,label}=evSt('eurusd',v);setM('eurusd',TH.eurusd.fmt(v),status,label)}),
    run('eucpi',async()=>{const d=await fredF('CP0000EZ19M086NEST',13);const v=((d[0]-d[12])/d[12])*100;const{status,label}=evSt('eucpi',v);setM('eucpi',TH.eucpi.fmt(v),status,label)}),
    run('euunemp',async()=>{const d=await fredF('LRHUTTTTEZM156S',1);const v=d[0];const{status,label}=evSt('euunemp',v);setM('euunemp',TH.euunemp.fmt(v),status,label)}),
    run('euconf',async()=>{const d=await fredF('CSCICP02EZM460S',1);const v=d[0];const{status,label}=evSt('euconf',v);setM('euconf',TH.euconf.fmt(v),status,label)}),
    // China metrics
    run('cncpi',async()=>{const d=await fredF('CPALTT01CNM657N',1);const v=d[0];const{status,label}=evSt('cncpi',v);setM('cncpi',TH.cncpi.fmt(v),status,label)}),
    run('cnppi',async()=>{const d=await fredF('CHNPIEATI01GYM',1);const v=d[0];const{status,label}=evSt('cnppi',v);setM('cnppi',TH.cnppi.fmt(v),status,label)}),
    run('cny',async()=>{const d=await fredF('DEXCHUS',1);const v=d[0];const{status,label}=evSt('cny',v);setM('cny',TH.cny.fmt(v),status,label)}),
    // Japan metrics
    run('bojrate',async()=>{const d=await fredF('IRSTCB01JPM156N',1);const v=d[0];const{status,label}=evSt('bojrate',v);setM('bojrate',TH.bojrate.fmt(v),status,label)}),
    run('jgb',async()=>{const d=await fredF('IRLTLT01JPM156N',1);const v=d[0];const{status,label}=evSt('jgb',v);setM('jgb',TH.jgb.fmt(v),status,label)}),
    run('jpcpi',async()=>{const d=await fredF('JPNCPIALLMINMEI',2);const v=((d[0]-d[1])/d[1])*100;const{status,label}=evSt('jpcpi',v);setM('jpcpi',TH.jpcpi.fmt(v),status,label)}),
    run('jpyusd',async()=>{const d=await fredF('DEXJPUS',1);const v=d[0];const{status,label}=evSt('jpyusd',v);setM('jpyusd',TH.jpyusd.fmt(v),status,label)}),
    run('nikkei',async()=>{const d=await fredF('NIKKEI225',1);const v=d[0];const{status,label}=evSt('nikkei',v);setM('nikkei',TH.nikkei.fmt(v),status,label)}),
    // UK metrics
    run('boerate',async()=>{const d=await fredF('BOERUKM',1);const v=d[0];const{status,label}=evSt('boerate',v);setM('boerate',TH.boerate.fmt(v),status,label)}),
    run('gbpusd',async()=>{const d=await fredF('DEXUSUK',1);const v=d[0];const{status,label}=evSt('gbpusd',v);setM('gbpusd',TH.gbpusd.fmt(v),status,label)}),
    run('ukcpi',async()=>{const d=await fredF('GBRCPIALLMINMEI',13);const v=((d[0]-d[12])/d[12])*100;const{status,label}=evSt('ukcpi',v);setM('ukcpi',TH.ukcpi.fmt(v),status,label)}),
    run('ukuem',async()=>{const d=await fredF('LRHUTTTTGBM156S',1);const v=d[0];const{status,label}=evSt('ukuem',v);setM('ukuem',TH.ukuem.fmt(v),status,label)}),
  ]);
  evalManual();updSum();fetchYC();
  document.getElementById('ts').textContent=new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  btn.disabled=false;btn.textContent='Refresh';
  feedNote();
}

// ═══════════════════════════════════════════════════════════════
// MANUAL METRICS
// ═══════════════════════════════════════════════════════════════
function evalManual(){[
  {id:'vixm',inp:'vix',cfg:'vixm'},{id:'spx',inp:'spx',cfg:'spx'},
  {id:'pe',inp:'pe',cfg:'pe'},{id:'mktm2',inp:'mktm2',cfg:'mktm2'},
  // Borrowing rates (US + EU)
  {id:'ccrate',inp:'ccrate',cfg:'ccrate'},
  {id:'autoloan',inp:'autoloan',cfg:'autoloan'},
  {id:'eumort',inp:'eumort',cfg:'eumort'},
  {id:'euccrate',inp:'euccrate',cfg:'euccrate'},
  {id:'euauto',inp:'euauto',cfg:'euauto'},
  // Energy benchmarks
  {id:'cnsolar',inp:'cnsolar',cfg:'cnsolar'},{id:'euwind',inp:'euwind',cfg:'euwind'},
  {id:'eucarb',inp:'eucarb',cfg:'eucarb'},{id:'libat',inp:'libat',cfg:'libat'},
  {id:'ttf',inp:'ttf',cfg:'ttf'},{id:'jkm',inp:'jkm',cfg:'jkm'},
  {id:'eupow',inp:'eupow',cfg:'eupow'},{id:'uran',inp:'uran',cfg:'uran'},
].forEach(m=>{
  const inp=document.getElementById(`i-${m.inp}`),dot=document.getElementById(`d-${m.id}`),stat=document.getElementById(`s-${m.id}`);
  if(!inp)return;const v=parseFloat(inp.value);if(isNaN(v))return;
  const{status,label}=evSt(m.cfg,v);if(dot)dot.className=`md ${status}`;
  inp.style.color=`var(--${status==='concern'?'red':status==='watch'?'yellow':'green'})`;
  if(stat)stat.textContent=label});updSum()}

function updSum(){
  // Count status dots across the new US stress grid + borrowing rates
  // (the old #pan-0 carousel is gone). Same colour buckets, new selector.
  let c=0,w=0,n=0;
  document.querySelectorAll('.us-stress-col .md, .gp .md').forEach(d=>{
    if(d.classList.contains('concern'))c++;
    else if(d.classList.contains('watch'))w++;
    else if(d.classList.contains('normal'))n++;
  });
  const cC=document.getElementById('cC'),cW=document.getElementById('cW'),cN=document.getElementById('cN');
  if(cC)cC.textContent=`${c} concern`;
  if(cW)cW.textContent=`${w} watch`;
  if(cN)cN.textContent=`${n} normal`;
}

// ═══════════════════════════════════════════════════════════════
// YIELD CURVE
// ═══════════════════════════════════════════════════════════════
async function fetchYC(){try{
  const[d2,d10]=await Promise.all([fredF('DGS2',260),fredF('DGS10',260)]);
  if(!d2||!d10)return;const y2=d2.slice().reverse(),y10=d10.slice().reverse();
  const len=Math.min(y2.length,y10.length),a2=y2.slice(-len),a10=y10.slice(-len);
  const c2=a2[a2.length-1],c10=a10[a10.length-1],sp=c10-c2;
  const sE=document.getElementById('ycSV'),sL=document.getElementById('ycSL');
  sE.textContent=`${sp>=0?'+':''}${sp.toFixed(2)}%`;
  if(sp<0){sE.className='yc-sv inv';sL.textContent='INVERTED'}else if(sp<.5){sE.className='yc-sv flat';sL.textContent='FLAT'}else{sE.className='yc-sv ok';sL.textContent='NORMAL'}
  const p2=a2[a2.length-2],p10=a10[a10.length-2];
  const e2=document.getElementById('y2C'),e10=document.getElementById('y10C');
  e2.textContent=`${c2.toFixed(2)}%`;e10.textContent=`${c10.toFixed(2)}%`;
  e2.className=`yc-cv ${c2>p2?'rising':c2<p2?'falling':''}`;e10.className=`yc-cv ${c10>p10?'rising':c10<p10?'falling':''}`;
  drawSp('sp2y',a2,'rgba(74,158,255,.8)');drawSp('sp10y',a10,'rgba(184,134,11,.8)');

  // Day-over-day change in basis points. Anything >=15bp is a catastrophic
  // intraday move on a benchmark yield (think Aug-2024-style sell-off, or
  // the 2022 Truss episode for Gilts). 5–15bp is "watch", <5bp normal.
  const setDC = (id, prev, cur) => {
    const el=document.getElementById(id); if(!el) return;
    const bp=(cur-prev)*100; const abs=Math.abs(bp);
    const sign=bp>=0?'+':'';
    const cls=abs>=15?'shock':abs>=5?(bp>=0?'up':'down'):'';
    el.className='yc-dc '+cls;
    const tag=abs>=15?' · SHOCK':'';
    el.textContent=`Δ today: ${sign}${bp.toFixed(1)}bp${tag}`;
  };
  setDC('y2DC',  p2,  c2);
  setDC('y10DC', p10, c10);

  // Stash latest series so the cross-asset correlation block can read them
  window.__y2Series=a2; window.__y10Series=a10;
  refreshOilSpxRho().catch(()=>{});
}catch(e){console.error('YC fail',e)}}

// Pearson 30-day correlation between WTI and S&P 500 daily returns.
// Negative reading = oil shock + risk-off (1970s/2022 regime).
async function refreshOilSpxRho(){
  try{
    const cell=document.getElementById('oilSpxRho'); if(!cell) return;
    const [wti, spx] = await Promise.all([
      fredF('DCOILWTICO', 80),
      fredF('SP500', 80)
    ]);
    if(!wti||!spx){ cell.textContent='—'; return; }
    const w=wti.slice().reverse().map(v=>+v).filter(v=>!isNaN(v));
    const s=spx.slice().reverse().map(v=>+v).filter(v=>!isNaN(v));
    const n=Math.min(w.length, s.length, 31); if(n<10){ cell.textContent='—'; return; }
    const wA=w.slice(-n), sA=s.slice(-n);
    const wR=[], sR=[];
    for(let i=1;i<n;i++){ wR.push((wA[i]-wA[i-1])/wA[i-1]); sR.push((sA[i]-sA[i-1])/sA[i-1]); }
    const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
    const mw=mean(wR), ms=mean(sR);
    let num=0, dw=0, ds=0;
    for(let i=0;i<wR.length;i++){
      const a=wR[i]-mw, b=sR[i]-ms;
      num+=a*b; dw+=a*a; ds+=b*b;
    }
    const rho=num/Math.sqrt(dw*ds);
    cell.textContent=`${rho>=0?'+':''}${rho.toFixed(2)}`;
    cell.className='yc-strip-val '+(rho<=-0.3?'up':rho>=0.3?'down':'');
  }catch(e){ /* swallow */ }
}

function drawSp(id,data,color){const svg=document.getElementById(id);if(!svg)return;svg.innerHTML='';
const W=200,H=48,P=4,min=Math.min(...data)-.05,max=Math.max(...data)+.05,rng=max-min||1;
const tX=i=>P+(i/(data.length-1))*(W-P*2),tY=v=>H-P-((v-min)/rng)*(H-P*2);
const pts=data.map((v,i)=>`${tX(i).toFixed(1)},${tY(v).toFixed(1)}`).join(' ');
if(min<0&&max>0){const l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',P);l.setAttribute('x2',W-P);l.setAttribute('y1',tY(0));l.setAttribute('y2',tY(0));l.setAttribute('class','spark-zero');svg.appendChild(l)}
const ap=`M${tX(0)},${H-P} `+data.map((v,i)=>`L${tX(i).toFixed(1)},${tY(v).toFixed(1)}`).join(' ')+` L${tX(data.length-1)},${H-P} Z`;
const a=document.createElementNS('http://www.w3.org/2000/svg','path');a.setAttribute('d',ap);a.setAttribute('fill',color);a.setAttribute('class','spark-area');svg.appendChild(a);
const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');pl.setAttribute('points',pts);pl.setAttribute('class','spark-line');pl.setAttribute('stroke',color);svg.appendChild(pl);
const dt=document.createElementNS('http://www.w3.org/2000/svg','circle');dt.setAttribute('cx',tX(data.length-1));dt.setAttribute('cy',tY(data[data.length-1]));dt.setAttribute('class','spark-dot');dt.setAttribute('fill',color);svg.appendChild(dt)}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
// Load cached data instantly, then fetch fresh data in background
// ═══════════════════════════════════════════════════════════════
// HOVER TOOLTIPS
// ═══════════════════════════════════════════════════════════════
const TIPS={
  // Prices
  'p-spx':'S&P 500 index in points — broadest US large-cap equity benchmark (^GSPC). The SPY ETF tracks ~1/10 of this level by design',
  'p-dji':'Dow Jones Industrial Average index in points — 30 blue-chip US stocks (^DJI). The DIA ETF tracks ~1/100 of this level by design',
  'p-vix':'CBOE Volatility Index — market fear gauge derived from S&P 500 options',
  'p-wti':'West Texas Intermediate crude oil futures — US oil benchmark (NYMEX)',
  'p-brent':'Brent crude oil futures — global oil benchmark (ICE)',
  'p-gold':'Gold futures — safe haven asset, inflation hedge',
  'p-dxy':'US Dollar Index — USD strength vs basket of 6 major currencies',
  'p-xle':'Energy sector ETF — tracks major US oil, gas & energy companies',
  'p-ita':'US Aerospace & Defense ETF — tracks defense contractors',
  'p-xlp':'Consumer Staples ETF — defensive sector, essentials companies',
  'p-moo':'Agribusiness ETF — global farming, fertilizers, food production',
  'p-rbob':'RBOB Gasoline futures — refined product, key crack spread input',
  'p-ho':'Heating Oil futures (ULSD) — diesel proxy, refinery product',
  'p-natgas':'Natural Gas futures — Henry Hub benchmark (NYMEX)',
  'p-uso':'US Oil Fund — tracks near-month WTI futures',
  'p-bno':'Brent Oil Fund — tracks near-month Brent futures',
  'p-crak':'VanEck Oil Refiners ETF — proxy for refining margins',
  'p-xop':'Oil & Gas Exploration & Production ETF',
  'p-oih':'Oil Services ETF — drillers, equipment, oilfield services',
  // US metrics
  'v-sahm':'Sahm Rule — recession indicator based on unemployment rate rise',
  'v-claims':'Weekly initial jobless claims — early signal of labor market stress',
  'v-yc':'10Y minus 2Y Treasury yield — inversion signals recession risk',
  'v-hy':'High-yield corporate bond spread — credit market stress indicator',
  'v-mort':'30-year fixed mortgage rate — key consumer borrowing cost',
  'v-indpro':'Month-over-month change in factory output',
  'v-permits':'New residential building permits — housing demand leading indicator',
  'v-umcs':'University of Michigan consumer sentiment survey',
  'v-cpi':'Consumer Price Index year-over-year — headline US inflation',
  'v-bei':'Market-implied inflation expectations over next 5 years',
  'v-nfci':'Chicago Fed financial conditions — positive = tightening',
  'i-ism-mfg':'ISM Manufacturing PMI — below 50 signals factory contraction',
  'i-ism-svc':'ISM Services PMI — covers ~70% of US GDP',
  'i-vix':'VIX level auto-synced from Yahoo Finance',
  'i-spx':'S&P 500 drawdown from all-time high — bear market below -20%',
  'i-pe':'S&P 500 trailing P/E ratio — valuation measure',
  'i-mktm2':'Total market cap as % of money supply — Buffett indicator',
  // Oil
  'p-o-wti':'WTI crude front-month futures (NYMEX CL)',
  'p-o-brent':'Brent crude futures (ICE BZ)',
  'p-o-hh':'Henry Hub natural gas spot price',
  'v-cstocks':'US commercial crude oil inventories excluding SPR',
  'v-spr':'US Strategic Petroleum Reserve — government emergency stockpile',
  'v-prod':'US domestic crude oil field production (weekly)',
  'v-gas':'Average US retail regular gasoline price',
  'v-diesel':'Gulf Coast ultra-low-sulfur diesel price',
  'v-jet':'Gulf Coast kerosene-type jet fuel price',
  'v-wtispot':'WTI spot price at Cushing, Oklahoma delivery hub',
  'v-brentspot':'Brent spot price for European delivery',
  'i-lls':'Louisiana Light Sweet — premium Gulf Coast crude, often trades above WTI',
  'i-wcs':'Western Canadian Select — heavy sour crude, deep discount to WTI',
  'i-urals':'Russian Urals blend — key benchmark for sanctioned crude flows',
  'oilSpread':'WTI minus Brent — positive = WTI premium, negative = Brent premium',
  'crackSpread':'Refinery profit margin: (2×gasoline + 1×heating oil − 3×crude) / 3',
  // Hyperliquid
  'hl-xyzCL':'Hyperliquid WTI perpetual (xyz DEX) — most liquid, 20x leverage',
  'hl-xyzBRENT':'Hyperliquid Brent perpetual (xyz DEX) — 24/7 trading',
  'hl-kmUSOIL':'Hyperliquid US Oil perpetual (km DEX) — 10x leverage',
  'hl-cashWTI':'Hyperliquid WTI perpetual (cash DEX) — 10x leverage',
  // EU
  'v-ecbrate':'ECB main refinancing rate — primary eurozone policy rate',
  'v-eurusd':'Euros per US Dollar — key global FX pair',
  'v-eucpi':'Euro area HICP year-over-year — ECB targets 2%',
  'v-euunemp':'Eurozone harmonised unemployment rate',
  'v-euconf':'EU consumer confidence survey — negative = pessimistic',
  'i-eupmi':'Euro area composite PMI — manufacturing + services activity',
  'i-bund':'Italian 10Y minus German 10Y yield — EU fragmentation risk',
  // China
  'v-cncpi':'China consumer inflation — deflation risk if negative',
  'v-cnppi':'China producer prices — factory-gate deflation signals weak demand',
  'v-cny':'Chinese Yuan per USD — weaker CNY = capital outflow pressure',
  'i-cnpmi':'Official NBS manufacturing PMI — state-sector weighted',
  'i-cxpmi':'Caixin services PMI — private-sector, small-firm weighted',
  'i-cnfx':'PBOC foreign exchange reserves — buffer against capital flight',
  // Japan
  'v-bojrate':'Bank of Japan policy rate — recently exited negative rates',
  'v-jgb':'10-year Japanese Government Bond yield — BOJ yield curve control target',
  'v-jpcpi':'Japan CPI month-over-month — BOJ targets 2% inflation',
  'v-jpyusd':'Japanese Yen per USD — weak yen = import inflation pressure',
  'v-nikkei':'Nikkei 225 stock index — Japan equity benchmark',
  'i-tankan':'BOJ Tankan survey — large manufacturer sentiment, positive = optimistic',
  // UK
  'v-boerate':'Bank of England base rate — primary UK policy rate',
  'v-gbpusd':'US Dollars per British Pound — cable rate',
  'v-ukcpi':'UK CPI year-over-year — BOE targets 2%',
  'v-ukuem':'UK unemployment rate (ILO definition)',
  'i-ukpmi':'UK composite PMI — manufacturing + services activity',
  'i-gilt':'UK 10-year government bond yield — gilt market stress',
  // Yield curve
  'ycSV':'10Y minus 2Y Treasury spread — negative = inverted, recession signal',
  'p-jpy':'USD per Japanese Yen — the carry-trade barometer; rapid yen strengthening forces global de-leveraging',
  'y2DC':'Day-over-day change in the 2Y yield in basis points — anything ≥15bp is a multi-sigma intraday move',
  'y10DC':'Day-over-day change in the 10Y yield in basis points — anything ≥15bp is a multi-sigma intraday move; >25bp is the kind of move that stops trading at insurance and pension desks',
  'jpyStrip':'USD/JPY intraday Δ — yen strength reverses carry trades and is correlated with global volatility',
  'oilSpxRho':'30-day Pearson correlation between WTI and S&P 500 daily returns — strongly negative = oil-shock + risk-off (1970s, 2022 regime); positive = reflationary (2020-21)',
  'dxyStrip':'DXY intraday Δ — dollar strength tightens global financial conditions through emerging-market debt service',

  // Mag 7 cells — click for chart
  'm7-px-AAPL':'Apple Inc · NASDAQ:AAPL · click cell for D/W/M/Y/5Y/10Y chart',
  'm7-px-MSFT':'Microsoft · NASDAQ:MSFT · click cell for D/W/M/Y/5Y/10Y chart',
  'm7-px-GOOGL':'Alphabet (Class A) · NASDAQ:GOOGL · click cell for D/W/M/Y/5Y/10Y chart',
  'm7-px-AMZN':'Amazon · NASDAQ:AMZN · click cell for D/W/M/Y/5Y/10Y chart',
  'm7-px-META':'Meta Platforms · NASDAQ:META · click cell for D/W/M/Y/5Y/10Y chart',
  'm7-px-NVDA':'NVIDIA · NASDAQ:NVDA · click cell for D/W/M/Y/5Y/10Y chart',
  'm7-px-TSLA':'Tesla · NASDAQ:TSLA · click cell for D/W/M/Y/5Y/10Y chart',

  // Borrowing rates
  'v-mort':'30-year fixed mortgage rate — the headline US consumer borrowing benchmark, set by the secondary mortgage market against the 10Y Treasury + a credit spread',
  'i-ccrate':'Average APR charged on US credit-card balances assessed interest — Fed G.19 release; floor for unsecured consumer credit',
  'i-autoloan':'Average APR on a 60-month new-vehicle loan — Fed G.19 series; sits 200–400bp above the 5Y Treasury',
  'i-eumort':'Average rate on new euro-area MFI lending for house purchase — ECB MIR statistics',
  'i-euccrate':'Average rate on new euro-area MFI lending to households for consumption — ECB MIR statistics',
  'i-euauto':'Average APR on new vehicle loans in Germany retail — Bundesbank MFI breakdown',

  // Energy benchmarks
  'i-cnsolar':'Polysilicon spot price (China) — solar-grade feedstock; below $5/kg = oversupply, above $10 = healthy market',
  'i-euwind':'Weighted-average strike price of EU offshore-wind PPAs — competitive at <€80, expensive >€100',
  'i-eucarb':'EU ETS carbon allowance spot — ICE EUA front-month; €/tonne CO₂',
  'i-libat':'Battery-grade lithium carbonate spot price (China) — RMB/tonne',
  'i-ttf':'Dutch TTF natural gas — ICE front-month, €/MWh; Europe\'s benchmark gas price',
  'i-jkm':'Platts JKM Asian LNG spot — $/MMBtu; the Far East delivered price',
  'i-eupow':'EU baseload power — DE+FR average, €/MWh; reflects the marginal price-setter (often gas)',
  'i-uran':'U₃O₈ spot uranium — UxC weekly $/lb; nuclear fuel cost',

  // Macro snapshot rows
  'mc-us-cpi':'US headline CPI year-over-year — Fed implicit target 2%, hot ≥3.5%',
  'mc-us-pol':'Fed funds upper bound — primary US policy rate',
  'mc-us-2y':'2Y US Treasury yield — most rate-sensitive part of the curve',
  'mc-us-10y':'10Y US Treasury yield — global risk-free benchmark; daily moves ≥15bp = SHOCK',
  'mc-us-idx':'S&P 500 — broadest US large-cap equity benchmark',
  'mc-us-fx':'DXY — USD strength vs basket of major currencies',
  'mc-eu-cpi':'Euro-area HICP year-over-year — ECB target 2%',
  'mc-eu-pol':'ECB main refinancing operation rate (MRO) and deposit-facility rate (DFR) shown together; banks fund at MRO, park at DFR',
  'mc-eu-2y':'German 2Y Schatz yield — euro-area short-rate proxy',
  'mc-eu-10y':'German 10Y Bund yield — euro-area risk-free benchmark',
  'mc-eu-idx':'DAX 40 — flagship German equity index',
  'mc-eu-fx':'EUR/USD — primary European FX cross',
  'mc-uk-cpi':'UK CPI year-over-year — BoE target 2%',
  'mc-uk-pol':'Bank of England Bank Rate — primary UK policy rate',
  'mc-uk-2y':'2Y Gilt yield — UK short-rate barometer',
  'mc-uk-10y':'10Y Gilt yield — Truss-episode-style spikes are a UK-specific risk',
  'mc-uk-idx':'FTSE 100 — large-cap UK equity index, dominated by miners and energy',
  'mc-uk-fx':'GBP/USD ("cable") — sterling against the dollar',
  'mc-cn-cpi':'China CPI year-over-year — deflation risk if negative',
  'mc-cn-pol':'PBoC Medium-term Lending Facility (MLF) and 1-year Loan Prime Rate (LPR) — the de-facto policy rates',
  'mc-cn-2y':'China 2Y government bond yield',
  'mc-cn-10y':'China 10Y government bond yield — the on-shore curve has decoupled from global rates',
  'mc-cn-idx':'CSI 300 — top 300 Shanghai/Shenzhen-listed firms',
  'mc-cn-fx':'USD/CNY onshore — PBoC manages inside a daily band; weakening signals capital outflow pressure',
  'mc-jp-cpi':'Japan headline CPI year-over-year — BoJ target 2%',
  'mc-jp-pol':'BoJ short-term policy rate — exited negative in 2024',
  'mc-jp-2y':'2Y JGB yield — has lifted off zero alongside YCC dismantling',
  'mc-jp-10y':'10Y JGB yield — was capped under YCC; now floating',
  'mc-jp-idx':'Nikkei 225 — flagship Japan equity index',
  'mc-jp-fx':'USD/JPY — global carry-trade barometer; >155 historically triggers MoF intervention',
  'mc-ru-cpi':'Russia CPI year-over-year — Bank of Russia target 4%; structurally elevated since sanctions',
  'mc-ru-pol':'CBR key rate — has moved violently with sanctions episodes',
  'mc-ru-2y':'2Y OFZ yield — onshore-only liquidity is thin',
  'mc-ru-10y':'10Y OFZ yield — onshore Russian government bond',
  'mc-ru-idx':'MOEX — Moscow Exchange composite index',
  'mc-ru-fx':'USD/RUB — sanctioned and managed; thin offshore liquidity',
  'mc-br-cpi':'Brazil IPCA year-over-year — BCB target band',
  'mc-br-pol':'SELIC — Brazil\'s overnight policy rate, set by COPOM',
  'mc-br-2y':'2Y NTN-F (fixed-rate Brazilian government bond)',
  'mc-br-10y':'10Y NTN-F yield — domestic curve',
  'mc-br-idx':'Ibovespa — São Paulo flagship equity index',
  'mc-br-fx':'USD/BRL — Brazilian real vs dollar',
};
// ─── Relevant levels / ATH for price cells ────────────────────
// Updated for the 2025-26 regime. Where an absolute ATH is meaningful
// (VIX panic spikes, oil 2008, DXY 1985) it's quoted; otherwise the band
// is the cycle-relevant range.
const PRICE_LEVELS={
  'p-spx':'S&P 500 index points · 52w range ~6,000–7,200+ · currently at/near ATH (early 2026) · 200d MA ≈ 6,600 · cycle low post-2008 was 666 (Mar 2009)',
  'p-dji':'Dow Jones index points · 52w range ~40,500–49,000+ · ATH set in 2026 · cycle low post-2008 was 6,547 (Mar 2009)',
  'p-vix':'Calm <16 · Watch 16–20 · Elevated 20–30 · Panic ≥30 · ATH 82.69 intraday (16 Mar 2020); 89.53 spike (24 Oct 2008)',
  'p-wti':'Normal $60–80 · Elevated ≥$85 · Spike ≥$100 · ATH $147.27 (11 Jul 2008)',
  'p-brent':'Normal $65–85 · Elevated ≥$90 · Spike ≥$110 · ATH $147.50 (11 Jul 2008)',
  'p-gold':'52w range ~$2,800–4,000 · ATH ~$4,000 (early 2026) · prior ATH $2,075 (2020) was breached in 2024',
  'p-dxy':'Weak <97 · Normal 97–106 · Strong ≥106 · ATH 164.72 (Feb 1985); 114.78 cycle high (Sep 2022)',
  'p-jpy':'USD/JPY · Strong yen <130 · Stable 130–150 · MoF-intervention zone ≥158 · ATH 161.95 (3 Jul 2024)',
  'p-xle':'52w range ~$82–105 · Cycle high $103 (2025)',
  'p-ita':'52w range ~$155–200 · ATH ~$200 (2025)',
  'p-xlp':'52w range ~$74–88 · ATH ~$87 (2025)',
  'p-moo':'52w range ~$70–88 · cycle range cap ≈ $90',
  'p-rbob':'Normal ~$2.00–2.80/gal · Spike ≥$3.50 · ATH $4.31 (Jun 2022)',
  'p-ho':'Normal ~$2.20–3.00/gal · Spike ≥$4.00 · ATH $5.07 (Apr 2022)',
  'p-natgas':'Low <$2 · Normal $2–4 · Spike ≥$6 · ATH $15.78 (Dec 2005); recent peak $9.76 (Aug 2022)',
  'p-o-wti':'Normal $60–80 · Elevated ≥$85 · Spike ≥$100 · ATH $147.27 (Jul 2008)',
  'p-o-brent':'Normal $65–85 · Elevated ≥$90 · Spike ≥$110 · ATH $147.50 (Jul 2008)',
  'p-o-hh':'Low <$2 · Normal $2–4 · Spike ≥$6 (Henry Hub natural gas)',
};
// ─── Derive threshold descriptions from TH config ─────────────
// Each metric row id looks like d-xxx / v-xxx / i-xxx → TH key is "xxx" with hyphens stripped
function thKey(elId){if(!elId)return null;return elId.replace(/^[dvis]-/,'').replace(/-/g,'');}
function describeThresholds(key){
  const th=TH[key];if(!th||!th.t)return '';
  const fmt=th.fmt||(v=>String(v));
  const seen=new Set();
  const parts=[];
  for(const tier of th.t){
    const src=tier.f.toString();
    // Match "v>=0.5", "v<=−5", "v.p<0", "v>100" etc.
    const m=src.match(/v(?:\.[a-z]+)?\s*(>=|<=|>|<|===|==)\s*(-?[\d.]+)/i);
    const opSym={'>=':'≥','<=':'≤','>':'>','<':'<','===':'=','==':'='};
    let text;
    if(m){
      let n=parseFloat(m[2]);
      let fv;try{fv=fmt(src.includes('v.p')?{n,p:n,pct:n}:n);}catch{fv=String(n);}
      // Strip leading + in fmt outputs
      fv=String(fv).replace(/^\+/,'');
      text=`${tier.l} ${opSym[m[1]]}${fv}`;
    }else{
      text=tier.l; // default/catchall tier
    }
    if(!seen.has(text)){seen.add(text);parts.push(text);}
  }
  return parts.join(' · ');
}
function augmentTipWithLevels(id, base){
  if(!base)base='';
  // Price cells: append hardcoded levels
  if(PRICE_LEVELS[id])return base?base+'\nLevels: '+PRICE_LEVELS[id]:'Levels: '+PRICE_LEVELS[id];
  // Metric rows: derive from TH
  const k=thKey(id);const desc=k?describeThresholds(k):'';
  if(desc)return base?base+'\nLevels: '+desc:'Levels: '+desc;
  return base;
}
Object.entries(TIPS).forEach(([id,tip])=>{const el=document.getElementById(id);if(el)el.setAttribute('data-tip',augmentTipWithLevels(id,tip))});
// Also add tips to pcells by finding parent
document.querySelectorAll('.pcell').forEach(cell=>{
  const pval=cell.querySelector('.pval');
  const id=pval&&pval.id;
  const base=id&&TIPS[id]?TIPS[id]:'';
  const merged=augmentTipWithLevels(id,base);
  if(merged)cell.setAttribute('data-tip',merged);
});
document.querySelectorAll('.mr').forEach(row=>{
  const mv=row.querySelector('.mv')||row.querySelector('.mi');
  const dot=row.querySelector('.md');
  // Prefer the dot id for TH lookup — it's canonical (d-vixm, d-ism-mfg, …)
  const lookupId=(dot&&dot.id)||(mv&&mv.id);
  const base=(mv&&mv.id&&TIPS[mv.id])||'';
  const merged=augmentTipWithLevels(lookupId,base);
  if(merged)row.setAttribute('data-tip',merged);
});
document.querySelectorAll('.hl-cell').forEach(cell=>{
  if(cell.id&&TIPS[cell.id])cell.setAttribute('data-tip',TIPS[cell.id]);
});
document.querySelectorAll('.oil-spread').forEach(sp=>{
  const val=sp.querySelector('.osp-val');
  if(val&&val.id&&TIPS[val.id])sp.setAttribute('data-tip',TIPS[val.id]);
});
// Mag 7 cells — apply the price-cell tip to the whole tile so hover anywhere on
// the cell shows the tooltip. Click still opens the chart modal.
document.querySelectorAll('.mag7-cell').forEach(cell=>{
  const px=cell.querySelector('.m7-px');
  if(px && px.id && TIPS[px.id]) cell.setAttribute('data-tip', TIPS[px.id]);
});
// Macro-snapshot inputs — each cell already has its own id matching TIPS.
document.querySelectorAll('.mc-i').forEach(inp=>{
  if(inp.id && TIPS[inp.id]) inp.setAttribute('data-tip', TIPS[inp.id]);
});
// Cross-asset strip cells under the yield curve
['jpyStrip','oilSpxRho','dxyStrip','y2DC','y10DC'].forEach(id=>{
  const el=document.getElementById(id);
  if(el && TIPS[id]) el.setAttribute('data-tip', TIPS[id]);
});

// ═══════════════════════════════════════════════════════════════
// GLOBAL TOOLTIP SYSTEM (position:fixed, viewport-aware)
// ═══════════════════════════════════════════════════════════════
(function(){
  const tip=document.createElement('div');tip.id='global-tip';document.body.appendChild(tip);
  let hideTimer=null;
  function show(target){
    const txt=target.getAttribute('data-tip');
    if(!txt)return;
    clearTimeout(hideTimer);
    tip.textContent=txt;
    tip.style.display='block';tip.style.opacity='0';
    requestAnimationFrame(()=>{
      const r=target.getBoundingClientRect(),tr=tip.getBoundingClientRect();
      let left=r.left+r.width/2-tr.width/2,top=r.top-tr.height-8;
      if(left<8)left=8;
      if(left+tr.width>innerWidth-8)left=innerWidth-tr.width-8;
      if(top<8)top=r.bottom+8;
      tip.style.left=left+'px';tip.style.top=top+'px';tip.style.opacity='1';
    });
  }
  function hide(){tip.style.opacity='0';hideTimer=setTimeout(()=>{tip.style.display='none';},150);}
  document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');if(t)show(t);});
  document.addEventListener('mouseout',e=>{const t=e.target.closest('[data-tip]');if(!t)return;
    const rel=e.relatedTarget?.closest?.('[data-tip]');if(rel===t)return;hide();});
  addEventListener('scroll',hide,{passive:true,capture:true});
  addEventListener('resize',hide);
})();

// ═══════════════════════════════════════════════════════════════
// EVENT BANNER TIPS & SUMMARY CATEGORY TIPS
// ═══════════════════════════════════════════════════════════════
const EVENT_TIPS={
  'NFP RELEASE':'Non-Farm Payrolls — monthly US jobs report from the Bureau of Labor Statistics. Primary gauge of labor market health; drives Fed policy expectations.',
  'CPI RELEASE':'Consumer Price Index — monthly US inflation measure. Core input to Fed interest-rate decisions and bond markets.',
  'FOMC DECISION':'Federal Open Market Committee — the Fed\'s rate-setting meeting. Decides the federal funds rate and signals monetary-policy direction.'
};
function applyEvTip(){const ev=nextEv();if(!ev)return;const b=document.getElementById('evBanner');
  if(b&&EVENT_TIPS[ev.name])b.setAttribute('data-tip',EVENT_TIPS[ev.name]);}
function updateSummaryTips(){
  // Counts + hover list must reflect the SAME scope as updSum() — the new
  // US-stress grid + every glass panel (.gp) since the old #pan-0 carousel is gone.
  const cats={concern:[],watch:[],normal:[]};
  document.querySelectorAll('.us-stress-col .mr, .gp .mr').forEach(row=>{
    const md=row.querySelector('.md'),mn=row.querySelector('.mn');
    if(!md||!mn)return;
    const name=(mn.firstChild?.textContent||'').trim()||mn.textContent.trim().split(/\s{2,}|\n/)[0];
    if(md.classList.contains('concern'))cats.concern.push(name);
    else if(md.classList.contains('watch'))cats.watch.push(name);
    else if(md.classList.contains('normal'))cats.normal.push(name);
  });
  const set=(id,arr)=>{const el=document.getElementById(id);if(!el)return;
    // Dedupe (same row may match multiple selectors) and cap at 24 lines.
    const uniq=Array.from(new Set(arr));
    el.setAttribute('data-tip',uniq.length?uniq.slice(0,24).join(' • ')+(uniq.length>24?` · +${uniq.length-24} more`:''):'None');};
  set('cC',cats.concern);set('cW',cats.watch);set('cN',cats.normal);
}

// ═══════════════════════════════════════════════════════════════
// MACRO SNAPSHOT — filled from the feed (FRED for prints and yields,
// Yahoo for indices and FX). A cell the user has typed into keeps the
// override until the page is reloaded.
// ═══════════════════════════════════════════════════════════════
const yoy=(id)=>{const d=Feed.fred(id,13);return d&&d.length>=13?((d[0]-d[12])/d[12])*100:null;};
const f1=(id)=>{const d=Feed.fred(id,1);return d&&d.length?d[0]:null;};
const qp=(s)=>{const q=Feed.quote(s);return q&&isFinite(q.price)?q.price:null;};
const MC_LIVE=[
  ['us','cpi',()=>yoy('CPIAUCSL'),v=>v.toFixed(1)],
  ['us','pol',()=>f1('DFEDTARU'),v=>v.toFixed(2)],
  ['us','2y',()=>f1('DGS2'),v=>v.toFixed(2)],
  ['us','10y',()=>f1('DGS10'),v=>v.toFixed(2)],
  ['us','idx',()=>qp('^GSPC'),v=>'S&P '+Math.round(v).toLocaleString()],
  ['us','fx',()=>qp('DX-Y.NYB'),v=>'DXY '+v.toFixed(1)],
  ['eu','cpi',()=>yoy('CP0000EZ19M086NEST'),v=>v.toFixed(1)],
  ['eu','pol',()=>{const m=f1('ECBMRRFR'),d=f1('ECBDFR');return m==null?null:`MRO ${m.toFixed(2)}${d!=null?' / DFR '+d.toFixed(2):''}`;},v=>v],
  ['eu','10y',()=>f1('IRLTLT01DEM156N'),v=>v.toFixed(2)],
  ['eu','idx',()=>qp('^GDAXI'),v=>'DAX '+Math.round(v).toLocaleString()],
  ['eu','fx',()=>qp('EURUSD=X'),v=>'EUR '+v.toFixed(3)],
  ['uk','cpi',()=>yoy('GBRCPIALLMINMEI'),v=>v.toFixed(1)],
  ['uk','pol',()=>f1('BOERUKM'),v=>v.toFixed(2)],
  ['uk','10y',()=>f1('IRLTLT01GBM156N'),v=>v.toFixed(2)],
  ['uk','idx',()=>qp('^FTSE'),v=>'FTSE '+Math.round(v).toLocaleString()],
  ['uk','fx',()=>qp('GBPUSD=X'),v=>'GBP '+v.toFixed(3)],
  ['cn','cpi',()=>f1('CPALTT01CNM657N'),v=>v.toFixed(1)],
  ['cn','10y',()=>f1('IRLTLT01CNM156N'),v=>v.toFixed(2)],
  ['cn','idx',()=>qp('000300.SS'),v=>'CSI 300 '+Math.round(v).toLocaleString()],
  ['cn','fx',()=>qp('CNY=X'),v=>'CNY '+v.toFixed(2)],
  ['jp','cpi',()=>yoy('JPNCPIALLMINMEI'),v=>v.toFixed(1)],
  ['jp','pol',()=>f1('IRSTCB01JPM156N'),v=>v.toFixed(2)],
  ['jp','10y',()=>f1('IRLTLT01JPM156N'),v=>v.toFixed(2)],
  ['jp','idx',()=>qp('^N225'),v=>'Nikkei '+Math.round(v).toLocaleString()],
  ['jp','fx',()=>qp('JPY=X'),v=>'JPY '+v.toFixed(1)],
  ['ru','cpi',()=>f1('CPALTT01RUM657N'),v=>v.toFixed(1)],
  ['ru','idx',()=>qp('IMOEX.ME'),v=>'MOEX '+Math.round(v).toLocaleString()],
  ['ru','fx',()=>qp('RUB=X'),v=>'RUB '+v.toFixed(1)],
  ['br','cpi',()=>f1('CPALTT01BRM657N'),v=>v.toFixed(1)],
  ['br','pol',()=>f1('IRSTCB01BRM156N'),v=>'SELIC '+v.toFixed(2)],
  ['br','10y',()=>f1('IRLTLT01BRM156N'),v=>v.toFixed(2)],
  ['br','idx',()=>qp('^BVSP'),v=>'Bovespa '+(v/1000).toFixed(0)+'K'],
  ['br','fx',()=>qp('BRL=X'),v=>'BRL '+v.toFixed(2)],
];
function refreshMacroSnapshot(){
  MC_LIVE.forEach(([reg,fld,get,fmt])=>{
    const cell=document.getElementById(`mc-${reg}-${fld}`); if(!cell) return;
    if(cell.dataset.manual==='1'||document.activeElement===cell) return;
    let v=null; try{ v=get(); }catch(_){}
    if(v==null||(typeof v==='number'&&!isFinite(v))) return;
    cell.value=fmt(v); cell.dataset.auto='1'; cell.title='live · feed';
  });
}
document.querySelectorAll('.mc-i').forEach(c=>c.addEventListener('input',()=>{c.dataset.manual='1';c.title='manual override';}));


// ═══════════════════════════════════════════════════════════════
// MAG 7 — compact live tile per stock
// 1y daily closes for sparkline, intraday meta for price + day-change.
// Routes through the same PROXIES chain Yahoo ETFs use.
// ═══════════════════════════════════════════════════════════════
const MAG7_TICKERS=['AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA'];

function fetchMag7One(tk){
  const q=Feed.quote(tk); const closes=(Feed.history(tk,'1y_1d')||[]).map(p=>p[1]);
  if(!q) return null;
  return {px:q.price, prev:q.prevClose||closes[closes.length-2]||q.price, closes};
}


function drawM7Spark(svg, data, up){
  if(!svg) return;
  const W=80,H=24,P=2;
  const min=Math.min(...data), max=Math.max(...data), rng=max-min||1;
  const tX=i=>P+(i/(data.length-1))*(W-P*2);
  const tY=v=>H-P-((v-min)/rng)*(H-P*2);
  const pts=data.map((v,i)=>`${tX(i).toFixed(1)},${tY(v).toFixed(1)}`).join(' ');
  const col=up?'#2c7a4b':'#b13a2c';
  svg.innerHTML=`<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />`;
}

async function refreshMag7(){
  // Sequential with 200ms stagger to avoid tripping proxy rate-limits.
  for(const tk of MAG7_TICKERS){
    const r=fetchMag7One(tk); if(!r){ continue; }
    const ch=r.px-r.prev, pct=r.prev>0?(ch/r.prev)*100:0;
    const pE=document.getElementById(`m7-px-${tk}`);
    const cE=document.getElementById(`m7-chg-${tk}`);
    const sp=document.getElementById(`m7-spk-${tk}`);
    if(pE) pE.textContent=r.px.toFixed(2);
    if(cE){
      cE.textContent=`${pct>=0?'+':''}${pct.toFixed(2)}%`;
      cE.className='m7-chg '+(pct>0.05?'up':pct<-0.05?'down':'flat');
    }
    if(sp && r.closes.length>5) drawM7Spark(sp, r.closes, pct>=0);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAG 7 CHART MODAL — D / W / M / Y / 5Y / 10Y interactive chart
// ═══════════════════════════════════════════════════════════════
const M7_RANGE_MAP = {
  '1d':  {interval:'15m', label:'Last session, 15-min'},
  '5d':  {interval:'15m', label:'Past week, 15-min'},
  '1mo': {interval:'1d',  label:'Past month, daily'},
  '1y':  {interval:'1d',  label:'Past year, daily'},
  '5y':  {interval:'1wk', label:'5-year, weekly'},
  '10y': {interval:'1mo', label:'10-year, monthly'}
};

function fetchMag7Range(tk, range){
  // Slice the pre-fetched histories (5d/15m, 1y/1d, 10y/1wk) to the requested window.
  const now=Date.now()/1000;
  const pick=(key,secs)=>{const h=Feed.history(tk,key)||[];const from=now-secs;return h.filter(p=>p[0]>=from).map(p=>({t:p[0],c:p[1]}));};
  let pairs;
  if(range==='1d'){ const h=Feed.history(tk,'5d_15m')||[]; const last=h.length?h[h.length-1][0]:0; const dayStart=last-16*3600; pairs=h.filter(p=>p[0]>=dayStart).map(p=>({t:p[0],c:p[1]})); }
  else if(range==='5d') pairs=pick('5d_15m',7*86400);
  else if(range==='1mo') pairs=pick('1y_1d',31*86400);
  else if(range==='1y') pairs=pick('1y_1d',366*86400);
  else if(range==='5y') pairs=pick('10y_1wk',5*366*86400);
  else pairs=pick('10y_1wk',11*366*86400);
  const q=Feed.quote(tk);
  return pairs&&pairs.length>1?{pairs,meta:{exchangeName:q&&q.exchange||'NASDAQ'}}:null;
}


function drawM7Chart(svg, pairs){
  if(!svg) return;
  svg.innerHTML='';
  if(!pairs || pairs.length<2){
    svg.innerHTML='<text x="400" y="180" text-anchor="middle" fill="rgba(29,29,31,.4)" font-size="14" font-family="sans-serif">no data</text>';
    return;
  }
  const W=800, H=360, L=44, R=12, T=8, B=24;
  const closes=pairs.map(p=>p.c);
  const min=Math.min(...closes), max=Math.max(...closes);
  const rng=max-min||1;
  const tX=i=>L+(i/(pairs.length-1))*(W-L-R);
  const tY=v=>T+(1-(v-min)/rng)*(H-T-B);
  const start=closes[0], end=closes[closes.length-1];
  const up=end>=start;
  const col=up?'#2c7a4b':'#b13a2c';

  // Grid + y-axis labels (5 horizontal lines)
  const NS='http://www.w3.org/2000/svg';
  for(let i=0;i<=4;i++){
    const v=min + (rng*i/4);
    const y=tY(v);
    const ln=document.createElementNS(NS,'line');
    ln.setAttribute('x1',L); ln.setAttribute('x2',W-R);
    ln.setAttribute('y1',y); ln.setAttribute('y2',y);
    ln.setAttribute('stroke','rgba(29,29,31,.08)'); ln.setAttribute('stroke-width','1');
    svg.appendChild(ln);
    const txt=document.createElementNS(NS,'text');
    txt.setAttribute('x',L-6); txt.setAttribute('y',y+3);
    txt.setAttribute('text-anchor','end'); txt.setAttribute('font-size','10');
    txt.setAttribute('fill','rgba(29,29,31,.4)'); txt.setAttribute('font-family','sans-serif');
    txt.textContent=v.toFixed(v>1000?0:2);
    svg.appendChild(txt);
  }

  // Date labels (3 along x)
  const fmtT=(t)=>{
    const d=new Date(t*1000);
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'});
  };
  [0, Math.floor(pairs.length/2), pairs.length-1].forEach(i=>{
    const txt=document.createElementNS(NS,'text');
    txt.setAttribute('x',tX(i)); txt.setAttribute('y',H-6);
    txt.setAttribute('text-anchor','middle'); txt.setAttribute('font-size','10');
    txt.setAttribute('fill','rgba(29,29,31,.45)'); txt.setAttribute('font-family','sans-serif');
    txt.textContent=fmtT(pairs[i].t); svg.appendChild(txt);
  });

  // Area fill
  const areaD=`M${tX(0)},${tY(min)} `+pairs.map((p,i)=>`L${tX(i).toFixed(1)},${tY(p.c).toFixed(1)}`).join(' ')+` L${tX(pairs.length-1)},${tY(min)} Z`;
  const a=document.createElementNS(NS,'path');
  a.setAttribute('d',areaD); a.setAttribute('fill',col); a.setAttribute('opacity','.12');
  svg.appendChild(a);

  // Line
  const pl=document.createElementNS(NS,'polyline');
  pl.setAttribute('points',pairs.map((p,i)=>`${tX(i).toFixed(1)},${tY(p.c).toFixed(1)}`).join(' '));
  pl.setAttribute('fill','none'); pl.setAttribute('stroke',col);
  pl.setAttribute('stroke-width','1.6'); pl.setAttribute('stroke-linecap','round');
  pl.setAttribute('stroke-linejoin','round');
  svg.appendChild(pl);

  // Last-point dot
  const dot=document.createElementNS(NS,'circle');
  dot.setAttribute('cx',tX(pairs.length-1)); dot.setAttribute('cy',tY(end));
  dot.setAttribute('r','3.5'); dot.setAttribute('fill',col);
  svg.appendChild(dot);
}

(function initMag7Modal(){
  const modal=document.getElementById('m7Modal');
  const closeBtn=document.getElementById('m7ModalClose');
  const tkEl=document.getElementById('m7ModalTk');
  const metaEl=document.getElementById('m7ModalMeta');
  const pxEl=document.getElementById('m7ModalPx');
  const tfBox=document.getElementById('m7ModalTf');
  const chart=document.getElementById('m7Chart');
  const loader=document.getElementById('m7ChartLoader');
  const statRet=document.getElementById('m7StatRet'),
        statHi=document.getElementById('m7StatHi'),
        statLo=document.getElementById('m7StatLo'),
        statPe=document.getElementById('m7StatPe');
  if(!modal) return;

  let activeTk=null, activeRange='1y';

  async function load(tk, range){
    activeTk=tk; activeRange=range;
    tfBox.querySelectorAll('.m7-tf-btn').forEach(b=>b.classList.toggle('active', b.dataset.r===range));
    loader.style.display='flex'; loader.textContent='loading…';
    chart.innerHTML='';
    const r=fetchMag7Range(tk, range);
    loader.style.display='none';
    if(!r || !r.pairs || r.pairs.length<2){
      drawM7Chart(chart, null);
      statRet.textContent=statHi.textContent=statLo.textContent='—';
      return;
    }
    drawM7Chart(chart, r.pairs);
    const closes=r.pairs.map(p=>p.c);
    const start=closes[0], end=closes[closes.length-1];
    const ret=((end-start)/start)*100;
    const hi=Math.max(...closes), lo=Math.min(...closes);
    statRet.textContent=`${ret>=0?'+':''}${ret.toFixed(2)}%`;
    statRet.className='m7-stat-v '+(ret>=0?'up':'down');
    statHi.textContent=hi.toFixed(2);
    statLo.textContent=lo.toFixed(2);
    const peInp=document.getElementById(`m7-pe-${tk}`);
    statPe.textContent=peInp?peInp.value:'—';
    pxEl.textContent=end.toFixed(2);
    pxEl.className='m7-modal-px '+(ret>=0?'up':'down');
    metaEl.textContent=`${M7_RANGE_MAP[range].label} · ${r.meta?.exchangeName||'NASDAQ/NYSE'}`;
  }

  function open(tk){
    tkEl.textContent=tk;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    load(tk, '1y');
  }
  function hide(){
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  closeBtn.addEventListener('click', hide);
  modal.addEventListener('click', e=>{ if(e.target===modal) hide(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && modal.classList.contains('active')) hide(); });
  tfBox.addEventListener('click', e=>{
    const b=e.target.closest('.m7-tf-btn'); if(!b) return;
    if(activeTk) load(activeTk, b.dataset.r);
  });
  document.querySelectorAll('.mag7-cell').forEach(cell=>{
    cell.addEventListener('click', e=>{
      // Don't open modal when interacting with the P/E input
      if(e.target.closest('.m7-pe-i')) return;
      const tk=cell.dataset.tk; if(tk) open(tk);
    });
  });
})();

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
function feedNote(){
  const el=document.getElementById('ts'); if(!el) return;
  const m=Feed.marketTs(), f=Feed.fredTs();
  const ago=t=>{ if(!t) return '—'; const min=Math.round((Date.now()-t)/60000); return min<1?'just now':min<60?`${min} min ago`:`${Math.round(min/60)} h ago`; };
  el.textContent=`prices ${ago(m)} · FRED ${ago(f)}`;
  el.className='bf-ts'+(Feed.state.error?' err':'');
  if(Feed.state.error) el.textContent='feed unreachable — showing cached values';
}
function boot(){
  pollYH(); fetchAll(); refreshMag7().catch(()=>{}); feedNote();
}
document.getElementById('refreshBtn')?.addEventListener('click',()=>{ fetchAll.userTriggered=true; fetchAll().finally(()=>{ fetchAll.userTriggered=false; refreshMag7().catch(()=>{}); }); });
evalManual(); updEv(); setInterval(updEv,1000);
applyEvTip(); updateSummaryTips(); setInterval(()=>{applyEvTip();updateSummaryTips();},2000);
fetchHL(); setInterval(fetchHL,20000);
Feed.ready.then(boot).catch(boot);
Feed.onUpdate(()=>{ pollYH(); refreshMag7().catch(()=>{}); feedNote(); });
setInterval(feedNote,60000);
