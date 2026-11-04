/* Browser regression + genuine screenshots. Run entirely against fictional local fixtures. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {ARTIFACTS,RARITIES,VARIANTS,laboratory,fixtureContext,openHome,navigate,openCollection,measure,saveJson,recordScene}=require('./harness.cjs');

async function legibility(page,selector){
 return page.locator(selector).evaluateAll(cards=>cards.map(card=>{
  const title=card.querySelector('.v10-name')?.getBoundingClientRect();
  const stats=[...card.querySelectorAll('.v10-stat-number')].map(node=>{
   const box=node.getBoundingClientRect(),style=getComputedStyle(node);
   return {text:node.textContent.trim(),fontPx:parseFloat(style.fontSize),visible:box.width>0&&box.height>0&&style.visibility!=='hidden'&&style.display!=='none',titleOverlap:!!title&&box.left<title.right&&box.right>title.left&&box.top<title.bottom&&box.bottom>title.top};
  });
  return {stats:stats.length,visible:stats.every(stat=>stat.visible&&stat.text),titleCollision:stats.some(stat=>stat.titleOverlap),minNumberFontPx:Math.min(...stats.map(stat=>stat.fontPx))};
 }));
}

async function gallery(page,url){
 await page.goto(url+'/__v14/gallery.html',{waitUntil:'networkidle'});
 return page.evaluate(async({rarities,variants})=>{
  const {renderMashupV10Card}=await import('/06-v10-cards.js?validation=14');
  const labels={common:'Commune',rare:'Rare',epic:'Épique',legendary:'Légendaire',mythic:'Mythique',ultra:'Ultra'};
  const variantLabels={standard:'Classique',full_art:'Full Art',gold:'Gold',secret:'Secrète'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STAT_FIELDS=[{key:'power',label:'Puissance'},{key:'size',label:'Taille'},{key:'def',label:'Défense'},{key:'aura',label:'Aura'},{key:'intelligence',label:'Intelligence'}];
  const context={esc,safeImage:value=>/^data:image\/png;base64,/.test(value||'')?value:'',CSSColor:(value,fallback)=>/^#[a-f\d]{6}$/i.test(value||'')?value:fallback,statValue:(card,key)=>card[key],STAT_FIELDS,
   RARITIES:Object.fromEntries(rarities.map(key=>[key,{label:labels[key]}])),rarityName:key=>labels[key],cardRarityLabel:card=>labels[card.rarity],editionText:card=>String(card.editionNumber).padStart(3,'0')+'/100',onlineUser:{role:'player'},state:{owned:{},artwork:{}}};
  function artwork(index){
   // Original procedural PNG: stellar discs, geological layers and a tiny observer.
   const canvas=document.createElement('canvas');canvas.width=360;canvas.height=510;const c=canvas.getContext('2d');
   const hues=[34,188,263,43,12,160],hue=hues[index%hues.length];
   const gradient=c.createLinearGradient(0,0,340,510);gradient.addColorStop(0,`hsl(${hue} 35% 8%)`);gradient.addColorStop(.6,`hsl(${hue} 45% 25%)`);gradient.addColorStop(1,'#060c14');c.fillStyle=gradient;c.fillRect(0,0,360,510);
   const halo=c.createRadialGradient(210,180,1,210,180,140);halo.addColorStop(0,`hsla(${hue+25} 90% 80% / .4)`);halo.addColorStop(1,'transparent');c.fillStyle=halo;c.fillRect(0,0,360,400);
   c.strokeStyle=`hsla(${hue+20} 80% 75% / .65)`;c.lineWidth=1.4;
   for(let r=42;r<100;r+=14){c.beginPath();c.ellipse(205,172,r,r*.75,-.5,0,Math.PI*2);c.stroke();}
   c.fillStyle=`hsl(${hue+15} 75% 86%)`;c.beginPath();c.arc(205,172,35,0,Math.PI*2);c.fill();
   for(let i=0;i<70;i++){const x=(i*97+31)%360,y=(i*53+13)%340;c.globalAlpha=.25+(i%4)*.18;c.fillRect(x,y,i%9===0?2:1,i%9===0?2:1);}c.globalAlpha=1;
   for(let layer=0;layer<5;layer++){c.fillStyle=`hsl(${hue} ${20+layer*3}% ${24-layer*4}%)`;c.beginPath();c.moveTo(0,345+layer*25);for(let x=0;x<=360;x+=20)c.lineTo(x,300+layer*24+Math.sin((x+layer*35)/49)*33+Math.cos(x/23)*13);c.lineTo(360,510);c.lineTo(0,510);c.fill();}
   c.fillStyle='#d3b47b';c.beginPath();c.arc(156,350,5,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(156,355);c.lineTo(144,383);c.lineTo(166,383);c.closePath();c.fill();
   return canvas.toDataURL('image/png');
  }
  const pictures=rarities.map((_,index)=>artwork(index));
  const style=document.createElement('style');style.textContent=`html{background:#080c11;color:#eee4d0}body{margin:0;padding:34px;font-family:system-ui;background:radial-gradient(ellipse at top,#222534,#080c11 65%);min-height:100vh}.v14-proof-title{font-size:32px;letter-spacing:.05em;margin:0 0 8px}.v14-proof-subtitle{color:#b9aa91;font-size:14px;max-width:950px;margin:0 0 32px}.v14-proof-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:24px 18px;max-width:1500px}.v14-proof-item{min-width:0}.v14-proof-item h2{font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 10px;color:#ceb98b}.v14-proof-item .tcg-card{width:100%;aspect-ratio:300/425;height:auto;min-height:0;pointer-events:none}.v14-proof-hidden{display:none}.v14-proof-footer{color:#a99c89;font-size:12px;margin-top:28px}@media(max-width:700px){body{padding:18px}.v14-proof-title{font-size:23px}.v14-proof-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 14px}.v14-proof-item h2{font-size:10px}}`;
  document.head.append(style);document.documentElement.dataset.m13Quality='high';
  const cards=[];
  for(const variant of variants)for(const [index,rarity] of rarities.entries()){
   const card={id:'fiction-matrix-'+variant+'-'+rarity,name:['Le Veilleur','Porte des brumes','L’Oracle stellaire','Astre oublié','Le Dernier seuil','Éveil primordial'][index],family:'Chroniques du seuil',rarity,variant,power:91,size:67,def:84,aura:98,intelligence:93,editionSeries:2,editionNumber:cards.length+1,art:pictures[index],color1:'#907243',color2:'#111a2d'};
   context.state.owned[card.id]=1;
   cards.push('<article class="v14-proof-item" data-rarity="'+rarity+'" data-variant="'+variant+'"><h2>'+labels[rarity]+' · '+(variant==='secret'&&rarity==='ultra'?'Ultra Secrète':variantLabels[variant])+'</h2>'+renderMashupV10Card(card,{accessible:true},context)+'</article>');
  }
  const secret={id:'fiction-undiscovered',name:'NE PAS RÉVÉLER 672',family:'FAMILLE PRIVÉE 672',rarity:'ultra',variant:'secret',art:pictures[5],power:99,size:99,def:99,aura:99,intelligence:99,editionNumber:99,editionSeries:2};
  const unknown=renderMashupV10Card(secret,{accessible:true},context);
  document.body.innerHTML='<h1 class="v14-proof-title">MASHUP / ATLAS DES FINITIONS</h1><p class="v14-proof-subtitle">24 cartes réellement rendues dans Chromium · 6 raretés × 4 finitions · illustrations procédurales fictives · aucune donnée de joueur</p><main class="v14-proof-grid">'+cards.join('')+'</main><div class="v14-proof-hidden">'+unknown+'</div><p class="v14-proof-footer">Images du navigateur, sans retouche. Les reflets réagissent au geste dans le jeu ; cette planche fixe permet de comparer les cadres.</p>';
  await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));
  const imagesPreserved=[...document.querySelectorAll('.v14-proof-item')].every(item=>{const image=item.querySelector('.v10-picture-img');return image?.getAttribute('src')===pictures[rarities.indexOf(item.dataset.rarity)]&&image.naturalWidth===360;});
  return {cards:document.querySelectorAll('.v14-proof-item .tcg-card').length,stats:[...document.querySelectorAll('.v14-proof-item')].map(item=>item.querySelectorAll('.v10-stat').length),imagesPreserved,privacy:!unknown.includes(secret.name)&&!unknown.includes(secret.family)&&!unknown.includes(secret.art)&&!unknown.includes('99'),overflow:document.documentElement.scrollWidth>innerWidth};
 },{rarities:RARITIES,variants:VARIANTS});
}

(async()=>{
 const lab=await laboratory(),report={kind:'synthetic-browser-regression',productionRequests:0,started:new Date().toISOString(),checks:[],layouts:[],screenshots:[],limits:'Chromium headless sous Linux, fixtures locales. Ne valide ni iPhone/Android physique, ni sécurité backend, ni restauration Supabase.'};
 const fixture=await fixtureContext(lab),{context,fixtures,calls,errors,consoleErrors,external}=fixture;
 const screenshot=async(page,name,{fullPage=true}={})=>{await page.screenshot({path:path.join(ARTIFACTS,name),fullPage});report.screenshots.push(name);};
 try{
  const page=await context.newPage();await openHome(page,lab.url);
  assert.equal(await page.locator('.m13-home').count(),1);report.checks.push('Accueil et compte fictif chargés');
  await screenshot(page,'home-mobile.png',{fullPage:false});
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Débordement horizontal accueil '+width);
   const action=page.locator('.m13-hero [data-action="open-pack"]');assert.ok(await action.isVisible(),'Booster accessible '+width);
   report.layouts.push({width,homeNoOverflow:true,heroActionVisible:true});
   if(width===1440)await screenshot(page,'home-desktop.png');
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.m13-dock [data-m13-menu]').click();await page.locator('dialog[open]').waitFor();
  assert.equal(await page.locator('.m13-menu-grid [data-m13-view="admin"]').count(),1);
  await page.locator('#m13-quality').selectOption('high');
  await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='high');
  await screenshot(page,'menu-mobile.png',{fullPage:false});
  await page.locator('dialog [data-m13-view="decks"]').click();
  assert.equal(await page.locator('#deck-roster>.deck-visual-choice').count(),24);
  await page.locator('[data-action="deck-load-more"]').click();assert.equal(await page.locator('#deck-roster>.deck-visual-choice').count(),36);
  report.checks.push('Menu administrateur et pagination decks 24 → 36');
  await openCollection(page);
  assert.equal(await page.locator('.collection-item').count(),24);
  await page.locator('.collection-item').first().evaluate(node=>{window.__firstCollectionNode=node;});
  const more=page.locator('[data-action="load-more-collection"]');
  if(await more.count()){
   await more.click();assert.equal(await page.locator('.collection-item').count(),36);
   assert.equal(await page.locator('.collection-item').first().evaluate(node=>node===window.__firstCollectionNode),true,'La pagination doit garder les nœuds déjà affichés');
   report.checks.push('Pagination collection 24 → 36 garde le premier nœud DOM');
  }
  await page.locator('#collection-search').fill(fixtures.cards[0].name);await page.waitForFunction(()=>document.querySelectorAll('.collection-item').length===1);
  await page.locator('#collection-search').fill('');await page.waitForFunction(()=>document.querySelectorAll('.collection-item').length===24);
  report.checks.push('Recherche collection et remise à zéro');
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Débordement collection '+width);
   report.layouts.find(layout=>layout.width===width).collectionNoOverflow=true;
  }
  await page.setViewportSize({width:390,height:844});await screenshot(page,'collection-mobile.png');
  report.collectionLegibility=await legibility(page,'.collection-item .tcg-card');
  assert.ok(report.collectionLegibility.every(card=>card.stats===5&&card.visible&&!card.titleCollision),'Cinq valeurs lisibles sans collision avec le titre en collection');
  report.collection=await measure(page,{frames:120,scroll:true});
  await page.locator('.collection-item .tcg-card[role="button"]').first().click();
  await page.locator('[data-action="zoom-card"]').click();await page.locator('.inspect-stage').waitFor();
  const tilt=page.locator('.inspect-tilter'),box=await tilt.boundingBox();
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.32,{steps:8});
  await page.waitForFunction(()=>Math.abs(parseFloat(document.querySelector('.inspect-tilter').style.getPropertyValue('--ry')))>0);await page.mouse.up();
  await page.mouse.down({button:'right'});await page.mouse.move(box.x+box.width*.4,box.y+box.height*.7,{steps:8});await page.mouse.up({button:'right'});
  await tilt.focus();await page.keyboard.press('ArrowRight');
  await screenshot(page,'card-inspection.png',{fullPage:false});
  report.inspectionLegibility=await legibility(page,'.inspect-front .tcg-card');
  assert.ok(report.inspectionLegibility.every(card=>card.stats===5&&card.visible&&!card.titleCollision),'Cinq valeurs lisibles en inspection');
  const inspectionTransform=await tilt.evaluate(node=>({rx:node.style.getPropertyValue('--rx'),ry:node.style.getPropertyValue('--ry')}));
  assert.ok(inspectionTransform.rx||inspectionTransform.ry,'Inspection doit réagir au geste ou au clavier');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='eco');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>{const node=document.querySelector('.inspect-tilter');return (!parseFloat(node.style.getPropertyValue('--rx')))&&(!parseFloat(node.style.getPropertyValue('--ry')));});
  const reduced=await tilt.evaluate(node=>({rx:node.style.getPropertyValue('--rx'),ry:node.style.getPropertyValue('--ry')}));
  assert.ok(!reduced.rx||parseFloat(reduced.rx)===0,'Rotation verticale neutralisée en mouvement réduit');
  assert.ok(!reduced.ry||parseFloat(reduced.ry)===0,'Rotation horizontale neutralisée en mouvement réduit');
  await page.locator('[data-action="close-modal"]').click();
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.documentElement.dataset.m13Quality==='high');
  report.checks.push('Détail, inspection tactile/souris/clavier et mouvement réduit');
  await navigate(page,'packs');await page.locator('.m13-home').waitFor();
  const committedBefore=calls.filter(call=>call.route==='/api/packs/commit').length;
  const stopRecording=await recordScene(page);
  await page.locator('.m13-hero [data-action="open-pack"]').click();
  const seal=page.locator('[data-v14-break-seal]');
  await Promise.race([seal.waitFor({state:'visible',timeout:10000}),page.locator('.opening-top-card').waitFor({state:'visible',timeout:10000})]);
  if(await seal.isVisible()){
   await screenshot(page,'booster-01-sealed.png',{fullPage:false});
   assert.equal(calls.filter(call=>call.route==='/api/packs/commit').length,committedBefore,'Le sceau ne valide pas la dépense');
   await seal.click();report.checks.push('Booster scellé : geste explicite avant révélation');
  }
  for(let index=0;index<3;index++){
   await page.locator('.opening-top-card:not([disabled])').click();
   await page.waitForFunction(()=>{const button=document.querySelector('.opening-top-card');return button?.classList.contains('revealed')&&!button.disabled;});
   await screenshot(page,'booster-0'+(index+2)+'-reveal.png',{fullPage:false});
   await page.locator('.opening-top-card:not([disabled])').click();
   await page.waitForFunction(index=>index===2?!document.querySelector('#opening-done')?.hidden:document.querySelector('#opening-progress')?.textContent.startsWith('Carte '+(index+2)),index);
  }
  await screenshot(page,'booster-05-summary.png',{fullPage:false});
  report.boosterVideo=await stopRecording();
  await page.setViewportSize({width:844,height:390});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Débordement du résumé en petit paysage');
  await page.locator('#opening-done').scrollIntoViewIfNeeded();await screenshot(page,'booster-landscape-summary.png',{fullPage:false});
  await page.setViewportSize({width:390,height:844});
  assert.equal(calls.filter(call=>call.route==='/api/packs/commit').length,committedBefore,'Le récapitulatif précède la confirmation');
  await page.locator('#opening-done').click();await page.locator('.m13-home').waitFor();
  assert.equal(calls.filter(call=>call.route==='/api/packs/prepare').length,1);
  assert.equal(calls.filter(call=>call.route==='/api/packs/commit').length,committedBefore+1);
  report.checks.push('Booster : 3 révélations, récapitulatif, 1 prepare et 1 commit seulement');
  await page.locator('.m13-dock [data-m13-menu]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(dialog=>dialog.open),false);
  await page.reload({waitUntil:'networkidle'});await page.locator('.m13-home').waitFor();assert.equal(await page.locator('html').getAttribute('data-m13-quality'),'high');
  report.checks.push('Échap ferme le menu ; qualité persistée après rechargement');
  fixtures.user.role='player';await page.reload({waitUntil:'networkidle'});await page.locator('.m13-home').waitFor();
  await page.locator('.m13-dock [data-m13-menu]').click();assert.equal(await page.locator('.m13-menu-grid [data-m13-view="admin"]').count(),0);assert.equal(await page.locator('.m13-menu-grid [data-m13-view="creator"]').count(),0);
  await page.locator('.m13-signout').click();await page.locator('#form-auth').waitFor();assert.equal(await page.locator('.m13-dock').isVisible(),false);await screenshot(page,'login-mobile.png',{fullPage:false});
  report.checks.push('Permissions du menu joueur et déconnexion');
  const matrix=await context.newPage();await matrix.setViewportSize({width:1536,height:1100});report.matrix=await gallery(matrix,lab.url);
  assert.equal(report.matrix.cards,24);assert.ok(report.matrix.stats.every(count=>count===5));assert.equal(report.matrix.imagesPreserved,true);assert.equal(report.matrix.privacy,true);assert.equal(report.matrix.overflow,false);
  report.matrix.legibilityDesktop=await legibility(matrix,'.v14-proof-item .tcg-card');
  assert.ok(report.matrix.legibilityDesktop.every(card=>card.stats===5&&card.visible&&!card.titleCollision));
  await screenshot(matrix,'cards-24-finishes.png');
  await matrix.setViewportSize({width:390,height:844});assert.equal(await matrix.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await screenshot(matrix,'cards-mobile.png');
  report.matrix.legibilityMobile=await legibility(matrix,'.v14-proof-item .tcg-card');
  assert.ok(report.matrix.legibilityMobile.every(card=>card.stats===5&&card.visible&&!card.titleCollision));
  report.checks.push('Galerie : 6 raretés × 4 variantes, images identiques entre variantes, 5 statistiques visibles sans collision de titre, carte inconnue sans métadonnées ni image');
  assert.deepEqual(errors,[],'Aucune exception JavaScript');assert.deepEqual(consoleErrors,[],'Aucune erreur console');
  report.checks.push('Aucune exception JavaScript ni erreur console');
  report.apiCalls=calls;report.externalRequestsIntercepted=external.length;report.externalHosts=[...new Set(external.map(request=>request.host))];report.consoleErrors=consoleErrors;report.pageErrors=errors;report.success=true;
  saveJson('browser-results.json',report);console.log(JSON.stringify({success:true,checks:report.checks,layouts:report.layouts,artifacts:ARTIFACTS,externalRequestsIntercepted:external.length},null,2));
 }catch(error){report.success=false;report.failure=error.stack;report.consoleErrors=consoleErrors;report.pageErrors=errors;report.apiCalls=calls;saveJson('browser-results.json',report);throw error;}
 finally{await context.close();await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
