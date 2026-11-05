import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMatch,applyMove,legalMoves} from '../../62-v15-4-match-engine.js';
import {MATCH_LEVELS,MATCH_WORLDS,MATCH_DEFAULT_REWARDS,getMatchLevel} from '../../63-v15-4-match-levels.js';
import {matchSymbolMarkup,normalizeMatchProgress,trainingStorageKey,readTrainingProgress,readTrainingActive,recordTrainingWin,matchAnimationQuality,validateMatchSnapshot,validateMatchServiceStatus,matchCampaignMarkup,matchBoardMarkup,validateMatchEconomy,matchEconomyPreviewMarkup,createMashupMatchUI} from '../../64-v15-4-match-ui.js';

const active=(levelId=1)=>({id:'fiction-session',revision:0,levelId,state:createMatch(getMatchLevel(levelId))});
const rewards=()=>Object.fromEntries(MATCH_LEVELS.map(level=>[level.id,level.reward]));
const status=()=>({available:true,version:'15.4.0',progress:{unlocked:1,levels:{}},active:null,economy:{enabled:true,levelRewards:rewards(),replay:{enabled:false,credits:0,dailyCap:0,perLevelCap:0}}});
const economy=()=>({enabled:true,tiers:MATCH_DEFAULT_REWARDS.map((credits,index)=>({from:index*10+1,to:index*10+10,credits})),overrides:{},replay:{enabled:false,credits:0,dailyCap:0,perLevelCap:0}});
const memoryStorage=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function element(){
 const handlers=new Map();
 return {isConnected:true,innerHTML:'',handlers,
  addEventListener(type,fn){handlers.set(type,fn);},removeEventListener(type,fn){if(handlers.get(type)===fn)handlers.delete(type);},
  querySelector:()=>null,querySelectorAll:()=>[],insertAdjacentHTML(_where,markup){this.innerHTML=markup+this.innerHTML;},
  async action(action,level){const target={dataset:{mmAction:action,mmLevel:String(level)},closest:selector=>selector==='[data-mm-action]'?target:null};await handlers.get('click')?.({target});await flush();},
  async cell(index){const target={dataset:{mmCell:String(index)},closest:selector=>selector==='[data-mm-cell]'?target:null};await handlers.get('click')?.({target});await flush();}
 };
}
async function globals(fn){
 const previous={localStorage:Object.getOwnPropertyDescriptor(globalThis,'localStorage'),matchMedia:Object.getOwnPropertyDescriptor(globalThis,'matchMedia')};
 const localStorage=memoryStorage();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:localStorage});Object.defineProperty(globalThis,'matchMedia',{configurable:true,value:()=>({matches:true})});
 try{return await fn(localStorage);}finally{for(const [name,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
}

test('Six original symbol SVGs remain distinct, bounded and non-injectable',()=>{
 const symbols=Array.from({length:6},(_,kind)=>matchSymbolMarkup(kind));assert.equal(new Set(symbols).size,6);
 for(const html of symbols){assert.match(html,/<svg viewBox="0 0 40 40"/);assert.doesNotMatch(html,/<img|https:|script/);}
 assert.doesNotMatch(matchSymbolMarkup(0,'<script>'),/script/);assert.match(matchSymbolMarkup(0,'nova'),/mm-special-nova/);
});

test('Progress projection is bounded, ignores inherited levels, and never writes player data',()=>{
 const levels=Object.create({'2':{stars:3,completed:true}});levels[1]={stars:12,bestScore:500,completed:true,rewardClaimed:true};levels[1000]={stars:3};
 const source={unlocked:999,levels},p=normalizeMatchProgress(source);
 assert.equal(p.unlocked,101);assert.equal(p.levels[1].stars,3);assert.equal(p.levels[1].bestScore,500);assert.equal(p.levels[2],undefined);assert.equal(p.levels[1000],undefined);assert.equal(source.levels[1].stars,12);
});

test('Training storage and best-performance updates are isolated by account, with no credit fields',()=>{
 const storage=memoryStorage(),source=normalizeMatchProgress(),won=recordTrainingWin(source,1,{stars:3,score:2200});
 storage.setItem(trainingStorageKey('fiction-A'),JSON.stringify({version:1,progress:won}));
 assert.equal(readTrainingProgress(storage,'fiction-A').unlocked,2);assert.equal(readTrainingProgress(storage,'fiction-B').unlocked,1);assert.equal(source.unlocked,1);
 const replay=recordTrainingWin(won,1,{stars:1,score:1000});assert.equal(replay.levels[1].stars,3);assert.equal(replay.levels[1].bestScore,2200);assert.equal(replay.levels[1].rewardClaimed,false);
 assert.doesNotMatch(JSON.stringify(replay),/coins|credits|reward:|owned/);assert.equal(trainingStorageKey(''),null);
});

test('Corrupted, old or inaccessible device storage falls back to a clean training campaign',()=>{
 for(const value of ['{broken','{"version":2,"progress":{"unlocked":100}}','null']){const storage={getItem:()=>value};assert.equal(readTrainingProgress(storage,'A').unlocked,1);assert.equal(readTrainingActive(storage,'A'),null);}
 assert.equal(readTrainingProgress({getItem(){throw Error('unavailable');}},'A').unlocked,1);
});

test('Only an explicit V15.4 Match capability can enter the online campaign',()=>{
 assert.equal(validateMatchServiceStatus(status()),true);
 for(const reply of [{},{now:42,active:{type:'memory'},state:{coins:9000}},{...status(),version:'15.3.1'},{...status(),available:false},{...status(),progress:{unlocked:999,levels:{}}},{...status(),active:undefined}])assert.equal(validateMatchServiceStatus(reply),false);
 const bad=status();delete bad.economy.levelRewards[99];assert.equal(validateMatchServiceStatus(bad),false);
});

test('A malformed or unbounded board is rejected before rendering',()=>{
 const a=active();assert.equal(validateMatchSnapshot(a),true);
 for(const change of [value=>value.state.width=999,value=>value.state.board.push(null),value=>value.state.goals.collect=null,value=>value.state.rng=0,value=>value.levelId=2,value=>value.state.obstacles[0]=-1,value=>value.state.board[0].kind=42,value=>value.state.mask[0]='true']){const bad=structuredClone(a);change(bad);assert.equal(validateMatchSnapshot(bad),false);assert.match(matchBoardMarkup(bad),/Plateau indisponible/);}
});

test('Campaign has exactly 100 level actions and ten original worlds, with server locks and rewards',()=>{
 const html=matchCampaignMarkup({progress:{unlocked:2,levels:{1:{stars:3,bestScore:1980,completed:true,rewardClaimed:true}}},rewards:rewards()});
 assert.equal((html.match(/class="mm-world /g)||[]).length,10);assert.equal((html.match(/class="mm-level /g)||[]).length,100);assert.equal((html.match(/class="mm-level is-locked/g)||[]).length,98);
 assert.match(html,/✓ Obtenue/);assert.match(html,/\+20 crédits/);assert.match(html,/Niveau 2/);
 for(const world of MATCH_WORLDS)assert.ok(html.includes(world.name));
});

test('Training campaign explicitly separates device progression from online rewards',()=>{
 const html=matchCampaignMarkup({training:true,rewards:rewards()});assert.match(html,/ENTRAÎNEMENT · AUCUN CRÉDIT/);assert.match(html,/sur cet appareil pour ton compte/);assert.doesNotMatch(html,/\+20 crédits|Première victoire/);
});
test('Disabled server rewards never advertise credits on unclaimed campaign levels',()=>globals(async()=>{
 const root=element(),reply=status();reply.economy.enabled=false;
 const ui=createMashupMatchUI({api:async()=>reply,getUser:()=>({id:'fiction-A'})});
 try{await ui.mount(root);assert.match(root.innerHTML,/Récompenses temporairement désactivées/);assert.equal((root.innerHTML.match(/Gains suspendus/g)||[]).length,100);assert.doesNotMatch(root.innerHTML,/\+20 crédits/);}finally{ui.clearSession();}
}));

test('A shaped board retains one keyboard entry point and locks sealed cells',()=>{
 const level=MATCH_LEVELS.find(value=>value.mask[0]===false),a=active(level.id),html=matchBoardMarkup(a);
 assert.equal((html.match(/tabindex="0"/g)||[]).length,1);assert.match(html,/role="grid"/);assert.match(html,/aria-rowcount=/);assert.match(html,/mm-hole/);
 const sealed=active(21),sealIndex=sealed.state.obstacles.findIndex(Boolean);assert.ok(sealIndex>=0);
 const button=matchBoardMarkup(sealed).match(new RegExp('<button[^>]+data-mm-cell="'+sealIndex+'"[^>]*>'))?.[0];assert.ok(button?.includes('disabled'));assert.ok(button?.includes('sceau'));
});

test('Exceptional symbols, goals, remaining moves and end states have accessible renderings',()=>{
 const a=active();a.state.board[0].special='prism';assert.match(matchBoardMarkup(a),/prisme chromatique/);
 a.state=applyMove(a.state,{from:18,to:19}).state;
 // The canonical first-level witness is checked in the engine campaign suite.
 assert.equal(a.state.status,'won');const html=matchBoardMarkup(a,{training:true});assert.match(html,/Le multivers s’éveille/);assert.match(html,/Aucun crédit/);assert.match(html,/data-mm-action="next"/);
 const lost=active();lost.state.status='lost';lost.state.movesLeft=0;assert.match(matchBoardMarkup(lost),/Une autre voie t’attend/);assert.match(matchBoardMarkup(lost),/data-mm-action="retry"/);
});

test('Animation quality respects reduced motion and Android resource limits',()=>{
 assert.equal(matchAnimationQuality('full',{reduced:true}),'off');assert.equal(matchAnimationQuality('auto',{cores:4}),'simple');assert.equal(matchAnimationQuality('full',{eco:true}),'simple');assert.equal(matchAnimationQuality('auto',{saveData:true}),'simple');assert.equal(matchAnimationQuality('off'),'off');assert.equal(matchAnimationQuality('full',{cores:8}),'full');
 const css=fs.readFileSync(new URL('../../65-v15-4-match.css',import.meta.url),'utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/touch-action:none/);assert.doesNotMatch(css,/infinite|rotateY|perspective/);
});

test('Economy preview covers 100 configurable rewards and checks private-service bounds',()=>{
 const config=economy();config.tiers[0].credits=23;config.overrides[2]=73;config.replay={enabled:true,credits:3,dailyCap:6,perLevelCap:3};
 const result=validateMatchEconomy(config);assert.equal(result.ok,true);assert.equal(result.rewards[0],23);assert.equal(result.rewards[1],73);assert.equal(result.config.replay.dailyCap,6);
 const html=matchEconomyPreviewMarkup(config);assert.equal((html.match(/<li>/g)||[]).length,100);assert.match(html,/Niveau 2/);assert.match(html,/73 crédits/);
 for(const mutate of [value=>value.tiers[0].credits=5001,value=>value.overrides[101]=10,value=>value.tiers[1].from=10,value=>value.tiers.pop(),value=>value.replay.credits=5001,value=>value.replay.dailyCap=50001,value=>value.replay.perLevelCap=-1]){const bad=structuredClone(config);mutate(bad);assert.equal(validateMatchEconomy(bad).ok,false);}
 config.enabled=false;assert.ok(validateMatchEconomy(config).rewards.every(value=>value===0));
});

test('Legacy Memory fallback does not apply its wallet or pretend the Match backend exists',()=>globals(async()=>{
 const root=element(),wallets=[],ui=createMashupMatchUI({api:async()=>({now:123,active:{type:'memory'},state:{coins:9000}}),getUser:()=>({id:'fiction-A'}),onState:value=>wallets.push(value)});
 try{await ui.mount(root);assert.match(root.innerHTML,/campagne en ligne est momentanément indisponible/);assert.match(root.innerHTML,/Commencer l’entraînement/);assert.deepEqual(wallets,[]);assert.equal(ui.getActivity().busy,false);}finally{ui.clearSession();assert.equal(root.handlers.size,0);}
}));

test('Training plays a real winning move, saves per account and never invokes credit APIs',()=>globals(async storage=>{
 const root=element(),calls=[],wallets=[],user={id:'fiction-A'},ui=createMashupMatchUI({api:async(route)=>{calls.push(route);throw Error('Offline');},getUser:()=>user,onState:value=>wallets.push(value)});
 try{
  await ui.mount(root);await root.action('training');await root.action('level',1);assert.match(root.innerHTML,/NIVEAU 1/);assert.equal(ui.getActivity().active,true);
  await root.cell(18);await root.cell(19);assert.match(root.innerHTML,/Le multivers s’éveille/);assert.equal(ui.getActivity().active,false);
  assert.equal(readTrainingProgress(storage,'fiction-A').unlocked,2);assert.equal(readTrainingProgress(storage,'fiction-A').levels[1].stars,3);assert.equal(readTrainingActive(storage,'fiction-A').state.status,'won');assert.equal(readTrainingProgress(storage,'fiction-B').unlocked,1);assert.deepEqual(calls,['status']);assert.deepEqual(wallets,[]);
  ui.unmount();await ui.mount(root);await root.action('training');assert.match(root.innerHTML,/Le multivers s’éveille/);
 }finally{ui.clearSession();}
}));

test('Invalid training swap neither spends moves nor creates an account reward',()=>globals(async storage=>{
 const root=element(),ui=createMashupMatchUI({api:async()=>{throw Error('Offline');},getUser:()=>({id:'fiction-A'})});
 try{await ui.mount(root);await root.action('training');await root.action('level',1);const before=readTrainingActive(storage,'fiction-A');let invalid;
  const valid=legalMoves(before.state);for(let from=0;from<before.state.board.length&&!invalid;from++){const to=from+1;if(to%before.state.width===0)continue;if(!valid.some(move=>move.from===from&&move.to===to)&&to<before.state.board.length)invalid={from,to};}
  assert.ok(invalid);await root.cell(invalid.from);await root.cell(invalid.to);const after=readTrainingActive(storage,'fiction-A');assert.deepEqual(after,before);assert.equal(readTrainingProgress(storage,'fiction-A').levels[1],undefined);
 }finally{ui.clearSession();}
}));

test('A failed authoritative move retries the identical operation and accepts only confirmed wallet state',()=>globals(async()=>{
 let session=active(),attempt=0;const root=element(),calls=[],wallets=[];
 const ui=createMashupMatchUI({getUser:()=>({id:'fiction-A'}),api:async(route,body)=>{
  calls.push({route,body:structuredClone(body)});
  if(route==='status')return {...status(),state:{coins:1000,dust:5}};
  if(route==='start')return {active:session};
  if(route==='move'){if(!attempt++)throw Error('Response lost');const next=applyMove(session.state,{from:body.from,to:body.to});session={...session,revision:1,state:next.state};return {active:session,events:next.events,progress:{unlocked:2,levels:{1:{completed:true,stars:3,bestScore:1980,rewardClaimed:true}}},state:{coins:1020,dust:5},reward:{granted:true,credits:20}};}
 },onState:value=>wallets.push(value)});
 try{await ui.mount(root);await root.action('level',1);await root.cell(18);await root.cell(19);assert.match(root.innerHTML,/Response lost/);assert.deepEqual(wallets.map(value=>value.coins),[1000]);assert.equal(ui.getActivity().active,true);
  await root.action('retry-request');const moves=calls.filter(call=>call.route==='move');assert.equal(moves.length,2);assert.deepEqual(moves[0].body,moves[1].body);assert.deepEqual(wallets.map(value=>value.coins),[1000,1020]);assert.equal(ui.getActivity().active,false);assert.match(root.innerHTML,/Le multivers s’éveille/);
 }finally{ui.clearSession();}
}));

test('Account change and unmount discard late status replies without leaking a wallet or board',()=>globals(async()=>{
 const root=element(),wallets=[];let resolve,user={id:'fiction-A'};
 const ui=createMashupMatchUI({api:()=>new Promise(done=>{resolve=done;}),getUser:()=>user,onState:value=>wallets.push(value)});
 const mounting=ui.mount(root);assert.equal(ui.getActivity().busy,true);ui.clearSession();user={id:'fiction-B'};resolve({...status(),active:active(),state:{coins:9000}});await mounting;
 assert.deepEqual(wallets,[]);assert.equal(ui.getActivity().busy,false);assert.equal(ui.getActivity().active,false);assert.equal(root.handlers.size,0);
}));

test('Non-administrators do not fetch or render the Match economy editor',async()=>{
 let calls=0;const ui=createMashupMatchUI({api:async()=>{calls++;},getUser:()=>({id:'fiction-player',role:'player'})});await ui.mountAdmin({});assert.equal(calls,0);ui.clearSession();
});

test('A resumed result uses its own confirmed reward rather than an older operation receipt',()=>globals(async()=>{
 const root=element(),won=active();won.state={...won.state,status:'won',score:1980,stars:3,movesUsed:1};won.reward={credits:73,granted:true,reason:'first-win'};
 const ui=createMashupMatchUI({api:async()=>({...status(),active:won,reward:{credits:20,granted:true,reason:'first-win'}}),getUser:()=>({id:'fiction-A'})});
 try{await ui.mount(root);await root.action('resume');assert.match(root.innerHTML,/\+73 crédits confirmés/);assert.doesNotMatch(root.innerHTML,/\+20 crédits confirmés/);}finally{ui.clearSession();}
}));

test('Replay reward reasons are presented as player information, never internal error codes',()=>globals(async()=>{
 for(const reason of ['replay-disabled','replay-cap','disabled']){
  const root=element(),won=active();won.state={...won.state,status:'won',score:1980,stars:3,movesUsed:1};won.reward={credits:0,granted:false,reason};
  const ui=createMashupMatchUI({api:async()=>({...status(),active:won}),getUser:()=>({id:'fiction-A'})});
  try{await ui.mount(root);await root.action('resume');assert.doesNotMatch(root.innerHTML,new RegExp('>'+reason+'<'));assert.match(root.innerHTML,/progression enregistrée|étoiles et record/i);}finally{ui.clearSession();}
 }
}));
