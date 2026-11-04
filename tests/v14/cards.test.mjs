import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderMashupV10Card} from '../../06-v10-cards.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rarities={common:'Commune',rare:'Rare',epic:'Épique',legendary:'Légendaire',mythic:'Mythique',ultra:'Ultra'};
const fields=[{key:'power',label:'Puissance'},{key:'size',label:'Taille'},{key:'defense',label:'Défense'},{key:'aura',label:'Aura'},{key:'intelligence',label:'Intelligence'}];
const safeArt='data:image/png;base64,AA==';
const artEndpoint='https://lxpgdhwfxeicuofycqup.supabase.co/functions/v1/mashup-art?card=fiction&key=00000000-0000-4000-8000-000000000000';
const card=()=>({id:'fiction',name:'Nom <épreuve> "rare"',family:'Univers & amis',art:safeArt,rarity:'rare',variant:'standard',editionSeries:2,editionNumber:137,editionTotal:130,power:999,size:18,defense:2,aura:0,intelligence:73,color1:'#123456',color2:'#654321'});
const context=(overrides={})=>({esc,safeImage:uri=>typeof uri==='string'&&(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(uri)||uri===artEndpoint)?uri:'',CSSColor:(value,fallback)=>/^#[a-fA-F0-9]{6}$/.test(value||'')?value:fallback,statValue:(c,key)=>c[key],STAT_FIELDS:fields,RARITIES:rarities,rarityName:key=>rarities[key],editionText:c=>`N°${String(c.editionNumber).padStart(3,'0')}/${c.editionTotal} · S${String(c.editionSeries).padStart(2,'0')}`,onlineUser:{role:'player'},state:{owned:{fiction:1},artwork:{}},...overrides});

for(const rarity of Object.keys(rarities))for(const variant of ['standard','full_art','gold','secret']){
  test(`Contrat carte ${rarity} × ${variant} : illustration, 5 stats, édition et libellés`,()=>{
    const fixture={...card(),rarity,variant};const before=JSON.stringify(fixture);
    const html=renderMashupV10Card(fixture,{accessible:true,lazy:true},context());
    assert.match(html,new RegExp(`v14-card ${rarity} variant-${variant}`));
    assert.ok(html.includes(esc(fixture.name)));assert.ok(html.includes(esc(fixture.family)));
    assert.ok(html.includes(rarities[rarity]));assert.ok(html.includes('N°137/130 · S02'));
    assert.match(html,/<span class="v10-series-badge">S02<\/span>/);
    assert.match(html,/data-action="detail" data-id="fiction"/);assert.match(html,/role="button" tabindex="0"/);
    assert.equal((html.match(/class="v10-stat v10-stat-/g)||[]).length,5);
    const numbers=[...html.matchAll(/class="v10-stat-number">([^<]*)<\/strong>/g)].map(m=>m[1]);
    assert.deepEqual(numbers,['999','18','2','0','73']);
    for(const field of fields)assert.ok(html.includes(`aria-label="${field.label}"`));
    assert.match(html,/loading="lazy" fetchpriority="low" decoding="async"/);
    assert.ok(html.includes(`src="${safeArt}"`));assert.ok(!html.includes('<épreuve>'));
    assert.equal(html.includes('v14-ultra-secret'),rarity==='ultra'&&variant==='secret');
    assert.equal(html.includes('v14-edition-mark'),variant!=='standard');
    assert.equal((html.match(/\sid="/g)||[]).length,0,'Décor SVG sans ID collisionnable dans une grille');
    assert.ok(!html.includes('v13-prismatic'));assert.ok(!html.includes('v10-frame'));
    assert.equal(JSON.stringify(fixture),before,'Le rendu ne modifie aucune donnée carte');
  });
}

test('Carte cachée : aucune lecture de contenu, même admin, possédée et révélée',()=>{
  const fixture={id:'fiction',hidden:true};
  for(const key of ['name','family','rarity','variant','art','power'])Object.defineProperty(fixture,key,{get(){throw new Error('Fuite de '+key);}});
  const ctx=context({onlineUser:{role:'admin'},safeImage(){throw new Error('Illustration lue');}});
  const html=renderMashupV10Card(fixture,{accessible:true,revealedOpponent:true},ctx);
  assert.match(html,/v14-unknown/);assert.match(html,/role="img"/);
  assert.ok(!html.includes('data-id'));assert.ok(!html.includes('fiction'));assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('v14-card'));assert.ok(!html.includes('v10-stat'));
});

test('Carte secrète non possédée : aucune identité ni illustration dans le HTML',()=>{
  const fixture={...card(),variant:'secret',rarity:'ultra',name:'SECRET_SENTINEL',family:'FAMILY_SENTINEL'};
  const ctx=context({state:{owned:{},artwork:{}},safeImage(){throw new Error('Image privée lue');},editionText(){throw new Error('Édition privée lue');}});
  const html=renderMashupV10Card(fixture,{},ctx);
  for(const value of ['SECRET_SENTINEL','FAMILY_SENTINEL','fiction','ultra','secret',safeArt])assert.ok(!html.includes(value));
  assert.match(html,/CARTE INCONNUE/);
});

test('Révélation explicite combat/booster et rôle admin conservent le contrat existant',()=>{
  const ctx=context({state:{owned:{}}});
  assert.match(renderMashupV10Card(card(),{revealedOpponent:true},ctx),/v14-card/);
  assert.match(renderMashupV10Card(card(),{},context({...ctx,onlineUser:{role:'admin'}})),/v14-card/);
  assert.match(renderMashupV10Card(card(),{},ctx),/v14-unknown/);
});

test('Priorité des illustrations : aperçu > atelier > carte ; toutes passent par safeImage',()=>{
  const seen=[];const ctx=context({state:{owned:{fiction:1},artwork:{fiction:artEndpoint}},safeImage:uri=>{seen.push(uri);return uri===safeArt||uri===artEndpoint?uri:'';}});
  assert.ok(renderMashupV10Card(card(),{},ctx).includes(esc(artEndpoint)));
  assert.ok(renderMashupV10Card(card(),{image:safeArt},ctx).includes(safeArt));
  assert.deepEqual(seen,[artEndpoint,safeArt]);
  const html=renderMashupV10Card({...card(),art:'javascript:alert(1)'},{image:'https://attacker.invalid/image'},ctx);
  assert.ok(!html.includes('<img'));assert.ok(!html.includes('attacker.invalid'));assert.ok(!html.includes('javascript:'));
});

test('Atelier : valeurs actualisées au prochain rendu et échappement des attributs',()=>{
  const fixture=card();const ctx=context();
  fixture.name='Nouvelle "image" <script>';fixture.power=21;fixture.art=artEndpoint;
  const html=renderMashupV10Card(fixture,{accessible:true},ctx);
  assert.ok(html.includes('Nouvelle &quot;image&quot; &lt;script&gt;'));
  assert.ok(html.includes('<strong class="v10-stat-number">21</strong>'));
  assert.ok(html.includes(esc(artEndpoint)));assert.ok(!html.includes('<script>'));
  assert.match(html,/loading="eager" decoding="async"/);
});

test('Fallbacks : contenu absent, rareté/variante invalides et art Convergence local',()=>{
  assert.match(renderMashupV10Card(null,{},context()),/Carte inconnue/);
  const html=renderMashupV10Card({...card(),rarity:'__proto__',variant:'evil',color1:'red;animation:bad'}, {},context());
  assert.match(html,/v14-card common variant-standard/);assert.match(html,/--art1:#486e69/);assert.ok(!html.includes('animation:bad'));
  const local=renderMashupV10Card({...card(),id:'s2-conv-fiction',art:''},{revealedOpponent:true},context());
  assert.match(local,/assets\/convergence-art.svg#s2-conv-fiction/);
  const malicious=renderMashupV10Card({...card(),id:'s2-conv-" onload="bad',art:''},{revealedOpponent:true},context());
  assert.ok(!malicious.includes('<use'));assert.ok(!malicious.includes('onload'));
});

test('Contrat visuel : géométrie originale, optique isolée, aucune animation autonome',()=>{
  const css=fs.readFileSync(new URL('../../37-v14-cards.css',import.meta.url),'utf8');
  assert.match(css,/aspect-ratio:300\/425/);assert.match(css,/top:20\.94%;bottom:16\.7%;left:7%;right:7%/);
  assert.match(css,/top:16\.4%;bottom:16%;left:5\.6%;right:5\.6%/);
  assert.match(css,/object-fit:cover;object-position:center;filter:none!important/);
  assert.ok(!css.includes('@keyframes'));assert.ok(!css.includes('will-change'));assert.ok(!css.includes('backdrop-filter:blur'));
  assert.match(css,/v12-offscreen/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/data-m13-quality=eco/);
  const html=renderMashupV10Card(card(),{},context());
  assert.match(html,/<div class="v10-picture"><img[^>]+><span class="v14-optics v10-foil" aria-hidden="true"><\/span><\/div>/);
});
