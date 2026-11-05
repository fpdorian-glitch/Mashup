/* All catalogue writes in this laboratory affect fictional objects in memory only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {laboratory,fixtureContext,openHome,navigate,ARTIFACTS,saveJson}=require('./harness.cjs');
(async()=>{
 const {catalogueActiveCards,catalogueSeriesMetrics,cataloguePublicMetadata}=await import('../../58-catalogue.js');
 const lab=await laboratory(),report={baseline:'e8461cb',productionRequests:0,checks:[],screenshots:[],limits:'API/Auth intercepted; no physical phone, live database or deployed Edge Function tested.'};
 let page;
 try{
  const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../../content/convergence-series2.json'),'utf8')).cards;
  const cards=raw.filter(c=>!c.archived).map(c=>({...c,family:c.universe,power:c.stats.puissance,size:c.stats.taille,def:c.stats.defense,aura:c.stats.aura,intelligence:c.stats.intelligence,desc:c.description}));
  for(let i=0;i<5;i++)cards.push({...cards[i],id:'fiction-secret-'+i,name:'SECRET-INCONNU-'+i,variant:'secret',editionNumber:131+i});
  cards.push({...cards[50]}); // duplicated snapshot ID must not change any counter.
  const archivedId=raw.find(c=>c.archived).id;
  const series=[{number:1,name:'Origine fictive',targetCount:158},{number:2,name:'Convergence',targetCount:999,description:'130 cartes',color:'#a6ccc3',cover:'✦'},{number:3,name:'Série vide',targetCount:130}];
  const owned=Object.fromEntries(cards.slice(0,45).map(c=>[c.id,2]));
  owned[cards[90].id]=1;owned[archivedId]=2;
  const state={coins:2450,dust:180,owned,deck:[cards[0].id,cards[1].id,cards[2].id],deckDouble:cards.slice(0,6).map(c=>c.id),favorites:[],custom:[],artwork:{},opened:24,wins:3,freePackUsed:true};
  let all=cards.concat(raw.filter(c=>c.archived).map(c=>({...c,family:c.universe,power:c.stats.puissance,size:c.stats.taille,def:c.stats.defense,aura:c.stats.aura,intelligence:c.stats.intelligence,desc:c.description}))),currentUser={id:'fiction-admin',username:'admin@example.invalid',pseudo:'Alex',role:'admin'},currentState=state,withMetadata=false,compactPayload=false;
  const f=await fixtureContext(lab,{data:{cards:all,state,user:currentUser}});page=await f.context.newPage();
  const opaque=()=>catalogueActiveCards(all).filter(c=>!compactPayload||c.id===all[0].id||c.variant==='secret').map(c=>c.variant==='secret'&&currentUser.role!=='admin'&&!currentState.owned[c.id]?{id:c.id,hidden:true,variant:'secret',editionSeries:2}:c);
  const projection=()=>({cards:currentUser.role==='admin'?all:opaque(),...(withMetadata?{catalogueMeta:cataloguePublicMetadata(all,series)}:{})});
  const rewards=()=>series.map(s=>{const m=catalogueSeriesMetrics(all,s.number,currentState.owned);return {series:s.number,name:s.name,owned:m.owned,total:m.total,percent:m.percent,tiers:[25,50,75,100].map(percent=>({percent,reward:300,unlocked:m.total>0&&m.owned*100>=m.total*percent,claimed:false}))};});
  f.controls.set('/api/auth/me',()=>({body:{user:currentUser}}));
  f.controls.set('/api/bootstrap',()=>({body:{...projection(),user:currentUser,state:currentState,series,seriesTotals:{2:{total:999}},profile:{pseudo:currentUser.pseudo},collectionRewards:rewards(),vouchers:{},devPosts:[]}}));
  f.controls.set('/api/collection/rewards',()=>({body:{collectionRewards:rewards()}}));
  f.controls.set('/api/admin/cards/archived',()=>({body:{cards:all.filter(c=>c.archived)}}));
  f.controls.set('/api/admin/cards',({call})=>{
   const input=call.payload.card,id=input.id||'fiction-created-'+(all.length+1),existing=all.find(c=>c.id===id),card=existing?{...existing,...input}:{...input,id,editionNumber:Math.max(0,...all.map(c=>Number(c.editionNumber)||0))+1};
   if(existing)all=all.map(c=>c.id===id?card:c);else{all.push(card);currentState.owned[id]=1;}
   return {body:{...projection(),card,state:currentState}};
  });
  f.controls.set('/api/admin/archive-card',({call})=>{all=all.map(c=>c.id===call.payload.id?{...c,archived:call.payload.archived}:c);return {body:{...projection(),state:currentState}};});
  f.controls.set('/api/admin/series',({call})=>{series.splice(0,series.length,...call.payload.series);return {body:{series}};});
  page.on('dialog',d=>d.type()==='prompt'?d.accept('ARCHIVER'):d.accept());
  await page.addInitScript(()=>localStorage.setItem('mashup-display-v13','high'));await openHome(page,lab.url);
  const shot=async(name,selector)=>{await (selector?page.locator(selector):page).screenshot({path:path.join(ARTIFACTS,name)});report.screenshots.push(name);};
  async function collection(number=2){await navigate(page,'collection');if(await page.locator('[data-action="back-series"]').isVisible())await page.locator('[data-action="back-series"]').click();await page.locator('[data-action="choose-series"][data-series="'+number+'"]').click();await page.locator('[data-catalogue-progress]').waitFor();}
  async function progress(owned,total){await page.waitForFunction(({owned,total})=>document.querySelector('[data-catalogue-progress]')?.textContent===owned+' / '+total,{owned,total});}
  await collection();await progress(45,90);assert.ok((await page.locator('.series-progress').textContent()).includes('50 %'));await shot('collection-auto-45-90.png');assert.ok((await page.locator('#collection-rewards-panel').textContent()).includes('45 / 90'));assert.ok(!(await page.locator('#collection-universe').textContent()).includes('Power Rangers'));const originalNumbers=new Map(all.map(c=>[c.id,c.editionNumber]));report.checks.push('Compte automatique initial 45/90=50%, doublons et anciens totaux158/130/999 ignorés');
  await page.locator('[data-action="collection-display"][data-mode="album"]').click();assert.equal(await page.locator('.v15-album-progress strong').textContent(),'45 / 90');assert.equal(await page.locator('.v15-album-slot').count(),6);
  const albumBefore=await page.locator('.v15-album-progress strong').textContent();await page.locator('#collection-search').fill('introuvable');assert.equal(await page.locator('.v15-album-progress strong').textContent(),albumBefore);await page.locator('#collection-search').fill('');await shot('album-auto.png','.v15-album');report.checks.push('Album et filtres utilisent le catalogue entier, sans renumérotation après filtre');
  await navigate(page,'creator');await page.locator('#draft-series').selectOption('2');await page.locator('#draft-name').fill('Nouvelle normale fictive');await page.locator('[data-action="create-card"]').click();await page.locator('[data-action="choose-series"][data-series="2"]').click();await progress(46,91);
  const created=all.find(c=>c.name==='Nouvelle normale fictive');assert.ok(created);assert.equal(currentState.owned[created.id],1);report.checks.push('Création normale ->total 91 automatiquement, ID conservé et attribution client existante');
  // All ten retired Power Rangers remain available only in administrative archives.
  await navigate(page,'admin');await page.locator('#admin-archived-list [data-action="restore-card"]').first().waitFor({state:'attached'});assert.equal(await page.locator('#admin-archived-list [data-action="restore-card"]').count(),10);assert.ok(!(await page.locator('#admin-card-list').textContent()).includes('Power Rangers'));assert.equal(await page.locator('[data-allow-universe][value="Power Rangers"]').count(),0);for(const row of raw.filter(c=>c.archived))assert.equal(await page.locator('[data-allow-card][value="'+row.id+'"]').count(),0);assert.ok((await page.locator('[data-content-panel$="-series"]').first().textContent()).includes('(91 normales)'));report.checks.push('Univers Power Rangers absent des choix actifs; dix archives administrateur restaurables, booster 91 normales');
  // Archive an owned card: its historical ownership and both decks must survive.
  const retiring=all[0].id,before=structuredClone(currentState);
  await navigate(page,'admin');await page.locator('[data-action="archive-card"][data-id="'+retiring+'"]').click();await page.waitForFunction(id=>!document.querySelector('#admin-card-list [data-action="archive-card"][data-id="'+id+'"]'),retiring);
  assert.deepEqual(currentState,before);await collection();await progress(45,90);assert.equal(await page.locator('[data-id="'+retiring+'"].tcg-card').count(),0);
  await navigate(page,'decks');await page.locator('.archived-deck-reference[data-id="'+retiring+'"]').first().waitFor();assert.equal(await page.locator('.archived-deck-reference[data-id="'+retiring+'"]').count(),2);assert.deepEqual(currentState.deck,before.deck);
  await navigate(page,'arena');assert.equal(await page.locator('[data-action="start-battle"]').isDisabled(),true);report.checks.push('Archivage hors catalogue actif, propriété et références decks inchangées, nouveau combat bloqué');
  await navigate(page,'admin');await page.locator('#admin-archived-details summary').click();await page.locator('[data-action="restore-card"][data-id="'+retiring+'"]').click();await collection();await progress(46,91);
  await page.locator('[data-action="collection-display"][data-mode="classic"]').click();await page.locator('#collection-sort').selectOption('serial');
  const createdMarkup=await page.locator('#collection-grid').innerHTML();assert.ok(createdMarkup.includes('/91'));report.checks.push('Restauration ->91, numéros visibles recalculés, numéros historiques stockés inchangés');
  // Creation and retirement of a Secret do not alter the denominator.
  await navigate(page,'creator');await page.locator('#draft-series').selectOption('2');await page.locator('#draft-name').fill('Secrète de test');await page.locator('#draft-variant').selectOption('secret');await page.locator('[data-action="create-card"]').click();await page.locator('[data-action="choose-series"][data-series="2"]').click();await progress(46,91);
  const secret=all.find(c=>c.name==='Secrète de test'),secretNumber=secret.editionNumber;
  await navigate(page,'admin');await page.locator('[data-action="archive-card"][data-id="'+secret.id+'"]').click();await collection();await progress(46,91);assert.equal(all.find(c=>c.id===secret.id).editionNumber,secretNumber);
  report.checks.push('Ajout et archivage Secrète hors total normal, numéro historique préservé');
  await navigate(page,'admin');await page.locator('#series-editor').waitFor();assert.equal(await page.locator('[data-series-field="targetCount"]').count(),0);await page.locator('[data-action="add-series"]').click();await page.locator('[data-action="save-series"]').click();await page.waitForTimeout(200);
  const newest=series.at(-1);assert.equal(newest.targetCount,0);await collection(newest.number);await progress(0,0);await page.locator('[data-action="collection-display"][data-mode="album"]').click();assert.equal(await page.locator('.v15-album-completion').count(),0);report.checks.push('Nouvelle série vide 0/0, total non éditable et aucun trophée vide');
  await navigate(page,'admin');await shot('admin-series-auto.png','#series-editor');
  // Both old-style full catalogue and the new public metadata work after reload.
  await page.reload({waitUntil:'networkidle'});await collection();await progress(46,91);withMetadata=true;await page.reload({waitUntil:'networkidle'});await collection();await progress(46,91);report.checks.push('Rechargement et changement de format de snapshot cohérents, métadonnée publique facultative');
  await page.locator('.m13-dock [data-m13-menu]').click();await page.locator('.m13-signout').click();await page.locator('#form-auth').waitFor();
  currentUser={id:'fiction-second',username:'second@example.invalid',pseudo:'Camille',role:'player'};currentState={...structuredClone(state),owned:Object.fromEntries(all.filter(c=>c.variant!=='secret'&&!c.archived).slice(0,45).map(c=>[c.id,1]))};f.fixtures.user=currentUser;
  await page.locator('#form-auth [name="username"]').fill(currentUser.username);await page.locator('#form-auth [name="password"]').fill('fiction-only-password');await page.locator('#form-auth button[type="submit"]').click();await page.locator('#auth-cover').waitFor({state:'hidden'});await collection();await progress(45,91);
  await page.locator('[data-action="collection-display"][data-mode="album"]').click();const html=await page.locator('.v15-album').innerHTML();assert.ok(!html.includes('SECRET-INCONNU'));assert.ok(!html.includes(secret.id));assert.equal(await page.locator('.v15-album-progress strong').textContent(),'45 / 91');report.checks.push('Autre compte: même total 91, progression propre 45, Secrètes inconnues sans emplacement ni métadonnées');
  compactPayload=true;await page.reload({waitUntil:'networkidle'});await collection();await progress(45,91);await page.locator('[data-action="collection-display"][data-mode="album"]').click();assert.equal(await page.locator('.v15-album-slot').count(),6);assert.ok((await page.locator('.v15-album-footer').textContent()).includes('sur 91'));assert.ok((await page.locator('.v15-album').textContent()).includes('Visuel indisponible'));assert.ok(!(await page.locator('.v15-album').innerHTML()).includes('SECRET-INCONNU'));report.checks.push('Payload partiel :91 emplacements normaux canoniques, pochettes neutres et progression45/91');
  for(const [id,number] of originalNumbers)assert.equal(all.find(c=>c.id===id).editionNumber,number);assert.deepEqual(f.errors,[]);assert.deepEqual(f.consoleErrors,[]);
  report.success=true;report.nodeErrors=f.errors;report.consoleErrors=f.consoleErrors;report.apiCalls=f.calls;saveJson('browser-results.json',report);console.log(JSON.stringify({success:true,checks:report.checks,screenshots:report.screenshots},null,2));await f.context.close();
 }catch(error){report.success=false;report.failure=error.stack;if(page)await page.screenshot({path:path.join(ARTIFACTS,'failure.png')}).catch(()=>{});saveJson('browser-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
