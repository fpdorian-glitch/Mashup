/* Broader frontend journeys. These fixtures simulate replies; they do not validate backend rules. */
const assert=require('node:assert/strict');
const path=require('node:path');
const {ARTIFACTS,laboratory,fixtureContext,openHome,navigate,saveJson}=require('./harness.cjs');
(async()=>{
 const lab=await laboratory(),fixture=await fixtureContext(lab),{context,errors,consoleErrors,calls}=fixture;
 const report={kind:'fictional-frontend-journeys',productionRequests:0,started:new Date().toISOString(),checks:[],screenshots:[],limits:'Parcours client simulés. Ne vérifie ni les calculs serveur, ni transferts, ni permissions Supabase réelles, ni les transactions concurrentes.'};
 try{
  const page=await context.newPage();await openHome(page,lab.url);
  async function shot(name){await page.screenshot({path:path.join(ARTIFACTS,name),fullPage:false});report.screenshots.push(name);}
  async function layout(name){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Débordement '+name);report.checks.push(name+' : interface chargée sans débordement');}
  // The home showcase uses the same existing detail action as the collection.
  const homeCard=page.locator('.m13-showcase .tcg-card[role="button"]').first();
  if(await homeCard.count()){await homeCard.click();await page.locator('[data-action="zoom-card"]').click();await page.locator('.inspect-stage').waitFor();await page.locator('[data-action="close-modal"]').click();report.checks.push('Carte de l’accueil → fiche → inspection');}
  await navigate(page,'arena');await page.locator('[data-action="start-battle"]').waitFor();await layout('Campagne');await shot('arena-mobile.png');
  await page.locator('[data-action="start-battle"]').click();
  for(let round=0;round<4;round++){
   const choice=round%2?page.locator('[data-action="ai-turn"]'):page.locator('[data-action="challenge-stat"][data-stat="power"]');
   await choice.waitFor();
   assert.equal(await page.locator('.mystery-card').count(),1,'Adversaire masqué avant comparaison');
   await choice.click();await page.locator('.challenge-result').waitFor();
   assert.equal(await page.locator('.mystery-card').count(),0,'Adversaire révélé après comparaison');
   if(round===0){await layout('Combat révélé');await shot('battle-mobile.png');}
   if(round<3)await page.locator('[data-action="next-round"]').click();
  }
  await page.locator('.battle-end').waitFor();await page.locator('.battle-end [data-action="quit-battle"]').click();await page.locator('[data-action="start-battle"]').waitFor();
  assert.equal(calls.filter(call=>call.route==='/api/battles/start').length,1);assert.equal(calls.filter(call=>call.route==='/api/battles/choose').length,4);assert.equal(calls.filter(call=>call.route==='/api/battles/next').length,3);
  report.checks.push('Campagne simulée : 4 manches, choix joueur/IA, masquage puis révélation adverse, retour arène');
  await page.locator('[data-action="arena-section"][data-section="online"]').click();await page.locator('#pvp-arena-root .public-player-grid').waitFor();await layout('Défis en ligne vides');
  await navigate(page,'market');await page.locator('#v11-market-results .v11-market-card').waitFor();await layout('Marché');await shot('market-mobile.png');
  await page.locator('[data-action="v11-open-sale-picker"]').click();
  await page.locator('.v114-picker-backdrop').waitFor();
  await page.keyboard.press('Escape');
  // Return through navigation also verifies a picker cannot trap the application.
  const close=page.locator('[data-v114-close]');if(await close.count())await close.first().click();
  await page.locator('[data-action="v11-market-mode"][data-mode="trades"]').click();await page.locator('#trade-partner').waitFor();await page.locator('#trade-partner').selectOption('fiction-friend');await page.locator('[data-action="trade-load-target"]').click();await page.locator('#trade-offer-0').waitFor();await layout('Échanges privés');await shot('trades-mobile.png');
  await navigate(page,'profile');await page.locator('#profile-pseudo').waitFor();await layout('Profil');await shot('profile-mobile.png');
  await navigate(page,'games');await page.locator('[data-games="mini"]').first().waitFor();await layout('Jeux');
  await page.locator('[data-games="mini"]').first().click();await page.waitForFunction(()=>document.querySelector('#page')?.textContent.includes('Codex'));await layout('Memory');await shot('memory-mobile.png');
  await navigate(page,'leaderboard');await page.locator('.v11-ranking-row').waitFor();await layout('Classements');
  await navigate(page,'achievements');await page.locator('#page .page-lead').waitFor();await layout('Succès');
  await navigate(page,'creator');await page.locator('#draft-name').waitFor();await layout('Atelier');await shot('studio-mobile.png');
  await navigate(page,'admin');await page.locator('#users-list .admin-user').waitFor();await page.locator('#admin-card-list .admin-card-row').first().waitFor();await layout('Administration');await shot('admin-mobile.png');
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);report.pageErrors=errors;report.consoleErrors=consoleErrors;report.apiCalls=calls;report.success=true;saveJson('journey-results.json',report);console.log(JSON.stringify(report,null,2));
 }catch(error){report.success=false;report.failure=error.stack;report.pageErrors=errors;report.consoleErrors=consoleErrors;report.apiCalls=calls;saveJson('journey-results.json',report);throw error;}
 finally{await context.close();await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
