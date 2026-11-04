/* Focused optical regression. Chromium uses only local files and fictional API fixtures. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {ROOT,laboratory,fixtureContext,openHome,openCollection,recordScene}=require('./harness.cjs');

const OUTPUT=path.join(ROOT,'docs/v14/shine');
const CARD='.inspect-front .tcg-card';
const frames=(page,count=12)=>page.evaluate(count=>new Promise(resolve=>{
 let remaining=count;function tick(){if(--remaining<=0)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);
}),count);

async function surface(page){
 return page.locator(CARD).evaluate(card=>{
  const style=getComputedStyle(card),foil=card.querySelector('.v14-optics');
  const after=getComputedStyle(foil,'::after'),before=getComputedStyle(foil,'::before');
  const source=[...card.querySelectorAll('.v10-picture-img,.v10-picture use')].map(node=>({tag:node.tagName,src:node.getAttribute('src')||node.getAttribute('href')||node.getAttribute('xlink:href')}));
  const stats=[...card.querySelectorAll('.v10-stat-number')].map(node=>{
   const bounds=node.getBoundingClientRect(),css=getComputedStyle(node);
   return {text:node.textContent.trim(),visible:bounds.width>0&&bounds.height>0&&css.display!=='none'&&css.visibility!=='hidden'};
  });
  const variables=Object.fromEntries(['--m13-x','--m13-y','--v14-foil-x','--v14-foil-y','--v14-sheen-angle','--v14-reflection-strength','--v14-gloss-tint','--v14-spectrum-a'].map(name=>[name,style.getPropertyValue(name).trim()]));
  return {classes:card.className,source,stats,variables,foil:{display:getComputedStyle(foil).display,opacity:getComputedStyle(foil).opacity,position:before.backgroundPosition,lamp:after.backgroundImage,spectrum:before.backgroundImage,animation:getComputedStyle(foil).animationName}};
 });
}
function preserve(before,after){
 assert.deepEqual(after.source,before.source,'Le reflet conserve la source originale de l’illustration.');
 assert.deepEqual(after.stats,before.stats,'Le reflet conserve les cinq valeurs lisibles.');
 assert.equal(after.stats.length,5);assert.ok(after.stats.every(stat=>stat.visible&&stat.text));
}
function green(hex){
 assert.match(hex,/^#[a-f\d]{6}$/i);const channels=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16));
 assert.ok(channels[1]>channels[0]&&channels[1]>channels[2],`Teinte verte attendue : ${hex}`);
}
async function openCard(page,name){
 await page.locator('#collection-search').fill(name);
 const card=page.getByRole('button',{name:'Voir '+name,exact:true});
 await card.waitFor();await card.click();
 await page.locator('[data-action="zoom-card"]').click();await page.locator('.inspect-tilter').waitFor();
 await frames(page);return page.locator('.inspect-tilter');
}
async function photograph(page,name,report){
 await page.screenshot({path:path.join(OUTPUT,name),fullPage:false});report.screenshots.push(name);
}
async function mousePosition(page,tilt,x,y){
 const box=await tilt.boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();
 await page.mouse.move(box.x+box.width*x,box.y+box.height*y,{steps:12});await frames(page,20);
}
async function reset(page,tilt){
 await tilt.focus();await page.keyboard.press('Home');
 await page.waitForFunction(()=>{
  const node=document.querySelector('.inspect-tilter');
  return Math.abs(parseFloat(node.style.getPropertyValue('--rx'))||0)<.01&&Math.abs(parseFloat(node.style.getPropertyValue('--ry'))||0)<.01;
 });await frames(page,3);
}

(async()=>{
 fs.mkdirSync(OUTPUT,{recursive:true});
 const lab=await laboratory();
 const report={kind:'V14.0.1 optical browser regression',started:new Date().toISOString(),fixture:'36 fictional cards; fictional account and balances; every remote request locally intercepted',productionRequests:0,checks:[],screenshots:[],cards:[],limits:'Headless Chromium/Linux at 390×844. Physical Android/iPhone, Safari, production backend and real player data are outside this local optical test.'};
 try{
  const fixture=await fixtureContext(lab),{context,fixtures,calls,errors,consoleErrors,external}=fixture;
  await context.addInitScript(()=>{if(location.protocol==='http:')localStorage.setItem('mashup-display-v13','high');});
  const page=await context.newPage();await openHome(page,lab.url);await openCollection(page);
  assert.equal(await page.locator('html').getAttribute('data-m13-quality'),'high');
  for(const [index,name] of [[22,'secret'],[23,'ultra-secret']]){
   const cardData=fixtures.cards[index],tilt=await openCard(page,cardData.name);
   const neutral=await surface(page);assert.ok(neutral.classes.includes('variant-secret'));
   if(name==='ultra-secret')assert.ok(neutral.classes.includes('v14-ultra-secret'));
   assert.equal(neutral.stats.length,5);assert.ok(neutral.source.length>0,'Une source d’illustration existe.');
   assert.notEqual(neutral.foil.display,'none');green(neutral.variables['--v14-gloss-tint']);green(neutral.variables['--v14-spectrum-a']);
   await photograph(page,name+'-neutral.png',report);
   const stopRecording=await recordScene(page,'../shine/'+name+'-motion.webm');
   await mousePosition(page,tilt,.82,.28);const mouseRight=await surface(page);
   assert.notEqual(mouseRight.variables['--m13-x'],neutral.variables['--m13-x'],'La lampe suit l’inclinaison horizontale.');
   assert.notEqual(mouseRight.variables['--m13-y'],neutral.variables['--m13-y'],'La lampe suit l’inclinaison verticale.');
   assert.notEqual(mouseRight.foil.position,neutral.foil.position,'La diffraction se déplace.');
   assert.notEqual(mouseRight.foil.lamp,neutral.foil.lamp,'Le reflet lumineux est recalculé.');
   preserve(neutral,mouseRight);await photograph(page,name+'-right.png',report);await page.mouse.up();await reset(page,tilt);
   await mousePosition(page,tilt,.18,.72);const mouseLeft=await surface(page);
   assert.notEqual(mouseLeft.variables['--m13-x'],mouseRight.variables['--m13-x']);preserve(neutral,mouseLeft);
   await photograph(page,name+'-left.png',report);await page.mouse.up();await reset(page,tilt);
   await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowUp');await frames(page,18);
   const keyboard=await surface(page);assert.notEqual(keyboard.variables['--m13-x'],neutral.variables['--m13-x']);preserve(neutral,keyboard);
   await reset(page,tilt);
   const box=await tilt.boundingBox(),cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.5,y:box.y+box.height*.5}]});
   for(let step=1;step<=8;step++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*(.5+.3*step/8),y:box.y+box.height*(.5-.2*step/8)}]});
    await frames(page,2);
   }
   await frames(page,15);const touch=await surface(page);
   assert.notEqual(touch.variables['--m13-x'],neutral.variables['--m13-x'],'Le geste tactile déplace la lampe.');preserve(neutral,touch);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await reset(page,tilt);
   const video=await stopRecording();assert.equal(video.available,true,video.reason);report.cards.push({name,neutral,mouseRight,mouseLeft,keyboard,touch,video});
   await page.locator(CARD).evaluate(node=>node.classList.add('v12-offscreen'));
   assert.equal((await surface(page)).foil.display,'none','Le garde CSS hors écran supprime le reflet.');
   await page.locator(CARD).evaluate(node=>node.classList.remove('v12-offscreen'));
   assert.notEqual((await surface(page)).foil.display,'none');
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='eco');
   await tilt.focus();await page.keyboard.press('ArrowRight');await frames(page);
   const reduced=await surface(page);assert.equal(reduced.foil.display,'none');preserve(neutral,reduced);
   const reducedTilt=await tilt.evaluate(node=>({x:parseFloat(node.style.getPropertyValue('--rx'))||0,y:parseFloat(node.style.getPropertyValue('--ry'))||0}));
   assert.deepEqual(reducedTilt,{x:0,y:0});
   await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='high');
   await page.locator('[data-action="close-modal"]').click();
  }
  await page.locator('[data-m13-menu]').filter({visible:true}).first().click();
  await page.locator('#m13-quality').selectOption('eco');
  await page.locator('dialog[open] [data-m13-close]').click();
  if(await page.locator('[data-action="choose-series"]').count())await page.locator('[data-action="choose-series"]').first().click();
  const ecoTilt=await openCard(page,fixtures.cards[23].name);const eco=await surface(page);
  assert.equal(await page.locator('html').getAttribute('data-m13-quality'),'eco');assert.equal(eco.foil.display,'none');
  await mousePosition(page,ecoTilt,.8,.3);assert.equal((await surface(page)).foil.display,'none');await page.mouse.up();
  report.eco={display:eco.foil.display};
  report.checks.push('Secrète et Ultra Secrète : teintes vertes calculées; lampe et diffraction changent avec souris, clavier et vrai événement tactile Chromium.','Sources des illustrations et cinq statistiques visibles identiques avant/après chaque geste.','Reflet masqué en qualité éco via réglage du jeu, en mouvement réduit et avec le marqueur hors écran.','Mouvement réduit : inclinaison maintenue à zéro.','Captures réelles du navigateur et deux WebM issus de trames Chromium horodatées.');
  report.errors=errors;report.consoleErrors=consoleErrors;report.apiCalls=calls;report.mockedExternalHosts=[...new Set(external.map(request=>request.host))];
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.ok(!calls.some(call=>/\/(?:packs|battles)\//.test(call.route)));
  report.status='passed';report.completed=new Date().toISOString();
  fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,cards:report.cards.map(card=>({name:card.name,video:card.video})),checks:report.checks,screenshots:report.screenshots,consoleErrors},null,2));
  await context.close();
 }catch(error){report.status='failed';report.failure=error.stack;fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2)+'\n');throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
