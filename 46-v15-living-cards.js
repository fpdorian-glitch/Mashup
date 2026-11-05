/* V15 — a physical shell around the existing, authorized card renderer.
 * No catalogue access, network, timers or game-state writes. Pass only HTML
 * produced by renderMashupV10Card, never arbitrary user-supplied HTML.
 */
const RARITIES=Object.freeze(['common','rare','epic','legendary','mythic','ultra']);
const VARIANTS=Object.freeze(['standard','full_art','gold','secret']);
const DEPTH=Object.freeze([1.4,1.8,2.2,2.7,3.2,3.8]);
const VARIANT_DEPTH=Object.freeze({standard:0,full_art:.15,gold:.45,secret:.6});
const SURFACE=Object.freeze(['cotton','brushed','amethyst','bullion','obsidian','chrome']);
const ROUGHNESS=Object.freeze([.84,.64,.46,.29,.23,.17]);
const METALLIC=Object.freeze([.08,.38,.51,.85,.89,.97]);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;

/** Presentation values only; unknown material values always become common. */
export function physicalMaterialFor(rarity='common',variant='standard'){
  const rank=RARITIES.indexOf(rarity);
  const level=Math.max(0,rank);
  const safeRarity=rank<0?'common':rarity;
  const safeVariant=VARIANTS.includes(variant)?variant:'standard';
  const roughness=safeVariant==='gold'?.19:safeVariant==='secret'?.15:safeVariant==='full_art'?Math.min(.9,ROUGHNESS[level]+.14):ROUGHNESS[level];
  return Object.freeze({
    rarity:safeRarity,variant:safeVariant,key:safeRarity+'-'+safeVariant,
    depth:Number((DEPTH[level]+VARIANT_DEPTH[safeVariant]).toFixed(2)),
    relief:safeVariant==='full_art'?.55:safeVariant==='gold'?1.15:safeVariant==='secret'?1.3:.85,
    surface:safeVariant==='gold'?'etched-gold':safeVariant==='secret'?'emerald':safeVariant==='full_art'?'art-silk':SURFACE[level],
    roughness,metallic:safeVariant==='gold'?.96:safeVariant==='secret'?.83:METALLIC[level],
    // A rough surface spreads one highlight; a polished surface keeps it narrow.
    lobeWidth:Math.round(19+roughness*43)
  });
}

/** A fixed light reflected by the tilted surface, with bounded highlights.
 * Call only from the existing input-driven inspection animation frame.
 */
export function physicalLightingForTilt(rx=0,ry=0){
  const pitch=clamp(finite(rx),-35,35)*Math.PI/180;
  const yaw=clamp(finite(ry),-50,50)*Math.PI/180;
  const normal=[Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
  const light=[-.316,-.421,.85];
  const incidence=normal.reduce((sum,n,i)=>sum+n*light[i],0);
  const reflection=normal.map((n,i)=>2*n*incidence-light[i]);
  const grazing=.04+.96*Math.pow(1-Math.max(0,normal[2]),5);
  return Object.freeze({
    '--v15-light-angle':(128+Math.atan2(reflection[0],reflection[1])*180/Math.PI*.45).toFixed(3)+'deg',
    '--v15-rim-strength':clamp(.24+incidence*.65,.24,.9).toFixed(3),
    '--v154-light-x':clamp(50+reflection[0]*43,8,92).toFixed(3)+'%',
    '--v154-light-y':clamp(44+reflection[1]*36,8,92).toFixed(3)+'%',
    '--v154-grazing':clamp(grazing,.04,.5).toFixed(4)
  });
}

// One neutral, identity-free reverse for every card; no serial or image URLs.
const BACK='<div class="inspect-face v15-object-back" aria-hidden="true"><span class="v15-back-border"></span><svg class="v15-back-seal" viewBox="0 0 160 200" aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M80 10 148 50v100l-68 40-68-40V50Z"/><path d="M80 21 138 56v88l-58 35-58-35V56Z"/><path d="m80 48 45 26v52l-45 26-45-26V74Z"/><path d="M80 21v27m58 8-13 18m13 70-13-18m-45 53v-27m-58-8 13-18M22 56l13 18"/></g><path fill="currentColor" d="M48 120V80h12l20 23 20-23h12v40h-12V99l-20 22-20-22v21Z"/></svg><span class="v15-back-title">MASHUP</span><span class="v15-back-subtitle">COLLECTION</span></div>';

/** Preserve the public .inspect-front .tcg-card contract. Privacy is checked
 * before material metadata is read: unknown/locked cards get no rare finish.
 */
export function inspectionObjectMarkup(frontHtml,material={}){
  const front=typeof frontHtml==='string'?frontHtml:'';
  if(!/class="[^"]*\bv14-card\b/.test(front)||/class="[^"]*\bv14-unknown\b/.test(front)){
    return '<div class="inspect-face inspect-front">'+front+'</div>';
  }
  const profile=physicalMaterialFor(material?.rarity,material?.variant);
  return '<div class="v15-card-object" data-v15-material="'+profile.key+'" data-v154-surface="'+profile.surface+'" style="--v15-card-depth:'+profile.depth+'px;--v15-relief:'+profile.relief+'px;--v154-lobe-width:'+profile.lobeWidth+'%;--v154-metallic:'+profile.metallic+'">'+
    '<div class="inspect-face inspect-front">'+front+'</div>'+BACK+
    '<span class="v15-object-edge v15-object-edge--left" aria-hidden="true"></span>'+
    '<span class="v15-object-edge v15-object-edge--right" aria-hidden="true"></span>'+
    '<span class="v15-object-edge v15-object-edge--top" aria-hidden="true"></span>'+
    '<span class="v15-object-edge v15-object-edge--bottom" aria-hidden="true"></span>'+
    '<span class="v15-object-bevel" aria-hidden="true"></span></div>';
}
