/* Real client in Chromium; every remote API response is a local fictional fixture. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {laboratory,fixtureContext,openHome,navigate,ARTIFACTS,saveJson}=require('./harness.cjs');

(async()=>{
 const lab=await laboratory(),contexts=[],fixtures=[],pages=[];
 const report={baseline:'79172e1',productionRequests:0,browser:lab.browser.version(),physicalPhone:false,checks:[],screenshots:[],limits:'Chromium Linux with touch and mobile viewport simulation. API/Auth are intercepted; no real server schedule, wallet or physical phone was tested.'};
 try{
  const deadline=Date.now()+462000;
  const fighters=[
   {name:'Veilleur fictif',power:87,elo:1200,wins:3,losses:1},
   {name:'Oracle fictif',power:81,elo:1190,wins:2,losses:2},
   {name:'Sentinelle fictive',power:79,elo:1180,wins:2,losses:1},
   {name:'Éclaireuse fictive',power:84,elo:1200,wins:3,losses:2}
  ];
  const phase={live:null,current:{id:'fiction-common-fight',closesAt:deadline,mode:'double',season:1,sides:[fighters.slice(0,2),fighters.slice(2)],odds:[1.8,1.7],probabilities:[.51,.49]}};
  const devices=[{width:390,height:844,shift:-120000},{width:320,height:568,shift:4*3600000}];
  report.geometry=[];
  for(const [index,device] of devices.entries()){
   const f=await fixtureContext(lab,device);contexts.push(f.context);fixtures.push(f);
   f.fixtures.user={...f.fixtures.user,id:'fiction-clock-player-'+index,pseudo:'Joueur fictif '+(index+1)};
   f.controls.set('status',()=>({body:{now:Date.now(),credits:2450,enabled:true,league:{season:1,standings:[]},...phase,active:null,settings:{memory:20,daily:35},history:[]}}));
   const page=await f.context.newPage();pages.push(page);
   await page.addInitScript(shift=>{const wall=Date.now;Date.now=()=>wall()+shift;},device.shift);
   await openHome(page,lab.url);await navigate(page,'games');
   // Deliberately use the lower hub card: switching sections must restore scroll.
   await page.locator('[data-v16-game="casino"]').click();
   await page.waitForFunction(()=>/^\d{2}:\d{2}$/.test(document.querySelector('#games-clock')?.textContent));
   const geometry=await page.locator('#games-clock').evaluate(n=>{
    const r=n.getBoundingClientRect(),dock=document.querySelector('.v16-dock')?.getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,width:r.width,viewport:{width:innerWidth,height:innerHeight},dockTop:dock?.top??innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(geometry.top>=0&&geometry.bottom<=geometry.dockTop,'Clock must be immediately visible above navigation: '+JSON.stringify(geometry));assert.equal(geometry.overflow,false);
   report.geometry.push(geometry);
   const name='casino-clock-'+device.width+'.png';await page.screenshot({path:path.join(ARTIFACTS,name)});report.screenshots.push(name);
   assert.deepEqual(f.errors,[]);assert.deepEqual(f.consoleErrors,[]);
  }
  report.checks.push('Clock immediately visible above dock at390×844 and320×568; no horizontal overflow');
  const seconds=t=>Number(t.split(':')[0])*60+Number(t.split(':')[1]);
  const times=await Promise.all(pages.map(page=>page.locator('#games-clock').textContent()));
  assert.ok(Math.abs(seconds(times[0])-seconds(times[1]))<=1,JSON.stringify(times));report.twoPlayerCountdowns=times;
  report.checks.push('Two distinct fictional accounts with local clocks−2minutes/+4hours share the same server countdown within1second');
  await pages[0].reload({waitUntil:'networkidle'});await navigate(pages[0],'games');await pages[0].locator('[data-v16-game="casino"]').click();
  await pages[0].waitForFunction(()=>/^\d{2}:\d{2}$/.test(document.querySelector('#games-clock')?.textContent));
  const after=await pages[0].locator('#games-clock').textContent();assert.ok(seconds(after)<=seconds(times[0])&&seconds(times[0])-seconds(after)<20);report.afterReload=after;
  report.checks.push('Reload preserves the shared absolute deadline rather than starting a new countdown');
  phase.current.closesAt=Date.now()+19000;
  await Promise.all(pages.map(page=>page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')))));
  for(const page of pages){await page.waitForFunction(()=>document.querySelector('#games-casino-clock-panel')?.dataset.casinoUrgent==='true');assert.equal(await page.locator('#games-casino-alert').isVisible(),true);}
  report.checks.push('Resume via visibilitychange fetches server status and displays the20second visual alert');
  phase.current.closesAt=Date.now()-100;
  await Promise.all(pages.map(page=>page.evaluate(()=>window.dispatchEvent(new Event('online')))));
  for(const page of pages){await page.waitForFunction(()=>document.querySelector('#games-clock')?.textContent==='00:00');assert.equal(await page.locator('[data-games="bet"]').isDisabled(),true);}
  report.checks.push('Server deadline closure disables betting for both accounts');
  phase.live={...phase.current,finished:false,winner:null,revealedRounds:[]};phase.current={...phase.current,id:'fiction-next-confirmed-fight',closesAt:Date.now()+600000};
  await Promise.all(pages.map(page=>page.evaluate(()=>window.dispatchEvent(new Event('online')))));
  for(const page of pages)await page.waitForFunction(()=>document.querySelector('#games-casino-clock-panel')?.dataset.casinoPhase==='live');
  phase.live={...phase.live,finished:true,status:'finished',winner:null,score:[2,2]};
  await Promise.all(pages.map(page=>page.evaluate(()=>window.dispatchEvent(new Event('online')))));
  for(const page of pages){await page.waitForFunction(()=>document.querySelector('#games-casino-clock-panel')?.dataset.casinoPhase==='results');assert.ok((await page.locator('.games-result-band').textContent()).includes('Égalité'));}
  report.checks.push('Server live/result states and a confirmed next schedule replace the previous phase without local fight creation');
  for(const f of fixtures){assert.deepEqual(f.errors,[]);assert.deepEqual(f.consoleErrors,[]);assert.equal(f.calls.some(c=>['start','bet','move','daily'].includes(c.route)),false);}
  report.checks.push('All casino actions in this scenario are status reads; no fight creation, bet, or payout request');
  report.success=true;report.apiCalls=fixtures.map(f=>f.calls);saveJson('casino-browser-results.json',report);
  const failure=path.join(ARTIFACTS,'casino-failure.png');if(fs.existsSync(failure))fs.unlinkSync(failure);
  console.log(JSON.stringify({success:true,checks:report.checks,twoPlayerCountdowns:times,afterReload:after,screenshots:report.screenshots},null,2));
 }catch(error){
  report.success=false;report.failure=error.stack;if(pages[0])await pages[0].screenshot({path:path.join(ARTIFACTS,'casino-failure.png')}).catch(()=>{});saveJson('casino-browser-results.json',report);throw error;
 }finally{await Promise.allSettled(contexts.map(context=>context.close()));await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
