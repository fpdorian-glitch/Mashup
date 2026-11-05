import test from 'node:test';
import assert from 'node:assert/strict';
import {packObjectMarkup,packGalleryPose,mountPackGallery,packsInFilter,seriesPackFilters} from '../../69-v15-5-booster-browser.js';

function target(){
 const listeners=new Map(),attributes=new Map(),props=new Map();
 return {dataset:{},style:{setProperty:(k,v)=>props.set(k,v),removeProperty:k=>props.delete(k),getPropertyValue:k=>props.get(k)||''},setAttribute:(k,v)=>attributes.set(k,v),getAttribute:k=>attributes.get(k),addEventListener(type,fn){const list=listeners.get(type)||new Set();list.add(fn);listeners.set(type,list);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},dispatch(type,event={}){for(const fn of [...(listeners.get(type)||[])])fn({type,target:this,...event});},listenerCount(){return [...listeners.values()].reduce((n,set)=>n+set.size,0);},closest(){return null;}};
}
function fixture(){
 const window=target(),document=target(),root=target(),rail=target(),prev=target(),next=target(),media=target(),frames=new Map();let frameId=0,quality='full',disconnected=0;
 window.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};window.cancelAnimationFrame=id=>frames.delete(id);window.matchMedia=()=>media;window.ResizeObserver=class{observe(){}disconnect(){disconnected++;}};
 document.defaultView=window;root.ownerDocument=document;media.matches=false;document.hidden=false;
 const items=Array.from({length:7},(_,i)=>{const item=target();item.dataset.packId='pack-'+i;item.offsetLeft=95+i*230;item.offsetWidth=200;item.closest=selector=>selector.includes('data-pack-gallery-item')?item:null;item.focus=()=>{};return item;});
 rail.clientWidth=390;rail.scrollLeft=0;rail.querySelectorAll=()=>items;rail.contains=node=>node===rail||items.includes(node);rail.scrollTo=({left})=>{rail.scrollLeft=left;rail.dispatch('scroll');};
 root.querySelector=selector=>selector==='[data-pack-gallery-rail]'?rail:selector==='[data-pack-gallery-prev]'?prev:selector==='[data-pack-gallery-next]'?next:null;
 prev.closest=selector=>selector.includes('data-pack-gallery-prev')?prev:null;next.closest=selector=>selector.includes('data-pack-gallery-next')?next:null;
 const selected=[];const cleanup=mountPackGallery({root,onSelect:(id,index)=>selected.push({id,index}),getQuality:()=>quality});
 const flush=()=>{const batch=[...frames.values()];frames.clear();for(const fn of batch)fn();};flush();
 return {window,document,root,rail,items,media,prev,next,cleanup,selected,frames,flush,setQuality:q=>quality=q,disconnected:()=>disconnected,totalListeners:()=>[window,document,root,rail,media].reduce((n,t)=>n+t.listenerCount(),0)};
}

test('Physical packet markup has six real faces and never reads private or prepared content',()=>{
 const pack={id:'public-pack',name:'Entre les mondes',subtitle:'Édition des amis',count:5,p1:'#cbae72',p2:'#273e51',chip:'CONVERGENCE'};
 for(const key of ['results','cards','allowedCardIds','owned','inventory','guarantee','odds','art','hidden','probabilities'])Object.defineProperty(pack,key,{get(){throw Error('Forbidden private read: '+key);}});
 const html=packObjectMarkup(pack);
 for(const face of ['front','back','left','right','top','bottom'])assert.ok(html.includes('m156-pack-'+face));
 assert.ok(html.includes('data-pack-id="public-pack"'));assert.ok(html.includes('5 CARTES'));assert.equal(html.includes('<img'),false);assert.equal(html.includes('allowedCardIds'),false);assert.equal(html.includes('data-action="open-pack"'),false);
});
test('Packet metadata is escaped, colors are allowlisted, getters cannot disclose a name',()=>{
 const pack={id:'"><script>',name:'<b>Un monde</b>',count:5,p1:'#fff;position:fixed',p2:'url(secret)'};
 const html=packObjectMarkup(pack);assert.equal(html.includes('<script>'),false);assert.ok(html.includes('&lt;b&gt;Un monde&lt;/b&gt;'));assert.ok(html.includes('--m156-pack-ink:#b9d8b4'));assert.ok(html.includes('--m156-pack-deep:#234d52'));assert.equal(html.includes('url(secret)'),false);
 Object.defineProperty(pack,'name',{get(){throw Error('Private accessor');}});assert.ok(packObjectMarkup(pack).includes('Booster Mashup'));
});
test('Pose is bounded for malformed input and reduces 3D on low power or reduced motion',()=>{
 for(const d of [-Infinity,-10,-1.2,0,1.2,10,Infinity,NaN]){
  const pose=packGalleryPose(d);for(const value of [pose.scale,pose.yaw,pose.depth,pose.opacity])assert.ok(Number.isFinite(value));assert.ok(pose.scale>=.83&&pose.scale<=1);assert.ok(Math.abs(pose.yaw)<=22);assert.ok(pose.depth>=-70&&pose.depth<=0);
 }
 assert.equal(packGalleryPose(0).scale,1);assert.equal(packGalleryPose(1,{eco:true}).yaw,0);assert.equal(packGalleryPose(1,{reduced:true}).depth,0);
});
test('Native scroll changes selection once, keeps at most three active objects and has no idle RAF',()=>{
 const f=fixture();assert.equal(f.cleanup.selectedId(),'pack-0');assert.equal(f.selected.length,1);assert.equal(f.prev.disabled,true);assert.equal(f.frames.size,0);
 f.rail.scrollLeft=3.5*230;f.rail.dispatch('scroll');f.rail.dispatch('scroll');assert.equal(f.frames.size,1);f.flush();
 assert.ok(f.items.filter(item=>item.dataset.galleryActive==='true').length<=3);assert.equal(f.selected.length,2);f.rail.dispatch('scroll');f.flush();assert.equal(f.selected.length,2);assert.equal(f.frames.size,0);f.cleanup();
});
test('Keyboard and explicit selection preserve native navigation without purchases or duplicate notifications',()=>{
 const f=fixture();let prevented=0;f.root.dispatch('keydown',{target:f.items[0],key:'End',preventDefault:()=>prevented++});f.flush();assert.equal(f.cleanup.selectedId(),'pack-6');assert.equal(f.next.disabled,true);assert.equal(prevented,1);
 f.cleanup.select(2,{behavior:'auto'});f.flush();assert.equal(f.cleanup.selectedId(),'pack-2');assert.equal(f.selected.at(-1).index,2);const count=f.selected.length;f.cleanup.select(2,{behavior:'auto'});f.flush();assert.equal(f.selected.length,count);
 f.root.dispatch('click',{target:f.prev});f.flush();assert.equal(f.cleanup.selectedId(),'pack-1');f.cleanup();
});
test('Pointer tilt is local and finite; cancellation, screen resize and reduced motion clear it',()=>{
 const f=fixture(),item=f.items[0];f.rail.dispatch('pointerdown',{target:item,pointerId:7,clientX:100,clientY:200});for(let i=0;i<20;i++)f.rail.dispatch('pointermove',{target:item,pointerId:7,clientX:100+i*4,clientY:200+i});assert.equal(f.frames.size,1);f.flush();assert.equal(item.dataset.packTilting,'true');assert.equal(item.style.getPropertyValue('--m156-tilt-y'),'9.88deg');assert.equal(f.selected.length,1);
 f.rail.dispatch('pointercancel',{pointerId:7});f.flush();assert.equal(item.dataset.packTilting,'false');assert.equal(item.style.getPropertyValue('--m156-tilt-y'),'0deg');
 f.setQuality('eco');f.cleanup.refresh();f.flush();assert.equal(f.root.dataset.packGalleryQuality,'eco');f.media.matches=true;f.media.dispatch('change');f.flush();assert.equal(f.root.dataset.packGalleryQuality,'reduced');f.window.dispatch('resize');f.flush();assert.equal(item.dataset.packTilting,'false');f.cleanup();
});
test('Unmount cancels scheduled work and releases all event listeners and resize observer',()=>{
 const f=fixture();assert.ok(f.totalListeners()>8);f.rail.dispatch('scroll');assert.equal(f.frames.size,1);f.cleanup();assert.equal(f.frames.size,0);assert.equal(f.totalListeners(),0);assert.equal(f.disconnected(),1);f.cleanup();assert.equal(f.disconnected(),1);assert.equal(f.items[0].style.getPropertyValue('--m156-pack-scale'),'');assert.equal(f.root.dataset.packGalleryQuality,undefined);
});
test('Mouse drag moves wrappers, snaps once and suppresses the synthetic click',()=>{
 const f=fixture();f.rail.dispatch('pointerdown',{target:f.items[0],pointerId:3,pointerType:'mouse',clientX:250,clientY:200});f.rail.dispatch('pointermove',{target:f.items[0],pointerId:3,pointerType:'mouse',clientX:20,clientY:205});assert.equal(f.rail.scrollLeft,230);assert.equal(f.rail.style.scrollSnapType,'none');f.flush();assert.equal(f.cleanup.selectedId(),'pack-1');
 f.window.dispatch('pointerup',{pointerId:3});f.flush();assert.equal(f.rail.style.scrollSnapType,'');assert.equal(f.cleanup.selectedId(),'pack-1');let blocked=0;f.root.dispatch('click',{target:f.items[0],preventDefault:()=>blocked++});f.flush();assert.equal(f.cleanup.selectedId(),'pack-1');assert.equal(blocked,1);f.cleanup();
});
test('Resize preserves the selected wrapper and interrupted mouse drag restores scroll snapping',()=>{
 const f=fixture();f.cleanup.select(3,{behavior:'auto'});f.flush();f.rail.clientWidth=600;f.items.forEach((item,i)=>{item.offsetWidth=220;item.offsetLeft=190+i*250;});f.window.dispatch('resize');f.flush();assert.equal(f.cleanup.selectedId(),'pack-3');assert.equal(f.rail.scrollLeft,750);
 f.rail.dispatch('pointerdown',{target:f.items[3],pointerId:8,pointerType:'mouse',clientX:180,clientY:200});f.rail.dispatch('pointermove',{target:f.items[3],pointerId:8,pointerType:'mouse',clientX:100,clientY:201});assert.equal(f.rail.style.scrollSnapType,'none');f.cleanup();assert.equal(f.rail.style.scrollSnapType,'');assert.equal(f.frames.size,0);
});
test('New wrapper does not change strict series filters or inspect card catalogs',()=>{
 const packs=[{id:'a',filterMode:'series',allowedSeries:[2]},{id:'b',filterMode:'all',allowedSeries:[]}];
 assert.deepEqual(packsInFilter(packs,'series-2'),[packs[0]]);assert.deepEqual(packsInFilter(packs,'series-99'),[]);assert.deepEqual(packsInFilter(packs,'series-2000'),[]);assert.equal(seriesPackFilters(packs,[{number:2,name:'Seuil'}])[1].label,'Seuil');
});
