/* Real frontend in Chromium; every outside request is intercepted. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {laboratory,fixtureContext,openHome,navigate,recordScene,ARTIFACTS,saveJson}=require('./harness.cjs');
(async()=>{
 const lab=await laboratory(),report={baseline:'19375ce',started:new Date().toISOString(),productionRequests:0,checks:[],screenshots:[],limits:'Chromium Linux, tactile simulé. Aucun téléphone physique ni vrai backend testé.'};
 let active;
 async function shot(page,name,fullPage=false){await page.screenshot({path:path.join(ARTIFACTS,name),fullPage});report.screenshots.push(name);}
 async function scenario(name,fn,size={width:390,height:844}){
  const f=await fixtureContext(lab,size),page=await f.context.newPage();active=page;
  try{console.log('TEST '+name);await page.addInitScript(()=>localStorage.setItem('mashup-display-v13','high'));await openHome(page,lab.url);await fn(page,f);assert.deepEqual(f.errors,[]);const unexpected=f.consoleErrors.filter(s=>!s.includes('503'));assert.deepEqual(unexpected,[]);report.checks.push({name,success:true,apiCalls:f.calls,expectedInjectedConsoleErrors:f.consoleErrors.filter(s=>s.includes('503'))});}
  finally{await f.context.close();active=null;}
 }
 async function dock(page,expected,player=true){
  assert.equal(await page.locator('[data-rb-rule]').getAttribute('data-direction'),expected);
  const geometry=await page.evaluate(player=>{
   const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
   const rule=document.querySelector('[data-rb-rule]'),nav=document.querySelector('.m13-dock'),buttons=[...document.querySelectorAll('[data-rb-stat-dock] .stat-choice')];
   const test=n=>{const r=rect(n),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return {r,hit:hit===n||n.contains(hit)};};
   return {rule:test(rule),buttons:buttons.map(test),nav:rect(nav),viewport:{w:innerWidth,h:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth};
  },player);
  assert.equal(geometry.overflow,false);
  for(const item of [geometry.rule,...geometry.buttons]){assert.ok(item.r.top>=0&&item.r.bottom<=geometry.nav.top+1,'Règle/choix doivent rester au-dessus de la navigation : '+JSON.stringify(item));assert.ok(item.r.left>=-1&&item.r.right<=geometry.viewport.w+1);assert.equal(item.hit,true,'Contrôle couvert');}
  if(player)assert.equal(geometry.buttons.length,5);
  return geometry;
 }
 try{
  for(const size of [{width:320,height:568},{width:360,height:640},{width:390,height:844}])for(const mode of ['simple','double']){
   await scenario('Campagne '+mode+' complète, règle permanente '+size.width+'×'+size.height,async(page,f)=>{
    await navigate(page,'arena');if(mode==='double')await page.locator('[data-action="arena-mode"][data-mode="double"]').click();
    await page.locator('[data-action="start-battle"]').click();await page.locator('.rb-arena').waitFor();
    let recording;if(size.width===390&&mode==='simple')recording=await recordScene(page,'combat-preview.webm');
    for(let round=0;round<4;round++){
     const direction=['higher','lower','lower','higher'][round],own=round%2===0;
     await page.locator('.rb-arena[data-rb-stage="choose"]').waitFor();
     await page.locator('[data-rb-rule][data-direction="'+direction+'"]').waitFor();
     const geo=await dock(page,direction,own);report.ruleGeometry??=[];report.ruleGeometry.push({size,mode,round,direction,...geo});
     assert.equal(await page.locator('.rb-team[data-rb-side="enemy"] .tcg-card').count(),0);
     assert.equal(await page.locator('.mystery-card').count(),mode==='double'?2:1);
     if(mode==='double'){const widths=await page.locator('.rb-card-object').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert.ok(widths.every(w=>w>=110),'Duos identifiables');}
     if(round===0)await page.waitForTimeout(250);if(round===0)await shot(page,'arena-'+mode+'-'+size.width+'-higher.png');
     if(round===2&&size.width===390)await shot(page,'arena-'+mode+'-lower.png');
     const action=own?page.locator('[data-action="challenge-stat"][data-stat="'+(direction==='higher'?'power':'size')+'"]'):page.locator('[data-action="ai-turn"]');
     await action.click();await page.locator('.rb-comparison').waitFor();
     assert.equal(await page.locator('.rb-team .tcg-card').count(),mode==='double'?4:2);
     if(round===0&&size.width===390){await page.waitForTimeout(400);await shot(page,'arena-'+mode+'-impact.png');}
     if(recording)await page.waitForTimeout(1250);
     if(round<3)await page.locator('[data-action="next-round"]').click();
    }
    await page.locator('.rb-outcome').waitFor();await page.locator('[data-action="arena-skip"]').click();await shot(page,'arena-'+mode+'-'+size.width+'-final.png');
    if(recording)report.combatVideo=await recording();
    assert.equal(f.calls.filter(c=>c.route==='/api/battles/choose').length,4);assert.equal(f.calls.filter(c=>c.route==='/api/battles/next').length,3);
    await page.locator('[data-rb-stat-dock] [data-action="quit-battle"]').click();await page.locator('[data-action="start-battle"]').waitFor();
   },size);
  }
  for(const guest of [false,true])for(const mode of ['simple','double']){
   await scenario('PvP '+mode+' côté '+(guest?'invité':'hôte')+', confidentialité et reprise',async(page,f)=>{
    const me=f.fixtures.user.id,other='fiction-friend',cards=f.fixtures.cards;
    const match={id:'fiction-duel',updatedAt:1,status:'active',stage:'choose',mode,host:guest?other:me,guest:guest?me:other,actor:me,round:0,direction:'lower',hostScore:0,guestScore:0,opponent:{pseudo:'Camille'},ownCards:cards.slice(2,mode==='double'?4:3),enemyCards:cards.slice(6,mode==='double'?8:7),history:[],meReady:false};
    f.controls.set('/api/pvp',()=>({body:{match,players:[],leaderboard:[],balance:2450}}));
    f.controls.set('/api/pvp/choose',({call})=>{assert.deepEqual(call.payload,{id:match.id,stat:'size'});match.updatedAt++;match.stage='reveal';match.history=[{key:'size',h:guest?88:14,g:guest?14:88,winner:guest?'guest':'host'}];if(guest)match.guestScore=1;else match.hostScore=1;return {body:{}};});
    f.controls.set('/api/pvp/next',()=>{match.updatedAt++;match.stage='choose';match.round=1;match.direction='higher';match.actor=other;return {body:{}};});
    await navigate(page,'arena');await page.locator('[data-action="arena-section"][data-section="online"]').click();await page.locator('.rb-arena').waitFor();
    await dock(page,'lower');assert.equal(await page.locator('.pvp-hidden').count(),mode==='double'?2:1);assert.equal(await page.locator('#pvp-countdown').count(),0);
    await page.locator('[data-action="pvp-choose"][data-stat="size"]').click();await page.locator('.rb-comparison').waitFor();assert.deepEqual(await page.locator('.rb-comparison b').allTextContents(),['14','88']);
    await page.locator('[data-action="arena-skip"]').click();assert.equal(await page.locator('.rb-arena').getAttribute('data-rb-phase'),'result');
    match.updatedAt++;const previous=f.calls.filter(c=>c.route==='/api/pvp').length;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.waitForFunction(()=>document.querySelector('.rb-arena')?.dataset.rbPhase==='result');await page.waitForTimeout(150);assert.ok(f.calls.filter(c=>c.route==='/api/pvp').length>previous);assert.equal(await page.locator('.rb-arena').getAttribute('data-rb-phase'),'result');
    if(guest&&mode==='double')await shot(page,'pvp-double-guest.png');
    await page.locator('[data-action="pvp-next"]').click();await page.locator('.rb-arena[data-rb-stage="choose"]').waitFor();await dock(page,'higher',false);await page.locator('.pvp-waiting').waitFor();
    f.controls.failNext('/api/pvp');await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.locator('.rb-network:not([hidden])').waitFor();assert.ok(!(await page.locator('.rb-network').textContent()).includes('adversaire déconnecté'));
    await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(200);assert.equal(await page.locator('.rb-network').isVisible(),false);
   });
  }
  await scenario('Qualités, mouvement réduit, navigation pendant réponse et déconnexion',async(page,f)=>{
   await navigate(page,'arena');await page.locator('[data-action="start-battle"]').click();
   for(const quality of ['spectacular','balanced','fluid']){await page.locator('#rb-quality').selectOption(quality);assert.equal(await page.locator('.rb-arena').getAttribute('data-rb-quality'),quality);}
   await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="challenge-stat"][data-stat="power"]').click();await page.locator('.rb-comparison').waitFor();assert.equal(await page.locator('.rb-arena').getAttribute('data-rb-quality'),'fluid');assert.equal(await page.locator('.rb-arena').evaluate(n=>n.getAnimations({subtree:true}).length),0);
   await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-action="next-round"]').click();await page.locator('[data-action="ai-turn"]').waitFor();
   const gate=f.controls.deferNext('/api/battles/choose');await page.locator('[data-action="ai-turn"]').click();const info=await gate.started;await navigate(page,'packs');gate.release({body:info.body});await page.waitForTimeout(200);await page.locator('.m13-home').waitFor();assert.equal(await page.locator('.rb-arena').count(),0);
   await navigate(page,'arena');await page.locator('.rb-arena').waitFor();await page.locator('#rb-quality').selectOption('spectacular');await page.locator('[data-action="next-round"]').click();await page.locator('[data-action="challenge-stat"][data-stat="power"]').click();await page.locator('.rb-comparison').waitFor();
   await page.locator('.m13-dock [data-m13-menu]').click();await page.locator('.m13-signout').click();await page.locator('#form-auth').waitFor();await page.waitForTimeout(1200);assert.equal(await page.locator('#page').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  });
  await scenario('Échanges : collections, filtres, quantités, proposition et contre-offre',async(page,f)=>{
   let trades=[];const cards=f.fixtures.cards,user=f.fixtures.user;
   f.controls.set('/api/trades',()=>({body:{players:[{id:'fiction-friend',pseudo:'Camille'}],trades}}));
   f.controls.set('/api/trades/create',({call})=>{trades=[{...call.payload,id:'fiction-trade',from:user.id,to:'fiction-friend',fromName:'Alex',toName:'Camille',status:'pending'}];return {body:{}};});
   f.controls.set('/api/trades/respond',({call})=>{if(call.payload.action==='counter')trades=[];if(call.payload.action==='accept'){f.fixtures.state.coins=3210;trades=trades.map(t=>({...t,status:'accepted'}));}return {body:{}};});
   await navigate(page,'market');await page.locator('[data-action="v11-market-mode"][data-mode="trades"]').click();await page.locator('#trade-partner option[value="fiction-friend"]').waitFor({state:'attached'});await page.locator('#trade-partner').selectOption('fiction-friend');await page.locator('[data-action="trade-load-target"]').click();await page.locator('[data-side="request"].v151-trade-card').first().waitFor({state:'attached'});
   let choices=page.locator('[data-side="offer"].v151-trade-card');const chosen=await choices.first().getAttribute('data-trade-card');await choices.first().click();await page.locator('[data-trade-qty="offer"]').fill('2');
   await page.locator('[data-trade-filter="search"][data-side="offer"]').fill('introuvable');assert.equal(await page.locator('[data-side="offer"].v151-trade-card').count(),0);assert.equal(await page.locator('[data-trade-qty="offer"]').inputValue(),'2');await page.locator('[data-trade-filter="search"][data-side="offer"]').fill('');
   await page.locator('#trade-offer-credits').fill('25');await page.locator('[data-trade-tab="request"]').click();await page.locator('[data-side="request"].v151-trade-card').first().click();const requested=await page.locator('[data-side="request"].v151-trade-card[aria-pressed=true]').getAttribute('data-trade-card');
   await page.locator('#trade-request-credits').fill('5');
   await shot(page,'trades-collections-mobile.png',true);const recording=await recordScene(page,'trades-preview.webm');await page.locator('[data-trade-tab="offer"]').click();await page.locator('[data-side="offer"].v151-trade-card').nth(1).click();await page.waitForTimeout(250);await page.locator('[data-side="offer"].v151-trade-card').nth(1).click();await page.waitForTimeout(250);report.tradesVideo=await recording();
   await page.locator('[data-action="trade-send"]').click();await page.locator('.market-trade').waitFor();const sent=f.calls.find(c=>c.route==='/api/trades/create').payload;assert.deepEqual(sent,{to:'fiction-friend',offer:[{id:chosen,qty:2}],request:[{id:requested,qty:1}],offerCredits:25,requestCredits:5});
   trades=[{id:'incoming',from:'fiction-friend',to:user.id,fromName:'Camille',toName:'Alex',status:'pending',offer:[{id:cards[6].id,qty:2,card:cards[6]}],request:[{id:cards[0].id,qty:1,card:cards[0]}],offerCredits:70,requestCredits:9}];
   await page.locator('[data-action="trade-refresh"]').click();await page.locator('[data-action="trade-counter"]').click();await page.locator('[data-trade-qty="offer"]').waitFor();assert.equal(await page.locator('#trade-offer-credits').inputValue(),'9');assert.equal(await page.locator('#trade-request-credits').inputValue(),'70');assert.equal(await page.locator('[data-trade-qty="request"]').inputValue(),'2');await page.locator('[data-action="trade-send"]').click();await page.waitForTimeout(150);const counter=f.calls.filter(c=>c.route==='/api/trades/respond').at(-1).payload;assert.deepEqual(counter,{to:'fiction-friend',offer:[{id:cards[0].id,qty:1}],request:[{id:cards[6].id,qty:2}],offerCredits:9,requestCredits:70,id:'incoming',action:'counter'});
   trades=[{id:'to-accept',from:'fiction-friend',to:user.id,fromName:'Camille',toName:'Alex',status:'pending',offer:[],request:[],offerCredits:760,requestCredits:0}];await page.locator('[data-action="trade-refresh"]').click();await page.locator('[data-action="trade-accept"]').click();await page.waitForFunction(()=>document.getElementById('coin-balance')?.textContent.replace(/\D/g,'')==='3210');assert.deepEqual(f.calls.filter(c=>c.route==='/api/trades/respond').at(-1).payload,{id:'to-accept',action:'accept'});
  });
  await scenario('Échanges : réponses de partenaires désordonnées et page retirée',async(page,f)=>{
   const cards=f.fixtures.cards;
   f.controls.set('/api/trades',()=>({body:{players:[{id:'a',pseudo:'Aurore'},{id:'b',pseudo:'Boréal'}],trades:[]}}));
   await navigate(page,'market');await page.locator('[data-action="v11-market-mode"][data-mode="trades"]').click();await page.locator('#trade-partner option[value="a"]').waitFor({state:'attached'});
   const a=f.controls.deferNext('/api/trades/partner/a'),b=f.controls.deferNext('/api/trades/partner/b');
   await page.locator('#trade-partner').selectOption('a');await page.locator('[data-action="trade-load-target"]').click();await a.started;
   await page.locator('#trade-partner').selectOption('b');await page.locator('[data-action="trade-load-target"]').click();await b.started;
   b.release({body:{id:'b',pseudo:'Boréal',cards:[{...cards[7],qty:1}]}});await page.locator('[data-side="request"].v151-trade-card').waitFor({state:'attached'});a.release({body:{id:'a',pseudo:'Aurore',cards:[{...cards[8],qty:1}]}});await page.waitForTimeout(150);
   assert.equal(await page.locator('[data-side="request"].v151-trade-card').getAttribute('data-trade-card'),cards[7].id);assert.ok((await page.locator('[data-trade-side="request"] h4').textContent()).includes('Boréal'));
   const stale=f.controls.deferNext('/api/trades/partner/a');await page.locator('#trade-partner').selectOption('a');await page.locator('[data-action="trade-load-target"]').click();await stale.started;await navigate(page,'packs');stale.release({body:{id:'a',cards:[{...cards[8],qty:1}]}});await page.waitForTimeout(150);await page.locator('.m13-home').waitFor();
  });
  await scenario('Fins de combat : victoire, défaite et égalité fournies par le serveur',async(page,f)=>{
   const me=f.fixtures.user.id,cards=f.fixtures.cards;
   const match={id:'fiction-final',updatedAt:1,status:'finished',stage:'reveal',mode:'simple',host:me,guest:'friend',actor:me,round:3,direction:'higher',hostScore:3,guestScore:1,result:'host',opponent:{pseudo:'Camille'},ownCards:[cards[0]],enemyCards:[cards[6]],history:[{key:'power',h:90,g:66,winner:'host'}]};
   f.controls.set('/api/pvp',()=>({body:{match,players:[],leaderboard:[],balance:3210}}));
   await navigate(page,'arena');
   for(const [result,side,score] of [['host','player',[3,1]],['guest','enemy',[1,3]],['draw','draw',[2,2]]]){
    match.result=result;match.hostScore=score[0];match.guestScore=score[1];match.updatedAt++;
    await page.locator('[data-action="arena-section"][data-section="online"]').filter({visible:true}).first().click();await page.locator('.rb-outcome[data-result="'+side+'"]').waitFor();
    assert.ok((await page.locator('.rb-final-score').textContent()).includes(score[0]+' – '+score[1]));assert.ok(!(await page.locator('.rb-outcome').textContent()).includes('+0 crédits'));
    await page.locator('[data-action="arena-skip"]').click();await shot(page,'outcome-'+side+'.png');
   }
  });
  await scenario('Autres onglets préservés',async(page)=>{
   for(const [view,selector] of [['collection','[data-action="choose-series"]'],['decks','#deck-roster'],['market','#v11-market-results'],['profile','#profile-pseudo'],['games','[data-games="mini"]'],['missions','.missions-screen'],['leaderboard','.v11-ranking-row'],['achievements','.page-lead'],['creator','#draft-name'],['admin','#users-list']]){console.log('ONGLET '+view);await navigate(page,view);await page.locator(selector).first().waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view);}
  });
  report.success=true;saveJson('browser-results.json',report);console.log(JSON.stringify({success:true,checks:report.checks.map(x=>x.name),screenshots:report.screenshots},null,2));
 }catch(error){report.success=false;report.failure=error.stack;if(active)await active.screenshot({path:path.join(ARTIFACTS,'failure.png')}).catch(()=>{});saveJson('browser-results.json',report);throw error;}
 finally{await lab.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
