/* Navigation between the home view and the four sections.
   Sections are plain show/hide with a short crossfade; the URL hash and
   browser history stay in sync so deep links and the Back button work. */
(function(){
  const SEC_TITLES={'sec-finance':'Finance','sec-passion':'Professional Dilettante','sec-languages':'Languages','sec-vita':'Vita'};
  const home=document.getElementById('hubHome');
  const content=document.getElementById('hubContent');
  const title=document.getElementById('hubTopTitle');
  let current=null;

  function show(id, {instant=false, push=true}={}){
    if(!document.getElementById(id)) return;
    current=id;
    document.querySelectorAll('.hub-section').forEach(s=>s.classList.toggle('active', s.id===id));
    document.querySelectorAll('.hub-topbar-nav a').forEach(a=>a.classList.toggle('current', a.dataset.nav===id));
    if(title) title.textContent=SEC_TITLES[id]||'';
    home.classList.add('hidden'); document.body.classList.add('viewing');
    const reveal=()=>{
      home.style.display='none';
      content.style.display='block';
      window.scrollTo(0,0);
      requestAnimationFrame(()=>content.classList.add('active'));
      document.dispatchEvent(new CustomEvent('section:shown',{detail:{id}}));
    };
    if(instant) reveal(); else setTimeout(reveal,180);
    if(push){ try{ history.pushState({hub:id},'','#'+id.replace(/^sec-/,'')); }catch(_){} }
  }

  function showHome({push=true}={}){
    current=null;
    content.classList.remove('active'); document.body.classList.remove('viewing');
    setTimeout(()=>{
      content.style.display='none';
      document.querySelectorAll('.hub-section').forEach(s=>s.classList.remove('active'));
      home.style.display='';
      window.scrollTo(0,0);
      requestAnimationFrame(()=>home.classList.remove('hidden'));
    },180);
    if(push){ try{ history.pushState({hub:'home'},'',location.pathname+location.search); }catch(_){} }
  }

  function idFromHash(){
    const h=(location.hash||'').replace(/^#/,'');
    if(!h) return null;
    const id=h.startsWith('sec-')?h:'sec-'+h;
    return document.getElementById(id)?id:null;
  }

  // Wire buttons
  document.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click',e=>{
      e.preventDefault();
      const id=el.dataset.nav;
      if(id===current) return;
      if(current) show(id,{instant:true}); else show(id);
    });
  });
  const back=document.querySelector('.hub-back-btn');
  if(back) back.addEventListener('click',e=>{ e.preventDefault(); showHome(); });

  window.addEventListener('popstate',e=>{
    const st=e.state;
    const id=(st&&st.hub&&st.hub!=='home')?st.hub:idFromHash();
    if(id) show(id,{instant:true,push:false}); else showHome({push:false});
  });
  // A hash change while already on the page (e.g. typing #finance in the URL bar)
  window.addEventListener('hashchange',()=>{
    const id=idFromHash();
    if(id && id!==current) show(id,{instant:true,push:false});
    else if(!id && current) showHome({push:false});
  });

  // Initial state
  const initial=idFromHash();
  if(initial){
    try{ history.replaceState({hub:initial},'',location.hash); }catch(_){}
    show(initial,{instant:true,push:false});
  } else {
    try{ history.replaceState({hub:'home'},'',location.pathname+location.search); }catch(_){}
  }
})();

/* Certificate lightbox */
(function(){
  const modal=document.getElementById('certModal');
  const img=document.getElementById('certModalImg');
  const caption=document.getElementById('certModalCaption');
  const closeBtn=document.getElementById('certModalClose');
  if(!modal||!img) return;
  function open(src,cap){ img.src=src; caption.textContent=cap||''; modal.classList.add('active'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function hide(){ modal.classList.remove('active'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  document.querySelectorAll('[data-cert]').forEach(el=>{
    el.addEventListener('click',()=>open(el.dataset.cert,el.dataset.certCaption));
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(el.dataset.cert,el.dataset.certCaption); } });
  });
  closeBtn.addEventListener('click',hide);
  modal.addEventListener('click',e=>{ if(e.target===modal) hide(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&modal.classList.contains('active')) hide(); });
})();

/* Global tooltip (position:fixed, viewport-aware) */
(function(){
  const tip=document.createElement('div'); tip.id='global-tip'; document.body.appendChild(tip);
  let hideTimer=null;
  function show(target){
    const txt=target.getAttribute('data-tip'); if(!txt) return;
    clearTimeout(hideTimer);
    tip.textContent=txt; tip.style.display='block'; tip.style.opacity='0';
    requestAnimationFrame(()=>{
      const r=target.getBoundingClientRect(), tr=tip.getBoundingClientRect();
      let left=r.left+r.width/2-tr.width/2, top=r.top-tr.height-8;
      if(left<8) left=8;
      if(left+tr.width>innerWidth-8) left=innerWidth-tr.width-8;
      if(top<8) top=r.bottom+8;
      tip.style.left=left+'px'; tip.style.top=top+'px'; tip.style.opacity='1';
    });
  }
  function hide(){ tip.style.opacity='0'; hideTimer=setTimeout(()=>{ tip.style.display='none'; },150); }
  document.addEventListener('mouseover',e=>{ const t=e.target.closest('[data-tip]'); if(t) show(t); });
  document.addEventListener('mouseout',e=>{ const t=e.target.closest('[data-tip]'); if(!t) return; const rel=e.relatedTarget?.closest?.('[data-tip]'); if(rel===t) return; hide(); });
  addEventListener('scroll',hide,{passive:true,capture:true});
  addEventListener('resize',hide);
})();
