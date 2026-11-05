/* Real renderer in Chromium; intercepted API and fictional fixtures only. */
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {laboratory,fixtureContext}=require('./harness.cjs');
const ARTIFACTS=path.resolve(__dirname,'../../docs/v15-4/artifacts');
fs.mkdirSync(ARTIFACTS,{recursive:true});
(async()=>{
 const lab=await laboratory(),f=await fixtureContext(lab,{width:1000,height:950});
 try{
  const p=await f.context.newPage();await p.goto(lab.url+'/__v15/gallery.html',{waitUntil:'networkidle'});
  await p.evaluate(async()=>{
   const {renderMashupV10Card}=await import('/06-v10-cards.js');
   const {inspectionObjectMarkup,physicalLightingForTilt}=await import('/46-v15-living-cards.js');
   const {sealedPackMarkup,mountSealedPack,summaryMarkup}=await import('/38-v14-booster.js');
   const source=await (await fetch('/content/convergence-series2.json')).json(),sample=source.cards[0];
   const rarities=['common','rare','epic','legendary','mythic','ultra'];
   const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const ctx={esc,safeImage:()=>'',CSSColor:(_v,f)=>f,statValue:(c,k)=>c[k],STAT_FIELDS:['power','size','def','aura','intelligence'].map(key=>({key,label:key})),RARITIES:Object.fromEntries(rarities.map(r=>[r,r])),rarityName:v=>v,editionText:()=> 'N°001/090 · S02',onlineUser:{role:'admin'},state:{owned:{},artwork:{}}};
   const cards=rarities.map((r,i)=>({...sample,rarity:r,power:72,size:65,def:83,aura:79,intelligence:68,family:sample.universe,name:sample.name+' · '+r}));
   const variants=['standard','full_art','gold','secret'];
   document.body.innerHTML='<main id="gallery" style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px;padding:24px;max-width:1200px;margin:auto"></main><div id="packet" style="position:relative;min-height:520px;padding:20px"></div><div id="review" class="opening-fullscreen"></div>';
   document.body.style.display='block';
   const main=document.getElementById('gallery');
   for(const variant of variants)for(const item of cards){const c={...item,variant};const holder=document.createElement('div');holder.style.cssText='display:flex;flex-direction:column;gap:8px;min-width:0';holder.innerHTML=renderMashupV10Card(c,{revealedOpponent:true},ctx)+'<small style="color:#ddd;font-size:10px">'+c.rarity+' · '+variant+'</small>';main.append(holder);}
   const packet=document.getElementById('packet');packet.innerHTML=sealedPackMarkup({name:'Convergence',count:5});window.__opened=0;window.__seal=mountSealedPack({root:packet,onOpen(){window.__opened++;}});
   const demo=cards.map((c,i)=>({...c,isNew:i%2===0}));document.getElementById('review').innerHTML=summaryMarkup(demo,(c,o)=>renderMashupV10Card(c,o,ctx));
   const style=document.createElement('style');style.textContent='#review{position:relative;min-height:750px;padding:20px;display:flex;align-items:center;justify-content:center} #review .v14-opening-summary{max-height:700px}';document.head.append(style);
  });
  assert.equal(await p.locator('#gallery .tcg-card').count(),24);
  assert.equal(await p.locator('#gallery .v10-stat-number').count(),120);
  const distinct=await p.locator('#gallery .v14-stock').evaluateAll(n=>new Set(n.slice(0,6).map(x=>getComputedStyle(x).backgroundImage)).size);assert.equal(distinct,6);
  await p.locator('#gallery').screenshot({path:path.join(ARTIFACTS,'v154-card-materials.png')});
  const button=p.locator('#packet [data-v14-break-seal]');await button.scrollIntoViewIfNeeded();
  const b=await button.boundingBox();await p.mouse.move(b.x+b.width*.25,b.y+b.height*.4);await p.mouse.down();await p.mouse.move(b.x+b.width*.25+22,b.y+b.height*.4,{steps:4});await p.mouse.up();await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>window.__opened),0);
  const box=await button.boundingBox();await p.mouse.move(box.x+box.width*.25,box.y+box.height*.4);await p.mouse.down();await p.mouse.move(box.x+box.width*.25+80,box.y+box.height*.4,{steps:6});await p.locator('#packet').screenshot({path:path.join(ARTIFACTS,'v154-seal-gesture.png')});await p.mouse.up();await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>window.__opened),1);
  assert.equal(await p.locator('#review .v154-review-stats dd').allTextContents().then(a=>a.join(',')),'3,3,3');
  await p.locator('#review .v14-opening-summary').screenshot({path:path.join(ARTIFACTS,'v154-booster-review.png')});
  await p.setViewportSize({width:320,height:568});await p.evaluate(()=>{document.getElementById('gallery').style.gridTemplateColumns='repeat(2,minmax(0,1fr))';document.getElementById('review').style.minHeight='500px';});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('#gallery .v14-optics').first().evaluate(n=>getComputedStyle(n).display),'none');
  const report={success:true,productionRequests:0,renderedCards:24,stats:120,distinctSubstrates:6,swipeCancel:true,swipeOpen:true,reducedMotion:true,mobileWidth:320,physicalPhone:false,limits:'Chromium Linux. Fictional presentation data; network intercepted. No physical phone, deployed backend or live account tested.',screenshots:['v154-card-materials.png','v154-seal-gesture.png','v154-booster-review.png']};
  fs.writeFileSync(path.join(ARTIFACTS,'cards-boosters-browser-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await f.context.close();await lab.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
