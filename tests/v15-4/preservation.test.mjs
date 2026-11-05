import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=new URL('../../',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,root),'utf8');
test('V15.4 conserve intégralement le catalogue, les illustrations et les fragments économiques de V15.3.1',()=>{
 const result=spawnSync('git',['diff','--name-only','f82a8cd','--','backend','content','assets','06-v10-cards.js','27-v11-3-image-studio.js','18-v10-8-collection.js','20-market-v10-9.js','22-v11-economy-ui.js','29-v11-4-market-picker.js','58-catalogue.js','59-v15-3-showcase-picker.js','61-v15-3-market-art.js','reset.html'],{cwd:root,encoding:'utf8'});
 assert.ifError(result.error);assert.equal(result.status,0);assert.equal(result.stdout,'');
 assert.equal(fs.existsSync(new URL('backend/match-service.mjs',root)),false,'The private service must stay outside the public repository.');
});
test('Les modules inline compilent et leurs ressources locales existent avec la version publiée',()=>{
 const source=read('index.html');
 for(const script of source.matchAll(/<script\b[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)){
  const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:script[1],encoding:'utf8'});assert.ifError(checked.error);assert.equal(checked.status,0,checked.stderr);
  for(const match of script[1].matchAll(/from ['"](\.\/[^'"]+)['"]/g))assert.ok(fs.existsSync(new URL(match[1].split('?')[0],root)),match[1]);
 }
 const manifest=JSON.parse(read('manifest.webmanifest')),version=JSON.parse(read('version.json')).version;
 assert.equal(manifest.version,version);
 for(const file of ['04-games-ui.js','09-mashup-updates.js','32-v12-performance.js','38-v14-booster.js','45-v15-living-cards.css','46-v15-living-cards.js','47-v15-booster.css','53-v15-1-arena.js','54-v15-1-arena.css','57-v15-1-battle-view.js','64-v15-4-match-ui.js','65-v15-4-match.css','67-v15-4-update-safety.js','68-v15-4-mobile.css'])assert.ok(source.includes('./'+file+'?v='+version),file+' cache revision');
 assert.ok(read('57-v15-1-battle-view.js').includes('./46-v15-living-cards.js?v='+version));
});
