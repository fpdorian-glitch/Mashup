import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';

const backend=new URL('../../backend/',import.meta.url);
function load(...files){
 const context=vm.createContext({
  crypto:{randomUUID},
  fail:(status,message)=>{throw Object.assign(new Error(message),{status});},
  getPackMap:()=>({starter:{name:'Booster fictif'},cosmos:{name:'Cosmos fictif'}}),
  fetch:()=>assert.fail('Network prohibited in catalogue backend tests')
 });
 for(const file of ['catalogue-core.js',...files])vm.runInContext(fs.readFileSync(new URL(file,backend),'utf8'),context,{filename:file,timeout:1000});
 return context;
}
function fixture(){
 const cards=[
  {id:'fiction-a',name:'A',editionSeries:1,editionNumber:1,rarity:'common',variant:'standard'},
  {id:'fiction-b',name:'B',editionSeries:1,editionNumber:2,rarity:'rare',variant:'standard'},
  {id:'fiction-c',name:'C',editionSeries:2,editionNumber:7,rarity:'epic',variant:'gold'},
  {id:'fiction-d',name:'D',editionSeries:2,editionNumber:9,rarity:'ultra',variant:'standard'},
  {id:'fiction-secret',name:'Confidential secret',editionSeries:2,editionNumber:110,rarity:'ultra',variant:'secret'},
  {id:'fiction-retired',name:'Retired',editionSeries:2,editionNumber:3,rarity:'rare',variant:'standard',archived:true}
 ];
 const user={id:'fiction-player',role:'player',state:{coins:1000,dust:9,owned:{'fiction-a':2,'fiction-b':1,'fiction-c':1,'fiction-d':0,'fiction-secret':1,'fiction-retired':7},deck:['fiction-a','fiction-retired'],deckDouble:['fiction-a','fiction-c','fiction-retired'],favorites:['fiction-retired'],opened:5,wins:2},collectionRewardsV108:{},achievementsV11:{},packVouchersV109:{}};
 return {cards,series:[{number:1,name:'One',targetCount:158},{number:2,name:'Two',targetCount:1},{number:3,name:'Empty',targetCount:77}],users:[user],listingsV11:[{id:'held',cardId:'fiction-retired',seller:user.id,status:'active'}],tradesV109:[{id:'pending',from:user.id,to:'fiction-friend',status:'pending',offer:[{id:'fiction-retired',qty:1}],request:[]}]};
}
const entry=(ctx,db,number,user=db.users[0])=>ctx.collectionRewardSummary(user,db).find(s=>s.series===number);

for(const version of ['collection-rewards-v10-8.js','collection-rewards-v10-9.js']){
 test(version+' : totaux réels, jamais les anciens dénominateurs configurés',()=>{
  const c=load(version),db=fixture(),one=entry(c,db,1),two=entry(c,db,2),empty=entry(c,db,3);
  assert.equal(one.total,2);assert.equal(one.owned,2);assert.equal(one.percent,100);
  assert.equal(two.total,2);assert.equal(two.owned,1);assert.equal(two.percent,50);
  assert.equal(empty.total,0);assert.equal(empty.percent,0);assert.ok(empty.tiers.every(t=>!t.unlocked));
  assert.throws(()=>c.claimCollectionReward(db.users[0],db,3,25),{status:409});
 });
 test(version+' : ajout, archivage et restauration actualisent le même catalogue sans perdre les références',()=>{
  const c=load(version),db=fixture(),u=db.users[0],history=JSON.stringify({users:db.users,listings:db.listingsV11,trades:db.tradesV109});
  const added={id:'fiction-new',name:'New',editionSeries:2,rarity:'common',variant:'standard'};
  db.cards.push(added);assert.equal(entry(c,db,2).total,3);assert.equal(entry(c,db,2).percent,33);
  added.archived=true;assert.equal(entry(c,db,2).total,2);assert.equal(entry(c,db,2).percent,50);
  added.archived=false;assert.equal(entry(c,db,2).total,3);
  db.cards.find(card=>card.id==='fiction-c').archived=true;assert.equal(entry(c,db,2).owned,0);
  assert.equal(u.state.owned['fiction-c'],1);assert.equal(JSON.stringify({users:db.users,listings:db.listingsV11,trades:db.tradesV109}),history);
 });
 test(version+' : Secrètes, doublons et nouvelles séries n’introduisent aucune fausse complétion',()=>{
  const c=load(version),db=fixture();
  db.cards.push({...db.cards[2]});assert.equal(entry(c,db,2).total,2);assert.equal(entry(c,db,2).owned,1);
  const secret={id:'fiction-secret-two',name:'Not public',editionSeries:2,rarity:'mythic',variant:'secret'};db.cards.push(secret);
  assert.equal(entry(c,db,2).total,2);db.cards=db.cards.filter(card=>card.id!==secret.id);assert.equal(entry(c,db,2).total,2);
  db.series.push({number:4,name:'Future'});assert.equal(entry(c,db,4).total,0);
  db.cards.push({id:'fiction-future',editionSeries:4,rarity:'rare',variant:'standard'});assert.equal(entry(c,db,4).total,1);
  db.series.push({number:4,name:'Duplicate setting'},null,{number:-1});assert.equal(c.collectionRewardSummary(db.users[0],db).filter(s=>s.series===4).length,1);
 });
 test(version+' : récompenses et clés réclamées sont conservées après modification du catalogue',()=>{
  const c=load(version),db=fixture(),u=db.users[0];
  c.claimCollectionReward(u,db,2,25);assert.equal(u.state.coins,1300);assert.equal(u.collectionRewardsV108['2:25'],true);
  db.cards.find(card=>card.id==='fiction-d').archived=true;assert.equal(entry(c,db,2).percent,100);
  assert.throws(()=>c.claimCollectionReward(u,db,2,25),{status:409});assert.equal(u.state.coins,1300);
  db.cards.find(card=>card.id==='fiction-d').archived=false;
  c.claimCollectionReward(u,db,2,50);assert.equal(u.state.coins,1900);assert.equal(u.collectionRewardsV108['2:50'],true);
  if(version.includes('v10-9'))assert.equal(u.packVouchersV109.cosmos,1);
  else assert.deepEqual(u.packVouchersV109,{});
  assert.throws(()=>c.claimCollectionReward(u,db,2,50),{status:409});assert.equal(u.state.coins,1900);
  if(version.includes('v10-9'))assert.equal(u.packVouchersV109.cosmos,1);
 });
 test(version+' : seuils monétaires existants et lecture sans mutation',()=>{
  const c=load(version),db=fixture(),before=JSON.stringify(db),row=entry(c,db,2);
  assert.deepEqual(Array.from(row.tiers,t=>[t.percent,t.reward]),[[25,300],[50,600],[75,1000],[100,2000]]);
  assert.equal(JSON.stringify(db),before);
 });
}

test('Classement : cartes distinctes actives, même pourcentage que le cœur, règles de prestige inchangées',()=>{
 const c=load('leaderboards-v11.js'),db=fixture(),u=db.users[0];
 db.cards.push({...db.cards[0]});const result=c.leaderV11Stats(u,db);
 assert.equal(result.collection,3);assert.equal(result.series,75);assert.equal(result.prestige,23);assert.equal(result.rarity,2);
 db.cards.forEach(card=>card.archived=true);const empty=c.leaderV11Stats(u,db);assert.equal(empty.collection,0);assert.equal(empty.series,0);
});
test('Succès : les séries vides ne sont pas complètes et les doublons ne créent pas de réussite',()=>{
 const c=load('achievements-v11.js'),db=fixture(),u=db.users[0];
 db.cards.push({...db.cards[0]});const before=JSON.stringify(db),progress=c.achievementV11Progress(u,db);
 assert.equal(progress.encyclopedia,1);assert.equal(progress.ultra_secret,1);assert.equal(JSON.stringify(db),before);
 db.cards.find(card=>card.id==='fiction-b').archived=true;assert.equal(c.achievementV11Progress(u,db).encyclopedia,1);
 db.cards.filter(card=>card.id==='fiction-a').forEach(card=>card.archived=true);assert.equal(c.achievementV11Progress(u,db).encyclopedia,0);
});
test('Succès : une ancienne complétion garde son claim et ne gagne pas une seconde récompense',()=>{
 const c=load('achievements-v11.js'),db=fixture(),u=db.users[0];
 c.achievementV11Claim(u,db,'encyclopedia');assert.equal(u.state.coins,2400);assert.equal(u.achievementsV11.encyclopedia,true);
 db.cards.push({id:'fiction-added',editionSeries:1,rarity:'rare'});assert.equal(c.achievementV11Progress(u,db).encyclopedia,0);
 db.cards.at(-1).archived=true;assert.equal(c.achievementV11Progress(u,db).encyclopedia,1);
 assert.throws(()=>c.achievementV11Claim(u,db,'encyclopedia'),{status:409});assert.equal(u.state.coins,2400);
});
test('Quantités invalides ou héritées : mêmes possessions dans les métriques, le classement et les succès',()=>{
 const c=load('leaderboards-v11.js','achievements-v11.js'),db=fixture(),u=db.users[0];
 u.state.owned=Object.assign(Object.create({'fiction-a':10}),{'fiction-b':0.5,'fiction-c':2,'fiction-d':NaN,'fiction-secret':-1});
 assert.equal(c.catalogueSeriesMetrics(db.cards,undefined,u.state.owned).owned,1);
 const score=c.leaderV11Stats(u,db);assert.equal(score.collection,1);assert.equal(score.series,25);assert.equal(score.prestige,18);
 assert.equal(c.achievementV11Progress(u,db).ultra_secret,0);
});
test('Projection bootstrap : comptes publics dérivés, cibles héritées ignorées et données privées exclues',()=>{
 const c=load('catalogue-integration.js'),db=fixture();
 Object.defineProperty(db.series[1],'targetCount',{get(){throw Error('Legacy target must never be read');},enumerable:true});
 db.series[1].adminNote='PRIVATE-SERIES-NOTE';const beforeUsers=JSON.stringify(db.users),publicView=c.catalogueBootstrapProjection(db);
 assert.equal(publicView.series.find(s=>s.number===2).targetCount,undefined);
 assert.equal(publicView.series.find(s=>s.number===3).targetCount,undefined);
 assert.ok(publicView.catalogueMeta);assert.equal(publicView.seriesTotals,publicView.catalogueMeta.seriesTotals);
 const json=JSON.stringify(publicView);
 for(const forbidden of ['fiction-player','fiction-secret','Confidential secret','PRIVATE-SERIES-NOTE','state','owned','listingsV11','tradesV109'])assert.ok(!json.includes(forbidden),forbidden);
 const legacy=c.catalogueBootstrapProjection(db,{legacyTargetCount:true});
 assert.equal(legacy.series.find(s=>s.number===1).targetCount,2);assert.equal(legacy.series.find(s=>s.number===2).targetCount,2);assert.equal(legacy.series.find(s=>s.number===3).targetCount,0);
 assert.equal(JSON.stringify(db.users),beforeUsers);
});
test('Projection suivante et autre compte : même dénominateur, progression propre à chaque joueur',()=>{
 const c=load('catalogue-integration.js','collection-rewards-v10-9.js'),db=fixture(),a=db.users[0],b={id:'fiction-other',state:{owned:{'fiction-d':1},coins:1000}};
 assert.equal(entry(c,db,2,a).total,entry(c,db,2,b).total);assert.equal(entry(c,db,2,b).owned,1);
 const first=c.catalogueBootstrapProjection(db).catalogueMeta;
 db.cards.push({id:'fiction-later',editionSeries:2,rarity:'common',variant:'standard'});
 const next=c.catalogueBootstrapProjection(db).catalogueMeta;assert.notEqual(next.revision,first.revision);
 assert.equal(entry(c,db,2,a).total,3);assert.equal(entry(c,db,2,b).total,3);
 assert.equal(entry(c,db,2,a).percent,33);assert.equal(entry(c,db,2,b).percent,33);
});
test('Métadonnées normales : ajouter ou retirer une Secrète ne change pas la projection publique',()=>{
 const c=load('catalogue-integration.js'),db=fixture(),before=JSON.stringify(c.catalogueBootstrapProjection(db));
 db.cards.push({id:'fiction-unseen-secret',name:'DO NOT LEAK',editionSeries:2,rarity:'ultra',variant:'secret'});
 assert.equal(JSON.stringify(c.catalogueBootstrapProjection(db)),before);
 db.cards=db.cards.filter(card=>card.variant!=='secret');assert.equal(JSON.stringify(c.catalogueBootstrapProjection(db)),before);
});
test('Métadonnées : aucun getter privé de Secrète ou de carte masquée n’est exécuté',()=>{
 const c=load('catalogue-integration.js'),db=fixture();
 const poison={id:'fiction-private-secret',variant:'secret',editionSeries:2};
 for(const key of ['name','rarity','editionNumber','art'])Object.defineProperty(poison,key,{get(){throw Error('Private getter '+key);},enumerable:true});
 const hidden={id:'fiction-private-hidden',hidden:true,editionSeries:2};
 Object.defineProperty(hidden,'name',{get(){throw Error('Hidden name getter');},enumerable:true});
 db.cards.push(poison,hidden);const json=JSON.stringify(c.catalogueBootstrapProjection(db));
 assert.ok(!json.includes(poison.id));assert.ok(!json.includes(hidden.id));
});
test('Retrait fictif d’un univers entier : seules ses cartes actives quittent le calcul, tous les liens restent',()=>{
 const c=load('collection-rewards-v10-9.js','achievements-v11.js','leaderboards-v11.js'),db=fixture(),u=db.users[0];
 for(const card of db.cards)if(['fiction-c','fiction-d'].includes(card.id))card.family='Power Rangers';
 db.cards.push({id:'fiction-other-universe',name:'Other universe',editionSeries:2,rarity:'common',variant:'standard',family:'Monster High'});
 u.state.owned['fiction-other-universe']=1;u.state.deck.push('fiction-c');u.state.deckDouble.push('fiction-c');
 db.listingsV11.push({id:'held-pr',cardId:'fiction-c',seller:u.id,status:'active'});
 db.tradesV109[0].offer.push({id:'fiction-c',qty:1});
 const protectedState=JSON.stringify({users:db.users,listings:db.listingsV11,trades:db.tradesV109});
 assert.equal(entry(c,db,2).total,3);assert.equal(entry(c,db,2).percent,66);
 for(const card of db.cards)if(card.editionSeries===2&&card.family==='Power Rangers')card.archived=true;
 assert.equal(entry(c,db,2).total,1);assert.equal(entry(c,db,2).owned,1);assert.equal(entry(c,db,2).percent,100);
 assert.equal(db.cards.find(card=>card.id==='fiction-other-universe').archived,undefined);
 assert.equal(JSON.stringify({users:db.users,listings:db.listingsV11,trades:db.tradesV109}),protectedState);
 assert.equal(c.leaderV11Stats(u,db).collection,3);
});
