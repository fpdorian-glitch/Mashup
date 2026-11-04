/* Mashup V14 — physical collector materials, retaining the V10 public contract.
 * Static finishes in grids; optical coordinates come from inspection alone.
 * This renderer never mutates game state or performs network requests.
 */
export function renderMashupV10Card(card,options={},context){
  const {esc,safeImage,CSSColor,statValue,STAT_FIELDS,RARITIES,rarityName,editionText,onlineUser,state}=context;
  if(!card)return '<div class="card-empty">Carte inconnue</div>';
  const owned=Number(state?.owned?.[card.id])||0;
  // Privacy is checked before illustration, names, metadata or stats are read.
  // revealedOpponent is the existing explicit battle/booster reveal contract.
  if(card.hidden||(onlineUser?.role!=='admin'&&!owned&&!options.revealedOpponent)){
    return '<div class="tcg-card locked-card v10-unknown v14-unknown" '+(options.accessible?'role="img" aria-label="Carte mystère non découverte"':'')+'><span class="v14-back-rule" aria-hidden="true"></span><div class="locked-inner"><span class="locked-decoration" aria-hidden="true">◇</span><span class="locked-mark" aria-hidden="true">M</span><small>CARTE INCONNUE</small></div></div>';
  }
  const rarity=Object.prototype.hasOwnProperty.call(RARITIES,card.rarity)?card.rarity:'common';
  const variant=['full_art','gold','secret'].includes(card.variant)?card.variant:'standard';
  const ultraSecret=rarity==='ultra'&&variant==='secret';
  const special=variant!=='standard';
  const imageUrl=safeImage(options.image??state?.artwork?.[card.id]??card.art);
  const safeName=esc(card.name||'Carte Mashup');
  const serial=esc(editionText(card));
  const family=esc(card.family||'Original');
  const series='S'+String(Math.max(1,Math.floor(Number(card.editionSeries)||1))).padStart(2,'0');
  const loading=options.lazy?'loading="lazy" fetchpriority="low" decoding="async"':'loading="eager" decoding="async"';
  const localConvergenceArt=/^s2-conv-[a-z0-9-]+$/.test(String(card.id||''))&&!imageUrl;
  const picture=imageUrl?'<img class="v10-picture-img" '+loading+' src="'+esc(imageUrl)+'" alt="Illustration de '+safeName+'">'
    :localConvergenceArt?'<svg class="v10-convergence-art" viewBox="0 0 240 300" role="img" aria-label="Concept graphique de '+safeName+'"><use href="./assets/convergence-art.svg#'+esc(card.id)+'"></use></svg>'
    :'<span class="v10-picture-symbol" aria-hidden="true">'+esc(card.icon||'✦')+'</span>';
  const statLetters=['P','T','D','A','I'];
  const statExpanded=['Puissance','Taille','Défense','Aura','Intell.'];
  const stats=STAT_FIELDS.map((field,i)=>{
    const number=statValue(card,field.key);
    return '<div class="v10-stat v10-stat-'+i+'" title="'+esc(field.label)+' : '+esc(number)+'"><span class="v10-stat-label" aria-label="'+esc(field.label)+'"><span class="v10-stat-initial" aria-hidden="true">'+(statLetters[i]||esc(field.label))+'</span><span class="v10-stat-expanded" aria-hidden="true">'+(statExpanded[i]||esc(field.label))+'</span></span><strong class="v10-stat-number">'+esc(number)+'</strong></div>';
  }).join('');
  const variantName=variant==='full_art'?'FULL ART':variant==='gold'?'ÉDITION OR':ultraSecret?'ULTRA SECRÈTE':variant==='secret'?'SECRÈTE':'';
  const rank=({common:1,rare:2,epic:3,legendary:4,mythic:5,ultra:6})[rarity]||1;
  const rankMarks=Array.from({length:rank},(_,i)=>{const x=30-(rank-1)*4+i*8;return 'M'+x+' 2l3 4-3 4-3-4Z';}).join(' ');
  const className='tcg-card v10-tcg v101-card v14-card '+rarity+' variant-'+variant+(special?' v101-special':' v101-standard')+(ultraSecret?' v14-ultra-secret':'');
  const interactive=options.accessible?'role="button" tabindex="0" aria-label="Voir '+safeName+'" data-action="detail" data-id="'+esc(card.id)+'"':'';
  // Inline geometry has no duplicate IDs, filter pipelines or external frames.
  const windowPath=variant==='gold'?'M28 70H272L284 82V346L272 358H28L16 346V82Z':'M31 87H269L280 98V344L269 355H31L20 344V98Z';
  const frame='<svg class="v14-engraving" viewBox="0 0 300 425" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linejoin="miter"><path class="v14-outer-rule" d="M24 7H276L293 24V401L276 418H24L7 401V24Z"/><path class="v14-inner-rule" d="M25 12H275L288 25V400L275 413H25L12 400V25Z"/><path class="v14-window-rule" d="'+windowPath+'"/><path class="v14-corners" d="M16 47V26L26 16H64M236 16H274L284 26V47M16 378V399L26 409H64M236 409H274L284 399V378"/><path class="v14-separator" d="M30 76H118L125 79H175L182 76H270M30 362H270"/><path class="v14-secret-line" d="M17 123C17 52 78 21 150 21S283 52 283 123M17 301C17 372 78 404 150 404S283 372 283 301M24 123C24 58 81 30 150 30S276 58 276 123M24 301C24 366 81 395 150 395S276 366 276 301"/></g><path class="v14-corner-inlays" fill="currentColor" d="M10 28L28 10H50L31 16 16 31 10 50ZM250 10H272L290 28V50L284 31 269 16ZM10 375L16 394 31 409 50 415H28L10 397ZM290 375V397L272 415H250L269 409 284 394Z"/><path class="v14-crown" fill="currentColor" d="M150 17l5 8-5 8-5-8Zm-12 5 4 3-4 3-4-3Zm24 0 4 3-4 3-4-3Z"/></svg>';
  return '<div class="'+className+'" '+interactive+' style="--art1:'+CSSColor(card.color1,'#486e69')+';--art2:'+CSSColor(card.color2,'#162d38')+'">'+
    '<span class="v14-stock" aria-hidden="true"></span>'+
    '<div class="v10-picture">'+picture+'<span class="v14-optics v10-foil" aria-hidden="true"></span></div>'+
    '<span class="v14-caption-shade" aria-hidden="true"></span>'+frame+
    '<div class="v10-rarity"><svg class="v14-rank" viewBox="0 0 60 12" aria-hidden="true"><path d="'+rankMarks+'" fill="currentColor"/></svg><span>'+esc(rarityName(rarity))+'</span></div>'+
    '<div class="v10-name" title="'+safeName+'">'+safeName+'</div>'+
    '<div class="v10-universe" title="'+family+'">'+family+'</div>'+
    (variantName?'<div class="v14-edition-mark">'+variantName+'</div>':'')+
    '<div class="v10-stats">'+stats+'</div>'+
    '<div class="v10-series"><span class="v10-serial">'+serial+'</span><span class="v10-series-badge">'+esc(series)+'</span></div>'+
    '<span class="v14-edge" aria-hidden="true"></span></div>';
}
