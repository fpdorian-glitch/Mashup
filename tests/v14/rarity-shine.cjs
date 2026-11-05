/* Rarity finish evidence. Local assets, procedural artwork and fictional API only. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {ROOT,RARITIES,VARIANTS,laboratory,fixtureContext,openHome,openCollection}=require('./harness.cjs');

const OUTPUT=path.join(ROOT,'docs/v14/rarity-shine');
const ENERGIES=[.16,.42,.64,.88,1.08,1.28];
const CARD='.inspect-front .tcg-card';
const frames=(page,count=12)=>page.evaluate(count=>new Promise(resolve=>{
 let remaining=count;function tick(){if(--remaining<=0)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);
}),count);

async function matrix(page,url){
 await page.goto(url+'/__v14/gallery.html',{waitUntil:'networkidle'});
 return page.evaluate(async({rarities,variants})=>{
  const {renderMashupV10Card}=await import('/06-v10-cards.js?rarity-validation=14');
  const labels={common:'Commune',rare:'Rare',epic:'Épique',legendary:'Légendaire',mythic:'Mythique',ultra:'Ultra'};
  const variantLabels={standard:'Classique',full_art:'Full Art',gold:'Gold',secret:'Secrète'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STAT_FIELDS=[{key:'power',label:'Puissance'},{key:'size',label:'Taille'},{key:'def',label:'Défense'},{key:'aura',label:'Aura'},{key:'intelligence',label:'Intelligence'}];
  const context={esc,safeImage:value=>/^data:image\/png;base64,/.test(value||'')?value:'',CSSColor:(value,fallback)=>/^#[a-f\d]{6}$/i.test(value||'')?value:fallback,statValue:(card,key)=>card[key],STAT_FIELDS,
   RARITIES:Object.fromEntries(rarities.map(key=>[key,{label:labels[key]}])),rarityName:key=>labels[key],cardRarityLabel:card=>labels[card.rarity],editionText:card=>String(card.editionNumber).padStart(3,'0')+'/100',onlineUser:{role:'player'},state:{owned:{},artwork:{}}};
  // One deterministic, locally generated original image for all 24 cards.
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=510;const c=canvas.getContext('2d');
  const base=c.createLinearGradient(0,0,360,510);base.addColorStop(0,'#101a32');base.addColorStop(.55,'#314f68');base.addColorStop(1,'#080e18');c.fillStyle=base;c.fillRect(0,0,360,510);
  const halo=c.createRadialGradient(210,165,1,210,165,150);halo.addColorStop(0,'#ecdbb88a');halo.addColorStop(1,'transparent');c.fillStyle=halo;c.fillRect(0,0,360,400);
  c.strokeStyle='#c0e0ea9c';c.lineWidth=1.4;for(let r=48;r<110;r+=15){c.beginPath();c.ellipse(205,170,r,r*.72,-.5,0,Math.PI*2);c.stroke();}
  c.fillStyle='#e0dbc8';c.beginPath();c.arc(205,170,34,0,Math.PI*2);c.fill();
  for(let i=0;i<75;i++){c.globalAlpha=.2+(i%4)*.2;c.fillRect((i*97+31)%360,(i*53+13)%330,i%9===0?2:1,i%9===0?2:1);}c.globalAlpha=1;
  for(let layer=0;layer<5;layer++){c.fillStyle=['#354555','#293b48','#21313d','#182630','#101b24'][layer];c.beginPath();c.moveTo(0,345+layer*25);for(let x=0;x<=360;x+=20)c.lineTo(x,300+layer*24+Math.sin((x+layer*35)/49)*33+Math.cos(x/23)*13);c.lineTo(360,510);c.lineTo(0,510);c.fill();}
  c.fillStyle='#d3b47b';c.beginPath();c.arc(156,350,5,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(156,355);c.lineTo(144,383);c.lineTo(166,383);c.closePath();c.fill();
  const artwork=canvas.toDataURL('image/png');window.__rarityArtwork=artwork;
  const style=document.createElement('style');style.textContent=`html{background:#080c11;color:#eee4d0}body{margin:0;padding:32px;font-family:system-ui;background:radial-gradient(ellipse at top,#202638,#080c11 65%)}h1{font-size:30px;letter-spacing:.07em;margin:0 0 8px}.rarity-intro{color:#b7c3d0;font-size:14px;margin:0 0 24px}.rarity-row{margin:0 0 28px}.rarity-row>h2{font-size:16px;color:#d9c393;letter-spacing:.12em;text-transform:uppercase;margin:0 0 14px}.rarity-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px}.rarity-item{min-width:0}.rarity-item>h3{font-size:12px;letter-spacing:.07em;margin:0 0 9px;text-transform:uppercase;color:#d7dce7}.rarity-item .tcg-card{width:100%!important;aspect-ratio:300/425!important;height:auto!important;min-height:0!important;pointer-events:none}.rarity-footer{font-size:12px;color:#91a0b7;margin:0}.inspect-front{position:static!important;transform:none!important;backface-visibility:visible!important}`;
  document.head.append(style);document.documentElement.dataset.m13Quality='high';
  const rows=variants.map(variant=>'<section class="rarity-row" data-variant="'+variant+'"><h2>'+variantLabels[variant]+'</h2><div class="rarity-grid">'+rarities.map((rarity,index)=>{
   const card={id:'rarity-reference-'+variant+'-'+rarity,name:'Le Veilleur',family:'Chroniques du seuil',rarity,variant,power:91,size:67,def:84,aura:98,intelligence:93,editionSeries:2,editionNumber:12,art:artwork,color1:'#907243',color2:'#111a2d'};
   context.state.owned[card.id]=1;
   return '<article class="rarity-item inspect-front" data-rarity="'+rarity+'" data-variant="'+variant+'"><h3>'+labels[rarity]+'</h3>'+renderMashupV10Card(card,{accessible:true},context)+'</article>';
  }).join('')+'</div></section>');
  document.body.innerHTML='<h1>MASHUP / ÉCHELLE DES BRILLANCES</h1><p class="rarity-intro">Même illustration originale, mêmes statistiques, même éclairage — commune → ultra · 6 raretés × 4 finitions</p>'+rows.join('')+'<p class="rarity-footer">Captures Chromium sans retouche · fixtures fictives · aucune donnée de joueur</p>';
  await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));
  return {cards:document.querySelectorAll('.rarity-item .tcg-card').length,oneOriginalImage:[...document.querySelectorAll('.rarity-item .v10-picture-img')].every(image=>image.src===artwork&&image.naturalWidth===360),overflow:document.documentElement.scrollWidth>innerWidth};
 },{rarities:RARITIES,variants:VARIANTS});
}

async function light(page,strength=.64,x=74,y=24,scope='inspect'){
 await page.locator('.rarity-item').evaluateAll((items,{strength,x,y,scope})=>{
  for(const item of items){item.classList.toggle('inspect-front',scope==='inspect');const card=item.querySelector('.tcg-card');card.classList.toggle('m13-card-active',scope==='hover');
   for(const [key,value] of Object.entries({'--m13-x':x+'%','--m13-y':y+'%','--v14-foil-x':100-x+'%','--v14-foil-y':100-y+'%','--v14-sheen-angle':138+'deg','--v14-reflection-strength':String(strength)}))card.style.setProperty(key,value);
  }
 },{strength,x,y,scope});await frames(page,3);
}
async function surfaces(page,selector='.rarity-item .tcg-card'){
 return page.locator(selector).evaluateAll(cards=>cards.map(card=>{
  const style=getComputedStyle(card),foil=card.querySelector('.v14-optics'),optics=getComputedStyle(foil),before=getComputedStyle(foil,'::before'),after=getComputedStyle(foil,'::after');
  const stats=[...card.querySelectorAll('.v10-stat-number')].map(node=>{const rect=node.getBoundingClientRect(),css=getComputedStyle(node);return {text:node.textContent.trim(),visible:rect.width>0&&rect.height>0&&css.display!=='none'&&css.visibility!=='hidden'};});
  const source=[...card.querySelectorAll('.v10-picture-img,.v10-picture use')].map(node=>node.getAttribute('src')||node.getAttribute('href')||node.getAttribute('xlink:href'));
  const variables=Object.fromEntries(['--v14-rarity-energy','--v14-reflection-strength','--v14-gloss-tint','--v14-spectrum-a','--m13-x','--m13-y'].map(name=>[name,style.getPropertyValue(name).trim()]));
  return {rarity:['common','rare','epic','legendary','mythic','ultra'].find(rarity=>card.classList.contains(rarity)),variant:['standard','full_art','gold','secret'].find(variant=>card.classList.contains('variant-'+variant)),source,stats,variables,foil:{display:optics.display,opacity:Number(optics.opacity),before:before.backgroundImage,after:after.backgroundImage,position:before.backgroundPosition}};
 }));
}
function preserved(before,after){
 assert.deepEqual(after.source,before.source,'Le reflet conserve la source originale.');assert.deepEqual(after.stats,before.stats,'Les cinq statistiques restent visibles et inchangées.');assert.equal(after.stats.length,5);assert.ok(after.stats.every(stat=>stat.visible&&stat.text));
}
function green(hex){assert.match(hex,/^#[a-f\d]{6}$/i);const [r,g,b]=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16));assert.ok(g>r&&g>b,'Teinte verte attendue : '+hex);}
function progression(cards,strength){
 for(const variant of VARIANTS){const group=cards.filter(card=>card.variant===variant);assert.equal(group.length,6);for(const [index,card] of group.entries()){
  assert.notEqual(card.foil.display,'none');assert.equal(Number(card.variables['--v14-rarity-energy']),ENERGIES[index]);assert.ok(Math.abs(card.foil.opacity-ENERGIES[index]*strength)<.0001,'Opacité calculée = énergie de rareté × lumière.');
  if(index)assert.ok(card.foil.opacity>group[index-1].foil.opacity,'Progression strictement croissante '+variant);
  if(variant==='secret'){green(card.variables['--v14-gloss-tint']);green(card.variables['--v14-spectrum-a']);}
 }
 assert.equal(new Set(group.map(card=>card.foil.before+'|'+card.foil.after)).size,6,'Six signatures de matière différentes pour '+variant);
 assert.ok(group[0].foil.opacity>0&&group[0].foil.opacity<.15,'Commune visible, discrète.');
 }
}
async function openCard(page,name){await page.locator('#collection-search').fill(name);await page.getByRole('button',{name:'Voir '+name,exact:true}).click();await page.locator('[data-action="zoom-card"]').click();await page.locator('.inspect-tilter').waitFor();await frames(page);return page.locator('.inspect-tilter');}
async function reset(page,tilt){await tilt.focus();await page.keyboard.press('Home');await page.waitForFunction(()=>{const node=document.querySelector('.inspect-tilter');return Math.abs(parseFloat(node.style.getPropertyValue('--rx'))||0)<.01&&Math.abs(parseFloat(node.style.getPropertyValue('--ry'))||0)<.01;});await frames(page,3);}
async function gesture(page,context,tilt,type){
 const box=await tilt.boundingBox();
 if(type==='mouse'){await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.3,{steps:12});await frames(page,20);}
 if(type==='keyboard'){await tilt.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowUp');await frames(page,18);}
 if(type==='touch'){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.5,y:box.y+box.height*.5}]});for(let step=1;step<=8;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*(.5+.3*step/8),y:box.y+box.height*(.5-.2*step/8)}]});await frames(page,2);}await frames(page,15);return cdp;}
}
async function recordMatrix(page){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mashup-rarity-')),session=await page.context().newCDPSession(page),captured=[];
 session.on('Page.screencastFrame',event=>{const file=path.join(directory,String(captured.length).padStart(5,'0')+'.jpg');fs.writeFileSync(file,Buffer.from(event.data,'base64'));captured.push({file,time:event.metadata.timestamp});session.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});});
 await session.send('Page.startScreencast',{format:'jpeg',quality:86,maxWidth:1536,maxHeight:660,everyNthFrame:1});
 return async()=>{await session.send('Page.stopScreencast');await session.detach();try{
  assert.ok(captured.length>1,'La vidéo contient des trames réellement capturées.');
  const manifest=path.join(directory,'frames.txt'),entries=captured.map((frame,index)=>"file '"+frame.file+"'\nduration "+Math.max(.01,index+1<captured.length?captured[index+1].time-frame.time:.3).toFixed(6)).join('\n');fs.writeFileSync(manifest,entries+"\nfile '"+captured.at(-1).file+"'\n");
  const encoded=spawnSync('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',manifest,'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libvpx-vp9','-b:v','1200k','-deadline','realtime','-cpu-used','8','-pix_fmt','yuv420p',path.join(OUTPUT,'six-rarities-motion.webm')],{maxBuffer:1024*1024});
  return {available:encoded.status===0,name:'six-rarities-motion.webm',frames:captured.length,durationSeconds:Math.round((captured.at(-1).time-captured[0].time)*100)/100,source:'1536 px real Chromium screencast, original browser timestamps',...(encoded.status!==0?{reason:String(encoded.error||encoded.stderr).slice(0,500)}:{})};
 }finally{fs.rmSync(directory,{recursive:true,force:true});}};
}

(async()=>{
 fs.mkdirSync(OUTPUT,{recursive:true});const lab=await laboratory();
 const report={kind:'Rarity optical regression',started:new Date().toISOString(),productionRequests:0,fixture:'Local files; original procedural illustration; 36 fictional cards, account and balances; all remote requests intercepted.',checks:[],screenshots:[],limits:'Chromium headless/Linux. Device thermals, real Android/iPhone/Safari and production backend are not validated. Offscreen protection is tested by the real CSS marker, not by scrolling IntersectionObserver.'};
 let context;
 try{
  const fixture=await fixtureContext(lab,{width:1536,height:1080});context=fixture.context;
  await context.addInitScript(()=>{if(location.protocol==='http:')localStorage.setItem('mashup-display-v13','high');});
  const gallery=await context.newPage();report.matrix=await matrix(gallery,lab.url);assert.equal(report.matrix.cards,24);assert.equal(report.matrix.oneOriginalImage,true);assert.equal(report.matrix.overflow,false);
  await light(gallery,.46);const neutral=await surfaces(gallery);progression(neutral,.46);
  await light(gallery,.64);const tilted=await surfaces(gallery);progression(tilted,.64);tilted.forEach((card,index)=>preserved(neutral[index],card));
  await gallery.screenshot({path:path.join(OUTPUT,'rarity-matrix.png'),fullPage:true});report.screenshots.push('rarity-matrix.png');
  for(const variant of VARIANTS){const name=variant+'-same-light.png';await gallery.locator('.rarity-row[data-variant="'+variant+'"]').screenshot({path:path.join(OUTPUT,name)});report.screenshots.push(name);}
  await light(gallery,.64,74,24,'hover');const active=await surfaces(gallery);progression(active,.64);active.forEach((card,index)=>preserved(neutral[index],card));
  await gallery.evaluate(()=>document.documentElement.dataset.m13Quality='eco');assert.ok((await surfaces(gallery)).every(card=>card.foil.display==='none'));
  await gallery.evaluate(()=>document.documentElement.dataset.m13Quality='high');await gallery.emulateMedia({reducedMotion:'reduce'});assert.ok((await surfaces(gallery)).every(card=>card.foil.display==='none'));await gallery.emulateMedia({reducedMotion:'no-preference'});
  await gallery.locator('.rarity-item .tcg-card').evaluateAll(cards=>cards.forEach(card=>card.classList.add('v12-offscreen')));assert.ok((await surfaces(gallery)).every(card=>card.foil.display==='none'));await gallery.locator('.rarity-item .tcg-card').evaluateAll(cards=>cards.forEach(card=>card.classList.remove('v12-offscreen')));
  await light(gallery,.64);report.materials=tilted.map(({source,...card})=>({...card,imageOriginal:true}));
  await gallery.setViewportSize({width:1536,height:660});await gallery.locator('.rarity-row[data-variant="standard"]').scrollIntoViewIfNeeded();
  const stop=await recordMatrix(gallery);
  for(let step=0;step<48;step++){const t=step/47,x=50+30*Math.sin(t*Math.PI*2),y=40-16*Math.cos(t*Math.PI*2);await light(gallery,.46+.18*Math.abs(Math.sin(t*Math.PI*2)),x,y);}
  report.video=await stop();assert.equal(report.video.available,true,report.video.reason);await gallery.close();
  const page=await context.newPage();await page.setViewportSize({width:390,height:844});await openHome(page,lab.url);await openCollection(page);report.gestures=[];
  for(const index of [1,23]){const data=fixture.fixtures.cards[index],tilt=await openCard(page,data.name),[before]=await surfaces(page,CARD);const results={rarity:data.rarity,variant:data.variant,gestures:[]};
   for(const type of ['mouse','keyboard','touch']){const cdp=await gesture(page,context,tilt,type);const [after]=await surfaces(page,CARD);assert.notEqual(after.variables['--m13-x'],before.variables['--m13-x'],'Le geste '+type+' déplace le reflet.');assert.notEqual(after.foil.after,before.foil.after);preserved(before,after);results.gestures.push(type);if(type==='mouse')await page.mouse.up();if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}await reset(page,tilt);}
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='eco');assert.equal((await surfaces(page,CARD))[0].foil.display,'none');await tilt.focus();await page.keyboard.press('ArrowRight');await frames(page);assert.deepEqual(await tilt.evaluate(node=>({x:parseFloat(node.style.getPropertyValue('--rx'))||0,y:parseFloat(node.style.getPropertyValue('--ry'))||0})),{x:0,y:0});await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='high');
   results.reducedMotionStopsTilt=true;report.gestures.push(results);await page.locator('[data-action="close-modal"]').click();
  }
  await page.locator('[data-m13-menu]').filter({visible:true}).first().click();await page.locator('#m13-quality').selectOption('eco');await page.locator('dialog[open] [data-m13-close]').click();if(await page.locator('[data-action="choose-series"]').count())await page.locator('[data-action="choose-series"]').first().click();await openCard(page,fixture.fixtures.cards[23].name);assert.equal((await surfaces(page,CARD))[0].foil.display,'none');
  report.checks.push('24 cartes : même illustration originale, cinq statistiques visibles inchangées.','Pour chacune des 4 finitions, 6 intensités strictement croissantes et 6 signatures de brillance distinctes ; contrôle en inspection et au survol actif.','Énergies .16/.42/.64/.88/1.08/1.28 × éclairage .46/.64 vérifiées par les styles réellement calculés.','Commune légèrement brillante et Secret/Ultra Secret verts.','Reflets désactivés en éco, mouvement réduit et hors écran ; Rare et Ultra Secret manipulés à la souris, au clavier et au toucher Chromium.','Planche, quatre comparaisons et vidéo issues du navigateur, sans retouche.');
  report.errors=fixture.errors;report.consoleErrors=fixture.consoleErrors;report.apiCalls=fixture.calls;report.mockedExternalHosts=[...new Set(fixture.external.map(request=>request.host))];assert.deepEqual(fixture.errors,[]);assert.deepEqual(fixture.consoleErrors,[]);assert.ok(!fixture.calls.some(call=>/\/(?:packs|battles)\//.test(call.route)));report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack;throw error;}
 finally{report.completed=new Date().toISOString();fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2)+'\n');if(context)await context.close();await lab.close();console.log(JSON.stringify({status:report.status,checks:report.checks,video:report.video,screenshots:report.screenshots,failure:report.failure},null,2));}
})().catch(error=>{console.error(error);process.exitCode=1;});
