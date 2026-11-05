import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketUI} from '../../20-market-v10-9.js';

const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};};
function laboratory(){
 const saved=globalThis.document,host={innerHTML:'',dataset:{}},review={innerHTML:''};
 let html='',writes=0,epoch=0,view='market';
 const root={isConnected:true,addEventListener(){},removeEventListener(){},querySelectorAll(){return [];},querySelector:s=>s==='.v151-trade-collections'?host:s==='.v151-trade-review'?review:null};
 Object.defineProperty(root,'innerHTML',{get:()=>html,set:value=>{html=value;writes++;}});
 globalThis.document={getElementById:()=>root};
 const pending=new Map(),cards=[{id:'own',name:'Propre',qty:2,rarity:'rare'}];
 const ui=createMarketUI({api:async route=>route==='/api/trades'?{players:[],trades:[]}:pending.get(route).promise,
  esc:String,toast:()=>{},getOwnCards:()=>cards,getCurrentUser:()=>({id:'fiction'}),getSessionKey:()=>epoch,getView:()=>view,getMarketMode:()=> 'trades',renderCard:c=>'<span>'+c.name+'</span>'});
 return {ui,host,root,pending,get writes(){return writes;},logout:()=>{epoch++;ui.clearSession();},navigate:()=>{view='packs';ui.unmount();},restore:()=>{if(saved===undefined)delete globalThis.document;else globalThis.document=saved;}};
}
test('Le dernier partenaire choisi gagne même lorsque les réponses arrivent dans l’ordre inverse',async()=>{
 const lab=laboratory();try{
  lab.ui.mount();await Promise.resolve();await Promise.resolve();
  const first=deferred(),second=deferred();lab.pending.set('/api/trades/partner/a',first);lab.pending.set('/api/trades/partner/b',second);
  const a=lab.ui.selectPartner('a'),b=lab.ui.selectPartner('b');
  second.resolve({id:'b',pseudo:'Boréal',cards:[{id:'b-card',name:'Seulement B',qty:1}]});await b;
  assert.match(lab.host.innerHTML,/Seulement B/);
  first.resolve({id:'a',pseudo:'Aurore',cards:[{id:'a-card',name:'Seulement A',qty:1}]});await a;
  assert.match(lab.host.innerHTML,/Seulement B/);assert.doesNotMatch(lab.host.innerHTML,/Seulement A/);
 }finally{lab.restore();}
});
test('Une collection reçue après navigation ne réécrit pas la nouvelle page',async()=>{
 const lab=laboratory();try{
  lab.ui.mount();await Promise.resolve();await Promise.resolve();const gate=deferred();lab.pending.set('/api/trades/partner/a',gate);
  const request=lab.ui.selectPartner('a');lab.navigate();const before=lab.writes;
  gate.resolve({id:'a',cards:[{id:'late',name:'Late',qty:1}]});await request;assert.equal(lab.writes,before);
 }finally{lab.restore();}
});
test('Une reconnexion au même compte invalide également le brouillon de l’ancienne session',async()=>{
 const lab=laboratory();try{
  lab.ui.mount();await Promise.resolve();await Promise.resolve();const gate=deferred();lab.pending.set('/api/trades/partner/a',gate);
  const request=lab.ui.selectPartner('a');lab.logout();lab.ui.mount();await Promise.resolve();await Promise.resolve();const before=lab.writes;
  gate.resolve({id:'a',cards:[{id:'late',name:'Late',qty:1}]});await request;assert.equal(lab.writes,before);
  assert.doesNotMatch(lab.root.innerHTML,/Contre-offre/);
 }finally{lab.restore();}
});
