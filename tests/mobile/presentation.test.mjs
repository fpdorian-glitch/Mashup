import test from 'node:test';
import assert from 'node:assert/strict';
import {homeMarkup,resolveQuality,icon} from '../../35-mobile-premium.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const make=()=>({esc,cards:[{id:'unowned',rarity:'ultra'},{id:'hidden',hidden:true},{id:'archived',archived:true},{id:'owned',rarity:'rare'}],packs:[{id:'fiction'}],state:{owned:{hidden:1,archived:1,owned:1},opened:12,wins:2},user:{pseudo:'<script>fiction</script>'},owned:1,total:12,renderCard:c=>`<div data-fiction-id="${c.id}"></div>`});
test('Hero ne révèle que les cartes possédées, visibles et non archivées',()=>{
 const html=homeMarkup(make());assert.ok(html.includes('data-fiction-id="owned"'));for(const id of ['hidden','archived','unowned'])assert.ok(!html.includes(`data-fiction-id="${id}"`));assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);
});
test('Hero vide reste utilisable sans carte ni booster, sans NaN',()=>{
 const html=homeMarkup({...make(),cards:[],packs:[],state:{},total:0});assert.match(html,/m13-card-back/);assert.ok(!html.includes('NaN'));assert.ok(!html.includes('data-action="open-pack"'));
});
test('Réduction des animations prioritaire sur la qualité spectaculaire',()=>{assert.equal(resolveQuality('high',{reduced:true}),'eco');});
test('Qualité adaptative choisit autonomie pour CPU, mémoire ou économie données',()=>{
 for(const flags of [{cores:4},{memory:2},{saveData:true}])assert.equal(resolveQuality('auto',flags),'eco');assert.equal(resolveQuality('auto',{cores:8,memory:8}),'high');assert.equal(resolveQuality('eco',{}),'eco');assert.equal(resolveQuality('high',{cores:2}),'high');
});
test('Icônes inconnues utilisent un motif statique sûr',()=>{assert.ok(!icon('<script>').includes('<script>'));assert.match(icon('home'),/<svg/);});

test('API principale : réponse d’un ancien compte rejetée avant application',async()=>{
 const {default:fs}=await import('node:fs');const {default:vm}=await import('node:vm');
 const source=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 const start=source.indexOf('async function api(path,data){'),end=source.indexOf('// V12: serialize',start);
 let resolve;const response=new Promise(r=>resolve=r);
 const ctx=vm.createContext({onlineUser:{id:'fiction-a'},sessionEpoch:0,mashupAuth:{auth:{getSession:async()=>({data:{session:{access_token:'fiction-only'}}})}},fetch:()=>response});
 vm.runInContext(source.slice(start,end),ctx);
 const request=ctx.api('/api/bootstrap');await Promise.resolve();ctx.onlineUser={id:'fiction-b'};
 resolve({ok:true,json:async()=>({state:{coins:999}})});
 await assert.rejects(request,/session a changé/);
});

test('Version de distribution cohérente entre manifeste de version, HTML et updater',async()=>{
 const {default:fs}=await import('node:fs');const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
 const version=JSON.parse(read('version.json')).version;assert.equal(version,'15.2.0');
 assert.ok(read('index.html').includes(`name="mashup-version" content="${version}"`));assert.ok(read('09-mashup-updates.js').includes(`CURRENT_VERSION='${version}'`));
 const manifest=JSON.parse(read('manifest.webmanifest'));assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
 for(const icon of manifest.icons)assert.ok(fs.existsSync(new URL('../../'+icon.src,import.meta.url)));
});
