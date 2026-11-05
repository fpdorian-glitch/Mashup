import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MATCH_SOCIAL_CACHE_MS,normalizeMatchLeaderboard,normalizeMatchPlayer,matchLeaderboardMarkup,matchPlayerProgressMarkup,createMatchSocial} from '../../73-v15-6-match-social.js';

const summary=(id='fiction-player',completedLevels=13,totalStars=25,rank=1)=>({id,pseudo:'Alex',rank,highestLevel:Math.min(100,completedLevels+1),currentWorld:Math.ceil(Math.min(100,completedLevels+1)/10),totalStars,completedLevels});
const list=(players=[summary()],nextCursor=null,total=players.length)=>({available:true,protocol:1,generatedAt:1793961000000,cacheTtlMs:60000,players,nextCursor,total});
const detail=(id='fiction-player')=>{
 const {rank,...player}=summary(id);return {available:true,protocol:1,generatedAt:1793961000000,cacheTtlMs:60000,player:{...player,worlds:Array.from({length:10},(_,i)=>({id:i+1,completed:i===0?10:i===1?3:0,stars:i===0?20:i===1?5:0}))}};
};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function root(){
 const handlers=new Map();return {isConnected:true,innerHTML:'',handlers,
  addEventListener(type,callback){handlers.set(type,callback);},removeEventListener(type,callback){if(handlers.get(type)===callback)handlers.delete(type);},
  async action(action){const target={dataset:{msAction:action},closest:selector=>selector==='[data-ms-action]'?target:null};await handlers.get('click')?.({target});await flush();},
  async player(id){const target={dataset:{msPlayer:id},closest:selector=>selector==='[data-ms-player]'?target:null};await handlers.get('click')?.({target});await flush();}
 };
}

function fixture(api,options={}){
 let user={id:'fiction-player'},session=1,time=0,view='games';
 const ui=createMatchSocial({api,getUser:()=>user,getSessionKey:()=>session,getView:()=>view,now:()=>time,...options});
 return {ui,user:value=>user=value,session:value=>session=value,time:value=>time=value,view:value=>view=value};
}

test('Social accepte uniquement la projection minimale versionnée et bornée',()=>{
 assert.equal(MATCH_SOCIAL_CACHE_MS,60000);
 assert.deepEqual(normalizeMatchLeaderboard(list()),list());
 assert.deepEqual(normalizeMatchPlayer(detail()),detail());
 for(const data of [{...detail(),cacheTtlMs:undefined},{...detail(),cacheTtlMs:0},{...detail(),cacheTtlMs:86400000}])assert.equal(normalizeMatchPlayer(data),null);
 for(const data of [{},null,{available:false}, {...list(),protocol:2}, {...list(),cacheTtlMs:86400000},{...list(),players:Array.from({length:26},(_,i)=>summary('id-'+i))},{...list(),nextCursor:'../private'},{...list(),nextCursor:'x'.repeat(257)},{...list(),total:-1},{...list(),players:[summary(),summary()]}])assert.equal(normalizeMatchLeaderboard(data),null);
});

test('Social refuse les champs privés sur enveloppe, joueur ou monde',()=>{
 for(const extra of ['email','credits','coins','inventory','progress','session','state','avatarUrl','artwork']){
  assert.equal(normalizeMatchLeaderboard({...list(),[extra]:'private'}),null);
  assert.equal(normalizeMatchLeaderboard(list([{...summary(),[extra]:'private'}])),null);
  const output=detail();output.player.worlds[0][extra]='private';assert.equal(normalizeMatchPlayer(output),null);
 }
 const getter=list();Object.defineProperty(getter.players[0],'email',{enumerable:true,get(){throw Error('Private getter must never execute');}});assert.equal(normalizeMatchLeaderboard(getter),null);
});

test('Totaux, bornes et détail des dix mondes sont cohérents',()=>{
 for(const extra of [{highestLevel:101},{highestLevel:99},{completedLevels:101},{currentWorld:8},{totalStars:301},{totalStars:1},{completedLevels:-1},{pseudo:' '},{pseudo:'A'.repeat(61)},{id:'../profile'},{rank:0},{rank:2}])assert.equal(normalizeMatchLeaderboard(list([{...summary(),...extra}])),null);
 for(const mutate of [data=>data.player.worlds.pop(),data=>data.player.worlds[0].stars=21,data=>data.player.worlds[0].id=2,data=>data.player.worlds[0].completed=11,data=>data.player.totalStars=0]){const data=detail();mutate(data);assert.equal(normalizeMatchPlayer(data),null);}
 const champion=summary('champion',100,300);assert.ok(normalizeMatchLeaderboard(list([champion])));
 assert.ok(normalizeMatchLeaderboard(list([{...summary(),pseudo:'🌟'.repeat(40)}])));
 assert.equal(normalizeMatchLeaderboard(list([{...summary(),pseudo:'🌟'.repeat(41)}])),null);
});

test('Markup échappe les pseudos, marque le compte et dessine les dix mondes sans images',()=>{
 const player={...summary(),pseudo:'<img src=x onerror=alert(1)>'};
 const markup=matchLeaderboardMarkup(list([player]),{selfId:player.id});
 assert.ok(markup.includes('&lt;img'));assert.ok(markup.includes('m156-social-self'));assert.ok(markup.includes('1 monde terminé'));assert.ok(!markup.includes('<img'));assert.ok(!markup.includes('src="'));
 const champion=matchLeaderboardMarkup(list([summary('champion',100,300)]));assert.ok(champion.includes('Maître du multivers'));
 const page=matchPlayerProgressMarkup(detail());assert.equal((page.match(/MONDE /g)||[]).length,10);assert.ok(page.includes('TRAVERSÉ'));assert.ok(page.includes('EN COURS'));assert.ok(page.includes('13<small>/100'));
});

test('Cache de 60 secondes réutilisé à la réouverture, sans polling ni mouvement',async()=>{
 const calls=[],f=fixture(async route=>{calls.push(route);return list();}),one=root(),two=root();
 try{
  await f.ui.mount(one);assert.deepEqual(calls,['leaderboard']);assert.match(one.innerHTML,/Alex/);
  f.ui.unmount();assert.equal(one.handlers.size,0);await f.ui.mount(two);assert.deepEqual(calls,['leaderboard']);
  f.time(59999);await f.ui.refresh();assert.equal(calls.length,1);
  f.time(60000);await f.ui.refresh();assert.equal(calls.length,2);
 }finally{f.ui.clearSession();}
});

test('Détail et pagination effectuent des lectures dédiées sans corps de progression',async()=>{
 const calls=[],f=fixture(async(...args)=>{calls.push(args);return args[0].startsWith('players/')?detail():args[0]==='leaderboard'?list([summary()],'fiction_cursor',2):list([summary('other',3,6,2)],null,2);}),element=root();
 try{
  await f.ui.mount(element);await element.player('fiction-player');assert.match(element.innerHTML,/m156-social-detail/);assert.match(element.innerHTML,/Jardins du seuil/);
  await element.action('list');assert.match(element.innerHTML,/m156-social-list/);
  await element.action('next');assert.match(element.innerHTML,/Page 2/);await element.action('previous');assert.match(element.innerHTML,/Page 1/);
  assert.deepEqual(calls,[['leaderboard'],['players/fiction-player'],['leaderboard/fiction_cursor']]);
 }finally{f.ui.clearSession();}
});

test('Rafraîchissements manuels ont un délai de dix secondes et un seul appel concurrent',async()=>{
 let calls=0,release;const f=fixture(async()=>{calls++;if(calls===2)return new Promise(resolve=>release=resolve);return list();}),element=root();
 try{
  await f.ui.mount(element);const first=element.action('refresh');await flush();assert.equal(calls,2);
  await element.action('refresh');await element.action('next');assert.equal(calls,2);release(list());await first;
  await element.action('refresh');assert.equal(calls,2);f.time(10000);await element.action('refresh');assert.equal(calls,3);
 }finally{f.ui.clearSession();}
});

test('Changement de compte et même compte reconnecté invalident les caches',async()=>{
 const calls=[],f=fixture(async route=>{calls.push(route);return list();}),element=root();
 try{
  await f.ui.mount(element);f.ui.unmount();f.session(2);await f.ui.mount(element);assert.equal(calls.length,2);
  f.ui.unmount();f.user({id:'other-player'});await f.ui.mount(element);assert.equal(calls.length,3);
  f.ui.clearSession();assert.equal(element.handlers.size,0);
 }finally{f.ui.clearSession();}
});

test('Une réponse tardive ne repeuple aucune autre vue ou session',async()=>{
 for(const change of ['unmount','account','session','view']){
  let release;const f=fixture(()=>new Promise(resolve=>release=resolve)),element=root();const mounting=f.ui.mount(element);await flush();const before=element.innerHTML;
  if(change==='unmount')f.ui.unmount();if(change==='account')f.user({id:'another'});if(change==='session')f.session(2);if(change==='view')f.view('collection');
  release(list());await mounting;assert.equal(element.innerHTML,before,change);f.ui.clearSession();
 }
});

test('Backend absent ou invalide : pas de classement fabriqué depuis l’entraînement',async()=>{
 for(const output of [{}, {progress:{unlocked:100,levels:{}},state:{coins:9999}}, {...list(),players:[{...summary(),email:'secret@example.invalid'}]}]){
  const f=fixture(async()=>output),element=root();try{await f.ui.mount(element);assert.match(element.innerHTML,/m156-social-unavailable/);assert.ok(!element.innerHTML.includes('secret@example.invalid'));assert.ok(!element.innerHTML.includes('m156-social-player'));}finally{f.ui.clearSession();}
 }
 const code=fs.readFileSync(new URL('../../73-v15-6-match-social.js',import.meta.url),'utf8');
 assert.ok(!code.includes('localStorage'));assert.ok(!code.includes('setInterval'));assert.ok(!code.includes('fetch('));
});

test('Le détail d’un autre identifiant ne peut être affiché à la place du joueur choisi',async()=>{
 const f=fixture(async route=>route==='leaderboard'?list():detail('another-player')),element=root();
 try{await f.ui.mount(element);await element.player('fiction-player');assert.ok(!element.innerHTML.includes('m156-social-detail'));assert.match(element.innerHTML,/m156-social-error/);}finally{f.ui.clearSession();}
});

test('Sortie et remontage nettoient les listeners sans perdre le cache en session',async()=>{
 let exits=0,calls=0;const f=fixture(async()=>{calls++;return list();},{onExit:()=>exits++}),element=root();
 try{
  for(let i=0;i<15;i++){await f.ui.mount(element);assert.equal(element.handlers.size,1);await element.action('exit');assert.equal(element.handlers.size,0);}
  assert.equal(exits,15);assert.equal(calls,1);assert.equal(f.ui.getActivity().busy,false);
 }finally{f.ui.clearSession();}
});


test('Échec de pagination : la page courante reste correctement identifiée',async()=>{
 const f=fixture(async route=>{if(route.includes('/'))throw Error('Network interrupted');return list([summary()],'cursor',2);}),element=root();
 try{await f.ui.mount(element);await element.action('next');assert.match(element.innerHTML,/Page 1/);assert.ok(!element.innerHTML.includes('Page 2'));assert.match(element.innerHTML,/m156-social-error/);}finally{f.ui.clearSession();}
});
