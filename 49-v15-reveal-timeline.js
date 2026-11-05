/* Mashup V15 — a cancellable, presentation-only reveal clock.
   No card selection, network request or transaction belongs in this module. */
const duration=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(10000,Number(value))):0;

/** The supplied clock makes interruption behavior testable without real waits.
 * `getTimings` returns {prelude, flip}. Call start() once per existing card.
 * accelerate() shortens the current reveal; finish() exposes it immediately.
 * isAlive() must describe the original stage, never a newly opened modal.
 */
export function createRevealTimeline({onReveal=()=>{},onReady=()=>{},onCancel=()=>{},getTimings=()=>({}),isAlive=()=>true,clock={}}={}){
  const schedule=clock.setTimeout||((callback,ms)=>globalThis.setTimeout(callback,ms));
  const unschedule=clock.clearTimeout||(timer=>globalThis.clearTimeout(timer));
  const now=clock.now||(()=>globalThis.performance?.now?.()??Date.now());
  let phase='idle',timer=null,revealStarted=0,revealed=false,ready=false;
  const clear=()=>{if(timer!==null){unschedule(timer);timer=null;}};
  const timings=()=>{const value=getTimings()||{};return {prelude:duration(value.prelude),flip:duration(value.flip)};};
  function cancel(){
    if(phase==='cancelled'||phase==='ready')return;
    clear();phase='cancelled';onCancel();
  }
  function alive(){if(isAlive())return true;cancel();return false;}
  function complete(){
    if(ready||phase==='cancelled'||!alive())return;
    clear();ready=true;phase='ready';onReady();
  }
  function queueReady(ms){
    if(phase!=='revealing')return;
    clear();
    if(ms===0){complete();return;}
    timer=schedule(()=>{timer=null;complete();},ms);
  }
  function reveal({immediate=false,accelerated=false}={}){
    if(phase==='cancelled'||phase==='ready'||!alive())return;
    clear();phase='revealing';
    if(!revealed){revealed=true;revealStarted=now();onReveal();}
    if(phase!=='revealing'||!alive())return;
    const flip=timings().flip;
    queueReady(immediate?0:accelerated?Math.min(120,flip):flip);
  }
  function start(){
    if(phase!=='idle'||!alive())return api;
    phase='prelude';
    const delay=timings().prelude;
    if(delay===0)reveal();
    else timer=schedule(()=>{timer=null;reveal();},delay);
    return api;
  }
  function accelerate(){
    if(phase==='idle'||phase==='ready'||phase==='cancelled')return api;
    if(!alive())return api;
    if(phase==='prelude')reveal({accelerated:true});
    else queueReady(Math.max(0,Math.min(120,timings().flip)-(now()-revealStarted)));
    return api;
  }
  function finish(){
    if(phase==='idle'||phase==='ready'||phase==='cancelled')return api;
    reveal({immediate:true});return api;
  }
  const api={start,accelerate,finish,cancel,get state(){return phase;}};
  return api;
}
