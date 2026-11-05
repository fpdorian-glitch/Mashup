import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('Social reads cannot replace the wallet even when an old service returns a full game status',async()=>{
 const source=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 const from=source.indexOf('async function gamesApi('),to=source.indexOf('const matchUI=',from);assert.ok(from>=0&&to>from);
 const owned={'fiction-card':2},state={coins:100,dust:50,owned,deck:['local-deck']},requests=[];let balances=0;
 const context=vm.createContext({state,onlineUser:{id:'fiction-player'},sessionEpoch:1,updateSafety:{begin:()=>()=>{}},updateBalances:()=>balances++,mashupAuth:{auth:{getSession:async()=>({data:{session:{access_token:'fiction-only'}}})}},fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({credits:900,state:{coins:950,owned:{},dust:0,deck:[]},active:{type:'memory'}})};}});
 vm.runInContext(source.slice(from,to),context);
 for(const route of ['match/leaderboard','match/leaderboard/opaque-cursor','match/players/fiction-friend'])await context.gamesApi(route);
 assert.equal(requests.length,3);assert.ok(requests.every(request=>request.options.method==='GET'&&request.options.body===undefined));
 assert.equal(state.coins,100);assert.equal(state.dust,50);assert.equal(state.owned,owned);assert.deepEqual(state.deck,['local-deck']);assert.equal(balances,0);
});
