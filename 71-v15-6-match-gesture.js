/* Mashup Match V15.6 — local finger tracking only.
 * No board mutation, randomness, persistence or network call belongs here.
 * The existing move controller receives one adjacent swap after release.
 */
const finite=value=>Number.isFinite(value)?value:0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function isMatchDragCell(state,index){
  return Number.isSafeInteger(index)&&index>=0&&index<state?.board?.length&&
    state.mask?.[index]===true&&!!state.board[index]&&!state.obstacles?.[index];
}

/** Geometry alone previews an adjacent exchange; the official engine still
 * decides whether that exchange creates a match when the move is submitted. */
export function projectMatchDrag({state,from,dx=0,dy=0,stepX=1,stepY=1,threshold=.32}={}){
  const width=state?.width;
  if(!Number.isSafeInteger(width)||width<1||!isMatchDragCell(state,from))return {x:0,y:0,target:null,progress:0,ready:false,axis:null};
  const sx=Math.max(1,finite(stepX)),sy=Math.max(1,finite(stepY));
  const x=clamp(finite(dx),-sx*1.12,sx*1.12),y=clamp(finite(dy),-sy*1.12,sy*1.12);
  const horizontal=Math.abs(x/sx)>=Math.abs(y/sy),axis=horizontal?'x':'y';
  const value=horizontal?x:y,step=horizontal?sx:sy,sign=value<0?-1:1;
  const target=from+(horizontal?sign:sign*width);
  const adjacent=Number.isSafeInteger(target)&&Math.abs(from%width-target%width)+Math.abs(Math.floor(from/width)-Math.floor(target/width))===1;
  const available=adjacent&&isMatchDragCell(state,target);
  const distance=Math.abs(value)/step;
  return {x,y,target:available&&distance>.06?target:null,progress:available?clamp((distance-.06)/.64,0,1):0,ready:available&&distance>=threshold,axis};
}

/**
 * root: delegated Match UI root containing [data-mm-board] and [data-mm-cell].
 * getState: the current official/training snapshot, never altered here.
 * onCommit(from,to): invoked immediately once, after pointerup, no animation wait.
 * getMotion: 'full', 'simple' or 'off'; direct finger feedback remains available.
 */
export function createMatchGesture({root,getState=()=>null,canInteract=()=>true,onStart=()=>{},onCommit=()=>{},onCancel=()=>{},getMotion=()=>'full'}={}){
  if(!root?.addEventListener)return {destroy(){},cancel(){},isDragging:()=>false,shouldSuppressClick:()=>false};
  const doc=root.ownerDocument||globalThis.document,view=doc?.defaultView||globalThis.window;
  const requestFrame=view?.requestAnimationFrame?.bind(view)||globalThis.requestAnimationFrame?.bind(globalThis)||((fn)=>setTimeout(fn,16));
  const cancelFrame=view?.cancelAnimationFrame?.bind(view)||globalThis.cancelAnimationFrame?.bind(globalThis)||clearTimeout;
  let gesture=null,frame=null,disposed=false,suppressUntil=0,settlement=null;
  const listeners=[];
  const listen=(target,type,handler,options)=>{if(!target?.addEventListener)return;target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));};
  const motion=()=>getMotion()==='off'?'off':getMotion()==='simple'?'simple':'full';
  const transform=(x,y,scale=1)=>`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale})`;
  const resetNode=node=>{
    node?.classList?.remove('mm-drag-source','mm-drag-neighbor','mm-drag-ready','mm-drag-settling');
    for(const name of ['--mm-drag-x','--mm-drag-y','--mm-drag-scale','--mm-drag-neighbor-x','--mm-drag-neighbor-y'])node?.style?.removeProperty?.(name);
  };
  function clearSettlement(){
    if(!settlement)return;
    const current=settlement;settlement=null;
    if(current.timer!==null)clearTimeout(current.timer);
    for(const animation of current.animations)animation?.cancel?.();
    resetNode(current.source);resetNode(current.neighbor);
  }
  function release(current){
    if(current?.captured){try{current.source.releasePointerCapture?.(current.id);}catch{}}
  }
  function clearGesture(){
    if(frame!==null){cancelFrame(frame);frame=null;}
    if(!gesture)return null;
    const current=gesture;gesture=null;
    current.board?.classList?.remove('mm-is-dragging');
    release(current);
    return current;
  }
  function notifyCancel(reason){try{onCancel(reason);}catch{/* Input cleanup must remain reliable. */}}
  function cancel(reason='cancelled'){
    const current=clearGesture();clearSettlement();
    if(current){resetNode(current.source);resetNode(current.neighbor);if(current.moved){suppressUntil=Date.now()+400;notifyCancel(reason);}}
  }
  function currentSnapshot(current){
    const state=getState();
    return state===current.state&&state?.status==='playing'&&state.rng===current.rng&&state.movesUsed===current.movesUsed&&canInteract()&&root.isConnected!==false&&current.source.isConnected!==false;
  }
  function returnHome(current,reason){
    if(current.moved){suppressUntil=Date.now()+400;notifyCancel(reason);}
    settle(current,false);
  }
  function settle(current,commit){
    clearSettlement();
    const neighbor=current.neighbor,candidate=commit?current.candidates.get(current.projection.target):null;
    const targetX=candidate?.x||0,targetY=candidate?.y||0;
    const scale=current.motion==='off'?1:1.055;
    const sourceStart=transform(current.projection.x,current.projection.y,scale);
    const sourceEnd=transform(targetX,targetY);
    const duration=current.motion==='off'?0:current.motion==='simple'?110:210;
    current.source.classList?.add('mm-drag-settling');
    const currentSettlement={source:current.source,neighbor,animations:[],timer:null};settlement=currentSettlement;
    if(duration&&typeof current.source.animate==='function'){
      currentSettlement.animations.push(current.source.animate([
        {transform:sourceStart},{transform:transform(targetX+(targetX-current.projection.x)*.035,targetY+(targetY-current.projection.y)*.035,.985),offset:.78},{transform:sourceEnd}
      ],{duration,easing:'cubic-bezier(.2,.75,.3,1)',fill:'both'}));
      if(neighbor?.animate){
        const startX=finite(current.neighborX),startY=finite(current.neighborY);
        currentSettlement.animations.push(neighbor.animate([{transform:transform(startX,startY)},{transform:transform(-targetX,-targetY)}],{duration,easing:'cubic-bezier(.2,.75,.3,1)',fill:'both'}));
      }
    }
    // The terminal positions stay visible while an authoritative request is in
    // flight. The controller never waits for this spring to dispatch the move.
    if(commit){
      current.source.style?.setProperty('--mm-drag-x',targetX+'px');current.source.style?.setProperty('--mm-drag-y',targetY+'px');current.source.style?.setProperty('--mm-drag-scale','1');
      if(neighbor){neighbor.style?.setProperty('--mm-drag-neighbor-x',-targetX+'px');neighbor.style?.setProperty('--mm-drag-neighbor-y',-targetY+'px');}
    }
    currentSettlement.timer=setTimeout(()=>{if(settlement===currentSettlement)clearSettlement();},Math.max(duration,1));
    return currentSettlement;
  }
  function paint(){
    frame=null;const current=gesture;if(!current)return;
    if(!currentSnapshot(current)){cancel('state-changed');return;}
    const p=current.projection,candidate=current.candidates.get(p.target),nextNeighbor=candidate?.node||null;
    if(current.neighbor&&current.neighbor!==nextNeighbor)resetNode(current.neighbor);
    current.neighbor=nextNeighbor;
    current.source.style?.setProperty('--mm-drag-x',p.x.toFixed(2)+'px');
    current.source.style?.setProperty('--mm-drag-y',p.y.toFixed(2)+'px');
    current.source.classList?.toggle('mm-drag-ready',!!p.ready);
    if(nextNeighbor){
      current.neighborX=-candidate.x*p.progress;current.neighborY=-candidate.y*p.progress;
      nextNeighbor.classList?.add('mm-drag-neighbor');
      nextNeighbor.style?.setProperty('--mm-drag-neighbor-x',current.neighborX.toFixed(2)+'px');
      nextNeighbor.style?.setProperty('--mm-drag-neighbor-y',current.neighborY.toFixed(2)+'px');
    }
  }
  function queuePaint(){if(frame===null)frame=requestFrame(paint);}
  function pointerDown(event){
    if(disposed)return;
    if(gesture){if(event.pointerId!==gesture.id)cancel('multiple-pointers');return;}
    if(event.isPrimary===false||(event.button!==undefined&&event.button!==0)||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY)||!canInteract())return;
    const source=event.target?.closest?.('[data-mm-cell]'),state=getState(),from=Number(source?.dataset?.mmCell);
    if(!source||source.disabled||!root.contains?.(source)||state?.status!=='playing'||!isMatchDragCell(state,from))return;
    // A fresh physical contact is not the synthetic click from the previous
    // drag. Keep rapid tap selection responsive after an immediately saved move.
    suppressUntil=0;
    try{onStart();}catch{return;}
    const board=source.closest?.('[data-mm-board]')||root.querySelector?.('[data-mm-board]');
    if(!board?.getBoundingClientRect||!source.getBoundingClientRect)return;
    clearSettlement();
    // Read layout once at pickup, never in pointermove or the animation frame.
    const bounds=board.getBoundingClientRect(),cell=source.getBoundingClientRect();
    if(!(cell.width>0&&cell.height>0&&bounds.width>0&&bounds.height>0))return;
    const candidates=new Map();let stepX=cell.width+5,stepY=cell.height+5;
    for(const index of [from-1,from+1,from-state.width,from+state.width]){
      if(!isMatchDragCell(state,index)||Math.abs(from%state.width-index%state.width)+Math.abs(Math.floor(from/state.width)-Math.floor(index/state.width))!==1)continue;
      const node=board.querySelector?.('[data-mm-cell="'+index+'"]');
      if(!node||node.disabled||!node.getBoundingClientRect)continue;
      const rect=node.getBoundingClientRect(),x=rect.left-cell.left,y=rect.top-cell.top;
      if(x)stepX=Math.abs(x);if(y)stepY=Math.abs(y);
      candidates.set(index,{node,x,y});
    }
    gesture={id:event.pointerId,source,board,state,from,candidates,bounds,stepX,stepY,x:event.clientX,y:event.clientY,moved:false,captured:false,neighbor:null,neighborX:0,neighborY:0,rng:state.rng,movesUsed:state.movesUsed,motion:motion(),projection:{x:0,y:0,target:null,progress:0,ready:false}};
    source.classList?.add('mm-drag-source');source.style?.setProperty('--mm-drag-scale',gesture.motion==='off'?'1':'1.055');board.classList?.add('mm-is-dragging');
    try{source.setPointerCapture?.(event.pointerId);gesture.captured=true;}catch{}
  }
  function pointerMove(event){
    const current=gesture;if(!current||event.pointerId!==current.id)return;
    if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY)){cancel('invalid-pointer');return;}
    if(!currentSnapshot(current)){cancel('state-changed');return;}
    const dx=event.clientX-current.x,dy=event.clientY-current.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))>=5)current.moved=true;
    const b=current.bounds,slop=14;
    if(event.clientX<b.left-slop||event.clientX>b.right+slop||event.clientY<b.top-slop||event.clientY>b.bottom+slop){cancel('outside-board');return;}
    current.projection=projectMatchDrag({state:current.state,from:current.from,dx,dy,stepX:current.stepX,stepY:current.stepY});
    if(current.projection.target!==null&&!current.candidates.has(current.projection.target)){current.projection.target=null;current.projection.progress=0;current.projection.ready=false;}
    if(current.moved&&event.cancelable)event.preventDefault?.();
    queuePaint();
  }
  function pointerUp(event){
    if(!gesture||event.pointerId!==gesture.id)return;
    pointerMove(event);const current=gesture;if(!current)return;
    if(frame!==null){cancelFrame(frame);frame=null;paint();if(!gesture)return;}
    clearGesture();
    if(!current.moved){resetNode(current.source);resetNode(current.neighbor);return;}
    suppressUntil=Date.now()+450;
    if(!currentSnapshot(current)||!current.projection.ready||current.projection.target===null){returnHome(current,'invalid-target');return;}
    const pending=settle(current,true);
    try{
      const result=onCommit(current.from,current.projection.target);
      if(result&&typeof result.then==='function'){
        if(pending.timer!==null){clearTimeout(pending.timer);pending.timer=null;}
        Promise.resolve(result).then(()=>{if(settlement===pending)clearSettlement();},()=>{if(settlement===pending)clearSettlement();});
      }
    }catch{if(settlement===pending)clearSettlement();notifyCancel('commit-failed');}
  }
  function pointerCancel(event){if(gesture&&event.pointerId===gesture.id)cancel('pointercancel');}
  function lostCapture(event){if(gesture&&event.pointerId===gesture.id)cancel('lost-capture');}
  const blur=()=>cancel('blur'),resize=()=>cancel('resize'),visibility=()=>{if(doc?.hidden)cancel('hidden');};
  listen(root,'pointerdown',pointerDown);listen(root,'pointermove',pointerMove,{passive:false});listen(root,'pointerup',pointerUp);listen(root,'pointercancel',pointerCancel);listen(root,'lostpointercapture',lostCapture);
  listen(view,'blur',blur);listen(view,'resize',resize);listen(view,'orientationchange',resize);listen(doc,'visibilitychange',visibility);
  return {
    cancel,
    isDragging:()=>!!gesture,
    shouldSuppressClick:event=>event?.detail===0?false:Date.now()<suppressUntil,
    destroy(){if(disposed)return;disposed=true;cancel('destroy');for(const remove of listeners.splice(0))remove();}
  };
}
