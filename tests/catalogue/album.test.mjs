import test from 'node:test';
import assert from 'node:assert/strict';
import {albumMarkup,albumProgress,paginateAlbum} from '../../43-v15-album.js';
import {createAutoCatalogue} from '../../58-catalogue.js';

const card=(id,number,overrides={})=>({id,name:id,editionSeries:2,editionNumber:number,variant:'standard',rarity:'rare',...overrides});
const normals=count=>Array.from({length:count},(_,i)=>card('normal-'+(i+1),i+10));
const renderCard=c=>'<div class="tcg-card" data-test-card="'+c.id+'"></div>';

test('Album : 45 cartes normales sur 90 donnent exactement 50 %, jamais le targetCount manuel',()=>{
 const catalogue=normals(90).concat(card('secret',131,{variant:'secret'}));
 const owned=Object.fromEntries(catalogue.slice(0,45).map(c=>[c.id,9]));owned.secret=3;
 const progress=albumProgress({catalogue,owned,series:{number:2,targetCount:130}});
 assert.deepEqual(progress,{total:90,obtained:45,percent:50,complete:false,discoveries:1});
 const html=albumMarkup({cards:catalogue.slice(0,6),catalogue,owned,series:{number:2,targetCount:1000},renderCard,pageSize:6});
 assert.match(html,/45 \/ 90/);assert.match(html,/width:50%/);assert.doesNotMatch(html,/1000/);
});

test('Album : création, archivage et restauration recalculent progression et numéros sans modifier les références',()=>{
 const a=card('a',5),b=card('b',20),c=card('c',80),owned={a:2,b:1,c:4};
 const baseline=[a,b,c],before=JSON.stringify({baseline,owned});
 assert.deepEqual(paginateAlbum({cards:baseline,owned}).slots.map(s=>s.number),[1,2,3]);
 const archived=[a,{...b,archived:true},c];
 assert.deepEqual(paginateAlbum({cards:archived,owned}).slots.map(s=>s.number),[1,2]);
 assert.equal(albumProgress({catalogue:archived,owned}).total,2);
 const restored=[a,{...b,archived:false},c,card('new',100)];
 assert.deepEqual(paginateAlbum({cards:restored,owned}).slots.map(s=>s.number),[1,2,3,4]);
 assert.equal(albumProgress({catalogue:restored,owned}).percent,75);
 assert.equal(JSON.stringify({baseline,owned}),before);assert.equal(b.editionNumber,20);
});

test('Album : recherche, tri et pagination ne renumérotent jamais une sélection filtrée',()=>{
 const catalogue=normals(30),filtered=[catalogue[19],catalogue[4]];
 const result=paginateAlbum({cards:filtered,catalogue,pageSize:6});
 assert.deepEqual(result.slots.map(s=>s.number),[20,5]);
 const model=createAutoCatalogue(catalogue);
 const explicit=paginateAlbum({cards:filtered,catalogue,displayIndex:model.display()});
 assert.deepEqual(explicit.slots.map(s=>s.number),[20,5]);
});

test('Album : ajout ou retrait de Secrète ne change ni le total normal ni ses numéros',()=>{
 const catalogue=normals(3),secret=card('secret',131,{variant:'secret',rarity:'ultra'}),owned={secret:1};
 const ordinary=paginateAlbum({cards:catalogue});
 const unknown=paginateAlbum({cards:[...catalogue,secret]});
 assert.deepEqual(unknown,ordinary);
 const known=paginateAlbum({cards:[...catalogue,secret],owned});
 assert.deepEqual(known.slots.map(s=>s.number),[1,2,3,131]);
 assert.equal(albumProgress({catalogue:[...catalogue,secret],owned}).total,3);
 const html=albumMarkup({cards:[...catalogue,secret],owned,renderCard});
 assert.match(html,/Hors série · N° 131/);
});

test('Album : métadonnées normales canoniques assurent le même dénominateur sur un payload redigé',()=>{
 const cards=normals(2),owned={'normal-1':1};
 const html=albumMarkup({cards,catalogue:cards,owned,metrics:{total:90,owned:1},series:{number:2,targetCount:500},renderCard});
 assert.match(html,/1 \/ 90/);assert.match(html,/width:1%/);
 const empty=albumProgress({catalogue:[],metrics:{total:0,owned:0}});
 assert.equal(empty.total,0);assert.equal(empty.percent,0);assert.equal(empty.complete,false);
});

test('Album : doublons archivés et indicateurs de retrait ne produisent aucun emplacement actif',()=>{
 const a=card('same',1),retired={...a,archived:true};
 const catalogue=[a,retired,card('unpublished',2,{is_published:false}),card('inactive',3,{active:false}),card('ok',4)];
 assert.equal(paginateAlbum({cards:catalogue}).total,1);
 assert.equal(albumProgress({catalogue,owned:{same:10,ok:1}}).total,1);
 assert.deepEqual(paginateAlbum({cards:catalogue}).slots.map(s=>s.number),[1]);
});


test('Album : une série sélectionnée ne compte pas les cartes ou découvertes des autres séries',()=>{
 const catalogue=[...normals(3),card('other-normal',1,{editionSeries:3}),card('other-secret',90,{editionSeries:3,variant:'secret'})];
 const owned={'normal-1':1,'other-normal':1,'other-secret':1};
 const progress=albumProgress({catalogue,owned,series:{number:2,targetCount:999}});
 assert.deepEqual(progress,{obtained:1,total:3,percent:33,complete:false,discoveries:0});
});

function partialAlbumFixture(){
 const full=[card('canonical-a',10),card('canonical-b',20),card('canonical-c',30)];
 const payload=[full[1]],owned={'canonical-b':1};
 const model=createAutoCatalogue(payload,{publicMetadata:createAutoCatalogue(full).metadata()});
 return {full,payload,owned,model};
}

test('Album incomplet : opt-in complète les pochettes depuis la projection normale canonique',()=>{
 const {payload,owned,model}=partialAlbumFixture();
 const window=paginateAlbum({cards:payload,catalogue:payload,owned,displayIndex:model.display(),seriesNumber:2,completeNormalSlots:true});
 assert.equal(window.total,3);assert.equal(window.pages,1);
 assert.deepEqual(window.slots.map(slot=>slot.number),[1,2,3]);
 assert.deepEqual(window.slots[0],{owned:false,quantity:0,number:1});
 assert.equal(window.slots[1].card,payload[0]);
 assert.deepEqual(window.slots[2],{owned:false,quantity:0,number:3});
 const calls=[];
 const html=albumMarkup({cards:payload,catalogue:payload,owned,displayIndex:model.display(),metrics:model.metrics(2,owned),series:{number:2},completeNormalSlots:true,renderCard:c=>{calls.push(c.id);return '<div class="real-card"></div>';}});
 assert.match(html,/1 \/ 3/);assert.match(html,/Emplacements 1–3 sur 3/);
 assert.equal((html.match(/class="v15-album-slot(?: |")/g)||[]).length,3);
 assert.deepEqual(calls,['canonical-b']);
 for(const id of ['canonical-a','canonical-b','canonical-c'])assert.ok(!html.includes(id));
});

test('Album incomplet : une normale possédée sans visuel garde sa quantité, sans renderer ni référence DOM',()=>{
 const {payload,model}=partialAlbumFixture(),owned={'canonical-a':4,'canonical-b':1,'canonical-c':2};
 const window=paginateAlbum({cards:payload,catalogue:payload,owned,displayIndex:model.display(),seriesNumber:2,completeNormalSlots:true});
 assert.deepEqual(window.slots[0],{owned:true,quantity:4,number:1,unavailable:true});
 assert.deepEqual(window.slots[2],{owned:true,quantity:2,number:3,unavailable:true});
 let calls=0;
 const html=albumMarkup({cards:payload,catalogue:payload,owned,displayIndex:model.display(),metrics:model.metrics(2,owned),series:{number:2},completeNormalSlots:true,renderCard:()=>{calls++;return '<div></div>';}});
 assert.equal(calls,1);assert.match(html,/Série complète · 3 \/ 3/);
 assert.equal((html.match(/v15-album-slot-unavailable/g)||[]).length,2);
 assert.match(html,/4 exemplaires/);assert.match(html,/2 exemplaires/);assert.match(html,/Visuel indisponible/);
 assert.doesNotMatch(html,/canonical-a|canonical-c|data-id=/);
});

test('Album incomplet : l’opt-in ne lit aucun contenu d’un visuel normal masqué ou composé de getters',()=>{
 const {full,model}=partialAlbumFixture();
 const hidden={id:'canonical-a',hidden:true};
 for(const field of ['name','rarity','art','editionNumber','editionSeries'])Object.defineProperty(hidden,field,{get(){throw Error('Private '+field);}});
 const metadataOnly={id:'canonical-c',editionSeries:2,variant:'standard'};
 for(const field of ['name','rarity','art'])Object.defineProperty(metadataOnly,field,{get(){throw Error('Private '+field);}});
 const payload=[full[1],hidden,metadataOnly],owned={'canonical-a':3,'canonical-b':1,'canonical-c':5};
 const html=albumMarkup({cards:payload,catalogue:payload,owned,displayIndex:model.display(),metrics:{total:3,owned:3},series:{number:2},completeNormalSlots:true,renderCard:c=>{assert.equal(c.id,'canonical-b');return '<div></div>';}});
 assert.equal((html.match(/v15-album-slot-unavailable/g)||[]).length,2);
 assert.doesNotMatch(html,/canonical-a|canonical-c|Private/);
});

test('Album incomplet : les Secrètes de l’index et les autres séries ne créent aucun emplacement',()=>{
 const {payload,owned,model}=partialAlbumFixture(),index=model.display();
 const secretEntry={secret:true};
 for(const field of ['number','total','series','name','rarity','art'])Object.defineProperty(secretEntry,field,{get(){throw Error('Secret '+field);}});
 index.set('NEVER-EXPOSE-SECRET',secretEntry);
 index.set('OTHER-SERIES',{secret:false,number:1,total:1,series:3});
 const html=albumMarkup({cards:payload,catalogue:payload,owned,displayIndex:index,metrics:{total:3,owned:1},series:{number:2},completeNormalSlots:true,renderCard:()=>'<div></div>'});
 assert.match(html,/Emplacements 1–3 sur 3/);assert.doesNotMatch(html,/NEVER-EXPOSE-SECRET|OTHER-SERIES/);
 assert.equal((html.match(/class="v15-album-slot(?: |")/g)||[]).length,3);
});

test('Album incomplet : paramètres explicites requis, aucune expansion d’une vue filtrée par défaut',()=>{
 const {payload,owned,model}=partialAlbumFixture();
 const base={cards:payload,catalogue:payload,owned,displayIndex:model.display()};
 for(const options of [{},{completeNormalSlots:true},{completeNormalSlots:true,seriesNumber:0},{completeNormalSlots:true,seriesNumber:NaN},{completeNormalSlots:'true',seriesNumber:2},{completeNormalSlots:true,seriesNumber:2,displayIndex:undefined}]){
  const result=paginateAlbum({...base,...options});assert.equal(result.total,1);assert.equal(result.slots[0].card,payload[0]);
 }
 const html=albumMarkup({...base,series:{number:2},metrics:model.metrics(2,owned),renderCard:()=>'<div></div>'});
 assert.match(html,/Emplacements 1–1 sur 1/);
});

test('Album complet : même avec opt-in, l’ordre, les filtres et les références fournis restent identiques',()=>{
 const {full}=partialAlbumFixture(),model=createAutoCatalogue(full),owned={'canonical-a':1,'canonical-b':1,'canonical-c':1};
 const cards=[full[2],full[0]],base={cards,catalogue:full,owned,displayIndex:model.display(),seriesNumber:2};
 assert.deepEqual(paginateAlbum({...base,completeNormalSlots:true}),paginateAlbum(base));
 const input=Object.freeze(full.map(c=>Object.freeze({...c}))),before=JSON.stringify({input,owned});
 albumMarkup({cards:input,catalogue:input,owned,displayIndex:model.display(),series:{number:2},completeNormalSlots:true,renderCard});
 assert.equal(JSON.stringify({input,owned}),before);
});

test('Album incomplet : pagination reste bornée et les possessions absentes du payload se répartissent sans doublons',()=>{
 const full=normals(91),payload=[full[0]],owned=Object.fromEntries(full.slice(0,45).map(c=>[c.id,2]));
 const model=createAutoCatalogue(payload,{publicMetadata:createAutoCatalogue(full).metadata()});
 let rendered=0;
 const html=albumMarkup({cards:payload,catalogue:payload,owned,displayIndex:model.display(),metrics:model.metrics(2,owned),series:{number:2},completeNormalSlots:true,pageSize:6,renderCard:()=>{rendered++;return '<div></div>';}});
 assert.equal(rendered,1);assert.match(html,/45 \/ 91/);assert.match(html,/Emplacements 1–6 sur 91/);assert.match(html,/Page 1 sur 16/);
 assert.equal((html.match(/class="v15-album-slot(?: |")/g)||[]).length,6);
 const last=paginateAlbum({cards:payload,catalogue:payload,owned,displayIndex:model.display(),seriesNumber:2,completeNormalSlots:true,page:15,pageSize:6});
 assert.equal(last.total,91);assert.equal(last.slots.length,1);assert.equal(last.slots[0].number,91);
});

test('Album incomplet : une projection contradictoire ou incomplète n’autorise pas des emplacements inventés',()=>{
 const {payload,owned}=partialAlbumFixture(),index=new Map([['canonical-b',{secret:false,series:2,number:2,total:3}]]);
 const result=paginateAlbum({cards:payload,catalogue:payload,owned,displayIndex:index,seriesNumber:2,completeNormalSlots:true});
 assert.equal(result.total,1);assert.equal(result.slots[0].number,2);
});
