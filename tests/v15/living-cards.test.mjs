import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderMashupV10Card} from '../../06-v10-cards.js';
import {inspectionObjectMarkup,physicalLightingForTilt,physicalMaterialFor} from '../../46-v15-living-cards.js';

const rarities=['common','rare','epic','legendary','mythic','ultra'];
const variants=['standard','full_art','gold','secret'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const card={id:'v15-fiction',name:'Fiction <Iris>',family:'Monde fictif',art:'data:image/png;base64,AA==',rarity:'ultra',variant:'secret',power:901,size:19,defense:8,aura:0,intelligence:76};
const context={esc,safeImage:value=>value===card.art?value:'',CSSColor:(_value,fallback)=>fallback,statValue:(c,key)=>c[key],STAT_FIELDS:['power','size','defense','aura','intelligence'].map(key=>({key,label:key})),RARITIES:Object.fromEntries(rarities.map(r=>[r,r])),rarityName:value=>value,editionText:()=> 'N°001/001 · S01',onlineUser:{role:'player'},state:{owned:{'v15-fiction':1},artwork:{}}};

test('V15 — les 24 matières protègent illustration, statistique et contrat public de la face',()=>{
  for(const rarity of rarities)for(const variant of variants){
    const fixture={...card,rarity,variant};
    const before=JSON.stringify(fixture);
    const front=renderMashupV10Card(fixture,{accessible:true},context);
    const html=inspectionObjectMarkup(front,fixture);
    assert.ok(html.includes('<div class="inspect-face inspect-front">'+front+'</div>'),'Face existante réutilisée intégralement');
    assert.equal(html.split(front).length,2,'Une seule copie de chaque illustration et statistique');
    assert.match(html,new RegExp('data-v15-material="'+rarity+'-'+variant+'"'));
    assert.equal((html.match(/class="v10-stat v10-stat-/g)||[]).length,5);
    assert.equal((html.match(/class="v10-stat-number"/g)||[]).length,5);
    assert.equal((html.match(/class="v15-object-edge /g)||[]).length,4);
    assert.equal((html.match(/class="inspect-face v15-object-back"/g)||[]).length,1);
    assert.equal((html.match(/\sid="/g)||[]).length,0,'Aucun ID SVG collisionnable');
    assert.equal(JSON.stringify(fixture),before);
  }
});

test('V15 — épaisseur progressive et formats distincts, sans coordonnées de catalogue',()=>{
  for(const variant of variants){
    const materials=rarities.map(r=>physicalMaterialFor(r,variant));
    for(let i=1;i<materials.length;i++)assert.ok(materials[i].depth>materials[i-1].depth);
    for(const profile of materials){assert.ok(profile.depth>=1.4&&profile.depth<=4.4);assert.ok(Object.isFrozen(profile));}
  }
  assert.ok(physicalMaterialFor('ultra','secret').depth>physicalMaterialFor('ultra','standard').depth);
  assert.notEqual(physicalMaterialFor('rare','full_art').relief,physicalMaterialFor('rare','gold').relief);
  assert.deepEqual(physicalMaterialFor('__proto__','" onload="bad'),physicalMaterialFor('common','standard'));
  const html=inspectionObjectMarkup(renderMashupV10Card(card,{},context),{rarity:'evil',variant:'" onclick="bad'});
  assert.ok(!html.includes('onclick='));assert.match(html,/data-v15-material="common-standard"/);
});

test('V15 — le dos est strictement générique, sans illustration, nom ou numéro',()=>{
  const reverse=[];
  for(const rarity of rarities)for(const variant of variants){
    const html=inspectionObjectMarkup(renderMashupV10Card({...card,rarity,variant},{},context),{rarity,variant});
    const back=html.match(/<div class="inspect-face v15-object-back"[\s\S]*?<\/div>/)?.[0];
    assert.ok(back);reverse.push(back);
    for(const secret of [card.id,card.name,card.family,card.art,'N°001',rarity,variant])assert.ok(!back.includes(secret));
    assert.match(back,/aria-hidden="true"/);assert.ok(!back.includes('<img'));
  }
  assert.equal(new Set(reverse).size,1);
});

test('V15 — carte inconnue : aucun accès matière ou contenu privé, même si le shell est appelé',()=>{
  const fixture={id:'v15-fiction',hidden:true};
  for(const key of ['name','rarity','variant','art','power'])Object.defineProperty(fixture,key,{get(){throw new Error('Fuite privée '+key);}});
  const front=renderMashupV10Card(fixture,{accessible:true,revealedOpponent:true},context);
  const html=inspectionObjectMarkup(front,fixture);
  assert.match(html,/v14-unknown/);assert.ok(!html.includes('data-v15-material'));assert.ok(!html.includes('v15-card-object'));
  assert.ok(!html.includes(card.id));assert.ok(!html.includes(card.art));assert.ok(!html.includes('v15-object-edge'));
  const unowned=renderMashupV10Card(card,{}, {...context,state:{owned:{}}});
  assert.ok(!inspectionObjectMarkup(unowned,{rarity:'ultra',variant:'secret'}).includes('ultra'));
});

test('V15 — lumière finie, bornée et réactive à une inclinaison réelle',()=>{
  const baseline=physicalLightingForTilt(0,0);
  assert.notDeepEqual(physicalLightingForTilt(10,18),baseline);
  assert.notDeepEqual(physicalLightingForTilt(-10,-18),physicalLightingForTilt(10,18));
  for(const rx of [NaN,Infinity,-Infinity,0,-999,999])for(const ry of [NaN,Infinity,-999,999,0]){
    const values=physicalLightingForTilt(rx,ry);
    assert.match(values['--v15-light-angle'],/^-?\d+\.\d{3}deg$/);
    const strength=Number(values['--v15-rim-strength']);
    assert.ok(Number.isFinite(strength)&&strength>=.24&&strength<=.9);
  }
  assert.deepEqual(physicalLightingForTilt(999,999),physicalLightingForTilt(35,50));
  assert.equal(JSON.stringify(baseline),JSON.stringify(physicalLightingForTilt()),'Aucune horloge ou animation autonome');
});

test('V15 — le shell ne masque pas les variables de lumière héritées du contrôleur',()=>{
  const css=fs.readFileSync(new URL('../../45-v15-living-cards.css',import.meta.url),'utf8');
  const shellRule=css.match(/(?:^|\})\s*\.v15-card-object\s*\{([^}]*)\}/);
  assert.ok(shellRule,'Règle du shell physique présente');
  const front=renderMashupV10Card(card,{},context);
  const inlineShellStyle=inspectionObjectMarkup(front,card).match(/class="v15-card-object"[^>]*style="([^"]*)"/)?.[1];
  for(const key of Object.keys(physicalLightingForTilt())){
    const declaration=new RegExp(key+'\\s*:');
    assert.doesNotMatch(shellRule[1],declaration,'Les defaults locaux annuleraient les coordonnées écrites sur .inspect-tilter');
    assert.doesNotMatch(inlineShellStyle||'',declaration,'Le profil ne doit pas figer la lumière du parent');
  }
  assert.match(css,/linear-gradient\(var\(--v15-light-angle,\s*145deg\)/,'Fallback au point de consommation');
  assert.match(css,/opacity:var\(--v15-rim-strength,\s*\.78\)/,'Énergie reçue du contrôleur avec fallback');
});

test('V15 — profil mobile allégé et mouvement réduit sans animation autonome ni filtre coûteux',()=>{
  const css=fs.readFileSync(new URL('../../45-v15-living-cards.css',import.meta.url),'utf8');
  const js=fs.readFileSync(new URL('../../46-v15-living-cards.js',import.meta.url),'utf8');
  assert.ok(css.includes('data-m13-quality=eco'));assert.ok(css.includes('prefers-reduced-motion:reduce'));
  assert.ok(css.includes('--v15-card-depth:0px!important'));assert.ok(css.includes('transform-style:flat'));
  assert.ok(css.includes('.v15-card-object>.inspect-front .v10-stats'));
  assert.ok(!css.includes('@keyframes'));assert.ok(!css.includes('will-change'));assert.ok(!css.includes('filter:blur'));
  for(const call of ['fetch(','setInterval(','requestAnimationFrame(','localStorage','supabase'])assert.ok(!js.includes(call));
  assert.ok(!css.includes('.v10-picture-img{'),'Aucune modification du crop ou de l’illustration');
});
