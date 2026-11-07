import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const root=new URL('../../',import.meta.url),read=file=>fs.readFileSync(new URL(file,root),'utf8'),before=file=>execFileSync('git',['show','79172e1:'+file],{cwd:root,encoding:'utf8'});
test('V16 leaves every card material, rendering engine, illustration and game rule byte-identical to V15.7.2',()=>{
 const files=['backend','assets','content','06-v10-cards.js','07-v10-cards.css','25-convergence-series2.css','26-v11-2-mobile-booster.css','27-v11-3-image-studio.js','35-mobile-premium.js','37-v14-cards.css','38-v14-booster.js','39-v14-booster.css','41-v14-runtime.js','42-v14-finishes.css','44-v15-album.css','45-v15-living-cards.css','46-v15-living-cards.js','47-v15-booster.css','53-v15-1-arena.js','54-v15-1-arena.css','62-pack-recovery.js','62-v15-4-match-engine.js','63-v15-4-match-levels.js','65-v15-4-match.css','66-v15-4-casino-clock.js','71-v15-6-match-gesture.js','72-v15-6-match-motion.css','73-v15-6-match-social.js','74-v15-6-match-social.css','75-v15-6-match-presentation.js','76-v15-6-match-presentation.css'];
 assert.equal(execFileSync('git',['diff','--name-only','79172e1','--',...files],{cwd:root,encoding:'utf8'}),'');
});
test('Trade logic changes only the redundant bootstrap fallback after a confirmed server inventory',()=>{
 // The only allowed difference is this explicit server-state branch.
 const source=read('20-market-v10-9.js').replace("import {hasCompleteAccountState} from './79-v16-network.js?v=16.0.0';\n",'').replace('        if (hasCompleteAccountState(r.state)) onState?.(r.state);\n        else await onFreshAccount();','        await onFreshAccount();');
 assert.equal(source,before('20-market-v10-9.js'));
});
test('Marketplace estimates, server payloads and limits remain unchanged',()=>{
 const old=before('22-v11-economy-ui.js'),now=read('22-v11-economy-ui.js');
 const estimate=s=>s.slice(s.indexOf(' const cardEstimate='),s.indexOf(' const myCards='));assert.equal(estimate(now),estimate(old));
 for(const payload of ["api('/api/market/list',{cardId:id,price})","api('/api/market/buy',{id})","api('/api/market/cancel',{id})",'!Number.isSafeInteger(price)||price<10||price>250000']){assert.ok(old.includes(payload));assert.ok(now.includes(payload));}
});
test('Marketplace card HTML remains exact while preview transport gains session cleanup',()=>{
 const render=s=>s.slice(s.indexOf(' function render(listing)'),s.indexOf(' async function load(id)'));assert.equal(render(read('61-v15-3-market-art.js')),render(before('61-v15-3-market-art.js')));
});
test('V16 release metadata stays consistent with the client and fresh-read transport',()=>{
 const version=JSON.parse(read('version.json'));assert.equal(version.version,'16.0.0');assert.equal(version.status,undefined);assert.equal(version.preparedAt,undefined);assert.equal(version.publishedAt,'2026-11-07');assert.equal(JSON.parse(read('manifest.webmanifest')).version,version.version);
 const css=read('78-v16-app.css');assert.doesNotMatch(css,/\.tcg-card[^\n{]*\{|\.v10-(?:stat|picture|frame)[^\n{]*\{/);assert.match(read('index.html'),/appNavigation\.navigate/);
});

test('Casino and Memory keep the exact transaction handlers and request lifecycle',()=>{
 const a=before('04-games-ui.js'),b=read('04-games-ui.js');
 const section=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));
 const handlers=s=>section(s,"    if(action==='bet'){","  document.addEventListener('click',handleClick);");
 assert.ok(handlers(a).length>1000);assert.equal(handlers(a),handlers(b));
 const transport=s=>section(s,'  async function request(','  const intro=');
 assert.ok(transport(a).length>100);assert.equal(transport(a),transport(b));
});
