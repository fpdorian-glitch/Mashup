/* Real client + private local Match service, fictional accounts, no production requests.
 * MASHUP_MATCH_FIXTURE_MODULE selects a private server fixture outside this repo.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {laboratory,fixtureContext,openHome,navigate,recordScene,ARTIFACTS,saveJson}=require('./harness.cjs');
const privateFixture=process.env.MASHUP_MATCH_FIXTURE_MODULE;
if(!privateFixture)throw Error('Set MASHUP_MATCH_FIXTURE_MODULE to the private fixture-service.mjs; no server implementation or credentials belong in the public repository.');
const witnessSource=fs.readFileSync(path.join(__dirname,'match-levels.test.mjs'),'utf8');
const witnesses=JSON.parse(witnessSource.match(/const WITNESSES = (\[[\s\S]*?\n\]);/)[1].replace(/,\s*\]$/,']'));

(async()=>{
 const {createFixtureMatchService}=await import(pathToFileURL(privateFixture).href);
 const engine=await import('../../62-v15-4-match-engine.js');
 const lab=await laboratory(),report={baseline:'d486c86',engine:await lab.browser.version(),productionRequests:0,checks:[],screenshots:[],limits:'Chromium Linux, tactile et dimensions simulés. API/auth interceptées; service privé local transactionnel en mémoire. Aucun téléphone physique, SQL Supabase ou backend déployé testé.'};
 let activePage;
 const shot=async(page,name,selector)=>{await (selector?page.locator(selector):page).screenshot({path:path.join(ARTIFACTS,name)});report.screenshots.push(name);};
 async function match(page){await navigate(page,'games');await page.locator('[data-games="match"],.mm-loading,.mm-campaign,.mm-play').first().waitFor();if(await page.locator('[data-games="match"]').first().isVisible())await page.locator('[data-games="match"]').first().click();await page.locator('.mm-campaign').waitFor();}
 async function start(page,id){const button=page.locator('.mm-level[data-mm-level="'+id+'"]');const details=button.locator('xpath=ancestor::details');if(await details.count()&&!await details.evaluate(node=>node.open))await details.locator('summary').click();await button.click();await page.locator('[data-mm-board]').waitFor();}
 async function move(page,from,to){await page.locator('[data-mm-cell="'+from+'"]').click();await page.locator('[data-mm-cell="'+to+'"]').click();await page.waitForFunction(()=>document.querySelector('[data-mm-announcement]')?.textContent!=='Enregistrement du coup…');}
 const balance=async(page,amount)=>page.waitForFunction(amount=>document.getElementById('coin-balance')?.textContent.replace(/\D/g,'')===String(amount),amount);
 try{
  // Authoritative local service: two independent accounts share config, never progress.
  const f=await fixtureContext(lab),g=await fixtureContext(lab);g.fixtures.user={...g.fixtures.user,id:'fiction-friend',pseudo:'Camille',role:'player'};
  let serviceNow=Date.UTC(2026,10,5,19,0);
  const backend=createFixtureMatchService({users:[{...f.fixtures.user,state:f.fixtures.state},{...g.fixtures.user,state:g.fixtures.state}],clock:()=>{serviceNow+=1000;return serviceNow;}});
  const attach=ctx=>{
   for(const route of ['status','start','move','abandon','admin-config'])ctx.controls.set('match/'+route,({call})=>backend.request(ctx.fixtures.user.id,route,call.payload));
   ctx.controls.set('/api/bootstrap',({body})=>{const db=backend.store.snapshot(),user=db.users.find(u=>u.id===ctx.fixtures.user.id);return {body:{...body,state:user.state}};});
  };attach(f);attach(g);
  const page=await f.context.newPage();activePage=page;await page.addInitScript(()=>localStorage.setItem('mashup-display-v13','high'));await openHome(page,lab.url);await match(page);
  assert.equal(await page.locator('.mm-world').count(),10);assert.equal(await page.locator('.mm-level').count(),100);assert.equal(await page.locator('.mm-level.is-locked').count(),99);await shot(page,'match-campaign.png','.mm-campaign');
  await start(page,1);assert.equal(await page.evaluate(()=>window.MASHUP_UPDATE_SAFETY().safe),false);await shot(page,'match-board-level-1.png','.mm-play');
  const dbActive=()=>{const db=backend.store.snapshot(),user=db.users.find(u=>u.id===f.fixtures.user.id);return db.mashupMatchV154.sessions[user.mashupMatchV154.activeId];};
  const initial=dbActive().state,legal=engine.legalMoves(initial),validPairs=new Set(legal.flatMap(m=>[m.from+':'+m.to,m.to+':'+m.from]));
  let invalid;for(let i=0;i<initial.board.length&&!invalid;i++)for(const j of [i+1,i+initial.width])if(j<initial.board.length&&Math.abs(i%initial.width-j%initial.width)+Math.abs(Math.floor(i/initial.width)-Math.floor(j/initial.width))===1&&initial.mask[i]&&initial.mask[j]&&!initial.obstacles[i]&&!initial.obstacles[j]&&!validPairs.has(i+':'+j)){invalid={from:i,to:j};break;}
  assert.ok(invalid);await move(page,invalid.from,invalid.to);assert.equal(dbActive().state.movesLeft,initial.movesLeft);assert.equal(dbActive().state.score,0);
  report.checks.push('Échange invalide annulé, plateau et budget inchangés; partie protégée contre actualisation PWA');
  // Lose the response after the server has committed a winning move, then retry.
  f.controls.once('match/move',async({call})=>{const result=await backend.request(f.fixtures.user.id,'move',call.payload);assert.equal(result.status,200);return {abort:true};});
  const recording=await recordScene(page,'match-preview.webm'),winning=witnesses[0].moves[0];await page.waitForTimeout(1100);
  await page.locator('[data-mm-cell="'+winning[0]+'"]').click();await page.locator('[data-mm-cell="'+winning[1]+'"]').click();await page.locator('[data-mm-action="retry-request"]').waitFor();
  assert.equal(backend.store.snapshot().users[0].state.coins,2470);await page.locator('[data-mm-action="retry-request"]').click();await page.locator('.mm-outcome.is-win').waitFor();await balance(page,2470);
  assert.equal(backend.store.snapshot().mashupMatchV154.ledger.filter(entry=>entry.type==='completion'&&entry.reward.reason==='first-win').length,1);assert.equal(await page.evaluate(()=>window.MASHUP_UPDATE_SAFETY().safe),true);
  await page.locator('[data-mm-action="finish-effects"]').click();await shot(page,'match-first-victory.png','.mm-play');await page.waitForTimeout(1600);report.matchVideo=await recording();report.checks.push('Victoire validée après réponse perdue et retry du même identifiant : une seule récompense de20crédits et solde immédiat');
  await page.locator('[data-mm-action="campaign"]').first().click();assert.equal(await page.locator('.mm-level[data-mm-level="2"]').isDisabled(),false);assert.equal(await page.locator('.mm-level[data-mm-level="3"]').isDisabled(),true);
  await start(page,1);await move(page,...winning);await page.locator('.mm-outcome.is-win').waitFor();assert.equal(backend.store.snapshot().users[0].state.coins,2470);report.checks.push('Rejouer un niveau terminé ne réattribue pas sa première récompense');
  // Reload and a second browser for the same user recover server progression.
  await page.reload({waitUntil:'networkidle'});await match(page);assert.equal(await page.locator('.mm-level[data-mm-level="1"]').getAttribute('class').then(s=>s.includes('is-complete')),true);await balance(page,2470);
  const reconnect=await fixtureContext(lab);attach(reconnect);const rePage=await reconnect.context.newPage();await openHome(rePage,lab.url);await match(rePage);assert.equal(await rePage.locator('.mm-level[data-mm-level="2"]').isDisabled(),false);await reconnect.context.close();
  const friend=await g.context.newPage();await openHome(friend,lab.url);await match(friend);assert.equal(await friend.locator('.mm-level[data-mm-level="2"]').isDisabled(),true);assert.equal(await friend.locator('#admin-nav').isVisible(),false);report.checks.push('Actualisation et second navigateur retrouvent progression/étoiles serveur; autre compte indépendant et accès admin masqué');
  await navigate(page,'admin');await page.locator('[data-mm-admin-form]').waitFor();await page.locator('[data-mm-tier="0"]').fill('23');await page.locator('[data-mm-admin="add-override"]').click();await page.locator('[data-mm-override-id]').fill('2');await page.locator('[data-mm-override-value]').fill('73');await page.locator('[name="replayEnabled"]').check();await page.locator('[name="replayCredits"]').fill('3');await page.locator('[name="dailyCap"]').fill('6');await page.locator('[name="perLevelCap"]').fill('3');
  await page.locator('.mm-admin-preview summary').click();assert.equal(await page.locator('.mm-economy-preview li').count(),100);await shot(page,'match-admin-economy.png','.mm-admin');await page.locator('[data-mm-admin-form] [type="submit"]').click();await page.waitForFunction(()=>document.querySelector('[data-mm-admin-form]')?.dataset.mmRevision==='2');
  await friend.reload({waitUntil:'networkidle'});await match(friend);assert.ok((await friend.locator('.mm-level[data-mm-level="1"]').textContent()).includes('23 crédits'));assert.ok((await friend.locator('.mm-level[data-mm-level="2"]').textContent()).includes('73 crédits'));
  await match(page);await start(page,2);for(const [from,to] of witnesses[1].moves)await move(page,from,to);await page.locator('.mm-outcome.is-win').waitFor();await balance(page,2543);report.checks.push('Admin : tranches, gain individuel, replays plafonnés, prévisualisation100gains; configuration commune et gain73appliqué au niveau2');
  await page.locator('[data-mm-action="campaign"]').first().click();await start(page,2);for(const [from,to] of witnesses[1].moves)await move(page,from,to);await page.locator('.mm-outcome.is-win').waitFor();await balance(page,2546);
  await page.locator('[data-mm-action="campaign"]').first().click();await start(page,2);for(const [from,to] of witnesses[1].moves)await move(page,from,to);await page.locator('.mm-outcome.is-win').waitFor();assert.equal(backend.store.snapshot().users[0].state.coins,2546);report.checks.push('Replay : gain réduit3crédits puis plafond journalier par niveau, sans réattribution de première victoire');
  await navigate(page,'admin');await page.locator('[data-mm-admin-form]').waitFor();await page.locator('[data-mm-admin-form] [name="enabled"]').uncheck();await page.locator('[data-mm-admin-form] [type="submit"]').click();await page.waitForFunction(()=>document.querySelector('[data-mm-admin-form]')?.dataset.mmRevision==='3');
  await friend.reload({waitUntil:'networkidle'});await match(friend);assert.ok((await friend.locator('.mm-level[data-mm-level="1"]').textContent()).includes('Gains suspendus'));await start(friend,1);await move(friend,...winning);await friend.locator('.mm-outcome.is-win').waitFor();await balance(friend,2450);
  assert.equal(backend.store.snapshot().users[1].mashupMatchV154.levels[1].rewardClaimed,false);assert.ok((await friend.locator('.mm-outcome-reward').textContent()).includes('désactivées'));
  await page.locator('[data-mm-admin-form] [name="enabled"]').check();await page.locator('[data-mm-admin-form] [type="submit"]').click();await page.waitForFunction(()=>document.querySelector('[data-mm-admin-form]')?.dataset.mmRevision==='4');await friend.locator('[data-mm-action="campaign"]').first().click();await start(friend,1);await move(friend,...winning);await friend.locator('.mm-outcome.is-win').waitFor();await balance(friend,2473);report.checks.push('Pause des gains commune : annonce claire, victoire sans crédit et droit conservé; réactivation attribue la première récompense une seule fois');
  // A pending admin request must never append settings into another page.
  const gate=f.controls.deferNext('/api/admin/users');await navigate(page,'admin');const info=await gate.started;await navigate(page,'packs');gate.release({body:info.body});await page.waitForTimeout(100);assert.equal(await page.locator('.mm-admin').count(),0);report.checks.push('Navigation pendant réponse admin : aucun panneau tardif ajouté à la nouvelle page');
  report.expectedNetworkErrors=f.consoleErrors.filter(message=>/ERR_FAILED|503/.test(message));assert.deepEqual(f.errors,[]);assert.deepEqual(g.errors,[]);assert.deepEqual(f.consoleErrors.filter(message=>!/ERR_FAILED|503/.test(message)),[]);assert.deepEqual(g.consoleErrors,[]);
  await f.context.close();await g.context.close();

  // No backend capability: a genuine local game, explicitly without real rewards.
  for(const size of [{width:320,height:568},{width:390,height:844},{width:1024,height:768}]){
   const t=await fixtureContext(lab,size);t.controls.set('match/status',()=>({body:{}}));const tp=await t.context.newPage();activePage=tp;await openHome(tp,lab.url);await navigate(tp,'games');await tp.locator('[data-games="match"]').first().click();await tp.locator('[data-mm-action="training"]').waitFor();assert.equal(await tp.locator('[data-mm-mode="online"]').count(),0);await tp.locator('[data-mm-action="training"]').click();await start(tp,1);
   const overflow=await tp.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,size.width+'px');
   if(size.width===390){await tp.emulateMedia({reducedMotion:'reduce'});await shot(tp,'match-training-mobile.png','.mm-play');}
   await move(tp,...winning);await tp.locator('.mm-outcome.is-win').waitFor();await balance(tp,2450);await tp.reload({waitUntil:'networkidle'});await navigate(tp,'games');await tp.locator('[data-games="match"]').first().click();await tp.locator('[data-mm-action="training"]').click();if(await tp.locator('[data-mm-action="campaign"]').first().isVisible())await tp.locator('[data-mm-action="campaign"]').first().click();assert.equal(await tp.locator('.mm-level[data-mm-level="2"]').isDisabled(),false);assert.ok((await tp.locator('.mm-training-note').textContent()).includes('AUCUN CRÉDIT'));
   assert.deepEqual(t.errors,[]);assert.deepEqual(t.consoleErrors,[]);await t.context.close();
  }
  report.checks.push('Ancien backend200{} détecté : entraînement complet distinct, progression locale après reload, zérocrédit; 320/390/1024px sans débordement et mouvement réduit');
  report.success=true;saveJson('browser-results.json',report);console.log(JSON.stringify({success:true,checks:report.checks,screenshots:report.screenshots},null,2));
 }catch(error){report.success=false;report.failure=error.stack;if(activePage&&!activePage.isClosed())await activePage.screenshot({path:path.join(ARTIFACTS,'browser-failure.png')}).catch(()=>{});saveJson('browser-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
