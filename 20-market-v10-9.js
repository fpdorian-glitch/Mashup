/* Mashup V10.9 — safe, on-demand Market UI (no polling). */
export function createMarketUI({api,esc,toast,onAccepted,getOwnCards,getCurrentUser,onFreshAccount}){
 let players=[],trades=[],target=null,partnerCards=[],counterId='',busy=false;
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('fr-FR');
 const statusName={pending:'En attente',accepted:'Échange effectué',declined:'Refusé',cancelled:'Annulé',expired:'Expiré',countered:'Contre-offre envoyée'};
 const mine=()=>getOwnCards().filter(c=>!c.hidden).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 const choice=(cards,index,kind,own=false)=>{
   const opts='<option value="">Aucune carte</option>'+cards.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+' · '+esc(c.rarity||'')+(own?' (×'+fmt(c.qty)+')':'')+'</option>').join('');
   return '<div class="trade-asset-row"><select aria-label="Carte '+(index+1)+'" id="trade-'+kind+'-'+index+'">'+opts+'</select><input type="number" min="1" max="20" value="1" inputmode="numeric" aria-label="Exemplaires" id="trade-'+kind+'-qty-'+index+'"></div>';
 };
 function render(){
  const page=document.getElementById('page');if(!page)return;
  const user=getCurrentUser();
  const pending=trades.filter(t=>t.status==='pending');
  page.innerHTML='<div class="page-lead"><div class="eyebrow">LE MULTIVERS · ÉCHANGES</div><h1 class="heading">Le Marché <em>des cartes.</em></h1><p class="text-sub">Propose des échanges privés, avec des cartes et des crédits. Chaque proposition doit être acceptée par les deux joueurs.</p></div>'+
   '<section class="panel market-compose"><h3>Proposer un échange</h3><p class="small-note">Aucun retrait avant acceptation. Vérification des inventaires au moment de la validation.</p>'+
   '<div class="market-partner"><label>Joueur<select id="trade-partner"><option value="">Choisir un joueur</option>'+players.map(p=>'<option value="'+esc(p.id)+'" '+(target===p.id?'selected':'')+'>'+esc(p.pseudo)+'</option>').join('')+'</select></label><button class="btn btn-sm" data-action="trade-load-target">Voir sa collection ↗</button></div>'+
   (target?'<div class="market-exchange-grid"><div><h4>Je propose</h4>'+Array.from({length:3},(_,i)=>choice(mine().map(c=>({...c,qty:getOwnCards().find(x=>x.id===c.id)?.qty||1})),i,'offer',true)).join('')+
      '<label>Crédits proposés<input type="number" id="trade-offer-credits" min="0" max="200000" value="0"></label></div>'+
      '<div><h4>Je demande</h4>'+Array.from({length:3},(_,i)=>choice(partnerCards,i,'request',true)).join('')+
      '<label>Crédits demandés<input type="number" id="trade-request-credits" min="0" max="200000" value="0"></label></div></div>'+
      '<button class="btn btn-primary" data-action="trade-send">'+(counterId?'Envoyer la contre-offre':'Envoyer la proposition')+' ↗</button>'+
      (counterId?'<button class="btn btn-sm" data-action="trade-clear-counter">Annuler la contre-offre</button>':''):'<p class="small-note">Sélectionne un joueur et clique sur « Voir sa collection » pour préparer ton échange.</p>')+'</section>'+
   '<section class="panel market-list"><div class="flex-between"><h3>Mes propositions <small>('+pending.length+' en attente)</small></h3><button class="btn btn-sm" data-action="trade-refresh">↻ Actualiser</button></div>'+
    (trades.length?trades.map(t=>{
      const incoming=t.to===user?.id;const isPending=t.status==='pending';
      const assets=(list,credits)=>list.map(i=>'<span>'+esc(i.card?.name||'Carte indisponible')+' ×'+fmt(i.qty)+'</span>').concat(credits?['<span>◉ '+fmt(credits)+' crédits</span>']:[]).join('')||'<span>Aucune carte</span>';
      return '<article class="market-trade"><div class="market-trade-top"><strong>'+esc(incoming?t.fromName:t.toName)+'</strong><small>'+esc(statusName[t.status]||t.status)+' · '+new Date(t.createdAt).toLocaleDateString('fr-FR')+'</small></div>'+
       '<div class="market-trade-columns"><div><small>'+esc(t.fromName)+' donne</small>'+assets(t.offer,t.offerCredits)+'</div><div><small>'+esc(t.toName)+' donne</small>'+assets(t.request,t.requestCredits)+'</div></div>'+
       (isPending?'<div class="market-trade-actions">'+(incoming?'<button class="btn btn-primary btn-sm" data-action="trade-accept" data-id="'+esc(t.id)+'">Accepter</button><button class="btn btn-sm" data-action="trade-counter" data-id="'+esc(t.id)+'">Contre-offre</button><button class="btn btn-sm" data-action="trade-decline" data-id="'+esc(t.id)+'">Refuser</button>':'<button class="btn btn-sm" data-action="trade-cancel" data-id="'+esc(t.id)+'">Annuler</button>')+'</div>':'')+'</article>';
    }).join(''):'<p class="small-note">Aucun échange pour le moment.</p>')+'</section>';
 }
 async function refresh(){
  if(busy)return;
  busy=true;try{
    const r=await api('/api/trades');players=r.players||[];trades=r.trades||[];
    if(document.querySelector('.market-compose'))render();
  }catch(e){toast(e.message||'Marché indisponible.',true);}
  finally{busy=false;}
 }
 async function selectPartner(id){
  if(!id){target=null;partnerCards=[];render();return;}
  busy=true;try{
    const r=await api('/api/trades/partner/'+encodeURIComponent(id));
    target=r.id;partnerCards=r.cards||[];render();
  }catch(e){toast(e.message,true);}
  finally{busy=false;}
 }
 function collect(){
  const picks=kind=>Array.from({length:3},(_,i)=>{
    const id=document.getElementById('trade-'+kind+'-'+i)?.value;
    const qty=Number(document.getElementById('trade-'+kind+'-qty-'+i)?.value);
    return id?{id,qty}:null;
  }).filter(Boolean);
  return {to:target,offer:picks('offer'),request:picks('request'),
    offerCredits:Number(document.getElementById('trade-offer-credits')?.value||0),
    requestCredits:Number(document.getElementById('trade-request-credits')?.value||0)};
 }
 async function send(){
  if(busy||!target)return;
  const data=collect();
  busy=true;try{
    if(counterId)await api('/api/trades/respond',{...data,id:counterId,action:'counter'});
    else await api('/api/trades/create',data);
    toast('Proposition envoyée.');counterId='';target=null;partnerCards=[];
  }catch(e){toast(e.message,true);}
  finally{busy=false;}
  await refresh();
 }
 async function action(kind,id){
  if(busy)return;const trade=trades.find(x=>x.id===id);if(!trade)return;
  if(kind==='counter'){
    const newTarget=trade.from;
    await selectPartner(newTarget);
    counterId=id;render();
    for(const [side,assets] of [['offer',trade.request],['request',trade.offer]]){
      assets.slice(0,3).forEach((item,i)=>{
        const elem=document.getElementById('trade-'+side+'-'+i),qty=document.getElementById('trade-'+side+'-qty-'+i);
        if(elem)elem.value=item.id;if(qty)qty.value=item.qty;
      });
    }
    const offered=document.getElementById('trade-offer-credits'),requested=document.getElementById('trade-request-credits');
    if(offered)offered.value=trade.requestCredits;if(requested)requested.value=trade.offerCredits;
    document.querySelector('.market-compose')?.scrollIntoView({behavior:'smooth'});
    return;
  }
  busy=true;try{
    const r=await api('/api/trades/respond',{id,action:kind});
    toast(kind==='accept'?'Échange effectué !':'Proposition mise à jour.');
    if(kind==='accept'){await onFreshAccount();onAccepted?.();}
  }catch(e){toast(e.message,true);}
  finally{busy=false;}
  await refresh();
 }
 return {mount:()=>{render();refresh();},refresh,selectPartner,loadTarget:()=>selectPartner(document.getElementById('trade-partner')?.value),send,action,
   clearCounter:()=>{counterId='';target=null;partnerCards=[];render();}};
}
