/* Transaction/refresh interruption checks with fictional API responses only. */
const assert=require('node:assert/strict'),path=require('node:path');
const {laboratory,fixtureContext,openHome,navigate,ARTIFACTS,saveJson,recordScene}=require('./harness.cjs');
(async()=>{
 const lab=await laboratory(),report={productionRequests:0,checks:[],limits:'Chromium Linux. Real frontend; local API/auth fixtures. Pack debit/idempotence are simulated, not a verification of the deployed Supabase pack service.'};let active;
 async function scenario(name,run){const f=await fixtureContext(lab),page=await f.context.newPage();active=page;page.on('dialog',dialog=>dialog.accept());page.setDefaultTimeout(15000);
  try{console.log('TEST '+name);await openHome(page,lab.url);await run(page,f);assert.deepEqual(f.errors,[]);const unexpected=f.consoleErrors.filter(message=>!message.includes('503'));assert.deepEqual(unexpected,[]);report.checks.push({name,success:true,apiCalls:f.calls,expectedErrors:f.consoleErrors.filter(message=>message.includes('503'))});}
  finally{await f.context.close();active=null;}
 }
 try{
  await scenario('Normal/exceptional opening, no mirrored face, loss-safe confirmation and Boosters return',async(page,f)=>{
   let attempts=0;const committed=new Set();
   f.controls.set('/api/packs/commit',({call,body})=>{attempts++;if(!committed.has(call.payload.openingId)){committed.add(call.payload.openingId);for(const card of f.fixtures.cards.slice(0,3))f.fixtures.state.owned[card.id]++;}return attempts===1?{status:503,body:{error:'Réponse perdue après validation fictive'}}:{body};});
   await page.locator('.m13-hero [data-action="open-pack"]').click();await page.locator('[data-v14-break-seal]').click();await page.locator('.opening-top-card:not([disabled])').waitFor();
   assert.equal(await page.evaluate(()=>window.MASHUP_UPDATE_SAFETY().safe),false);
   await page.keyboard.press('Escape');assert.equal(await page.locator('.opening-fullscreen').count(),1);
   const recording=await recordScene(page,'booster-preview.webm');await page.locator('#opening-speed').click();
   report.faceMatrices=[];
   for(let i=0;i<3;i++){
    await page.locator('.opening-top-card:not([disabled])').click();await page.waitForFunction(()=>{const card=document.querySelector('.opening-top-card');return card?.classList.contains('revealed')&&!card.disabled;});
    const matrix=await page.locator('.opening-top-card .tcg-card').evaluate(card=>{let result=new DOMMatrix(),node=card;while(node&&node.id!=='modal-root'){const transform=getComputedStyle(node).transform;if(transform!=='none')result=new DOMMatrix(transform).multiply(result);node=node.parentElement;}return {m11:result.m11,finite:Number.isFinite(result.m11),stats:card.querySelectorAll('.v10-stat').length};});
    assert.equal(matrix.finite,true);assert.ok(matrix.m11>0,'Card front must read left-to-right after both flips');report.faceMatrices.push(matrix);
    if(i===2){await page.screenshot({path:path.join(ARTIFACTS,'booster-ultra-secret.png')});await page.waitForTimeout(850);}
    await page.locator('.opening-top-card:not([disabled])').click();await page.waitForFunction(i=>i===2?!document.querySelector('#opening-done')?.hidden:document.querySelector('#opening-progress')?.textContent.startsWith('Carte '+(i+2)),i);
   }
   await page.screenshot({path:path.join(ARTIFACTS,'booster-final-review.png')});await page.waitForTimeout(900);report.boosterVideo=await recording();
   await page.locator('.m13-dock [data-m13-view="collection"]').evaluate(node=>node.click());
   await page.getByRole('button',{name:'Réessayer la confirmation'}).waitFor();assert.equal(attempts,1);assert.equal(await page.evaluate(()=>window.MASHUP_UPDATE_SAFETY().safe),false);
   await page.locator('#opening-done').click();await page.getByRole('button',{name:'Revenir aux boosters ↗'}).waitFor();assert.equal(await page.locator('.v14-opening-summary').isVisible(),true);await page.locator('#opening-done').click();await page.locator('.m13-home').waitFor();assert.equal(committed.size,1);assert.equal(attempts,2);assert.equal(await page.locator('#modal-root').textContent(),'');
   const calls=f.calls.filter(call=>call.route==='/api/packs/commit');assert.equal(calls[0].payload.openingId,calls[1].payload.openingId);assert.equal(await page.evaluate(()=>window.MASHUP_UPDATE_SAFETY().safe),true);
  });
  await scenario('Cancelled pending preparation sends one cancel and no commit',async(page,f)=>{
   const pending=f.controls.deferNext('/api/packs/prepare');await page.locator('.m13-hero [data-action="open-pack"]').click();await pending.started;await page.locator('[data-action="cancel-pack-loading"]').click();pending.release();await page.waitForFunction(()=>document.querySelector('#modal-root')?.children.length===0);
   assert.equal(f.calls.filter(call=>call.route==='/api/packs/cancel').length,1);assert.equal(f.calls.filter(call=>call.route==='/api/packs/commit').length,0);
  });
  await scenario('V15.3.2 interrupted opening survives reload and recovers without preparing a second pack',async(page,f)=>{
   let commits=0;const ownedBefore=f.fixtures.state.owned[f.fixtures.cards[0].id];
   f.controls.set('/api/packs/commit',({call,body})=>{assert.equal(call.payload.openingId,'fiction-opening');commits++;if(commits===1)f.fixtures.state.owned[f.fixtures.cards[0].id]++;return {body:{...body,state:f.fixtures.state}};});
   await page.locator('.m13-hero [data-action="open-pack"]').click();await page.locator('[data-v14-break-seal]').waitFor();
   await page.reload({waitUntil:'networkidle'});await page.locator('[data-action="recover-pending-pack"]').waitFor();
   await page.locator('.m13-hero [data-action="open-pack"]').click();assert.equal(f.calls.filter(call=>call.route==='/api/packs/prepare').length,1);
   await page.locator('[data-action="recover-pending-pack"]').click();await page.waitForFunction(()=>!document.querySelector('[data-action="recover-pending-pack"]'));
   assert.equal(commits,1);assert.equal(f.fixtures.state.owned[f.fixtures.cards[0].id],ownedBefore+1);await page.reload({waitUntil:'networkidle'});await page.locator('.m13-home').waitFor();assert.equal(await page.locator('[data-action="recover-pending-pack"]').count(),0);
  });
  await scenario('Memory keeps its existing move contract, server win/loss and confirmed credits',async(page,f)=>{
   let game=null,coins=2450;const found=new Set();
   const snapshot=()=>({now:Date.now(),credits:coins,league:{season:1,standings:[]},settings:{memory:20,daily:35},daily:{wins:[],claimed:false},active:game});
   f.controls.set('status',()=>({body:snapshot()}));
   f.controls.set('start',({call})=>{assert.deepEqual(call.payload,{type:'memory'});found.clear();game={id:'fiction-memory',type:'memory',first:null,pairs:0,mistakes:0,attempts:0,done:false,tiles:Array(12).fill(null)};return {body:snapshot()};});
   f.controls.set('move',({call})=>{
    assert.equal(call.payload.sessionId,game.id);const index=call.payload.index;assert.ok(Number.isInteger(index)&&index>=0&&index<12);
    game.tiles[index]={name:'Monde fictif '+(index%6),matched:false};
    if(game.first===null)game.first=index;else{const first=game.first;game.first=null;game.attempts++;assert.equal(first%6,index%6);found.add(first);found.add(index);game.tiles[first].matched=game.tiles[index].matched=true;game.pairs++;if(game.pairs===6){game.done=true;game.won=true;game.reward=20;coins+=20;}}
    return {body:snapshot()};
   });
   await navigate(page,'games');await page.locator('[data-games="mini"]').first().click();await page.locator('[data-games="start"]').click();await page.locator('.games-memory-grid').waitFor();assert.equal(await page.evaluate(()=>window.MASHUP_UPDATE_SAFETY().safe),false);
   for(let i=0;i<6;i++){await page.locator('[data-games="flip"][data-index="'+i+'"]').click();await page.locator('[data-games="flip"][data-index="'+i+'"].is-flipped').waitFor();await page.locator('[data-games="flip"][data-index="'+(i+6)+'"]').click();if(i<5)await page.locator('[data-games="flip"][data-index="'+i+'"].is-matched').waitFor();}
   await page.locator('.games-end-win').waitFor();await page.waitForFunction(()=>document.getElementById('coin-balance')?.textContent.replace(/\D/g,'')==='2470');assert.equal(found.size,12);assert.equal(await page.evaluate(()=>window.MASHUP_UPDATE_SAFETY().safe),true);
   f.controls.set('start',()=>{game={id:'fiction-loss',type:'memory',done:true,won:false,reward:0,mistakes:3,pairs:0,tiles:[]};return {body:snapshot()};});
   await page.locator('[data-games="replay"]').click();await page.locator('.games-end-loss').waitFor();assert.equal(coins,2470);
  });
  await scenario('Update banner defers reload during battle and pending purchase, then preserves auth storage',async(page,f)=>{
   await page.route('**/version.json?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({version:'15.5.0',notes:'Release fictive de test'})}));
   await page.route('**/index.html?*',route=>route.fulfill({contentType:'text/html',body:'<meta name="mashup-version" content="15.5.0">'}));
   await page.reload({waitUntil:'networkidle'});await page.locator('#mashup-update-banner').waitFor();const before=page.url();
   await navigate(page,'arena');await page.locator('[data-action="start-battle"]').click();await page.locator('.rb-arena').waitFor();await page.locator('#mashup-update-apply').evaluate(node=>node.click());await page.waitForTimeout(70);assert.equal(page.url(),before);assert.ok((await page.locator('#mashup-update-status').textContent()).includes('combat'));
   await page.locator('[data-action="quit-battle"]').filter({visible:true}).first().click();await page.locator('[data-action="start-battle"]').waitFor();
   await navigate(page,'market');const purchase=f.controls.deferNext('/api/market/buy');await page.locator('[data-action="v11-buy-listing"]').first().click();await Promise.race([purchase.started,new Promise((_,reject)=>{setTimeout(()=>reject(Error('Expected purchase request not received')),10000).unref();})]);
   await page.locator('#mashup-update-apply').evaluate(node=>node.click());await page.waitForTimeout(70);assert.equal(page.url(),before);assert.equal(await page.evaluate(()=>window.MASHUP_UPDATE_SAFETY().safe),false);
   purchase.release();await page.waitForFunction(()=>window.MASHUP_UPDATE_SAFETY().safe);await navigate(page,'packs');await page.evaluate(()=>localStorage.setItem('fiction-auth-preservation-sentinel','keep-me'));
   await page.locator('#mashup-update-apply').evaluate(node=>node.click());await page.waitForURL(url=>url.searchParams.get('mashup_build')==='15.5.0');await page.locator('.m13-home').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('fiction-auth-preservation-sentinel')),'keep-me');assert.equal(await page.locator('#auth-cover').isVisible(),false);
  });
  report.success=true;saveJson('booster-update-results.json',report);console.log(JSON.stringify({success:true,checks:report.checks.map(check=>check.name),faceMatrices:report.faceMatrices},null,2));
 }catch(error){report.success=false;report.failure=error.stack;if(active)await active.screenshot({path:path.join(ARTIFACTS,'booster-update-failure.png')}).catch(()=>{});saveJson('booster-update-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
