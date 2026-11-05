/* Canonical catalogue projection. No requests, persistence or inventory mutation.
 * Legacy editionNumber is an ordering key, never rewritten by this module.
 * The generated backend script must stay byte-equivalent to these functions.
 */
function catalogueValue(object,key){return object&&typeof object==='object'?Object.getOwnPropertyDescriptor(object,key)?.value:undefined;}
function catalogueSeries(card){const n=Number(catalogueValue(card,'editionSeries')??catalogueValue(card,'series')??1);return Number.isSafeInteger(n)&&n>0?n:1;}
function catalogueId(card){const id=catalogueValue(card,'id');return typeof id==='string'&&id.length>0?id:null;}
function catalogueSecret(card){return catalogueValue(card,'variant')==='secret';}
function catalogueRecords(cards){
 const index=new Map();
 for(const card of Array.isArray(cards)?cards:[]){
  const id=catalogueId(card);if(!id)continue;
  const old=index.get(id);
  // A retired duplicate must never resurrect a card through an active alias.
  if(!old||catalogueIsActive(old)&&!catalogueIsActive(card))index.set(id,card);
 }
 return Array.from(index.values());
}
export function catalogueIsActive(card){
 if(!card||typeof card!=='object')return false;
 const status=String(catalogueValue(card,'status')||'').toLowerCase();
 return catalogueValue(card,'archived')!==true&&catalogueValue(card,'is_archived')!==true&&catalogueValue(card,'removed')!==true&&catalogueValue(card,'withdrawn')!==true&&catalogueValue(card,'active')!==false&&catalogueValue(card,'is_published')!==false&&!['archived','removed','withdrawn','deleted'].includes(status);
}
export function catalogueActiveCards(cards){return catalogueRecords(cards).filter(catalogueIsActive);}
export function catalogueNormalCards(cards,number){
 const n=number===undefined?undefined:Number(number);
 return catalogueActiveCards(cards).filter(card=>{
  if(catalogueSecret(card))return false;
  // An unclassified hidden placeholder may be a Secret. No inference from it.
  if(catalogueValue(card,'hidden')===true&&!['standard','full_art','gold'].includes(catalogueValue(card,'variant')))return false;
  return n===undefined||catalogueSeries(card)===n;
 });
}
export function catalogueOwnedCopies(owned,id){
 const value=owned instanceof Map?owned.get(id):owned&&typeof owned==='object'&&!Array.isArray(owned)&&Object.hasOwn(owned,id)?owned[id]:0;
 const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:0;
}
export function catalogueSeriesMetrics(cards,number,owned={}){
 const normals=catalogueNormalCards(cards,number),byRarity={common:0,rare:0,epic:0,legendary:0,mythic:0,ultra:0};
 let obtained=0;
 for(const card of normals){
  if(catalogueOwnedCopies(owned,catalogueId(card)))obtained++;
  const rarity=catalogueValue(card,'rarity');byRarity[Object.hasOwn(byRarity,rarity)?rarity:'common']++;
 }
 const total=normals.length;
 return {total,owned:obtained,percent:total?Math.floor(100*obtained/total):0,byRarity,cards:normals};
}
export function catalogueDisplayIndex(cards){
 const active=catalogueActiveCards(cards),normals=catalogueNormalCards(cards),groups=new Map(),index=new Map();
 for(const card of normals){const series=catalogueSeries(card);if(!groups.has(series))groups.set(series,[]);groups.get(series).push(card);}
 const serial=card=>{const n=Number(catalogueValue(card,'editionNumber'));return Number.isSafeInteger(n)&&n>0?n:Infinity;};
 for(const [series,items] of groups){
  // Stable sort preserves the prior universe/rarity sequence at equal numbers.
  items.sort((a,b)=>serial(a)-serial(b));
  items.forEach((card,i)=>index.set(catalogueId(card),{number:i+1,total:items.length,series,secret:false}));
 }
 for(const card of active){
  if(!catalogueSecret(card)||catalogueValue(card,'hidden')===true)continue;
  const n=serial(card),series=catalogueSeries(card);
  index.set(catalogueId(card),{number:Number.isFinite(n)?n:null,total:groups.get(series)?.length||0,series,secret:true});
 }
 return index;
}
export function catalogueEditionText(card,index){
 const series=catalogueSeries(card),entry=index?.get?.(catalogueId(card)),suffix=' · S'+String(series).padStart(2,'0');
 const raw=Number(catalogueValue(card,'editionNumber')),historical=Number.isSafeInteger(raw)&&raw>0?raw:null;
 if(!catalogueIsActive(card))return (historical?'N°'+String(historical).padStart(3,'0')+' · ':'')+'ARCHIVE'+suffix;
 if(catalogueSecret(card))return (historical?'N°'+String(historical).padStart(3,'0')+' · ':'')+'HORS SÉRIE'+suffix;
 if(entry&&!entry.secret)return 'N°'+String(entry.number).padStart(3,'0')+'/'+entry.total+suffix;
 return 'À numéroter'+suffix;
}
export function cataloguePublicMetadata(cards,series=[]){
 const normals=catalogueNormalCards(cards),index=catalogueDisplayIndex(normals),seriesTotals=Object.create(null),displayById=Object.create(null);
 const numbers=new Set(normals.map(catalogueSeries));
 for(const item of Array.isArray(series)?series:[]){const n=Number(item?.number);if(Number.isSafeInteger(n)&&n>0)numbers.add(n);}
 for(const n of Array.from(numbers).sort((a,b)=>a-b)){
  const m=catalogueSeriesMetrics(normals,n);seriesTotals[n]={total:m.total,normalTotal:m.total,byRarity:m.byRarity};
 }
 for(const [id,entry] of index)displayById[id]={number:entry.number,total:entry.total,series:entry.series};
 // Cache revision concerns public normals only; Secret activity is not exposed.
 const source=JSON.stringify([seriesTotals,displayById]);let hash=2166136261;
 for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return {version:1,revision:'normal-'+(hash>>>0).toString(16),seriesTotals,displayById};
}
function catalogueValidateMetadata(metadata,cards){
 if(!metadata||metadata.version!==1||typeof metadata.revision!=='string'||!metadata.seriesTotals||!metadata.displayById)return null;
 const records=new Map(catalogueRecords(cards).map(c=>[catalogueId(c),c])),local=cataloguePublicMetadata(cards),counts=new Map(),positions=new Map();
 const rarityKeys=['common','rare','epic','legendary','mythic','ultra'],knownRarities=new Map();
 for(const card of catalogueNormalCards(cards)){
  const rarity=catalogueValue(card,'rarity');
  // A redacted normal placeholder has no explicit rarity: never invent common.
  if(!rarityKeys.includes(rarity))continue;
  const number=catalogueSeries(card);
  if(!knownRarities.has(number))knownRarities.set(number,Object.fromEntries(rarityKeys.map(key=>[key,0])));
  knownRarities.get(number)[rarity]++;
 }
 for(const [id,entry] of Object.entries(metadata.displayById)){
  const record=records.get(id);
  if(record&&(!catalogueIsActive(record)||catalogueSecret(record)))return null;
  const n=Number(entry?.series),number=Number(entry?.number),total=Number(entry?.total);
  if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(number)||number<1||!Number.isSafeInteger(total)||number>total||entry.series!==n||entry.number!==number||entry.total!==total)return null;
  if(record&&catalogueSeries(record)!==n)return null;
  const summary=metadata.seriesTotals[n];if(!summary||summary.total!==total||summary.normalTotal!==total)return null;
  if(!positions.has(n))positions.set(n,new Set());if(positions.get(n).has(number))return null;positions.get(n).add(number);
  counts.set(n,(counts.get(n)||0)+1);
 }
 for(const [key,summary] of Object.entries(metadata.seriesTotals)){
  const n=Number(key),total=summary?.normalTotal;
  if(!Number.isSafeInteger(n)||n<1||String(n)!==key||!Number.isSafeInteger(total)||total<0||summary.total!==total||(counts.get(n)||0)!==total)return null;
  if((local.seriesTotals[n]?.normalTotal||0)>total)return null;
  const byRarity=summary.byRarity;
  if(!byRarity||typeof byRarity!=='object'||Array.isArray(byRarity)||Object.keys(byRarity).length!==rarityKeys.length||Object.keys(byRarity).some(key=>!rarityKeys.includes(key)))return null;
  if(rarityKeys.some(key=>!Object.hasOwn(byRarity,key)||!Number.isSafeInteger(byRarity[key])||byRarity[key]<0))return null;
  if(rarityKeys.reduce((sum,key)=>sum+byRarity[key],0)!==total)return null;
  if(rarityKeys.some(key=>(knownRarities.get(n)?.[key]||0)>byRarity[key]))return null;
 }
 for(const id of Object.keys(local.displayById))if(!Object.hasOwn(metadata.displayById,id))return null;
 return JSON.parse(JSON.stringify(metadata));
}
export function createAutoCatalogue(initial=[],options={}){
 let cards=[],display=new Map(),metadata=null,external=false;
 function replace(next,{publicMetadata=null}={}){
  cards=catalogueActiveCards(next);
  const valid=catalogueValidateMetadata(publicMetadata,next);external=!!valid;
  metadata=valid||cataloguePublicMetadata(next);display=catalogueDisplayIndex(next);
  if(valid)for(const [id,entry] of Object.entries(valid.displayById))display.set(id,{...entry,secret:false});
  return api;
 }
 function metrics(number,owned={}){
  const local=catalogueSeriesMetrics(cards,number,owned);if(!external)return local;
  const summaries=number===undefined?Object.values(metadata.seriesTotals):[metadata.seriesTotals[number]].filter(Boolean);
  const total=summaries.reduce((sum,s)=>sum+s.normalTotal,0),byRarity={common:0,rare:0,epic:0,legendary:0,mythic:0,ultra:0};
  for(const s of summaries)for(const key of Object.keys(byRarity))byRarity[key]+=s.byRarity[key]||0;
  let obtained=0;for(const [id,e] of Object.entries(metadata.displayById))if((number===undefined||e.series===Number(number))&&catalogueOwnedCopies(owned,id))obtained++;
  return {...local,total,owned:obtained,percent:total?Math.floor(100*obtained/total):0,byRarity};
 }
 const api={replace,cards:()=>cards,metrics,display:()=>display,editionText:card=>catalogueEditionText(card,display),metadata:()=>metadata};
 replace(initial,options);return api;
}
