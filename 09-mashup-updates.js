/* Mashup Updater v10.4 — works in Safari and iOS Home Screen Web App.
 * No service worker, no local-storage reset. Future releases update version.json
 * and bump versioned asset URLs in index.html in the same GitHub commit.
 */
(()=>{
  'use strict';
  const CURRENT_VERSION='10.4.0';
  const CHECK_EVERY_MS=4*60*1000;
  const REFRESH_GUARD_MS=45000;
  const $=id=>document.getElementById(id);
  let lastCheck=0;
  let running=null;
  let available=null;
  let dismissedVersion='';
  let messageTimer=0;
  const versionParts=v=>String(v||'').split('.').map(Number);
  function newer(a,b){
    if(!/^\d+(?:\.\d+){0,2}$/.test(String(a||''))||!/^\d+(?:\.\d+){0,2}$/.test(String(b||'')))return false;
    const left=versionParts(a),right=versionParts(b);
    for(let i=0;i<3;i++){if((left[i]||0)!==(right[i]||0))return (left[i]||0)>(right[i]||0);}
    return false;
  }
  function notify(message,kind='info'){
    const area=$('mashup-update-status');
    if(!area)return;
    window.clearTimeout(messageTimer);
    area.textContent=message;
    area.dataset.kind=kind;
    area.hidden=false;
    messageTimer=window.setTimeout(()=>{area.hidden=true;},5000);
  }
  function showRelease(release){
    available=release;
    if(dismissedVersion===release.version)return;
    const panel=$('mashup-update-banner');
    if(!panel)return;
    $('mashup-update-version').textContent='Nouvelle version : V'+release.version;
    $('mashup-update-note').textContent=String(release.notes||'Une nouvelle mise à jour de Mashup est disponible.').slice(0,180);
    $('mashup-update-apply').disabled=false;
    $('mashup-update-apply').textContent='Mettre à jour';
    panel.hidden=false;
    const badge=$('mashup-update-check');
    if(badge)badge.classList.add('has-update');
  }
  function hideRelease(){
    const panel=$('mashup-update-banner');
    if(panel)panel.hidden=true;
    const badge=$('mashup-update-check');
    if(badge)badge.classList.remove('has-update');
  }
  async function checkUpdates(manual=false){
    if(running)return running;
    if(!manual && Date.now()-lastCheck<REFRESH_GUARD_MS)return;
    lastCheck=Date.now();
    const button=$('mashup-update-check');
    if(button)button.classList.add('checking');
    running=(async()=>{
      try{
        const url=new URL('./version.json',window.location.href);
        url.searchParams.set('nocache',String(Date.now()));
        const response=await fetch(url.href,{cache:'no-store',headers:{Accept:'application/json'}});
        if(!response.ok)throw Error('HTTP '+response.status);
        const info=await response.json();
        if(!info || typeof info.version!=='string'||!/^\d+(?:\.\d+){0,2}$/.test(info.version))throw Error('Version incorrecte');
        if(newer(info.version,CURRENT_VERSION)){
          available={version:info.version,notes:info.notes};
          // A manual check reopens a banner previously dismissed with "Plus tard".
          if(manual)dismissedVersion='';
          showRelease(available);
          if(manual)notify('Mashup V'+info.version+' est disponible !','success');
        }else{
          available=null;
          hideRelease();
          if(manual)notify('Mashup est à jour : V'+CURRENT_VERSION,'success');
        }
      }catch(error){
        if(manual)notify('Impossible de vérifier les mises à jour. Vérifie ta connexion.','error');
      }finally{
        if(button)button.classList.remove('checking');
      }
    })();
    try{await running;}finally{running=null;}
  }
  async function applyUpdate(){
    if(!available)return;
    const target=available.version;
    const button=$('mashup-update-apply');
    if(button){button.disabled=true;button.textContent='Vérification…';}
    try{
      // Ensure GitHub Pages already serves the NEW HTML before switching,
      // even if the manifest reached the CDN a few seconds before it.
      const probe=new URL('./index.html',window.location.href);
      probe.searchParams.set('mashup_build',target);
      probe.searchParams.set('nocache',String(Date.now()));
      const result=await fetch(probe.href,{cache:'no-store'});
      if(!result.ok)throw Error('HTTP '+result.status);
      const markup=await result.text();
      const published=markup.match(/<meta\s+name=["']mashup-version["']\s+content=["']([0-9.]+)["']/i);
      if(!published||newer(target,published[1]))throw Error('Version pas encore diffusée');
      // iOS standalone apps retain their URL and Supabase local auth.
      // A fresh query string bypasses old HTML cache without clearing data.
      const destination=new URL(window.location.href);
      destination.searchParams.set('mashup_build',target);
      destination.searchParams.set('refresh',String(Date.now()));
      window.location.replace(destination.href);
    }catch(error){
      notify('Mise à jour momentanément indisponible. Réessaie dans quelques instants.','error');
      if(button){button.disabled=false;button.textContent='Réessayer';}
    }
  }
  function initialize(){
    const badge=$('mashup-update-check');
    if(badge){
      badge.title='V'+CURRENT_VERSION+' — rechercher une mise à jour';
      badge.addEventListener('click',()=>checkUpdates(true));
    }
    $('mashup-update-apply')?.addEventListener('click',applyUpdate);
    $('mashup-update-later')?.addEventListener('click',()=>{
      dismissedVersion=available?.version||'';
      hideRelease();
    });
    checkUpdates(false);
    window.setInterval(()=>{if(!document.hidden)checkUpdates(false);},CHECK_EVERY_MS);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdates(false);});
    window.addEventListener('focus',()=>checkUpdates(false));
    window.addEventListener('online',()=>checkUpdates(false));
    window.addEventListener('pageshow',e=>{if(e.persisted)checkUpdates(false);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
  // Exposed read-only for the settings display and manual diagnostics.
  Object.defineProperty(window,'MASHUP_VERSION',{value:CURRENT_VERSION,configurable:false});
})();
