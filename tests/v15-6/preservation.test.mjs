import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const root=new URL('../../',import.meta.url);
test('V15.6 retains V15.5.1 rules, campaign, wallets, catalogue, illustrations and recovery byte for byte',()=>{
 const guarded=['backend','content','assets','06-v10-cards.js','27-v11-3-image-studio.js','62-v15-4-match-engine.js','63-v15-4-match-levels.js','62-pack-recovery.js','04-games-ui.js','66-v15-4-casino-clock.js','18-v10-8-collection.js','20-market-v10-9.js','22-v11-economy-ui.js','35-mobile-premium.js'];
 assert.equal(execFileSync('git',['diff','--name-only','15968dc','--',...guarded],{cwd:root,encoding:'utf8'}),'');
 assert.equal(fs.existsSync(new URL('backend/match-social-service.mjs',root)),false);
});
test('Published metadata and all new browser resources match V15.6',()=>{
 const read=file=>fs.readFileSync(new URL(file,root),'utf8'),html=read('index.html'),version=JSON.parse(read('version.json'));
 assert.equal(version.version,'16.1.0');assert.equal(version.status,'development');assert.equal(version.publishedAt,undefined);
 assert.equal(JSON.parse(read('manifest.webmanifest')).version,version.version);
 for(const file of ['72-v15-6-match-motion.css','74-v15-6-match-social.css','76-v15-6-match-presentation.css'])assert.ok(html.includes('./'+file+'?v=16.1.0'));
 const ui=read('64-v15-4-match-ui.js');for(const file of ['71-v15-6-match-gesture.js','73-v15-6-match-social.js','75-v15-6-match-presentation.js'])assert.ok(ui.includes('./'+file+'?v=16.1.0'));
 assert.match(read('.github/workflows/frontend-tests.yml'),/tests\/v15-6\/\*\.test\.mjs/);
});
