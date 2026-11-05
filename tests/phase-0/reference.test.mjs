import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {compareSynthetic} from '../../tools/phase-0/compare-synthetic.mjs';
import {createHash,randomUUID} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
globalThis.fetch=()=>{throw Error('Network prohibited in phase 0 tests');};
function fragment(file){
 const ctx=vm.createContext({crypto:{randomUUID},fail:(status,message)=>{throw Object.assign(new Error(message),{status});},getPackMap:()=>({starter:{name:'Test booster'}})});
 vm.runInContext(read('backend/catalogue-core.js'),ctx,{filename:'backend/catalogue-core.js',timeout:1000});
 vm.runInContext(read(file),ctx,{filename:file,timeout:1000});return ctx;
}
function fixture(){
 const state=(coins,owned)=>({coins,dust:25,owned,deck:[],deckDouble:[],favorites:[]});
 return {cards:[{id:'fiction-a',name:'Carte fictive A',rarity:'rare',variant:'standard',editionSeries:2},{id:'fiction-b',name:'Carte fictive B',rarity:'epic',variant:'standard',editionSeries:2}],users:[{id:'fiction-seller',role:'player',pseudo:'Fictif A',state:state(1000,{'fiction-a':2,'fiction-b':1})},{id:'fiction-buyer',role:'player',pseudo:'Fictif B',state:state(2000,{'fiction-b':1})}],series:[{number:2,name:'Série fictive',targetCount:2}]};
}
const count=(db,id)=>db.users.reduce((n,u)=>n+(u.state.owned[id]||0),0)+(db.listingsV11||[]).filter(l=>l.status==='active'&&l.cardId===id).length;
const money=db=>db.users.reduce((n,u)=>n+u.state.coins,0);
test('Référence phase 0 : fichiers inchangés et baseline historique des fichiers V13 modifiés',()=>{
 const manifest=JSON.parse(read('docs/phase-0/source-inventory.json'));
 assert.ok(manifest.files.length>40);
 const revised=new Set(['index.html','06-v10-cards.js','04-games-ui.js','09-mashup-updates.js','10-development-journal.js','12-booster-reveal.js','20-market-v10-9.js','18-v10-8-collection.js','patrons/index.html','content/convergence-series2.json','backend/collection-rewards-v10-8.js','backend/collection-rewards-v10-9.js','backend/achievements-v11.js','backend/leaderboards-v11.js','32-v12-performance.js','version.json']);
 for(const f of manifest.files){
  const bytes=revised.has(f.path)?spawnSync('git',['show','d6ed7db3e522d41f4cb1ed91b4ed09aa88539e49:'+f.path],{cwd:root}):null;
  if(bytes)assert.equal(bytes.status,0,'Baseline historique '+f.path);
  assert.equal(createHash('sha256').update(bytes?bytes.stdout:fs.readFileSync(path.join(root,f.path))).digest('hex'),f.sha256,f.path);
 }
 assert.ok(manifest.calls.some(c=>c.route==='/api/packs/commit'));
});
test('Syntaxe : tous les modules racine sont compilables',()=>{
 const files=fs.readdirSync(root).filter(x=>x.endsWith('.js'));
 for(const file of files){
  const result=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
  assert.equal(result.status,0,file+': '+result.stderr);
 }
 assert.ok(files.length>=13);
});
test('Rendu cartes : masquage, possession/admin et échappement du nom',async()=>{
 const {renderMashupV10Card:render}=await import(path.join(root,'06-v10-cards.js'));
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const context={esc,safeImage:()=>'',CSSColor:(_,fallback)=>fallback,statValue:()=>50,STAT_FIELDS:['power','size','def','aura','intelligence'].map(key=>({key,label:key})),RARITIES:{rare:{}},rarityName:()=> 'Rare',editionText:()=> 'S02',onlineUser:{role:'player'},state:{owned:{}}};
 const card={id:'fiction-a',name:'<img onerror="fiction">',rarity:'rare'};
 assert.match(render(card,{},context),/CARTE INCONNUE/);
 context.state.owned[card.id]=1;
 const html=render(card,{},context);assert.match(html,/&lt;img/);assert.ok(!html.includes('<img onerror='));
 context.state.owned={};context.onlineUser.role='admin';assert.match(render(card,{},context),/v101-card/);
 assert.match(render({...card,hidden:true},{},context),/CARTE INCONNUE/);
});
test('Marché : séquestre puis annulation restitue exactement une copie',()=>{
 const c=fragment('backend/market-v11.js'),db=fixture(),seller=db.users[0];seller.state.deck=['fiction-a'];
 const before=count(db,'fiction-a'),credits=money(db);
 const {listing}=c.marketV11Create(db,seller,{cardId:'fiction-a',price:100});
 assert.equal(seller.state.owned['fiction-a'],1);assert.equal(count(db,'fiction-a'),before);
 c.marketV11Cancel(db,seller,listing.id);assert.equal(count(db,'fiction-a'),before);assert.equal(money(db),credits);
 assert.throws(()=>c.marketV11Cancel(db,seller,listing.id),{status:409});
});
test('Marché : achat unique conserve crédits et cartes, retire dernière copie du deck',()=>{
 const c=fragment('backend/market-v11.js'),db=fixture(),[seller,buyer]=db.users;seller.state.owned['fiction-a']=1;seller.state.deck=['fiction-a'];
 const cards=count(db,'fiction-a'),credits=money(db);
 const {listing}=c.marketV11Create(db,seller,{cardId:'fiction-a',price:100});assert.equal(seller.state.deck.length,0);
 c.marketV11Buy(db,buyer,listing.id);assert.equal(count(db,'fiction-a'),cards);assert.equal(money(db),credits);assert.equal(buyer.state.coins,1900);
 assert.throws(()=>c.marketV11Buy(db,buyer,listing.id),{status:409});
});
test('Marché : prix invalide et fonds insuffisants sans mutation',()=>{
 const c=fragment('backend/market-v11.js'),db=fixture(),[seller,buyer]=db.users;
 const before=JSON.stringify(db);assert.throws(()=>c.marketV11Create(db,seller,{cardId:'fiction-a',price:1.5}),{status:400});assert.equal(JSON.stringify(db),before);
 const {listing}=c.marketV11Create(db,seller,{cardId:'fiction-a',price:3000});const listed=JSON.stringify(db);
 assert.throws(()=>c.marketV11Buy(db,buyer,listing.id),{status:409});assert.equal(JSON.stringify(db),listed);
});
test('Échange : revalidation, transfert unique et conservation',()=>{
 const c=fragment('backend/market-v10-9.js'),db=fixture(),[a,b]=db.users;
 const cardsA=count(db,'fiction-a'),cardsB=count(db,'fiction-b'),credits=money(db);
 const {trade}=c.tradeNew(db,a,{to:b.id,offer:[{id:'fiction-a',qty:1}],request:[{id:'fiction-b',qty:1}],offerCredits:50,requestCredits:0});
 c.tradeRespond(db,b,{id:trade.id,action:'accept'});
 assert.equal(count(db,'fiction-a'),cardsA);assert.equal(count(db,'fiction-b'),cardsB);assert.equal(money(db),credits);
 assert.throws(()=>c.tradeRespond(db,b,{id:trade.id,action:'accept'}),{status:409});
});
test('Échange : inventaire insuffisant à acceptation ne transfère rien',()=>{
 const c=fragment('backend/market-v10-9.js'),db=fixture(),[a,b]=db.users;
 const {trade}=c.tradeNew(db,a,{to:b.id,offer:[{id:'fiction-a',qty:1}],request:[],offerCredits:0,requestCredits:0});
 a.state.owned['fiction-a']=0;const before=JSON.stringify(db);
 assert.throws(()=>c.tradeRespond(db,b,{id:trade.id,action:'accept'}),{status:409});assert.equal(JSON.stringify(db),before);
});
test('Collection : palier unique et bon attribué une seule fois',()=>{
 const c=fragment('backend/collection-rewards-v10-9.js'),db=fixture(),a=db.users[0];
 db.collectionRewardConfigV109={50:{credits:600,boosterId:'starter'}};
 c.claimCollectionReward(a,db,2,50);assert.equal(a.state.coins,1600);assert.equal(a.packVouchersV109.starter,1);
 assert.throws(()=>c.claimCollectionReward(a,db,2,50),{status:409});assert.equal(a.packVouchersV109.starter,1);
});
test('Succès : récompense unique et refus si non atteint',()=>{
 const c=fragment('backend/achievements-v11.js'),db=fixture(),a=db.users[0];a.state.opened=100;
 c.achievementV11Claim(a,db,'booster_100');assert.equal(a.state.coins,1850);
 assert.throws(()=>c.achievementV11Claim(a,db,'booster_100'),{status:409});assert.throws(()=>c.achievementV11Claim(a,db,'ultra_secret'),{status:409});
});
test('Missions : calendrier Paris hiver/été et bascules DST',()=>{
 const c=fragment('backend/missions-engine-v10-6.js');
 for(const [iso,day] of [['2026-01-04T23:30:00Z','2026-01-05'],['2026-07-05T22:30:00Z','2026-07-06'],['2026-03-29T00:30:00Z','2026-03-29'],['2026-03-29T01:30:00Z','2026-03-29'],['2026-10-25T00:30:00Z','2026-10-25'],['2026-10-25T01:30:00Z','2026-10-25']])assert.equal(c.missionParisKeys(new Date(iso)).day,day);
 assert.equal(c.missionParisKeys(new Date('2026-01-04T23:30:00Z')).week,'2026-01-05');
});
test('Missions : gain quotidien unique, renouvellement sans perdre hebdomadaire',()=>{
 const c=fragment('backend/missions-engine-v10-6.js'),db=fixture(),a=db.users[0],date=new Date('2026-11-04T12:00:00Z');
 c.missionRecordEvent(a,'packs',1,date);c.missionClaimReward(a,db,'daily','booster',date);assert.equal(a.state.coins,1090);
 assert.throws(()=>c.missionClaimReward(a,db,'daily','booster',date),{status:409});
 c.missionRollover(a,new Date('2026-11-05T12:00:00Z'));assert.equal(a.missionsV106.daily.packs,0);assert.equal(a.missionsV106.weekly.packs,1);
});
test('R03 corrigé : une réponse Jeux tardive ne remplace pas le nouvel écran',async()=>{
 const ctx=vm.createContext({Date,Number,String,Math,Set,console,document:{addEventListener(){},getElementById(){return null;},querySelector(){return null;},hidden:false},setInterval:()=>1,setTimeout:()=>1,clearTimeout(){}});
 vm.runInContext(read('04-games-ui.js').replace('export function createGamesUI','function createGamesUI'),ctx);
 let currentView='games';let resolve;const api=()=>new Promise(r=>resolve=r);const ui=ctx.createGamesUI({api,getView:()=>currentView,toast(){},getUser:()=>({id:'fiction'}),showArena(){}});
 const element={isConnected:true,innerHTML:''};const pending=ui.mount(element);element.innerHTML='COLLECTION_TEST';currentView='collection';resolve({now:Date.now()});await pending;
 assert.equal(element.innerHTML,'COLLECTION_TEST');
});

test('Copie fichier synthétique : écriture, relecture et comparaison exacte (pas SQL)',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mashup-phase0-'));
 try{
  const source={fixtureKind:'mashup-phase0-synthetic-v1',game:fixture(),claims:{fiction:true},pending:{opening:'fiction-opening'}};
  const backup=path.join(dir,'synthetic.json'),restored=path.join(dir,'restored.json');
  fs.writeFileSync(backup,JSON.stringify(source),{mode:0o600});fs.copyFileSync(backup,restored);
  assert.equal(compareSynthetic(source,JSON.parse(fs.readFileSync(restored,'utf8'))),true);
 }finally{fs.rmSync(dir,{recursive:true});}
});
test('Comparateur : corruption, champ perdu et format non synthétique refusés',()=>{
 const expected={fixtureKind:'mashup-phase0-synthetic-v1',game:fixture(),claims:{fiction:true}};
 const corrupted=structuredClone(expected);corrupted.game.users[0].state.dust--;
 assert.throws(()=>compareSynthetic(expected,corrupted));
 const missing=structuredClone(expected);delete missing.claims;assert.throws(()=>compareSynthetic(expected,missing));
 assert.throws(()=>compareSynthetic({},{}));
});
