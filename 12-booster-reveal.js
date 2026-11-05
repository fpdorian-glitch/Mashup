/* Mashup V15 — lightweight booster anticipation and reveal controller.
   Rarity anticipation is client-only; labels appear after the face is exposed.
   Never modifies draw odds, Supabase balances, or pack order.
*/
const tiers=['common','rare','epic','legendary','mythic','ultra'];
export function revealTier(card){
  if(card?.variant==='secret')return card.rarity==='ultra'?'ultra-secret':'secret';
  return tiers.includes(card?.rarity)?card.rarity:'common';
}

/** Timings describe presentation only; card order and draws are never touched. */
export function getRevealTimings(card,{fast=false,reduced=false,eco=false}={}){
  if(reduced)return {prelude:0,flip:20};
  if(fast||eco)return {prelude:0,flip:fast?140:120};
  const tier=revealTier(card);
  return {
    prelude:({legendary:150,mythic:230,ultra:180,secret:240,'ultra-secret':290})[tier]||0,
    flip:({common:180,rare:300,epic:430,legendary:600,mythic:700,ultra:800,secret:850,'ultra-secret':1000})[tier]
  };
}
export function createBoosterRevealFX(){
  const KEY='mashup-fast-reveal-v1';
  let fast=false;
  try{fast=localStorage.getItem(KEY)==='1';}catch{}
  let clearTimer=null,lastCard=null;
  const reduceMotion=()=>!!globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const mobile=()=>!!globalThis.window?.matchMedia?.('(max-width: 720px)')?.matches;
  const shell=()=>document.querySelector('.opening-fullscreen');
  const classes=['fx-prelude','fx-unveiled','fx-active','fx-common','fx-rare','fx-epic','fx-legendary','fx-mythic','fx-ultra','fx-secret','fx-ultra-secret','fx-premium'];
  const tierOf=revealTier;
  function timingsFor(card=lastCard){
    return getRevealTimings(card,{fast,reduced:reduceMotion(),eco:document.documentElement?.dataset.m13Quality==='eco'});
  }
  function isFast(){return fast||reduceMotion()||document.documentElement?.dataset.m13Quality==='eco';}
  function flipMs(card=lastCard){return timingsFor(card).flip;}
  function preludeMs(card){return timingsFor(card).prelude;}
  function prelude(card){
    reset();
    lastCard=card;applyTiming(card);
    const root=shell(),tier=tierOf(card);
    if(root&&preludeMs(card)){
      root.classList.add('fx-prelude','fx-'+tier);
      root.style.setProperty('--fx-intensity',tier==='legendary'?'0.46':tier==='mythic'?'0.62':tier==='ultra-secret'?'0.92':'0.78');
    }
  }
  function unveil(){shell()?.classList.add('fx-unveiled');}
  function putAwayMs(){
    return reduceMotion()?20:isFast()?100:150;
  }
  function controls(){
    return '<button id="opening-speed" data-action="toggle-opening-speed" class="opening-speed" type="button" aria-label="Changer la vitesse des animations de boosters" aria-pressed="'+String(fast)+'">'+(fast?'⚡ Mode rapide':'✦ Mode cinéma')+'</button>';
  }
  function applyTiming(card=lastCard){
    const root=shell();
    if(!root)return;
    root.style.setProperty('--mashup-flip-time',flipMs(card)+'ms');
    root.style.setProperty('--v15-reveal-time',Math.max(400,flipMs(card)+280)+'ms');
    root.style.setProperty('--v15-prelude-time',preludeMs(card)+'ms');
  }
  function sync(card=lastCard){
    const root=shell();
    if(!root)return;
    applyTiming(card);
    root.classList.toggle('opening-quick',isFast());
    if(isFast())reset();
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
    lastCard=card;applyTiming(card);
    const root=shell();
    const tier=tierOf(card);
    if(!root)return tier;
    root.classList.add('fx-'+tier);
    if(tier==='common'||isFast())return tier;
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
    },flipMs(card)+900);
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
  return {tierOf,timingsFor,flipMs,preludeMs,prelude,unveil,putAwayMs,isFast,controls,decorations,sync,toggle,reset,play};
}
