import test from 'node:test';
import assert from 'node:assert/strict';
import {sealedPackMarkup,mountSealedPack} from '../../38-v14-booster.js';

function eventTarget(){
 const listeners=new Map();
 return {listeners,addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);if(!listeners.get(name)?.size)listeners.delete(name);},dispatch(name,event={}){for(const listener of [...(listeners.get(name)||[])])listener(event);}};
}
function packet({reduced=false,eco=false}={}){
 const view=Object.assign(eventTarget(),{PointerEvent:function(){},matchMedia:()=>({matches:reduced})});
 const doc=Object.assign(eventTarget(),{defaultView:view,hidden:false,documentElement:{dataset:{m13Quality:eco?'eco':'high'}}});
 const properties=new Map(),classes=new Set(),captures=new Set();
 const root=Object.assign(eventTarget(),{isConnected:true,ownerDocument:doc,
  classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x))},
  style:{setProperty:(k,v)=>properties.set(k,v),removeProperty:k=>properties.delete(k)}});
 const button={disabled:false,setAttribute(){},getBoundingClientRect:()=>({width:205}),setPointerCapture:id=>captures.add(id),releasePointerCapture(id){captures.delete(id);root.dispatch('lostpointercapture',{pointerId:id});}};
 root.contains=node=>node===button;
 function dispatch(type,{x=0,y=0,id=1,key=''}={}){root.dispatch(type,{target:{closest:()=>button},pointerId:id,clientX:x,clientY:y,button:0,isPrimary:true,cancelable:true,key,preventDefault(){}});}
 return {root,view,doc,button,dispatch,properties,classes,captures};
}

test('V15.6 : l’objet scellé possède dos, côtés, épaisseur et cartes génériques indépendantes du tirage',()=>{
 const pack={name:'<Série secrète>',count:5};
 for(const field of ['results','cards','rarity','variant','seed','guarantees'])Object.defineProperty(pack,field,{get(){throw Error('Prepared content read: '+field);}});
 const html=sealedPackMarkup(pack);
 for(const face of ['v156-seal-back','v156-seal-side-left','v156-seal-side-right','v156-seal-bottom-face'])assert.ok(html.includes(face),face);
 assert.match(html,/&lt;Série secrète&gt;/);assert.doesNotMatch(html,/<Série secrète>/);
 assert.match(html,/v156-seal-card-stack"><i><\/i><i><\/i><i><b>✦/);
 assert.equal((html.match(/data-v14-break-seal/g)||[]).length,1);
 assert.doesNotMatch(html,/data-action=|https?:|<img|result-new/);
 for(const [count,backs] of [[1,1],[2,2],[10,3]])assert.equal((sealedPackMarkup({name:'Même paquet',count}).split('v156-seal-card-stack')[1].split('</span>')[0].match(/<i>/g)||[]).length,backs);
});

for(const interruption of ['blur','resize','orientationchange','visibilitychange','lostpointercapture','Escape']){
 test('V15.6 : '+interruption+' annule la prévisualisation du sceau sans ouverture',context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const f=packet();let opens=0;const cleanup=mountSealedPack({root:f.root,onOpen:()=>opens++});
  f.dispatch('pointerdown');f.dispatch('pointermove',{x:65});assert.ok(f.classes.has('v154-is-tearing'));assert.equal(f.captures.size,1);
  if(interruption==='visibilitychange'){f.doc.hidden=true;f.doc.dispatch(interruption);}
  else if(interruption==='lostpointercapture')f.root.dispatch(interruption,{pointerId:1});
  else if(interruption==='Escape')f.dispatch('keydown',{key:'Escape'});
  else f.view.dispatch(interruption);
  assert.equal(f.captures.size,0);assert.equal(f.properties.size,0);assert.equal(f.classes.has('v154-is-tearing'),false);
  f.dispatch('pointerup',{x:65});f.dispatch('click');context.mock.timers.tick(1000);assert.equal(opens,0);assert.equal(f.button.disabled,false);
  cleanup();assert.equal(f.root.listeners.size,0);assert.equal(f.view.listeners.size,0);assert.equal(f.doc.listeners.size,0);
 });
}

test('V15.6 : accélérer la déchirure acceptée révèle une seule pile et enlève tous les écouteurs',context=>{
 context.mock.timers.enable({apis:['setTimeout']});
 const f=packet();let opens=0;const cleanup=mountSealedPack({root:f.root,onOpen:()=>opens++});
 cleanup.accelerate();assert.equal(opens,0);
 f.dispatch('pointerdown');f.dispatch('pointermove',{x:70});f.dispatch('pointerup',{x:70});
 assert.equal(opens,0);assert.equal(f.button.disabled,true);cleanup.accelerate();cleanup.accelerate();context.mock.timers.tick(1000);
 assert.equal(opens,1);assert.equal(f.root.listeners.size,0);assert.equal(f.view.listeners.size,0);assert.equal(f.doc.listeners.size,0);assert.equal(f.captures.size,0);
});

test('V15.6 : cinquante montages/démontages ne conservent aucun écouteur ni callback',context=>{
 context.mock.timers.enable({apis:['setTimeout']});
 const f=packet();let opens=0;
 for(let i=0;i<50;i++){
  f.button.disabled=false;
  const cleanup=mountSealedPack({root:f.root,onOpen:()=>opens++});
  f.dispatch('pointerdown');f.dispatch('pointermove',{x:25});
  cleanup();cleanup();
  assert.equal(f.root.listeners.size,0);assert.equal(f.view.listeners.size,0);assert.equal(f.doc.listeners.size,0);assert.equal(f.properties.size,0);assert.equal(f.captures.size,0);
 }
 context.mock.timers.tick(1000);assert.equal(opens,0);
});

test('V15.6 : les préférences économie/réduction et le mode rapide suppriment toute attente',context=>{
 context.mock.timers.enable({apis:['setTimeout']});
 for(const flags of [{eco:true},{reduced:true},{fast:true}]){
  const f=packet(flags);let opens=0;mountSealedPack({root:f.root,onOpen:()=>opens++,fast:!!flags.fast});
  f.dispatch('click');context.mock.timers.tick(0);assert.equal(opens,1);assert.equal(f.root.listeners.size,0);assert.equal(f.view.listeners.size,0);assert.equal(f.doc.listeners.size,0);
 }
});
