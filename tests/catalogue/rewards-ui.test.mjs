import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollectionRewardsUI} from '../../18-v10-8-collection.js';

function fixture(){
 const requests=[],errors=[];
 const ui=createCollectionRewardsUI({api:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),esc:String,toast:message=>errors.push(message),onState(){},getMetrics:()=>({total:90,owned:45})});
 return {ui,requests,errors};
}
const info=(claimed=false,reward=300)=>[{series:2,owned:1,total:999,tiers:[{percent:50,unlocked:true,claimed,reward}]}];
async function withDocument(fn){
 const previous=globalThis.document;
 globalThis.document={getElementById:()=>null,querySelector:()=>null};
 try{await fn();}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}

test('Une ancienne réponse de récompenses ne rétablit pas un snapshot invalidé par archivage',()=>withDocument(async()=>{
 const {ui,requests}=fixture();ui.setData(info());
 const old=ui.refresh({force:true});await Promise.resolve();ui.invalidate();
 const fresh=ui.refresh();await Promise.resolve();assert.equal(requests.length,2);
 requests[1].resolve({collectionRewards:info(true)});await fresh;
 requests[0].resolve({collectionRewards:info(false,999)});await old;
 const html=ui.render(2);assert.match(html,/45 \/ 90/);assert.match(html,/✓ Récompense récupérée/);assert.doesNotMatch(html,/\+999/);
}));

test('Le changement de compte invalide aussi les échecs tardifs des récompenses',()=>withDocument(async()=>{
 const {ui,requests,errors}=fixture();ui.setData(info());
 const pending=ui.refresh({force:true});await Promise.resolve();ui.setData(null);
 requests[0].reject(Error('Erreur de l’ancien compte'));await pending;
 assert.deepEqual(errors,[]);assert.match(ui.render(2),/Chargement/);assert.doesNotMatch(ui.render(2),/Récupérer/);
}));

test('Une réclamation reçue reste acquise malgré une lecture commencée auparavant',()=>withDocument(async()=>{
 const {ui,requests}=fixture();ui.setData(info());const pending=ui.refresh({force:true});await Promise.resolve();
 ui.setData(info(true));requests[0].resolve({collectionRewards:info(false)});await pending;
 assert.match(ui.render(2),/✓ Récompense récupérée/);
}));
