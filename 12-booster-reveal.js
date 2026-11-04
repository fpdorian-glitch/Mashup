/* Mashup V12.0 — lightweight, smooth booster reveal controller.
   Only animates client-side after the card's face is exposed.
   Never modifies draw odds, Supabase balances, or pack order.
*/
export function createBoosterRevealFX(){
  const KEY='mashup-fast-reveal-v1';
  let fast=false;
  try{fast=localStorage.getItem(KEY)==='1';}catch{}
  let clearTimer=null;
  const reduceMotion=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const mobile=()=>!!window.matchMedia?.('(max-width: 720px)')?.matches;
  const shell=()=>document.querySelector('.opening-fullscreen');
  const classes=['fx-prelude','fx-unveiled','fx-active','fx-rare','fx-epic','fx-legendary','fx-mythic','fx-ultra','fx-secret','fx-ultra-secret','fx-premium'];
  const tiers=['common','rare','epic','legendary','mythic','ultra'];
  function tierOf(card){
    if(!card)return 'common';
    if(card.variant==='secret')return card.rarity==='ultra'?'ultra-secret':'secret';
    return tiers.includes(card.rarity)?card.rarity:'common';
  }
  function isFast(){return fast||reduceMotion()||document.documentElement?.dataset.m13Quality==='eco';}
  function flipMs(){
    return reduceMotion()?20:isFast()?230:mobile()?680:790;
  }
  function preludeMs(card){if(isFast())return 0;const t=tierOf(card);return ['common','rare','epic'].includes(t)?0:mobile()?90:165;}
  function prelude(card){reset();const root=shell();if(root&&preludeMs(card)){root.classList.add('fx-prelude');root.style.setProperty('--fx-intensity',tierOf(card)==='legendary'?'0.46':tierOf(card)==='mythic'?'0.62':tierOf(card)==='ultra-secret'?'0.92':'0.78');}}
  function unveil(){shell()?.classList.add('fx-unveiled');}
  function putAwayMs(){
    return reduceMotion()?20:isFast()?145:mobile()?230:300;
  }
  function controls(){
    return '<button id="opening-speed" data-action="toggle-opening-speed" class="opening-speed" type="button" aria-label="Changer la vitesse des animations de boosters" aria-pressed="'+String(fast)+'">'+(fast?'⚡ Mode rapide':'✦ Mode cinéma')+'</button>';
  }
  function sync(){
    const root=shell();
    if(!root)return;
    root.style.setProperty('--mashup-flip-time',flipMs()+'ms');
    root.classList.toggle('opening-quick',isFast());
    const button=root.querySelector('#opening-speed');
    if(button){
      button.textContent=fast?'⚡ Mode rapide':'✦ Mode cinéma';
      button.setAttribute('aria-pressed',String(fast));
      button.title=fast?'Activer les animations cinématiques':'Passer en animations rapides';
    }
  }
  function toggle(){
    fast=!fast;
    try{localStorage.setItem(KEY,fast?'1':'0');}catch{}
    sync();
    return fast;
  }
  function reset(){
    if(clearTimer!==null){clearTimeout(clearTimer);clearTimer=null;}
    const root=shell();
    if(root)root.classList.remove(...classes);
    const badge=root?.querySelector('#opening-vfx-label');
    if(badge)badge.textContent='';
  }
  function play(card){
    reset();
    const root=shell();
    const tier=tierOf(card);
    if(!root||tier==='common'||isFast())return tier;
    root.classList.remove('fx-prelude');
    root.classList.add('fx-active','fx-'+tier);
    if(card.variant==='gold'||card.variant==='full_art')root.classList.add('fx-premium');
    const badge=root.querySelector('#opening-vfx-label');
    if(badge){
      badge.textContent=({
        rare:'RARE',epic:'ÉPIQUE',legendary:'LÉGENDAIRE',
        mythic:'MYTHIQUE',ultra:'ULTRA',secret:'SECRÈTE',
        'ultra-secret':'ULTRA SECRÈTE'
      })[tier]||'';
    }
    clearTimer=setTimeout(()=>{
      const old=shell();
      if(old===root){
        root.classList.remove(...classes);
        if(badge)badge.textContent='';
      }
      clearTimer=null;
    },tier==='ultra-secret'?2600:tier==='secret'?2400:tier==='ultra'||tier==='mythic'?2150:1800);
    return tier;
  }
  function decorations(){
    return '<div id="opening-vfx" class="opening-vfx" aria-hidden="true">'+
      '<span class="opening-vfx-halo"></span>'+
      '<span class="opening-vfx-ring"></span>'+
      '<span class="opening-vfx-runes"></span>'+
      '<span class="opening-vfx-particles">'+
      Array.from({length:mobile()?8:12},(_,i)=>'<i style="--angle:'+(i*(mobile()?45:30))+'deg;--delay:'+(i*45)+'ms"></i>').join('')+
      '</span>'+
      '<span class="opening-vfx-name" id="opening-vfx-label"></span>'+
      '</div>';
  }
  return {tierOf,flipMs,preludeMs,prelude,unveil,putAwayMs,isFast,controls,decorations,sync,toggle,reset,play};
}
