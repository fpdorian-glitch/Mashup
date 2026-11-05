import test from 'node:test';
import assert from 'node:assert/strict';
import {createMashupMatchUI} from '../../64-v15-4-match-ui.js';
import {createMatch,applyMove} from '../../62-v15-4-match-engine.js';
import {MATCH_LEVELS,getMatchLevel} from '../../63-v15-4-match-levels.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function rootElement(){
 const handlers=new Map();return {isConnected:true,innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(t,f)=>handlers.set(t,f),removeEventListener:(t,f)=>{if(handlers.get(t)===f)handlers.delete(t);},insertAdjacentHTML(_p,html){this.innerHTML=html+this.innerHTML;},
  action(action,level=1){const target={dataset:{mmAction:action,mmLevel:String(level)},closest:s=>s==='[data-mm-action]'?target:null};return handlers.get('click')?.({target});},
  cell(index){const target={dataset:{mmCell:String(index)},closest:s=>s==='[data-mm-cell]'?target:null};return handlers.get('click')?.({target});}
 };
}
const status=()=>({available:true,version:'15.4.0',progress:{unlocked:1,levels:{}},active:null,economy:{enabled:true,levelRewards:Object.fromEntries(MATCH_LEVELS.map(level=>[level.id,level.reward]))}});

test('A late confirmed move updates progress without forcing a return from the campaign to the board',async()=>{
 const root=rootElement(),active={id:'fiction-session',levelId:1,revision:0,state:createMatch(getMatchLevel(1))};let release,started;
 const gate=new Promise(resolve=>release=resolve),sent=new Promise(resolve=>started=resolve);
 const ui=createMashupMatchUI({getUser:()=>({id:'fiction-player'}),api:async(route)=>{if(route==='status')return status();if(route==='start')return {...status(),active};if(route==='move'){started();await gate;return {...status(),progress:{unlocked:2,levels:{1:{completed:true,stars:3}}},active:{...active,revision:1,state:applyMove(active.state,{from:18,to:19}).state}};}}});
 try{
  await ui.mount(root);
  await root.action('level');await root.cell(18);const pending=root.cell(19);await sent;
  await root.action('campaign');assert.match(root.innerHTML,/mm-campaign/);release();await pending;await flush();
  assert.match(root.innerHTML,/mm-campaign/);assert.doesNotMatch(root.innerHTML,/mm-play\"/);assert.match(root.innerHTML,/Niveau 2/);
 }finally{release();ui.clearSession();}
});

test('Checking online availability preserves the separate training save and never uploads its progression',async()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),values=new Map(),calls=[];let ready=false;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}});
 const root=rootElement(),ui=createMashupMatchUI({getUser:()=>({id:'fiction-player'}),api:async(route,body)=>{calls.push({route,body});return ready?status():{};}});
 try{
  await ui.mount(root);await root.action('training');await root.action('level',1);await root.cell(18);await root.cell(19);
  const training=[...values.values()].find(value=>value.includes('training-1'));assert.ok(training);assert.match(training,/"unlocked":2/);
  ready=true;await root.action('campaign');await root.action('online');assert.match(root.innerHTML,/data-mm-mode="online"/);
  assert.equal([...values.values()].includes(training),true);assert.equal(calls.length,2);assert.ok(calls.every(call=>call.route==='status'&&call.body===undefined));
 }finally{ui.clearSession();if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;}
});
