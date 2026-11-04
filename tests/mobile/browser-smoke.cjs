const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const http=require('http');
(async()=>{
 const root=path.resolve(__dirname,'../..');
 const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://local').pathname);const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':'text/html');res.end(data);});
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const data=JSON.parse(fs.readFileSync(root+'/content/convergence-series2.json'));
 const base=Array.isArray(data)?data:data.cards;
 const cards=base.slice(0,36).map((c,i)=>({...c,hidden:false,archived:false,editionSeries:2,rarity:['rare','epic','legendary','mythic','ultra'][i%5],variant:['standard','full_art','gold','secret'][i%4]}));
 const state={coins:2450,dust:180,owned:Object.fromEntries(cards.map(c=>[c.id,2])),deck:cards.slice(0,3).map(c=>c.id),deckDouble:cards.slice(0,6).map(c=>c.id),favorites:[],custom:[],artwork:{},opened:24,wins:12,doubleWins:6,losses:2,streak:3,bestStreak:4,freePackUsed:true};
 const user={id:'fiction-player',username:'fiction@example.invalid',pseudo:'Alex',role:'admin'};
 const calls=[];
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='127.0.0.1')return route.continue();
  if(url.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:`export function createClient(){return {auth:{getSession:async()=>({data:{session:{access_token:'fiction-only'}}}),signOut:async()=>({}),signInWithPassword:async()=>({})}}}`});
  if(url.hostname.endsWith('.supabase.co')){
   const r=url.searchParams.get('route');calls.push(r);
   let body={};
   if(r==='/api/status')body={setupRequired:false};
   if(r==='/api/auth/me')body={user};
   if(r==='/api/bootstrap')body={user,state,cards,series:[{number:2,name:'Convergence',targetCount:100,description:'Le multivers prend vie',cover:'✦',color:'#a28afa'}],profile:{pseudo:'Alex'},vouchers:{},devPosts:[],collectionRewards:[]};
   if(r==='/api/packs/prepare')body={openingId:'fiction-opening',results:cards.slice(0,3)};
   if(r==='/api/packs/commit')body={state,cards,results:cards.slice(0,3),vouchers:{}};
   if(r==='/api/pvp/invitations')body={invitation:null};
   if(r==='/api/missions')body={missions:null};
   if(r==='/api/collection/rewards')body={collectionRewards:[]};
   if(r==='/api/dev-posts')body={posts:[]};
   if(r==='status')body={now:Date.now(),credits:state.coins};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  }
  return route.abort();
 });
 const url='http://127.0.0.1:'+server.address().port;
 await page.goto(url,{waitUntil:'networkidle',timeout:20000});
 await page.locator('.m13-home').waitFor({timeout:10000});
 await page.screenshot({path:'/tmp/mashup-mobile-home.png',fullPage:true});
 console.log('Home visible; errors:',errors);
 console.log('overflow mobile:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 await page.locator('.m13-dock [data-m13-menu]').click();await page.locator('dialog[open]').waitFor();
 console.log('Menu links:',await page.locator('.m13-menu-grid button').count());
 await page.locator('#m13-quality').selectOption('eco');
 assert.equal(await page.locator('html').getAttribute('data-m13-quality'),'eco');
 console.log('eco:',await page.locator('html').getAttribute('data-m13-quality'));
 await page.screenshot({path:'/tmp/mashup-mobile-menu.png'});
 await page.locator('dialog [data-m13-view="decks"]').click();
 assert.equal(await page.locator('#deck-roster>.deck-visual-choice').count(),24);
 console.log('Deck cards initial:',await page.locator('#deck-roster>.deck-visual-choice').count());
 await page.locator('[data-action="deck-load-more"]').click();assert.equal(await page.locator('#deck-roster>.deck-visual-choice').count(),36);console.log('Deck cards expanded: 36');
 await page.locator('.m13-dock [data-m13-menu]').click();await page.locator('#m13-quality').selectOption('high');await page.locator('[data-m13-close]').click();
 await page.locator('.m13-dock [data-m13-view="collection"]').click();
 await page.locator('[data-action="choose-series"]').first().click();
 await page.screenshot({path:'/tmp/mashup-mobile-collection.png',fullPage:true});
 console.log('Collection cards:',await page.locator('.collection-item').count());
 await page.locator('#collection-search').fill('Bear Bailey');
 await page.waitForFunction(()=>document.querySelectorAll('.collection-item').length===1);
 await page.locator('#collection-search').fill('');
 await page.waitForFunction(()=>document.querySelectorAll('.collection-item').length===24);
 console.log('Collection search and reset: passed');
 await page.locator('.collection-item .tcg-card[role="button"]').first().click();
 await page.locator('[data-action="zoom-card"]').click();await page.locator('.inspect-stage').waitFor();
 assert.equal(await page.locator('.inspect-front .v13-prismatic').count(),1);
 const box=await page.locator('.inspect-tilter').boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down({button:'right'});
 await page.mouse.move(box.x+box.width*.8,box.y+box.height*.35,{steps:8});
 await page.waitForFunction(()=>document.querySelector('.inspect-front .tcg-card').style.getPropertyValue('--m13-x')!=='50%');
 await page.screenshot({path:root+'/docs/mobile/preview-card.png'});await page.mouse.up({button:'right'});
 await page.locator('[data-action="close-modal"]').click();
 console.log('overflow collection:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 await page.setViewportSize({width:1440,height:1000});await page.locator('.sidebar [data-view="packs"]').click();
 await page.screenshot({path:'/tmp/mashup-desktop-home.png',fullPage:true});await page.screenshot({path:root+'/docs/mobile/preview-desktop.png'});
 console.log('overflow desktop:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));

 // Actual taps/clicks at four representative widths. No production request escapes interception.
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow '+width);
  console.log('Layout '+width+'px: no horizontal overflow');
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.m13-dock [data-m13-menu]').click();await page.locator('#m13-quality').selectOption('high');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='eco');assert.equal(await page.locator('html').getAttribute('data-m13-quality'),'eco');
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='high');assert.equal(await page.locator('html').getAttribute('data-m13-quality'),'high');
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('html').getAttribute('data-m13-quality'),'high');
 await page.screenshot({path:'/tmp/mashup-mobile-first-screen.png'});await page.screenshot({path:root+'/docs/mobile/preview-mobile.png'});

 await page.locator('.m13-hero [data-action="open-pack"]').click();
 for(let i=0;i<3;i++){
  await page.locator('.opening-top-card:not([disabled])').click();
  await page.waitForFunction(()=>{const b=document.querySelector('.opening-top-card');return b?.classList.contains('revealed')&&!b.disabled;});
  if(i===0)await page.screenshot({path:root+'/docs/mobile/preview-booster.png'});
  await page.locator('.opening-top-card:not([disabled])').click();
  await page.waitForFunction(index=>index===2?!document.querySelector('#opening-done')?.hidden:document.querySelector('#opening-progress')?.textContent.startsWith('Carte '+(index+2)),i);
 }
 await page.locator('#opening-done').click();await page.locator('.m13-home').waitFor();
 assert.equal(calls.filter(r=>r==='/api/packs/commit').length,1);
 console.log('Card detail/inspection and 3-card booster reveal/confirmation: passed (mock API only)');

 user.role='player';await page.reload({waitUntil:'networkidle'});
 await page.locator('.m13-dock [data-m13-menu]').click();
 assert.equal(await page.locator('.m13-menu-grid button').count(),8);
 assert.equal(await page.locator('.m13-menu-grid [data-m13-view="admin"]').count(),0);
 await page.locator('.m13-signout').click();await page.locator('#form-auth').waitFor();
 assert.equal(await page.locator('.m13-dock').isVisible(),false);
 await page.screenshot({path:root+'/docs/mobile/preview-login.png'});
 console.log('Player menu permissions and logout to login: passed');
 // Application icons generated from the checked-in vector, not from player artwork.
 if(process.env.MASHUP_GENERATE_ICONS==='1'){
 const iconPage=await context.newPage();await iconPage.goto(url+'/assets/mashup-app.svg');
 for(const size of [180,192,512]){await iconPage.setViewportSize({width:size,height:size});await iconPage.screenshot({path:root+'/assets/mashup-app-'+size+'.png',omitBackground:true});}
 await iconPage.close();
 }
 console.log('Reduced motion, preferences persistence, Escape: passed');
 console.log('Errors final:',errors);
 if(errors.length)throw Error(errors.join('\n'));
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
