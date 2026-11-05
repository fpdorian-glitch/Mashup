import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {physicalMaterialFor,physicalLightingForTilt,inspectionObjectMarkup} from '../../46-v15-living-cards.js';
import {openingReviewStats,summaryMarkup,mountSealedPack} from '../../38-v14-booster.js';

function packet({reduced=false,eco=false}={}){
  const listeners=new Map(),properties=new Map(),classes=new Set(),captures=new Set();
  const button={disabled:false,setAttribute(){},getBoundingClientRect:()=>({width:205}),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id)};
  const root={isConnected:true,contains:node=>node===button,
    ownerDocument:{documentElement:{dataset:{m13Quality:eco?'eco':'high'}},defaultView:{PointerEvent:function(){},matchMedia:()=>({matches:reduced})}},
    classList:{add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name))},
    style:{setProperty:(key,value)=>properties.set(key,value),removeProperty:key=>properties.delete(key)},
    addEventListener:(name,listener)=>listeners.set(name,listener),removeEventListener:(name,listener)=>{if(listeners.get(name)===listener)listeners.delete(name);}};
  function event(name,{x=0,y=0,id=1,button:mouseButton=0,primary=true}={}){
    let prevented=false;
    listeners.get(name)?.({target:{closest:()=>button},pointerId:id,clientX:x,clientY:y,button:mouseButton,isPrimary:primary,cancelable:true,preventDefault(){prevented=true;}});
    return {prevented};
  }
  return {root,button,listeners,properties,classes,captures,event};
}

test('V15.4 : six substrats réels, poli progressif et finitions distinctes',()=>{
  const profiles=['common','rare','epic','legendary','mythic','ultra'].map(rarity=>physicalMaterialFor(rarity));
  assert.equal(new Set(profiles.map(profile=>profile.surface)).size,6);
  for(let i=1;i<profiles.length;i++){
    assert.ok(profiles[i].roughness<profiles[i-1].roughness);
    assert.ok(profiles[i].lobeWidth<profiles[i-1].lobeWidth);
    assert.ok(profiles[i].metallic>profiles[i-1].metallic);
  }
  assert.equal(physicalMaterialFor('mythic').surface,'obsidian');
  assert.equal(physicalMaterialFor('ultra').surface,'chrome');
  assert.equal(physicalMaterialFor('ultra','secret').surface,'emerald');
  assert.equal(physicalMaterialFor('rare','full_art').surface,'art-silk');
  assert.equal(physicalMaterialFor('rare','gold').surface,'etched-gold');
  assert.deepEqual(physicalMaterialFor('__proto__','<script>'),physicalMaterialFor());
  for(const profile of profiles){assert.ok(Object.isFrozen(profile));assert.ok(profile.roughness>0&&profile.roughness<1);}
});

test('V15.4 : le reflet spéculaire suit l’inclinaison et reste fini aux entrées invalides',()=>{
  const still=physicalLightingForTilt(),left=physicalLightingForTilt(8,-28),right=physicalLightingForTilt(8,28);
  assert.notEqual(left['--v154-light-x'],right['--v154-light-x']);
  assert.notEqual(still['--v154-light-y'],physicalLightingForTilt(25,0)['--v154-light-y']);
  assert.ok(Number(physicalLightingForTilt(35,50)['--v154-grazing'])>Number(still['--v154-grazing']));
  for(const x of [0,NaN,Infinity,-999,999])for(const y of [0,NaN,-Infinity,-999,999]){
    const light=physicalLightingForTilt(x,y);
    for(const key of ['--v154-light-x','--v154-light-y']){
      assert.match(light[key],/^\d+\.\d{3}%$/);
      assert.ok(parseFloat(light[key])>=8&&parseFloat(light[key])<=92);
    }
    assert.ok(Number(light['--v154-grazing'])>=.04&&Number(light['--v154-grazing'])<=.5);
  }
  assert.deepEqual(physicalLightingForTilt(1000,1000),physicalLightingForTilt(35,50));
});

test('V15.4 : une face autorisée reste unique et les matières ne se greffent jamais à un dos inconnu',()=>{
  const face='<div class="v14-card mythic">Illustration et statistiques existantes</div>';
  const result=inspectionObjectMarkup(face,{rarity:'mythic',variant:'gold'});
  assert.equal(result.split(face).length,2);
  assert.match(result,/data-v154-surface="etched-gold"/);
  const privateMaterial={get rarity(){throw Error('private rarity');},get variant(){throw Error('private variant');}};
  assert.equal(inspectionObjectMarkup('<div class="v14-card v14-unknown">Dos</div>',privateMaterial),'<div class="inspect-face inspect-front"><div class="v14-card v14-unknown">Dos</div></div>');
});

test('V15.4 : bilan fidèle, valeurs gelées et aucune réorganisation du tirage',()=>{
  const cards=[{id:'a',name:'Première',rarity:'common',isNew:true},{id:'b',name:'Deuxième',rarity:'ultra',variant:'secret',isNew:true},{id:'c',name:'Troisième',rarity:'legendary'},{id:'d',name:'Quatrième',rarity:'rare',variant:'gold'}];
  const before=structuredClone(cards),seen=[],review=openingReviewStats(cards);
  assert.deepEqual(review,{count:4,fresh:2,duplicates:2,exceptional:3,spotlight:1});assert.ok(Object.isFrozen(review));
  const html=summaryMarkup(cards,card=>{seen.push(card);return '<i>'+card.id+'</i>';});
  assert.deepEqual(seen,cards);assert.equal(seen[1],cards[1]);assert.deepEqual(cards,before);
  assert.ok(html.indexOf('<i>a</i>')<html.indexOf('<i>b</i>')&&html.indexOf('<i>b</i>')<html.indexOf('<i>c</i>'));
  assert.equal((html.match(/data-review-spotlight="true"/g)||[]).length,1);
  assert.match(html,/Bilan du tirage/);assert.match(html,/Confirme ci-dessous/);
  assert.doesNotMatch(html,/data-action="finish-opening"/);
});

test('V15.4 : une référence masquée ne divulgue aucun contenu dans le bilan',()=>{
  const hidden={hidden:true};
  for(const name of ['id','name','rarity','variant','isNew'])Object.defineProperty(hidden,name,{get(){throw Error('private '+name);}});
  assert.deepEqual(openingReviewStats([hidden]),{count:1,fresh:0,duplicates:0,exceptional:0,spotlight:-1});
  const html=summaryMarkup([hidden],()=>{throw Error('Hidden renderer called');});
  assert.match(html,/Carte indisponible/);assert.doesNotMatch(html,/data-reveal-tier/);
  for(const protectedCard of [{hidden:1},Object.create({hidden:true}),Object.create({get hidden(){throw Error('hidden getter');}})]){
    assert.match(summaryMarkup([protectedCard],()=>{throw Error('Protected renderer called');}),/Carte indisponible/);
  }
  assert.deepEqual(openingReviewStats(null),{count:0,fresh:0,duplicates:0,exceptional:0,spotlight:-1});
});

test('V15.4 : déchirer le sceau par glissement ouvre exactement une fois',context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const f=packet();let opened=0;
  mountSealedPack({root:f.root,onOpen:()=>opened++});
  f.event('pointerdown');assert.equal(f.event('pointermove',{x:65}).prevented,true);
  assert.ok(f.classes.has('v154-is-tearing'));assert.ok(Number(f.properties.get('--v154-tear-progress'))>.55);
  f.event('pointerup',{x:65});f.event('click');
  assert.equal(opened,0);assert.equal(f.button.disabled,true);assert.equal(f.captures.size,0);
  context.mock.timers.tick(309);assert.equal(opened,0);
  context.mock.timers.tick(1);assert.equal(opened,1);
  f.event('click');context.mock.timers.tick(2000);assert.equal(opened,1);assert.equal(f.listeners.size,0);
});

test('V15.4 : un glissement incomplet annule le geste et son clic synthétique',context=>{
  context.mock.timers.enable({apis:['setTimeout']});let now=1000;context.mock.method(Date,'now',()=>now);
  const f=packet();let opened=0;mountSealedPack({root:f.root,onOpen:()=>opened++});
  f.event('pointerdown');f.event('pointermove',{x:18});f.event('pointerup',{x:18});
  f.event('click');context.mock.timers.tick(1000);
  assert.equal(opened,0);assert.equal(f.button.disabled,false);assert.equal(f.properties.size,0);
  now+=500;f.event('click');context.mock.timers.tick(310);assert.equal(opened,1);
});

test('V15.4 : le défilement vertical, un autre doigt et l’annulation ne déclenchent pas une ouverture',context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  for(const direction of ['vertical','left','cancel']){
    const f=packet();let opened=0;const cleanup=mountSealedPack({root:f.root,onOpen:()=>opened++});
    f.event('pointerdown');f.event('pointermove',{x:100,id:2});assert.equal(f.properties.size,0);
    if(direction==='vertical'){assert.equal(f.event('pointermove',{x:2,y:45}).prevented,false);f.event('pointerup',{x:2,y:45});}
    if(direction==='left'){f.event('pointermove',{x:-80});f.event('pointerup',{x:-80});}
    if(direction==='cancel'){f.event('pointermove',{x:25});f.event('pointercancel');}
    f.event('click');context.mock.timers.tick(1000);assert.equal(opened,0);
    cleanup();assert.equal(f.listeners.size,0);assert.equal(f.captures.size,0);assert.equal(f.properties.size,0);
  }
});

test('V15.4 : un tap tactile, les modes rapides et le démontage gardent leurs protections',context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  for(const flags of [{reduced:true},{eco:true},{fast:true}]){
    const f=packet(flags);let opened=0;
    mountSealedPack({root:f.root,onOpen:()=>opened++,fast:flags.fast});
    f.event('pointerdown');f.event('pointerup');f.event('click');context.mock.timers.tick(0);assert.equal(opened,1);
  }
  const f=packet();let opened=0;const cleanup=mountSealedPack({root:f.root,onOpen:()=>opened++});
  f.event('pointerdown');f.event('pointermove',{x:30});cleanup();cleanup();f.event('pointerup',{x:90});context.mock.timers.tick(1000);
  assert.equal(opened,0);assert.equal(f.listeners.size,0);assert.equal(f.captures.size,0);
});

test('V15.4 : les couches matière restent bornées à l’illustration et désactivables',()=>{
  const material=fs.readFileSync(new URL('../../45-v15-living-cards.css',import.meta.url),'utf8');
  const booster=fs.readFileSync(new URL('../../47-v15-booster.css',import.meta.url),'utf8');
  assert.match(material,/transparent 87%/);assert.match(material,/data-m13-quality=eco/);
  assert.doesNotMatch(material,/@keyframes|filter:blur|will-change/);
  assert.match(booster,/touch-action:pan-y/);assert.match(booster,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(booster,/rotateY\(180deg\)|scaleX\(-1\)/);
});
