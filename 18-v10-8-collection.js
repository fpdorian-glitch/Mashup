/* Mashup V10.8 — collection milestones, one-time server-validated rewards. */
export function createCollectionRewardsUI({api,esc,toast,onState,onVouchers,getMetrics}){
  let items=[],inFlight=null,claiming=false,lastFetch=0,revision=0;
  const count=n=>Math.max(0,Number(n)||0).toLocaleString('fr-FR');
  function render(number){
    const info=items.find(x=>x.series===Number(number));
    const metrics=getMetrics?.(Number(number));
    if(!info)return '<section class="collection-rewards-panel" id="collection-rewards-panel" data-series="'+Number(number)+'"><p class="small-note">Chargement des récompenses de collection…</p></section>';
    const tiers=(info.tiers||[]).map(t=>{
      const ready=!!t.unlocked&&(!metrics||metrics.total>0),claimed=!!t.claimed,pct=Number(t.percent)||0;
      const description=pct===100?'Titre exclusif : Maître de la série':pct===50?'Palier collector':pct===75?'Bonus de collection avancée':'Première étape de la série';
      const bonus=t.boosterId?'<small class="reward-booster-label">🎁 1 booster '+esc(t.boosterName||t.boosterId)+' offert</small>':'';
      const action=claimed?'<span class="collection-reward-status">✓ Récompense récupérée</span>':ready?
        '<button class="btn btn-primary btn-sm" data-action="claim-collection-reward" data-series="'+Number(info.series)+'" data-percent="'+pct+'" type="button">Récupérer</button>':
        '<span class="collection-reward-status">🔒 À débloquer</span>';
      return '<article class="collection-reward-tier '+(claimed?'claimed':ready?'ready':'')+'"><span class="collection-reward-pct">'+pct+' %</span><strong>+'+count(t.reward)+' crédits</strong>'+bonus+'<small>'+description+'</small>'+action+'</article>';
    }).join('');
    return '<section class="collection-rewards-panel" id="collection-rewards-panel" data-series="'+Number(number)+'"><div class="collection-rewards-head"><div><span class="eyebrow">✦ RÉCOMPENSES DE COLLECTION</span><h3>Les trésors du Codex</h3><p>'+count(metrics?.owned??info.owned)+' / '+count(metrics?.total??info.total)+' cartes normales distinctes. Les Secrètes sont hors progression.<br>Chaque palier est récupérable une seule fois par compte.</p></div>'+(info.badge?'<span class="collection-rewards-badge">✦ '+esc(info.badge)+'</span>':'')+'</div><div class="collection-rewards-grid">'+tiers+'</div></section>';
  }
  function invalidate(){revision++;inFlight=null;lastFetch=0;const node=document.getElementById('collection-rewards-panel');if(node?.dataset.series)node.outerHTML=render(Number(node.dataset.series));}
  function setData(data){
    revision++;inFlight=null;
    items=Array.isArray(data)?data:[];lastFetch=data?Date.now():0;
    const node=document.getElementById('collection-rewards-panel');
    if(node&&node.dataset.series)node.outerHTML=render(Number(node.dataset.series));
  }
  async function refresh({force=false}={}){
    if(inFlight)return inFlight;
    if(!force&&Date.now()-lastFetch<30000)return;
    const observed=revision;
    const task=Promise.resolve().then(async()=>{
      try{const reply=await api('/api/collection/rewards');if(observed===revision&&Array.isArray(reply.collectionRewards))setData(reply.collectionRewards);}
      catch(e){if(observed===revision)toast(e.message||'Récompenses de collection indisponibles.',true);}
      finally{if(inFlight===task)inFlight=null;}
    });
    inFlight=task;return task;
  }
  async function claim(series,percent){
    if(claiming||!Number.isInteger(series)||!Number.isInteger(percent))return;
    claiming=true;
    const btn=document.querySelector('[data-action="claim-collection-reward"][data-series="'+series+'"][data-percent="'+percent+'"]');
    if(btn)btn.disabled=true;
    try{
      const reply=await api('/api/collection/rewards/claim',{series,percent});
      if(reply.state)onState(reply.state);
      if(reply.vouchers)onVouchers?.(reply.vouchers);
      if(Array.isArray(reply.collectionRewards))setData(reply.collectionRewards);
      toast('Palier '+percent+' % validé : +'+count(reply.reward)+' crédits'+(reply.boosterId?' et un bon booster !':' !'));
    }catch(e){
      toast(e.message||'Impossible de récupérer cette récompense.',true);
      if(btn)btn.disabled=false;await refresh({force:true});
    }finally{claiming=false;}
  }

  let adminCfg=null;
  function adminMarkup(){
    return '<section class="panel collection-reward-admin" id="collection-reward-admin"><div class="eyebrow">✦ COLLECTION · ÉCONOMIE</div><h3>Récompenses des paliers</h3><p class="panel-p">Personnalise les crédits et les boosters offerts à 25, 50, 75 et 100 %. Les paliers déjà récupérés ne se réinitialisent pas.</p><div id="collection-reward-admin-grid" class="collection-reward-admin-grid"><p class="small-note">Chargement…</p></div><button class="btn btn-primary" data-action="save-collection-reward-admin">Enregistrer les récompenses ↗</button></section>';
  }
  async function loadAdmin(){
    const node=document.getElementById('collection-reward-admin-grid');if(!node)return;
    try{
      const r=await api('/api/admin/collection/rewards');adminCfg=r;
      node.innerHTML=[25,50,75,100].map(percent=>{
        const prize=r.rewards?.[percent]||{credits:0,boosterId:''};
        const choices='<option value="">Aucun booster</option>'+(r.packs||[]).map(p=>'<option value="'+esc(p.id)+'" '+(prize.boosterId===p.id?'selected':'')+'>'+esc(p.name)+'</option>').join('');
        return '<article><strong>'+percent+' % de la série</strong><label>Crédits<input type="number" min="0" max="5000" step="1" id="reward-credit-'+percent+'" value="'+Number(prize.credits)+'"></label><label>Booster offert<select id="reward-booster-'+percent+'">'+choices+'</select></label></article>';
      }).join('');
    }catch(e){node.textContent=e.message||'Réglages indisponibles.';}
  }
  async function saveAdmin(){
    if(!adminCfg)return;
    const values={};
    for(const percent of [25,50,75,100]){
      values[percent]={credits:Number(document.getElementById('reward-credit-'+percent)?.value),
        boosterId:document.getElementById('reward-booster-'+percent)?.value??''};
    }
    try{
      const r=await api('/api/admin/collection/rewards',{rewards:values});
      if(r.ok){toast('Récompenses de collection enregistrées.');adminCfg.rewards=r.rewards;await refresh({force:true});}
    }catch(e){toast(e.message||'Enregistrement impossible.',true);}
  }
  return {render,setData,refresh,claim,invalidate,adminMarkup,loadAdmin,saveAdmin};
}
