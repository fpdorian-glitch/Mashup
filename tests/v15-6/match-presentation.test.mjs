import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,applyMove} from '../../62-v15-4-match-engine.js';
import {getMatchLevel} from '../../63-v15-4-match-levels.js';
import {matchVisualPlan,createMatchPresentation} from '../../75-v15-6-match-presentation.js';

test('Confirmed cascade playback retains the real sequence without changing snapshots or rewards',()=>{
 const before=createMatch(getMatchLevel(1)),result=applyMove(before,{from:18,to:19}),original=JSON.stringify({before,result});
 assert.equal(result.valid,true);
 const plan=matchVisualPlan(result.events,before);
 assert.deepEqual(plan.map(p=>p.type),result.events.filter(e=>['swap','clear','fall','shuffle'].includes(e.type)).map(e=>e.type));
 assert.deepEqual(plan.at(-1).board,result.state.board);
 assert.ok(plan.some(p=>p.type==='clear')&&plan.some(p=>p.type==='fall'));
 assert.equal(JSON.stringify({before,result}),original);
 plan.at(-1).board[0].kind=99;
 assert.notEqual(result.state.board[0].kind,99);
 assert.doesNotMatch(JSON.stringify(plan),/coins|credits|requestId|reward|sessionId/);
});

test('Large cascade sequences remain short, bounded and simpler in low power mode',()=>{
 const state=createMatch(getMatchLevel(1)),events=Array.from({length:200},()=>({type:'fall',board:state.board,moves:[{from:0,to:6}],spawned:[0]}));
 for(const simple of [false,true]){
  const plan=matchVisualPlan(events,state,{simple});assert.equal(plan.length,100);
  assert.ok(plan.reduce((sum,p)=>sum+p.duration,0)<=(simple?400:800));
  assert.equal(plan[0].moves.length,1);assert.equal(plan[0].spawned.length,1);
 }
 assert.deepEqual(matchVisualPlan([{type:'fall',board:[]}],state),[]);
 assert.deepEqual(matchVisualPlan(null,state),[]);
});

function scene(){
 const nodes=[],canceled=[];
 const node=()=>{const classes=new Set();const n={dataset:{},style:{},isConnected:true,children:[],classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},setAttribute(){},removeAttribute(k){delete this.dataset[k];},append(child){this.children.push(child);},remove(){this.isConnected=false;},getBoundingClientRect:()=>({width:36,height:36}),animate(_frames,options){const animation={options,finished:new Promise(()=>{}),cancel(){canceled.push(animation);}};return animation;}};nodes.push(n);return n;};
 const doc={createElement:node,defaultView:{getComputedStyle:()=>({rowGap:'4px',columnGap:'4px',gap:'4px',padding:'6px'})}};
 const first=node(),board=node();board.ownerDocument=doc;board.querySelector=()=>first;
 const root={isConnected:true,querySelector:selector=>selector==='[data-mm-board]'?board:first};
 return {root,board,nodes,canceled};
}

test('New input cancels the temporary cascade layer, animations and timer immediately',()=>{
 const before=createMatch(getMatchLevel(1)),result=applyMove(before,{from:18,to:19}),s=scene();
 const presentation=createMatchPresentation({root:s.root,renderSymbol:kind=>String(kind)});
 presentation.play({before,events:result.events});assert.equal(presentation.isActive(),true);
 assert.equal(s.board.classList.contains('mm156-resolving'),true);
 const layer=s.board.children[0];assert.ok(layer.children.length<=81);
 presentation.cancel();assert.equal(presentation.isActive(),false);assert.equal(layer.isConnected,false);
 assert.equal(s.board.classList.contains('mm156-resolving'),false);assert.ok(s.canceled.length>0);
 presentation.destroy();assert.equal(presentation.isActive(),false);
});

test('Reduced motion never creates a cascade layer and invalid input never rewrites the board',()=>{
 const before=createMatch(getMatchLevel(1)),result=applyMove(before,{from:18,to:19}),s=scene(),snapshot=JSON.stringify(before);
 const presentation=createMatchPresentation({root:s.root,getMotion:()=> 'off'});
 presentation.play({before,events:result.events});assert.equal(s.board.children.length,0);
 presentation.play({before,events:[{type:'invalid',from:0,to:1}],valid:false,from:0,to:1});assert.equal(s.board.children.length,0);
 assert.equal(JSON.stringify(before),snapshot);presentation.destroy();
});

test('A seal destroyed by the confirmed move keeps a visible symbol during the following fall',()=>{
 const before=createMatch(getMatchLevel(21)),sealed=before.obstacles.findIndex(hp=>hp>0);assert.ok(sealed>=0);
 const obstacles=before.obstacles.slice();obstacles[sealed]=0;
 const s=scene(),presentation=createMatchPresentation({root:s.root,renderSymbol:kind=>'symbol-'+kind});
 presentation.play({before,events:[{type:'fall',board:before.board,obstacles,moves:[],spawned:[]}]});
 const layer=s.board.children[0],token=layer.children.find(node=>node.style.gridColumn===String(sealed%before.width+1)&&node.style.gridRow===String(Math.floor(sealed/before.width)+1));
 assert.ok(token,'The formerly sealed position must have its own visual token');assert.equal(token.hidden,false);assert.match(token.innerHTML,/symbol-/);assert.equal(token.className,'mm156-token');
 assert.equal(layer.children.length,before.mask.filter(Boolean).length);assert.ok(before.obstacles[sealed]>0,'The confirmed event cannot mutate the source obstacle');presentation.destroy();
});
