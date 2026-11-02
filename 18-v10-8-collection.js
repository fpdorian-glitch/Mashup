/* Mashup V10.8 — collection milestones, one-time server-validated rewards. */
export function createCollectionRewardsUI({api,esc,toast,onState}){
  let items=[],inFlight=null,claiming=false,lastFetch=0;
  const count=n=>Math.max(0,Number(n)||0).toLocaleString('fr-FR');
  function render(number){
    const info=items.find(x=>x.series===Number(number));
    if(!info)return '<section class="collection-rewards-panel" id="collection-rewards-panel"><p class="small-note">Chargement des récompenses de collection…</p></section>';
    const tiers=(info.tiers||[]).map(t=>{
      const ready=!!t.unlocked,claimed=!!t.claimed,pct=Number(t.percent)||0;
      const description=pct===100?'Titre exclusif : Maître de la série':pct===50?'De quoi financer des boosters':pct===75?'Bonus de collection avancée':'Première étape de la série';
      const action=claimed?'<span class="collection-reward-status">✓ Récompense récupérée</span>':ready?
        '<button class="btn btn-primary btn-sm" data-action="claim-collection-reward" data-series="'+Number(info.series)+'" data-percent="'+pct+'" type="button">Récupérer</button>':
        '<span class="collection-reward-status">🔒 À débloquer</span>';
      return '<article class="collection-reward-tier '+(claimed?'claimed':ready?'ready':'')+'"><span class="collection-reward-pct">'+pct+' %</span><strong>+'+count(t.reward)+' crédits</strong><small>'+description+'</small>'+action+'</article>';
    }).join('');
    return '<section class="collection-rewards-panel" id="collection-rewards-panel"><div class="collection-rewards-head"><div><span class="eyebrow">✦ RÉCOMPENSES DE COLLECTION</span><h3>Les trésors du Codex</h3><p>'+count(info.owned)+' / '+count(info.total)+' cartes normales distinctes. Les Secrètes sont hors progression.<br>Chaque palier est récupérable une seule fois par compte.</p></div>'+(info.badge?'<span class="collection-rewards-badge">✦ '+esc(info.badge)+'</span>':'')+'</div><div class="collection-rewards-grid">'+tiers+'</div></section>';
  }
  function repaint(){
    const node=document.getElementById('collection-rewards-panel');
    if(node){
      const series=Number(node.dataset.series)||Number(document.querySelector('[data-action="back-series"]')?.closest('.series-return')?.querySelector('strong')?.dataset?.number)||0;
      if(series)node.outerHTML=render(series);
    }
  }
  function setData(data){
    items=Array.isArray(data)?data:[];lastFetch=data?Date.now():0;
    const node=document.getElementById('collection-rewards-panel');
    if(node&&node.dataset.series)node.outerHTML=render(Number(node.dataset.series));
  }
  async function refresh({force=false}={}){
    if(inFlight)return inFlight;
    if(!force&&Date.now()-lastFetch<30000)return;
    inFlight=(async()=>{
      try{const reply=await api('/api/collection/rewards');if(Array.isArray(reply.collectionRewards))setData(reply.collectionRewards);}
      catch(e){toast(e.message||'Récompenses de collection indisponibles.',true);}
      finally{inFlight=null;}
    })();
    return inFlight;
  }
  async function claim(series,percent){
    if(claiming||!Number.isInteger(series)||!Number.isInteger(percent))return;
    claiming=true;
    const btn=document.querySelector('[data-action="claim-collection-reward"][data-series="'+series+'"][data-percent="'+percent+'"]');
    if(btn)btn.disabled=true;
    try{
      const reply=await api('/api/collection/rewards/claim',{series,percent});
      if(reply.state)onState(reply.state);
      if(Array.isArray(reply.collectionRewards))setData(reply.collectionRewards);
      toast('Palier '+percent+' % validé : +'+count(reply.reward)+' crédits !');
    }catch(e){
      toast(e.message||'Impossible de récupérer cette récompense.',true);
      if(btn)btn.disabled=false;await refresh({force:true});
    }finally{claiming=false;}
  }
  return {render:(number)=>{
    const html=render(number);
    return html.replace('id="collection-rewards-panel"','id="collection-rewards-panel" data-series="'+Number(number)+'"');
  },setData,refresh,claim};
}
