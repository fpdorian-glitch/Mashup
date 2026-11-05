/* Local browser laboratory. All players, balances and API responses are fictional. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright-core');

const ROOT=path.resolve(__dirname,'../..');
const ARTIFACTS=path.join(ROOT,'docs/v15/artifacts');
const RARITIES=['common','rare','epic','legendary','mythic','ultra'];
const VARIANTS=['standard','full_art','gold','secret'];
function fictionalData(){
 const source=JSON.parse(fs.readFileSync(path.join(ROOT,'content/convergence-series2.json'),'utf8'));
 const sourceCards=Array.isArray(source)?source:source.cards;
 const cards=sourceCards.slice(0,36).map((card,i)=>({
  ...card,name:'Gardien du seuil '+String(i+1).padStart(2,'0'),family:'Chroniques du seuil',subtitle:'Veilleur des constellations',
  desc:'Carte fictive du laboratoire local.',description:'Carte fictive du laboratoire local.',ability:'Éclat astral',
  hidden:false,archived:false,editionSeries:2,editionNumber:i+1,
  rarity:RARITIES[i%RARITIES.length],variant:VARIANTS[Math.floor(i/6)%VARIANTS.length],
  power:72+(i%24),size:43+(i%40),def:67+(i%30),aura:81+(i%18),intelligence:74+(i%25)
 }));
 const state={coins:2450,dust:180,owned:Object.fromEntries(cards.map(c=>[c.id,2])),deck:cards.slice(0,3).map(c=>c.id),deckDouble:cards.slice(0,6).map(c=>c.id),favorites:[],custom:[],artwork:{},opened:24,wins:12,doubleWins:6,losses:2,streak:3,bestStreak:4,freePackUsed:true};
 const user={id:'fiction-player',username:'fiction@example.invalid',pseudo:'Alex',role:'admin'};
 return {cards,state,user};
}
async function laboratory({baseline=false}={}){
 fs.mkdirSync(ARTIFACTS,{recursive:true});
 let baselineRoot=null;
 if(baseline){
  baselineRoot=fs.mkdtempSync(path.join(os.tmpdir(),'mashup-v15-baseline-'));
  const archive=spawnSync('git',['archive','18f8d14'],{cwd:ROOT,maxBuffer:100*1024*1024});
  assert.equal(archive.status,0,'La référence 18f8d14 doit être disponible localement.');
  const extract=spawnSync('tar',['-x','-C',baselineRoot],{input:archive.stdout});
  assert.equal(extract.status,0,'Extraction de la référence en lecture seule.');
 }
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const isBaseline=baselineRoot&&pathname.startsWith('/baseline/');
  const base=isBaseline?baselineRoot:ROOT;
  let name=isBaseline?pathname.slice('/baseline'.length):pathname;
  if(name==='/__v15/gallery.html'){
   const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
   const inline=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[0]).join('\n');
   const styles=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m=>m[0].replace(/href="\.\//,'href="/')).join('\n');
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+inline+styles+'</head><body></body></html>');return;
  }
  if(name==='/favicon.ico'){res.writeHead(204).end();return;}
  if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(base,'.'+name);
  if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   const type={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'}[path.extname(file)]||'text/html';
   res.setHeader('Content-Type',type+'; charset=utf-8');res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});}
 catch(error){server.close();if(baselineRoot)fs.rmSync(baselineRoot,{recursive:true,force:true});throw error;}
 return {
  browser,url:'http://127.0.0.1:'+server.address().port,
  async close(){await browser.close();await new Promise(resolve=>server.close(resolve));if(baselineRoot)fs.rmSync(baselineRoot,{recursive:true,force:true});}
 };
}
async function fixtureContext(lab,{width=390,height=844,video=false,data=null}={}){
 const context=await lab.browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<800,hasTouch:true,serviceWorkers:'block',...(video?{recordVideo:{dir:path.join(ARTIFACTS,'video'),size:{width:390,height:844}}}:{})});
 const fixtures=data||fictionalData(),calls=[],external=[],errors=[],consoleErrors=[];let battle=null;
 // Every override affects only intercepted requests in this browser context.
 const handlers=new Map(),once=new Map();
 const controls={
  set(route,handler){handlers.set(route,handler);},
  clear(route){handlers.delete(route);once.delete(route);},
  once(route,handler){const queue=once.get(route)||[];queue.push(handler);once.set(route,queue);},
  failNext(route,status=503){this.once(route,()=>({status,body:{error:'Interruption fictive du laboratoire'}}));},
  deferNext(route){let start,release;const started=new Promise(resolve=>start=resolve),released=new Promise(resolve=>release=resolve);this.once(route,async info=>{start(info);return await released;});return {started,release};}
 };
 await context.addInitScript(()=>{
  window.__v15LongTasks=[];
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__v15LongTasks.push({start:Math.round(entry.startTime),duration:Math.round(entry.duration*10)/10});}).observe({type:'longtask',buffered:true});}catch{}
 });
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===lab.url)return route.continue();
  external.push({host:url.hostname,type:request.resourceType(),handling:'local-fixture'});
  if(url.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:"export function createClient(){return {auth:{getSession:async()=>({data:{session:{access_token:'fiction-only'}}}),signOut:async()=>({}),signInWithPassword:async()=>({})}}}"});
  if(url.hostname.endsWith('.supabase.co')){
   const routeName=url.searchParams.get('route')||url.pathname;
   const call={route:routeName,method:request.method(),payload:request.postDataJSON()||null};calls.push(call);
   const {cards,state,user}=fixtures;
   let body={};
   if(routeName==='/api/status')body={setupRequired:false};
   if(routeName==='/api/auth/me')body={user};
   if(routeName==='/api/bootstrap')body={user,state,cards,series:[{number:2,name:'Chroniques du seuil',targetCount:100,description:'Catalogue entièrement fictif',cover:'✦',color:'#cba56b'}],profile:{pseudo:user.pseudo},vouchers:{},devPosts:[],collectionRewards:[]};
   if(routeName==='/api/packs/prepare')body={openingId:'fiction-opening',results:[cards[0],cards[16],{...cards[23],rarity:'ultra',variant:'secret'}]};
   if(routeName==='/api/packs/commit')body={state,cards,results:[cards[0],cards[16],{...cards[23],rarity:'ultra',variant:'secret'}],vouchers:{}};
   if(routeName==='/api/pvp/invitations')body={invitation:null};
   if(routeName==='/api/missions')body={missions:null};
   if(routeName==='/api/collection/rewards')body={collectionRewards:[]};
   if(routeName==='/api/dev-posts')body={posts:[]};
   if(routeName==='/api/market/listings')body={listings:[{id:'fiction-listing',card:{...cards[4],series:2},sellerId:'fiction-friend',sellerName:'Camille',price:650,estimate:700,status:'active'}],myListings:[],limits:{maxPrice:250000}};
   if(routeName==='/api/trades')body={players:[{id:'fiction-friend',pseudo:'Camille'}],trades:[]};
   if(routeName==='/api/trades/partner/fiction-friend')body={id:'fiction-friend',cards:cards.slice(6,12).map(card=>({...card,qty:2}))};
   if(routeName==='/api/pvp')body={players:[],leaderboard:[],match:null,balance:state.coins};
   if(routeName==='/api/admin/users')body={users:[{...user,credits:state.coins,createdAt:'2026-01-01T00:00:00Z'}]};
   if(routeName==='/api/admin/cards/archived')body={cards:[]};
   if(routeName==='/api/leaderboard')body={modes:[{id:'collection',label:'Collections',unit:'cartes'}],boards:{collection:{leaders:[{id:'fiction-friend',pseudo:'Camille',score:32,rank:1}],me:null,total:1}}};
   if(routeName==='/api/achievements')body={achievements:[]};
   if(routeName==='status'||routeName==='admin')body={now:Date.now(),credits:state.coins,enabled:true,league:{season:1},fighters:[],active:null,history:[],settings:{}};
   if(routeName==='/api/battles/start'){
    const mode=JSON.parse(request.postData()||'{}').mode||'simple';
    battle={id:'fiction-battle',mode,player:mode==='double'?[state.deckDouble.slice(0,2),state.deckDouble.slice(2,4),state.deckDouble.slice(4,6),state.deckDouble.slice(0,2)]:[...state.deck,state.deck[0]],enemy:mode==='double'?[cards.slice(6,8).map(c=>c.id),cards.slice(8,10).map(c=>c.id),cards.slice(10,12).map(c=>c.id),cards.slice(6,8).map(c=>c.id)]:cards.slice(6,10).map(c=>c.id),round:0,stage:'choose',direction:'higher',playerScore:0,enemyScore:0,ties:0,margin:0,history:[],last:null,finished:false,result:null,reward:null,startingStreak:3};
    body={battle,state};
   }
   if(routeName==='/api/battles/choose'){
    const key=JSON.parse(request.postData()||'{}').stat||'power';
    battle.last={key,pValue:94,eValue:77,winner:'player',margin:17};battle.playerScore++;battle.margin+=17;battle.stage='reveal';
    battle.history.push({name:'Gardien fictif',key,pValue:94,eValue:77,winner:'player',margin:17,actor:battle.round%2?'ai':'player'});
    if(battle.round===3){battle.finished=true;battle.result='win';battle.reward={coins:120,dust:3};}
    body={battle,state};
   }
   if(routeName==='/api/battles/next'){battle.round++;battle.stage='choose';battle.last=null;body={battle};}
   if(routeName==='/api/battles/abandon'){battle=null;body={state};}
   const queue=once.get(routeName),handler=queue?.length?queue.shift():handlers.get(routeName);
   const override=handler?await handler({request,route:routeName,call,fixtures,body}):null;
   if(override?.abort)return route.abort('failed');
   return route.fulfill({status:override?.status||200,contentType:'application/json',body:JSON.stringify(override?.body??body)}).catch(error=>{if(!context.pages().length||request.failure())return;throw error;});
  }
  // No outside request continues. Empty local responses also avoid contacting fonts/CDNs.
  return route.fulfill({status:200,contentType:request.resourceType()==='stylesheet'?'text/css':'text/plain',body:''});
 });
 context.on('page',page=>{
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text()+' ['+(message.location().url||'')+']');});
 });
 return {context,fixtures,calls,external,errors,consoleErrors,controls};
}
async function openHome(page,url){
 await page.goto(url,{waitUntil:'networkidle',timeout:30000});
 await page.locator('.m13-home').waitFor({timeout:15000});
 await page.evaluate(()=>document.fonts.ready);
}
async function navigate(page,view){
 const mobile=page.locator('.m13-dock [data-m13-view="'+view+'"]');
 if(await mobile.isVisible())return mobile.click();
 const desktop=page.locator('.sidebar [data-view="'+view+'"]');
 if(await desktop.isVisible())return desktop.click();
 const menu=page.locator('[data-m13-menu]').filter({visible:true}).first();
 await menu.click();await page.locator('dialog[open] [data-m13-view="'+view+'"]').click();
}
async function openCollection(page){
 await navigate(page,'collection');
 await page.locator('[data-action="choose-series"]').first().click();
 await page.locator('.collection-item').first().waitFor();
}
async function measure(page,{frames=120,scroll=false}={}){
 return page.evaluate(async({frames,scroll})=>{
  const before=window.__v15LongTasks?.length||0;
  const intervals=[];let last;
  await new Promise(resolve=>{
   function tick(time){
    if(last!==undefined)intervals.push(time-last);last=time;
    if(scroll)window.scrollTo(0,Math.max(0,document.documentElement.scrollHeight-innerHeight)*(0.5-0.5*Math.cos(intervals.length/frames*Math.PI*2)));
    if(intervals.length<frames)requestAnimationFrame(tick);else resolve();
   }
   requestAnimationFrame(tick);
  });
  window.scrollTo(0,0);
  const sorted=intervals.slice().sort((a,b)=>a-b),round=n=>Math.round(n*100)/100;
  const longTasks=(window.__v15LongTasks||[]).slice(before);
  return {domNodes:document.querySelectorAll('*').length,cards:document.querySelectorAll('.tcg-card').length,images:document.images.length,
   frameIntervals:{samples:intervals.length,p50ms:round(sorted[Math.floor(sorted.length*.5)]),p95ms:round(sorted[Math.floor(sorted.length*.95)]),maxMs:round(sorted.at(-1)),over33ms:intervals.filter(n=>n>33.34).length},
   jsHeapUsedBytes:performance.memory?.usedJSHeapSize??null,jsHeapTotalBytes:performance.memory?.totalJSHeapSize??null,longTasks,
   overflow:document.documentElement.scrollWidth>innerWidth,viewport:{width:innerWidth,height:innerHeight},quality:document.documentElement.dataset.m13Quality};
 },{frames,scroll});
}
function saveJson(name,value){fs.writeFileSync(path.join(ARTIFACTS,name),JSON.stringify(value,null,2)+'\n');}
async function recordScene(page,name='booster-preview.webm'){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mashup-v15-recording-'));
 const session=await page.context().newCDPSession(page),frames=[];
 session.on('Page.screencastFrame',event=>{
  const file=path.join(directory,String(frames.length).padStart(5,'0')+'.jpg');
  fs.writeFileSync(file,Buffer.from(event.data,'base64'));
  frames.push({file,time:event.metadata.timestamp});
  session.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
 });
 await session.send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:390,maxHeight:844,everyNthFrame:1});
 return async()=>{
  await session.send('Page.stopScreencast');await session.detach();
  try{
   if(frames.length<2)return {available:false,reason:'Insufficient captured browser frames'};
   const entries=frames.map((frame,index)=>"file '"+frame.file+"'\nduration "+Math.max(.01,index+1<frames.length?frames[index+1].time-frame.time:.3).toFixed(6)).join('\n');
   const manifest=path.join(directory,'frames.txt');fs.writeFileSync(manifest,entries+"\nfile '"+frames.at(-1).file+"'\n");
   const encoded=spawnSync('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',manifest,'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libvpx-vp9','-b:v','420k','-deadline','realtime','-cpu-used','8','-pix_fmt','yuv420p',path.join(ARTIFACTS,name)],{maxBuffer:1024*1024});
   return {available:encoded.status===0,name,frames:frames.length,durationSeconds:Math.round((frames.at(-1).time-frames[0].time)*100)/100,source:'Real Chromium screencast frames with browser timestamps',...(encoded.status!==0?{reason:String(encoded.error||encoded.stderr).slice(0,500)}:{})};
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
 };
}
module.exports={ROOT,ARTIFACTS,RARITIES,VARIANTS,laboratory,fixtureContext,openHome,navigate,openCollection,measure,saveJson,recordScene};
