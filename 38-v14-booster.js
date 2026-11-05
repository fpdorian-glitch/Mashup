/* Mashup V14 — booster presentation only.
   Results stay in their original order. Preparing, confirming and cancelling
   an opening remain the responsibility of the existing transaction flow. */
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const rarityNames={common:'Commune',rare:'Rare',epic:'Épique',legendary:'Légendaire',mythic:'Mythique',ultra:'Ultra'};
const arrow='<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 13 13 3M3 3h10v10" stroke="currentColor" stroke-width="1.2"/></svg>';
const resultValue=(card,key)=>card&&typeof card==='object'?Object.getOwnPropertyDescriptor(card,key)?.value:undefined;
function readableResult(card){
  if(!card||typeof card!=='object')return false;
  let current=card;
  while(current){
    const hidden=Object.getOwnPropertyDescriptor(current,'hidden');
    if(hidden)return 'value' in hidden&&!hidden.value;
    current=Object.getPrototypeOf(current);
  }
  return true;
}

/** Review only, after revelation. No sorting, inventory inference or acquisition. */
export function openingReviewStats(results=[]){
  const cards=Array.isArray(results)?results:[];
  let fresh=0,duplicates=0,exceptional=0,spotlight=-1,best=0;
  cards.forEach((card,index)=>{
    if(!readableResult(card))return;
    const rank=Object.keys(rarityNames).indexOf(resultValue(card,'rarity'))+1;
    const variant=resultValue(card,'variant');
    if(resultValue(card,'isNew')===true)fresh++;else duplicates++;
    const notable=rank>=4||variant==='secret'||variant==='gold';
    if(notable)exceptional++;
    const priority=variant==='secret'?10+rank:rank;
    if(notable&&priority>best){best=priority;spotlight=index;}
  });
  return Object.freeze({count:cards.length,fresh,duplicates,exceptional,spotlight});
}

function sealEmblem(){
  return '<svg class="v14-seal-emblem" viewBox="0 0 200 220" fill="none" aria-hidden="true"><circle cx="100" cy="108" r="63"/><circle cx="100" cy="108" r="54"/><ellipse cx="100" cy="108" rx="32" ry="78" transform="rotate(36 100 108)"/><ellipse cx="100" cy="108" rx="32" ry="78" transform="rotate(-36 100 108)"/><path d="M100 22 116 87 175 108 116 129 100 195 84 129 25 108 84 87Z"/><path class="v14-seal-emblem-core" d="m100 72 24 36-24 36-24-36Z"/><path d="M100 3v11m0 190v11M5 108h11m168 0h11M34 41l8 8m116 118 8 8M34 175l8-8M158 49l8-8"/><circle cx="100" cy="108" r="6"/></svg>';
}

/** A sealed packet, without any hint about the prepared results or their odds. */
export function sealedPackMarkup(pack={},esc=escapeHTML){
  const count=Number(pack.count);
  const amount=Number.isSafeInteger(count)&&count>0?`${count} carte${count>1?'s':''}`:'Cartes à découvrir';
  return `<section class="v14-sealed-scene" aria-label="Booster scellé">
    <p class="v14-opening-kicker">UN NOUVEAU CHAPITRE</p>
    <button class="v14-seal-trigger" type="button" data-v14-break-seal aria-label="Ouvrir le booster ${esc(pack.name||'Mashup')}" aria-describedby="v14-seal-hint">
      <span class="v14-sealed-pack" aria-hidden="true">
        <span class="v14-seal-cap"><span>DÉCHIRER LE SCEAU <b>${arrow}</b></span></span>
        <span class="v14-seal-body">
          <span class="v14-seal-edition">MASHUP <i>COLLECTION</i></span>
          <span class="v14-seal-orbit"></span>${sealEmblem()}
          <span class="v14-seal-pack-name">${esc(pack.name||'Booster')}</span>
          <span class="v14-seal-count">${esc(amount)}</span>
          <span class="v14-seal-bottom">CHAQUE CARTE A SON HISTOIRE</span>
        </span>
        <span class="v14-seal-glint"></span>
      </span>
      <span class="v14-seal-cta">Briser le sceau <span aria-hidden="true">${arrow}</span></span>
    </button>
    <p id="v14-seal-hint" class="v14-seal-hint">Touche le paquet ou glisse le sceau vers la droite.</p>
  </section>`;
}

/** Review only: the existing confirm button is the sole transaction trigger. */
export function summaryMarkup(results=[],renderCard=()=>'',esc=escapeHTML){
  const cards=Array.isArray(results)?results:[];
  const review=openingReviewStats(cards),fresh=review.fresh;
  const description=cards.length?`${cards.length} carte${cards.length>1?'s':''} dévoilée${cards.length>1?'s':''}${fresh?` · ${fresh} nouvelle${fresh>1?'s':''}`:''}`:'Aucune carte à afficher';
  return `<section class="v14-opening-summary" aria-labelledby="v14-summary-title">
    <div class="v14-summary-heading"><span class="v14-opening-kicker">OUVERTURE TERMINÉE</span><h2 id="v14-summary-title">Ton tirage.</h2><p>${esc(description)}</p></div>
    ${cards.length?`<dl class="v154-review-stats" aria-label="Bilan du tirage"><div><dt>Nouvelles</dt><dd>${review.fresh}</dd></div><div><dt>Doublons</dt><dd>${review.duplicates}</dd></div><div><dt>Remarquables</dt><dd>${review.exceptional}</dd></div></dl>`:''}
    <ol class="v14-summary-cards" aria-label="Cartes dévoilées, dans l’ordre du tirage">${cards.map((card,index)=>{
      if(!readableResult(card))return '<li class="v14-summary-item"><div class="v154-review-unavailable">Carte indisponible</div></li>';
      const variant=resultValue(card,'variant'),rank=resultValue(card,'rarity');
      const rarity=variant==='secret'?(rank==='ultra'?'Ultra secrète':'Secrète'):(Object.hasOwn(rarityNames,rank)?rarityNames[rank]:'Carte');
      const tier=variant==='secret'?'secret':Object.hasOwn(rarityNames,rank)?rank:'common';
      return `<li class="v14-summary-item" data-reveal-tier="${tier}" ${review.spotlight===index?'data-review-spotlight="true" ':''}style="--v15-summary-index:${Math.min(index,6)}"><div class="v14-summary-card">${renderCard(card,{revealedOpponent:true,lazy:true})}</div><span class="v14-summary-card-label"><span>${esc(resultValue(card,'name')||`Carte ${index+1}`)}</span><small>${esc(rarity)}${resultValue(card,'isNew')===true?' · NOUVELLE':''}</small></span></li>`;
    }).join('')}</ol>
    <p class="v14-summary-pending"><span aria-hidden="true">◇</span> Confirme ci-dessous pour ajouter ces cartes à ta collection et valider le paiement.</p>
  </section>`;
}

/** Delegated click handling supports touch, mouse and native keyboard activation.
 * Call the returned cleanup when the modal closes or its contents change.
 * `fast` may be a function so that the existing speed switch stays effective.
 */
export function mountSealedPack({root=globalThis.document?.getElementById('opening-stack'),onOpen=()=>{},fast=false}={}){
  if(!root?.addEventListener)return ()=>{};
  let timer=null,started=false,disposed=false,gesture=null,suppressClickUntil=0;
  function resetGesture(){
    if(gesture?.captured){try{gesture.button.releasePointerCapture?.(gesture.id);}catch{}}
    gesture=null;
    root.classList?.remove('v154-is-tearing');
    root.style?.removeProperty?.('--v154-tear-progress');
  }
  const cleanup=()=>{
    disposed=true;
    if(timer!==null){clearTimeout(timer);timer=null;}
    root.removeEventListener('click',onClick);
    root.removeEventListener('pointerdown',onPointerDown);
    root.removeEventListener('pointermove',onPointerMove);
    root.removeEventListener('pointerup',onPointerUp);
    root.removeEventListener('pointercancel',onPointerCancel);
    resetGesture();
    root.classList?.remove('v14-is-opening');
  };
  const openNow=()=>{
    if(disposed||!started)return;
    const connected=root.isConnected!==false;
    cleanup();
    if(connected)onOpen();
  };
  // The cleanup remains callable; the speed switch can also finish a tear.
  cleanup.accelerate=openNow;
  function startOpening(button){
    if(started||disposed||!button||!root.contains(button))return;
    resetGesture();
    started=true;
    button.disabled=true;
    button.setAttribute('aria-label','Ouverture du booster');
    root.classList?.add('v14-is-opening');
    const doc=root.ownerDocument||globalThis.document;
    const quick=(typeof fast==='function'?fast():fast)||doc?.documentElement?.dataset?.m13Quality==='eco'||!!doc?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    // One short tear; never force the player to watch a long opening again.
    timer=setTimeout(()=>{
      timer=null;
      openNow();
    },quick?0:310);
  }
  function onClick(event){
    if(Date.now()<suppressClickUntil){event.preventDefault?.();return;}
    startOpening(event.target?.closest?.('[data-v14-break-seal]'));
  }
  function onPointerDown(event){
    if(started||disposed||gesture||event.isPrimary===false||(event.button!==undefined&&event.button!==0))return;
    const button=event.target?.closest?.('[data-v14-break-seal]');
    if(!button||!root.contains(button)||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
    const width=Number(button.getBoundingClientRect?.().width)||205;
    gesture={id:event.pointerId,button,x:event.clientX,y:event.clientY,ratio:0,dragged:false,captured:false,distance:Math.max(58,Math.min(100,width*.38))};
  }
  function onPointerMove(event){
    if(!gesture||gesture.id!==event.pointerId||started||disposed)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
    // The vertical gesture belongs to page scrolling, never to opening a pack.
    if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){suppressClickUntil=Date.now()+400;resetGesture();return;}
    if(Math.abs(dx)<8&&!gesture.dragged)return;
    gesture.dragged=true;
    if(!gesture.captured){try{gesture.button.setPointerCapture?.(gesture.id);gesture.captured=true;}catch{}}
    gesture.ratio=Math.max(0,Math.min(1,dx/gesture.distance));
    root.classList?.add('v154-is-tearing');
    root.style?.setProperty?.('--v154-tear-progress',gesture.ratio.toFixed(3));
    if(event.cancelable)event.preventDefault?.();
  }
  function onPointerUp(event){
    if(!gesture||gesture.id!==event.pointerId)return;
    onPointerMove(event);
    if(!gesture)return;
    const current=gesture;
    resetGesture();
    // Prevent an incomplete swipe's synthetic click from opening accidentally.
    if(current.dragged)suppressClickUntil=Date.now()+400;
    if(current.ratio>=.55)startOpening(current.button);
  }
  function onPointerCancel(event){if(gesture?.id===event.pointerId){suppressClickUntil=Date.now()+400;resetGesture();}}
  root.addEventListener('click',onClick);
  const view=root.ownerDocument?.defaultView||globalThis.window;
  if(typeof view?.PointerEvent==='function'){
    root.addEventListener('pointerdown',onPointerDown);
    root.addEventListener('pointermove',onPointerMove,{passive:false});
    root.addEventListener('pointerup',onPointerUp);
    root.addEventListener('pointercancel',onPointerCancel);
  }
  return cleanup;
}
