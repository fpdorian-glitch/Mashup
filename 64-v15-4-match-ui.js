/* Mashup Match V15.4 — presentation and input only.
 * Credit and account progression updates are accepted exclusively from the API.
 * Training is a separate, device-local campaign and never changes the wallet.
 */
import {createMatch, applyMove, progressFor} from './62-v15-4-match-engine.js';
import {MATCH_LEVELS, MATCH_WORLDS, getMatchLevel} from './63-v15-4-match-levels.js';
import {createMatchGesture} from './71-v15-6-match-gesture.js?v=16.1.1';
import {createMatchSocial} from './73-v15-6-match-social.js?v=16.1.1';
import {createMatchPresentation} from './75-v15-6-match-presentation.js?v=16.1.1';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SYMBOL_NAMES = ['Soleil', 'Cristal', 'Lune', 'Flamme', 'Orbite', 'Feuille'];
const SPECIAL_NAMES = {row:'rayon horizontal', column:'rayon vertical', nova:'nova de zone', prism:'prisme chromatique'};
const SYMBOL_PATHS = [
  '<circle cx="20" cy="20" r="8"/><path d="M20 3v5m0 24v5M3 20h5m24 0h5M8 8l4 4m16 16 4 4M8 32l4-4M28 12l4-4"/>',
  '<path d="m20 3 13 15-13 19L7 18Z"/><path d="m7 18 13 5 13-5M20 3v34"/>',
  '<path d="M28 5A16 16 0 1 0 35 29 16 16 0 0 1 28 5Z"/><path d="m11 15 2 4 4 1-4 2-2 4-1-4-4-2 4-1Z"/>',
  '<path d="M22 3c4 10-6 10-3 17 2-3 5-5 8-5 11 15 2 23-8 23S3 29 8 21c1 4 4 6 6 6C10 17 20 15 22 3Z"/>',
  '<circle cx="20" cy="20" r="6"/><ellipse cx="20" cy="20" rx="18" ry="8" transform="rotate(-37 20 20)"/><path d="M14 5a16 16 0 0 1 19 24M7 11a16 16 0 0 0 19 24"/>',
  '<path d="M34 5C9 3 4 20 10 30c10 7 27-1 24-25Z"/><path d="m6 36 22-22M13 29l-1-10m8 3 9 1"/>'
];
const positiveInteger = (value, fallback=0, max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Math.min(max,Number(value)) : fallback;
const clampLevel = value => Math.max(1, Math.min(MATCH_LEVELS.length, positiveInteger(value,1)));
const own = (value, key) => value && typeof value === 'object' && Object.hasOwn(value,key) ? value[key] : undefined;

export function matchSymbolMarkup(kind, special=null) {
  const index=positiveInteger(kind,0,5),symbol=SYMBOL_PATHS[index];
  return '<span class="mm-glyph mm-glyph-'+index+'" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+symbol+'</svg>'+(SPECIAL_NAMES[special]?'<i class="mm-special mm-special-'+special+'">'+(special==='row'?'↔':special==='column'?'↕':special==='nova'?'✹':'✧')+'</i>':'')+'</span>';
}

export function normalizeMatchProgress(input={}) {
  const levels=Object.create(null),raw=input?.levels;
  for(let id=1;id<=MATCH_LEVELS.length;id++){
    const value=own(raw,String(id));if(!value||typeof value!=='object')continue;
    const stars=positiveInteger(value.stars,0,3),bestScore=positiveInteger(value.bestScore,0,100000000);
    levels[id]={stars,bestScore,completed:value.completed===true,rewardClaimed:value.rewardClaimed===true};
  }
  return {unlocked:Math.max(1,positiveInteger(input?.unlocked,1,MATCH_LEVELS.length+1)),levels};
}

export function trainingStorageKey(userId) {
  return typeof userId==='string'&&userId.length>0&&userId.length<=200 ? 'mashup-match-training-v154:'+encodeURIComponent(userId) : null;
}

export function readTrainingProgress(storage,userId) {
  const key=trainingStorageKey(userId);if(!key)return normalizeMatchProgress();
  try{const data=JSON.parse(storage?.getItem(key)||'null');return data?.version===1?normalizeMatchProgress(data.progress):normalizeMatchProgress();}catch{return normalizeMatchProgress();}
}

export function readTrainingActive(storage,userId) {
  const key=trainingStorageKey(userId);if(!key)return null;
  try{const data=JSON.parse(storage?.getItem(key)||'null');return data?.version===1&&data.active?.id?.startsWith('training-')&&validateMatchSnapshot(data.active)?data.active:null;}catch{return null;}
}

export function recordTrainingWin(progress,levelId,{stars,score}) {
  const result=normalizeMatchProgress(progress),id=clampLevel(levelId),previous=result.levels[id]||{};
  result.levels[id]={stars:Math.max(previous.stars||0,positiveInteger(stars,1,3)),bestScore:Math.max(previous.bestScore||0,positiveInteger(score)),completed:true,rewardClaimed:false};
  result.unlocked=Math.max(result.unlocked,Math.min(MATCH_LEVELS.length+1,id+1));
  return result;
}

export function matchAnimationQuality(mode='auto',{reduced=false,eco=false,cores=8,saveData=false}={}) {
  if(reduced||mode==='off')return 'off';
  if(mode==='simple'||eco||saveData||(cores>0&&cores<=4))return 'simple';
  return 'full';
}

export function validateMatchSnapshot(active) {
  if(!active||typeof active!=='object'||typeof active.id!=='string'||!active.id.length||active.id.length>100||!Number.isSafeInteger(active.revision)||active.revision<0)return false;
  const state=active.state,w=state?.width,h=state?.height;
  if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<4||h<4||w>9||h>9||!Array.isArray(state.board)||state.board.length!==w*h)return false;
  if(!Array.isArray(state.mask)||state.mask.length!==w*h||!Array.isArray(state.obstacles)||state.obstacles.length!==w*h)return false;
  if(!Number.isSafeInteger(active.levelId)||active.levelId<1||active.levelId>MATCH_LEVELS.length||!['playing','won','lost'].includes(state.status))return false;
  if(!Number.isSafeInteger(state.colors)||state.colors<4||state.colors>6||!Number.isSafeInteger(state.rng)||state.rng<1||state.rng>4294967295)return false;
  if(state.levelId!==active.levelId||!Number.isSafeInteger(state.score)||state.score<0||state.score>100000000||!Number.isSafeInteger(state.movesLeft)||state.movesLeft<0||state.movesLeft>100||!Number.isSafeInteger(state.movesUsed)||state.movesUsed<0||state.movesUsed>100)return false;
  if(!state.goals||!Number.isSafeInteger(state.goals.score)||state.goals.score<0||!Number.isSafeInteger(state.goals.obstacles)||state.goals.obstacles<0||!Array.isArray(state.goals.collect)||state.goals.collect.length!==6||!state.goals.collect.every(n=>Number.isSafeInteger(n)&&n>=0))return false;
  if(!Array.isArray(state.collected)||state.collected.length!==6||!state.collected.every(n=>Number.isSafeInteger(n)&&n>=0)||!Number.isSafeInteger(state.destroyedObstacles)||state.destroyedObstacles<0)return false;
  if(!state.mask.every(value=>typeof value==='boolean')||!state.obstacles.every(value=>Number.isSafeInteger(value)&&value>=0&&value<=3))return false;
  if(!Array.isArray(state.starTargets)||state.starTargets.length!==3||!state.starTargets.every(value=>Number.isFinite(value)&&value>0))return false;
  return state.board.every((tile,index)=>!state.mask[index]?tile===null&&state.obstacles[index]===0:tile&&Number.isSafeInteger(tile.kind)&&tile.kind>=0&&tile.kind<state.colors&&(tile.special==null||Object.hasOwn(SPECIAL_NAMES,tile.special)));
}

export function validateMatchServiceStatus(data) {
  if(!data||data.available!==true||data.version!=='15.4.0'||!data.progress||!Number.isSafeInteger(data.progress.unlocked)||data.progress.unlocked<1||data.progress.unlocked>MATCH_LEVELS.length+1)return false;
  if(!data.progress.levels||typeof data.progress.levels!=='object'||Array.isArray(data.progress.levels)||!data.economy||typeof data.economy.enabled!=='boolean')return false;
  const prices=data.economy.levelRewards;if(!prices||typeof prices!=='object'||Array.isArray(prices))return false;
  if(!MATCH_LEVELS.every(level=>Object.hasOwn(prices,level.id)&&Number.isSafeInteger(prices[level.id])&&prices[level.id]>=0&&prices[level.id]<=5000))return false;
  return data.active===null||validateMatchSnapshot(data.active);
}

function starsMarkup(stars,label='Étoiles') {
  return '<span class="mm-stars" aria-label="'+escapeHTML(label)+' : '+positiveInteger(stars,0,3)+' sur 3">'+[1,2,3].map(n=>'<i class="'+(stars>=n?'is-lit':'')+'" aria-hidden="true">✦</i>').join('')+'</span>';
}
function worldFor(level) { return MATCH_WORLDS.find(world=>Number(world.id)===Number(level?.worldId??level?.world))||MATCH_WORLDS[Math.floor((clampLevel(level?.id)-1)/10)]||{}; }
function safeColor(color) {return /^#[0-9a-f]{6}$/i.test(String(color))?color:'#7dd8be';}
function matchSocialEntry(){return '<button class="mm156-social-entry" data-mm-action="social" type="button"><span aria-hidden="true">♧</span><span><b>Progression des joueurs</b><small>Les étoiles et les mondes validés de tes amis</small></span><i aria-hidden="true">↗</i></button>';}
function knownReward(rewards,id) {const value=own(rewards,String(id));return Number.isSafeInteger(value)&&value>=0?value:null;}

export function matchCampaignMarkup({progress={},training=false,rewards={},available=true,rewardsEnabled=true,active=null,quality='auto'}={}) {
  const p=normalizeMatchProgress(progress),completed=Object.values(p.levels).filter(level=>level.completed).length,totalStars=Object.values(p.levels).reduce((sum,level)=>sum+level.stars,0);
  const next=clampLevel(p.unlocked),currentLevel=getMatchLevel(next),currentWorld=worldFor(currentLevel);
  const resume=active?.state?.status==='playing';
  return '<section class="mm-app mm-campaign" data-mm-mode="'+(training?'training':'online')+'">'+
    '<header class="mm-header"><button class="mm-back" data-mm-action="exit" data-games="hub" aria-label="Retour aux jeux">← <span>Jeux</span></button><span class="mm-brand">MASHUP<span>MATCH</span></span><span class="mm-status-pill">'+(training?'Sur cet appareil':'Campagne')+'</span></header>'+
    '<div class="mm-campaign-hero" style="--mm-world:'+safeColor(currentWorld.color)+'"><div class="mm-orbit-mark" aria-hidden="true">✦<i></i><b></b></div><div class="mm-kicker">100 NIVEAUX · 10 MONDES</div><h1>Aligne les mondes.<br><em>Réveille le multivers.</em></h1><p>Un échange, une réaction en chaîne. Fais naître des rayons, des novas et des prismes.</p>'+
    '<button class="mm-primary" data-mm-action="'+(resume?'resume':'level')+'" data-mm-level="'+next+'">'+(resume?'Reprendre le niveau '+active.levelId:completed===MATCH_LEVELS.length?'Rejouer le dernier niveau':'Continuer · Niveau '+next)+'<span aria-hidden="true">↗</span></button></div>'+
    (training?'<aside class="mm-training-note" role="note"><b>ENTRAÎNEMENT · AUCUN CRÉDIT</b><span>Étoiles et parcours conservés sur cet appareil pour ton compte. Cet entraînement ne change pas ta campagne en ligne.</span></aside>':'<p class="mm-server-note">'+(rewardsEnabled?'Progression et premières récompenses validées par le serveur.':'Récompenses temporairement désactivées · tes étoiles et ta progression restent sauvegardées.')+'</p>')+
    '<div class="mm-campaign-metrics"><div><strong>'+completed+'<small> / '+MATCH_LEVELS.length+'</small></strong><span>Niveaux terminés</span></div><div><strong>'+totalStars+'<small> / '+MATCH_LEVELS.length*3+'</small></strong><span>Étoiles réunies</span></div><div><strong>'+Math.min(10,Math.floor(completed/10))+'<small> / 10</small></strong><span>Mondes traversés</span></div></div>'+
    matchSocialEntry()+(training?'<button class="mm-quiet mm156-online-entry" data-mm-action="online">Vérifier la campagne en ligne</button>':'')+'<div class="mm-worlds">'+MATCH_WORLDS.map(world=>{
      const levels=MATCH_LEVELS.filter(level=>Number(level.worldId??level.world)===Number(world.id)),done=levels.filter(level=>p.levels[level.id]?.completed).length,current=levels.some(level=>level.id===next),first=levels[0]?.id||1;
      return '<details class="mm-world '+(done===levels.length?'is-complete':'')+'" style="--mm-world:'+safeColor(world.color)+'" '+(current?'open':'')+'><summary><span class="mm-world-icon" aria-hidden="true">'+escapeHTML(world.icon||'✦')+'</span><span><small>MONDE '+String(world.id).padStart(2,'0')+' · '+done+'/'+levels.length+'</small><strong>'+escapeHTML(world.name||'Monde '+world.id)+'</strong><em>'+escapeHTML(world.subtitle||'Une nouvelle traversée du multivers')+'</em></span><b aria-hidden="true">'+(done===levels.length?'✓':first>p.unlocked?'◇':'+')+'</b></summary><ol class="mm-levels" start="'+first+'">'+levels.map(level=>{
        const saved=p.levels[level.id],locked=level.id>p.unlocked&&!saved?.completed,reward=training?null:knownReward(rewards,level.id),claimed=saved?.rewardClaimed;
        return '<li><button class="mm-level '+(locked?'is-locked':saved?.completed?'is-complete':level.id===next?'is-current':'')+'" data-mm-action="level" data-mm-level="'+level.id+'" '+(locked||!available?'disabled':'')+' aria-label="Niveau '+level.id+' · '+escapeHTML(level.name||'')+(locked?' · verrouillé':saved?.completed?' · terminé':' · disponible')+'"><span class="mm-level-number">'+(locked?'<span aria-hidden="true">◇</span><small>'+level.id+'</small>':level.id)+'</span>'+starsMarkup(saved?.stars||0)+'<span class="mm-level-reward">'+(training?'Entraînement':claimed?'✓ Obtenue':!rewardsEnabled?'Gains suspendus':reward===null?'Première victoire':'+'+reward+' crédits')+'</span></button></li>';
      }).join('')+'</ol></details>';
    }).join('')+'</div><footer class="mm-comfort"><label>Animations <select data-mm-quality><option value="auto" '+(quality==='auto'?'selected':'')+'>Adaptatives</option><option value="full" '+(quality==='full'?'selected':'')+'>Complètes</option><option value="simple" '+(quality==='simple'?'selected':'')+'>Simples</option><option value="off" '+(quality==='off'?'selected':'')+'>Sans mouvement</option></select></label><span>Les préférences de mouvement réduit sont toujours respectées.</span></footer></section>';
}

function goalMarkup(state) {
  const progress=progressFor(state),items=[];
  if(progress.score?.target>0)items.push('<div class="mm-goal"><span>Score</span><strong>'+positiveInteger(progress.score.current).toLocaleString('fr-FR')+'<small> / '+positiveInteger(progress.score.target).toLocaleString('fr-FR')+'</small></strong><i style="--mm-goal-progress:'+Math.min(100,100*progress.score.current/progress.score.target)+'%"></i></div>');
  for(const goal of progress.collect||[])items.push('<div class="mm-goal mm-goal-symbol">'+matchSymbolMarkup(goal.kind)+'<strong>'+Math.min(goal.current,goal.target)+'<small> / '+goal.target+'</small></strong><span class="mm-sr">'+SYMBOL_NAMES[goal.kind]+'</span></div>');
  if(progress.obstacles?.target>0)items.push('<div class="mm-goal"><span>Sceaux brisés</span><strong>'+Math.min(progress.obstacles.current,progress.obstacles.target)+'<small> / '+progress.obstacles.target+'</small></strong></div>');
  return items.join('');
}

export function matchBoardMarkup(active,{selected=null,focusIndex=0,busy=false,training=false}={}) {
  if(!validateMatchSnapshot(active))return '<div class="mm-notice" role="alert">Plateau indisponible. Actualise la campagne.</div>';
  const state=active.state,level=getMatchLevel(active.levelId),world=worldFor(level),ended=state.status!=='playing';
  const playable=state.board.flatMap((tile,index)=>tile&&state.mask[index]&&!state.obstacles[index]?[index]:[]),tabFocus=playable.includes(focusIndex)?focusIndex:playable[0];
  return '<section class="mm-app mm-play" style="--mm-world:'+safeColor(world.color)+'" data-mm-mode="'+(training?'training':'online')+'"><header class="mm-header"><button class="mm-back" data-mm-action="campaign">← <span>Parcours</span></button><span class="mm-brand">MASHUP<span>MATCH</span></span><span class="mm-status-pill">'+(training?'Entraînement':'Niveau '+level.id)+'</span></header>'+
    '<div class="mm-play-title"><div><span class="mm-kicker">'+escapeHTML(world.name||'Le multivers')+' · NIVEAU '+level.id+'</span><h1>'+escapeHTML(level.name||'Une nouvelle étincelle')+'</h1></div><div class="mm-moves '+(state.movesLeft<=5?'is-low':'')+'"><strong>'+state.movesLeft+'</strong><span>MOUVEMENTS</span></div></div>'+
    '<div class="mm-objectives" aria-label="Objectifs du niveau">'+goalMarkup(state)+'</div>'+
    '<div class="mm-board-frame"><div class="mm-board" role="grid" aria-label="Plateau Mashup Match, '+state.width+' colonnes et '+state.height+' lignes" aria-rowcount="'+state.height+'" aria-colcount="'+state.width+'" style="--mm-columns:'+state.width+';--mm-rows:'+state.height+'" data-mm-board>'+state.board.map((tile,index)=>{
      const row=Math.floor(index/state.width)+1,column=index%state.width+1,obstacle=positiveInteger(state.obstacles[index],0,9);
      if(!state.mask[index])return '<span class="mm-hole" aria-hidden="true"></span>';
      if(!tile)return '<div class="mm-stone" role="gridcell" aria-label="Ligne '+row+', colonne '+column+', case bloquée"><span aria-hidden="true">◇</span></div>';
      const chosen=selected===index;
      return '<button class="mm-cell '+(chosen?'is-selected ':'')+(obstacle?'has-seal ':'')+'" role="gridcell" data-mm-cell="'+index+'" data-mm-special="'+escapeHTML(tile.special||'')+'" aria-rowindex="'+row+'" aria-colindex="'+column+'" aria-selected="'+chosen+'" aria-label="Ligne '+row+', colonne '+column+', '+SYMBOL_NAMES[tile.kind]+(tile.special?', '+SPECIAL_NAMES[tile.special]:'')+(obstacle?', sceau '+obstacle:'')+'" tabindex="'+(index===tabFocus?'0':'-1')+'" '+(busy||ended||obstacle?'disabled':'')+'>'+matchSymbolMarkup(tile.kind,tile.special)+(obstacle?'<i class="mm-seal" aria-hidden="true">'+(obstacle>1?obstacle:'')+'</i>':'')+'</button>';
    }).join('')+'</div></div><p class="mm-input-help">Touche deux symboles voisins ou fais glisser un symbole. Au clavier : sélectionne avec Entrée, puis utilise une flèche.</p>'+
    '<div class="mm-play-tools"><button class="mm-quiet" data-mm-action="help">✧ Les combinaisons</button><button class="mm-quiet" data-mm-action="finish-effects">Passer les effets</button><button class="mm-quiet" data-mm-action="refresh" '+(training?'hidden':'')+'>↻ Synchroniser</button><button class="mm-quiet" data-mm-action="abandon" '+(ended?'hidden':'')+'>Abandonner</button></div><div class="mm-announcement" role="status" aria-live="polite" aria-atomic="true" data-mm-announcement>'+(busy?'Enregistrement du coup…':training?'Entraînement sur cet appareil · aucun crédit attribué.':'Chaque coup est validé par le serveur.')+'</div><div data-mm-outcome>'+outcomeMarkup(active,{training})+'</div><div data-mm-help hidden>'+helpMarkup()+'</div></section>';
}

function helpMarkup() {
  return '<section class="mm-help"><h2>Les lois du multivers</h2><div><p><b>3 symboles</b><span>Un alignement disparaît et libère la place.</span></p><p><b>4 symboles</b><span>Un rayon efface une ligne ou une colonne.</span></p><p><b>5 symboles</b><span>Un prisme efface une couleur entière.</span></p><p><b>Un L ou un T</b><span>Une nova libère la zone autour d’elle.</span></p><p><b>Bonus voisins</b><span>Échange-les pour combiner leur puissance.</span></p><p><b>Une cascade</b><span>Les alignements successifs multiplient les points.</span></p></div><p>Les sceaux se brisent avec les alignements. Les cases sombres sont infranchissables. Un plateau sans coup est mélangé sans consommer de mouvement.</p></section>';
}

function outcomeMarkup(active,{training=false,reward=active?.reward||null}={}) {
  const state=active.state;if(state.status==='playing')return '';
  const won=state.status==='won',progress=progressFor(state),credits=Number.isSafeInteger(reward?.credits)?reward.credits:0;
  const rewardNote={'replay-disabled':'Niveau déjà récompensé · étoiles et record mis à jour.','replay-cap':'Plafond de replay atteint · progression enregistrée.','disabled':'Progression enregistrée · récompenses temporairement désactivées.'}[reward?.reason]||'Progression confirmée par le serveur.';
  return '<section class="mm-outcome '+(won?'is-win':'is-loss')+'" role="status"><span class="mm-outcome-mark" aria-hidden="true">'+(won?'✦':'◇')+'</span><span class="mm-kicker">NIVEAU '+active.levelId+' · '+(training?'ENTRAÎNEMENT':'CAMPAGNE')+'</span><h2>'+(won?'Le multivers s’éveille.':'Une autre voie t’attend.')+'</h2>'+starsMarkup(won?progress.stars:0,'Performance')+'<p>'+positiveInteger(state.score).toLocaleString('fr-FR')+' points · '+positiveInteger(state.movesUsed)+' mouvements joués</p>'+(training?'<p class="mm-outcome-reward">Aucun crédit · parcours sauvegardé sur cet appareil.</p>':won?'<p class="mm-outcome-reward">'+(reward?.granted&&credits>0?'+'+credits+' crédits confirmés':reward?.granted?'Victoire et progression confirmées':escapeHTML(rewardNote))+'</p>':'')+'<div><button class="mm-primary" data-mm-action="'+(won&&active.levelId<MATCH_LEVELS.length?'next':'retry')+'">'+(won&&active.levelId<MATCH_LEVELS.length?'Niveau suivant →':'Rejouer ce niveau')+'</button><button class="mm-quiet" data-mm-action="campaign">Voir le parcours</button></div></section>';
}

export function validateMatchEconomy(input) {
  if(!input||typeof input!=='object'||typeof input.enabled!=='boolean'||!Array.isArray(input.tiers)||input.tiers.length>100||!input.replay)return {ok:false,error:'Configuration économique incomplète.'};
  const rewards=Array(MATCH_LEVELS.length).fill(null),tiers=[];
  for(const tier of input.tiers){
    const {from,to,credits}=tier||{};
    if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<1||to<from||to>MATCH_LEVELS.length||!Number.isSafeInteger(credits)||credits<0||credits>5000)return {ok:false,error:'Chaque tranche doit couvrir des niveaux valides avec un gain entier entre 0 et 5 000.'};
    for(let id=from;id<=to;id++){if(rewards[id-1]!==null)return {ok:false,error:'Deux tranches se chevauchent.'};rewards[id-1]=credits;}
    tiers.push({from,to,credits});
  }
  if(rewards.some(value=>value===null))return {ok:false,error:'Les tranches doivent couvrir les 100 niveaux.'};
  const overrides=Object.create(null);
  if(!input.overrides||typeof input.overrides!=='object'||Array.isArray(input.overrides))return {ok:false,error:'Les gains individuels sont invalides.'};
  for(const [key,value] of Object.entries(input.overrides)){
    const id=Number(key);if(!Number.isSafeInteger(id)||id<1||id>MATCH_LEVELS.length||String(id)!==key||!Number.isSafeInteger(value)||value<0||value>5000)return {ok:false,error:'Un gain individuel est invalide.'};
    overrides[id]=value;rewards[id-1]=value;
  }
  const replay=input.replay;
  if(typeof replay.enabled!=='boolean'||!['credits','dailyCap','perLevelCap'].every(key=>Number.isSafeInteger(replay[key])&&replay[key]>=0&&replay[key]<=(key==='credits'?5000:50000)))return {ok:false,error:'Les gains et plafonds de replay doivent être des entiers positifs ou nuls.'};
  return {ok:true,config:{enabled:input.enabled,tiers,overrides,replay:{enabled:replay.enabled,credits:replay.credits,dailyCap:replay.dailyCap,perLevelCap:replay.perLevelCap}},rewards:rewards.map(value=>input.enabled?value:0)};
}

export function matchEconomyPreviewMarkup(config) {
  const result=validateMatchEconomy(config);if(!result.ok)return '<p class="mm-error" role="alert">'+escapeHTML(result.error)+'</p>';
  return '<div class="mm-economy-summary"><b>'+result.rewards.reduce((sum,value)=>sum+value,0).toLocaleString('fr-FR')+' crédits</b><span>Maximum des premières victoires de la campagne complète</span></div><ol class="mm-economy-preview" aria-label="Gains prévus pour les 100 niveaux">'+result.rewards.map((value,index)=>'<li><span>Niveau '+(index+1)+'</span><strong>'+value+' crédits</strong></li>').join('')+'</ol>';
}

function adminFormMarkup(config,revision) {
  const result=validateMatchEconomy(config);if(!result.ok)return '<p class="mm-error">'+escapeHTML(result.error)+'</p>';
  return '<form data-mm-admin-form data-mm-revision="'+revision+'"><label class="mm-checkbox"><input type="checkbox" name="enabled" '+(config.enabled?'checked':'')+'> Activer les récompenses du mini-jeu</label><h4>Premières victoires · tranches de niveaux</h4><div class="mm-admin-tiers">'+config.tiers.map((tier,index)=>'<label>Niveaux '+tier.from+' à '+tier.to+'<input type="number" min="0" max="5000" step="1" data-mm-tier="'+index+'" value="'+tier.credits+'" required><small>crédits par première réussite</small></label>').join('')+'</div><h4>Gains individuels</h4><p>Un gain individuel remplace la tranche du niveau. Une valeur de zéro désactive son gain.</p><div class="mm-admin-overrides">'+Object.entries(config.overrides).map(([id,value])=>overrideMarkup(id,value)).join('')+'</div><button type="button" class="mm-quiet" data-mm-admin="add-override">+ Définir un niveau précis</button><h4>Rejouer un niveau</h4><label class="mm-checkbox"><input type="checkbox" name="replayEnabled" '+(config.replay.enabled?'checked':'')+'> Activer les gains réduits de replay</label><div class="mm-admin-replay"><label>Crédits par replay<input name="replayCredits" type="number" min="0" max="5000" value="'+config.replay.credits+'" required></label><label>Plafond de crédits par jour<input name="dailyCap" type="number" min="0" max="50000" value="'+config.replay.dailyCap+'" required></label><label>Plafond par niveau et par jour<input name="perLevelCap" type="number" min="0" max="50000" value="'+config.replay.perLevelCap+'" required></label></div><p>Les plafonds sont appliqués par le serveur. Une première récompense déjà reçue ne peut pas être réattribuée.</p><details class="mm-admin-preview"><summary>Vérifier la grille complète des gains</summary><div data-mm-economy-preview>'+matchEconomyPreviewMarkup(config)+'</div></details><p class="mm-admin-error" role="status" data-mm-admin-error></p><button class="mm-primary" type="submit">Enregistrer pour tous les joueurs</button></form>';
}
function overrideMarkup(id='',value='') {return '<div class="mm-override"><label>Niveau<input type="number" min="1" max="100" data-mm-override-id value="'+escapeHTML(id)+'" required></label><label>Crédits<input type="number" min="0" max="5000" data-mm-override-value value="'+escapeHTML(value)+'" required></label><button class="mm-quiet" type="button" data-mm-admin="remove-override" aria-label="Retirer ce gain individuel">×</button></div>';}

export function createMashupMatchUI({api,getUser=()=>null,getSessionKey=()=>'',onState=()=>{},toast=()=>{},getView=()=>'games',onExit=()=>{}}) {
  let root=null,active=null,trainingActive=null,progress=normalizeMatchProgress(),trainingProgress=normalizeMatchProgress(),publicRewards={},rewardsEnabled=true,mode='loading',screen='campaign',busy=false,epoch=0,sequence=0,pending=null,selected=null,focusIndex=0,reward=null,error='',quality='auto',listeners=[],poll=null,gesture=null,presentation=null,adminBusy=false,storageWarned=false;
  let adminRoot=null,adminConfig=null,adminRevision=null,adminEpoch=0;
  const actor=()=>String(getUser()?.id||'')+'@'+String(getSessionKey());
  const mounted=()=>!!root?.isConnected&&['games','match'].includes(getView());
  const social=createMatchSocial({api,getUser,getSessionKey,getView:()=>screen==='social'&&mounted()?'social':'inactive',onExit:()=>{social.unmount();screen='campaign';draw();}});
  const storage=()=>{try{return globalThis.localStorage;}catch{return null;}};
  const requestId=()=>globalThis.crypto?.randomUUID?.()||'match-'+Date.now().toString(36)+'-'+(++sequence).toString(36);
  const listen=(target,type,handler,options)=>{if(!target?.addEventListener)return;target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));};
  const animationMode=()=>matchAnimationQuality(quality,{reduced:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,eco:globalThis.document?.documentElement?.dataset.m13Quality==='eco',cores:globalThis.navigator?.hardwareConcurrency||8,saveData:globalThis.navigator?.connection?.saveData});
  function stopEffects(){presentation?.cancel();}
  function unbind(){gesture?.destroy();gesture=null;presentation?.destroy();presentation=null;social.unmount();for(const cleanup of listeners)cleanup();listeners=[];if(poll)clearInterval(poll);poll=null;stopEffects();}
  function unmount(){epoch++;unbind();root=null;busy=false;pending=null;}
  function clearSession(){unmount();social.clearSession();active=null;trainingActive=null;progress=normalizeMatchProgress();trainingProgress=normalizeMatchProgress();publicRewards={};rewardsEnabled=true;mode='loading';reward=null;error='';selected=null;adminEpoch++;adminRoot=null;adminConfig=null;adminBusy=false;storageWarned=false;}
  function currentProgress(){return mode==='training'?trainingProgress:progress;}
  function draw(){
    if(!mounted()||screen==='social')return;gesture?.cancel('repaint');stopEffects();
    if(mode==='loading')root.innerHTML='<section class="mm-app mm-loading" role="status"><span class="mm-brand">MASHUP<span>MATCH</span></span><span class="mm-loading-orbit" aria-hidden="true">✦</span><p>Ouverture du multivers…</p></section>';
    else if(mode==='unavailable')root.innerHTML='<section class="mm-app mm-unavailable"><button class="mm-back" data-mm-action="exit" data-games="hub">← Jeux</button><span class="mm-brand">MASHUP<span>MATCH</span></span><span class="mm-orbit-mark" aria-hidden="true">✦</span><h1>Les mondes t’attendent.</h1><p>La campagne en ligne est momentanément indisponible. Tu peux parcourir les 100 niveaux en entraînement.</p><aside class="mm-training-note"><b>SUR CET APPAREIL · AUCUN CRÉDIT</b><span>Ce parcours est distinct de la campagne en ligne. Sa progression est conservée uniquement sur cet appareil pour ton compte.</span></aside><button class="mm-primary" data-mm-action="training">'+(Object.keys(trainingProgress.levels).length?'Reprendre l’entraînement':'Commencer l’entraînement')+'</button><button class="mm-quiet" data-mm-action="refresh">Réessayer la connexion</button>'+matchSocialEntry()+'</section>';
    else if(screen==='play'&&active){
      root.innerHTML=matchBoardMarkup(active,{selected,focusIndex,busy,training:mode==='training'});
      const outcome=root.querySelector('[data-mm-outcome]');if(outcome)outcome.innerHTML=outcomeMarkup(active,{training:mode==='training',reward});
    }else root.innerHTML=matchCampaignMarkup({progress:currentProgress(),training:mode==='training',rewards:publicRewards,rewardsEnabled,active,quality});
    if(error&&mode!=='loading')root.insertAdjacentHTML('afterbegin','<div class="mm-network" role="alert"><span>'+escapeHTML(error)+'</span><button class="mm-quiet" data-mm-action="'+(pending?'retry-request':'refresh')+'">Réessayer</button></div>');
    root.querySelectorAll('[data-mm-action="level"],[data-mm-action="next"],[data-mm-action="retry"],[data-mm-action="abandon"]').forEach(button=>{if(busy)button.disabled=true;});
  }
  function acceptReply(data){
    if(!data||typeof data!=='object')throw Error('Réponse du serveur invalide.');
    if(data.active!==undefined){if(data.active!==null&&!validateMatchSnapshot(data.active))throw Error('Le plateau reçu est invalide. Synchronise la campagne.');active=data.active;}
    if(data.progress)progress=normalizeMatchProgress(data.progress);
    if(data.economy?.levelRewards&&typeof data.economy.levelRewards==='object')publicRewards=data.economy.levelRewards;
    if(typeof data.economy?.enabled==='boolean')rewardsEnabled=data.economy.enabled;
    if(data.active!==undefined)reward=data.active?.reward||(data.active?.state?.status==='won'?(data.reward||data.rewards||null):null);
    else if(data.reward||data.rewards)reward=data.reward||data.rewards;
    if(data.state&&typeof data.state==='object'&&!Array.isArray(data.state)&&!Object.hasOwn(data.state,'board'))onState(data.state);
  }
  async function call(route,body,{retry=false}={}) {
    if(busy&&!retry)return null;
    const token=epoch,who=actor(),order=++sequence;busy=true;error='';
    const operation=retry&&pending?pending:{route,body};
    pending=operation;
    if(operation.route==='move'&&root.querySelector('[data-mm-board]')){
      root.querySelector('[data-mm-board]').setAttribute('aria-busy','true');
      root.querySelectorAll('[data-mm-cell]').forEach(cell=>{cell.disabled=true;});
      root.querySelectorAll('.mm-network').forEach(node=>node.remove());
      const message=root.querySelector('[data-mm-announcement]');if(message)message.textContent='Enregistrement du coup…';
    }else draw();
    try{
      const data=await api(operation.route,operation.body);
      if(token!==epoch||who!==actor()||order!==sequence||!mounted())return null;
      if(operation.route==='status'&&!validateMatchServiceStatus(data))throw Error('La campagne en ligne n’est pas encore disponible.');
      if(['start','move'].includes(operation.route)&&!validateMatchSnapshot(data?.active))throw Error('La partie n’a pas pu être confirmée. Synchronise la campagne.');
      if(operation.route==='abandon'&&data?.active!==null)throw Error('L’abandon n’a pas pu être confirmé.');
      acceptReply(data);pending=null;busy=false;error='';mode='online';
      if(operation.route==='start'||operation.route==='move'&&screen==='play')screen=active?'play':'campaign';
      draw();return data;
    }catch(problem){
      if(token!==epoch||who!==actor()||order!==sequence||!mounted())return null;
      busy=false;error=problem?.message||'Connexion interrompue. Ton dernier coup doit être confirmé.';
      if(operation.route==='status'){mode='unavailable';pending=null;}draw();return null;
    }
  }
  async function refresh(){if(busy)return null;return call('status',undefined);}
  function persistTraining(){trainingActive=active;try{const key=trainingStorageKey(getUser()?.id),deviceStorage=storage();if(!key||!deviceStorage)throw Error('Storage unavailable');deviceStorage.setItem(key,JSON.stringify({version:1,progress:trainingProgress,active:trainingActive}));}catch{if(!storageWarned){storageWarned=true;toast('La progression d’entraînement ne peut pas être enregistrée sur cet appareil.',true);}}}
  function training(){mode='training';active=trainingActive;screen=active?'play':'campaign';error='';pending=null;reward=null;selected=null;draw();}
  async function start(levelId){
    if(busy)return;const id=clampLevel(levelId),p=currentProgress();
    if(id>p.unlocked&&!p.levels[id]?.completed)return;
    if(active?.state.status==='playing'){
      if(active.levelId===id){screen='play';draw();return;}
      error='Une partie est déjà en cours. Reprends-la ou abandonne-la depuis son plateau.';screen='play';draw();return;
    }
    selected=null;focusIndex=0;reward=null;
    if(mode==='training'){
      const level=getMatchLevel(id);active={id:'training-'+id,revision:0,levelId:id,state:createMatch(level,level.seed)};screen='play';persistTraining();draw();return;
    }
    await call('start',{levelId:id,requestId:requestId()});
  }
  function presentMove(events,before,valid=true){
    if(!mounted()||!active||screen!=='play')return;
    const clears=(events||[]).filter(event=>event.type==='clear'),cascade=Math.max(0,...clears.map(event=>positiveInteger(event.cascade)));
    const message=root.querySelector('[data-mm-announcement]');
    if(message)message.textContent=!valid?'Cet échange ne forme pas d’alignement. Aucun mouvement consommé.':cascade>1?'Cascade ×'+cascade+' · '+positiveInteger(active.state.score).toLocaleString('fr-FR')+' points':clears.length?'Alignement réussi · '+positiveInteger(active.state.score).toLocaleString('fr-FR')+' points':'Bonus déclenché.';
    presentation?.play({events,before:before.state,from:before.from,to:before.to,valid});
  }
  async function move(from,to){
    if(busy||!active||active.state.status!=='playing'||pending)return;
    const state=active.state,w=state.width;
    if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to<0||from>=state.board.length||to>=state.board.length||Math.abs(from%w-to%w)+Math.abs(Math.floor(from/w)-Math.floor(to/w))!==1)return;
    stopEffects();selected=null;const before={state,from,to};
    if(mode==='training'){
      const result=applyMove(state,{from,to});active={...active,revision:active.revision+Number(result.valid),state:result.state};
      if(result.valid&&active.state.status==='won'){const performance=progressFor(active.state);trainingProgress=recordTrainingWin(trainingProgress,active.levelId,{stars:performance.stars,score:active.state.score});}
      if(result.valid)persistTraining();
      draw();presentMove(result.events,before,result.valid);return;
    }
    const data=await call('move',{sessionId:active.id,revision:active.revision,from,to,requestId:requestId()});
    if(data)presentMove(data.events||[],before,data.valid!==false);
  }
  function paintSelection(){root?.querySelectorAll('[data-mm-cell]')?.forEach(node=>{const chosen=Number(node.dataset.mmCell)===selected;node.classList.toggle('is-selected',chosen);node.setAttribute('aria-selected',String(chosen));node.tabIndex=Number(node.dataset.mmCell)===focusIndex?0:-1;});}
  function choose(index){if(busy||pending||!active||active.state.status!=='playing')return;stopEffects();focusIndex=index;if(selected===null){selected=index;paintSelection();return;}if(selected===index){selected=null;paintSelection();return;}const from=selected,w=active.state.width;if(Math.abs(from%w-index%w)+Math.abs(Math.floor(from/w)-Math.floor(index/w))===1)return move(from,index);else{selected=index;paintSelection();}}
  async function click(event){
    const tile=event.target.closest?.('[data-mm-cell]');if(tile){if(!gesture?.shouldSuppressClick(event))return choose(Number(tile.dataset.mmCell));return;}
    const button=event.target.closest?.('[data-mm-action]');if(!button)return;
    const action=button.dataset.mmAction;
    if(action==='exit'){onExit();return;}
    if(action==='training'){training();return;}
    if(action==='social'){
      if(busy||pending)return;gesture?.cancel('social');stopEffects();screen='social';
      root.innerHTML='<div data-mm-social-root></div>';await social.mount(root.querySelector('[data-mm-social-root]'));return;
    }
    if(action==='online'){
      if(busy||pending)return;if(mode==='training')persistTraining();active=null;screen='campaign';mode='loading';await refresh();return;
    }
    if(action==='level'){await start(Number(button.dataset.mmLevel));return;}
    if(action==='campaign'){screen='campaign';selected=null;draw();return;}
    if(action==='resume'){screen='play';draw();return;}
    if(action==='retry'||action==='next'){const id=active?.levelId||1;await start(action==='next'?id+1:id);return;}
    if(action==='refresh'){if(mode==='training'){error='';draw();}else await refresh();return;}
    if(action==='retry-request'){if(pending)await call(pending.route,pending.body,{retry:true});return;}
    if(action==='finish-effects'){stopEffects();return;}
    if(action==='help'){const box=root.querySelector('[data-mm-help]');if(box){box.hidden=!box.hidden;if(!box.hidden)box.scrollIntoView?.({block:'nearest',behavior:animationMode()==='off'?'auto':'smooth'});}return;}
    if(action==='abandon'){
      if(busy||!active)return;
      if(mode==='training'){active=null;screen='campaign';selected=null;persistTraining();draw();return;}
      const data=await call('abandon',{sessionId:active.id,revision:active.revision,requestId:requestId()});if(data){screen='campaign';draw();}
    }
  }
  function keydown(event){
    const tile=event.target.closest?.('[data-mm-cell]');if(!tile||!active)return;
    stopEffects();
    if(event.key==='Escape'){selected=null;paintSelection();return;}
    const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-active.state.width,ArrowDown:active.state.width};if(!Object.hasOwn(offsets,event.key))return;
    event.preventDefault();const from=Number(tile.dataset.mmCell),to=from+offsets[event.key],w=active.state.width;
    if(to<0||to>=active.state.board.length||Math.abs(from%w-to%w)+Math.abs(Math.floor(from/w)-Math.floor(to/w))!==1)return;
    const target=root.querySelector('[data-mm-cell="'+to+'"]');if(!target||target.disabled)return;
    if(selected!==null){const origin=selected;selected=null;move(origin,to);}else{focusIndex=to;paintSelection();target.focus();}
  }
  async function mount(element){
    unmount();root=element;mode='loading';screen='campaign';error='';selected=null;reward=null;active=null;progress=normalizeMatchProgress();trainingProgress=readTrainingProgress(storage(),getUser()?.id);trainingActive=readTrainingActive(storage(),getUser()?.id);
    try{const saved=storage()?.getItem('mashup-match-animation-v154');if(['auto','full','simple','off'].includes(saved))quality=saved;}catch{}
    listen(root,'click',click);listen(root,'keydown',keydown);listen(root,'focusin',event=>{const tile=event.target.closest?.('[data-mm-cell]');if(tile){focusIndex=Number(tile.dataset.mmCell);paintSelection();}});
    listen(root,'change',event=>{if(!event.target.matches?.('[data-mm-quality]'))return;quality=event.target.value;try{storage()?.setItem('mashup-match-animation-v154',quality);}catch{}stopEffects();});
    presentation=createMatchPresentation({root,renderSymbol:matchSymbolMarkup,getMotion:animationMode});
    gesture=createMatchGesture({root,getState:()=>active?.state,canInteract:()=>mounted()&&screen==='play'&&!busy&&!pending&&active?.state?.status==='playing',onStart:stopEffects,onCommit:move,getMotion:animationMode});
    listen(globalThis.window,'blur',stopEffects);listen(globalThis.window,'resize',stopEffects);listen(globalThis.window,'orientationchange',stopEffects);listen(globalThis.document,'visibilitychange',()=>{if(globalThis.document?.hidden)stopEffects();});
    const resume=()=>{if(mounted()&&screen!=='social'&&mode==='online'&&!busy&&!gesture?.isDragging()&&!pending&&!globalThis.document?.hidden)refresh();};listen(globalThis.window,'online',resume);listen(globalThis.document,'visibilitychange',resume);listen(globalThis.window,'pageshow',resume);
    poll=setInterval(()=>{if(active?.state.status==='playing')resume();},15000);draw();await refresh();
  }
  function collectAdminConfig(){
    const form=adminRoot?.querySelector('[data-mm-admin-form]');if(!form||!adminConfig)return null;
    const value=name=>form.querySelector('[name="'+name+'"]');
    const tiers=adminConfig.tiers.map((tier,index)=>({...tier,credits:Number(form.querySelector('[data-mm-tier="'+index+'"]')?.value)})),overrides=Object.create(null);
    for(const row of form.querySelectorAll('.mm-override')){const id=row.querySelector('[data-mm-override-id]')?.value,credits=row.querySelector('[data-mm-override-value]')?.value;if(Object.hasOwn(overrides,id))return {ok:false,error:'Un niveau ne peut avoir qu’un gain individuel.'};overrides[id]=Number(credits);}
    return validateMatchEconomy({enabled:!!value('enabled')?.checked,tiers,overrides,replay:{enabled:!!value('replayEnabled')?.checked,credits:Number(value('replayCredits')?.value),dailyCap:Number(value('dailyCap')?.value),perLevelCap:Number(value('perLevelCap')?.value)}});
  }
  function previewAdmin(){const result=collectAdminConfig(),box=adminRoot?.querySelector('[data-mm-economy-preview]');if(box&&result)box.innerHTML=result.ok?matchEconomyPreviewMarkup(result.config):'<p class="mm-error">'+escapeHTML(result.error)+'</p>';return result;}
  async function mountAdmin(element){
    if(getUser()?.role!=='admin')return;const token=++adminEpoch,who=actor();
    const box=document.createElement('section');box.className='panel mm-admin';box.innerHTML='<div class="eyebrow">ÉCONOMIE · MASHUP MATCH</div><h3>Les récompenses du multivers</h3><div data-mm-admin-content><p>Connexion aux réglages sécurisés…</p></div>';element.append(box);adminRoot=box;adminBusy=true;
    try{
      const data=await api('admin-config');if(token!==adminEpoch||who!==actor()||!box.isConnected||getUser()?.role!=='admin')return;
      const checked=validateMatchEconomy(data.config);if(!checked.ok)throw Error(checked.error);adminConfig=checked.config;adminRevision=data.revision;
      box.querySelector('[data-mm-admin-content]').innerHTML=adminFormMarkup(adminConfig,adminRevision);
      box.addEventListener('input',previewAdmin);
      box.addEventListener('click',event=>{const button=event.target.closest('[data-mm-admin]');if(!button)return;if(button.dataset.mmAdmin==='add-override'){box.querySelector('.mm-admin-overrides').insertAdjacentHTML('beforeend',overrideMarkup());box.querySelector('.mm-override:last-child input')?.focus();}else if(button.dataset.mmAdmin==='remove-override'){button.closest('.mm-override')?.remove();previewAdmin();}});
      box.addEventListener('submit',async event=>{
        if(!event.target.matches('[data-mm-admin-form]'))return;event.preventDefault();if(adminBusy||getUser()?.role!=='admin')return;
        const checked=previewAdmin(),message=box.querySelector('[data-mm-admin-error]');if(!checked?.ok){message.textContent=checked?.error||'Configuration invalide.';return;}
        adminBusy=true;const submit=box.querySelector('[type="submit"]');submit.disabled=true;message.textContent='Enregistrement sécurisé…';
        try{const saved=await api('admin-config',{config:checked.config,revision:adminRevision,requestId:requestId()});if(token!==adminEpoch||who!==actor()||!box.isConnected||getUser()?.role!=='admin')return;const valid=validateMatchEconomy(saved.config);if(!valid.ok)throw Error(valid.error);adminConfig=valid.config;adminRevision=saved.revision;box.querySelector('[data-mm-admin-content]').innerHTML=adminFormMarkup(adminConfig,adminRevision);toast('Économie Mashup Match enregistrée pour tous les joueurs.');}
        catch(problem){if(token===adminEpoch&&who===actor()&&box.isConnected){message.textContent=problem.message||'Enregistrement refusé.';submit.disabled=false;}}
        finally{if(token===adminEpoch)adminBusy=false;}
      });
    }catch(problem){if(token===adminEpoch&&who===actor()&&box.isConnected)box.querySelector('[data-mm-admin-content]').innerHTML='<p class="mm-server-note">Les réglages Mashup Match sont indisponibles. Aucun gain ni paramètre n’a été modifié.</p>';}
    finally{if(token===adminEpoch)adminBusy=false;}
  }
  return {mount,unmount,clearSession,mountAdmin,refresh,getActivity:()=>({busy:busy||adminBusy,active:active?.state?.status==='playing',reason:busy?'Un coup Mashup Match attend sa confirmation.':active?.state?.status==='playing'?'Une partie Mashup Match est en cours.':undefined})};
}
