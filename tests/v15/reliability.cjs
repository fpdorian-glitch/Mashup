/* Frontend interruption tests. All requests are fulfilled by fictional local fixtures. */
const assert=require('node:assert/strict');
const path=require('node:path');
const {ARTIFACTS,laboratory,fixtureContext,openHome,navigate,openCollection,saveJson}=require('./harness.cjs');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function openBooster(page){
 await page.locator('.m13-hero [data-action="open-pack"]').click();
 await page.locator('[data-v14-break-seal]').click();
 await page.locator('.opening-top-card:not([disabled])').waitFor();
}
async function summary(page){
 for(let i=0;i<3;i++){
  await page.locator('.opening-top-card:not([disabled])').click();
  await page.waitForFunction(()=>{const c=document.querySelector('.opening-top-card');return c?.classList.contains('revealed')&&!c.disabled;});
  await page.locator('.opening-top-card:not([disabled])').click();
  await page.waitForFunction(i=>i===2?!document.querySelector('#opening-done')?.hidden:document.querySelector('#opening-progress')?.textContent.startsWith('Carte '+(i+2)),i);
 }
}
(async()=>{
 const lab=await laboratory(),report={kind:'fictional-frontend-reliability',started:new Date().toISOString(),productionRequests:0,checks:[],scenarios:[],limits:['Aucun serveur ni compte réel contacté.','L’idempotence serveur est simulée : ces tests ne prouvent pas sa mise en œuvre dans les Edge Functions non disponibles.','Le changement de session et le retrait de DOM sont provoqués dans le navigateur de test.']};
 async function scenario(name,run){
  const f=await fixtureContext(lab),page=await f.context.newPage();
  try{await openHome(page,lab.url);await run(page,f);assert.deepEqual(f.errors,[]);report.scenarios.push({name,success:true,calls:f.calls,pageErrors:f.errors,consoleErrors:f.consoleErrors});report.checks.push(name);}
  catch(error){await page.screenshot({path:path.join(ARTIFACTS,'reliability-failure.png'),fullPage:false}).catch(()=>{});report.scenarios.push({name,success:false,error:error.stack,calls:f.calls,pageErrors:f.errors,consoleErrors:f.consoleErrors});throw error;}
  finally{await f.context.close();}
 }
 try{
  await scenario('Préparation différée puis annulée : un cancel, aucun commit',async(page,{controls,calls})=>{
   const gate=controls.deferNext('/api/packs/prepare');await page.locator('.m13-hero [data-action="open-pack"]').click();await gate.started;
   await page.locator('[data-action="cancel-pack-loading"]').click();gate.release();
   await page.waitForFunction(()=>!document.querySelector('#modal-root')?.children.length);
   assert.equal(calls.filter(c=>c.route==='/api/packs/cancel').length,1);assert.equal(calls.filter(c=>c.route==='/api/packs/commit').length,0);
  });
  await scenario('Confirmation réessayable après réponse perdue, même openingId',async(page,{controls,calls,fixtures})=>{
   // The fake server records one debit and returns the already-committed result on retry.
   let commits=0,debits=0;const seen=new Set();
   controls.set('/api/packs/commit',({call,body})=>{commits++;if(!seen.has(call.payload.openingId)){seen.add(call.payload.openingId);debits++;}return commits===1?{status:503,body:{error:'Réponse fictive perdue après validation'}}:{body};});
   await openBooster(page);await page.locator('#opening-speed').click();await summary(page);
   await page.locator('#opening-done').click();await page.getByRole('button',{name:'Réessayer la confirmation'}).waitFor();
   await page.locator('#opening-done').click();await page.locator('.m13-home').waitFor();
   const commitCalls=calls.filter(c=>c.route==='/api/packs/commit');assert.equal(commitCalls.length,2);assert.equal(commitCalls[0].payload.openingId,commitCalls[1].payload.openingId);assert.equal(debits,1);assert.equal(calls.filter(c=>c.route==='/api/packs/prepare').length,1);
   report.retrySimulation={requests:2,simulatedDebits:debits,openingIds:commitCalls.map(c=>c.payload.openingId),backendValidated:false};
  });
  await scenario('Accélération disponible pendant un retournement Ultra',async(page,{controls,fixtures})=>{
   controls.set('/api/packs/prepare',()=>({body:{openingId:'fiction-ultra',results:[{...fixtures.cards[23],rarity:'ultra',variant:'secret'},fixtures.cards[0],fixtures.cards[1]]}}));
   await openBooster(page);await page.locator('.opening-top-card').click();
   const speed=page.locator('#opening-speed');assert.equal(await speed.isEnabled(),true);const before=Date.now();await speed.click();
   await page.waitForFunction(()=>{const c=document.querySelector('.opening-top-card');return c?.classList.contains('revealed')&&!c.disabled;});
   const elapsed=Date.now()-before;assert.ok(elapsed<700,'Accélération doit terminer rapidement la phase en cours');report.speedWhileFlipping={remainingMs:elapsed};
  });
  await scenario('Callbacks d’animation sans effet après retrait du modal',async(page)=>{
   await openBooster(page);await page.locator('.opening-top-card').click();
   await page.evaluate(()=>{document.querySelector('#modal-root').innerHTML='<div data-disconnected-sentinel>Écran suivant fictif</div>';});
   await sleep(1600);assert.equal(await page.locator('[data-disconnected-sentinel]').textContent(),'Écran suivant fictif');assert.equal(await page.locator('.opening-top-card').count(),0);
  });
  await scenario('Réponse PvP retardée après navigation ignorée',async(page,{controls,fixtures})=>{
   const gate=controls.deferNext('/api/pvp');await navigate(page,'arena');await page.locator('[data-action="arena-section"][data-section="online"]').click();await gate.started;
   await navigate(page,'profile');await page.locator('#profile-pseudo').waitFor();gate.release({body:{players:[],leaderboard:[],match:null,balance:999999}});
   await sleep(350);assert.equal(await page.locator('#profile-pseudo').count(),1);assert.equal((await page.locator('#coin-balance').textContent()).replace(/\D/g,''),'2450');
  });
  for(const sameIdentity of [false,true])await scenario('Réponse d’une ancienne session rejetée après reconnexion '+(sameIdentity?'au même compte':'à un autre compte'),async(page,{controls,fixtures,calls})=>{
   const gate=controls.deferNext('/api/pvp');await navigate(page,'arena');await page.locator('[data-action="arena-section"][data-section="online"]').click();await gate.started;
   await page.locator('[data-action="logout"]').evaluate(node=>node.click());await page.locator('#form-auth').waitFor();
   fixtures.user={...fixtures.user,id:sameIdentity?fixtures.user.id:'fiction-second-account',pseudo:'Sam'};fixtures.state={...fixtures.state,coins:1234};
   await page.locator('#form-auth [name="username"]').fill('sam@example.invalid');await page.locator('#form-auth [name="password"]').fill('fake-password-for-local-fixtures');await page.locator('#form-auth button[type="submit"]').click();
   await page.waitForFunction(()=>getComputedStyle(document.getElementById('auth-cover')).display==='none');await page.waitForFunction(()=>document.querySelector('#pvp-arena-root .public-player-grid'),{},{timeout:2000});assert.ok(calls.filter(c=>c.route==='/api/pvp').length>=2,'La nouvelle session doit pouvoir charger le PvP sans attendre une ancienne requête');await navigate(page,'packs');await page.locator('.m13-home').waitFor();gate.release({body:{players:[],leaderboard:[],match:null,balance:999999}});await sleep(350);
   assert.equal((await page.locator('#coin-balance').textContent()).replace(/\D/g,''),'1234');assert.equal(await page.locator('.m13-home').count(),1);
  });
  await scenario('Album : Secrètes non obtenues exclues des feuillets et compteurs',async(page,{fixtures})=>{
   // Admin is intentionally retained to test that album privacy does not bypass ownership.
   const hidden=fixtures.cards.filter(c=>c.variant==='secret');for(const c of hidden)delete fixtures.state.owned[c.id];
   for(const i of [0,5,11,17])delete fixtures.state.owned[fixtures.cards[i].id];await page.reload({waitUntil:'networkidle'});await page.locator('.m13-home').waitFor();await openCollection(page);
   await page.locator('#collection-ownership').selectOption('all');await page.locator('[data-action="collection-display"][data-mode="album"]').click();await page.locator('.v15-album').waitFor();
   await page.locator('.v15-album').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(ARTIFACTS,'album-missing-mobile.png'),fullPage:false});await page.locator('.v15-album').screenshot({path:path.join(ARTIFACTS,'album-leaf.png')});let inspected=0;const names=hidden.map(c=>c.name);
   for(let n=0;n<12;n++){
    const html=await page.locator('.v15-album').innerHTML();for(const name of names)assert.ok(!html.includes(name));for(const c of hidden)assert.ok(!html.includes('data-id="'+c.id+'"'));
    inspected+=await page.locator('.v15-album-slot').count();const next=page.getByRole('button',{name:'Page suivante de l’album'});if(!await next.isEnabled())break;await next.click();
   }
   assert.equal(inspected,fixtures.cards.length-hidden.length,'Les secrètes inconnues ne créent aucun emplacement');
   report.albumPrivacy={catalogue:fixtures.cards.length,undiscoveredSecrets:hidden.length,visibleSlots:inspected,adminTested:true};
  });
  await scenario('Campagne : quatre manches et règles serveur préservées',async(page,{calls})=>{
   await navigate(page,'arena');await page.locator('[data-action="start-battle"]').click();
   for(let round=0;round<4;round++){
    const choice=round%2?page.locator('[data-action="ai-turn"]'):page.locator('[data-action="challenge-stat"][data-stat="power"]');await choice.waitFor();assert.equal(await page.locator('.mystery-card').count(),1);await choice.click();await page.locator('.challenge-result').waitFor();
    assert.equal(await page.locator('.mystery-card').count(),0);assert.ok((await page.locator('.comparison-numbers').textContent()).includes('94'));
    if(round===0)await page.screenshot({path:path.join(ARTIFACTS,'battle-mobile.png'),fullPage:false});if(round<3)await page.locator('[data-action="next-round"]').click();
   }
   await page.locator('.battle-end').waitFor();assert.equal(calls.filter(c=>c.route==='/api/battles/choose').length,4);assert.equal(calls.filter(c=>c.route==='/api/battles/next').length,3);await page.locator('.battle-end [data-action="quit-battle"]').click();await page.locator('[data-action="start-battle"]').waitFor();
  });
  await scenario('PvP : choix, résultat et attente sans modification de valeurs',async(page,{controls,fixtures,calls})=>{
   const match={id:'fiction-pvp',updatedAt:1,status:'active',stage:'choose',mode:'simple',host:fixtures.user.id,guest:'fiction-friend',actor:fixtures.user.id,round:0,direction:'higher',hostScore:0,guestScore:0,opponent:{pseudo:'Camille'},ownCards:[fixtures.cards[2]],enemyCards:[fixtures.cards[5]],history:[],meReady:false};
   controls.set('/api/pvp',()=>({body:{players:[],leaderboard:[],balance:2450,match}}));
   controls.set('/api/pvp/choose',({call})=>{assert.equal(call.payload.stat,'power');match.stage='reveal';match.updatedAt++;match.hostScore=1;match.history=[{key:'power',h:94,g:77,winner:'host'}];return {body:{}};});
   controls.set('/api/pvp/next',()=>{match.stage='choose';match.updatedAt++;match.round=1;match.actor='fiction-friend';return {body:{}};});
   await navigate(page,'arena');await page.locator('[data-action="arena-section"][data-section="online"]').click();await page.locator('[data-action="pvp-choose"][data-stat="power"]').waitFor();assert.equal(await page.locator('.pvp-hidden').count(),1);
   await page.locator('[data-action="pvp-choose"][data-stat="power"]').click();await page.locator('[data-action="pvp-next"]').waitFor();assert.equal(await page.locator('.pvp-hidden').count(),0);assert.deepEqual(await page.locator('.comparison-numbers b').allTextContents(),['94','77']);
   await page.screenshot({path:path.join(ARTIFACTS,'pvp-mobile.png'),fullPage:false});await page.locator('[data-action="pvp-next"]').click();await page.locator('.pvp-waiting').waitFor();assert.equal(await page.locator('[data-action="pvp-choose"]').count(),0);assert.equal(calls.filter(c=>c.route==='/api/pvp/choose').length,1);
  });
  await scenario('Parcours conservés : marché, échanges, profil, jeux, classement, atelier',async(page)=>{
   await navigate(page,'market');await page.locator('#v11-market-results .v11-market-card').waitFor();await page.locator('[data-action="v11-open-sale-picker"]').click();await page.locator('.v114-picker-backdrop').waitFor();await page.locator('[data-v114-close]').first().click();
   await page.locator('[data-action="v11-market-mode"][data-mode="trades"]').click();await page.locator('#trade-partner').selectOption('fiction-friend');await page.locator('[data-action="trade-load-target"]').click();await page.locator('#trade-offer-0').waitFor();
   await navigate(page,'profile');await page.locator('#profile-pseudo').waitFor();await navigate(page,'games');await page.locator('[data-games="mini"]').first().click();await page.waitForFunction(()=>document.querySelector('#page')?.textContent.includes('Codex'));
   await navigate(page,'leaderboard');await page.locator('.v11-ranking-row').waitFor();await navigate(page,'achievements');await page.locator('#page .page-lead').waitFor();await navigate(page,'creator');await page.locator('#draft-name').waitFor();await navigate(page,'admin');await page.locator('#users-list .admin-user').waitFor();await page.locator('#admin-card-list .admin-card-row').first().waitFor();
  });
  report.success=true;saveJson('reliability-results.json',report);console.log(JSON.stringify({success:true,checks:report.checks},null,2));
 }catch(error){report.success=false;report.failure=error.stack;saveJson('reliability-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
