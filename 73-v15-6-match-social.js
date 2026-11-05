/* Match social reads. Only the dedicated server projection is accepted here.
 * This module never reads local training, wallets, card data or image URLs. */
import {MATCH_WORLDS} from './63-v15-4-match-levels.js';

export const MATCH_SOCIAL_PROTOCOL=1;
export const MATCH_SOCIAL_CACHE_MS=60000;
export const MATCH_SOCIAL_PAGE_SIZE=25;
const MAX_CACHE_ENTRIES=25,REFRESH_COOLDOWN_MS=10000;
const own=(record,key)=>Object.getOwnPropertyDescriptor(record,key)?.value;
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const idPattern=/^[a-zA-Z0-9_-]{1,100}$/;
const cursorPattern=/^[a-zA-Z0-9_-]{1,256}$/;
function record(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const prototype=Object.getPrototypeOf(value);
 if(prototype!==Object.prototype&&prototype!==null)return false;
 return Reflect.ownKeys(value).every(key=>typeof key==='string'&&keys.includes(key)&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'));
}
function summary(player,{detail=false}={}){
 const keys=['id','pseudo','highestLevel','currentWorld','totalStars','completedLevels',detail?'worlds':'rank'];
 if(!record(player,keys)||!idPattern.test(own(player,'id'))||typeof own(player,'pseudo')!=='string')return null;
 const pseudo=own(player,'pseudo');
 if(!pseudo.trim()||Array.from(pseudo).length>40||/[\u0000-\u001f\u007f]/.test(pseudo))return null;
 const highestLevel=own(player,'highestLevel'),currentWorld=own(player,'currentWorld'),totalStars=own(player,'totalStars'),completedLevels=own(player,'completedLevels');
 if(!integer(highestLevel,1,100)||!integer(currentWorld,1,10)||currentWorld!==Math.ceil(highestLevel/10)||!integer(totalStars,0,300)||!integer(completedLevels,0,100)||totalStars<completedLevels||totalStars>completedLevels*3||highestLevel!==Math.min(100,completedLevels+1))return null;
 const result={id:own(player,'id'),pseudo,highestLevel,currentWorld,totalStars,completedLevels};
 if(!detail){if(!integer(own(player,'rank'),1,1000000000))return null;result.rank=own(player,'rank');return result;}
 const worlds=own(player,'worlds');
 if(!Array.isArray(worlds)||worlds.length!==10)return null;
 result.worlds=[];
 for(let i=0;i<10;i++){
  const world=worlds[i];
  if(!record(world,['id','completed','stars'])||own(world,'id')!==i+1||!integer(own(world,'completed'),0,10)||!integer(own(world,'stars'),0,30)||own(world,'stars')<own(world,'completed')||own(world,'stars')>own(world,'completed')*3)return null;
  result.worlds.push({id:i+1,completed:own(world,'completed'),stars:own(world,'stars')});
 }
 if(result.worlds.reduce((sum,world)=>sum+world.completed,0)!==completedLevels||result.worlds.reduce((sum,world)=>sum+world.stars,0)!==totalStars)return null;
 return result;
}
function envelope(data,keys){
 return record(data,keys)&&own(data,'available')===true&&own(data,'protocol')===MATCH_SOCIAL_PROTOCOL&&integer(own(data,'generatedAt'),0,8640000000000000);
}
export function normalizeMatchLeaderboard(data){
 if(!envelope(data,['available','protocol','generatedAt','cacheTtlMs','players','nextCursor','total'])||own(data,'cacheTtlMs')!==MATCH_SOCIAL_CACHE_MS||!integer(own(data,'total'),0,1000000000))return null;
 const players=own(data,'players'),nextCursor=own(data,'nextCursor');
 if(!Array.isArray(players)||players.length>MATCH_SOCIAL_PAGE_SIZE||players.length>own(data,'total')||!(nextCursor===null||typeof nextCursor==='string'&&cursorPattern.test(nextCursor)))return null;
 const clean=players.map(player=>summary(player));
 if(clean.some(player=>!player||player.rank>own(data,'total'))||new Set(clean.map(player=>player.id)).size!==clean.length)return null;
 return {available:true,protocol:MATCH_SOCIAL_PROTOCOL,generatedAt:own(data,'generatedAt'),cacheTtlMs:MATCH_SOCIAL_CACHE_MS,players:clean,nextCursor,total:own(data,'total')};
}
export function normalizeMatchPlayer(data){
 if(!envelope(data,['available','protocol','generatedAt','cacheTtlMs','player'])||own(data,'cacheTtlMs')!==MATCH_SOCIAL_CACHE_MS)return null;
 const player=summary(own(data,'player'),{detail:true});
 return player?{available:true,protocol:MATCH_SOCIAL_PROTOCOL,generatedAt:own(data,'generatedAt'),cacheTtlMs:MATCH_SOCIAL_CACHE_MS,player}:null;
}

function initials(pseudo){return pseudo.trim().split(/\s+/).slice(0,2).map(word=>[...word][0]).join('').toUpperCase();}
function worldFor(id){return MATCH_WORLDS[id-1];}
function publicStamp(timestamp){
 try{return new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(timestamp));}catch{return '';}
}
function worldIcon(world){return '<span class="m156-social-world-icon" style="--ms-world:'+world.color+'" aria-hidden="true">'+escapeHTML(world.icon)+'</span>';}
function completionBadge(player){
 if(player.completedLevels===100)return '<span class="m156-social-badge is-crown">♛ Maître du multivers</span>';
 const finished=Math.floor(player.completedLevels/10);
 return finished?'<span class="m156-social-badge">✧ '+finished+' monde'+(finished>1?'s':'')+' terminé'+(finished>1?'s':'')+'</span>':'';
}
function playerRow(player,selfId){
 const world=worldFor(player.currentWorld),self=player.id===selfId;
 return '<li><button class="m156-social-player '+(self?'m156-social-self':'')+'" data-ms-player="'+escapeHTML(player.id)+'" aria-label="Voir la progression de '+escapeHTML(player.pseudo)+'"><span class="m156-social-rank '+(player.rank<=3?'is-podium':'')+'">'+player.rank+'</span><span class="m156-social-avatar" aria-hidden="true">'+escapeHTML(initials(player.pseudo))+'</span><span class="m156-social-identity"><strong>'+escapeHTML(player.pseudo)+(self?'<small>TOI</small>':'')+'</strong><span>Niveau '+player.highestLevel+' <em>/ 100</em> · Monde '+player.currentWorld+' <em>/ 10</em></span><span class="m156-social-track"><i style="width:'+player.completedLevels+'%"></i></span>'+completionBadge(player)+'</span><span class="m156-social-row-world">'+worldIcon(world)+'<small>'+escapeHTML(world.name)+'</small></span><span class="m156-social-stars"><b>✦ '+player.totalStars+'</b><small>'+player.completedLevels+' niveaux terminés</small></span><span class="m156-social-chevron" aria-hidden="true">↗</span></button></li>';
}
export function matchLeaderboardMarkup(data,{selfId='',page=0,busy=false,canRefresh=true}={}){
 return '<section class="m156-social-list"><div class="m156-social-intro"><span class="mm-kicker">LES VOYAGEURS DU MULTIVERS</span><h1>Chaque monde nous rapproche.</h1><p>Des parcours confirmés par le serveur. Découvre les mondes traversés par les autres joueurs.</p><div class="m156-social-overview"><span><b>'+data.total+'</b> joueur'+(data.total>1?'s':'')+'</span><span>100 niveaux <i>·</i> 300 étoiles</span></div></div><div class="m156-social-list-heading"><h2>Progression des joueurs</h2><button class="mm-quiet" data-ms-action="refresh" '+(busy||!canRefresh?'disabled':'')+'>↻ Actualiser</button></div>'+(data.players.length?'<ol class="m156-social-players">'+data.players.map(player=>playerRow(player,selfId)).join('')+'</ol>':'<div class="m156-social-empty"><span aria-hidden="true">✧</span><h3>Le premier voyage commence ici.</h3><p>Les premières progressions en ligne apparaîtront ici après leur validation.</p></div>')+'<div class="m156-social-pagination"><button class="mm-quiet" data-ms-action="previous" '+(busy||page===0?'disabled':'')+'>← Précédents</button><span>Page '+(page+1)+'</span><button class="mm-quiet" data-ms-action="next" '+(busy||!data.nextCursor?'disabled':'')+'>Suivants →</button></div><p class="m156-social-privacy">Progression en ligne uniquement · aucune carte, aucun solde ou donnée de compte partagé.<span>Actualisé à '+publicStamp(data.generatedAt)+'</span></p></section>';
}
export function matchPlayerProgressMarkup(data,{selfId=''}={}){
 const player=data.player;
 return '<section class="m156-social-detail"><button class="mm-quiet" data-ms-action="list">← Tous les joueurs</button><div class="m156-social-profile"><span class="m156-social-avatar is-large" aria-hidden="true">'+escapeHTML(initials(player.pseudo))+'</span><span class="mm-kicker">PARCOURS PUBLIC'+(player.id===selfId?' · TON VOYAGE':'')+'</span><h1>'+escapeHTML(player.pseudo)+'</h1>'+completionBadge(player)+'<div class="m156-social-profile-metrics"><span><b>'+player.highestLevel+'<small>/100</small></b>Niveau atteint</span><span><b>'+player.totalStars+'<small>/300</small></b>Étoiles réunies</span><span><b>'+player.completedLevels+'<small>/100</small></b>Niveaux terminés</span></div></div><h2>De monde en monde</h2><ol class="m156-social-worlds">'+player.worlds.map(progress=>{
  const world=worldFor(progress.id),complete=progress.completed===10,current=progress.id===player.currentWorld;
  return '<li class="'+(complete?'is-complete':current?'is-current':'')+'" style="--ms-world:'+world.color+'">'+worldIcon(world)+'<div><span class="mm-kicker">MONDE '+String(world.id).padStart(2,'0')+(complete?' · TRAVERSÉ':current?' · EN COURS':'')+'</span><h3>'+escapeHTML(world.name)+'</h3><span class="m156-social-track"><i style="width:'+progress.completed*10+'%"></i></span><p>'+progress.completed+' / 10 niveaux <b>✦ '+progress.stars+' / 30</b></p></div><span class="m156-social-world-finish" aria-label="'+(complete?'Monde terminé':'')+'">'+(complete?'✧':'')+'</span></li>';
 }).join('')+'</ol><p class="m156-social-privacy">Ces étoiles et ces niveaux ont été validés par le serveur. L’entraînement sur appareil ne figure jamais dans ce parcours.</p></section>';
}

/** The cache is transient, bounded and scoped to the current account + session.
 * No persistence, polling or request containing user-declared progress. */
export function createMatchSocial({api,getUser=()=>null,getSessionKey=()=>'',getView=()=>'games',onExit=()=>{},now=()=>Date.now()}={}){
 if(typeof api!=='function')throw new TypeError('A Match social API is required.');
 let root=null,epoch=0,sequence=0,busy=false,page=0,cursors=[''],listData=null,detailData=null,error='',screen='list',account='',lastManualRefresh=-Infinity,cooldownTimer=null;
 const cache=new Map(),pending=new Map();
 const actor=()=>String(getUser()?.id||'')+'@'+String(getSessionKey());
 const mounted=()=>!!root?.isConnected&&['games','match','social'].includes(getView());
 function clearCooldown(){if(cooldownTimer!==null){clearTimeout(cooldownTimer);cooldownTimer=null;}}
 function unmount(){epoch++;clearCooldown();root?.removeEventListener?.('click',click);root=null;busy=false;}
 function clearSession(){unmount();cache.clear();pending.clear();account='';page=0;cursors=[''];listData=null;detailData=null;error='';lastManualRefresh=-Infinity;}
 function syncActor(){const current=actor();if(current!==account){cache.clear();pending.clear();account=current;page=0;cursors=[''];listData=null;detailData=null;lastManualRefresh=-Infinity;}return current;}
 function header(){return '<header class="mm-header"><button class="mm-back" data-ms-action="exit">← <span>Campagne</span></button><span class="mm-brand">MASHUP<span>MATCH</span></span><span class="mm-status-pill">Joueurs</span></header>';}
 function draw(){
  if(!mounted())return;
  const canRefresh=now()-lastManualRefresh>=REFRESH_COOLDOWN_MS;
  root.innerHTML='<div class="mm-app m156-social" aria-busy="'+busy+'">'+header()+(error?'<div class="mm-network m156-social-error" role="alert"><span>'+escapeHTML(error)+'</span><button class="mm-quiet" data-ms-action="retry" '+(busy?'disabled':'')+'>Réessayer</button></div>':'')+(screen==='detail'&&detailData?matchPlayerProgressMarkup(detailData,{selfId:getUser()?.id}):listData?matchLeaderboardMarkup(listData,{selfId:getUser()?.id,page,busy,canRefresh}):busy?'<div class="m156-social-loading" role="status"><span aria-hidden="true">✦</span><p>Les voyageurs se rassemblent…</p></div>':'<section class="m156-social-unavailable"><span aria-hidden="true">◇</span><h1>Les voyageurs se retrouveront ici.</h1><p>Le classement Match en ligne n’est pas disponible pour le moment.</p><p>Seules les progressions validées par le serveur peuvent y apparaître. Ton entraînement reste conservé sur cet appareil.</p><button class="mm-primary" data-ms-action="retry">Réessayer le classement</button></section>')+'</div>';
 }
 async function read(route,{force=false,detail=false}={}){
  const who=syncActor(),key=who+'\u0000'+route,current=cache.get(key),at=now();
  if(!force&&current&&at-current.storedAt<MATCH_SOCIAL_CACHE_MS){cache.delete(key);cache.set(key,current);return current.data;}
  if(pending.has(key))return pending.get(key);
  const promise=Promise.resolve().then(()=>api(route)).then(output=>{
   const data=detail?normalizeMatchPlayer(output):normalizeMatchLeaderboard(output);
   if(!data)throw new Error('Le classement n’a pas renvoyé une progression publique compatible.');
   if(detail&&data.player.id!==route.slice('players/'.length))throw new Error('Le parcours reçu ne correspond pas au joueur choisi.');
   if(who===actor()&&who===account){cache.delete(key);cache.set(key,{storedAt:now(),data});while(cache.size>MAX_CACHE_ENTRIES)cache.delete(cache.keys().next().value);}
   return data;
  }).finally(()=>{if(pending.get(key)===promise)pending.delete(key);});
  pending.set(key,promise);return promise;
 }
 async function load({detailId=null,force=false}={}){
  if(busy||!mounted())return null;
  const who=syncActor();if(!getUser()?.id){error='Connecte-toi pour consulter les parcours en ligne.';draw();return null;}
  const token=epoch,order=++sequence,route=detailId?'players/'+detailId:'leaderboard'+(cursors[page]?'/'+cursors[page]:'');
  busy=true;error='';if(detailId)screen='detail';else screen='list';draw();
  try{
   const data=await read(route,{force,detail:!!detailId});
   if(token!==epoch||order!==sequence||who!==actor()||!mounted())return null;
   if(detailId)detailData=data;else listData=data;
   busy=false;draw();return data;
  }catch(problem){
   if(token!==epoch||order!==sequence||who!==actor()||!mounted())return null;
   busy=false;error=problem?.status===401?'Reconnecte-toi pour consulter les parcours en ligne.':problem?.status===404||problem?.status===503?'La lecture des progressions Match n’est pas encore disponible sur ce serveur.':'La progression n’a pas pu être actualisée. Réessaie dans un instant.';
   if(detailId){screen='list';detailData=null;}draw();return null;
  }
 }
 function scheduleRefreshLabel(){
  clearCooldown();const remaining=REFRESH_COOLDOWN_MS-(now()-lastManualRefresh);
  if(remaining>0)cooldownTimer=setTimeout(()=>{cooldownTimer=null;if(mounted())draw();},remaining+5);
 }
 async function click(event){
  const player=event.target.closest?.('[data-ms-player]');
  if(player){if(!busy&&idPattern.test(player.dataset.msPlayer)){detailData=null;await load({detailId:player.dataset.msPlayer});}return;}
  const button=event.target.closest?.('[data-ms-action]');if(!button)return;
  const action=button.dataset.msAction;
  if(action==='exit'){unmount();onExit();return;}
  if(action==='list'){if(busy)return;screen='list';detailData=null;draw();return;}
  if(busy)return;
  if(action==='next'&&listData?.nextCursor){
   const previous=page,token=epoch,who=actor();cursors[page+1]=listData.nextCursor;page++;const data=await load();
   if(!data&&token===epoch&&who===actor()&&mounted()){page=previous;draw();}return;
  }
  if(action==='previous'&&page>0){
   const previous=page,token=epoch,who=actor();page--;const data=await load();
   if(!data&&token===epoch&&who===actor()&&mounted()){page=previous;draw();}return;
  }
  if(action==='refresh'){
   if(now()-lastManualRefresh<REFRESH_COOLDOWN_MS)return;
   lastManualRefresh=now();await load({force:true});scheduleRefreshLabel();return;
  }
  if(action==='retry'){
   if(now()-lastManualRefresh<REFRESH_COOLDOWN_MS)return;
   lastManualRefresh=now();await load({force:true});scheduleRefreshLabel();
  }
 }
 async function mount(element){
  unmount();syncActor();root=element;screen='list';detailData=null;error='';root?.addEventListener?.('click',click);draw();await load();
 }
 return {mount,unmount,clearSession,getActivity:()=>({busy,active:false,reason:'Lecture des progressions publiques'}),refresh:()=>load({force:false})};
}
