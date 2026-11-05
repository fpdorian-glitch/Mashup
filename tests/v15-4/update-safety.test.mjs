import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setImmediate} from 'node:timers/promises';
import {createUpdateSafety} from '../../67-v15-4-update-safety.js';

test('Les transactions simultanées restent protégées jusqu’à la dernière réponse',()=>{
 const gate=createUpdateSafety(),a=gate.begin('Achat'),b=gate.begin('Sauvegarde');
 assert.equal(gate.status().pending,2);a();a();assert.equal(gate.status().pending,1);
 assert.equal(gate.status().safe,false);b();assert.equal(gate.status().safe,true);
});
test('Booster, combat, Match, Memory et sauvegarde sont des barrières distinctes',()=>{
 let state={};const gate=createUpdateSafety({readState:()=>state});
 for(const key of ['opening','battle','match','memory','saving']){state={[key]:true};assert.equal(gate.status().safe,false,key);}
 state={};assert.equal(gate.status().safe,true);
});
test('Une application encore en initialisation interdit une actualisation prématurée',()=>{
 const gate=createUpdateSafety({readState(){throw Error('not ready');}});assert.equal(gate.status().safe,false);
});

function updater({safe=true,probeVersion='15.5.0',deferProbe=false,htmlVersion,releaseVersion='15.5.0',legacyBusy=false,legacy=false}={}) {
 const nodes=new Map(),listeners={},destinations=[],requests=[];
 for(const id of ['mashup-update-status','mashup-update-banner','mashup-update-version','mashup-update-note','mashup-update-apply','mashup-update-check','mashup-update-later'])
  nodes.set(id,{hidden:true,textContent:'',disabled:false,dataset:{},classList:{add(){},remove(){}},addEventListener(type,handler){this[type]=handler;}});
 let allowed=safe,release;
 const context={URL,Date,console,document:{readyState:'loading',hidden:false,getElementById:id=>nodes.get(id),querySelector:selector=>selector.startsWith('meta[')?{content:htmlVersion}:legacyBusy?{}:null,addEventListener:(type,fn)=>listeners[type]=fn},
  fetch:async url=>{requests.push(String(url));if(String(url).includes('version.json'))return {ok:true,json:async()=>({version:releaseVersion,notes:'Test'})};
    if(deferProbe)await new Promise(resolve=>release=resolve);
    return {ok:true,text:async()=>'<meta name="mashup-version" content="'+probeVersion+'">'};},
  window:{MASHUP_UPDATE_SAFETY:()=>({safe:allowed,reason:'Partie en cours'}),location:{href:'https://example.invalid/Mashup/?keep=yes#collection',replace:url=>destinations.push(url)},setTimeout:()=>1,clearTimeout(){},setInterval(){},addEventListener(){}}
 };
 if(legacy)delete context.window.MASHUP_UPDATE_SAFETY;
 Object.defineProperty(context,'localStorage',{get(){throw Error('Auth storage must not be touched');}});
 vm.runInNewContext(fs.readFileSync(new URL('../../09-mashup-updates.js',import.meta.url),'utf8'),context);
 listeners.DOMContentLoaded();
 return {nodes,destinations,requests,window:context.window,setSafe:v=>allowed=v,release:()=>release?.()};
}
test('Updater : une partie en cours bloque le bouton avant même le probe HTML',async()=>{
 const env=updater({safe:false});await setImmediate();await env.nodes.get('mashup-update-apply').click();
 assert.equal(env.destinations.length,0);assert.equal(env.requests.length,1);assert.match(env.nodes.get('mashup-update-status').textContent,/Partie en cours/);
});
test('Updater : une action commencée pendant la vérification bloque également le reload',async()=>{
 const env=updater({deferProbe:true});await setImmediate();const applying=env.nodes.get('mashup-update-apply').click();await setImmediate();
 env.setSafe(false);env.release();await applying;
 assert.equal(env.destinations.length,0);assert.equal(env.nodes.get('mashup-update-apply').disabled,false);
});
test('Updater : version diffusée et jeu au repos conservent URL et stockage de connexion',async()=>{
 const env=updater();await setImmediate();await env.nodes.get('mashup-update-apply').click();
 assert.equal(env.destinations.length,1);const target=new URL(env.destinations[0]);
 assert.equal(target.searchParams.get('keep'),'yes');assert.equal(target.hash,'#collection');assert.equal(target.searchParams.get('mashup_build'),'15.5.0');
});
test('Updater : un manifeste plus récent que le HTML ne publie pas une fausse mise à jour',async()=>{
 const env=updater({probeVersion:'15.4.0'});await setImmediate();await env.nodes.get('mashup-update-apply').click();
 assert.deepEqual(env.destinations,[]);assert.equal(env.nodes.get('mashup-update-apply').disabled,false);
 assert.match(env.nodes.get('mashup-update-status').textContent,/momentanément indisponible/);
});
test('Updater : un ancien HTML avec un script plus récent reçoit quand même la mise à jour',async()=>{
 const env=updater({htmlVersion:'15.3.1',releaseVersion:'15.4.0',probeVersion:'15.4.0'});await setImmediate();
 assert.equal(env.window.MASHUP_VERSION,'15.3.1');assert.equal(env.nodes.get('mashup-update-banner').hidden,false);
 await env.nodes.get('mashup-update-apply').click();assert.equal(new URL(env.destinations[0]).searchParams.get('mashup_build'),'15.4.0');
});
test('Updater : ancien client sans hook, un tirage visible reste protégé',async()=>{
 const env=updater({legacy:true,legacyBusy:true});await setImmediate();await env.nodes.get('mashup-update-apply').click();
 assert.deepEqual(env.destinations,[]);assert.match(env.nodes.get('mashup-update-status').textContent,/Termine ton action/);
});
