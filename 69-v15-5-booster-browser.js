/* Mashup V15.5 — compact pack browser.
 * Only server-public series metadata is used; never infer secret card identities.
 */
export function seriesPackFilters(packs=[],series=[]){
  const numbers=new Set();
  for(const pack of packs){
    if(pack?.filterMode!=='series')continue;
    for(const raw of pack.allowedSeries||[]){
      const id=Number(raw);
      if(Number.isSafeInteger(id)&&id>0)numbers.add(id);
    }
  }
  const items=[{value:'all',label:'Tous les boosters'}];
  for(const id of [...numbers].sort((a,b)=>a-b)){
    const category=series.find(x=>Number(x.number)===id);
    items.push({value:'series-'+id,label:String(category?.name||'Série '+id).slice(0,50)});
  }
  if(numbers.size)items.push({value:'other',label:'Autres boosters'});
  return items;
}
export function packsInFilter(packs=[],selection='all'){
  if(selection==='all')return packs;
  if(selection==='other')return packs.filter(p=>p?.filterMode!=='series'||!(p.allowedSeries||[]).length);
  const id=/^series-(\d{1,3})$/.exec(String(selection))?.[1];
  if(!id)return [];
  return packs.filter(p=>p?.filterMode==='series'&&(p.allowedSeries||[]).some(n=>Number(n)===Number(id)));
}
export function safePackSelection(packs,series,requested){
 const options=seriesPackFilters(packs,series);
 return options.some(x=>x.value===requested)?requested:'all';
}

/* V15.6 — physical wrappers. Deliberately read only a small public allowlist.
 * In particular, never inspect a prepared result, guarantee, card or artwork. */
const escapePack=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const publicValue=(pack,key)=>pack&&typeof pack==='object'?Object.getOwnPropertyDescriptor(pack,key)?.value:undefined;
const publicText=(value,fallback,max)=>typeof value==='string'&&value.trim()?value.trim().slice(0,max):fallback;
const publicColor=(value,fallback)=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value:fallback;
const constellation='<svg class="m156-pack-emblem" viewBox="0 0 160 180" fill="none" aria-hidden="true"><path d="m80 13 17 55 50 22-50 22-17 55-17-55-50-22 50-22Z"/><ellipse cx="80" cy="90" rx="62" ry="36" transform="rotate(-34 80 90)"/><ellipse cx="80" cy="90" rx="62" ry="36" transform="rotate(34 80 90)"/><circle cx="80" cy="90" r="7"/><path d="M15 32h8m-4-4v8m115 107h10m-5-5v10M128 27h6m-3-3v6M24 145h6m-3-3v6"/></svg>';

/** Standalone selection button. It contains only public packaging metadata. */
export function packObjectMarkup(pack={},esc=escapePack){
 const id=publicText(publicValue(pack,'id'),'pack',64),name=publicText(publicValue(pack,'name'),'Booster Mashup',48);
 const subtitle=publicText(publicValue(pack,'subtitle'),'Une rencontre entre les mondes',72);
 const p1=publicColor(publicValue(pack,'p1'),'#b9d8b4'),p2=publicColor(publicValue(pack,'p2'),'#234d52');
 const rawCount=publicValue(pack,'count'),count=Number.isSafeInteger(rawCount)&&rawCount>0&&rawCount<=20?rawCount:null;
 const amount=count?count+' CARTE'+(count>1?'S':''):'CARTES À COLLECTIONNER';
 const chip=publicText(publicValue(pack,'chip'),'ÉDITION MASHUP',30);
 return `<button class="m156-pack-item" type="button" data-pack-gallery-item data-pack-id="${esc(id)}" aria-pressed="false" aria-label="Sélectionner le booster ${esc(name)}" style="--m156-pack-ink:${p1};--m156-pack-deep:${p2}">
  <span class="m156-pack-ground" aria-hidden="true"></span><span class="m156-pack-object" aria-hidden="true">
   <span class="m156-pack-side m156-pack-left"></span><span class="m156-pack-side m156-pack-right"></span><span class="m156-pack-side m156-pack-top"></span><span class="m156-pack-side m156-pack-bottom"></span>
   <span class="m156-pack-back"><span>MASHUP</span><i>COLLECTION DE MONDES</i><b>CHAQUE CARTE A SON HISTOIRE</b><em></em><small>UN UNIVERS À DÉCOUVRIR</small></span>
   <span class="m156-pack-front"><span class="m156-pack-crimp m156-pack-crimp-top"></span><span class="m156-pack-brand">MASHUP<small>COLLECTION DE MONDES</small></span><span class="m156-pack-edition">${esc(chip)}</span>${constellation}<span class="m156-pack-title">${esc(name)}</span><span class="m156-pack-subtitle">${esc(subtitle)}</span><span class="m156-pack-count">${esc(amount)}</span><span class="m156-pack-crimp m156-pack-crimp-bottom"></span><span class="m156-pack-fold"></span><span class="m156-pack-reflection"></span></span>
  </span><span class="m156-pack-select-hint" aria-hidden="true">SÉLECTIONNÉ <i>✦</i></span>
 </button>`;
}

/** Bounded scene: the selected wrapper and its two neighbours get 3D depth. */
export function packGalleryPose(distance,{reduced=false,eco=false}={}){
 const d=Number.isFinite(distance)?Math.max(-4,Math.min(4,distance)):4,absolute=Math.abs(d),active=absolute<1.6;
 return {active,scale:Number((1-Math.min(1,absolute)*.17).toFixed(3)),yaw:reduced||eco?0:Number((Math.max(-1,Math.min(1,d))*-22-6*(1-Math.min(1,absolute))).toFixed(2)),depth:reduced||eco?0:Number((-Math.min(1,absolute)*70).toFixed(2)),opacity:active?Number((1-Math.min(1,absolute)*.18).toFixed(3)):.35};
}

/** Native inertial scrolling and snap; no simulation loop and no network access.
 * onSelect(id,index) is called only when the central selection actually changes.
 * Call cleanup before replacing the gallery or changing the account/view. */
export function mountPackGallery({root,onSelect=()=>{},getQuality=()=> 'auto',initialId=null}={}){
 const rail=root?.querySelector?.('[data-pack-gallery-rail]'),items=rail?[...rail.querySelectorAll('[data-pack-gallery-item]')]:[];
 if(!root?.addEventListener||!rail||!items.length)return Object.assign(()=>{},{select:()=>{},refresh:()=>{},selectedId:()=>null});
 const doc=root.ownerDocument||globalThis.document,view=doc?.defaultView||globalThis.window;
 const media=view?.matchMedia?.('(prefers-reduced-motion: reduce)');
 const raf=view?.requestAnimationFrame?.bind(view)||((fn)=>setTimeout(fn,16));
 const caf=view?.cancelAnimationFrame?.bind(view)||clearTimeout;
 let frame=null,disposed=false,positions=[],railWidth=0,index=-1,targetIndex=0,tilt=null,activePointer=null,suppressClickUntil=0;
 const cleanups=[];
 const listen=(node,type,fn,options)=>{node?.addEventListener?.(type,fn,options);cleanups.push(()=>node?.removeEventListener?.(type,fn,options));};
 const quality=()=>({reduced:!!media?.matches,eco:['eco','fluid','simple','off','low'].includes(getQuality())});
 function measure(){
  railWidth=rail.clientWidth||rail.getBoundingClientRect?.().width||1;
  positions=items.map(item=>Number(item.offsetLeft)+(Number(item.offsetWidth)||item.getBoundingClientRect?.().width||1)/2);
 }
 function notify(next){
  if(next===index)return;index=next;targetIndex=next;
  items.forEach((item,i)=>{item.setAttribute('aria-pressed',String(i===next));item.tabIndex=i===next?0:-1;});
  const prev=root.querySelector('[data-pack-gallery-prev]'),nextButton=root.querySelector('[data-pack-gallery-next]');
  if(prev)prev.disabled=next===0;if(nextButton)nextButton.disabled=next===items.length-1;
  onSelect(items[next].dataset.packId,next);
 }
 function paint(){
  frame=null;if(disposed||!positions.length)return;
  const center=Number(rail.scrollLeft||0)+railWidth/2;
  let closest=0;for(let i=1;i<positions.length;i++)if(Math.abs(positions[i]-center)<Math.abs(positions[closest]-center))closest=i;
  notify(closest);
  const mode=quality(),step=positions.length>1?Math.abs(positions[1]-positions[0]):railWidth;
  root.dataset.packGalleryQuality=mode.reduced?'reduced':mode.eco?'eco':'full';
  for(let i=0;i<items.length;i++){
   const item=items[i],pose=packGalleryPose((positions[i]-center)/Math.max(1,step),mode);
   item.dataset.galleryActive=String(pose.active&&Math.abs(i-closest)<=1);
   item.style.setProperty('--m156-pack-scale',String(pose.scale));item.style.setProperty('--m156-pack-yaw',pose.yaw+'deg');item.style.setProperty('--m156-pack-z',pose.depth+'px');item.style.setProperty('--m156-pack-opacity',String(pose.opacity));
   const touching=tilt&&i===closest&&!mode.reduced&&!mode.eco;
   item.dataset.packTilting=touching?'true':'false';
   item.style.setProperty('--m156-tilt-x',touching?tilt.x+'deg':'0deg');item.style.setProperty('--m156-tilt-y',touching?tilt.y+'deg':'0deg');
   item.style.setProperty('--m156-reflect-x',touching?tilt.light+'%':'42%');
  }
 }
 function schedule(){if(!disposed&&frame===null)frame=raf(paint);}
 function resetTilt(){
  const previous=activePointer;activePointer=null;tilt=null;
  if(previous?.dragged){rail.style.scrollSnapType=previous.snap||'';try{rail.releasePointerCapture?.(previous.id);}catch{}}
  schedule();
 }
 function refresh(){if(disposed)return;const previous=index;resetTilt();measure();if(previous>=0)select(previous,{behavior:'auto'});else schedule();}
 function select(next,{behavior}={}){
  if(disposed)return;next=Math.max(0,Math.min(items.length-1,Number.isFinite(next)?Math.trunc(next):0));targetIndex=next;
  const left=Math.max(0,positions[next]-railWidth/2),mode=quality();
  if(rail.scrollTo)rail.scrollTo({left,behavior:behavior||(mode.reduced?'auto':'smooth')});else rail.scrollLeft=left;
  if(behavior==='auto'||mode.reduced||!rail.scrollTo)notify(next);
  resetTilt();schedule();
 }
 function click(event){
  if(Date.now()<suppressClickUntil){event.preventDefault?.();return;}
  const previous=event.target.closest?.('[data-pack-gallery-prev]'),next=event.target.closest?.('[data-pack-gallery-next]');
  if(previous||next){select(targetIndex+(previous?-1:1));return;}
  const button=event.target.closest?.('[data-pack-gallery-item]'),chosen=items.indexOf(button);if(chosen>=0)select(chosen);
 }
 function keydown(event){
  if(!rail.contains(event.target)&&!event.target.closest?.('[data-pack-gallery-prev],[data-pack-gallery-next]'))return;
  const keys={ArrowLeft:()=>targetIndex-1,ArrowRight:()=>targetIndex+1,Home:()=>0,End:()=>items.length-1};
  if(!Object.hasOwn(keys,event.key))return;event.preventDefault?.();const next=Math.max(0,Math.min(items.length-1,keys[event.key]()));select(next);items[next].focus?.({preventScroll:true});
 }
 function down(event){
  if(activePointer||event.isPrimary===false||(event.button!==undefined&&event.button!==0)||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
  const item=event.target.closest?.('[data-pack-gallery-item]');if(item!==items[index])return;
  activePointer={id:event.pointerId,x:event.clientX,y:event.clientY,mouse:event.pointerType==='mouse',scrollLeft:rail.scrollLeft||0,dragged:false,snap:rail.style.scrollSnapType||''};
 }
 function move(event){
  if(!activePointer||event.pointerId!==activePointer.id||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
  const dx=event.clientX-activePointer.x,dy=event.clientY-activePointer.y;
  if(activePointer.mouse&&(activePointer.dragged||(Math.abs(dx)>14&&Math.abs(dx)>Math.abs(dy)*1.2))){
   if(!activePointer.dragged){activePointer.dragged=true;rail.style.scrollSnapType='none';try{rail.setPointerCapture?.(event.pointerId);}catch{}}
   rail.scrollLeft=Math.max(0,activePointer.scrollLeft-dx);suppressClickUntil=Date.now()+400;tilt=null;schedule();return;
  }
  const mode=quality();if(mode.reduced||mode.eco)return;
  tilt={x:Math.max(-8,Math.min(8,-dy*.11)),y:Math.max(-12,Math.min(12,dx*.13)),light:Math.max(15,Math.min(85,42+dx*.2))};schedule();
 }
 function end(event){
  if(activePointer?.id!==event.pointerId)return;const dragged=activePointer.dragged;resetTilt();
  if(dragged&&event.type!=='pointercancel'&&event.type!=='lostpointercapture'){
   const center=Number(rail.scrollLeft||0)+railWidth/2;let nearest=0;for(let i=1;i<positions.length;i++)if(Math.abs(positions[i]-center)<Math.abs(positions[nearest]-center))nearest=i;
   select(nearest);
  }
 }
 function leave(){if(activePointer&&!activePointer.dragged)resetTilt();}
 function hidden(){if(doc?.hidden)resetTilt();else refresh();}
 listen(rail,'scroll',schedule,{passive:true});listen(rail,'scrollend',schedule,{passive:true});listen(root,'click',click);listen(root,'keydown',keydown);
 listen(rail,'pointerdown',down,{passive:true});listen(rail,'pointermove',move,{passive:true});listen(rail,'pointerleave',leave);listen(view,'pointerup',end);listen(rail,'pointercancel',end);listen(rail,'lostpointercapture',end);listen(view,'blur',resetTilt);listen(view,'resize',refresh);listen(view,'orientationchange',refresh);listen(doc,'visibilitychange',hidden);
 if(media?.addEventListener)listen(media,'change',refresh);
 let observer=null;if(typeof view?.ResizeObserver==='function'){observer=new view.ResizeObserver(refresh);observer.observe(rail);}
 measure();const initial=items.findIndex(item=>item.dataset.packId===initialId);select(initial<0?0:initial,{behavior:'auto'});
 const cleanup=()=>{
  if(disposed)return;disposed=true;if(frame!==null)caf(frame);frame=null;observer?.disconnect();for(const release of cleanups)release();
  const previous=activePointer;activePointer=null;tilt=null;if(previous?.dragged){rail.style.scrollSnapType=previous.snap||'';try{rail.releasePointerCapture?.(previous.id);}catch{}}delete root.dataset.packGalleryQuality;
  for(const item of items){delete item.dataset.galleryActive;delete item.dataset.packTilting;for(const key of ['scale','yaw','z','opacity'])item.style.removeProperty('--m156-pack-'+key);for(const key of ['--m156-tilt-x','--m156-tilt-y','--m156-reflect-x'])item.style.removeProperty(key);}
 };
 return Object.assign(cleanup,{select,refresh,selectedId:()=>index>=0?items[index].dataset.packId:null});
}
