/* Diagnostic only: compare local HTML/CSS variants in fictional browser contexts.
 * Variant B moves hydration to the user's reveal click; no source file is edited.
 * This is a rendering experiment, not a production transaction/security test.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {laboratory,fixtureContext,openHome,measure,saveJson,ROOT}=require('./harness.cjs');
const source=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const hydrationMatch=source.match(/^[ \t]*const face=button\.querySelector\('\[data-opening-face\]'\);\n[ \t]*if\(face\)face\.innerHTML=.*;\n/m);
assert.ok(hydrationMatch,'expected one chosen-card hydration site');
const bare=source.replace(hydrationMatch[0],''),lines=hydrationMatch[0].trim().split('\n').map(line=>line.trim());
const shifted=bare.replace('    const prelude=boosterFX.preludeMs(upcoming);',lines.map(line=>'    '+line).join('\n')+'\n    const prelude=boosterFX.preludeMs(upcoming);');
const revealAnchor="onReveal:()=>{clearOpeningOmen();button.classList.add('revealed');boosterFX.play(upcoming);},";
assert.ok(bare.includes(revealAnchor),'expected reveal callback in the final client');
const late=bare.replace(revealAnchor,"onReveal:()=>{clearOpeningOmen();\n"+lines.map(line=>'        '+line).join('\n')+"\n        button.classList.add('revealed');boosterFX.play(upcoming);\n      },");
assert.notEqual(late,bare,'late hydration variant must be reconstructed');
assert.notEqual(shifted,bare,'intent hydration variant must be reconstructed');
for(const html of [late,shifted])assert.equal((html.match(/if\(face\)face\.innerHTML=/g)||[]).length,1,'one chosen-card hydration site per variant');
const noStack='<style>.opening-fullscreen .pack-stack-surface::before{content:none!important}.opening-fullscreen .pack-stack-layer{border-width:1px!important;box-shadow:none!important}</style>';
const variants=[{id:'late-hydration-reference',html:late},{id:'hydrate-at-intent',html:shifted},{id:'without-new-paper-edges',html:late.replace('</head>',noStack+'</head>')}];
const reportName=process.env.V156_PROFILE_OUTPUT||'booster-profile-reproduction.json';
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
(async()=>{
 const lab=await laboratory(),report={kind:'local-rendering-hypothesis-isolation',started:new Date().toISOString(),productionRequests:0,repeats:3,framesPerRun:90,measurementWindow:'rAF and long-task windows start BEFORE the reveal click; HTML setter and input-to-next-rAF instrumented equally in every variant.',browser:await lab.browser.version(),runs:[],limits:'Chromium Linux390×844, GPU disabled, all data/Auth/API fictional and intercepted. HTML/CSS diagnostic variants only; repository game sources unchanged.'};
 try{
  for(let repetition=0;repetition<3;repetition++)for(const variant of variants){
   console.log('PROFILE '+variant.id+' '+repetition);const f=await fixtureContext(lab),page=await f.context.newPage();await page.addInitScript(()=>{
    localStorage.setItem('mashup-display-v13','high');window.__profileTrace={hydrationMs:[],intentAt:null,firstRafAfterIntentMs:null,captureMicrotaskMs:null,revealedAt:null,handlerEndMs:null};
    const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');Object.defineProperty(Element.prototype,'innerHTML',{...descriptor,set(value){if(this.hasAttribute('data-opening-face')){const at=performance.now();descriptor.set.call(this,value);window.__profileTrace.hydrationMs.push(performance.now()-at);}else descriptor.set.call(this,value);}});
    window.addEventListener('click',event=>{const button=event.target.closest?.('[data-action="flip-next"]');if(!button||button.classList.contains('revealed'))return;const trace=window.__profileTrace;trace.intentAt=performance.now();requestAnimationFrame(()=>trace.firstRafAfterIntentMs=performance.now()-trace.intentAt);queueMicrotask(()=>trace.captureMicrotaskMs=performance.now()-trace.intentAt);},true);
    window.addEventListener('click',event=>{if(event.target.closest?.('[data-action="flip-next"]')&&window.__profileTrace.intentAt!==null)window.__profileTrace.handlerEndMs=performance.now()-window.__profileTrace.intentAt;});
    document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(records=>{for(const record of records)if(record.target.matches?.('.opening-top-card.revealed'))window.__profileTrace.revealedAt=performance.now();}).observe(document.getElementById('modal-root'),{attributes:true,subtree:true,attributeFilter:['class']});});
   });await page.route(lab.url+'/',route=>route.fulfill({contentType:'text/html',body:variant.html}));
   f.controls.set('/api/packs/prepare',()=>({body:{openingId:'fiction-profile-opening',results:[{...f.fixtures.cards[23],rarity:'ultra',variant:'secret'},f.fixtures.cards[0],f.fixtures.cards[1]]}}));
   try{
    await openHome(page,lab.url);await page.locator('.m13-hero [data-action="open-pack"]').click();await page.locator('[data-v14-break-seal]').click();await page.locator('.opening-top-card:not([disabled])').waitFor();assert.equal(await page.locator('.opening-top-card .tcg-card').count(),0);const measuring=page.evaluate(async()=>{
     const before=window.__v15LongTasks.length,intervals=[];let last;window.__profileRunning=true;const measurementStarted=performance.now();
     await new Promise(resolve=>{function tick(t){if(last!==undefined)intervals.push(t-last);last=t;if(intervals.length<90)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
     const sorted=intervals.slice().sort((a,b)=>a-b),round=n=>Math.round(n*100)/100,trace=window.__profileTrace;
     return {frameIntervals:{samples:intervals.length,p50ms:round(sorted[45]),p95ms:round(sorted[85]),maxMs:round(sorted.at(-1)),over33ms:intervals.filter(n=>n>33.34).length},longTasks:window.__v15LongTasks.slice(before),input:{measurementStartedBeforeIntent:measurementStarted<=trace.intentAt,firstRafAfterIntentMs:trace.firstRafAfterIntentMs,captureMicrotaskMs:trace.captureMicrotaskMs,handlerEndMs:trace.handlerEndMs,hydrationMs:trace.hydrationMs,intentToRevealClassMs:trace.revealedAt-trace.intentAt}};
    });await page.waitForFunction(()=>window.__profileRunning===true);await page.locator('.opening-top-card').click();const result=await measuring;assert.equal(result.input.measurementStartedBeforeIntent,true);assert.deepEqual(f.errors,[]);assert.deepEqual(f.consoleErrors,[]);report.runs.push({variant:variant.id,repetition,...result});
   }finally{await f.context.close();}
  }
  report.medians={};for(const variant of variants){const runs=report.runs.filter(run=>run.variant===variant.id);report.medians[variant.id]={p95FrameIntervalMs:median(runs.map(r=>r.frameIntervals.p95ms)),intervalsOver33ms:median(runs.map(r=>r.frameIntervals.over33ms)),longTaskCount:median(runs.map(r=>r.longTasks.length)),rawLongTasks:runs.map(r=>r.longTasks),input:runs.map(r=>r.input)};}
  report.success=true;saveJson(reportName,report);console.log(JSON.stringify({success:true,medians:report.medians},null,2));
 }catch(error){report.success=false;report.failure=error.stack;saveJson(reportName,report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
