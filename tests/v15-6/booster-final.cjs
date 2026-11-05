/* Final, unmodified client. Timing starts before the reveal click. */
const assert=require('node:assert/strict'),path=require('node:path');
const {laboratory,fixtureContext,openHome,saveJson,ARTIFACTS}=require('./harness.cjs');
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
(async()=>{
 const lab=await laboratory(),report={kind:'final-unmodified-client-current-only-follow-up',browser:await lab.browser.version(),started:new Date().toISOString(),productionRequests:0,runs:[],conditions:{viewport:{width:390,height:844},gpu:'disabled',quality:'high',framesPerRun:90,repeats:3,window:'Starts before the user reveal click, includes initial rendering and long tasks. No HTML/CSS/source transformation or setter override.',reference:'Baseline measurements remain in performance-results.json and performance-follow-up.json; baseline was not rerun in this final current-only check.'},limits:'Chromium Linux and fictional Auth/API; no physical phone, Safari iOS, real network, player or backend tested.'};
 try{
  for(let repetition=0;repetition<3;repetition++){
   console.log('FINAL BOOSTER '+repetition);const f=await fixtureContext(lab),page=await f.context.newPage();await page.addInitScript(()=>localStorage.setItem('mashup-display-v13','high'));
   f.controls.set('/api/packs/prepare',()=>({body:{openingId:'fiction-final-opening',results:[{...f.fixtures.cards[23],rarity:'ultra',variant:'secret'},f.fixtures.cards[0],f.fixtures.cards[1]]}}));
   try{
    await openHome(page,lab.url);await page.locator('.m13-hero [data-action="open-pack"]').click();await page.locator('[data-v14-break-seal]').click();await page.locator('.opening-top-card:not([disabled])').waitFor();assert.equal(await page.locator('.opening-top-card .tcg-card').count(),0);
    const measuring=page.evaluate(async()=>{
     const before=window.__v15LongTasks.length,intervals=[];let last,intentAt=null,nextFrameAfterIntentMs=null;const at=performance.now();
     const intent=event=>{if(!event.target.closest?.('[data-action="flip-next"]'))return;intentAt=performance.now();requestAnimationFrame(()=>nextFrameAfterIntentMs=performance.now()-intentAt);};window.addEventListener('click',intent,true);window.__finalMeasureReady=true;
     await new Promise(resolve=>{function tick(t){if(last!==undefined)intervals.push(t-last);last=t;if(intervals.length<90)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});window.removeEventListener('click',intent,true);
     const sorted=intervals.slice().sort((a,b)=>a-b),round=n=>Math.round(n*100)/100;
     return {frameIntervals:{samples:intervals.length,p50ms:round(sorted[45]),p95ms:round(sorted[85]),maxMs:round(sorted.at(-1)),over33ms:intervals.filter(n=>n>33.34).length},longTasks:window.__v15LongTasks.slice(before),input:{windowStartedBeforeIntent:at<=intentAt,nextFrameAfterIntentMs}};
    });await page.waitForFunction(()=>window.__finalMeasureReady===true);await page.locator('.opening-top-card').click();const result=await measuring;assert.equal(result.input.windowStartedBeforeIntent,true);assert.equal(await page.locator('.opening-top-card .tcg-card').count(),1);assert.deepEqual(f.errors,[]);assert.deepEqual(f.consoleErrors,[]);report.runs.push({repetition,...result});if(repetition===0)await page.screenshot({path:path.join(ARTIFACTS,'booster-final-render.png')});
   }finally{await f.context.close();}
  }
  report.median={p95FrameIntervalMs:median(report.runs.map(r=>r.frameIntervals.p95ms)),intervalsOver33ms:median(report.runs.map(r=>r.frameIntervals.over33ms)),longTaskCount:median(report.runs.map(r=>r.longTasks.length)),nextFrameAfterIntentMs:median(report.runs.map(r=>r.input.nextFrameAfterIntentMs))};report.success=true;saveJson('booster-final-results.json',report);console.log(JSON.stringify(report,null,2));
 }catch(error){report.success=false;report.failure=error.stack;saveJson('booster-final-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
