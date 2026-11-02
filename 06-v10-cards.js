/* Mashup V10.1 — collector frames, no lore on cards.
 * Fully dynamic card data; the 5 stats, numbering and illustrations are unchanged.
 * Three variants each get their OWN composition, rather than recolouring one frame.
 */
export function renderMashupV10Card(card,options={},context){
  const {esc,safeImage,CSSColor,statValue,STAT_FIELDS,RARITIES,rarityName,editionText,onlineUser,state}=context;
  if(!card)return '<div class="card-empty">Carte inconnue</div>';
  const owned=Number(state?.owned?.[card.id])||0;
  if(card.hidden||(onlineUser?.role!=='admin'&&!owned&&!options.revealedOpponent)){
    return '<div class="tcg-card locked-card v10-unknown" '+(options.accessible?'role="img" aria-label="Carte mystère non découverte"':'')+'><div class="locked-inner"><span class="locked-decoration">✧</span><span class="locked-mark">?</span><small>CARTE INCONNUE</small></div></div>';
  }
  const rarity=Object.prototype.hasOwnProperty.call(RARITIES,card.rarity)?card.rarity:'common';
  const variant=['full_art','gold','secret'].includes(card.variant)?card.variant:'standard';
  const special=variant!=='standard';
  const imageUrl=safeImage(options.image??state?.artwork?.[card.id]??card.art);
  const safeName=esc(card.name||'Carte Mashup');
  const serial=esc(editionText(card));
  const family=esc(card.family||'Original');
  const series='S'+String(Math.max(1,Math.floor(Number(card.editionSeries)||1))).padStart(2,'0');
  const loading=options.lazy?'loading="lazy" fetchpriority="low" decoding="async"':'loading="eager" decoding="async"';
  const picture=imageUrl?'<img class="v10-picture-img" '+loading+' src="'+esc(imageUrl)+'" alt="Illustration de '+safeName+'">'
    :'<span class="v10-picture-symbol" aria-hidden="true">'+esc(card.icon||'✦')+'</span>';
  // Une seule lettre par statistique : lisible même en combat sur écran étroit.
  const statLetters=['P','T','D','A','I'];
  const stats=STAT_FIELDS.map((field,i)=>{
    const number=statValue(card,field.key);
    return '<div class="v10-stat v10-stat-'+i+'" title="'+esc(field.label)+' : '+esc(number)+'"><span class="v10-stat-label" aria-label="'+esc(field.label)+'">'+statLetters[i]+'</span><strong class="v10-stat-number">'+esc(number)+'</strong></div>';
  }).join('');
  const variantName=variant==='full_art'?'FULL ART':variant==='gold'?'GOLD':variant==='secret'?'SECRÈTE':'';
  const className='tcg-card v10-tcg v101-card '+rarity+' variant-'+variant+(special?' v101-special':' v101-standard');
  const interactive=options.accessible?'role="button" tabindex="0" aria-label="Voir '+safeName+'" data-action="detail" data-id="'+esc(card.id)+'"':'';
  // Static decorative accents only, rendered locally: no further Supabase request.
  const secretArcs=variant==='secret'?'<svg class="v101-arc-ornament" aria-hidden="true" viewBox="0 0 300 425" preserveAspectRatio="none"><defs><linearGradient id="v101-arc-gradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8dffd2"/><stop offset=".48" stop-color="#37c9a6"/><stop offset="1" stop-color="#e4ffb8"/></linearGradient></defs><g fill="none" stroke="url(#v101-arc-gradient)" stroke-linecap="round"><path d="M16 125C11 65 78 12 159 14C242 16 291 84 284 167" stroke-width="2.8"/><path d="M9 196C21 91 93 38 180 46C262 54 296 142 279 236" stroke-width="1.5" opacity=".66"/><path d="M24 315C-2 220 48 131 118 110" stroke-width="1.4" opacity=".7"/><path d="M285 279C285 355 235 402 157 415C87 426 34 388 16 352" stroke-width="2.6"/><path d="M277 317C257 391 178 404 118 389" stroke-width="1.1" opacity=".72"/></g><g fill="#bdffe5"><path d="M28 88l4 11 10 4-10 4-4 11-4-11-10-4 10-4Z"/><path d="M271 308l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/></g></svg>':'';
  return '<div class="'+className+'" '+interactive+' style="--art1:'+CSSColor(card.color1,'#486e69')+';--art2:'+CSSColor(card.color2,'#162d38')+'">'+
    '<div class="v10-picture">'+picture+'</div>'+
    (special?'<div class="v101-art-tint" aria-hidden="true"></div><div class="v101-special-border" aria-hidden="true"></div>'+secretArcs:
      '<img class="v10-frame" src="./assets/v10-1-card-frame.svg" loading="eager" decoding="async" alt="" aria-hidden="true">')+
    '<div class="v10-rarity">'+esc(rarityName(rarity))+(variantName?' <small>'+variantName+'</small>':'')+'</div>'+
    '<div class="v10-name" title="'+safeName+'">'+safeName+'</div>'+
    '<div class="v10-universe" title="'+family+'">'+family+'</div>'+
    '<div class="v10-stats">'+stats+'</div>'+
    '<div class="v10-series"><span class="v10-serial">'+serial+'</span><span class="v10-series-badge">'+esc(series)+'</span></div>'+
    '<span class="v10-special-detail" aria-hidden="true"></span><span class="v10-foil" aria-hidden="true"></span>'+
    '</div>';
}
