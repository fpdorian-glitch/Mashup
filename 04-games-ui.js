/* Mashup V9.1 — Casino Ligue en direct et mini-jeux rejouables. */
export function createGamesUI({api,toast,getUser,showArena}){
  const TYPES=['memory','quiz','higherLower'];
  const LABELS={memory:'Memory · Duel des paires',quiz:'Quiz des univers',higherLower:'Plus ou moins'};
  const HELP={memory:'Retrouve 6 paires. Trois erreurs consécutives = défaite !',quiz:'5 bonnes réponses pour gagner. Une seule erreur = défaite.',higherLower:'5 comparaisons successives. Une erreur = défaite.'};
  const ICONS={memory:'🧠',quiz:'🎓',higherLower:'📈'};
  const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=v=>Number(v||0).toLocaleString('fr-FR');
  const $=id=>document.getElementById(id);
  let root=null,section='hub',snapshot=null,loading=false,delta=0,tick=null,hiddenReveal=false,lockedUntil=0,lastAlert='',lastPoll=0;
  const serverNow=()=>Date.now()-delta;
  const profile=f=>h(f?.name||'IA inconnue');
  const sideName=(c,i)=>(c?.sides?.[i]||[]).map(f=>f.name).join(' + ')||'Équipe '+(i?'B':'A');
  const available=()=>root?.isConnected;
  async function request(route='status',body){
    if(loading)return null;loading=true;
    try{
      const oldAmount=$('games-amount')?.value,oldSide=document.querySelector('input[name="games-side"]:checked')?.value;
      const data=await api(route,body);snapshot=data;delta=Date.now()-Number(data.now||Date.now());
      if(route==='move'&&data.active?.type==='memory'&&data.active.last&&!data.active.last.correct){lockedUntil=Date.now()+1100;hiddenReveal=false;setTimeout(()=>{hiddenReveal=true;if(available()&&section==='mini')draw();},1150);}
      if(route==='start')hiddenReveal=false;
      if(available()){
        draw();if(route==='status'&&section==='casino'){
          if(oldAmount&&$('games-amount'))$('games-amount').value=oldAmount;
          if(oldSide!==undefined){const selected=document.querySelector('input[name="games-side"][value="'+oldSide+'"]');if(selected)selected.checked=true;}
        }
      }
      return data;
    }catch(err){toast(err.message||'Impossible de joindre le serveur des jeux.',true);return null;}
    finally{loading=false;}
  }
  const tabs=()=>`<nav class="games-tabs" aria-label="Modes Jeux">
    <button class="btn ${section==='hub'?'btn-primary':''}" data-games="hub">◈ Accueil</button>
    <button class="btn" data-games="arena">⚔ Arène</button>
    <button class="btn ${section==='casino'?'btn-primary':''}" data-games="casino">🎲 Ligue IA</button>
    <button class="btn ${section==='mini'?'btn-primary':''}" data-games="mini">🧩 Mini-jeux</button></nav>`;
  const intro=(name,sub)=>`<div class="page-lead"><div class="eyebrow">MASHUP · SAISON ${snapshot?.league?.season||1}</div><h1 class="heading">${name}</h1><p class="text-sub">${sub}</p></div>`;
  const loadingBox=()=>`<section class="panel"><p>Connexion à la ligue…</p><button class="btn" data-games="refresh">Actualiser</button></section>`;
  function hub(){return intro('Tous les <em>jeux.</em>','Arène, championnat IA et trois mini-jeux récompensés. Les combats IA sont identiques pour tout le monde.')+tabs()+
    `<div class="games-layout">
    <div class="games-hero-card"><span class="games-symbol">⚔</span><h3>Arène</h3><p>Affronte les IA ou défie les autres joueurs.</p><button class="btn btn-primary" data-games="arena">Entrer dans l’arène</button></div>
    <div class="games-hero-card"><span class="games-symbol">🏆</span><h3>Casino · Ligue IA</h3><p>20 IA, classement en direct, cotes variables et un duel toutes les 10 minutes.</p><button class="btn btn-primary" data-games="casino">Voir la ligue</button></div>
    <div class="games-hero-card"><span class="games-symbol">🧩</span><h3>Mini-jeux illimités</h3><p>Rejoue autant de fois que tu veux, gagne des crédits et relève le défi quotidien.</p><button class="btn btn-primary" data-games="mini">Choisir un jeu</button></div></div>`;}
  function fighterCard(f){return `<div class="games-fighter"><div class="games-fighter-avatar">${profile(f).slice(0,1)}</div><div><strong>${profile(f)}</strong><small>Puissance ${n(f.power)} · Elo ${n(f.elo)}</small><small>${n(f.wins)} V · ${n(f.losses)} D</small></div></div>`;}
  function team(c,side){return `<article class="games-team-v9"><div class="games-team-head"><small>ÉQUIPE ${side===0?'A':'B'}</small><strong>${sideName(c,side).split(' + ').map(h).join(' + ')}</strong></div>${(c?.sides?.[side]||[]).map(fighterCard).join('')}
    <div class="games-odd"><span>Cote</span><strong>×${n(c?.odds?.[side]||1)}</strong><small>Chance estimée : ${Math.round((c?.probabilities?.[side]||.5)*100)} %</small></div></article>`;}
  function betsList(c){
    if(!c)return '';
    const all=c.bets||[],top=all[0],a=c.betStats?.[0]||{count:0,total:0},b=c.betStats?.[1]||{count:0,total:0};
    return `<section class="panel games-panel"><h3>Les paris de la communauté</h3><p class="games-muted">Chaque mise est publique dans Mashup et déduite immédiatement. Les cotes sont bloquées à la validation.</p>
      <div class="games-stats-grid"><div><small>Parieurs A</small><b>${n(a.count)}</b><small>${n(a.total)} crédits misés</small></div><div><small>Parieurs B</small><b>${n(b.count)}</b><small>${n(b.total)} crédits misés</small></div><div><small>Plus gros pari</small><b>${top?n(top.amount):'—'}</b><small>${top?h(top.player)+' → '+(top.side===0?'A':'B'):'Aucun pour le moment'}</small></div></div>
      <div class="games-bet-table"><div class="games-row games-row-head"><span>Joueur</span><span>Choix</span><span>Mise</span></div>${all.length?all.map(b=>`<div class="games-row"><span>${h(b.player)}</span><span class="${b.side===0?'games-side-a':'games-side-b'}">${b.side===0?'A':'B'}</span><strong>${n(b.amount)}</strong></div>`).join(''):'<p class="games-muted">Sois le premier à parier sur ce combat !</p>'}</div>
      ${all.length===50?'<p class="games-muted">50 plus gros paris affichés.</p>':''}</section>`;
  }
  function live(){const c=snapshot?.live;if(!c)return '';
    const steps=c.revealedRounds||[],finished=c.winner!==undefined&&c.winner!==null;
    return `<section class="panel games-panel games-live"><div class="games-live-heading"><div><span class="games-live-dot"></span><strong>${finished?'COMBAT TERMINÉ':'🔴 COMBAT EN DIRECT'}</strong><p>Tout le monde regarde le même duel au même instant.</p></div><div class="games-progress"><span>${finished?'Résultat':'Manche en cours'}</span><strong>${finished?'FIN':n(Math.min(4,steps.length+1))+' / 4'}</strong></div></div>
      <div class="games-versus-compact"><strong>${sideName(c,0).split(' + ').map(h).join(' + ')}</strong><span>VS</span><strong>${sideName(c,1).split(' + ').map(h).join(' + ')}</strong></div>
      <div class="games-rounds">${[0,1,2,3].map(i=>{const r=steps[i];return `<div class="games-round ${r?'games-round-done':''}"><b>Manche ${i+1}</b>${r?`<span>${h(r.stat)} · ${n(r.a)} – ${n(r.b)}</span><strong>Point ${r.winner===0?'A':'B'}</strong>`:'<span>🔒 Résultat à venir</span>'}</div>`;}).join('')}</div>
      ${finished?`<div class="games-result-band">🏆 Victoire de l’équipe ${c.winner===0?'A':'B'} · Score ${n(c.score?.[0])} – ${n(c.score?.[1])}</div>`:'<p class="games-muted">Une manche se dévoile toutes les 9 secondes. Le résultat final est révélé à la fin.</p>'}
      </section>`;
  }
  function standings(){const players=snapshot?.league?.standings||[];return `<section class="panel games-panel"><div class="games-progress"><div><h3>🏆 Classement des 20 IA</h3><p class="games-muted">Classement par résultats, puis Elo. L'Elo et les séries influencent les cotes, mais des surprises restent possibles.</p></div><span class="pill">SAISON ${snapshot?.league?.season||1}</span></div>
    <div class="games-leaderboard"><div class="games-leader-games games-leaderhead"><span>#</span><span>IA</span><span>V</span><span>D</span><span>Elo</span></div>${players.map(f=>`<div class="games-leader-games"><span>${n(f.rank)}</span><strong>${profile(f)} <small>P${n(f.power)}</small></strong><span>${n(f.wins)}</span><span>${n(f.losses)}</span><span>${n(f.elo)}</span></div>`).join('')}</div></section>`;}
  function betHistory(){const list=snapshot?.historyBets||[];if(!list.length)return `<p class="games-muted">Aucun pari terminé pour l’instant.</p>`;return list.slice(0,6).map(x=>`<div class="games-history-item"><b>${x.bet.side===x.winner?'🏆 Pari gagné':'✕ Pari perdu'} · ${x.mode==='double'?'Double':'Simple'}</b><p class="games-muted">Mise ${n(x.bet.amount)} · Cote ×${n(x.bet.odds||x.odds?.[x.bet.side]||1)} · Gain ${n(x.bet.payout||0)} crédits</p></div>`).join('');}
  function historical(){const data=snapshot?.history||[];return `<section class="panel games-panel"><h3>Derniers combats</h3>${data.length?data.slice(0,8).map(c=>`<details class="games-history-item"><summary><strong>🏆 ${c.legacy?'Ancien combat':sideName(c,c.winner).split(' + ').map(h).join(' + ')}</strong> · ${c.mode==='double'?'Double':'Simple'} · ${c.score?.join('–')||''}</summary>${(c.rounds||[]).map((r,i)=>`<p class="games-muted">Manche ${i+1} · ${h(r.stat)} · ${n(r.a)}–${n(r.b)} · ${r.winner===null?'Égalité':r.winner===0?'A':'B'}</p>`).join('')}</details>`).join(''):'<p class="games-muted">La nouvelle saison commence !</p>'}</section>`;}
  function casino(){const s=snapshot;if(!s)return intro('Casino <em>Ligue IA.</em>','Un combat toutes les 10 minutes.')+tabs()+loadingBox();if(!s.league)return intro('Casino <em>Ligue IA.</em>','Championnat en cours de mise à jour.')+tabs()+'<section class="panel"><h3>Nouvelle version du serveur attendue</h3><p>Les paris sont momentanément indisponibles pendant l’installation. Aucune mise ne sera prélevée ici.</p><button class="btn" data-games="refresh">Réessayer</button></section>';const c=s.current,bet=s.bet;
    const amount=bet?.amount||100,prof=bet?.side===0?'A':'B';
    return intro('Casino <em>Ligue IA.</em>','20 IA, une ligue partagée, des cotes calculées selon les performances et des combats suivis manche par manche.')+tabs()+
      live()+`<section class="panel"><div class="games-progress"><div><span class="eyebrow">PROCHAIN COMBAT · ${c?.mode==='double'?'DOUBLE RARE':'CLASSIQUE'}</span><h3>${c?'Saison '+n(c.season)+' · Prochain affrontement':'Match en préparation…'}</h3></div><div class="games-time-chip"><small>Début du combat dans</small><strong class="games-countdown" id="games-clock">--:--</strong></div></div>
      <p class="games-muted">Le match débute automatiquement à la fin de ce décompte. Les mêmes adversaires, manches et résultats sont synchronisés pour tous les joueurs.</p>
      ${c?`<div class="games-versus">${team(c,0)}<strong class="games-vs">VS</strong>${team(c,1)}</div>`:''}
      ${bet?`<div class="games-banner"><strong>✓ Pari enregistré pour l’équipe ${prof}</strong> · ${n(amount)} crédits prélevés · Cote ×${n(bet.odds)} · Gain possible : <b>${n(Math.floor(amount*bet.odds))}</b> crédits.</div>`:
      `<div class="games-bet-form"><div class="games-bet-options"><label><input name="games-side" type="radio" value="0" checked> Parier sur A · ×${n(c?.odds?.[0])}</label><label><input name="games-side" type="radio" value="1"> Parier sur B · ×${n(c?.odds?.[1])}</label></div>
        <div class="games-controls"><label>Mise virtuelle (10 à 25 000)<input type="number" id="games-amount" min="10" max="25000" step="1" value="100"></label><button class="btn btn-primary" data-games="bet">Valider mon pari</button></div></div>`}
      <div class="games-alert-help"><span>🔔 Alerte dans le jeu 20 secondes avant le combat si tu as parié.</span><button class="btn btn-sm" data-games="notifications">Activer les notifications navigateur</button></div>
      </section>`+
      betsList(c)+standings()+historical()+`<section class="panel games-panel"><h3>Mes paris</h3>${betHistory()}</section>`;
  }
  function miniResult(s){return intro('Mini-<em>jeux.</em>','Tu peux rejouer immédiatement et autant de fois que tu veux.')+tabs()+`<section class="games-end-card ${s.won?'games-end-win':'games-end-loss'}" role="status" aria-live="assertive"><div class="games-end-emblem">${s.won?'🏆':'✕'}</div><div class="eyebrow">${h(LABELS[s.type])}</div><h2>${s.won?'VICTOIRE !':'DÉFAITE !'}</h2><p>${s.won?'Bravo ! Tu as réussi toutes les étapes.':s.type==='memory'?'Trois paires ratées consécutivement.':'Une réponse incorrecte termine la partie.'}</p>
    ${s.last?.rightAnswer&&!s.won?`<p>Bonne réponse : <b>${h(s.last.rightAnswer)}</b></p>`:''}
    <strong class="games-end-credit">${s.won?'+'+n(s.reward)+' crédits remportés':'0 crédit · Réessaie !'}</strong>
    <div class="games-result-actions"><button class="btn btn-primary btn-lg" data-games="replay" data-type="${s.type}">↻ Rejouer ${h(LABELS[s.type])}</button><button class="btn" data-games="mini">Choisir un autre jeu</button></div></section>`;}
  function miniSession(s){if(s.done)return miniResult(s);
    let content='';
    if(s.type==='memory'){
      content=`<div class="games-memory-meters"><span>🟩 Paires : <b>${n(s.pairs)} / 6</b></span><span>❌ Erreurs de suite : <b>${n(s.mistakes)} / 3</b></span></div><div class="games-tile-grid">${s.tiles.map((t,i)=>{
        const shown=!!t &&(t.matched||!hiddenReveal||s.first!==null&&t===s.tiles[s.first]);
        return `<button class="games-tile ${shown?'face-up':''} ${t?.matched?'paired':''}" data-games="flip" data-index="${i}" ${t?.matched?'disabled':''} aria-label="Carte ${i+1}${shown?' : '+h(t.name):' cachée'}">${shown?h(t.name):'✦'}</button>`;
      }).join('')}</div><p class="games-muted">Trouve les 6 paires sans faire 3 erreurs consécutives. Une paire réussie remet le compteur d’erreurs à zéro.</p>`;
    }else if(s.type==='quiz'){
      content=`<div class="games-question"><span class="games-question-number">QUESTION ${n(s.steps+1)} / ${n(s.total)}</span><h2>Quelle est la statistique la plus élevée pour <em>${h(s.question?.name)}</em> ?</h2></div><div class="games-answers">${(s.question?.options||[]).map(opt=>`<button class="btn" data-games="answer" data-answer="${h(opt)}">${h(opt)}</button>`).join('')}</div>`;
    }else{
      content=`<div class="games-question"><span class="games-question-number">COMPARAISON ${n(s.steps+1)} / ${n(s.total)}</span><h2>${h(s.question?.baseName)} : <em>${n(s.question?.baseValue)}</em> en ${h(s.question?.stat)}</h2><p>${h(s.question?.nextName)} possède-t-il une valeur supérieure ou égale ?</p></div><div class="games-answers"><button class="btn btn-primary" data-games="answer" data-answer="higher">↑ Supérieure ou égale</button><button class="btn" data-games="answer" data-answer="lower">↓ Inférieure</button></div>`;
    }
    return intro(h(LABELS[s.type]),HELP[s.type])+tabs()+`<section class="panel games-mini-playing"><div class="games-progress"><strong>${h(LABELS[s.type])}</strong><span>${s.type==='memory'?n(s.pairs)+' / 6 paires':n(s.score)+' / 5 réussites'}</span></div>
      ${s.last?`<div class="games-feedback ${s.last.correct?'games-feedback-ok':'games-feedback-error'}">${s.last.correct?'✓ ':'✕ '}${h(s.last.message)}</div>`:''}${content}
      <div class="games-progress"><button class="btn" data-games="abandon">Quitter la partie</button><span class="games-muted">Récompense : ${n(snapshot?.settings?.[s.type])} crédits</span></div></section>`;
  }
  function mini(){const s=snapshot;if(!s)return intro('Mini-<em>jeux.</em>','Jeux sans limite.')+tabs()+loadingBox();if(!s.league)return intro('Mini-<em>jeux.</em>','Mise à jour des règles en cours.')+tabs()+'<section class="panel"><h3>Installation du nouveau serveur nécessaire</h3><p>Les parties illimitées seront disponibles après la mise à jour de la fonction Supabase.</p><button class="btn" data-games="refresh">Actualiser</button></section>';if(s.active&&!s.active.done)return miniSession(s.active);if(s.active?.done&&section==='mini'&&!showPicker)return miniResult(s.active);
    const daily=s.daily||{wins:[],played:[],claimed:false};const count=daily.wins?.length||0;
    return intro('Mini-<em>jeux.</em>','Trois défis améliorés. Une victoire rapporte les crédits configurés par l’admin, et tu peux rejouer autant de fois que tu veux.')+tabs()+
    `<div class="games-mini-grid">${TYPES.map(type=>`<article class="games-mini-item"><div class="games-mini-emoji">${ICONS[type]}</div><div class="eyebrow">${daily.wins?.includes(type)?'✓ DÉFI DU JOUR VALIDÉ':'PARTIES ILLIMITÉES'}</div><h3>${h(LABELS[type])}</h3><p>${HELP[type]}</p><p>🏅 Victoire : <strong>+${n(s.settings?.[type])} crédits</strong></p><button class="btn btn-primary" data-games="start" data-type="${type}">Jouer maintenant</button></article>`).join('')}</div>
    <section class="panel games-panel"><h3>✦ Défi quotidien</h3><p class="games-muted">Remporte au moins une fois chacun des trois mini-jeux aujourd’hui pour récupérer ${n(s.settings?.daily)} crédits de bonus. Les autres victoires restent récompensées.</p><div class="games-progress"><strong>${count} / 3 jeux validés</strong><button class="btn btn-primary" data-games="daily" ${count!==3||daily.claimed?'disabled':''}>${daily.claimed?'Bonus déjà obtenu':'Réclamer le bonus'}</button></div></section>`;
  }
  let showPicker=false;
  function draw(){if(!available())return;root.innerHTML=section==='casino'?casino():section==='mini'?mini():hub();refreshTimer();}
  function refreshTimer(){
    const c=snapshot?.current,clock=$('games-clock');if(!c)return;
    const diff=Math.max(0,c.closesAt-serverNow()),sec=Math.ceil(diff/1000);
    if(clock)clock.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
    if(diff<=20000&&diff>0&&snapshot.bet&&lastAlert!==c.id){
      lastAlert=c.id;toast('🔔 Ton combat IA commence dans 20 secondes !');
      if(typeof Notification!=='undefined'&&Notification.permission==='granted'){try{new Notification('Mashup · Casino IA',{body:'Ton combat commence dans 20 secondes !'});}catch{}}
    }
  }
  function activateTicker(){if(tick)return;tick=setInterval(()=>{
    refreshTimer();const now=Date.now();// Ajuster la fréquence au besoin : alerte et combat en direct restent réactifs.
    const closeIn=(snapshot?.current?.closesAt??0)-serverNow();
    const nearFight=closeIn>0&&closeIn<=30000;
    const watching=available()&&section==='casino';
    const hasBet=!!snapshot?.bet;
    const allowed=!!getUser()&&(watching||hasBet)&&(!document.hidden||hasBet);
    const pace=snapshot?.live?.live||(nearFight&&(watching||hasBet))?3000:watching?15000:hasBet?20000:Infinity;
    if(allowed&&!loading&&now-lastPoll>=pace){
      lastPoll=now;request('status');
    }
  },1000);}
  async function mount(element){root=element;section='hub';showPicker=true;activateTicker();draw();await request('status');}
  async function mountAdmin(element){
    if(getUser()?.role!=='admin')return;const box=document.createElement('section');box.className='panel games-admin-settings';box.id='games-admin-settings';
    box.innerHTML='<div class="eyebrow">RÉGLAGES · LIGUE & MINI-JEUX</div><h3>Casino IA — Cotes et récompenses</h3><div id="games-admin-form">Chargement…</div>';element.appendChild(box);
    const data=await request('status');if(!data||!box.isConnected)return;
    const keys=[['memory','Crédits gagnés · Memory',0,5000,1],['quiz','Crédits gagnés · Quiz',0,5000,1],['higherLower','Crédits gagnés · Plus ou moins',0,5000,1],['daily','Bonus du défi quotidien',0,5000,1],['multiplierSimple','Coefficient de cotes · Simple',1,10,.01],['multiplierDouble','Coefficient de cotes · Double',1,10,.01],['doubleChance','Fréquence Double (0 à 1)',0,1,.01]];
    $('games-admin-form').innerHTML=`<div class="games-admin-grid">${keys.map(([k,title,min,max,step])=>`<label>${title}<input data-games-setting="${k}" type="number" min="${min}" max="${max}" step="${step}" value="${Number(data.settings[k])}"></label>`).join('')}</div><p class="games-muted">Les cotes réelles évoluent selon l’Elo, les victoires et la forme des IA. Ces deux coefficients modifient le niveau des cotes des nouveaux combats (valeurs actuellement 1,8 simple et 2,6 double). Les paris déjà posés ne changent pas. Les crédits gagnés en mini-jeux sont attribués à chaque victoire.</p><button class="btn btn-primary" data-games="save-admin">Enregistrer les réglages</button>`;
  }
  document.addEventListener('click',async event=>{
    const target=event.target.closest('[data-games]');if(!target)return;
    const action=target.dataset.games;if(action==='arena'){showArena();return;}
    if(['hub','casino','mini'].includes(action)){section=action;if(action==='mini')showPicker=true;draw();if(action!=='hub')request('status');return;}
    if(action==='refresh'){await request('status');return;}
    if(action==='notifications'){
      if(typeof Notification==='undefined')return toast('Ton navigateur ne prend pas en charge les notifications.',true);
      const permission=await Notification.requestPermission();toast(permission==='granted'?'Alertes navigateur activées.':'Les alertes dans Mashup restent actives.');return;
    }
    if(!snapshot)return;
    if(action==='bet'){
      const amount=Number($('games-amount')?.value),side=Number(document.querySelector('input[name="games-side"]:checked')?.value||0);
      if(!Number.isSafeInteger(amount)||amount<10||amount>25000)return toast('Choisis une mise entière entre 10 et 25 000.',true);
      if(!confirm(`Miser ${n(amount)} crédits sur ${sideName(snapshot.current,side)} ? La mise est débitée immédiatement.`))return;
      await request('bet',{amount,side});return;
    }
    if(action==='start'||action==='replay'){showPicker=false;await request('start',{type:target.dataset.type});section='mini';draw();return;}
    if(action==='flip'){
      if(Date.now()<lockedUntil)return;
      await request('move',{index:Number(target.dataset.index),sessionId:snapshot.active?.id});return;
    }
    if(action==='answer'){
      if(Date.now()<lockedUntil)return;
      await request('move',{answer:target.dataset.answer,sessionId:snapshot.active?.id});return;
    }
    if(action==='abandon'){if(confirm('Abandonner cette partie ? Tu peux rejouer ensuite.')){await request('abandon',{sessionId:snapshot.active?.id});showPicker=true;draw();}return;}
    if(action==='daily'){const r=await request('daily',{});if(r)toast('Bonus quotidien attribué !');return;}
    if(action==='save-admin'){
      const settings={};document.querySelectorAll('#games-admin-form [data-games-setting]').forEach(x=>settings[x.dataset.gamesSetting]=Number(x.value));
      try{const r=await api('admin',settings);snapshot=r;toast('Réglages enregistrés pour tout Mashup.');}catch(err){toast(err.message,true);}return;
    }
  });
  return {mount,mountAdmin};
}
