/* Comparative browser measurements, not a physical-device benchmark. */
const assert=require('node:assert/strict');
const {laboratory,fixtureContext,openHome,openCollection,measure,saveJson}=require('./harness.cjs');
(async()=>{
 const lab=await laboratory({baseline:true});
 const report={kind:'synthetic-performance-comparison',baselineCommit:'b20fb58',started:new Date().toISOString(),productionRequests:0,
  conditions:{engine:'Chromium headless Linux',viewport:'390 × 844 CSS px',deviceScaleFactor:1,framesPerScene:120,gpu:'disabled',data:'36 fictional cards, local API fixtures, no real Supabase',method:'same fixture, same machine, warm scene, rAF intervals; not measured physical FPS'},
  limits:['Aucune validation Android ou iPhone physique.','Les intervalles rAF ne mesurent pas le temps GPU complet ni les images perdues par le compositeur.','Heap Chromium indicatif, dépend du garbage collector ; ne prouve pas une fuite mémoire.','Long tasks observées pendant l’échantillonnage seulement.','Aucun seuil marketing de 60/120 fps et aucune amélioration physique déduits.'],runs:[]};
 try{
  for(const [name,suffix] of [['main-b20fb58','/baseline/'],['v14','/']]){
   const fixture=await fixtureContext(lab),page=await fixture.context.newPage();
   try{
    await page.addInitScript(()=>localStorage.setItem('mashup-display-v13','high'));
    await openHome(page,lab.url+suffix);
    await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='high');
    const home=await measure(page,{frames:120});
    await openCollection(page);const collection=await measure(page,{frames:120,scroll:true});
    assert.deepEqual(fixture.errors,[]);assert.deepEqual(fixture.consoleErrors,[]);
    report.runs.push({name,home,collection,externalRequestsIntercepted:fixture.external.length,pageErrors:fixture.errors,consoleErrors:fixture.consoleErrors});
   }finally{await fixture.context.close();}
  }
  const [before,after]=report.runs;
  report.delta={};
  for(const scene of ['home','collection'])report.delta[scene]={domNodes:after[scene].domNodes-before[scene].domNodes,cards:after[scene].cards-before[scene].cards,p95FrameIntervalMs:Math.round((after[scene].frameIntervals.p95ms-before[scene].frameIntervals.p95ms)*100)/100,jsHeapUsedBytes:after[scene].jsHeapUsedBytes!==null&&before[scene].jsHeapUsedBytes!==null?after[scene].jsHeapUsedBytes-before[scene].jsHeapUsedBytes:null};
  report.success=true;saveJson('performance-results.json',report);console.log(JSON.stringify(report,null,2));
 }catch(error){report.success=false;report.failure=error.stack;saveJson('performance-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
