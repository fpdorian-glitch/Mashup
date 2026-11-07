/* Native HTTP-cache laboratory: no Playwright routing, no production traffic.
 * The only source rewrites are service URLs and a local-only art allowlist.
 * Server byte counts describe these controlled equivalents, not live egress. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright-core');
const {ROOT,ARTIFACTS,fictionalData,openHome,navigate,measure}=require('./harness.cjs');
const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 fs.mkdirSync(ARTIFACTS,{recursive:true});const baseline=fs.mkdtempSync(path.join(os.tmpdir(),'mashup-v16-net-'));
 const archive=spawnSync('git',['archive','79172e1'],{cwd:ROOT,maxBuffer:100e6});assert.equal(archive.status,0);assert.equal(spawnSync('tar',['-x','-C',baseline],{input:archive.stdout}).status,0);
 const calls=[],fixtures={},handlers={},results={baseline:'79172e1',version:'16.0.0',method:'Local native HTTP server, actual Chromium HTTP cache, identical fictional catalogues (360 cards), identical PNG image bytes, uncompressed JSON. External HTTPS blocked by CDP; no request interception.',limits:'Controlled simulated Supabase/GitHub sources, not production Supabase egress. No actual deployed headers, RLS, JWT, device radio, iPhone or Android hardware measured.'};
 const data=fictionalData();data.user.role='player';const template=data.cards;
 data.cards=Array.from({length:360},(_,i)=>({...template[i%template.length],id:'fixture-'+String(i+1).padStart(4,'0'),editionNumber:i+1,name:'Gardien du seuil '+String(i+1).padStart(3,'0'),variant:'standard',rarity:['common','rare','epic','legendary','mythic','ultra'][i%6]}));
 data.state.owned=Object.fromEntries(data.cards.map(c=>[c.id,2]));data.state.deck=data.cards.slice(0,3).map(c=>c.id);data.state.deckDouble=data.cards.slice(0,6).map(c=>c.id);
 const fixtureSource=fs.readFileSync(path.join(__dirname,'harness.cjs'),'utf8');
 const bodySource=fixtureSource.slice(fixtureSource.indexOf('   const {cards,state,user}=fixtures;'),fixtureSource.indexOf('   const queue=once.get(routeName)'));
 function protocol(){return new Function('let battle=null;return function(fixtures,request,routeName){'+bodySource+';return body;}')();}
 const art=fs.readFileSync(path.join(ROOT,'assets/mashup-app-512.png'));let origin;
 const server=http.createServer((req,res)=>{(async()=>{
  const u=new URL(req.url,origin),version=u.pathname.split('/')[1],f=fixtures[version],isAPI=u.pathname.startsWith('/__supabase/'),isArt=u.pathname.startsWith('/__art/');
  const send=(body,type,category,cache='no-store',extra={})=>{const bytes=Buffer.isBuffer(body)?body:Buffer.from(body);res.writeHead(200,{'Content-Type':type,'Cache-Control':cache,...extra});res.end(bytes);calls.push({version:isAPI||u.pathname==='/__sdk.js'?u.searchParams.get('v'):isArt?(u.searchParams.get('v')==='1'?'before':'after'):version,category,route:u.searchParams.get('route')||u.pathname,bytes:bytes.length,method:req.method});};
  if(isAPI){const v=u.searchParams.get('v'),fixture=fixtures[v],route=u.searchParams.get('route');let text='';for await(const chunk of req)text+=chunk;const request={postData:()=>text,method:()=>req.method};let body=handlers[v](fixture,request,route);
   if(route==='/api/bootstrap')body={...body,series:[{number:2,name:'Chroniques du seuil',visible:true,boosterEnabled:true,targetCount:360}],packRates:{starter:{common:50,rare:30,epic:16,legendary:4,mythic:0,ultra:0},rift:{common:47,rare:30,epic:18,legendary:5,mythic:0,ultra:0},cosmos:{common:30,rare:31,epic:27,legendary:11,mythic:1,ultra:0}}};
   if(route==='/api/market/buy'){fixture.state.coins-=650;body={state:fixture.state};}
   if(route==='/api/packs/commit'){fixture.state.coins-=120;body.state=fixture.state;}
   return send(JSON.stringify(body),'application/json','supabase-json');
  }
  if(isArt)return send(art,'image/png','supabase-art','private,max-age=31536000,immutable');
  if(u.pathname==='/__sdk.js')return send("export function createClient(){return {auth:{getSession:async()=>({data:{session:{access_token:'fiction-only'}}}),signOut:async()=>({}),signInWithPassword:async()=>({})}}}",'text/javascript','test-sdk','public,max-age=3600');
  if(!['before','after'].includes(version)){res.writeHead(404).end();return;}
  const base=version==='before'?baseline:ROOT,pathname=decodeURIComponent(u.pathname.slice(version.length+1))||'/index.html',file=path.resolve(base,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
  let bytes;try{bytes=fs.readFileSync(file);}catch{res.writeHead(404).end();return;}
  if(path.basename(file)==='index.html'){
   let html=bytes.toString().replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1/+esm',origin+'/__sdk.js?v='+version);
   html=html.replaceAll('https://lxpgdhwfxeicuofycqup.supabase.co/functions/v1/mashup-api-gh?route=',origin+'/__supabase/api?v='+version+'&route=').replaceAll('https://lxpgdhwfxeicuofycqup.supabase.co/functions/v1/mashup-games?route=',origin+'/__supabase/games?v='+version+'&route=');
   html=html.replace("function safeImage(uri){", "function safeImage(uri){if(typeof uri==='string'&&uri.startsWith('"+origin+"/__art/'))return uri;");bytes=Buffer.from(html);
  }
  return send(bytes,(mime[path.extname(file)]||'text/html')+'; charset=utf-8','github-static','public,max-age=600');
 })().catch(error=>{console.error(error);res.writeHead(500).end();});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
  for(const version of ['before','after']){
   fixtures[version]=structuredClone(data);fixtures[version].cards.forEach(c=>c.art=origin+'/__art/'+c.id+'.png?v='+(version==='before'?'1':'2')+'&revision=1');handlers[version]=protocol();
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.__v15LongTasks=[];new PerformanceObserver(l=>window.__v15LongTasks.push(...l.getEntries().map(e=>({duration:e.duration})))).observe({type:'longtask',buffered:true});});
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['https://*']});
   const network={requests:0,cacheHits:0,encodedBytes:0};cdp.on('Network.requestWillBeSent',()=>network.requests++);cdp.on('Network.requestServedFromCache',()=>network.cacheHits++);cdp.on('Network.loadingFinished',e=>network.encodedBytes+=e.encodedDataLength);
   const snapshot=()=>({bySource:Object.fromEntries(['supabase-json','supabase-art','github-static','test-sdk'].map(cat=>{const rows=calls.filter(c=>c.version===version&&c.category===cat);return[cat,{requests:rows.length,bodyBytes:rows.reduce((n,c)=>n+c.bytes,0)}]})),browser:{...network},apiRoutes:calls.filter(c=>c.version===version&&c.category==='supabase-json').map(c=>({route:c.route,bytes:c.bytes,method:c.method}))});
   const interactions=[];const nav=async view=>{await page.evaluate(()=>window.__navStart=performance.now());await navigate(page,view);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));interactions.push({view,automationToTwoFramesMs:await page.evaluate(()=>Math.round((performance.now()-window.__navStart)*100)/100)});await pause(160);};
   const collection=async()=>{await nav('collection');const choose=page.locator('[data-action=choose-series]');if(await choose.count())await choose.first().click();await page.locator('.collection-item').first().waitFor();await pause(200);};
   await openHome(page,origin+'/'+version+'/');await pause(150);const cold=snapshot();await page.screenshot({path:path.join(ARTIFACTS,version+'-home.png')});
   const timing=await measure(page,{frames:90});await collection();const collectionTiming=await page.evaluate(async()=>{const host=document.querySelector('[data-v16-scroll=collection]')||document.scrollingElement,frames=[];let last;await new Promise(done=>{let i=0;const tick=t=>{if(last!==undefined)frames.push(t-last);last=t;host.scrollTop=(.5-.5*Math.cos(i/90*Math.PI*2))*Math.min(1000,host.scrollHeight-host.clientHeight);if(++i<91)requestAnimationFrame(tick);else done();};requestAnimationFrame(tick);});host.scrollTop=0;const sorted=frames.slice().sort((a,b)=>a-b);return {samples:frames.length,p50ms:sorted[Math.floor(sorted.length*.5)],p95ms:sorted[Math.floor(sorted.length*.95)],over33ms:frames.filter(t=>t>33.34).length,domNodes:document.querySelectorAll('*').length};});
   // Exercise exactly the same first 24 illustrations in each version.
   await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.collection-item img')].slice(0,24).map(img=>{img.loading='eager';return img.decode().catch(()=>{});}));});
   await nav('market');await page.locator('[data-action=v11-buy-listing]').first().waitFor();await nav('packs');const journey=snapshot();
   await collection();await nav('market');await page.locator('[data-action=v11-buy-listing]').first().waitFor();await nav('packs');const warm=snapshot();const artBefore=calls.filter(c=>c.version===version&&c.category==='supabase-art').length;const probe=await page.evaluate(async url=>{const r=await fetch(url);return{bytes:(await r.arrayBuffer()).byteLength,cacheControl:r.headers.get('cache-control')};},fixtures[version].cards[4].art);const httpCacheProbe={...probe,additionalServerRequests:calls.filter(c=>c.version===version&&c.category==='supabase-art').length-artBefore};assert.equal(httpCacheProbe.additionalServerRequests,0,'An already viewed illustration must be fetched from native HTTP cache');
   await nav('market');if(version==='before')page.once('dialog',d=>d.accept());await page.locator('[data-action=v11-buy-listing]').first().click();if(version==='after')await page.locator('dialog [data-confirm=yes]').click();await page.waitForFunction(()=>document.getElementById('coin-balance')?.textContent.replace(/\D/g,'')==='1800');await pause(300);const purchase=snapshot();
   await nav('packs');await page.locator('[data-action=open-pack]').filter({visible:true}).first().click();await page.locator('[data-v14-break-seal]').click();await page.locator('#opening-speed').click();
   for(let i=0;i<3;i++){await page.locator('.opening-top-card:not([disabled])').click();await page.waitForFunction(()=>document.querySelector('.opening-top-card')?.classList.contains('revealed')&&!document.querySelector('.opening-top-card')?.disabled);await page.locator('.opening-top-card:not([disabled])').click();}
   await page.locator('#opening-done').click();
   if(version==='before')await nav('arena');else{await nav('games');await page.locator('[data-v16-game=arena]').click();}
   await page.locator('[data-action=start-battle]').click();await page.locator('.rb-arena').waitFor();
   for(let round=0;round<4;round++){await page.locator(round%2?'[data-action=ai-turn]':'[data-action=challenge-stat][data-stat=power]').click();await page.locator('.rb-comparison').waitFor();if(round<3)await page.locator('[data-action=next-round]').click();}
   await nav('packs');await pause(250);const session=snapshot();await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});const cpu4x=await measure(page,{frames:90});await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
   results[version]={cold,journey,warm,purchase,session,httpCacheProbe,homePerformance:timing,cpu4xHome:cpu4x,collectionPerformance:collectionTiming,interactions,pageErrors:errors};assert.deepEqual(errors,[]);await context.close();
  }
  assert.equal(results.before.cold.bySource['supabase-json'].bodyBytes,results.after.cold.bySource['supabase-json'].bodyBytes,'Identical fixture metadata bytes');assert.equal(results.before.session.bySource['supabase-art'].bodyBytes,results.after.session.bySource['supabase-art'].bodyBytes,'Identical imagery quality and session coverage');assert.equal(results.after.warm.bySource['supabase-art'].requests,results.after.journey.bySource['supabase-art'].requests,'Warm images must use actual HTTP cache');assert.ok(results.after.session.bySource['supabase-json'].bodyBytes<results.before.session.bySource['supabase-json'].bodyBytes);results.success=true;fs.writeFileSync(path.join(ARTIFACTS,'network-results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(baseline,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
