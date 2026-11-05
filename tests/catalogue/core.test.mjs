import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {catalogueActiveCards,catalogueNormalCards,catalogueSeriesMetrics,catalogueDisplayIndex,catalogueEditionText,cataloguePublicMetadata,createAutoCatalogue,catalogueOwnedCopies} from '../../58-catalogue.js';
const card=(id,editionNumber=1,extra={})=>({id,name:id,editionSeries:2,editionNumber,rarity:'rare',variant:'standard',...extra});
test('Les nombres stockés n’influencent jamais le total et les séries 1/2/futures sont automatiques',()=>{
 const cards=[card('one',1,{editionSeries:1,editionTotal:158}),card('two',8,{editionTotal:999}),card('future',1,{editionSeries:99})];
 for(const n of [1,2,99])assert.equal(catalogueSeriesMetrics(cards,n).total,1);assert.equal(catalogueSeriesMetrics(cards).total,3);
});
test('Création, archivage, restauration et retrait : aucun nombre manuel à actualiser',()=>{
 const cards=[card('a'),card('b',2)];assert.equal(catalogueSeriesMetrics(cards,2).total,2);cards.push(card('c',3));assert.equal(catalogueSeriesMetrics(cards,2).total,3);
 cards[1].archived=true;assert.equal(catalogueSeriesMetrics(cards,2).total,2);cards[1].archived=false;assert.equal(catalogueSeriesMetrics(cards,2).total,3);cards.splice(1,1);assert.equal(catalogueSeriesMetrics(cards,2).total,2);
});
test('Dédoublonnage : un même ID ne compte qu’une fois, un tombstone ne ressuscite pas',()=>{
 const list=[card('a'),card('a',6),card('b',2),card('b',2,{archived:true})];assert.deepEqual(catalogueActiveCards(list).map(c=>c.id),['a']);assert.equal(catalogueSeriesMetrics(list,2,{a:10,b:10}).owned,1);
});
test('Toutes les formes documentées de retrait sont exclues ; hidden n’est pas un archivage',()=>{
 const flags=[{archived:true},{is_archived:true},{active:false},{is_published:false},{status:'removed'},{withdrawn:true}];
 const list=flags.map((f,i)=>card('off'+i,i,f));list.push(card('normal-hidden',9,{hidden:true}));assert.equal(catalogueNormalCards(list,2).length,1);
});
test('Une Secrète ajoutée ou retirée ne change ni total, ni progression, ni révision publique',()=>{
 const list=[card('a'),card('b',2)],before=cataloguePublicMetadata(list);list.push(card('secret',131,{variant:'secret'}));
 assert.equal(catalogueSeriesMetrics(list,2,{a:1,secret:1}).percent,50);assert.deepEqual(cataloguePublicMetadata(list),before);list[2].archived=true;assert.deepEqual(cataloguePublicMetadata(list),before);
});
test('La numérotation compacte suit l’ordre historique, pas un nouveau tri de rareté',()=>{
 const list=[card('c',7,{rarity:'common'}),card('l',20,{rarity:'legendary'}),card('e',8,{rarity:'epic'}),card('secret',131,{variant:'secret'})];
 const before=structuredClone(list),index=catalogueDisplayIndex(list);assert.equal(index.get('c').number,1);assert.equal(index.get('e').number,2);assert.equal(index.get('l').number,3);assert.match(catalogueEditionText(list[3],index),/131.*HORS SÉRIE/);assert.deepEqual(list,before);
});
test('Un archivage compacte seulement les normales, sans toucher aux identifiants/références',()=>{
 const list=[card('a',3),card('b',53,{archived:true}),card('c',103)],state={owned:{a:1,b:2,c:1},deck:['a','b','c'],coins:500};const copy=structuredClone(state),index=catalogueDisplayIndex(list);
 assert.equal(index.get('c').number,2);assert.equal(list[2].editionNumber,103);assert.match(catalogueEditionText(list[1],index),/053.*ARCHIVE/);assert.deepEqual(state,copy);
});
test('Progression 45/90 = 50 %, séries vides = 0/0, copies et propriétés héritées exclues',()=>{
 const list=Array.from({length:90},(_,i)=>card('n'+i,i+1)),owned=Object.fromEntries(list.slice(0,45).map(c=>[c.id,5]));
 assert.deepEqual([catalogueSeriesMetrics(list,2,owned).owned,catalogueSeriesMetrics(list,2,owned).percent],[45,50]);assert.deepEqual([catalogueSeriesMetrics(list,8).total,catalogueSeriesMetrics(list,8).percent],[0,0]);
 assert.equal(catalogueOwnedCopies(Object.create({n0:1}),'n0'),0);for(const bad of [null,[],[1],'1',true])assert.equal(catalogueOwnedCopies(bad,'0'),0);for(const value of [NaN,Infinity,-1,.5])assert.equal(catalogueOwnedCopies({n0:value},'n0'),0);
});
test('Les getters privés ne sont jamais invoqués pour classifier ou numéroter',()=>{
 const hidden={id:'unknown',hidden:true,get name(){throw Error('private');},get rarity(){throw Error('private');},get variant(){throw Error('private');}};
 const normal=card('safe',4);Object.defineProperty(normal,'name',{get(){throw Error('private');}});Object.defineProperty(normal,'rarity',{get(){throw Error('private');}});
 assert.equal(catalogueNormalCards([hidden,normal]).length,1);assert.equal(catalogueDisplayIndex([hidden,normal]).size,1);assert.equal(catalogueSeriesMetrics([hidden,normal],2).total,1);
});
test('La projection publique ne révèle ni ID, ni nombre, ni métadonnée de Secrète',()=>{
 const s=card('private-id',131,{variant:'secret',name:'SECRET NAME'}),meta=cataloguePublicMetadata([card('normal'),s],[{number:3}]);
 assert.ok(!JSON.stringify(meta).includes('private-id'));assert.ok(!JSON.stringify(meta).includes('SECRET NAME'));assert.equal(meta.seriesTotals[3].normalTotal,0);assert.equal(meta.displayById.normal.number,1);
});
test('Un snapshot serveur public conserve comptes et numéros entre deux comptes masqués',()=>{
 const full=[card('a',1),card('b',2),card('c',3),card('s',131,{variant:'secret'})],meta=cataloguePublicMetadata(full);
 const first=createAutoCatalogue(full,{publicMetadata:meta}),second=createAutoCatalogue([full[1],{id:'secret-unknown',hidden:true}],{publicMetadata:meta});
 assert.equal(first.metrics(2,{b:1}).total,3);assert.equal(second.metrics(2,{b:1}).total,3);assert.equal(second.display().get('b').number,2);assert.equal(second.metrics(2,{b:1}).owned,1);
});
test('Un remplacement sans métadonnée invalide la projection précédente et les anciens numéros',()=>{
 const list=[card('a'),card('b',2)],model=createAutoCatalogue(list,{publicMetadata:cataloguePublicMetadata(list)});list.push(card('c',3));model.replace(list);assert.equal(model.metrics(2).total,3);list[0].archived=true;model.replace(list);assert.equal(model.display().get('c').number,2);
});
test('Une métadonnée incohérente ou incluant une Secrète est rejetée',()=>{
 const list=[card('a'),card('s',131,{variant:'secret'})],meta=JSON.parse(JSON.stringify(cataloguePublicMetadata(list)));meta.displayById.s={series:2,number:2,total:2};meta.seriesTotals[2].total=meta.seriesTotals[2].normalTotal=2;
 const model=createAutoCatalogue(list,{publicMetadata:meta});assert.equal(model.metrics(2).total,1);assert.equal(model.display().get('s').secret,true);
});
test('Une rareté locale modifiée ne peut pas garder les agrégats d’un ancien snapshot',()=>{
 const old=card('same',1,{rarity:'rare'}),changed={...old,rarity:'epic'},meta=cataloguePublicMetadata([old]);
 const model=createAutoCatalogue([changed],{publicMetadata:meta});
 assert.equal(model.metrics(2).total,1);assert.equal(model.metrics(2).byRarity.epic,1);assert.equal(model.metrics(2).byRarity.rare,0);
 assert.notEqual(model.metadata().revision,meta.revision);
});
test('Agrégats serveur : somme, clés et quantités doivent correspondre au total normal',()=>{
 const list=[card('a')],original=cataloguePublicMetadata(list);
 const malformed=[
  meta=>{meta.seriesTotals[2].byRarity.rare=0;},
  meta=>{meta.seriesTotals[2].byRarity.common=1;},
  meta=>{meta.seriesTotals[2].byRarity.secret=0;},
  meta=>{delete meta.seriesTotals[2].byRarity.ultra;},
  meta=>{meta.seriesTotals[2].byRarity.rare=-1;},
  meta=>{meta.seriesTotals[2].byRarity.rare=.5;},
  meta=>{meta.seriesTotals[2].byRarity.rare=Infinity;}
 ];
 for(const alter of malformed){
  const meta=structuredClone(original);alter(meta);
  const model=createAutoCatalogue(list,{publicMetadata:meta});
  assert.deepEqual(model.metadata(),original);
 }
});
test('Un payload partiel valide reste accepté : une rareté masquée n’est pas convertie en commune',()=>{
 const full=[card('a',1,{rarity:'rare'}),card('b',2,{rarity:'epic'})],meta=cataloguePublicMetadata(full);
 const hidden={id:'b',editionSeries:2,hidden:true,variant:'standard'};
 const model=createAutoCatalogue([full[0],hidden],{publicMetadata:meta}),metrics=model.metrics(2,{a:1});
 assert.equal(model.metadata().revision,meta.revision);assert.equal(metrics.total,2);assert.equal(metrics.owned,1);
 assert.equal(metrics.byRarity.common,0);assert.equal(metrics.byRarity.rare,1);assert.equal(metrics.byRarity.epic,1);
});
test('Les clés de série et numéros du snapshot doivent rester canoniques et numériques',()=>{
 const list=[card('a')],source=cataloguePublicMetadata(list),alias=structuredClone(source);
 alias.seriesTotals['02']={...alias.seriesTotals[2]};
 assert.equal(createAutoCatalogue(list,{publicMetadata:alias}).metrics().total,1);
 for(const field of ['series','number','total']){
  const meta=structuredClone(source);meta.displayById.a[field]=String(meta.displayById.a[field]);
  const model=createAutoCatalogue(list,{publicMetadata:meta});
  assert.equal(model.metrics(2,{a:1}).owned,1);assert.equal(typeof model.metadata().displayById.a[field],'number');
 }
});
test('Le script serveur est généré à l’identique depuis le moteur partagé',()=>{
 const source=fs.readFileSync(new URL('../../58-catalogue.js',import.meta.url),'utf8'),server=fs.readFileSync(new URL('../../backend/catalogue-core.js',import.meta.url),'utf8');
 assert.equal(server,'/* GENERATED from 58-catalogue.js. Run node tools/catalogue/build-server-core.mjs. */\n'+source.replace(/^export /gm,''));
});
