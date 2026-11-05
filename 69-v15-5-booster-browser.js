/* Mashup V15.5 — compact pack browser.
 * Only server-public series metadata is used; never infer secret card identities.
 */
export function seriesPackFilters(packs=[],series=[]){
  const numbers=new Set();
  for(const pack of packs){
    if(pack?.filterMode!=='series')continue;
    for(const raw of pack.allowedSeries||[]){
      const id=Number(raw);
      if(Number.isSafeInteger(id)&&id>0)numbers.add(id);
    }
  }
  const items=[{value:'all',label:'Tous les boosters'}];
  for(const id of [...numbers].sort((a,b)=>a-b)){
    const category=series.find(x=>Number(x.number)===id);
    items.push({value:'series-'+id,label:String(category?.name||'Série '+id).slice(0,50)});
  }
  if(numbers.size)items.push({value:'other',label:'Autres boosters'});
  return items;
}
export function packsInFilter(packs=[],selection='all'){
  if(selection==='all')return packs;
  if(selection==='other')return packs.filter(p=>p?.filterMode!=='series'||!(p.allowedSeries||[]).length);
  const id=/^series-(\d{1,3})$/.exec(String(selection))?.[1];
  if(!id)return [];
  return packs.filter(p=>p?.filterMode==='series'&&(p.allowedSeries||[]).some(n=>Number(n)===Number(id)));
}
export function safePackSelection(packs,series,requested){
 const options=seriesPackFilters(packs,series);
 return options.some(x=>x.value===requested)?requested:'all';
}
