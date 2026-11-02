/* Mashup Run — 3 pistes, rendu local léger, validation finale par Supabase. */
export function createRunner(onFinish){
  let game=null,root=null,timer=null,finishing=false;
  const limit=36,delay=i=>Math.max(300,760-Math.floor(i/6)*78);
  function html(s){
    return '<div class="games-runner-head"><span>🏁 Niveau <b id="runner-level">1</b></span><span>🪙 <b id="runner-coins">0</b> pièces</span><span>🚀 <b id="runner-progress">0</b> / '+Number(s.total||limit)+' sections</span></div>'+
      '<div class="games-runner-scene" id="games-runner-stage" role="group" aria-label="Course à trois voies, évite les tonneaux"><div class="games-runner-sky">✦ MASHUP RUN ✦</div><div class="games-runner-road" id="runner-road"></div><div class="games-runner-player" id="runner-player">🏃</div></div>'+
      '<div class="games-runner-controls"><button type="button" class="btn btn-primary" data-games="runner-left">◀ GAUCHE</button><span>← → <small>ou glisser</small></span><button type="button" class="btn btn-primary" data-games="runner-right">DROITE ▶</button></div>'+
      '<p class="games-muted">Évite les 🛢️ tonneaux et ramasse les 🪙 pièces. Un niveau toutes les six sections, avec une course de plus en plus rapide. Utilise les flèches du clavier ou les boutons tactiles.</p>';
  }
  function paint(){
    if(!game||!root?.isConnected)return;
    const road=root.querySelector('#runner-road');
    const player=root.querySelector('#runner-player');
    if(!road||!player)return;
    road.innerHTML=Array.from({length:5},(_,j)=>{
      const pos=game.step+4-j,row=game.track[pos];
      const cells=[0,1,2].map(lane=>{
        const barrel=!!row?.barrels?.includes(lane),coin=row?.coin===lane;
        return '<div class="games-runner-cell '+(barrel?'games-runner-danger':'')+'" aria-label="'+(barrel?'Obstacle':coin?'Pièce':'Libre')+'">'+(barrel?'🛢️':coin?'🪙':'')+'</div>';
      }).join('');
      return '<div class="games-runner-track-row">'+cells+'</div>';
    }).join('');
    player.style.left=(16.6667+game.lane*33.3333)+'%';
    for(const [key,v] of [['runner-level',Math.floor(game.step/6)+1],['runner-coins',game.coins],['runner-progress',game.step]]){
      const el=root.querySelector('#'+key);if(el)el.textContent=String(v);
    }
    const progress=root.querySelector('.games-mini-playing .games-progress>span');
    if(progress)progress.textContent=game.step+' / '+game.track.length+' sections';
  }
  function schedule(){
    if(!game||game.finished||finishing||timer||!root?.isConnected||!root.querySelector('#games-runner-stage'))return;
    timer=setTimeout(step,delay(game.step));
  }
  function step(){
    timer=null;
    if(!game||game.finished||finishing||!root?.isConnected||!root.querySelector('#games-runner-stage'))return;
    if(document.hidden){timer=setTimeout(step,400);return;}
    const row=game.track[game.step];if(!row)return;
    const lane=game.lane;game.path.push(lane);game.step++;
    const collided=row.barrels.includes(lane);
    if(row.coin===lane&&!collided)game.coins++;
    game.moved=false;
    paint();
    if(collided||game.step>=game.track.length){game.finished=true;void finish();}
    else schedule();
  }
  async function finish(){
    if(!game||finishing)return;
    finishing=true;
    const current=game;
    const result=await onFinish(current.id,current.path.slice());
    finishing=false;
    if(result){stop();game=null;return;}
    if(game!==current||!root?.isConnected)return;
    const stage=root.querySelector('#games-runner-stage');
    if(stage&&!stage.querySelector('.games-runner-retry')){
      const retry=document.createElement('button');
      retry.className='btn btn-primary games-runner-retry';
      retry.textContent='Synchroniser le résultat';
      retry.type='button';
      retry.addEventListener('click',()=>void finish());
      stage.appendChild(retry);
    }
  }
  function move(direction){
    if(!game||game.finished||finishing||game.moved||!root?.isConnected||!root.querySelector('#games-runner-stage'))return;
    const lane=Math.min(2,Math.max(0,game.lane+direction));
    if(lane===game.lane)return;
    game.lane=lane;game.moved=true;paint();
  }
  function stop(){
    if(timer){clearTimeout(timer);timer=null;}
    root=null;
  }
  function reset(){stop();game=null;finishing=false;}
  function mount(s,element){
    root=element;
    if(!game||game.id!==s.id){
      if(timer)clearTimeout(timer);
      timer=null;game={id:s.id,track:Array.isArray(s.track)?s.track:[],lane:1,step:0,path:[],coins:0,moved:false,finished:false};
    }
    paint();schedule();
  }
  document.addEventListener('keydown',ev=>{
    if(!root?.isConnected||ev.altKey||ev.metaKey||ev.ctrlKey)return;
    if(ev.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    if(['ArrowLeft','a','q','A','Q'].includes(ev.key)){ev.preventDefault();move(-1);}
    if(['ArrowRight','d','D'].includes(ev.key)){ev.preventDefault();move(1);}
  });
  let touchX=null;
  document.addEventListener('touchstart',ev=>{
    if(root?.isConnected&&ev.target.closest?.('#games-runner-stage'))touchX=ev.touches[0]?.clientX??null;
  },{passive:true});
  document.addEventListener('touchend',ev=>{
    if(touchX===null)return;
    const delta=(ev.changedTouches[0]?.clientX??touchX)-touchX;touchX=null;
    if(Math.abs(delta)>28)move(delta<0?-1:1);
  },{passive:true});
  return {html,mount,move,stop,reset};
}
