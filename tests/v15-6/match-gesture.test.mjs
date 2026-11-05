import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchGesture,isMatchDragCell,projectMatchDrag} from '../../71-v15-6-match-gesture.js';

class Events{
  constructor(){this.handlers=new Map();}
  addEventListener(type,fn){const list=this.handlers.get(type)||new Set();list.add(fn);this.handlers.set(type,list);}
  removeEventListener(type,fn){this.handlers.get(type)?.delete(fn);}
  emit(type,event={}){for(const handler of [...this.handlers.get(type)||[]])handler(event);}
  get listenerCount(){return [...this.handlers.values()].reduce((sum,list)=>sum+list.size,0);}
}
class Classes{
  constructor(){this.values=new Set();}
  add(...names){for(const name of names)this.values.add(name);}
  remove(...names){for(const name of names)this.values.delete(name);}
  contains(name){return this.values.has(name);}
  toggle(name,on){if(on===undefined)on=!this.contains(name);if(on)this.add(name);else this.remove(name);return on;}
}
function laboratory({motion='full',commit}={}){
  const view=new Events(),doc=new Events(),root=new Events(),board=new Events(),raf=new Map(),cells=[];
  let frameId=0,reads=0,current={width:4,height:4,status:'playing',rng:42,movesUsed:0,board:Array.from({length:16},(_,i)=>({kind:i%6,special:null})),mask:Array(16).fill(true),obstacles:Array(16).fill(0)},allowed=true;
  view.requestAnimationFrame=handler=>{raf.set(++frameId,handler);return frameId;};view.cancelAnimationFrame=id=>raf.delete(id);doc.defaultView=view;doc.hidden=false;root.ownerDocument=doc;root.isConnected=true;
  board.classList=new Classes();board.getBoundingClientRect=()=>{reads++;return {left:100,top:200,right:350,bottom:450,width:250,height:250};};
  board.querySelector=selector=>{const id=/data-mm-cell="(\d+)"/.exec(selector)?.[1];return cells[Number(id)]||null;};
  for(let index=0;index<16;index++){
    const values=new Map(),node={dataset:{mmCell:String(index)},classList:new Classes(),style:{setProperty:(key,value)=>values.set(key,String(value)),removeProperty:key=>values.delete(key),getPropertyValue:key=>values.get(key)||''},values,disabled:false,isConnected:true,animations:[]};
    node.getBoundingClientRect=()=>{reads++;const left=110+index%4*60,top=210+Math.floor(index/4)*60;return {left,top,right:left+50,bottom:top+50,width:50,height:50};};
    node.closest=selector=>selector==='[data-mm-cell]'?node:selector==='[data-mm-board]'?board:null;
    node.setPointerCapture=id=>node.capture=id;node.releasePointerCapture=id=>{if(node.capture===id)node.capture=null;};
    node.animate=(frames,options)=>{const animation={frames,options,cancelled:false,cancel(){this.cancelled=true;}};node.animations.push(animation);return animation;};cells.push(node);
  }
  root.contains=node=>cells.includes(node)||node===board;root.querySelector=selector=>selector==='[data-mm-board]'?board:null;
  Object.defineProperty(root,'innerHTML',{set(){throw Error('Finger tracking must not reconstruct DOM');}});
  const calls=[],cancellations=[],starts=[];
  const controller=createMatchGesture({root,getState:()=>current,canInteract:()=>allowed,getMotion:()=>motion,onStart:()=>starts.push(true),onCommit:(from,to)=>{calls.push({from,to});return commit?.(from,to);},onCancel:reason=>cancellations.push(reason)});
  const event=(index=5,x=195,y=295,extra={})=>({target:cells[index],pointerId:1,isPrimary:true,pointerType:'touch',button:0,buttons:1,clientX:x,clientY:y,cancelable:true,preventDefault(){this.prevented=true;},...extra});
  const down=(index=5,extra={})=>{const left=135+index%4*60,top=235+Math.floor(index/4)*60;root.emit('pointerdown',event(index,left,top,extra));};
  const move=(x,y=295,extra={})=>root.emit('pointermove',event(5,x,y,extra));
  const up=(x=235,y=295,extra={})=>root.emit('pointerup',event(5,x,y,extra));
  const flush=()=>{const frames=[...raf.values()];raf.clear();for(const handler of frames)handler(0);};
  return {view,doc,root,board,cells,controller,calls,cancellations,starts,raf,event,down,move,up,flush,get reads(){return reads;},get state(){return current;},set state(value){current=value;},set allowed(value){allowed=value;}};
}

test('Drag geometry stays adjacent, reverses direction and refuses seams, masks and seals',()=>{
  const f=laboratory();
  try{
    assert.equal(isMatchDragCell(f.state,5),true);
    assert.equal(projectMatchDrag({state:f.state,from:5,dx:30,stepX:60,stepY:60}).target,6);
    assert.equal(projectMatchDrag({state:f.state,from:5,dx:-30,stepX:60,stepY:60}).target,4);
    assert.equal(projectMatchDrag({state:f.state,from:3,dx:30,stepX:60,stepY:60}).target,null);
    assert.equal(projectMatchDrag({state:f.state,from:5,dy:-40,stepX:60,stepY:60}).target,1);
    f.state.obstacles[6]=1;assert.equal(projectMatchDrag({state:f.state,from:5,dx:40,stepX:60,stepY:60}).ready,false);
    f.state.obstacles[6]=0;f.state.mask[6]=false;assert.equal(projectMatchDrag({state:f.state,from:5,dx:40,stepX:60,stepY:60}).target,null);
    assert.equal(projectMatchDrag({state:f.state,from:5,dx:Infinity,stepX:60,stepY:60}).x,0);
    assert.equal(projectMatchDrag({state:f.state,from:5,dx:10000,stepX:60,stepY:60}).x,67.2);
  }finally{f.controller.destroy();}
});

test('A symbol follows the finger pixel by pixel before release, with zero move or layout reads',()=>{
  const f=laboratory(),before=JSON.stringify(f.state);
  try{
    f.down();const reads=f.reads;assert.equal(f.cells[5].classList.contains('mm-drag-source'),true);assert.equal(f.starts.length,1);
    f.move(224,299);f.flush();
    assert.equal(f.cells[5].values.get('--mm-drag-x'),'29.00px');assert.equal(f.cells[5].values.get('--mm-drag-y'),'4.00px');
    assert.equal(f.cells[6].classList.contains('mm-drag-neighbor'),true);assert.ok(Number.parseFloat(f.cells[6].values.get('--mm-drag-neighbor-x'))<0);
    assert.equal(f.reads,reads);assert.deepEqual(f.calls,[]);assert.equal(JSON.stringify(f.state),before);
  }finally{f.controller.destroy();}
});

test('Returning the finger to pickup removes the neighbor preview and does not submit',()=>{
  const f=laboratory();
  try{
    f.down();f.move(235);f.flush();assert.equal(f.cells[6].classList.contains('mm-drag-neighbor'),true);
    f.move(195);f.flush();assert.equal(f.cells[6].classList.contains('mm-drag-neighbor'),false);assert.equal(f.cells[5].values.get('--mm-drag-x'),'0.00px');
    f.up(195);assert.deepEqual(f.calls,[]);assert.equal(f.controller.isDragging(),false);assert.deepEqual(f.cancellations,['invalid-target']);
    assert.equal(f.cells[5].animations.length,1);assert.match(f.cells[5].animations[0].frames.at(-1).transform,/translate3d\(0\.00px,0\.00px/);
  }finally{f.controller.destroy();}
});

test('One release submits exactly one adjacent move immediately and holds the preview during a slow reply',async()=>{
  let resolve;const reply=new Promise(done=>resolve=done),f=laboratory({commit:()=>reply}),before=JSON.stringify(f.state);
  try{
    f.down();f.move(235);f.up(235);assert.deepEqual(f.calls,[{from:5,to:6}]);assert.equal(f.controller.isDragging(),false);
    assert.equal(f.cells[5].values.get('--mm-drag-x'),'60px');assert.equal(f.cells[6].values.get('--mm-drag-neighbor-x'),'-60px');
    f.up(235);assert.equal(f.calls.length,1);assert.equal(JSON.stringify(f.state),before);assert.equal(f.controller.shouldSuppressClick({detail:1}),true);assert.equal(f.controller.shouldSuppressClick({detail:0}),false);
    resolve();await reply;await Promise.resolve();assert.equal(f.cells[5].values.size,0);assert.equal(f.cells[6].values.size,0);
  }finally{f.controller.destroy();}
});

test('A border or undersized drag springs home without consuming a move',()=>{
  const f=laboratory();
  try{
    f.down(3);f.move(345,235);f.up(345,235);assert.equal(f.calls.length,0);assert.equal(f.controller.isDragging(),false);
    f.down();f.move(202);f.up(202);assert.equal(f.calls.length,0);assert.equal(f.state.movesUsed,0);
  }finally{f.controller.destroy();}
});

test('A tap leaves click and keyboard selection untouched',()=>{
  const f=laboratory();
  try{f.down();f.up(195);assert.equal(f.calls.length,0);assert.equal(f.controller.shouldSuppressClick({detail:1}),false);assert.equal(f.root.handlers.has('click'),false);assert.equal(f.root.handlers.has('keydown'),false);assert.equal(f.cells[5].values.size,0);}
  finally{f.controller.destroy();}
});

test('A fresh tap immediately after a drag is not mistaken for its synthetic click',()=>{
  const f=laboratory();
  try{
    f.down();f.move(235);f.up(235);
    assert.equal(f.calls.length,1);assert.equal(f.controller.shouldSuppressClick({detail:1}),true);
    f.down(9);f.up(195,355);
    assert.equal(f.calls.length,1);assert.equal(f.controller.shouldSuppressClick({detail:1}),false);
    assert.equal(f.controller.isDragging(),false);
  }finally{f.controller.destroy();}
});

for(const interruption of ['pointercancel','lostpointercapture','blur','hidden','resize','orientationchange']){
  test('Interrupted drag is discarded on '+interruption,()=>{
    const f=laboratory();
    try{
      f.down();f.move(235);
      if(interruption==='hidden'){f.doc.hidden=true;f.doc.emit('visibilitychange');}
      else if(['pointercancel','lostpointercapture'].includes(interruption))f.root.emit(interruption,f.event());
      else f.view.emit(interruption);
      f.flush();f.up(235);assert.equal(f.calls.length,0);assert.equal(f.controller.isDragging(),false);assert.equal(f.raf.size,0);assert.equal(f.cells[5].values.size,0);assert.equal(f.cells[6].values.size,0);assert.equal(f.board.classList.contains('mm-is-dragging'),false);
    }finally{f.controller.destroy();}
  });
}

test('A state/account replacement or loss of interaction cancels before a late release',()=>{
  const f=laboratory();
  try{
    f.down();f.move(235);f.state=structuredClone(f.state);f.flush();f.up(235);assert.equal(f.calls.length,0);assert.deepEqual(f.cancellations,['state-changed']);
    f.down();f.allowed=false;f.move(235);f.up(235);assert.equal(f.calls.length,0);assert.equal(f.controller.isDragging(),false);
  }finally{f.controller.destroy();}
});

test('A second pointer or a departure from the board cannot submit a hidden first gesture',()=>{
  const f=laboratory();
  try{
    f.down();f.move(235);f.root.emit('pointerdown',f.event(5,220,295,{pointerId:2,isPrimary:false}));f.up(235);assert.equal(f.calls.length,0);assert.deepEqual(f.cancellations,['multiple-pointers']);
    f.down();f.move(900);f.move(235);f.up(235);assert.equal(f.calls.length,0);assert.equal(f.cancellations.at(-1),'outside-board');
  }finally{f.controller.destroy();}
});

test('Move samples share one animation frame and only source plus one neighbor are promoted',()=>{
  const f=laboratory();
  try{
    f.down();for(let i=0;i<20;i++)f.move(205+i);assert.equal(f.raf.size,1);f.flush();assert.equal(f.cells[5].values.get('--mm-drag-x'),'29.00px');
    f.move(195,335);f.flush();assert.equal(f.cells[6].classList.contains('mm-drag-neighbor'),false);assert.equal(f.cells[9].classList.contains('mm-drag-neighbor'),true);
    assert.equal(f.cells.filter(node=>node.classList.contains('mm-drag-source')||node.classList.contains('mm-drag-neighbor')).length,2);
  }finally{f.controller.destroy();}
});

test('Repeated mount/destroy releases every listener, capture, frame, class and animation',()=>{
  for(let i=0;i<30;i++){
    const f=laboratory();f.down();f.move(235);f.flush();f.up(235);
    f.controller.destroy();f.controller.destroy();
    assert.equal(f.root.listenerCount+f.view.listenerCount+f.doc.listenerCount,0);assert.equal(f.raf.size,0);assert.equal(f.cells[5].capture,null);
    for(const node of f.cells){assert.equal(node.values.size,0);assert.equal(node.classList.values.size,0);assert.ok(node.animations.every(animation=>animation.cancelled));}
    f.down();f.up(235);assert.equal(f.calls.length,1);
  }
});

test('Reduced motion keeps direct control while omitting the spring and raised scale',()=>{
  const f=laboratory({motion:'off'});
  try{f.down();assert.equal(f.cells[5].values.get('--mm-drag-scale'),'1');f.move(235);f.flush();assert.equal(f.cells[5].values.get('--mm-drag-x'),'40.00px');f.up(235);assert.equal(f.calls.length,1);assert.equal(f.cells[5].animations.length,0);}
  finally{f.controller.destroy();}
});

test('Non-playable states and disabled/sealed cells cannot initiate tracking',()=>{
  const f=laboratory();
  try{
    f.cells[5].disabled=true;f.down();assert.equal(f.controller.isDragging(),false);f.cells[5].disabled=false;
    f.state.obstacles[5]=1;f.down();assert.equal(f.controller.isDragging(),false);f.state.obstacles[5]=0;
    f.state.status='won';f.down();assert.equal(f.controller.isDragging(),false);assert.equal(f.starts.length,0);
  }finally{f.controller.destroy();}
  const noop=createMatchGesture();assert.equal(noop.isDragging(),false);noop.cancel();noop.destroy();
});
