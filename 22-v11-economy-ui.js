/* Mashup V15.3 — marketplace, leaderboard & permanent achievements.
 * All transactions occur on Supabase. Pages load their own small data on demand.
 */
import {createMarketArtPreviews} from './61-v15-3-market-art.js?v=15.3.0';
export function createV11UI({api,esc,toast,getCards,getFavorites,getCardById,renderCard,createSaleCardPicker,getUser,getView,getMarketMode,onState,refreshAccount}){
 let market={listings:[],myListings:[],limits:{maxPrice:250000}},leaderboard=null,boardMode='collection',achievements=[],marketBusy=false,achBusy=false;
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('fr-FR');
 const cardEstimate=c=>{
   const values={common:90,rare:220,epic:650,legendary:1800,mythic:4800,ultra:11500};
   const base=values[c?.rarity]||90,mult=c?.variant==='gold'?1.5:c?.variant==='full_art'?1.24:1;
   return Math.round(base*mult*1.2/10)*10;
 };
 const viewMoney=n=>fmt(n)+' ◉';
 const myCards=()=>getCards().filter(c=>!c.hidden&&c.qty>0).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 let selectedSaleCardId='';
 const picker=createSaleCardPicker({getCards:myCards,getFavorites,esc,renderCard,onPick:applySelectedSaleCard});
 function applySelectedSaleCard(card){
   selectedSaleCardId=card.id;
   const root=marketRoot(),input=root?.querySelector('#v11-sale-card'),preview=root?.querySelector('#v11-sale-selection');
   if(input)input.value=card.id;
   if(preview)preview.innerHTML=picker.renderPreview(card);
   updateEstimatedPrice();
 }
 function marketRoot(){return document.getElementById('market-v11-content');}
 const marketArt=createMarketArtPreviews({api,renderCard,getCardById,getRoot:marketRoot,getView,getMode:getMarketMode});
 function listingCard(l,mine=false){
   const card=l.card;if(!card)return '';
   const self=l.sellerId===getUser()?.id;
   const rarity=String(card.rarity||'common').toLowerCase();
   const mineActions=mine&&l.status==='active'?'<button class="btn btn-sm" data-action="v11-cancel-listing" data-id="'+esc(l.id)+'">Annuler et récupérer la carte</button>':'';
   const buyActions=!self&&l.status==='active'?'<button class="btn btn-sm btn-primary" data-action="v11-buy-listing" data-id="'+esc(l.id)+'" data-price="'+l.price+'" data-name="'+esc(card.name)+'">Acheter</button>':'';
   // The marketplace API contains only public card fields. Get current art and
   // complete TCG frame from the catalogue; escrowed cards stay visible.
   const artworkMarkup=marketArt.render(l);
   const label={common:'Commune',rare:'Rare',epic:'Épique',legendary:'Légendaire',mythic:'Mythique',ultra:'Ultra'}[rarity]||rarity;
   return '<article class="v11-market-card v11-rarity-'+rarity+'">'+
     '<div class="v114-listing-illustration" data-v153-listing="'+esc(l.id)+'" aria-label="Carte '+esc(card.name)+'">'+artworkMarkup+'</div>'+
     '<div class="v11-market-card-body"><div class="v11-card-label">'+esc(label.toUpperCase())+
       (card.variant==='gold'?' · GOLD':card.variant==='full_art'?' · FULL ART':card.variant==='secret'?' · SECRÈTE':'')+'</div>'+
       '<h4>'+esc(card.name)+'</h4><small>'+esc(card.family||'')+' · Série '+(Number(card.series)||1)+'</small>'+
       '<p class="v11-seller">Vendeur : '+esc(l.sellerName)+'</p>'+
       '<strong class="v11-market-price">'+viewMoney(l.price)+'</strong>'+
       '<p class="v11-estimate">Estimation : '+viewMoney(l.estimate)+'</p>'+
       '<div class="v11-market-actions">'+buyActions+mineActions+
       (mine&&l.status!=='active'?'<small>'+esc(l.status==='sold'?'Vendu':'Annulé')+'</small>':'')+
       '</div></div></article>';
 }
 function filteredListings(){
   const root=marketRoot();const rarity=root?.querySelector('#v11-filter-rarity')?.value||'all';
   const series=root?.querySelector('#v11-filter-series')?.value||'all';
   const universe=root?.querySelector('#v11-filter-universe')?.value||'all';
   const maxPrice=Number(root?.querySelector('#v11-filter-price')?.value||0);
   const search=(root?.querySelector('#v11-filter-search')?.value||'').trim().toLocaleLowerCase('fr');
   return (market.listings||[]).filter(l=>l.card&&
     (rarity==='all'||l.card.rarity===rarity)&&(series==='all'||String(l.card.series)===series)&&
     (universe==='all'||l.card.family===universe)&&(!maxPrice||l.price<=maxPrice)&&
     (!search||l.card.name.toLocaleLowerCase('fr').includes(search)||l.sellerName.toLocaleLowerCase('fr').includes(search)));
 }
 function updateResults(){
   const root=marketRoot();if(!root)return;
   const list=root.querySelector('#v11-market-results');if(!list)return;
   const found=filteredListings();
   list.innerHTML=found.length?found.map(l=>listingCard(l)).join(''):'<div class="empty-state"><p>Aucune annonce correspondant aux filtres.</p></div>';
   const count=root.querySelector('#v11-market-count');if(count)count.textContent=fmt(found.length)+' annonce(s)';
   marketArt.observe(market.listings,market.myListings);
 }
 function updateEstimatedPrice(){
   const root=marketRoot(),selector=root?.querySelector('#v11-sale-card');
   const selected=myCards().find(c=>c.id===selector?.value);
   const hint=root?.querySelector('#v11-sale-estimate');
   if(hint)hint.textContent=selected?'Valeur indicative : '+viewMoney(cardEstimate(selected))+' · Tu choisis librement ton prix.':'Choisis une carte à vendre.';
   const price=root?.querySelector('#v11-sale-price');
   if(price&&selected&&(!price.value||Number(price.value)<10))price.value=cardEstimate(selected);
 }
 function renderMarket(){
   const root=marketRoot();if(!root)return;
   const mine=myCards();
   const chosen=mine.some(c=>c.id===selectedSaleCardId)?selectedSaleCardId:'';
   selectedSaleCardId=chosen;
   const selectedPrice=marketRoot()?.querySelector('#v11-sale-price')?.value||'';
   const rarity=['common','rare','epic','legendary','mythic','ultra'].map(x=>'<option value="'+x+'">'+esc(x)+'</option>').join('');
   const universe=[...new Set((market.listings||[]).map(l=>l.card?.family).filter(Boolean))].sort();
   const series=[...new Set((market.listings||[]).map(l=>l.card?.series).filter(Boolean))].sort((a,b)=>a-b);
   root.innerHTML='<section class="panel v11-listing-creator"><div><span class="eyebrow">✦ ANNONCES PUBLIQUES</span><h3>Mettre une carte en vente</h3><p>Choisis ton prix en crédits. Un exemplaire est réservé jusqu’à la vente ou l’annulation ; jamais de monnaie réelle.</p></div>'+
     '<div class="v11-sale-form"><div class="v114-sale-card-field"><span>Carte à vendre</span><div class="v114-sale-card-choice"><div id="v11-sale-selection">'+picker.renderPreview(mine.find(c=>c.id===chosen))+'</div><button class="btn btn-sm" type="button" data-action="v11-open-sale-picker">✧ Parcourir ma collection ↗</button></div><input id="v11-sale-card" type="hidden" value="'+esc(chosen)+'"></div>'+
     '<label>Prix demandé (10 à 250 000)<input id="v11-sale-price" type="number" min="10" max="250000" step="1" inputmode="numeric" value="'+esc(selectedPrice)+'"></label>'+
     '<div class="v11-sale-controls"><small id="v11-sale-estimate">Estimation indicative selon la rareté.</small><button class="btn btn-primary" data-action="v11-create-listing">Publier une annonce ↗</button></div></div></section>'+
     '<section class="panel v11-sales-panel"><div class="v11-section-head"><div><span class="eyebrow">LE MARCHÉ DU MULTIVERS</span><h3>Cartes en vente</h3></div><button class="btn btn-sm" data-action="v11-refresh-market">↻ Actualiser</button></div>'+
     '<div class="v11-market-filters"><label>Rechercher<input type="search" id="v11-filter-search" placeholder="Carte ou vendeur"></label>'+
     '<label>Rareté<select id="v11-filter-rarity"><option value="all">Toutes</option>'+rarity+'</select></label>'+
     '<label>Série<select id="v11-filter-series"><option value="all">Toutes</option>'+series.map(n=>'<option value="'+n+'">S'+n+'</option>').join('')+'</select></label>'+
     '<label>Univers<select id="v11-filter-universe"><option value="all">Tous</option>'+universe.map(u=>'<option value="'+esc(u)+'">'+esc(u)+'</option>').join('')+'</select></label>'+
     '<label>Prix maximal<input type="number" id="v11-filter-price" min="0" placeholder="Sans limite" inputmode="numeric"></label></div>'+
     '<div class="flex-between"><span id="v11-market-count" class="small-note"></span><span class="small-note">Les prix sont fixés librement par les joueurs.</span></div>'+
     '<div class="v11-market-grid" id="v11-market-results"></div></section>'+
     '<section class="panel v11-sales-panel"><h3>Mes annonces</h3><div class="v11-market-grid">'+((market.myListings||[]).length?market.myListings.map(l=>listingCard(l,true)).join(''):'<p class="small-note">Aucune annonce publiée.</p>')+'</div></section>';
   updateEstimatedPrice();updateResults();
   if(!root.dataset.v11Bound){root.dataset.v11Bound='1';root.addEventListener('input',e=>{
     if(e.target.matches('#v11-filter-search,#v11-filter-price'))updateResults();
   });root.addEventListener('change',e=>{
     if(e.target.matches('#v11-filter-rarity,#v11-filter-series,#v11-filter-universe'))updateResults();
     if(e.target.matches('#v11-sale-card'))updateEstimatedPrice();
   });}
   marketArt.observe(market.listings,market.myListings);
 }
 async function refreshMarket({showErrors=true}={}){
   if(marketBusy)return;
   marketBusy=true;try{
     const data=await api('/api/market/listings');
     if(data?.listings)market=data;
     if(getView()==='market'&&getMarketMode()==='sale'&&marketRoot())renderMarket();
   }catch(e){if(showErrors)toast(e.message||'Marché indisponible.',true);}
   finally{marketBusy=false;}
 }
 async function sell(){
   if(marketBusy)return;
   const id=marketRoot()?.querySelector('#v11-sale-card')?.value||'';
   const price=Number(marketRoot()?.querySelector('#v11-sale-price')?.value);
   if(!id){toast('Choisis une carte à vendre.',true);return;}
   if(!Number.isSafeInteger(price)||price<10||price>250000){toast('Indique un prix entre 10 et 250 000 crédits.',true);return;}
   marketBusy=true;let ok=false;
   try{const r=await api('/api/market/list',{cardId:id,price});
     ok=true;
     if(r.state)onState(r.state);
     toast('Carte mise en vente. Un exemplaire est réservé.');
   }catch(e){toast(e.message,true);}
   finally{marketBusy=false;}
   if(ok){selectedSaleCardId='';await refreshAccount();}await refreshMarket();
 }
 async function buy(id,price,name){
   if(marketBusy)return;
   if(!window.confirm('Acheter '+name+' pour '+viewMoney(price)+' ? Cette opération est définitive.'))return;
   marketBusy=true;let ok=false;
   try{
     const r=await api('/api/market/buy',{id});
     ok=true;
     if(r.state)onState(r.state);
     toast('Carte achetée ! Elle est désormais dans ta collection.');
   }catch(e){toast(e.message||'Achat impossible.',true);}
   finally{marketBusy=false;}
   if(ok)await refreshAccount();await refreshMarket();
 }
 async function cancel(id){
   if(marketBusy)return;
   marketBusy=true;let ok=false;
   try{
     const r=await api('/api/market/cancel',{id});
     ok=true;
     if(r.state)onState(r.state);
     toast('Annonce annulée : ta carte a été rendue.');
   }catch(e){toast(e.message,true);}
   finally{marketBusy=false;}
   if(ok)await refreshAccount();await refreshMarket();
 }
 async function mountMarket(){
   if(!marketRoot())return;
   marketRoot().innerHTML='<div class="panel"><p>Chargement des annonces du Multivers…</p></div>';
   await refreshMarket();
 }
 function boardContent(){
   const root=document.getElementById('page'),data=leaderboard;if(!root)return;
   if(!data){root.innerHTML='<div class="panel"><p>Chargement des classements…</p></div>';return;}
   const current=data.modes?.find(x=>x.id===boardMode)||data.modes?.[0];
   if(!current)return;
   const board=data.boards?.[current.id]||{leaders:[],me:null,total:0};
   const podium=board.leaders.slice(0,3).map(p=>'<div class="v11-podium-place rank-'+p.rank+'"><span class="v11-podium-medal">'+['🥇','🥈','🥉'][p.rank-1]+'</span><strong>'+esc(p.pseudo)+'</strong><span>'+fmt(p.score)+' '+esc(current.unit)+'</span></div>').join('');
   root.innerHTML='<div class="page-lead"><span class="eyebrow">✦ PRESTIGE DU MULTIVERS</span><h1 class="heading">Classements <em>Mashup.</em></h1><p class="text-sub">Compare les collections et les performances de tes amis. L’administrateur ne participe pas aux scores.</p></div>'+
     '<div class="v11-rank-tabs">'+data.modes.map(m=>'<button type="button" class="btn btn-sm '+(m.id===current.id?'btn-primary':'')+'" data-action="v11-leaderboard-mode" data-mode="'+esc(m.id)+'">'+esc(m.label)+'</button>').join('')+'</div>'+
     '<div class="v11-podium">'+(podium||'<p>Pas encore de joueur classé.</p>')+'</div>'+
     '<section class="panel v11-rank-list"><div class="flex-between"><h3>'+esc(current.label)+'</h3><span class="small-note">'+fmt(board.total)+' joueurs</span></div>'+
     '<div class="v11-ranking-rows">'+board.leaders.map(p=>'<div class="v11-ranking-row '+(p.id===getUser()?.id?'is-me':'')+'"><strong>№ '+p.rank+'</strong><span>'+esc(p.pseudo)+(p.id===getUser()?.id?' · toi':'')+'</span><b>'+fmt(p.score)+' '+esc(current.unit)+'</b></div>').join('')+'</div>'+
     (board.me&&!board.leaders.some(p=>p.id===board.me.id)?'<div class="v11-own-rank">Ta position : № '+board.me.rank+' — '+fmt(board.me.score)+' '+esc(current.unit)+'</div>':'')+
     '</section>';
 }
 async function mountLeaderboards(){
   leaderboard=null;boardContent();
   try{leaderboard=await api('/api/leaderboard');if(getView()==='leaderboard')boardContent();}catch(e){toast(e.message,true);}
 }
 function changeBoard(id){if(!leaderboard?.modes?.some(x=>x.id===id))return;boardMode=id;boardContent();}
 function achievementContent(){
   const root=document.getElementById('page');if(!root)return;
   const total=achievements.length,complete=achievements.filter(a=>a.claimed).length;
   root.innerHTML='<div class="page-lead"><span class="eyebrow">✦ DÉFIS PERMANENTS</span><h1 class="heading">Les succès <em>du Codex.</em></h1><p class="text-sub">Des objectifs durables pour récompenser ta progression. Chaque récompense est disponible une seule fois.</p></div>'+
    '<section class="panel v11-achievement-intro"><h3>'+complete+' / '+total+' succès récupérés</h3><p>Les succès sont contrôlés côté serveur et ne sont jamais remis à zéro chaque semaine.</p></section>'+
    '<div class="v11-achievement-grid">'+achievements.map(a=>{
      const ratio=Math.min(100,100*a.progress/a.goal);
      const right=a.claimed?'<span class="v11-claimed">✓ Récompense obtenue</span>':a.completed?
         '<button class="btn btn-primary btn-sm" data-action="v11-claim-achievement" data-id="'+esc(a.id)+'">Récupérer</button>':
         '<span class="v11-locked">🔒 À débloquer</span>';
      const prize=a.reward?fmt(a.reward)+' crédits':esc(a.unlocks||'Titre exclusif');
      return '<article class="v11-achievement '+(a.claimed?'claimed':a.completed?'ready':'')+'"><span class="eyebrow">✦ SUCCÈS</span><h3>'+esc(a.title)+'</h3><p>'+esc(a.hint)+'</p><div class="v11-achievement-progress"><span style="width:'+ratio+'%"></span></div>'+
        '<div class="v11-achievement-metrics"><span>'+fmt(a.progress)+' / '+fmt(a.goal)+'</span><strong>🎁 '+prize+'</strong></div>'+
        '<div class="v11-achievement-action">'+right+'</div></article>';
    }).join('')+'</div>';
 }
 async function mountAchievements(){
   const root=document.getElementById('page');root.innerHTML='<div class="panel"><p>Chargement des succès…</p></div>';
   try{const data=await api('/api/achievements');achievements=data.achievements||[];if(getView()==='achievements')achievementContent();}catch(e){toast(e.message,true);}
 }
 async function claimAchievement(id){
   if(achBusy)return;achBusy=true;
   try{
     const result=await api('/api/achievements/claim',{id});
     achievements=result.achievements||achievements;
     if(result.state)onState(result.state);
     toast(result.unlocks?'Succès débloqué : '+result.unlocks:'Succès débloqué : +'+fmt(result.reward)+' crédits !');
     achievementContent();
   }catch(e){toast(e.message,true);}
   finally{achBusy=false;}
 }
 return {mountMarket,refreshMarket,sell,buy,cancel,openSalePicker:()=>picker.open(),mountLeaderboards,changeBoard,
   mountAchievements,claimAchievement,cardEstimate};
}
