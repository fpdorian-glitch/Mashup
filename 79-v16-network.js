/* Session-only read coordination. Never persists accounts, catalogues or wallets.
 * Mutations and live economic/game status are always fetched from the server.
 */
export function readPolicy(path){
 if(path==='/api/dev-posts')return 90000;
 if(path==='/api/leaderboard')return 20000;
 if(path==='/api/achievements')return 15000;
 if(path==='/api/market/listings')return 10000;
 if(path==='/api/profile')return 15000;
 return 0;
}
const copy=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
export class StaleSessionRead extends Error {constructor(){super('La session a changé. Relance cette lecture.');this.name='StaleSessionRead';}}
export function createReadCoordinator({now=()=>Date.now(),maxEntries=24,maxBytes=750000}={}){
 const cache=new Map(),pending=new Map();let scope=null,generation=0,bytes=0;
 const stats={network:0,cacheHits:0,coalesced:0};
 function clear(){generation++;cache.clear();pending.clear();bytes=0;scope=null;}
 function invalidate(){generation++;cache.clear();pending.clear();bytes=0;}
 function remove(key){const item=cache.get(key);if(item){bytes-=item.bytes;cache.delete(key);}}
 async function read({session,path,load,fresh=false,retries=1}){
  if(typeof session!=='string'||!session||typeof load!=='function')throw new TypeError('Scoped read required');
  if(scope!==session){clear();scope=session;}
  const token=generation,key=path,ttl=readPolicy(path),saved=cache.get(key);
  if(!fresh&&ttl&&saved&&saved.expires>now()){stats.cacheHits++;cache.delete(key);cache.set(key,saved);return copy(saved.value);}
  if(saved)remove(key);
  const operationKey=token+':'+path;
  if(pending.has(operationKey)){stats.coalesced++;return copy(await pending.get(operationKey));}
  const operation=(async()=>{
   stats.network++;const result=await load();
   if(scope!==session)throw new StaleSessionRead();
   if(token!==generation){if(retries>0)return read({session,path,load,fresh:true,retries:retries-1});throw new StaleSessionRead();}
   // A legacy response containing a wallet is never stored as reusable data.
   if(ttl&&result&&typeof result==='object'&&!['state','credits','balance','coins','access_token'].some(k=>Object.hasOwn(result,k))){
    const size=new TextEncoder().encode(JSON.stringify(result)).byteLength;
    if(size<=maxBytes){while(cache.size>=maxEntries||bytes+size>maxBytes){const oldest=cache.keys().next().value;if(oldest===undefined)break;remove(oldest);}const value=copy(result);cache.set(key,{value,bytes:size,expires:now()+ttl});bytes+=size;}
   }
   return result;
  })();
  pending.set(operationKey,operation);
  try{return copy(await operation);}finally{if(pending.get(operationKey)===operation)pending.delete(operationKey);}
 }
 return Object.freeze({read,invalidate,clear,stats:()=>({...stats,entries:cache.size,bytes,pending:pending.size})});
}

// Fast paths require a complete authoritative account projection.
export function hasCompleteAccountState(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!value.owned||typeof value.owned!=='object'||Array.isArray(value.owned))return false;
 if(!['coins','dust','opened','wins','losses','draws','streak','bestStreak'].every(key=>Number.isSafeInteger(value[key])&&value[key]>=0)||typeof value.freePackUsed!=='boolean')return false;
 if(!['deck','deckDouble','favorites'].every(key=>Array.isArray(value[key])&&value[key].every(id=>typeof id==='string')))return false;
 return Object.values(value.owned).every(qty=>Number.isSafeInteger(qty)&&qty>=0);
}
