import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

test('Même compte reconnecté : une réponse de la session précédente est refusée',async()=>{
  const pending=deferred();
  const context=vm.createContext({onlineUser:{id:'fiction'},sessionEpoch:0,mashupAuth:{auth:{getSession:async()=>({data:{session:null}})}},fetch:()=>pending.promise});
  vm.runInContext(extract('async function api(path,data){','// V12: serialize'),context);
  const request=context.api('/api/bootstrap');await Promise.resolve();
  context.sessionEpoch++;context.onlineUser={id:'fiction'};
  pending.resolve({ok:true,json:async()=>({state:{coins:1000}})});
  await assert.rejects(request,/session a changé/);
});

test('Arène : un ancien poll ne bloque ni ne déverrouille le poll du nouveau compte',async()=>{
  const old=deferred(),fresh=deferred(),messages=[];let count=0;
  const context=vm.createContext({view:'arena',arenaSection:'online',onlineBusy:false,sessionEpoch:0,arenaNetwork:()=>{},api:()=>++count===1?old.promise:fresh.promise,toast:message=>messages.push(message)});
  vm.runInContext(extract('async function renderOnline(silent=false){','function updatePvpClock(){'),context);
  const first=context.renderOnline();assert.equal(context.onlineBusy,true);
  context.sessionEpoch++;context.onlineBusy=false;
  const second=context.renderOnline();assert.equal(count,2);
  old.reject(new Error('Ancienne session'));await first;
  assert.equal(context.onlineBusy,true);assert.deepEqual(messages,[]);
  fresh.reject(new Error('Réseau indisponible'));await second;
  assert.equal(context.onlineBusy,false);assert.deepEqual(messages,['Réseau indisponible']);
});

test('Préférences : un ancien échec ne modifie pas la file de sauvegarde du nouveau compte',async()=>{
  const old=deferred(),fresh=deferred();let count=0;
  const context=vm.createContext({onlineUser:{id:'fiction-a'},sessionEpoch:0,preferenceSaving:false,preferenceDirty:true,state:{deck:['old'],deckDouble:[],favorites:[]},api:()=>++count===1?old.promise:fresh.promise,toast:()=>assert.fail('Ancienne erreur affichée')});
  vm.runInContext(extract('async function flushPreferences(){',"window.addEventListener('online'"),context);
  const first=context.flushPreferences();
  context.sessionEpoch++;context.onlineUser={id:'fiction-b'};context.preferenceSaving=false;context.preferenceDirty=true;context.state={deck:['new'],deckDouble:[],favorites:[]};
  const second=context.flushPreferences();assert.equal(count,2);
  old.reject(new Error('Ancienne session'));await first;
  assert.equal(context.preferenceSaving,true);assert.equal(context.preferenceDirty,false);
  fresh.resolve({state:{deck:['new-saved'],deckDouble:[],favorites:[]}});await second;
  assert.equal(context.preferenceSaving,false);assert.deepEqual([...context.state.deck],['new-saved']);
});

test('Invitations : la fin d’un poll ancien ne déverrouille pas la nouvelle session',async()=>{
  const old=deferred(),fresh=deferred();let count=0;
  const context=vm.createContext({onlineUser:{id:'fiction'},sessionEpoch:0,invitationPollBusy:false,incomingChallenge:null,api:()=>++count===1?old.promise:fresh.promise,showInvitationBanner:()=>{}});
  vm.runInContext(extract('async function pollInvitations(){','async function answerInvitation(accept){'),context);
  const first=context.pollInvitations();context.sessionEpoch++;context.invitationPollBusy=false;
  const second=context.pollInvitations();old.reject(new Error('Ancienne session'));await first;
  assert.equal(context.invitationPollBusy,true);
  fresh.resolve({invitation:null});await second;assert.equal(context.invitationPollBusy,false);
});
