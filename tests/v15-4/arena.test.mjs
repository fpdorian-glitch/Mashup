import test from 'node:test';
import assert from 'node:assert/strict';
import {arenaSequence, createArenaRebornPresentation} from '../../53-v15-1-arena.js';
import {arenaBattleMarkup, roundProgressMarkup, ruleBannerMarkup} from '../../57-v15-1-battle-view.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stats=[['power','Puissance'],['size','Taille'],['def','Défense'],['aura','Aura'],['intelligence','Intelligence']].map(([key,label])=>({key,label}));
const card={id:'fiction-card',name:'Gardien du Nexus',rarity:'ultra',variant:'secret'};
const snapshot={matchId:'fiction-duel',source:'pvp',round:2,stage:'reveal',direction:'lower',turn:'player',playerCards:[card],enemyCards:[card],winner:'player',stat:'power',pValue:12,eValue:95,playerScore:2,enemyScore:1,stats};
const renderCard=()=>'<div class="v14-card tcg-card">Visuel fictif</div>';

test('V15.4 : numéro de manche, statistique et règle restent réunis dans le dock',()=>{
 const html=arenaBattleMarkup(snapshot,{esc,renderCard});
 const dock=html.slice(html.indexOf('data-rb-stat-dock'));
 assert.match(dock,/Manche 3 \/ 4/);assert.match(dock,/Puissance/);assert.match(dock,/2–1/);assert.match(dock,/↓.*PLUS FAIBLE GAGNE/s);
 assert.equal((html.match(/data-rb-rule/g)||[]).length,1);
 assert.ok(!html.includes('data-action="pvp-choose"'),'Le résultat ne propose pas un second choix.');
});

test('V15.4 : les cinq actions montrent toutes la même direction autoritaire',()=>{
 const html=arenaBattleMarkup({...snapshot,stage:'choose',stat:undefined},{esc,renderCard});
 assert.equal((html.match(/data-action="pvp-choose"/g)||[]).length,5);
 assert.equal((html.match(/class="rb-stat-direction"[^>]*>↓ MIN/g)||[]).length,5);
 assert.equal((html.match(/La plus petite valeur gagne/g)||[]).length,5);
 assert.match(html,/Statistique au choix/);
 const unknown=arenaBattleMarkup({...snapshot,stage:'choose',direction:null},{esc,renderCard});
 assert.equal((unknown.match(/disabled title=/g)||[]).length,5);
 assert.match(unknown,/RÈGLE EN ATTENTE/);
});

test('V15.4 : la frise représente quatre manches et ne prédit aucun gagnant',()=>{
 const rail=roundProgressMarkup({round:2});
 assert.equal((rail.match(/<li /g)||[]).length,4);
 assert.equal((rail.match(/class="rb-round-done"/g)||[]).length,2);
 assert.equal((rail.match(/aria-current="step"/g)||[]).length,1);
 assert.equal((rail.match(/class="rb-round-future"/g)||[]).length,1);
 const ended=roundProgressMarkup({round:3,finished:true});
 assert.equal((ended.match(/class="rb-round-done"/g)||[]).length,4);
 assert.ok(!ended.includes('aria-current'));
 assert.match(ruleBannerMarkup('higher',esc,{finished:true,round:3,statLabel:'Aura'}),/Combat terminé/);
});

test('V15.4 : le contenu d’une carte masquée reste inaccessible même si elle est dans un snapshot révélé',()=>{
 const hidden={hidden:true,get name(){throw Error('private name');},get rarity(){throw Error('private rarity');},get variant(){throw Error('private finish');}};
 const html=arenaBattleMarkup({...snapshot,playerCards:[hidden],enemyCards:[hidden]},{esc,renderCard(){throw Error('private renderer');}});
 assert.equal((html.match(/À DÉCOUVRIR/g)||[]).length,2);
 assert.ok(!html.includes('data-v15-material'));
});

test('V15.4 : les mentions adverses et la statistique affichée sont échappées',()=>{
 const html=arenaBattleMarkup({...snapshot,opponentName:'<script>bad()</script>',stats:[{key:'power',label:'<img src=x onerror=bad()> }'}]},{esc,renderCard});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));
 assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);
});

test('V15.4 : victoire, défaite et égalité conservent les valeurs et récompenses confirmées',()=>{
 for(const winner of ['player','enemy','draw']){
  const s=structuredClone({...snapshot,winner,finished:true,reward:{coins:73,dust:2},balance:1800,historyHTML:'<p>Historique fictif autorisé</p>'}),before=structuredClone(s);
  const html=arenaBattleMarkup(s,{esc,renderCard});
  assert.match(html,new RegExp('data-result="'+winner+'"'));assert.ok(html.includes('>12</b>'));assert.ok(html.includes('>95</b>'));
  assert.match(html,/\+73 crédits · \+2 éclats/);assert.match(html,/Consulter les résultats détaillés/);
  assert.deepEqual(s,before);
 }
});

function scene(){
 const attrs=new Map(),pending=new Map(),calls=[];let id=0;
 const node=(name)=>({animate(frames,options){let resolve;const finished=new Promise(r=>resolve=r);const animation={name,frames,options,finished,cancelled:false,cancel(){this.cancelled=true;resolve();}};calls.push(animation);return animation;}});
 const field={isConnected:true,ownerDocument:{visibilityState:'visible'},matches:()=>true,style:{setProperty(){}},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),querySelector:s=>node(s),querySelectorAll:s=>s==='.rb-team'?[node('own'),node('enemy')]:s==='.rb-comparison b'?[node('own-value'),node('enemy-value')]:s==='.rb-thinking i'?[node('dot-1'),node('dot-2'),node('dot-3')]:[]};
 const clock={setTimeout(fn,ms){pending.set(++id,{fn,ms});return id;},clearTimeout:key=>pending.delete(key)};
 return {field,attrs,pending,calls,clock};
}

test('V15.4 : les deux valeurs et la lumière finale sont animées sans retarder le résultat du snapshot',()=>{
 const s=scene(),p=createArenaRebornPresentation({clock:s.clock});
 p.update({...snapshot,root:s.field,quality:'spectacular'});
 assert.equal(s.attrs.get('data-rb-winner'),'player');assert.equal(s.attrs.get('data-rb-direction'),'lower');
 assert.equal(s.calls.filter(a=>a.name.endsWith('-value')).length,2);
 assert.ok(s.calls.some(a=>a.name.includes('.rb-victory-light')));
 assert.equal(snapshot.pValue,12);assert.equal(snapshot.playerScore,2);
 const count=s.calls.length;p.update({...snapshot,updatedAt:123,root:s.field,quality:'spectacular'});assert.equal(s.calls.length,count);
 p.skip();assert.equal(s.pending.size,0);assert.ok(s.calls.every(a=>a.cancelled));assert.equal(p.phase,'result');
});

test('V15.4 : l’entrée VS et la réflexion IA sont finies et toutes annulables',()=>{
 const s=scene(),p=createArenaRebornPresentation({clock:s.clock});
 p.update({...snapshot,source:'campaign',stage:'choose',turn:'enemy',root:s.field});
 assert.equal(p.phase,'ready');assert.equal(s.attrs.get('data-rb-turn'),'enemy');
 assert.ok(s.calls.some(a=>a.name==='.vs'));
 const dots=s.calls.filter(a=>a.name.startsWith('dot-'));assert.equal(dots.length,3);
 assert.ok(dots.every(a=>Number.isFinite(a.options.iterations)&&a.options.iterations<=2));
 p.clear();assert.equal(p.activeAnimations,0);assert.equal(s.pending.size,0);assert.ok(s.calls.every(a=>a.cancelled));
});

test('V15.4 : qualité fluide, document caché et mouvement réduit ne déclenchent aucun effet',()=>{
 for(const variant of ['fluid','hidden','reduced']){
  const s=scene();if(variant==='hidden')s.field.ownerDocument.visibilityState='hidden';
  const p=createArenaRebornPresentation({clock:s.clock,isReducedMotion:()=>variant==='reduced'});
  const r=p.update({...snapshot,root:s.field,quality:variant==='fluid'?'fluid':'spectacular'});
  assert.equal(r.animated,false);assert.equal(s.calls.length,0);assert.equal(s.pending.size,0);assert.equal(p.phase,'result');
 }
 assert.equal(arenaSequence('fluid').at(-1).at,0);
});

test('V15.4 : une qualité inconnue retombe sur balanced et aucun callback ne survit au retrait de scène',()=>{
 const s=scene(),p=createArenaRebornPresentation({clock:s.clock});
 p.update({...snapshot,root:s.field,quality:'unsupported'});assert.equal(s.attrs.get('data-rb-quality'),'balanced');
 const before=s.attrs.get('data-rb-phase');s.field.isConnected=false;
 for(const t of Array.from(s.pending.values()).sort((a,b)=>a.ms-b.ms))t.fn();
 assert.equal(s.attrs.get('data-rb-phase'),before);p.clear();assert.equal(p.activeAnimations,0);
});


test('V15.4 : les contrôles de duo cadrent une équipe sans toucher au combat et sont démontés avec la scène',()=>{
 const handlers=new Map(),moves=[];
 const attrs=new Map(),button={getAttribute:()=>"enemy",setAttribute:(k,v)=>attrs.set(k,v)};
 const stage={scrollTop:10,getBoundingClientRect:()=>({top:100}),scrollTo:options=>moves.push(options),scrollIntoView:options=>moves.push(options)};
 const enemy={getBoundingClientRect:()=>({top:360})};
 const field={isConnected:true,ownerDocument:{visibilityState:"visible"},matches:()=>true,style:{setProperty(){}},setAttribute:(k,v)=>attrs.set(k,v),getAttribute:k=>attrs.get(k),removeAttribute:k=>attrs.delete(k),addEventListener:(k,fn)=>handlers.set(k,fn),removeEventListener:k=>handlers.delete(k),querySelector:s=>s===".rb-stage"?stage:enemy,querySelectorAll:s=>s==="[data-rb-pan]"?[button]:[]};
 const p=createArenaRebornPresentation();
 p.update({...snapshot,mode:"double",stage:"choose",quality:"fluid",root:field});
 handlers.get("click")({target:{closest:()=>button},preventDefault(){}});
 assert.deepEqual(moves,[{top:264,behavior:"instant"},{block:"start",behavior:"instant"}]);
 assert.equal(attrs.get("data-rb-pan-side"),"enemy");assert.equal(attrs.get("aria-pressed"),"true");
 assert.equal(snapshot.round,2);assert.equal(snapshot.playerScore,2);p.clear();assert.equal(handlers.size,0);
});

test('V15.4 : les libellés du dock sont échappés même sans helper fourni',()=>{
 const html=ruleBannerMarkup('higher',undefined,{statLabel:'<img src=x onerror=bad()>',round:0});
 assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);
});
