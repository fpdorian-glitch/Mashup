import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,applyMove,findMatches,legalMoves,shuffleBoard,progressFor,replayMatch,MATCH_ENGINE_VERSION} from '../../62-v15-4-match-engine.js';
import {getMatchLevel} from '../../63-v15-4-match-levels.js';
const tile=(kind,special=null)=>({kind,special});
function level(extra={}){
 const width=extra.width||5,height=extra.height||5;
 return {id:999,width,height,colors:5,moves:20,seed:7831,mask:Array(width*height).fill(true),obstacles:Array(width*height).fill(0),goals:{score:100000,collect:[0,0,0,0,0,0],obstacles:0},starTargets:[100000,150000,200000],...extra};
}
function board(extra={}){
 const state=createMatch(level(extra));state.board=Array.from({length:state.width*state.height},(_,i)=>tile((i%state.width+Math.floor(i/state.width)*2)%5));return state;
}
function three(extra={}){
 const state=board(extra);state.board[0]=tile(0);state.board[1]=tile(1);state.board[2]=tile(0);state.board[state.width+1]=tile(0);return state;
}
const firstClear=result=>result.events.find(event=>event.type==='clear');

test('Seeded generation and all state are deterministic, JSON serializable and initially stable',()=>{
 const l=getMatchLevel(1),a=createMatch(l,'same session seed'),b=createMatch(l,'same session seed');
 assert.deepEqual(a,b);assert.deepEqual(JSON.parse(JSON.stringify(a)),a);assert.equal(a.engineVersion,MATCH_ENGINE_VERSION);
 assert.equal(findMatches(a.board,a.width,a.height,a.obstacles).cells.length,0);assert.ok(legalMoves(a).length);assert.notDeepEqual(a.board,createMatch(l,'other session seed').board);
});

test('A valid adjacent swap clears a real alignment, scores and consumes exactly one move',()=>{
 const state=three(),before=structuredClone(state),result=applyMove(state,{from:6,to:1});
 assert.equal(result.valid,true);assert.deepEqual(state,before);assert.equal(result.state.movesLeft,state.movesLeft-1);assert.equal(result.state.movesUsed,1);
 assert.ok(firstClear(result).cells.includes(0)&&firstClear(result).cells.includes(1)&&firstClear(result).cells.includes(2));assert.ok(result.state.score>=180);
 assert.equal(findMatches(result.state.board,5,5,result.state.obstacles).cells.length,0);
});

test('Non-adjacent, out-of-bounds, fractional and non-matching swaps are harmless and free',()=>{
 const state=board(),before=structuredClone(state);
 for(const move of [{from:0,to:24},{from:-1,to:0},{from:0,to:1000000},{from:.5,to:1},{from:0,to:1},{from:'0',to:1}]){
  const result=applyMove(state,move);assert.equal(result.valid,false);assert.equal(result.state,state);assert.deepEqual(state,before);
 }
});

test('Four in a row creates a directional special on the moved tile',()=>{
 const state=board();for(const index of [0,1,3,7])state.board[index]=tile(0);state.board[2]=tile(1);
 const result=applyMove(state,{from:7,to:2});assert.equal(result.valid,true);assert.ok(firstClear(result).created.some(item=>item.index===2&&item.special==='row'));
});

test('Five in a row creates a real colour prism; L/T intersections create a zone nova',()=>{
 const five=board();for(const index of [0,1,3,4,7])five.board[index]=tile(0);five.board[2]=tile(1);
 const result=applyMove(five,{from:7,to:2});assert.ok(firstClear(result).created.some(item=>item.index===2&&item.special==='prism'));
 const cross=board();for(const index of [2,7,10,11,13])cross.board[index]=tile(0);cross.board[12]=tile(1);
 const nova=applyMove(cross,{from:13,to:12});assert.ok(firstClear(nova).created.some(item=>item.index===12&&item.special==='nova'));
});

test('Directional specials combine into real row and column blasts',()=>{
 const state=board();state.board[11].special='row';state.board[12].special='column';
 const result=applyMove(state,{from:11,to:12}),cleared=new Set(firstClear(result).cells);
 assert.equal(result.valid,true);for(const index of [10,11,12,13,14,1,6,16,21,2,7,17,22])assert.ok(cleared.has(index),'Blast misses '+index);
});

test('Prism swap removes the chosen colour, with no unrelated automatic second colour',()=>{
 const state=board();state.board[20].special='prism';state.board[21]=tile(3);
 const result=applyMove(state,{from:20,to:21}),cleared=firstClear(result).cells;
 const expected=state.board.flatMap((candidate,index)=>candidate.kind===3&&index!==21?[index]:[]).concat([20,21]);
 assert.deepEqual([...new Set(cleared)].sort((a,b)=>a-b),[...new Set(expected)].sort((a,b)=>a-b));
});

test('Double prism and nova combinations affect the board rather than only their swapped cells',()=>{
 const prism=board();prism.board[11].special=prism.board[12].special='prism';assert.equal(firstClear(applyMove(prism,{from:11,to:12})).cells.length,25);
 const nova=board();nova.board[11].special=nova.board[12].special='nova';assert.ok(firstClear(applyMove(nova,{from:11,to:12})).cells.length>=20);
 const line=board();line.board[11].special='nova';line.board[12].special='row';assert.ok(firstClear(applyMove(line,{from:11,to:12})).cells.length>=20);
});

test('Gravity drops surviving objects and fills every playable gap, retaining voids and barriers',()=>{
 const state=board();for(const index of [10,12,16])state.board[index]=tile(0);state.board[11]=tile(1);const result=applyMove(state,{from:16,to:11}),fall=result.events.find(event=>event.type==='fall');
 assert.ok(fall.spawned.length>=3);assert.ok(fall.moves.length>0);assert.equal(result.state.board.filter(Boolean).length,25);
 const shaped=board({mask:[false,...Array(24).fill(true)]});shaped.board[0]=null;shaped.obstacles[14]=2;
 const special=structuredClone(shaped);special.board[11].special='row';special.board[12].special='column';const resolved=applyMove(special,{from:11,to:12});
 assert.equal(resolved.state.board[0],null);assert.equal(resolved.state.mask[0],false);assert.ok(resolved.state.board.every((c,i)=>!resolved.state.mask[i]||c));
});

test('Adjacent alignments chip armour once per wave and blocked cells cannot be swapped',()=>{
 const state=three();state.obstacles[3]=2;const result=applyMove(state,{from:6,to:1});
 assert.deepEqual(firstClear(result).damaged.find(item=>item.index===3),{index:3,hp:1});assert.equal(state.obstacles[3],2);
 assert.equal(applyMove(state,{from:3,to:4}).valid,false);
});

test('Cascades have growing multipliers and a deterministic bounded resolution',()=>{
 let found;
 for(let seed=1;seed<=50&&!found;seed++){
  const state=createMatch(getMatchLevel(1),seed);
  for(const move of legalMoves(state)){const result=applyMove(state,move);if(result.events.filter(event=>event.type==='clear').length>=2){found=result;break;}}
 }
 assert.ok(found);const waves=found.events.filter(event=>event.type==='clear');assert.equal(waves[0].multiplier,1);assert.equal(waves[1].multiplier,2);assert.ok(waves.length<=32);assert.equal(found.state.movesUsed,1);
});

test('A dead grid is reshuffled without spending moves, score, armour or earned specials',()=>{
 const state=board();state.board=state.board.map((_,i)=>tile((i%5+Math.floor(i/5))%5));assert.equal(legalMoves(state).length,0);
 const before=structuredClone(state),fixed=shuffleBoard(state);assert.ok(legalMoves(fixed).length);assert.equal(findMatches(fixed.board,5,5).cells.length,0);assert.equal(fixed.movesLeft,state.movesLeft);assert.equal(fixed.score,state.score);assert.deepEqual(state,before);
 const special=structuredClone(state);special.board[11].special='row';const preserved=shuffleBoard(special);assert.equal(preserved.board.filter(t=>t?.special==='row').length,1);
});

test('Win/loss and stars come from resolved objectives, not a client victory flag',()=>{
 const winner=three({moves:1,goals:{score:180,collect:[0,0,0,0,0,0],obstacles:0},starTargets:[180,100000,200000]}),won=applyMove(winner,{from:6,to:1}).state;
 assert.equal(won.status,'won');assert.equal(won.stars,1);assert.equal(progressFor(won).complete,true);assert.equal(applyMove(won,{from:0,to:1}).valid,false);
 const loser=three({moves:1,goals:{score:1000000,collect:[0,0,0,0,0,0],obstacles:0}}),lost=applyMove(loser,{from:6,to:1}).state;
 assert.equal(lost.status,'lost');assert.equal(lost.stars,0);
});

test('Collect and destroyed-obstacle goals must both be completed',()=>{
 const obstacles=Array(25).fill(0);obstacles[3]=1;const state=three({obstacles,goals:{score:0,collect:[3,0,0,0,0,0],obstacles:1}});
 const result=applyMove(state,{from:6,to:1});assert.equal(result.state.status,'won');assert.equal(result.state.destroyedObstacles,1);assert.ok(result.state.collected[0]>=3);
 assert.deepEqual(progressFor(result.state).collect,[{kind:0,current:result.state.collected[0],target:3}]);
});

test('Server transcript replay gives exactly the same result; tampering is rejected',()=>{
 const level=getMatchLevel(3),seed=771,moves=[];let state=createMatch(level,seed);
 for(let i=0;i<3&&state.status==='playing';i++){const move=legalMoves(state)[0];moves.push(move);state=applyMove(state,move).state;}
 assert.deepEqual(replayMatch(level,seed,moves),state);assert.throws(()=>replayMatch(level,seed,[{from:0,to:999}]),/Invalid replay/);
 assert.throws(()=>replayMatch(level,seed,Array(101).fill({from:0,to:1})),/transcript/);
});

test('Malformed states and impossible content fail with bounded validation',()=>{
 assert.throws(()=>createMatch({...getMatchLevel(1),width:1000}),/Invalid/);assert.throws(()=>createMatch({...getMatchLevel(1),goals:{score:0,collect:[0,0,0,0,0,0],obstacles:90}}),/Invalid|Unreachable/);
 assert.throws(()=>applyMove({...board(),board:[]},{from:0,to:1}),/Invalid/);assert.throws(()=>applyMove({...board(),rng:0},{from:0,to:1}),/Invalid/);
});
