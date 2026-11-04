/* Mashup V12.0 — viewport-aware card rendering and network feedback.
 * No gameplay changes, polling, API calls, or mutations to the game save.
 * Leaves the active booster flip and full-screen card inspection untouched.
 */
export function startMashupV12Performance(){
  if(typeof window==='undefined'||typeof document==='undefined')return;
  if(window.__mashupV12PerformanceStarted)return;
  window.__mashupV12PerformanceStarted=true;
  document.documentElement.dataset.mashupBuild='12.0.0';
  const mobile=window.matchMedia?.('(max-width: 760px)').matches;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cores=Number(navigator.hardwareConcurrency)||0;
  if(reduced||(mobile&&cores&&cores<=4))document.documentElement.classList.add('v12-low-power');
  const selector=[
    '.collection-grid .tcg-card.v10-tcg',
    '.v11-market-grid .tcg-card.v10-tcg',
    '.v114-picker-grid .tcg-card.v10-tcg',
    '.deck-roster-grid .tcg-card.v10-tcg',
    '.arena-deck-cards .tcg-card.v10-tcg'
  ].join(',');
  const scanned=new WeakSet();
  const viewport=('IntersectionObserver' in window)?new IntersectionObserver(entries=>{
    for(const e of entries)e.target.classList.toggle('v12-offscreen',!e.isIntersecting);
  },{rootMargin:'160px 0px'}):null;
  function repairImage(img){
    if(!img||img.dataset.v12ErrorBound==='1')return;
    img.dataset.v12ErrorBound='1';
    img.addEventListener('error',()=>{
      if(!img.isConnected)return;
      const fallback=document.createElement('span');
      fallback.className='v10-picture-symbol';
      fallback.setAttribute('role','img');
      fallback.setAttribute('aria-label','Illustration indisponible');
      fallback.textContent='✧';
      img.replaceWith(fallback);
    },{once:true});
  }
  function scan(){
    for(const card of document.querySelectorAll(selector)){
      if(scanned.has(card))continue;
      scanned.add(card);
      if(viewport){card.classList.add('v12-offscreen');viewport.observe(card);}
      for(const img of card.querySelectorAll('img')){
        // The only priority override is inside large static grids;
        // visible booster faces and interactive zooms keep eager loading.
        img.loading='lazy';
        img.decoding='async';
        repairImage(img);
      }
    }
  }
  let scheduled=false;
  function scheduleScan(){
    if(scheduled)return;
    scheduled=true;
    window.requestAnimationFrame(()=>{
      scheduled=false;
      if(!document.hidden)scan();
    });
  }
  const page=document.getElementById('page');
  if(page&&'MutationObserver' in window){
    const changes=new MutationObserver(scheduleScan);
    changes.observe(page,{subtree:true,childList:true});
  }
  scheduleScan();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleScan();});
  const offline=document.createElement('div');
  offline.className='v12-offline-notice';
  offline.setAttribute('role','status');
  offline.setAttribute('aria-live','polite');
  offline.hidden=true;
  offline.textContent='Connexion indisponible : les achats et les sauvegardes nécessitent Internet. Tes données ne sont pas effacées.';
  document.body.appendChild(offline);
  function updateConnection(){offline.hidden=navigator.onLine!==false;}
  updateConnection();
  window.addEventListener('offline',updateConnection);
  window.addEventListener('online',updateConnection);
}
