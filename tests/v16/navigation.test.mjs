import test from 'node:test';import assert from 'node:assert/strict';
import {createAppNavigation} from '../../77-v16-navigation.js';
function environment(){let index=0,states=[null];const events=new EventTarget(),history={state:null,pushState(state){states=states.slice(0,index+1);states.push(state);index++;this.state=state;},replaceState(state){states[index]=state;this.state=state;},go(delta){const next=index+delta;if(next<0||next>=states.length)return;index=next;this.state=states[index];const e=new Event('popstate');e.state=this.state;events.dispatchEvent(e);},back(){this.go(-1);}};return {events,history};}
test('Android/browser Back visits actual prior screens and restores their snapshots',()=>{
 const env=environment(),renders=[],restored=[];let scroll=42;const nav=createAppNavigation({...env,getRoute:()=>({view:'packs'}),capture:()=>({scroll}),render:r=>renders.push(r.view),restore:s=>restored.push(s)});
 nav.navigate({view:'collection',series:2});scroll=196;nav.navigate({view:'market'});nav.back();assert.equal(nav.current().view,'collection');assert.equal(restored.at(-1).scroll,196);nav.back();assert.equal(nav.current().view,'packs');assert.equal(restored.at(-1).scroll,42);assert.deepEqual(renders,['collection','market','collection','packs']);nav.destroy();
});
test('Critical writes block both a double navigation and a native history traversal',()=>{
 const env=environment();let safe=true,blocks=0;const nav=createAppNavigation({...env,getRoute:()=>({view:'packs'}),canLeave:()=>safe,blocked:()=>blocks++});nav.navigate({view:'market'});safe=false;
 assert.equal(nav.navigate({view:'collection'}),false);env.history.back();assert.equal(nav.current().view,'market');assert.equal(env.history.state.mashup16.index,1);assert.equal(blocks,2);safe=true;nav.back();assert.equal(nav.current().view,'packs');nav.destroy();
});
test('Identical taps do not push duplicate routes and opening a modal preserves its underlying screen',()=>{
 const env=environment();let open=false,closes=0;const nav=createAppNavigation({...env,getRoute:()=>({view:'packs'}),beforeBack:()=>{if(open){open=false;closes++;return true;}return false;}});
 nav.navigate({view:'collection'});nav.navigate({view:'collection'});assert.equal(nav.depth(),1);open=true;nav.openOverlay();assert.equal(nav.depth(),2);env.history.back();assert.equal(closes,1);assert.equal(nav.current().view,'collection');assert.equal(nav.depth(),1);nav.destroy();
});
test('Old-account history entries cannot restore a private screen after session reset',()=>{
 const env=environment();const nav=createAppNavigation({...env,getRoute:()=>({view:'packs'})});nav.navigate({view:'admin'});const old={...env.history.state};nav.reset();const event=new Event('popstate');event.state=old;env.events.dispatchEvent(event);assert.equal(nav.current().view,'packs');nav.destroy();
});
test('A route chosen from a modal replaces that temporary history entry',()=>{
 const env=environment();const nav=createAppNavigation({...env,getRoute:()=>({view:'packs'})});nav.navigate({view:'menu'});nav.openOverlay();nav.navigate({view:'profile'});assert.equal(nav.depth(),2);nav.back();assert.equal(nav.current().view,'menu');nav.destroy();
});
