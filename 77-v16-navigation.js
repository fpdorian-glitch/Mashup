/* Same-document navigation, including Android Back. State stays in memory.
 * History contains route names only, never account data or form contents.
 */
export const V16_VIEWS=Object.freeze(['packs','collection','games','arena','market','menu','journal','profile','missions','decks','online','leaderboard','achievements','rules','admin','creator']);
const valid=route=>route&&V16_VIEWS.includes(route.view);
export function createAppNavigation({history=globalThis.history,events=globalThis.window,getRoute=()=>({view:'packs'}),render=()=>{},canLeave=()=>true,blocked=()=>{},beforeBack=()=>false,capture=()=>null,restore=()=>{},onChange=()=>{}}={}){
 let session='',entries=[],position=0,reverting=false,disposed=false;
 const snapshots=new Map();
 function write(replace=false){const state={...(history?.state||{}),mashup16:{session,index:position}};history?.[replace?'replaceState':'pushState']?.(state,'');}
 function save(){if(entries[position])snapshots.set(position,capture());while(snapshots.size>64)snapshots.delete(snapshots.keys().next().value);}
 function reset(){session='nav-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);entries=[{...getRoute()}];position=0;snapshots.clear();reverting=false;write(true);onChange();}
 function navigate(route,{replace=false,force=false}={}){
  if(disposed||!valid(route))return false;
  if(!force&&!canLeave(route)){blocked();return false;}
  if(JSON.stringify(route)===JSON.stringify(entries[position]))return true;
  save();if(replace||entries[position]?.overlay){entries[position]={...route};write(true);}else{entries=entries.slice(0,position+1);entries.push({...route});position++;write();}
  render({...route},snapshots.get(position));restore(snapshots.get(position));onChange();return true;
 }
 function back(){if(beforeBack())return true;if(!canLeave()){blocked();return false;}if(position>0){history?.back?.();return true;}return navigate({view:'packs'});}
 function pop(event){
  if(disposed)return;if(reverting){reverting=false;return;}
  const state=event.state?.mashup16;
  if(!state||state.session!==session||!Number.isSafeInteger(state.index)||!entries[state.index])return;
  const target=state.index,delta=position-target;
  if(entries[position]?.overlay&&!entries[target]?.overlay&&canLeave(entries[target])){position=target;beforeBack();restore(snapshots.get(target));onChange();return;}
  if(beforeBack()||!canLeave(entries[target])){if(!canLeave(entries[target]))blocked();if(delta){reverting=true;history?.go?.(delta);}return;}
  save();position=target;render({...entries[position]},snapshots.get(position));restore(snapshots.get(position));onChange();
 }
 events?.addEventListener?.('popstate',pop);
 function sync(route){if(valid(route)){entries[position]={...route};write(true);onChange();}}
 function openOverlay(){if(entries[position]?.overlay||disposed)return;save();entries=entries.slice(0,position+1);entries.push({...getRoute(),overlay:true});position++;write();onChange();}
 function closeOverlay(){if(entries[position]?.overlay)history?.back?.();}
 function destroy(){disposed=true;events?.removeEventListener?.('popstate',pop);snapshots.clear();entries=[];}
 reset();return {navigate,back,reset,sync,openOverlay,closeOverlay,destroy,canBack:()=>position>0,current:()=>({...entries[position]}),depth:()=>position};
}
