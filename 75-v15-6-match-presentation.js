/* Match V15.6 — cancellable visual playback of already confirmed engine events.
 * Never applies a move, modifies a snapshot or delays input/network commands.
 */
const copyBoard=board=>board.map(tile=>tile?{kind:tile.kind,special:tile.special}:null);

export function matchVisualPlan(events,before,{simple=false}={}) {
  const length=before?.board?.length;
  if(!Number.isSafeInteger(length)||length<16||length>81||!Array.isArray(events))return [];
  const phases=[];
  for(const event of events.slice(0,100)){
    if(event?.type==='swap'&&Number.isSafeInteger(event.from)&&Number.isSafeInteger(event.to)&&event.from>=0&&event.to>=0&&event.from<length&&event.to<length){
      phases.push({type:'swap',from:event.from,to:event.to});
    }else if(['clear','fall','shuffle'].includes(event?.type)&&Array.isArray(event.board)&&event.board.length===length){
      const indices=items=>Array.isArray(items)?items.filter(i=>Number.isSafeInteger(i)&&i>=0&&i<length).slice(0,length):[];
      phases.push({type:event.type,board:copyBoard(event.board),cells:indices(event.cells),activated:indices(event.activated),cascade:Number.isSafeInteger(event.cascade)?event.cascade:1,
        obstacles:Array.isArray(event.obstacles)&&event.obstacles.length===length?event.obstacles.slice():null,
        moves:Array.isArray(event.moves)?event.moves.filter(m=>Number.isSafeInteger(m?.from)&&Number.isSafeInteger(m?.to)&&m.from>=0&&m.to>=0&&m.from<length&&m.to<length).map(m=>({from:m.from,to:m.to})).slice(0,length):[],spawned:indices(event.spawned)});
    }
  }
  // One short, continuous sequence; a new interaction cancels it immediately.
  const total=simple?360:760,unit=Math.min(simple?90:135,total/Math.max(1,phases.length));
  return phases.map(phase=>({...phase,duration:Math.round(unit)}));
}

export function createMatchPresentation({root,renderSymbol=()=>'',getMotion=()=> 'full'}={}) {
  let layer=null,board=null,timer=null,generation=0,animations=new Set();
  function cancel(){
    generation++;if(timer!==null){clearTimeout(timer);timer=null;}
    for(const animation of animations)animation.cancel?.();animations.clear();
    layer?.remove();layer=null;board?.classList?.remove('mm156-resolving');board?.removeAttribute?.('data-mm-cascade');board=null;
  }
  function animate(node,frames,options){
    if(!node?.animate)return;const animation=node.animate(frames,options);animations.add(animation);
    animation.finished?.then(()=>{if(!options?.fill)animations.delete(animation);},()=>animations.delete(animation));return animation;
  }
  function play({events=[],before,valid=true,from,to}={}){
    cancel();const mode=getMotion();if(mode==='off'||!root?.isConnected||!before?.board)return;
    board=root.querySelector?.('[data-mm-board]');if(!board)return;
    const simple=mode==='simple',phases=matchVisualPlan(events,before,{simple}),token=generation;
    if(!valid){
      const direction=to>from?1:-1,vertical=Math.abs(to-from)===before.width;
      for(const index of [from,to]){const cell=root.querySelector('[data-mm-cell="'+index+'"]');const d=(index===from?1:-1)*direction*12;
        animate(cell,[{transform:vertical?'translateY('+d+'px)':'translateX('+d+'px)'},{transform:'translate(0,0)'}],{duration:simple?100:210,easing:'cubic-bezier(.15,.8,.25,1)'});}
      return;
    }
    if(!phases.length||!board.ownerDocument)return;
    const doc=board.ownerDocument,view=doc.defaultView,style=view?.getComputedStyle?.(board),first=board.querySelector('[data-mm-cell]');
    const rect=first?.getBoundingClientRect?.(),height=rect?.height||36,gap=Number.parseFloat(style?.rowGap)||4,step=height+gap,xStep=(rect?.width||height)+(Number.parseFloat(style?.columnGap)||gap);
    layer=doc.createElement('div');layer.className='mm156-resolution';layer.setAttribute('aria-hidden','true');
    layer.style.gridTemplateColumns='repeat('+before.width+',minmax(0,1fr))';layer.style.gridTemplateRows='repeat('+before.height+',minmax(0,1fr))';
    layer.style.gap=style?.gap||'4px';layer.style.inset=style?.padding||'6px';
    const tiles=new Map();let current=copyBoard(before.board),obstacles=before.obstacles.slice();
    for(let i=0;i<before.board.length;i++){
      if(!before.mask[i])continue;
      const tile=doc.createElement('span');tile.className='mm156-token';tile.style.gridColumn=String(i%before.width+1);tile.style.gridRow=String(Math.floor(i/before.width)+1);layer.append(tile);tiles.set(i,tile);
    }
    function paint(snapshot){for(const [i,node] of tiles){const tile=snapshot[i],hp=obstacles[i]||0;node.hidden=!tile;node.className='mm156-token'+(hp?' has-seal':'');if(tile){const key=tile.kind+':'+(tile.special||'')+':'+hp;if(node.dataset.symbol!==key){node.dataset.symbol=key;node.innerHTML=renderSymbol(tile.kind,tile.special)+(hp?'<i class="mm-seal" aria-hidden="true">'+(hp>1?hp:'')+'</i>':'');}}}}
    paint(current);board.append(layer);board.classList.add('mm156-resolving');
    let cursor=0;
    function next(){
      timer=null;if(token!==generation||!root.isConnected||!layer?.isConnected){cancel();return;}
      const phase=phases[cursor++];if(!phase){cancel();return;}
      if(phase.type==='swap'){
        [current[phase.from],current[phase.to]]=[current[phase.to],current[phase.from]];paint(current);
        const x=(phase.to%before.width-phase.from%before.width)*xStep,y=(Math.floor(phase.to/before.width)-Math.floor(phase.from/before.width))*step;
        for(const [i,sign] of [[phase.to,-1],[phase.from,1]])animate(tiles.get(i),[{transform:'translate('+sign*x+'px,'+sign*y+'px)'},{transform:'translate(0,0)'}],{duration:phase.duration,easing:'cubic-bezier(.2,.8,.25,1)'});
      }else if(phase.type==='clear'){
        board.dataset.mmCascade=String(Math.min(5,phase.cascade));
        for(const i of phase.cells.slice(0,simple?12:48))animate(tiles.get(i),[{opacity:1,transform:'scale(1)'},{opacity:.85,transform:'scale('+(phase.activated.includes(i)?'1.22':'1.1')+')',offset:.3},{opacity:0,transform:'scale(.3)'}],{duration:phase.duration,easing:'ease-out',fill:'forwards'});
        current=phase.board;
      }else{
        for(const animation of animations)animation.cancel?.();animations.clear();
        current=phase.board;if(phase.obstacles)obstacles=phase.obstacles;paint(current);
        const falling=new Map(phase.moves.map(move=>[move.to,Math.floor((move.from-move.to)/before.width)*step]));
        phase.spawned.forEach((i,n)=>falling.set(i,-step*(1+Math.floor(n/before.width))));
        let count=0;for(const [i,delta] of falling){if(count++>=(simple?16:81))break;
          animate(tiles.get(i),[{transform:'translateY('+delta+'px)',opacity:phase.spawned.includes(i)?0:1},{transform:'translateY(0) scale(1.06,.94)',opacity:1,offset:.83},{transform:'translateY(0) scale(1)',opacity:1}],{duration:phase.duration,easing:'cubic-bezier(.25,.12,.55,1)',fill:'both'});}
        if(phase.type==='shuffle')for(const node of [...tiles.values()].slice(0,simple?8:24))animate(node,[{opacity:.4,transform:'scale(.84)'},{opacity:1,transform:'scale(1)'}],{duration:phase.duration});
      }
      timer=setTimeout(next,phase.duration);
    }
    next();
  }
  return {play,cancel,destroy:cancel,isActive:()=>!!layer};
}
