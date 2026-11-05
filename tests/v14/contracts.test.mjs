import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
function git(args){const result=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(result.status,0,'git '+args[0]+' failed');return result.stdout;}
const root=new URL('../../',import.meta.url);
const current=fs.readFileSync(new URL('index.html',root),'utf8');
const baseline=git(['show','b20fb58:index.html']);
function body(source,start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}
test('Booster prepare/commit : mêmes routes, identifiants et données transactionnelles',()=>{
 const calls=source=>source.match(/api\('\/api\/packs\/[^']+',\{[^}]+\}\)/g)||[];
 for(const [start,end] of [['async function openPack(id){','let packFlipBusy='],['async function finishOpening(){','function closeModal(){']]){
  assert.deepEqual(calls(body(current,start,end)),calls(body(baseline,start,end)));
 }
 assert.ok(body(current,'async function openPack(id){','let packFlipBusy=').includes("state[p.currency==='dust'?'dust':'coins']<p.price"));
 assert.ok(body(current,'async function finishOpening(){','function closeModal(){').includes('packRevealed.size<packResults.length'));
});
test('Contrats API : aucune nouvelle route serveur dans le client principal',()=>{
 const routes=s=>[...new Set([...s.matchAll(/api\(['"]([^'"]+)/g)].map(m=>m[1]))].sort();
 assert.deepEqual(routes(current),routes(baseline));
});
test('Marché, missions, récupération et cadrage : sources protégées ; catalogue automatique autorisé',()=>{
 const names=git(['diff','--name-only','b20fb58','--','backend','content','reset.html','27-v11-3-image-studio.js']).trim();
 const allowed=new Set(['backend/catalogue-core.js','backend/catalogue-integration.js','backend/collection-rewards-v10-8.js','backend/collection-rewards-v10-9.js','backend/achievements-v11.js','backend/leaderboards-v11.js','backend/market-v11.js','content/convergence-series2.json']);assert.deepEqual(names?names.split('\n').filter(path=>!allowed.has(path)):[],[]);
 for(const [start,end] of [['async function openImageCropper','async function compressImage']])assert.equal(body(current,start,end).replaceAll('installCatalogue(r.cards,r.catalogueMeta);','BASE_CARDS=r.cards;'),body(baseline,start,end));
});
