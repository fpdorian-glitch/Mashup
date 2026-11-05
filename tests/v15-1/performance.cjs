/* Sequential same-machine comparison. Does not benchmark a physical GPU/phone. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {laboratory,fixtureContext,openHome,navigate,measure,ARTIFACTS,saveJson}=require('./harness.cjs');
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
(async()=>{
 const candidateCommit=require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const lab=await laboratory({baseline:true}),report={baseline:'19375ce',candidateCommit,started:new Date().toISOString(),productionRequests:0,repeats:3,conditions:{engine:await lab.browser.version(),platform:os.platform()+' '+os.arch(),cpu:os.cpus()[0]?.model,viewport:'390×844 CSS px',gpu:'disabled',quality:'Global high; V15.1 arena spectacular',frames:120,method:'Fresh browser context per version/repetition, baseline then candidate, sequential. Same fictional cards and APIs. Reveal sample includes the click, rendering and confrontation animation; no concurrent screencast.'},runs:[]};
 try{
  for(let repetition=0;repetition<3;repetition++)for(const [version,suffix] of [['v15','/baseline/'],['v151','/']]){
   const f=await fixtureContext(lab),page=await f.context.newPage();page.on('dialog',d=>d.accept());
   try{
    await page.addInitScript(()=>{localStorage.setItem('mashup-display-v13','high');localStorage.setItem('mashup-arena-quality-v151','spectacular');});
    await openHome(page,lab.url+suffix);await navigate(page,'arena');await page.locator('[data-action="start-battle"]').click();await page.locator('.challenge-field').waitFor();
    const choose=await measure(page);
    if(!repetition)await page.screenshot({path:path.join(ARTIFACTS,version+'-choose.png')});
    const sampling=measure(page);await page.locator('[data-action="challenge-stat"][data-stat="power"]').click();await page.locator('.challenge-result').waitFor();const confrontation=await sampling;
    if(!repetition)await page.screenshot({path:path.join(ARTIFACTS,version+'-reveal.png')});
    await navigate(page,'market');await page.locator('[data-action="v11-market-mode"][data-mode="trades"]').click();await page.locator('#trade-partner option[value="fiction-friend"]').waitFor({state:'attached'});await page.locator('#trade-partner').selectOption('fiction-friend');await page.locator('[data-action="trade-load-target"]').click();
    if(version==='v15')await page.locator('#trade-offer-0').waitFor();else await page.locator('[data-side="offer"].v151-trade-card').first().waitFor();
    const trades=await measure(page,{scroll:true});if(!repetition){await page.locator(version==='v15'?'#trade-offer-0':'.v151-trade-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(ARTIFACTS,version+'-trades.png')});}
    assert.deepEqual(f.errors,[]);assert.deepEqual(f.consoleErrors,[]);
    for(const sample of [choose,confrontation,trades])assert.equal(sample.overflow,false);
    report.runs.push({version,repetition,choose,confrontation,trades});
   }finally{await f.context.close();}
  }
  report.medians={};
  for(const version of ['v15','v151']){
   report.medians[version]={};for(const scene of ['choose','confrontation','trades']){
    const list=report.runs.filter(r=>r.version===version).map(r=>r[scene]);
    report.medians[version][scene]={domNodes:median(list.map(s=>s.domNodes)),cards:median(list.map(s=>s.cards)),p95FrameMs:median(list.map(s=>s.frameIntervals.p95ms)),maxFrameMs:median(list.map(s=>s.frameIntervals.maxMs)),intervalsOver33ms:median(list.map(s=>s.frameIntervals.over33ms)),longTasks:median(list.map(s=>s.longTasks.length)),heapUsedBytes:median(list.map(s=>s.jsHeapUsedBytes||0))};
   }
  }
  const pairs=[['choose','Choix de la statistique'],['reveal','Confrontation'],['trades','Échanges']];
  fs.writeFileSync(path.join(ARTIFACTS,'comparison.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mashup V15 / V15.1</title><style>body{background:#08131c;color:#e8dfc8;font:16px system-ui;padding:24px;margin:0}h1{font:32px Georgia,serif}.pair{display:flex;gap:24px;flex-wrap:wrap}figure{margin:0;max-width:390px}img{width:100%;border:1px solid #9ebec044;border-radius:12px}figcaption{padding:12px 0;color:#afc5c6}section{margin:30px 0}p{color:#a5b9bf}</style><h1>Arena Reborn · V15 / V15.1</h1><p>Captures du vrai jeu dans Chromium Linux, mêmes données fictives,390×844. Référence publiée19375ce. Aucun téléphone physique testé.</p>'+pairs.map(([scene,label])=>'<section><h2>'+label+'</h2><div class="pair">'+[['v15','V15 publiée'],['v151','V15.1 candidate']].map(([v,title])=>'<figure><figcaption>'+title+'</figcaption><img src="'+v+'-'+scene+'.png" alt="'+label+' '+title+'"></figure>').join('')+'</div></section>').join(''));
  report.success=true;saveJson('performance-results.json',report);console.log(JSON.stringify(report.medians,null,2));
 }catch(error){report.success=false;report.failure=error.stack;saveJson('performance-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
