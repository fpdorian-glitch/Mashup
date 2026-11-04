import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogueIndex, normalizeSearch, cardSearchText, renderCardWindow, inspectionLimits} from '../../41-v14-runtime.js';
test('Catalogue : cache stable, première occurrence prioritaire, remplacement/ajout invalidé',()=>{
 const index=createCatalogueIndex(), first={id:'a'},duplicate={id:'a'},base=[first],custom=[duplicate];
 const snapshot=index.all(base,custom);assert.equal(index.all(base,custom),snapshot);assert.equal(index.get('a',base,custom),first);
 base.push({id:'b'});assert.notEqual(index.all(base,custom),snapshot);assert.equal(index.get('b',base,custom),base[1]);
 const replacement=[{id:'a',name:'nouveau'}];assert.equal(index.get('a',replacement,custom).name,'nouveau');assert.equal(index.get('missing',replacement,custom),undefined);
});
test('Recherche : accents ignorés, cache invalidé en cas d’édition de carte',()=>{
 const card={name:'Étoile',subtitle:'Ancienne',family:'Crépuscule'};
 assert.ok(cardSearchText(card).includes(normalizeSearch('ETOILE')));card.name='Légende';assert.ok(!cardSearchText(card).includes('etoile'));assert.ok(cardSearchText(card).includes('legende'));
});
test('Fenêtre collection : seuls les nouveaux éléments sont ajoutés, filtre/version changés reconstruisent',()=>{
 let html='',writes=0,appends=0;const root={set innerHTML(v){html=v;writes++;},get innerHTML(){return html;},insertAdjacentHTML(_,v){html+=v;appends++;}};
 const items=[{id:1},{id:2},{id:3}],render=c=>`<div>${c.id}</div>`;
 renderCardWindow(root,items.slice(0,2),render,{version:'a'});assert.equal(writes,1);
 renderCardWindow(root,items,render,{append:true,version:'a'});assert.equal(writes,1);assert.equal(appends,1);assert.equal(html,'<div>1</div><div>2</div><div>3</div>');
 renderCardWindow(root,items,render,{append:true,version:'b'});assert.equal(writes,2);
 renderCardWindow(root,[items[2]],render,{append:true,version:'b'});assert.equal(writes,3);assert.equal(html,'<div>3</div>');
});
test('Inspection : limites physiques et réduction des animations prioritaire',()=>{
 assert.deepEqual(inspectionLimits({reduced:true,quality:'high'}),{x:0,y:0});
 assert.ok(inspectionLimits({quality:'eco'}).y<inspectionLimits({quality:'high'}).y);
 assert.ok(inspectionLimits().y<30);
});
test('Solde : affichage serveur immédiat, pulse uniquement sur augmentation et motion autorisée',async()=>{
 const {presentBalance}=await import('../../41-v14-runtime.js');let calls=0,cancels=0;const element={dataset:{},textContent:'',animate(){calls++;return {cancel(){cancels++;}};}};
 presentBalance(element,100);assert.equal(calls,0);presentBalance(element,120);assert.equal(calls,1);assert.equal(element.textContent,'120');presentBalance(element,120);assert.equal(calls,1);
 presentBalance(element,130,{motion:false});assert.equal(calls,1);assert.equal(cancels,1);presentBalance(element,90);assert.equal(calls,1);assert.equal(element.textContent,'90');
});
test('Reflet : coordonnées, angle et intensité suivent la rotation sans dépasser la carte',async()=>{
 const {reflectionForTilt}=await import('../../41-v14-runtime.js');
 const flat=reflectionForTilt(0,0),left=reflectionForTilt(8,-20),right=reflectionForTilt(-8,20);
 assert.ok(left.x<flat.x&&right.x>flat.x);assert.ok(left.y<right.y);
 assert.notEqual(left.angle,right.angle);assert.ok(left.strength>flat.strength);
 assert.equal(left.foilX,100-left.x);
 for(const value of [reflectionForTilt(-1000,1000),reflectionForTilt(NaN,Infinity)]){
  assert.ok(Number.isFinite(value.x)&&Number.isFinite(value.angle));assert.ok(value.x>=6&&value.x<=94);assert.ok(value.y>=8&&value.y<=92);assert.ok(value.strength<=.64);
 }
});
