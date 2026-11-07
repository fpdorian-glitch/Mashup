/* V15.7.2 catalogue adapter: no request, storage or inventory write. */
const KEYS=['common','rare','epic','legendary','mythic','ultra'];
export function rarityProgress(catalogue,number,owned={},series=[],role='player'){
 const selected=series.find(s=>Number(s.number)===Number(number));
 if(role!=='admin'&&selected?.visible===false)return null;
 const metrics=catalogue.metrics(number,owned),seen=new Set(),obtained=Object.fromEntries(KEYS.map(k=>[k,0]));
 for(const card of metrics.cards||[]){
  if(!card||card.variant==='secret'||card.hidden||seen.has(card.id)||!KEYS.includes(card.rarity))continue;
  seen.add(card.id);const qty=owned&&Object.hasOwn(owned,card.id)?Number(owned[card.id]):0;
  if(Number.isSafeInteger(qty)&&qty>0)obtained[card.rarity]++;
 }
 return KEYS.map(key=>({key,owned:obtained[key],total:Number.isSafeInteger(metrics.byRarity?.[key])?metrics.byRarity[key]:0})).filter(row=>row.total>0);
}
export function rarityProgressMarkup(rows,rarities,esc){
 if(!rows?.length)return '';
 return '<div class="s161-rarity-grid" aria-label="Progression par rareté">'+rows.map(row=>'<div class="s161-rarity s161-rarity-'+row.key+'"><span>'+esc(rarities[row.key]?.label||row.key)+'</span><strong>'+row.owned+'<small> / '+row.total+'</small></strong><span class="s161-rarity-track" role="progressbar" aria-label="'+esc(rarities[row.key]?.label||row.key)+'" aria-valuenow="'+row.owned+'" aria-valuemin="0" aria-valuemax="'+row.total+'"><i style="width:'+Math.min(100,100*row.owned/row.total)+'%"></i></span></div>').join('')+'</div>';
}

/** Exclude private-series payloads defensively; never change the admin catalogue. */
export function publicCatalogueProjection(cards,metadata,series,user){
 if(user?.role==='admin')return{cards,metadata};
 const allowed=new Set((series||[]).filter(s=>s.visible!==false).map(s=>Number(s.number))),number=c=>Number(c?.editionSeries??c?.series??1);
 const result=(Array.isArray(cards)?cards:[]).filter(c=>allowed.has(number(c)));
 if(!metadata||metadata.version!==1)return{cards:result,metadata:null};
 const seriesTotals=Object.fromEntries(Object.entries(metadata.seriesTotals||{}).filter(([n])=>allowed.has(Number(n))));
 const displayById=Object.fromEntries(Object.entries(metadata.displayById||{}).filter(([,e])=>allowed.has(Number(e.series))));
 let hash=2166136261;const source=JSON.stringify([seriesTotals,displayById]);for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return{cards:result,metadata:{version:1,revision:'normal-'+(hash>>>0).toString(16),seriesTotals,displayById}};
}
