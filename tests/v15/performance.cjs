/* Sequential, reproducible browser comparison. Not a physical phone/GPU benchmark. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {ARTIFACTS,laboratory,fixtureContext,openHome,openCollection,navigate,measure,saveJson}=require('./harness.cjs');
const REPEATS=Number(process.env.V15_PERF_REPEATS)||3;
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
(async()=>{
 const lab=await laboratory({baseline:true}),report={kind:'synthetic-sequential-browser-comparison',baselineCommit:'18f8d14',started:new Date().toISOString(),productionRequests:0,
  conditions:{engine:await lab.browser.version(),platform:os.platform()+' '+os.arch(),cpu:os.cpus()[0]?.model,viewport:'390 × 844 CSS px',deviceScaleFactor:1,framesPerScene:120,repeats:REPEATS,gpu:'disabled',data:'36 fictional cards; intercepted APIs; blocked service workers; no real Supabase',method:'Sequential baseline then V15 in fresh contexts, high quality, same machine/data/viewport, 120 rAF intervals per warm scene. No concurrent test or screencast.'},
  limits:['Aucun téléphone Android ou iPhone physique testé.','rAF mesure l’ordonnancement JS, pas le temps GPU complet ni les images perdues au compositeur.','Le heap indicatif dépend du garbage collector ; il ne démontre pas une fuite.','Long tasks recueillies pendant l’échantillonnage seulement.','Aucun résultat réel réseau, backend ou concurrence transactionnelle n’est extrapolé.'],runs:[],screenshots:[]};
 async function shot(page,name){await page.screenshot({path:path.join(ARTIFACTS,name),fullPage:false});report.screenshots.push(name);}
 try{
  for(let repetition=0;repetition<REPEATS;repetition++)for(const [name,suffix] of [['v14','/baseline/'],['v15','/']]){
   const f=await fixtureContext(lab),page=await f.context.newPage();
   try{
    await page.addInitScript(()=>localStorage.setItem('mashup-display-v13','high'));await openHome(page,lab.url+suffix);await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='high');
    const home=await measure(page,{frames:120});if(!repetition)await shot(page,name+'-home.png');
    await openCollection(page);const collection=await measure(page,{frames:120,scroll:true});if(!repetition)await shot(page,name+'-collection.png');
    await page.locator('.collection-item .tcg-card[role="button"]').first().click();await page.locator('[data-action="zoom-card"]').click();await page.locator('.inspect-stage').waitFor();await page.locator('.inspect-tilter').focus();await page.keyboard.press('ArrowRight');
    const inspection=await measure(page,{frames:120});if(!repetition)await shot(page,name+'-card.png');await page.locator('[data-action="close-modal"]').click();
    let album=null;
    if(name==='v15'){
     await page.locator('[data-action="collection-display"][data-mode="album"]').click();await page.locator('.v15-album').waitFor();album=await measure(page,{frames:120,scroll:true});if(!repetition)await shot(page,'v15-album.png');
    }
    if(!repetition){
     await navigate(page,'arena');await page.locator('[data-action="start-battle"]').click();await page.locator('[data-action="challenge-stat"][data-stat="power"]').click();await page.locator('.challenge-result').waitFor();await shot(page,name+'-combat.png');
    }
    assert.deepEqual(f.errors,[]);assert.deepEqual(f.consoleErrors,[]);for(const scene of [home,collection,inspection,album].filter(Boolean))assert.equal(scene.overflow,false);
    report.runs.push({name,repetition,home,collection,inspection,...(album?{album}:{}),externalRequestsIntercepted:f.external.length,pageErrors:f.errors,consoleErrors:f.consoleErrors});
   }finally{await f.context.close();}
  }
  report.medians={};
  for(const version of ['v14','v15']){
   report.medians[version]={};for(const scene of version==='v15'?['home','collection','inspection','album']:['home','collection','inspection']){
    const samples=report.runs.filter(run=>run.name===version).map(run=>run[scene]);
    report.medians[version][scene]={domNodes:median(samples.map(s=>s.domNodes)),cards:median(samples.map(s=>s.cards)),p95FrameIntervalMs:median(samples.map(s=>s.frameIntervals.p95ms)),intervalsOver33ms:median(samples.map(s=>s.frameIntervals.over33ms)),longTaskCount:median(samples.map(s=>s.longTasks.length)),heapUsedBytes:median(samples.map(s=>s.jsHeapUsedBytes||0))};
   }
  }
  report.delta={};for(const scene of ['home','collection','inspection']){const before=report.medians.v14[scene],after=report.medians.v15[scene];report.delta[scene]={domNodes:after.domNodes-before.domNodes,cards:after.cards-before.cards,p95FrameIntervalMs:+(after.p95FrameIntervalMs-before.p95FrameIntervalMs).toFixed(2)};}
  const before=report.medians.v14.collection,album=report.medians.v15.album;
  report.albumVersusClassic={cards:{v14Classic:before.cards,v15Album:album.cards},domNodes:{v14Classic:before.domNodes,v15Album:album.domNodes},note:'Le feuillet rend moins de cartes ; changement de mode, pas comparaison du même nombre de cartes.'};
  fs.writeFileSync(path.join(ARTIFACTS,'comparison.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mashup V14 / V15 — captures du navigateur</title><style>body{margin:0;padding:24px;background:#090e16;color:#f3e9d6;font:16px system-ui}h1{font-size:24px}p{color:#b4b7bf}section{margin:36px 0}.pair{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0;max-width:390px}figcaption{padding:12px 0;font-weight:700}img{width:100%;max-width:390px;border:1px solid #566071;border-radius:12px}</style><h1>Mashup V14 / V15</h1><p>Captures réelles de Chromium, mêmes cartes fictives et même fenêtre390×844. RéférenceV14 :18f8d14. Aucune donnée de joueur.</p>${[['home','Accueil'],['card','Inspection'],['combat','Arène'],['collection','Collection classique']].map(([scene,label])=>`<section><h2>${label}</h2><div class="pair"><figure><figcaption>V14</figcaption><img src="v14-${scene}.png" alt="${label} V14"></figure><figure><figcaption>V15</figcaption><img src="v15-${scene}.png" alt="${label} V15"></figure></div></section>`).join('')}<section><h2>Nouveau mode album V15</h2><figure><img src="v15-album.png" alt="Album V15"></figure></section><p>Linux headless. Ces captures ne constituent pas un test sur téléphone physique.</p>`);
  report.success=true;saveJson('performance-results.json',report);console.log(JSON.stringify({success:true,medians:report.medians,delta:report.delta,albumVersusClassic:report.albumVersusClassic},null,2));
 }catch(error){report.success=false;report.failure=error.stack;saveJson('performance-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
