/* Mashup V11.4 — accessible, on-demand collection picker for public sales.
 * Keeps all filters local. Only owned, active cards enter the picker (including secrets);
 * server-side ownership and escrow validation remain authoritative.
 */
export function createSaleCardPicker({getCards,getFavorites,esc,renderCard,onPick}){
  const DEFAULTS={search:'',rarity:'all',series:'all',universe:'all',variant:'all',ownership:'all',sort:'rarity-desc'};
  const filters={...DEFAULTS};
  const rarityOrder={common:0,rare:1,epic:2,legendary:3,mythic:4,ultra:5};
  const variantLabels={standard:'Standard',full_art:'Full Art',gold:'Gold',secret:'Secrète'};
  let limit=24,returnFocus=null;
  const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('fr-FR');
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const root=()=>document.getElementById('v114-sale-picker');
  function renderPreview(card){
    if(!card)return '<div class="v114-selection-empty"><span>✧</span><div><b>Aucune carte choisie</b><small>Ouvre ta collection pour sélectionner un exemplaire.</small></div></div>';
    return '<div class="v114-selection-card"><div class="v114-selection-art">'+renderCard(card,{lazy:true,revealedOpponent:true})+'</div><div><strong>'+esc(card.name)+'</strong><small>'+esc(card.family||'Univers')+' · '+esc(card.rarity||'')+' · S'+(Number(card.editionSeries)||1)+'</small><small>'+fmt(card.qty)+' exemplaire(s) disponible(s)</small></div></div>';
  }
  function filtered(){
    const cards=getCards().filter(c=>c&&c.id&&Number(c.qty)>0&&!c.hidden);
    const favs=new Set(getFavorites()||[]);
    const q=normalize(filters.search.trim());
    return cards.filter(c=>
      (!q||normalize(c.name+' '+c.family+' '+(c.editionNumber||'')+' '+c.id).includes(q))&&
      (filters.rarity==='all'||c.rarity===filters.rarity)&&
      (filters.series==='all'||String(Number(c.editionSeries)||1)===filters.series)&&
      (filters.universe==='all'||c.family===filters.universe)&&
      (filters.variant==='all'||(c.variant||'standard')===filters.variant)&&
      (filters.ownership==='all'||(filters.ownership==='duplicates'?c.qty>1:favs.has(c.id)))
    ).sort((a,b)=>{
      const name=String(a.name||'').localeCompare(String(b.name||''),'fr');
      const ra=(rarityOrder[a.rarity]||0),rb=(rarityOrder[b.rarity]||0);
      if(filters.sort==='name-asc')return name;
      if(filters.sort==='name-desc')return -name;
      if(filters.sort==='quantity-desc')return b.qty-a.qty||name;
      if(filters.sort==='serial')return (Number(a.editionSeries)||1)-(Number(b.editionSeries)||1)||
        (Number(a.editionNumber)||9999)-(Number(b.editionNumber)||9999)||name;
      return rb-ra||name;
    });
  }
  function renderGrid(){
    const overlay=root();if(!overlay)return;
    const cards=filtered(),shown=cards.slice(0,limit);
    const grid=overlay.querySelector('#v114-picker-grid');
    const count=overlay.querySelector('#v114-picker-count');
    const more=overlay.querySelector('#v114-picker-more');
    if(count)count.textContent=shown.length+' / '+cards.length+' cartes';
    if(grid)grid.innerHTML=shown.length?shown.map(c=>
      '<button type="button" class="v114-card-button" data-v114-pick="'+esc(c.id)+'" aria-label="Choisir '+esc(c.name)+', '+fmt(c.qty)+' exemplaires">'+
        '<span class="v114-card-image">'+renderCard(c,{lazy:true,revealedOpponent:true})+'</span>'+
        '<span class="v114-card-bottom"><strong>'+esc(c.name)+'</strong><span>× '+fmt(c.qty)+'</span></span>'+
      '</button>'
    ).join(''):'<div class="v114-picker-empty">Aucune carte ne correspond à ces filtres. Modifie ta recherche ou réinitialise-les.</div>';
    if(more){
      more.hidden=cards.length<=limit;
      more.textContent='Afficher '+Math.min(24,Math.max(0,cards.length-limit))+' cartes supplémentaires';
    }
  }
  function option(value,label){return '<option value="'+esc(value)+'">'+esc(label)+'</option>';}
  function selectField(id,label,entries,value){
    return '<label class="v114-filter">'+esc(label)+'<select id="v114-'+id+'" data-v114-filter="'+esc(id)+'">'+
      entries.map(pair=>'<option value="'+esc(pair[0])+'" '+(value===pair[0]?'selected':'')+'>'+esc(pair[1])+'</option>').join('')+
      '</select></label>';
  }
  function open(){
    if(root())return;
    const cards=getCards().filter(c=>c&&!c.hidden&&Number(c.qty)>0);
    const rarities=[['all','Toutes'],...Object.keys(rarityOrder).map(k=>[k,({common:'Commune',rare:'Rare',epic:'Épique',legendary:'Légendaire',mythic:'Mythique',ultra:'Ultra'})[k]])];
    const families=[...new Set(cards.map(c=>c.family).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
    const series=[...new Set(cards.map(c=>Number(c.editionSeries)||1))].sort((a,b)=>a-b);
    const variants=[...new Set(cards.map(c=>c.variant||'standard'))].sort();
    returnFocus=document.activeElement;
    limit=24;
    const overlay=document.createElement('div');
    overlay.className='v114-picker-backdrop';overlay.id='v114-sale-picker';
    overlay.innerHTML='<div class="v114-picker-panel" role="dialog" aria-modal="true" aria-labelledby="v114-picker-title">'+
      '<header class="v114-picker-head"><div><span class="eyebrow">MASHUP · MON CODEX</span><h2 id="v114-picker-title">Choisir une carte à vendre</h2><p>Sélectionne une de tes cartes. L’exemplaire ne sera réservé qu’après publication.</p></div>'+
      '<button type="button" class="v114-picker-close" data-v114-close aria-label="Fermer la collection">×</button></header>'+
      '<div class="v114-picker-filters">'+
      '<label class="v114-filter v114-filter-search">Rechercher une carte<input type="search" id="v114-search" data-v114-filter="search" autocomplete="off" placeholder="Nom ou univers…" value="'+esc(filters.search)+'"></label>'+
      selectField('rarity','Rareté',rarities,filters.rarity)+
      selectField('series','Série',[['all','Toutes'],...series.map(n=>[String(n),'S'+n])],filters.series)+
      selectField('universe','Univers',[['all','Tous'],...families.map(f=>[f,f])],filters.universe)+
      selectField('variant','Finition',[['all','Toutes'],...variants.map(v=>[v,variantLabels[v]||v])],filters.variant)+
      selectField('ownership','Collection',[['all','Toutes mes cartes'],['duplicates','Avec doublons'],['favorites','Favoris']],filters.ownership)+
      selectField('sort','Trier',[['rarity-desc','Rareté décroissante'],['serial','Numéro de série'],['name-asc','Nom A → Z'],['name-desc','Nom Z → A'],['quantity-desc','Nombre possédé']],filters.sort)+
      '</div>'+
      '<div class="v114-picker-toolbar"><strong id="v114-picker-count" aria-live="polite"></strong><button type="button" class="v114-reset" data-v114-reset>Réinitialiser les filtres</button></div>'+
      '<div class="v114-picker-grid" id="v114-picker-grid"></div>'+
      '<footer class="v114-picker-foot"><button type="button" class="btn btn-sm" id="v114-picker-more" data-v114-more hidden>Afficher plus</button><button type="button" class="btn btn-sm" data-v114-close>Annuler</button></footer>'+
      '</div>';
    overlay.addEventListener('click',onClick);
    overlay.addEventListener('input',onInput);
    overlay.addEventListener('change',onInput);
    document.body.appendChild(overlay);
    document.body.classList.add('v114-picker-open');
    document.addEventListener('keydown',onKeydown);
    renderGrid();
    overlay.querySelector('#v114-search')?.focus();
  }
  function close(){
    const overlay=root();if(!overlay)return;
    overlay.removeEventListener('click',onClick);
    overlay.removeEventListener('input',onInput);
    overlay.removeEventListener('change',onInput);
    overlay.remove();
    document.body.classList.remove('v114-picker-open');
    document.removeEventListener('keydown',onKeydown);
    if(returnFocus?.isConnected)returnFocus.focus();
    returnFocus=null;
  }
  function onClick(event){
    if(event.target===root()||event.target.closest('[data-v114-close]')){close();return;}
    const select=event.target.closest('[data-v114-pick]');
    if(select){
      const card=getCards().find(c=>c.id===select.dataset.v114Pick&&!c.hidden&&c.qty>0);
      if(card){onPick(card);close();}
      return;
    }
    if(event.target.closest('[data-v114-reset]')){
      Object.assign(filters,DEFAULTS);limit=24;
      const overlay=root();
      for(const [key,value] of Object.entries(filters)){
        const field=overlay?.querySelector('[data-v114-filter="'+key+'"]');
        if(field)field.value=value;
      }
      renderGrid();
    }
    if(event.target.closest('[data-v114-more]')){limit+=24;renderGrid();}
  }
  function onInput(event){
    const key=event.target?.dataset?.v114Filter;
    if(!key||!(key in filters))return;
    if(filters[key]===event.target.value)return;
    filters[key]=event.target.value;
    limit=24;renderGrid();
  }
  function onKeydown(event){
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab')return;
    const overlay=root();if(!overlay)return;
    const focusable=[...overlay.querySelectorAll('button:not([disabled]):not([hidden]),input:not([disabled]),select:not([disabled])')].filter(el=>el.getClientRects().length);
    if(!focusable.length)return;
    if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0].focus();}
  }
  return {open,close,renderPreview};
}
