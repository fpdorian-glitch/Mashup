/* Mashup V14 — booster presentation only.
   Results stay in their original order. Preparing, confirming and cancelling
   an opening remain the responsibility of the existing transaction flow. */
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const rarityNames={common:'Commune',rare:'Rare',epic:'Épique',legendary:'Légendaire',mythic:'Mythique',ultra:'Ultra'};
const arrow='<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 13 13 3M3 3h10v10" stroke="currentColor" stroke-width="1.2"/></svg>';

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
    <p id="v14-seal-hint" class="v14-seal-hint">Touche le paquet pour découvrir ton tirage.</p>
  </section>`;
}

/** Review only: the existing confirm button is the sole transaction trigger. */
export function summaryMarkup(results=[],renderCard=()=>'',esc=escapeHTML){
  const cards=Array.isArray(results)?results:[];
  const fresh=cards.filter(card=>card?.isNew).length;
  const description=cards.length?`${cards.length} carte${cards.length>1?'s':''} dévoilée${cards.length>1?'s':''}${fresh?` · ${fresh} nouvelle${fresh>1?'s':''}`:''}`:'Aucune carte à afficher';
  return `<section class="v14-opening-summary" aria-labelledby="v14-summary-title">
    <div class="v14-summary-heading"><span class="v14-opening-kicker">OUVERTURE TERMINÉE</span><h2 id="v14-summary-title">Ton tirage.</h2><p>${esc(description)}</p></div>
    <ol class="v14-summary-cards" aria-label="Cartes dévoilées, dans l’ordre du tirage">${cards.map((card,index)=>{
      const rarity=card?.variant==='secret'?(card.rarity==='ultra'?'Ultra secrète':'Secrète'):(rarityNames[card?.rarity]||'Carte');
      const tier=card?.variant==='secret'?'secret':Object.hasOwn(rarityNames,card?.rarity)?card.rarity:'common';
      return `<li class="v14-summary-item" data-reveal-tier="${tier}" style="--v15-summary-index:${Math.min(index,6)}"><div class="v14-summary-card">${renderCard(card,{revealedOpponent:true,lazy:true})}</div><span class="v14-summary-card-label"><span>${esc(card?.name||`Carte ${index+1}`)}</span><small>${esc(rarity)}${card?.isNew?' · NOUVELLE':''}</small></span></li>`;
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
  let timer=null,started=false,disposed=false;
  const cleanup=()=>{
    disposed=true;
    if(timer!==null){clearTimeout(timer);timer=null;}
    root.removeEventListener('click',onClick);
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
  const onClick=event=>{
    const button=event.target?.closest?.('[data-v14-break-seal]');
    if(started||disposed||!button||!root.contains(button))return;
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
  };
  root.addEventListener('click',onClick);
  return cleanup;
}
