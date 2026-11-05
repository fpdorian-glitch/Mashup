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
