/* MASHUP V10.6 — Missions quotidiennes et hebdomadaires
 * One shared, server-authoritative quest state. No localStorage counters.
 * No extra polling or duplicate Supabase catalog downloads.
 */
export function createMissionsUI({api,getUser,esc,toast,onState}){
  let data=null,loading=null,claiming=null,saving=false,lastFetch=0;
  const $=id=>document.getElementById(id);
  const shortNumber=n=>Math.max(0,Number(n)||0).toLocaleString('fr-FR');
  const isAdmin=()=>getUser()?.role==='admin';
  const defaults=[
    {key:'dailyBooster',name:'Booster du jour'},
    {key:'dailyBattle',name:'Combat du jour'},
    {key:'dailyVictory',name:'Victoire du jour'},
    {key:'dailyBonus',name:'Bonus quotidien'},
    {key:'weeklyBoosters',name:'Boosters de la semaine'},
    {key:'weeklyBattles',name:'Combats de la semaine'},
    {key:'weeklyVictories',name:'Victoires de la semaine'},
    {key:'weeklyBonus',name:'Bonus hebdomadaire'}
  ];
  const checkedGroup=kind=>{
    const g=data?.[kind];
    return g&&Array.isArray(g.tasks)&&g.tasks.length===3?g:null;
  };
  const countCompleted=kind=>checkedGroup(kind)?.tasks.filter(x=>x.completed).length||0;
  function homeTeaser(){
    const count=countCompleted('daily'),total=3;
    return `<section class="missions-home-teaser" aria-label="Tes missions quotidiennes">
      <span class="missions-home-icon" aria-hidden="true">✦</span>
      <div><strong>Missions du jour</strong><small>${count} / ${total} objectifs terminés · Récompenses à récupérer</small></div>
      <button class="btn btn-sm btn-primary" data-view="missions" type="button">Voir mes missions ↗</button>
    </section>`;
  }
  function taskMarkup(task,scope){
    const progress=Math.min(Math.max(0,Number(task.progress)||0),Math.max(1,Number(task.target)||1));
    const target=Math.max(1,Number(task.target)||1);
    const done=!!task.completed,claimed=!!task.claimed;
    const status=claimed?'Récompense récupérée':done?'Mission accomplie':'En cours';
    const action=claimed?'<span class="missions-claimed">✓ Récupéré</span>':done?
      '<button class="btn btn-primary btn-sm" type="button" data-mission-claim="'+esc(scope)+'" data-mission-id="'+esc(task.id)+'">+ '+shortNumber(task.reward)+' ◉</button>':
      '<span class="missions-pending">+ '+shortNumber(task.reward)+' ◉</span>';
    const width=Math.round(100*progress/target);
    return `<article class="mission-card ${claimed?'is-claimed':done?'is-ready':''}" aria-label="${esc(task.title)}">
      <div class="mission-symbol" aria-hidden="true">${esc(task.icon||'✦')}</div>
      <div class="mission-body"><div class="mission-heading"><h4>${esc(task.title)}</h4><span class="mission-state">${status}</span></div>
        <p>${esc(task.description)}</p><div class="mission-progress"><span style="width:${width}%"></span></div>
        <small>${shortNumber(progress)} / ${shortNumber(target)}</small>
      </div><div class="mission-claim">${action}</div>
    </article>`;
  }
  function bonusMarkup(kind,g){
    const isDaily=kind==='daily';
    const label=isDaily?'Coffre quotidien':'Coffre hebdomadaire',icon=isDaily?'✦':'❖';
    const action=g.bonus.claimed?'<span class="missions-claimed">✓ Récupéré</span>':g.bonus.completed?
      '<button class="btn btn-primary" type="button" data-mission-claim="'+kind+'" data-mission-id="bonus">Récupérer '+shortNumber(g.bonus.reward)+' ◉</button>':
      '<span class="missions-locked">Termine les 3 objectifs pour débloquer '+shortNumber(g.bonus.reward)+' ◉</span>';
    return `<div class="missions-bonus ${g.bonus.completed?'is-unlocked':''} ${g.bonus.claimed?'is-claimed':''}">
      <span class="missions-bonus-symbol" aria-hidden="true">${icon}</span><div class="missions-bonus-copy">
        <strong>${label}</strong><small>Récompense supplémentaire une fois les trois missions terminées.</small>
      </div><div class="missions-bonus-action">${action}</div>
    </div>`;
  }
  function groupMarkup(kind){
    const g=checkedGroup(kind),daily=kind==='daily',title=daily?'Quêtes quotidiennes':'Défis hebdomadaires';
    const sub=daily?'Nouveaux objectifs chaque jour à minuit (heure de Paris).':'Remise à zéro chaque lundi à minuit (heure de Paris).';
    return `<section class="missions-period ${daily?'is-daily':'is-weekly'}">
      <div class="missions-period-head"><div><div class="eyebrow">${daily?'01 / CHAQUE JOUR':'02 / CHAQUE SEMAINE'}</div>
        <h3>${title}</h3><p>${sub}</p></div>
        <span class="missions-completion">${countCompleted(kind)} / 3 complétées</span>
      </div>
      ${g?`<div class="missions-task-list">${g.tasks.map(t=>taskMarkup(t,kind)).join('')}</div>${bonusMarkup(kind,g)}`:
        '<p class="missions-notice">Chargement des missions…</p>'}
    </section>`;
  }
  function render(){
    const node=$('page');if(!node)return;
    node.innerHTML=`<div class="missions-screen">
      <header class="missions-lead">
        <div class="eyebrow">✦ MASHUP · V10.6</div>
        <h1>Les missions du <em>Multivers.</em></h1>
        <p>Ouvre des boosters, affronte l’IA dans l’Arène et gagne des crédits en accomplissant tes objectifs.</p>
        <div class="missions-lead-actions"><span>◉ Les gains sont validés côté serveur.</span>
          <button class="btn btn-sm btn-quiet" data-mission-refresh type="button">↻ Actualiser</button>
        </div>
      </header>
      ${groupMarkup('daily')}
      ${groupMarkup('weekly')}
      <p class="missions-footnote">Les combats de campagne simples ou doubles comptent une fois terminés. Un booster compte uniquement après confirmation de son achat. Les missions du Casino et de Memory ont leurs propres récompenses.</p>
    </div>`;
  }
  function setData(value,{rerender=true}={}){
    if(!value||typeof value!=='object')return;
    data=value;lastFetch=Date.now();
    if(rerender&&$('page')&&document.querySelector('.missions-screen'))render();
    const teaser=document.querySelector('.missions-home-teaser');
    if(teaser)teaser.outerHTML=homeTeaser();
    const adminRoot=$('missions-admin-editor');
    if(adminRoot&&!saving)renderAdminEditor();
  }
  async function refresh({force=false}={}){
    if(!getUser())return;
    if(loading)return loading;
    if(!force&&lastFetch&&Date.now()-lastFetch<20000)return;
    loading=(async()=>{
      try{
        const response=await api('/api/missions');
        if(response?.missions)setData(response.missions);
      }catch(e){toast(e.message||'Impossible de charger les missions.',true);}
      finally{loading=null;}
    })();
    return loading;
  }
  async function claim(scope,id){
    if(claiming||!['daily','weekly'].includes(scope)||!id)return;
    claiming=scope+'-'+id;
    const button=document.querySelector('[data-mission-claim="'+scope+'"][data-mission-id="'+id+'"]');
    if(button)button.disabled=true;
    try{
      const result=await api('/api/missions/claim',{scope,id});
      if(result?.state)onState(result.state);
      if(result?.missions)setData(result.missions);
      toast('Mission validée : +'+shortNumber(result.reward)+' crédits !');
    }catch(e){
      toast(e.message||'Impossible de récupérer la récompense.',true);
      if(button)button.disabled=false;
      await refresh({force:true});
    }finally{claiming=null;}
  }
  function adminMarkup(){
    if(!isAdmin())return '';
    return `<section class="panel missions-admin-panel" id="missions-admin-section">
      <div class="eyebrow">✦ ÉCONOMIE · MISSIONS</div>
      <h3>Récompenses des missions</h3>
      <p class="panel-p">Règle les crédits remis aux joueurs pour les missions quotidiennes, hebdomadaires et leurs deux bonus. Les objectifs sont fixes ; les montants s’appliquent immédiatement après enregistrement.</p>
      <div id="missions-admin-editor"></div>
    </section>`;
  }
  function renderAdminEditor(){
    const target=$('missions-admin-editor');
    if(!target||!isAdmin())return;
    const cfg=data?.adminSettings;
    if(!cfg){target.innerHTML='<p class="missions-notice">Ouvre l’onglet Missions pour charger les réglages administrateur.</p>';return;}
    target.innerHTML=`<form id="missions-admin-form">
      <div class="missions-admin-grid">
        ${defaults.map(({key,name})=>`<label>${esc(name)}<div class="missions-admin-field"><input type="number" inputmode="numeric" step="1" min="0" max="5000" data-mission-reward="${key}" value="${Number(cfg[key])||0}" required><span>◉</span></div></label>`).join('')}
      </div><p class="small-note">0 à 5 000 crédits par objectif. Les gains déjà récupérés ne sont pas réattribués.</p>
      <button class="btn btn-primary" type="submit">Enregistrer les récompenses ↗</button>
    </form>`;
  }
  async function saveAdmin(form){
    if(!isAdmin()||saving)return;
    const rewards={};
    for(const {key} of defaults){
      const field=form.querySelector('[data-mission-reward="'+key+'"]');
      const n=field?.value===''?NaN:Number(field?.value);
      if(!Number.isSafeInteger(n)||n<0||n>5000){toast('Indique des montants entiers entre 0 et 5 000 crédits.',true);return;}
      rewards[key]=n;
    }
    saving=true;const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
    try{
      const response=await api('/api/admin/missions',{rewards});
      if(data)setData({...data,adminSettings:response.rewards},{rerender:false});
      toast('Récompenses des missions mises à jour.');
    }catch(e){toast(e.message||'Enregistrement impossible.',true);}
    finally{saving=false;renderAdminEditor();}
  }
  document.addEventListener('click',event=>{
    const claimButton=event.target.closest?.('[data-mission-claim]');
    if(claimButton){claim(claimButton.dataset.missionClaim,claimButton.dataset.missionId);return;}
    if(event.target.closest?.('[data-mission-refresh]')){refresh({force:true});return;}
  });
  document.addEventListener('submit',event=>{
    if(event.target.id!=='missions-admin-form')return;
    event.preventDefault();saveAdmin(event.target);
  });
  return {setData,render,refresh,homeTeaser,adminMarkup,renderAdminEditor};
}
