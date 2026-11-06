import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const updater=readFileSync(new URL('../../09-mashup-updates.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../../manifest.webmanifest',import.meta.url),'utf8'));
const version=JSON.parse(readFileSync(new URL('../../version.json',import.meta.url),'utf8'));
test('invitation polling uses exclusive active and passive modes',()=>{
 assert.ok(html.includes("const activeInvitations=()=>view==='online'||(view==='arena'&&arenaSection==='online');"));
 assert.ok(html.includes("onlineUser&&!activeInvitations())pollInvitations();},90000"));
 assert.ok(html.includes("onlineUser&&activeInvitations())pollInvitations();},30000"));
 assert.ok(!html.includes("onlineUser)pollInvitations();},45000"));
});
test('published release markers align',()=>{
 assert.equal(manifest.version,version.version);
 assert.ok(html.includes('name="mashup-version" content="'+version.version+'"'));
 assert.ok(updater.includes("const CURRENT_VERSION='"+version.version+"';"));
});
