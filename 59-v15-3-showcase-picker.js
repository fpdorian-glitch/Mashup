/* Mashup V15.3 — visual, owned-only showcase picker. No inventory writes. */
export function showcaseEligible(cards){
  return (Array.isArray(cards)?cards:[]).filter(card=>card&&card.id&&!card.hidden&&!card.archived&&Number(card.qty)>0);
}
export function createShowcasePicker({getCards,renderCard,esc,onPick}){
  let slot='primary',returnFocus=null,dialog=null,limit=24;
  const filt={search:'',rarity:'all',series:'all',universe:'all'};
  const normalise=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
  const eligible=()=>showcaseEligible(getCards());
  function chosen(){
    const term=normalise(filt.search);
    return eligible().filter(c=>(filt.rarity==='all'||c.rarity===filt.rarity)&&
      (filt.series==='all'||String(c.editionSeries||1)===filt.series)&&
      (filt.universe==='all'||c.family===filt.universe)&&
      (!term||normalise(c.name+' '+c.family).includes(term))).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  }
  function grid(){
    if(!dialog)return;
    const list=chosen();
    const area=dialog.querySelector('[data-v153-grid]');
    area.innerHTML=list.slice(0,limit).map(c=>'<button type="button" class="v153-pick" data-v153-card="'+esc(c.id)+'" aria-label="Choisir '+esc(c.name)+'">'+
      '<span class="v153-pick-art">'+renderCard(c,{lazy:true,revealedOpponent:true})+'</span>'+
      '<span class="v153-pick-label"><b>'+esc(c.name)+'</b><small>'+esc(c.family||'')+' · '+esc(c.rarity||'')+'</small></span></button>').join('')||
      '<p class="v153-empty">Aucune carte correspondante dans ta collection.</p>';
    dialog.querySelector('[data-v153-count]').textContent=list.length+' carte(s) disponibles';
    dialog.querySelector('[data-v153-more]').hidden=list.length<=limit;
  }
  function close(){
    if(!dialog)return;
    dialog.remove();dialog=null;
    document.body.classList.remove('v153-picker-open');
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  }
  function open(target){
    if(!['primary','0','1','2'].includes(String(target)))return;
    close();slot=String(target);returnFocus=document.activeElement;limit=24;
    filt.search='';filt.rarity='all';filt.series='all';filt.universe='all';
    const cards=eligible();
    const types=Array.from(new Set(cards.map(c=>c.family).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'fr'));
    const series=Array.from(new Set(cards.map(c=>Number(c.editionSeries)||1))).sort((a,b)=>a-b);
    dialog=document.createElement('div');dialog.className='v153-overlay';dialog.id='v153-showcase-picker';
    dialog.innerHTML='<section class="v153-dialog" role="dialog" aria-modal="true" aria-labelledby="v153-title">'+
      '<header class="v153-head"><div><span class="eyebrow">MA COLLECTION · VITRINE</span><h2 id="v153-title">Choisir une carte</h2><p>Sélectionne une carte que tu possèdes.</p></div><button type="button" class="v153-close" data-v153-close aria-label="Fermer">×</button></header>'+
      '<div class="v153-filters"><label>Recherche<input type="search" data-v153-filter="search" placeholder="Nom ou univers…"></label>'+
      '<label>Rareté<select data-v153-filter="rarity"><option value="all">Toutes</option>'+
      ['common','rare','epic','legendary','mythic','ultra'].map(x=>'<option value="'+x+'">'+x+'</option>').join('')+'</select></label>'+
      '<label>Série<select data-v153-filter="series"><option value="all">Toutes</option>'+series.map(x=>'<option value="'+x+'">S'+x+'</option>').join('')+'</select></label>'+
      '<label>Univers<select data-v153-filter="universe"><option value="all">Tous</option>'+types.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')+'</select></label></div>'+
      '<div class="v153-toolbar"><span data-v153-count aria-live="polite"></span><button type="button" data-v153-clear>Retirer la carte de cet emplacement</button></div>'+
      '<div class="v153-grid" data-v153-grid></div>'+
      '<footer class="v153-footer"><button type="button" class="btn btn-sm" data-v153-more hidden>Afficher plus</button><button type="button" class="btn btn-sm" data-v153-close>Annuler</button></footer></section>';
    document.body.appendChild(dialog);document.body.classList.add('v153-picker-open');grid();
    dialog.querySelector('[data-v153-filter="search"]')?.focus({preventScroll:true});
    dialog.addEventListener('click',event=>{
      if(event.target===dialog||event.target.closest('[data-v153-close]')){close();return;}
      if(event.target.closest('[data-v153-more]')){limit+=24;grid();return;}
      if(event.target.closest('[data-v153-clear]')){if(onPick(slot,null)!==false)close();return;}
      const button=event.target.closest('[data-v153-card]');
      if(!button)return;
      const card=eligible().find(c=>c.id===button.dataset.v153Card);
      if(card&&onPick(slot,card)!==false)close();
    });
    const filter=e=>{const key=e.target?.dataset?.v153Filter;if(!Object.hasOwn(filt,key))return;filt[key]=e.target.value;limit=24;grid();};
    dialog.addEventListener('input',filter);dialog.addEventListener('change',filter);
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();close();return;}
      if(event.key!=='Tab')return;
      const focus=[...dialog.querySelectorAll('button:not([hidden]),input,select')].filter(e=>e.getClientRects().length);
      if(!focus.length)return;
      if(event.shiftKey&&document.activeElement===focus[0]){event.preventDefault();focus.at(-1).focus();}
      if(!event.shiftKey&&document.activeElement===focus.at(-1)){event.preventDefault();focus[0].focus();}
    });
  }
  return {open,close};
}
