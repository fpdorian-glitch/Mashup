import test from 'node:test';
import assert from 'node:assert/strict';
import {getRevealTimings,revealTier} from '../../12-booster-reveal.js';
import {createRevealTimeline} from '../../49-v15-reveal-timeline.js';
import {mountSealedPack,summaryMarkup} from '../../38-v14-booster.js';

function fakeClock(){
  let time=0,next=0;
  const pending=new Map();
  return {
    now:()=>time,
    setTimeout(callback,delay){const id=++next;pending.set(id,{at:time+delay,callback});return id;},
    clearTimeout:id=>pending.delete(id),
    tick(ms){
      const end=time+ms;
      for(let guard=0;guard<100;guard++){
        const first=[...pending].filter(([,item])=>item.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
        if(!first){time=end;return;}
        time=first[1].at;pending.delete(first[0]);first[1].callback();
      }
      throw new Error('A reveal must never create an endless animation clock');
    },
    get pending(){return pending.size;}
  };
}

function scene({timings={prelude:150,flip:600},alive=()=>true,onReveal=()=>{},onReady=()=>{}}={}){
  const clock=fakeClock(),calls=[];
  const timeline=createRevealTimeline({clock,getTimings:()=>typeof timings==='function'?timings():timings,isAlive:alive,onReveal(){calls.push(['reveal',clock.now()]);onReveal();},onReady(){calls.push(['ready',clock.now()]);onReady();},onCancel(){calls.push(['cancel',clock.now()]);}});
  return {timeline,clock,calls};
}

test('V15 : chaque rareté dispose de sa propre cadence, de 180 à 800 ms',()=>{
  const cards=['common','rare','epic','legendary','mythic','ultra'].map(rarity=>({rarity}));
  const before=structuredClone(cards);
  assert.deepEqual(cards.map(card=>getRevealTimings(card).flip),[180,300,430,600,700,800]);
  assert.deepEqual(cards,before);
  assert.equal(revealTier({rarity:'ultra',variant:'secret'}),'ultra-secret');
  assert.equal(revealTier({rarity:'epic',variant:'secret'}),'secret');
  assert.ok(getRevealTimings({rarity:'ultra',variant:'secret'}).prelude<=300);
  assert.equal(revealTier({rarity:'<script>'}),'common');
});

test('V15 : mode rapide ≤ 160 ms, économie ≤ 120 ms et mouvement réduit 20 ms',()=>{
  for(const rarity of ['common','rare','epic','legendary','mythic','ultra']){
    const card={rarity,variant:'secret'};
    assert.deepEqual(getRevealTimings(card,{fast:true}),{prelude:0,flip:140});
    assert.deepEqual(getRevealTimings(card,{eco:true}),{prelude:0,flip:120});
    assert.deepEqual(getRevealTimings(card,{fast:true,reduced:true}),{prelude:0,flip:20});
  }
});

test('Chronologie : le prélude précède la face, la carte devient prête à la bonne échéance',()=>{
  const {timeline,clock,calls}=scene();
  assert.equal(timeline.state,'idle');
  timeline.start();timeline.start();
  assert.equal(timeline.state,'prelude');
  clock.tick(149);assert.deepEqual(calls,[]);
  clock.tick(1);assert.deepEqual(calls,[['reveal',150]]);
  assert.equal(timeline.state,'revealing');
  clock.tick(599);assert.equal(calls.length,1);
  clock.tick(1);assert.deepEqual(calls,[['reveal',150],['ready',750]]);
  assert.equal(timeline.state,'ready');assert.equal(clock.pending,0);
});

test('Chronologie : une commune n’attend aucun prélude et se révèle en 180 ms',()=>{
  const {timeline,clock,calls}=scene({timings:getRevealTimings({rarity:'common'})});
  timeline.start();assert.deepEqual(calls,[['reveal',0]]);
  clock.tick(180);assert.deepEqual(calls,[['reveal',0],['ready',180]]);
});

test('Accélération pendant le prélude : face immédiate, une seule disponibilité en 120 ms',()=>{
  const {timeline,clock,calls}=scene();
  timeline.start();clock.tick(40);timeline.accelerate();timeline.accelerate();
  assert.deepEqual(calls,[['reveal',40]]);
  clock.tick(119);assert.equal(calls.length,1);
  clock.tick(1);assert.deepEqual(calls,[['reveal',40],['ready',160]]);
  clock.tick(3000);assert.equal(calls.length,2);assert.equal(clock.pending,0);
});

test('Accélération pendant le flip : ne prolonge jamais le flip déjà commencé',()=>{
  let fast=false;
  const {timeline,clock,calls}=scene({timings:()=>getRevealTimings({rarity:'ultra'},{fast})});
  timeline.start();clock.tick(200);
  assert.deepEqual(calls,[['reveal',180]]);
  fast=true;timeline.accelerate();clock.tick(99);assert.equal(calls.length,1);
  clock.tick(1);assert.deepEqual(calls,[['reveal',180],['ready',300]]);
  timeline.accelerate();timeline.finish();clock.tick(2000);assert.equal(calls.length,2);
});

test('Accélération tardive : un flip de plus de 120 ms se termine immédiatement',()=>{
  const {timeline,clock,calls}=scene();
  timeline.start();clock.tick(400);timeline.accelerate();
  assert.deepEqual(calls,[['reveal',150],['ready',400]]);
  assert.equal(clock.pending,0);
});

test('Fin immédiate et double tap : chaque callback arrive exactement une fois',()=>{
  const {timeline,clock,calls}=scene();
  timeline.finish();assert.equal(timeline.state,'idle');
  timeline.start();clock.tick(20);timeline.finish();timeline.finish();timeline.accelerate();
  assert.deepEqual(calls,[['reveal',20],['ready',20]]);
  clock.tick(3000);assert.equal(calls.length,2);assert.equal(clock.pending,0);
});

test('Annuler le prélude supprime tous les callbacks, même après un double démontage',()=>{
  const {timeline,clock,calls}=scene();
  timeline.start();clock.tick(20);timeline.cancel();timeline.cancel();timeline.finish();timeline.start();
  clock.tick(3000);assert.deepEqual(calls,[['cancel',20]]);
  assert.equal(timeline.state,'cancelled');assert.equal(clock.pending,0);
});

test('Annuler un flip interdit un callback prêt vers une page ou un compte retiré',()=>{
  const {timeline,clock,calls}=scene();
  timeline.start();clock.tick(200);timeline.cancel();clock.tick(3000);
  assert.deepEqual(calls,[['reveal',150],['cancel',200]]);
});

test('Une modale détachée ne reçoit ni révélation ni disponibilité tardive',()=>{
  for(const detachAt of [30,200]){
    let connected=true;
    const {timeline,clock,calls}=scene({alive:()=>connected});
    timeline.start();clock.tick(detachAt);connected=false;clock.tick(3000);
    assert.equal(calls.some(([type])=>type==='ready'),false);
    assert.equal(calls.filter(([type])=>type==='reveal').length,detachAt===30?0:1);
    assert.equal(timeline.state,'cancelled');assert.equal(clock.pending,0);
  }
});

test('Démonter depuis le callback de révélation ne réarme pas de minuteur',()=>{
  let timeline;
  const fixture=scene({onReveal:()=>timeline.cancel()});timeline=fixture.timeline;
  timeline.start();fixture.clock.tick(150);
  assert.equal(timeline.state,'cancelled');assert.equal(fixture.clock.pending,0);
  assert.deepEqual(fixture.calls,[['reveal',150],['cancel',150]]);
});

test('Scellé V15 : le bouton de vitesse peut accélérer une déchirure déjà commencée',context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  let click,opened=0;
  const button={setAttribute(){}};
  const root={isConnected:true,addEventListener(name,listener){click=listener;},removeEventListener(){click=null;},contains:node=>node===button,classList:{add(){},remove(){}}};
  const cleanup=mountSealedPack({root,onOpen:()=>opened++});
  click({target:{closest:()=>button}});context.mock.timers.tick(80);
  cleanup.accelerate();cleanup.accelerate();cleanup();
  context.mock.timers.tick(1000);assert.equal(opened,1);
});

test('Résumé V15 : distinction visuelle des grandes raretés sans changer les références ou l’ordre',()=>{
  const cards=[{id:'a',rarity:'common'},{id:'b',rarity:'ultra',variant:'secret'},{id:'c',rarity:'legendary'}],seen=[];
  const html=summaryMarkup(cards,card=>{seen.push(card);return card.id;});
  assert.deepEqual(seen,cards);assert.equal(seen[1],cards[1]);
  assert.match(html,/data-reveal-tier="secret"/);assert.match(html,/data-reveal-tier="legendary"/);
  assert.match(html,/Confirme ci-dessous pour ajouter ces cartes/);
});
