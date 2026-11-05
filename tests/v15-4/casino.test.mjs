import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {casinoTimestamp,formatCasinoCountdown,casinoClockState,createCasinoClock} from '../../66-v15-4-casino-clock.js';

const EPOCH=1_800_000_000_000;
const snapshot=(extra={})=>({now:EPOCH,enabled:true,league:{season:1,standings:[]},current:{id:'fiction-fight-1',closesAt:EPOCH+462000,mode:'simple',season:1,sides:[[],[]],odds:[1.8,1.8]},settings:{memory:20,daily:35},...extra});

test('Horloge : 07:42 provient du calendrier serveur, pas d’un nouveau timer de dix minutes',()=>{
 const value=casinoClockState(snapshot(),EPOCH);
 assert.equal(value.text,'07:42');assert.equal(value.remainingMs,462000);assert.equal(value.canBet,true);assert.equal(value.phase,'open');
 assert.equal(casinoClockState(snapshot(),EPOCH+42000).text,'07:00');
});
test('Horloge : deux appareils dont les heures locales divergent affichent le même compteur',()=>{
 let a=EPOCH-120000,b=EPOCH+4*3600000;
 const one=createCasinoClock({now:()=>a}),two=createCasinoClock({now:()=>b});
 one.observe(snapshot(),{sentAt:a,receivedAt:a});two.observe(snapshot(),{sentAt:b,receivedAt:b});
 assert.equal(one.read(snapshot()).text,'07:42');assert.equal(two.read(snapshot()).text,'07:42');
 a+=87000;b+=87000;assert.equal(one.read(snapshot()).text,'06:15');assert.equal(one.read(snapshot()).text,two.read(snapshot()).text);
});
test('Horloge : rechargement et reprise après veille recalculent depuis les dates absolues',()=>{
 let local=EPOCH;
 const before=createCasinoClock({now:()=>local});before.observe(snapshot());
 local+=210000;assert.equal(before.read(snapshot()).text,'04:12');assert.equal(before.read(snapshot()).stale,true);assert.equal(before.read(snapshot()).canBet,false);
 const after=createCasinoClock({now:()=>local});after.observe(snapshot({now:EPOCH+210000}));
 assert.equal(after.read(snapshot()).text,'04:12');assert.equal(after.read(snapshot()).stale,false);
});
test('Horloge : correction de latence bornée et nettoyage de session',()=>{
 let local=EPOCH+1000;
 const clock=createCasinoClock({now:()=>local});clock.observe(snapshot(),{sentAt:EPOCH+800,receivedAt:local});
 assert.equal(clock.now(),EPOCH+100);assert.equal(clock.read(snapshot()).text,'07:42');
 clock.clear();assert.equal(clock.now(),null);assert.equal(clock.read(snapshot()).text,'--:--');assert.equal(clock.read(snapshot()).canBet,false);
});
test('Horloge : dates invalides ou absentes ne deviennent jamais NaN ni un horaire inventé',()=>{
 for(const invalid of [null,undefined,'',true,{},NaN,Infinity,-1])assert.equal(casinoTimestamp(invalid),null);
 assert.equal(casinoTimestamp('2030-01-01T00:00:00.000Z'),Date.parse('2030-01-01T00:00:00Z'));
 assert.equal(casinoTimestamp(String(EPOCH)),EPOCH);assert.equal(formatCasinoCountdown(null),'--:--');assert.equal(formatCasinoCountdown(-100),'00:00');
 const clock=createCasinoClock({now:()=>EPOCH});assert.equal(clock.observe({}),false);assert.equal(clock.read(snapshot()).text,'--:--');
 assert.equal(casinoClockState(snapshot({current:null}),EPOCH).text,'--:--');assert.equal(casinoClockState(snapshot({current:{closesAt:'invalid'}}),EPOCH).phase,'waiting');
});
test('Horloge : seuil20 secondes, fermeture et absence de combat synthétique après échéance',()=>{
 const s=snapshot();assert.equal(casinoClockState(s,EPOCH+441999).urgent,false);
 const last=casinoClockState(s,EPOCH+442000);assert.equal(last.urgent,true);assert.equal(last.text,'00:20');assert.equal(last.phase,'closing');assert.equal(last.canBet,true);
 const end=casinoClockState(s,EPOCH+462000);assert.equal(end.text,'00:00');assert.equal(end.phase,'closed');assert.equal(end.canBet,false);
 const later=casinoClockState(s,EPOCH+2*3600000);assert.equal(later.text,'00:00');assert.equal(later.matchId,s.current.id);
});
test('Horloge : phases du serveur, désactivation et résultat nul conservent le prochain horaire',()=>{
 const s=snapshot();
 assert.equal(casinoClockState({...s,live:{id:'live',winner:null}},EPOCH).phase,'live');
 assert.equal(casinoClockState({...s,live:{id:'live',winner:0}},EPOCH).phase,'results');
 assert.equal(casinoClockState({...s,live:{id:'live',winner:null,status:'finished'}},EPOCH).phase,'results');
 assert.equal(casinoClockState({...s,enabled:false},EPOCH).canBet,false);
 assert.equal(casinoClockState({...s,current:{...s.current,bettingOpen:false}},EPOCH).canBet,false);
 assert.equal(casinoClockState({...s,bet:{amount:100}},EPOCH).canBet,false);
 assert.equal(casinoClockState({...s,current:{id:'next',startsAt:EPOCH+10000}},EPOCH).text,'00:10');
});
test('Horloge : la mise exige une observation récente ; le temps peut continuer hors réseau',()=>{
 let now=EPOCH;const clock=createCasinoClock({now:()=>now});clock.observe(snapshot());
 now+=30001;assert.equal(clock.read(snapshot()).canBet,false);assert.equal(clock.read(snapshot()).text,'07:12');
 clock.observe(snapshot({now}));assert.equal(clock.read(snapshot()).canBet,true);
});

function laboratory(api){
 let wall=EPOCH,user={id:'fiction-one',role:'player'},view='games',session=1,html='',renders=0,matchCalls=0;
 const nodes=new Map(),intervals=new Map(),timeouts=new Map(),events=new Map(),windowEvents=new Map(),calls=[],toasts=[];
 let serial=0,betNode=null,selectedSide={value:'0',checked:true};
 const add=(registry,type,fn)=>{if(!registry.has(type))registry.set(type,new Set());registry.get(type).add(fn);};
 const remove=(registry,type,fn)=>registry.get(type)?.delete(fn);
 const document={hidden:false,activeElement:null,
  addEventListener:(type,fn)=>add(events,type,fn),removeEventListener:(type,fn)=>remove(events,type,fn),
  getElementById:id=>nodes.get(id)||null,
  querySelector:selector=>selector==='[data-games="bet"]'?betNode:selector.includes('input[name="games-side"]')?selectedSide:null,
  querySelectorAll:()=>[],createElement:()=>({className:'',id:'',innerHTML:'',isConnected:true})};
 const root={isConnected:true,contains:target=>target.scope!=='foreign',appendChild(){}};
 Object.defineProperty(root,'innerHTML',{get:()=>html,set:value=>{
  html=value;renders++;nodes.clear();betNode=null;document.activeElement=null;
  for(const [id,pattern] of [['games-clock',/id="games-clock"[^>]*>([^<]*)/],['games-casino-phase',/id="games-casino-phase"[^>]*>([^<]*)/],['games-casino-sync',/id="games-casino-sync"[^>]*>([^<]*)/]]){
   const match=value.match(pattern);if(match)nodes.set(id,{textContent:match[1]});
  }
  if(value.includes('id="games-casino-clock-panel"'))nodes.set('games-casino-clock-panel',{dataset:{}});
  if(value.includes('id="games-casino-alert"'))nodes.set('games-casino-alert',{hidden:true});
  if(value.includes('id="games-amount"')){const node={id:'games-amount',value:'100',focus(){document.activeElement=node;}};nodes.set('games-amount',node);}
  const button=value.match(/<button[^>]*data-games="bet"([^>]*)>/);if(button)betNode={disabled:/\bdisabled\b/.test(button[1])};
 }});
 class LabDate extends Date{static now(){return wall;}}
 const ctx=vm.createContext({Date:LabDate,Number,String,Math,Set,JSON,console,document,
  window:{addEventListener:(type,fn)=>add(windowEvents,type,fn),removeEventListener:(type,fn)=>remove(windowEvents,type,fn)},
  setInterval:fn=>{const id=++serial;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),
  setTimeout:fn=>{const id=++serial;timeouts.set(id,fn);return id;},clearTimeout:id=>timeouts.delete(id),confirm:()=>true});
 const clockSource=fs.readFileSync(new URL('../../66-v15-4-casino-clock.js',import.meta.url),'utf8').replace(/^export /gm,'');
 const uiSource=fs.readFileSync(new URL('../../04-games-ui.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace('export function createGamesUI','function createGamesUI');
 vm.runInContext(clockSource+'\n'+uiSource,ctx);
 const invoke=async(route,body)=>{calls.push({route,body:body===undefined?undefined:JSON.parse(JSON.stringify(body))});return api?api(route,body,{now:wall}):snapshot({now:wall});};
 const ui=ctx.createGamesUI({api:invoke,toast:(message,error)=>toasts.push({message,error}),getUser:()=>user,getView:()=>view,getSessionKey:()=>session,showArena:()=>{view='arena';},showMatch:()=>{matchCalls++;}});
 const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 const emit=async(registry,type,event={})=>{for(const fn of registry.get(type)||[])await fn(event);await settle();};
 return {ui,root,nodes,document,calls,toasts,intervals,timeouts,events,windowEvents,
  get html(){return html;},get renders(){return renders;},get matchCalls(){return matchCalls;},get betButton(){return betNode;},
  setNow:value=>{wall=value;},setUser:value=>{user=value;},setSession:value=>{session=value;},setView:value=>{view=value;},
  click:async(action,extra={})=>{const target={scope:'games',dataset:{games:action,...extra},closest:selector=>selector==='[data-games]'?target:action==='save-admin'?{}:null};await emit(events,'click',{target});},
  tick:async()=>{for(const fn of [...intervals.values()])fn();await settle();},
  wake:async(type='visibilitychange')=>emit(type==='visibilitychange'?events:windowEvents,type),settle};
}

test('Casino UI : compteur initial avant les onglets et le live, y compris sans ligue',async()=>{
 const s=snapshot({league:null,current:null});const lab=laboratory(()=>s);await lab.ui.mount(lab.root);await lab.click('casino');
 assert.match(lab.html,/PROCHAIN COMBAT IA/);assert.match(lab.html,/id="games-clock"[^>]*>--:--/);assert.ok(lab.html.indexOf('games-casino-clock-panel')<lab.html.indexOf('games-tabs'));
 assert.doesNotMatch(lab.html,/NaN/);assert.equal(lab.calls.some(c=>c.route!=='status'),false);lab.ui.destroy();
});
test('Casino UI : compteur rempli dès le rendu, modes simple/double et aucun nouvel horaire local',async()=>{
 const s=snapshot({live:{id:'older',sides:[[],[]],revealedRounds:[]},current:{...snapshot().current,mode:'double'}});const lab=laboratory((route,body,{now})=>({...s,now}));
 await lab.ui.mount(lab.root);await lab.click('casino');
 assert.equal(lab.nodes.get('games-clock').textContent,'07:42');assert.match(lab.html,/DUEL DOUBLE/);
 assert.ok(lab.html.indexOf('games-casino-clock-panel')<lab.html.indexOf('games-live'));
 lab.setNow(EPOCH+500000);await lab.tick();assert.equal(lab.nodes.get('games-clock').textContent,'00:00');assert.equal(lab.calls.some(c=>c.route!=='status'),false);lab.ui.destroy();
});
test('Casino UI : poll identique met à jour l’horloge sans reconstruire le formulaire',async()=>{
 const lab=laboratory((route,body,{now})=>snapshot({now}));await lab.ui.mount(lab.root);await lab.click('casino');
 const input=lab.nodes.get('games-amount');input.value='450';input.focus();const renders=lab.renders;
 lab.setNow(EPOCH+15000);await lab.tick();assert.equal(lab.renders,renders);assert.equal(lab.nodes.get('games-amount'),input);assert.equal(lab.document.activeElement,input);assert.equal(lab.nodes.get('games-clock').textContent,'07:27');lab.ui.destroy();
});
test('Casino UI : un changement de snapshot conserve la mise saisie et son focus',async()=>{
 let season=1;const lab=laboratory((route,body,{now})=>snapshot({now,league:{season,standings:[]}}));await lab.ui.mount(lab.root);await lab.click('casino');
 lab.nodes.get('games-amount').value='625';lab.nodes.get('games-amount').focus();season=2;
 await lab.click('refresh');assert.equal(lab.nodes.get('games-amount').value,'625');assert.equal(lab.document.activeElement,lab.nodes.get('games-amount'));lab.ui.destroy();
});
test('Casino UI : fermeture et horloge périmée empêchent tout POST de pari',async()=>{
 const lab=laboratory((route,body,{now})=>snapshot({now}));await lab.ui.mount(lab.root);await lab.click('casino');
 lab.setNow(EPOCH+462001);await lab.click('bet');assert.equal(lab.calls.some(c=>c.route==='bet'),false);assert.equal(lab.betButton.disabled,true);
 assert.ok(lab.toasts.some(t=>t.message.includes('confirmation récente')));lab.ui.destroy();
});
test('Casino UI : un pari valide garde le contrat et attend le débit confirmé côté serveur',async()=>{
 let bet=null;const lab=laboratory((route,body,{now})=>{if(route==='bet'){assert.equal(body.amount,100);assert.equal(body.side,0);bet={amount:100,side:0,odds:1.8};}return snapshot({now,bet,credits:bet?2350:2450});});
 await lab.ui.mount(lab.root);await lab.click('casino');await lab.click('bet');
 assert.deepEqual(lab.calls.filter(c=>c.route==='bet'),[{route:'bet',body:{amount:100,side:0}}]);assert.match(lab.html,/Pari enregistré/);assert.match(lab.html,/100 crédits prélevés/);lab.ui.destroy();
});
test('Casino UI : alerte20 secondes unique, même pendant un changement de page',async()=>{
 const lab=laboratory((route,body,{now})=>snapshot({now,bet:{amount:100,side:0,odds:1.8}}));await lab.ui.mount(lab.root);await lab.click('casino');
 lab.ui.unmount();lab.setView('collection');assert.equal(lab.intervals.size,1);
 lab.setNow(EPOCH+442000);await lab.tick();await lab.tick();
 assert.equal(lab.toasts.filter(t=>t.message.includes('20 secondes')).length,1);assert.equal(lab.calls.some(c=>c.route!=='status'),false);
 lab.ui.clearSession();assert.equal(lab.intervals.size,0);lab.setNow(EPOCH+450000);await lab.tick();assert.equal(lab.toasts.length,1);lab.ui.destroy();
});
test('Casino UI : reprise de veille et retour réseau resynchronisent par GET status',async()=>{
 const lab=laboratory((route,body,{now})=>snapshot({now}));await lab.ui.mount(lab.root);await lab.click('casino');
 lab.document.hidden=true;lab.setNow(EPOCH+120000);await lab.wake();const before=lab.calls.length;
 lab.document.hidden=false;await lab.wake();assert.equal(lab.calls.length,before+1);assert.equal(lab.nodes.get('games-clock').textContent,'05:42');
 await lab.wake('online');assert.equal(lab.calls.length,before+2);assert.equal(lab.calls.some(c=>c.route!=='status'),false);lab.ui.destroy();
});
test('Casino UI : panne réseau conserve le calendrier et bloque une mise non confirmée',async()=>{
 let fail=false;const lab=laboratory((route,body,{now})=>{if(fail)throw Error('Fictional offline');return snapshot({now});});
 await lab.ui.mount(lab.root);await lab.click('casino');fail=true;lab.setNow(EPOCH+15000);await lab.tick();
 assert.equal(lab.nodes.get('games-clock').textContent,'07:27');assert.match(lab.nodes.get('games-casino-sync').textContent,/Connexion interrompue/);assert.equal(lab.betButton.disabled,true);
 fail=false;await lab.wake('online');assert.equal(lab.betButton.disabled,false);lab.ui.destroy();
});
test('Casino UI : réponse tardive après navigation ne remplace pas une autre page',async()=>{
 let resolve;const lab=laboratory(()=>new Promise(r=>{resolve=r;}));const pending=lab.ui.mount(lab.root);
 lab.ui.unmount();lab.setView('collection');lab.root.innerHTML='OTHER_PAGE';resolve(snapshot());await pending;
 assert.equal(lab.root.innerHTML,'OTHER_PAGE');assert.equal(lab.intervals.size,0);lab.ui.destroy();
});
test('Casino UI : même compte reconnecté ne reçoit ni ancien snapshot ni ancienne erreur',async()=>{
 let reject,resolve,count=0;
 const lab=laboratory(()=>new Promise((yes,no)=>{if(count++===0)reject=no;else resolve=yes;}));
 const old=lab.ui.mount(lab.root);assert.equal(lab.ui.getActivity().busy,true);lab.ui.clearSession();lab.setSession(2);
 const current=lab.ui.mount(lab.root);reject(Error('Old session failure'));await old;assert.equal(lab.ui.getActivity().busy,true);assert.equal(lab.toasts.length,0);
 resolve(snapshot({league:{season:22}}));await current;assert.match(lab.html,/SAISON 22/);assert.equal(lab.ui.getActivity().busy,false);lab.ui.destroy();
});
test('Casino UI : activité Memory et nettoyage des timers/listeners sont explicites',async()=>{
 const lab=laboratory(()=>snapshot({active:{id:'memory-fixture',type:'memory',done:false,revealUntil:EPOCH+2000,tiles:[],pairs:0,mistakes:0,first:null}}));
 await lab.ui.mount(lab.root);await lab.click('mini');assert.equal(lab.ui.getActivity().active,true);assert.equal(lab.timeouts.size,1);
 lab.ui.unmount();assert.equal(lab.timeouts.size,0);assert.equal(lab.intervals.size,0);lab.ui.destroy();
 assert.equal(lab.events.get('click').size,0);assert.equal(lab.events.get('visibilitychange').size,0);assert.equal(lab.windowEvents.get('online').size,0);
});
test('Casino UI : Mashup Match s’ouvre depuis le hub sans appel économique supplémentaire',async()=>{
 const lab=laboratory();await lab.ui.mount(lab.root);assert.match(lab.html,/Mashup Match/);assert.match(lab.html,/100 niveaux/);
 const count=lab.calls.length;await lab.click('match');assert.equal(lab.matchCalls,1);assert.equal(lab.calls.length,count);lab.ui.destroy();
});
