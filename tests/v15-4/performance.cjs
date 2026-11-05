/* Sequential baseline/current browser measurements. Never a physical-phone claim. */
const assert=require('node:assert/strict'),os=require('node:os'),fs=require('node:fs'),path=require('node:path');
const {laboratory,fixtureContext,openHome,openCollection,navigate,measure,saveJson,ARTIFACTS}=require('./harness.cjs');
const REPEATS=Number(process.env.V154_PERF_REPEATS)||3,FRAMES=90;
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
(async()=>{
 const lab=await laboratory({baseline:true}),report={kind:'sequential-synthetic-browser-comparison',baselineCommit:'f82a8cd',started:new Date().toISOString(),productionRequests:0,runs:[],screenshots:[],
  conditions:{browser:lab.browser.version(),platform:os.platform()+' '+os.arch(),cpu:os.cpus()[0]?.model,viewport:{width:390,height:844},deviceScaleFactor:1,gpu:'disabled',framesPerScene:FRAMES,repeats:REPEATS,fixture:'36 fictional illustrated cards, local static assets, intercepted auth/APIs, service workers blocked',method:'Fresh contexts, baseline and V15.4 sequential, identical fixture and high quality. No concurrent test or screencast. One additional V15.4 eco run.'},
  limits:['Aucun téléphone Android ou iPhone physique testé.','Chromium Linux; les dimensions tactiles ne sont pas Safari iOS.','rAF mesure l’ordonnancement, pas tout le coût GPU/compositeur.','Les API sont simulées; aucune mesure de latence Supabase ou de téléchargement des illustrations réelles.','Les heaps dépendent du GC, et ne prouvent pas une fuite.','Les tâches longues sont recueillies uniquement pendant la fenêtre d’échantillonnage.']};
 try{
  const modes=Array.from({length:REPEATS},(_,repetition)=>[{version:'v15.3.1',suffix:'/baseline/',quality:'high',repetition},{version:'v15.4',suffix:'/',quality:'high',repetition}]).flat().concat({version:'v15.4',suffix:'/',quality:'eco',repetition:0});
  for(const mode of modes){
   console.log('MEASURE '+mode.version+' '+mode.quality+' repeat'+mode.repetition);
   const f=await fixtureContext(lab),page=await f.context.newPage(),run={...mode,scenes:{}};page.on('dialog',dialog=>dialog.accept());page.setDefaultTimeout(15000);
   let memory=null;
   const fighters=Array.from({length:20},(_,i)=>({name:'Veilleur fictif '+(i+1),power:70+i,elo:1100+i*10,wins:i,losses:3,rank:i+1}));
   const status=()=>({now:Date.now(),credits:2450,enabled:true,league:{season:1,standings:fighters},current:{id:'fiction-performance-fight',closesAt:Date.now()+462000,mode:'simple',season:1,sides:[[fighters[0]],[fighters[1]]],odds:[1.8,1.8],probabilities:[.5,.5]},active:memory,settings:{memory:20,daily:35},history:[],daily:{wins:[],claimed:false}});
   f.controls.set('status',()=>({body:status()}));
   f.controls.set('start',()=>{memory={id:'fiction-memory',type:'memory',first:null,pairs:0,mistakes:0,attempts:0,done:false,tiles:Array.from({length:12},()=>null)};return {body:status()};});
   f.controls.set('abandon',()=>{memory=null;return {body:status()};});
   f.controls.set('match/status',()=>({body:{}}));
   f.controls.set('/api/packs/prepare',()=>({body:{openingId:'fiction-performance-opening',results:[{...f.fixtures.cards[23],rarity:'ultra',variant:'secret'},f.fixtures.cards[0],f.fixtures.cards[1]]}}));
   const sample=async(name,{scroll=false,selector}={})=>{
    run.scenes[name]=await measure(page,{frames:FRAMES,scroll});assert.equal(run.scenes[name].overflow,false,mode.version+' '+name);
    if(mode.repetition===0&&mode.quality==='high'&&['collection','inspection','arena','casino','match','booster'].includes(name)){
     const file=mode.version.replaceAll('.','-')+'-'+name+'.png';await (selector?page.locator(selector):page).screenshot({path:path.join(ARTIFACTS,file)});report.screenshots.push(file);
    }
   };
   try{
    await page.addInitScript(quality=>localStorage.setItem('mashup-display-v13',quality),mode.quality);await openHome(page,lab.url+mode.suffix);await sample('home');
    await openCollection(page);await sample('collection',{scroll:true});
    await page.locator('.collection-item .tcg-card[role="button"]').first().click();await page.locator('[data-action="zoom-card"]').click();await page.locator('.inspect-stage').waitFor();await page.locator('.inspect-tilter').focus();await page.keyboard.press('ArrowRight');await sample('inspection');await page.locator('[data-action="close-modal"]').click();
    await navigate(page,'arena');await page.locator('[data-action="start-battle"]').click();await page.locator('[data-action="challenge-stat"][data-stat="power"]').click();await page.locator('.rb-comparison').waitFor();await sample('arena');await page.locator('[data-action="quit-battle"]').filter({visible:true}).first().click();
    await navigate(page,'market');await page.locator('#v11-market-results .v11-market-card').waitFor();await sample('market',{scroll:true});
    await navigate(page,'games');await page.locator('[data-games="casino"]').first().click();await page.waitForFunction(()=>/\d\d:\d\d/.test(document.getElementById('games-clock')?.textContent||''));await sample('casino',{scroll:true});
    await page.locator('[data-games="mini"]').first().click();await page.locator('[data-games="start"]').first().click();await page.locator('.games-memory-grid').waitFor();await sample('memory');await page.locator('[data-games="abandon"]').click();
    await navigate(page,'admin');await page.locator('#admin-card-list .admin-card-row').first().waitFor();await sample('admin',{scroll:true});
    if(mode.version==='v15.4'){
     await navigate(page,'games');await page.locator('[data-games="match"]').first().click();await page.locator('[data-mm-action="training"]').click();await page.locator('.mm-level[data-mm-level="1"]').click();await page.locator('[data-mm-board]').waitFor();await sample('match',{selector:'.mm-play'});
    }
    await navigate(page,'packs');await page.locator('.m13-hero [data-action="open-pack"]').click();await page.locator('[data-v14-break-seal]').click();await page.locator('.opening-top-card:not([disabled])').waitFor();await page.locator('.opening-top-card').click();await sample('booster');
    assert.deepEqual(f.errors,[]);assert.deepEqual(f.consoleErrors,[]);run.pageErrors=f.errors;run.consoleErrors=f.consoleErrors;report.runs.push(run);
   }finally{await f.context.close();}
  }
  report.medians={};
  for(const version of ['v15.3.1','v15.4'])for(const quality of version==='v15.4'?['high','eco']:['high']){
   const label=version+'-'+quality,samples=report.runs.filter(run=>run.version===version&&run.quality===quality);report.medians[label]={};
   for(const scene of Object.keys(samples[0].scenes)){
    const values=samples.map(run=>run.scenes[scene]);report.medians[label][scene]={domNodes:median(values.map(value=>value.domNodes)),cards:median(values.map(value=>value.cards)),p95FrameIntervalMs:median(values.map(value=>value.frameIntervals.p95ms)),intervalsOver33ms:median(values.map(value=>value.frameIntervals.over33ms)),longTaskCount:median(values.map(value=>value.longTasks.length)),heapUsedBytes:median(values.map(value=>value.jsHeapUsedBytes||0))};
   }
  }
  report.delta={};for(const scene of Object.keys(report.medians['v15.3.1-high'])){const before=report.medians['v15.3.1-high'][scene],after=report.medians['v15.4-high'][scene];report.delta[scene]={domNodes:after.domNodes-before.domNodes,p95FrameIntervalMs:+(after.p95FrameIntervalMs-before.p95FrameIntervalMs).toFixed(2),longTaskCount:after.longTaskCount-before.longTaskCount};}
  const pairs=[['collection','Collection'],['inspection','Carte en inspection'],['arena','Arène'],['casino','Casino'],['booster','Révélation exceptionnelle']];
  fs.writeFileSync(path.join(ARTIFACTS,'comparison.html'),'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mashup V15.3.1 / V15.4</title><style>body{margin:0;padding:24px;background:#091118;color:#efebd5;font:15px system-ui}h1{font-size:26px}.pair{display:flex;flex-wrap:wrap;gap:22px}figure{margin:0;max-width:390px}img{width:100%;max-width:390px;border:1px solid #53685e;border-radius:14px}figcaption{padding:12px 0}section{margin:30px 0}p{max-width:800px;line-height:1.7;color:#b4c2bd}</style><h1>Mashup : V15.3.1 / V15.4</h1><p>Captures du vrai jeu dans Chromium, mêmes cartes et réponses fictives, fenêtre390×844. Référence f82a8cd. Aucun compte réel ni téléphone physique utilisé.</p>'+pairs.map(([scene,label])=>'<section><h2>'+label+'</h2><div class="pair">'+['v15-3-1','v15-4'].map(version=>'<figure><figcaption>'+version.replaceAll('-','.')+'</figcaption><img src="'+version+'-'+scene+'.png" alt="'+label+' '+version+'"></figure>').join('')+'</div></section>').join('')+'<section><h2>Mashup Match V15.4</h2><figure><img src="v15-4-match.png" alt="Plateau Mashup Match"></figure></section></html>');
  report.success=true;saveJson('performance-results.json',report);console.log(JSON.stringify({success:true,medians:report.medians,delta:report.delta},null,2));
 }catch(error){report.success=false;report.failure=error.stack;saveJson('performance-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
