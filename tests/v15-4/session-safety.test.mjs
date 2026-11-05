import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
for(const [name,end,path,body] of [['api','// V12: serialize','/api/market/buy',{id:'fiction-listing'}],['gamesApi','const matchUI=','bet',{amount:100,side:0}]]){
 test(name+' : un changement de session pendant la lecture Auth interdit l’envoi de la transaction',async()=>{
  let authResolve,networkCalls=0,releases=0;
  const context=vm.createContext({onlineUser:{id:'fiction-old'},sessionEpoch:0,updateSafety:{begin:()=>()=>releases++},state:{coins:123},updateBalances(){},mashupAuth:{auth:{getSession:()=>new Promise(resolve=>authResolve=resolve)}},fetch:()=>{networkCalls++;throw Error('No request must be sent');}});
  const start=source.indexOf('async function '+name+'('),stop=source.indexOf(end,start);assert.ok(start>=0&&stop>start);vm.runInContext(source.slice(start,stop),context);
  const pending=context[name](path,body);context.sessionEpoch++;context.onlineUser={id:'fiction-new'};
  authResolve({data:{session:{access_token:'fiction-new-token'}}});await assert.rejects(pending,/session a changé/);
  assert.equal(networkCalls,0);assert.equal(releases,1);assert.equal(context.state.coins,123);
 });
}
test('Un gain Match ne remplace pas une collection ni des préférences de deck plus récentes',()=>{
 const owned={'fiction-card':2},deck=['local-unsaved-card'],state={coins:100,dust:70,owned,deck,favorites:['local-favorite']};let updates=0;
 const context=vm.createContext({state,updateBalances:()=>updates++});
 const start=source.indexOf('function applyMatchWallet('),end=source.indexOf('const matchUI=',start);assert.ok(start>=0&&end>start);vm.runInContext(source.slice(start,end),context);
 context.applyMatchWallet({coins:120,dust:0,owned:{},deck:['stale-server-deck'],favorites:[]});
 assert.equal(state.coins,120);assert.equal(state.dust,70);assert.equal(state.owned,owned);assert.equal(state.deck,deck);assert.deepEqual(state.favorites,['local-favorite']);assert.equal(updates,1);
 for(const coins of [NaN,-1,Infinity,'999'])context.applyMatchWallet({coins});assert.equal(state.coins,120);assert.equal(updates,1);
});
test('Un gain confirmé reste visible après avoir quitté la vue Match, sans réinstaller son écran',async()=>{
 const state={coins:100,deck:['local-deck']};let updates=0;
 const context=vm.createContext({onlineUser:{id:'fiction-A'},sessionEpoch:0,state,updateSafety:{begin:()=>()=>{}},updateBalances:()=>updates++,mashupAuth:{auth:{getSession:async()=>({data:{session:{access_token:'fiction'}}})}},fetch:async()=>({ok:true,json:async()=>({state:{coins:120,deck:['old-deck']},active:{}})})});
 const start=source.indexOf('async function gamesApi('),end=source.indexOf('const matchUI=',start);vm.runInContext(source.slice(start,end),context);
 await context.gamesApi('match/move',{sessionId:'fiction-session',revision:0,from:18,to:19,requestId:'fiction-request'});
 assert.equal(state.coins,120);assert.deepEqual(state.deck,['local-deck']);assert.equal(updates,1);
});
