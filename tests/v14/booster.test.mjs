import test from 'node:test';
import assert from 'node:assert/strict';
import {sealedPackMarkup,summaryMarkup,mountSealedPack} from '../../38-v14-booster.js';
import {createBoosterRevealFX} from '../../12-booster-reveal.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const classList=()=>{
  const values=new Set();
  return {add:(...items)=>items.forEach(item=>values.add(item)),remove:(...items)=>items.forEach(item=>values.delete(item)),contains:item=>values.has(item),toggle:(item,active)=>active?values.add(item):values.delete(item)};
};
function fakeRoot({reduced=false,eco=false}={}){
  const listeners=new Map();
  const button={disabled:false,attributes:{},setAttribute(name,value){this.attributes[name]=value;}};
  const root={classList:classList(),isConnected:true,ownerDocument:{documentElement:{dataset:{m13Quality:eco?'eco':'high'}},defaultView:{matchMedia:()=>({matches:reduced})}},contains:node=>node===button,addEventListener:(name,listener)=>listeners.set(name,listener),removeEventListener:(name,listener)=>{if(listeners.get(name)===listener)listeners.delete(name);}};
  return {root,button,click:()=>listeners.get('click')?.({target:{closest:()=>button}}),outside:()=>listeners.get('click')?.({target:{closest:()=>({})}})};
}
function withGlobals(values,callback){
  const previous=Object.fromEntries(Object.keys(values).map(key=>[key,{present:Object.hasOwn(globalThis,key),value:globalThis[key]}]));
  Object.assign(globalThis,values);
  try{return callback();}finally{for(const [key,item] of Object.entries(previous)){if(item.present)globalThis[key]=item.value;else delete globalThis[key];}}
}

test('Paquet scellé : nom échappé, activation native et nombre réel de cartes',()=>{
  const html=sealedPackMarkup({name:'<img src=x onerror=alert(1)>',count:5},esc);
  assert.match(html,/type="button" data-v14-break-seal/);
  assert.match(html,/aria-describedby="v14-seal-hint"/);
  assert.match(html,/5 cartes/);
  assert.match(html,/&lt;img/);
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('data-action="open-pack"'));
  assert.match(sealedPackMarkup({count:1}),/1 carte</);
});

test('Paquet vide ou compte invalide : aucune probabilité ni fausse quantité',()=>{
  for(const count of [NaN,-1,0,1.5,Infinity,'<script>']){
    const html=sealedPackMarkup({count});
    assert.match(html,/Cartes à découvrir/);
    assert.ok(!html.includes('NaN'));
    assert.ok(!html.includes('<script>'));
  }
});

test('Résumé : ordre du serveur, références inchangées et confirmation obligatoire',()=>{
  const cards=[{id:'fiction-c',name:'<script>Éclipse</script>',rarity:'ultra',variant:'secret',isNew:true},{id:'fiction-a',name:'Aube',rarity:'common',isNew:false},{id:'fiction-b',name:'Nuit',rarity:'mythic',isNew:true}];
  const before=structuredClone(cards),seen=[];
  const html=summaryMarkup(cards,(card,options)=>{seen.push(card);assert.equal(options.revealedOpponent,true);return `<div data-fiction-card="${card.id}"></div>`;},esc);
  assert.deepEqual(seen,cards);
  assert.equal(seen[0],cards[0]);
  assert.deepEqual(cards,before);
  assert.ok(html.indexOf('fiction-c')<html.indexOf('fiction-a')&&html.indexOf('fiction-a')<html.indexOf('fiction-b'));
  assert.match(html,/3 cartes dévoilées · 2 nouvelles/);
  assert.match(html,/Ultra secrète/);
  assert.match(html,/Confirme ci-dessous pour ajouter ces cartes/);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('data-action="finish-opening"'));
});

test('Résumé vide : présentation sûre sans tirer de nouvelle carte',()=>{
  assert.match(summaryMarkup(null),/Aucune carte à afficher/);
  assert.match(summaryMarkup([]),/Confirme ci-dessous/);
});

test('Scellé : un tap délégué, une seule ouverture après une déchirure courte',context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const fixture=fakeRoot();
  let opened=0;
  mountSealedPack({root:fixture.root,onOpen:()=>opened++});
  fixture.outside();
  assert.equal(opened,0);
  assert.equal(fixture.button.disabled,false);
  fixture.click();fixture.click();
  assert.equal(fixture.button.disabled,true);
  assert.equal(fixture.root.classList.contains('v14-is-opening'),true);
  context.mock.timers.tick(309);assert.equal(opened,0);
  context.mock.timers.tick(1);assert.equal(opened,1);
  fixture.click();context.mock.timers.tick(2000);assert.equal(opened,1);
  assert.equal(fixture.root.classList.contains('v14-is-opening'),false);
});

test('Scellé : rapide, économie et réduction des animations suppriment l’attente',context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  for(const flags of [{fast:true},{eco:true},{reduced:true}]){
    const fixture=fakeRoot(flags);let opened=0;
    let fast=flags.fast||false;
    mountSealedPack({root:fixture.root,onOpen:()=>opened++,fast:()=>fast});
    fixture.click();context.mock.timers.tick(0);assert.equal(opened,1);
  }
  const fixture=fakeRoot();let fast=false,opened=0;
  mountSealedPack({root:fixture.root,onOpen:()=>opened++,fast:()=>fast});
  fast=true;fixture.click();context.mock.timers.tick(0);assert.equal(opened,1);
});

test('Scellé : démonter annule le minuteur ; aucun callback vers une modale retirée',context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const first=fakeRoot();let opened=0;
  const cleanup=mountSealedPack({root:first.root,onOpen:()=>opened++});
  first.click();cleanup();cleanup();context.mock.timers.tick(1000);
  assert.equal(opened,0);
  const second=fakeRoot();
  mountSealedPack({root:second.root,onOpen:()=>opened++});
  second.click();second.root.isConnected=false;context.mock.timers.tick(1000);
  assert.equal(opened,0);
  assert.equal(typeof mountSealedPack({root:null}),'function');
});

test('Prélude : identité de chaque rareté avant le flip, sans révéler le libellé',()=>{
  const badge={textContent:''};
  const shell={classList:classList(),style:{setProperty(){}},querySelector:()=>badge};
  withGlobals({window:{matchMedia:()=>({matches:false})},document:{documentElement:{dataset:{}},querySelector:()=>shell},localStorage:{getItem:()=>null}},()=>{
    const fx=createBoosterRevealFX();
    const cards=[{rarity:'legendary'},{rarity:'mythic'},{rarity:'ultra'},{rarity:'epic',variant:'secret'},{rarity:'ultra',variant:'secret'}];
    const durations=cards.map(card=>fx.preludeMs(card));
    assert.equal(new Set(durations).size,5);
    for(const card of cards){
      assert.ok(fx.preludeMs(card)>0&&fx.preludeMs(card)<=300);
      fx.prelude(card);
      assert.ok(shell.classList.contains('fx-prelude'));
      assert.ok(shell.classList.contains('fx-'+fx.tierOf(card)));
      assert.equal(badge.textContent,'');
    }
    for(const rarity of ['common','rare','epic'])assert.equal(fx.preludeMs({rarity}),0);
    fx.reset();assert.equal(shell.classList.contains('fx-prelude'),false);
  });
});

test('Prélude : priorité à l’accessibilité et au mode économie',()=>{
  for(const flags of [{reduced:true},{eco:true},{fast:true}]){
    withGlobals({window:{matchMedia:query=>({matches:query.includes('reduced-motion')&&!!flags.reduced})},document:{documentElement:{dataset:{m13Quality:flags.eco?'eco':'high'}},querySelector:()=>null},localStorage:{getItem:()=>flags.fast?'1':'0'}},()=>{
      const fx=createBoosterRevealFX();
      assert.equal(fx.preludeMs({rarity:'ultra',variant:'secret'}),0);
      assert.equal(fx.isFast(),true);
    });
  }
});
