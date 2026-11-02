/* Mashup V10 — Fantasy Codex: dynamic, accessible trading-card renderer.
   The frame is a static SVG hosted on GitHub Pages, NOT Supabase. */
export function renderMashupV10Card(card,options={},context){
  const {esc,safeImage,CSSColor,statValue,STAT_FIELDS,RARITIES,rarityName,cardRarityLabel,editionText,onlineUser,state}=context;
  if(!card)return '<div class="card-empty">Carte inconnue</div>';
  const owned=Number(state?.owned?.[card.id])||0;
  if(card.hidden||(onlineUser?.role!=='admin'&&!owned&&!options.revealedOpponent)){
    return '<div class="tcg-card locked-card v10-unknown" '+(options.accessible?'role="img" aria-label="Carte mystère non découverte"':'')+'><div class="locked-inner"><span class="locked-decoration">✧</span><span class="locked-mark">?</span><small>CARTE INCONNUE</small></div></div>';
  }
  const rarity=Object.prototype.hasOwnProperty.call(RARITIES,card.rarity)?card.rarity:'common';
  const variant=['full_art','gold','secret'].includes(card.variant)?card.variant:'standard';
  const isSecret=variant==='secret';
  const isGold=variant==='gold';
  const src=safeImage(options.image??state?.artwork?.[card.id]??card.art);
  const loading=options.lazy?'loading="lazy" fetchpriority="low" decoding="async"':'loading="eager" decoding="async"';
  const safeName=esc(card.name||'Carte Mashup');
  const statIcons=['⚔','↕','⬡','✧','◇'];
  const stats=STAT_FIELDS.map((field,i)=>{
    const number=statValue(card,field.key);
    return '<div class="v10-stat v10-stat-'+i+'"><span class="v10-stat-label" title="'+esc(field.label)+'">'+statIcons[i]+' <span class="v10-stat-long">'+esc(field.label)+'</span><span class="v10-stat-short">'+esc(field.short)+'</span></span><strong class="v10-stat-number">'+esc(number)+'</strong></div>';
  }).join('');
  const image=src
    ?'<img class="v10-picture-img" '+loading+' src="'+esc(src)+'" alt="Illustration de '+safeName+'">'
    :'<span class="v10-picture-symbol" aria-hidden="true">'+esc(card.icon||'✦')+'</span>';
  const series=Math.max(1,Math.floor(Number(card.editionSeries)||1));
  const shortSeries='S'+String(series).padStart(2,'0');
  const info=card.ability||'Carte du multivers';
  const description=card.desc||card.subtitle||'Une nouvelle histoire dans le multivers.';
  const variantLabel=variant==='full_art'?'FULL ART':isGold?'GOLD':isSecret?'SECRÈTE':'';
  const elementRole=options.accessible?'role="button" tabindex="0" aria-label="Voir '+safeName+'" data-action="detail" data-id="'+esc(card.id)+'"':'';
  return '<div class="tcg-card v10-tcg '+rarity+' variant-'+variant+'" '+elementRole+' style="--art1:'+CSSColor(card.color1,'#486e69')+';--art2:'+CSSColor(card.color2,'#162d38')+'">'+
    '<div class="v10-picture">'+image+'</div>'+
    '<img class="v10-frame" src="./assets/v10-card-frame.svg" loading="eager" decoding="async" alt="" aria-hidden="true">'+
    '<div class="v10-rarity">'+esc(rarityName(rarity))+(variantLabel?' <small>✦ '+variantLabel+'</small>':'')+'</div>'+
    '<div class="v10-name" title="'+safeName+'">'+safeName+'</div>'+
    '<div class="v10-universe" title="'+esc(card.family||'Original')+'">'+esc(card.family||'Original')+'</div>'+
    '<div class="v10-ability-title" title="'+esc(info)+'">'+esc(info)+'</div>'+
    '<div class="v10-ability-description" title="'+esc(description)+'">'+esc(description)+'</div>'+
    '<div class="v10-stats">'+stats+'</div>'+
    '<div class="v10-series"><span class="v10-serial">'+esc(editionText(card))+'</span><span class="v10-series-badge">'+esc(shortSeries)+'</span></div>'+
    '<span class="v10-foil" aria-hidden="true"></span>'+
    '</div>';
}
