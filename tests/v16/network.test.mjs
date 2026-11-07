import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadCoordinator,readPolicy,StaleSessionRead} from '../../79-v16-network.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('Simultaneous reads share one request but never share mutable response objects',async()=>{
 const c=createReadCoordinator(),gate=deferred();let requests=0;
 const load=()=>{requests++;return gate.promise;},a=c.read({session:'A@1',path:'/api/pvp',load}),b=c.read({session:'A@1',path:'/api/pvp',load});
 gate.resolve({players:[{id:'fiction-player'}]});const [x,y]=await Promise.all([a,b]);assert.equal(requests,1);x.players[0].id='changed';assert.equal(y.players[0].id,'fiction-player');assert.equal(c.stats().coalesced,1);
});
test('Economic/game states and bootstraps are never reused as cached balances',async()=>{
 for(const path of ['/api/bootstrap','/api/pvp','/api/auth/me','games:status','games:match/status']){
  assert.equal(readPolicy(path),0);const c=createReadCoordinator();let i=0;
  const load=async()=>({credits:++i});assert.equal((await c.read({session:'A',path,load})).credits,1);assert.equal((await c.read({session:'A',path,load})).credits,2);assert.equal(c.stats().entries,0);
 }
});
test('Stable presentation cache expires, explicit refresh bypasses it and errors are not stored',async()=>{
 let clock=100,reads=0;const c=createReadCoordinator({now:()=>clock}),path='/api/market/listings',load=async()=>({listings:[++reads]});
 await c.read({session:'A',path,load});clock+=200;assert.deepEqual(await c.read({session:'A',path,load}),{listings:[1]});
 assert.deepEqual(await c.read({session:'A',path,load,fresh:true}),{listings:[2]});clock+=10001;await c.read({session:'A',path,load});assert.equal(reads,3);
 await assert.rejects(c.read({session:'A',path,load:async()=>{throw Error('offline');},fresh:true}),/offline/);await c.read({session:'A',path,load});assert.equal(reads,4);
});
test('A legacy full-wallet reply cannot enter a reusable presentation cache',async()=>{
 const c=createReadCoordinator();let reads=0;const load=async()=>({state:{coins:++reads},listings:[]});
 await c.read({session:'A',path:'/api/market/listings',load});await c.read({session:'A',path:'/api/market/listings',load});assert.equal(reads,2);assert.equal(c.stats().entries,0);
});
test('Account switches and reconnection of the same account invalidate every private cache',async()=>{
 const c=createReadCoordinator();let reads=0;const load=async()=>({posts:[++reads]});
 for(const session of ['A@1','B@2','A@3'])assert.equal((await c.read({session,path:'/api/dev-posts',load})).posts[0],reads);
 assert.equal(reads,3);c.clear();assert.equal(c.stats().entries,0);
});
test('A late response from a logged-out session is rejected rather than cached or replayed',async()=>{
 const c=createReadCoordinator(),gate=deferred(),old=c.read({session:'A@1',path:'/api/dev-posts',load:()=>gate.promise});
 await c.read({session:'B@2',path:'/api/dev-posts',load:async()=>({posts:['B']})});gate.resolve({posts:['A']});await assert.rejects(old,StaleSessionRead);
 assert.deepEqual(await c.read({session:'B@2',path:'/api/dev-posts',load:()=>{throw Error('must stay cached');}}),{posts:['B']});
});
test('A mutation invalidates cache and retries an older in-flight read once for fresh data',async()=>{
 const c=createReadCoordinator(),gate=deferred();let reads=0;
 const load=()=>++reads===1?gate.promise:Promise.resolve({listings:['new']});const pending=c.read({session:'A',path:'/api/market/listings',load});c.invalidate();gate.resolve({listings:['old']});assert.deepEqual(await pending,{listings:['new']});assert.equal(reads,2);
});
test('Cache is bounded by both entries and bytes and stores no data on disk',async()=>{
 const c=createReadCoordinator({maxEntries:2,maxBytes:120});
 for(const path of ['/api/dev-posts','/api/leaderboard','/api/achievements','/api/market/listings'])await c.read({session:'A',path,load:async()=>({items:['x'.repeat(35)]})});
 assert.ok(c.stats().entries<=2);assert.ok(c.stats().bytes<=120);c.clear();assert.equal(c.stats().bytes,0);
});

const {hasCompleteAccountState}=await import('../../79-v16-network.js');
test('Partial or malformed server states require the bootstrap fallback',()=>{
 const full={coins:20,dust:2,owned:{a:1},deck:['a'],deckDouble:[],favorites:[],opened:3,wins:1,losses:0,draws:0,streak:1,bestStreak:1,freePackUsed:true};
 assert.equal(hasCompleteAccountState(full),true);
 for(const value of [null,{coins:20},{...full,owned:[]},{...full,deckDouble:undefined},{...full,owned:{a:-1}},{...full,coins:NaN},{...full,streak:undefined}])assert.equal(hasCompleteAccountState(value),false);
});
