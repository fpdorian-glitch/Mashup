/* Actual gallery settings and modal return path; fictional API responses only. */
const assert=require('node:assert/strict');
const {laboratory,fixtureContext,openHome,saveJson}=require('./harness.cjs');
(async()=>{
 const lab=await laboratory(),f=await fixtureContext(lab),page=await f.context.newPage(),report={productionRequests:0,checks:[],limits:'Chromium Linux390×844; mobile viewport/touch simulation, intercepted Auth/API, no physical phone or deployed backend tested.'};
 try{
  await openHome(page,lab.url);await page.locator('.m156-gallery').waitFor();
  await page.locator('.m13-dock [data-m13-menu]').click();await page.locator('dialog[open] #m13-quality').selectOption('eco');await page.waitForFunction(()=>document.querySelector('.m156-gallery')?.dataset.packGalleryQuality==='eco');
  assert.equal(await page.locator('[data-gallery-active="true"]').count()<=3,true);await page.locator('dialog[open] #m13-quality').selectOption('high');await page.waitForFunction(()=>document.querySelector('.m156-gallery')?.dataset.packGalleryQuality==='full');await page.locator('dialog[open] [data-m13-close]').click();report.checks.push({name:'Changer la qualité depuis le menu met immédiatement à jour la galerie montée, sans navigation',success:true});
  const open=page.locator('[data-pack-gallery-selection] [data-action="open-pack"]');await open.scrollIntoViewIfNeeded();const scrollBefore=await page.evaluate(()=>window.scrollY);assert.ok(scrollBefore>0,'the return test really begins below the top of the page');await open.click();await page.locator('[data-v14-break-seal]').waitFor();assert.equal(await page.locator('#page').evaluate(node=>getComputedStyle(node).visibility),'hidden');assert.equal(await page.evaluate(()=>window.scrollY),scrollBefore);await page.locator('[data-v14-break-seal]').click();await page.locator('.opening-top-card:not([disabled])').waitFor();await page.locator('#opening-speed').click();
  for(let i=0;i<3;i++){
   await page.locator('.opening-top-card:not([disabled])').click();await page.waitForFunction(()=>document.querySelector('.opening-top-card')?.classList.contains('revealed')&&!document.querySelector('.opening-top-card')?.disabled);await page.locator('.opening-top-card:not([disabled])').click();
   if(i<2)await page.waitForFunction(i=>document.querySelector('#opening-progress')?.textContent.startsWith('Carte '+(i+2)),i);
  }
  await page.getByRole('button',{name:'Revenir aux boosters ↗'}).waitFor();await page.locator('#opening-done').click();await page.locator('[data-pack-gallery-rail]').waitFor();const scrollAfter=await page.evaluate(()=>window.scrollY);assert.ok(Math.abs(scrollAfter-scrollBefore)<2);assert.equal(await page.locator('#page').evaluate(node=>getComputedStyle(node).visibility),'visible');assert.equal(f.calls.filter(c=>c.route==='/api/packs/commit').length,1);report.checks.push({name:'Ouverture depuis la galerie : fond masqué sans perte de disposition, confirmation unique et retour à la même position',success:true,scrollBefore,scrollAfter});
  assert.deepEqual(f.errors,[]);assert.deepEqual(f.consoleErrors,[]);report.success=true;saveJson('gallery-options-results.json',report);console.log(JSON.stringify(report,null,2));
 }catch(error){report.success=false;report.failure=error.stack;saveJson('gallery-options-results.json',report);throw error;}
 finally{await f.context.close();await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
