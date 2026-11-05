/* Bootstrap/CRUD response adapter for the complete, private server catalogue.
 * Load catalogue-core.js first. This fragment performs no I/O and no mutation.
 * The deployed router and its card privacy serializer are not in this repository.
 */
function catalogueBootstrapProjection(db,{legacyTargetCount=false}={}){
 if(!db||!Array.isArray(db.cards))throw new TypeError('Un catalogue serveur complet est requis.');
 const configured=Array.isArray(db.series)?db.series:[];
 const catalogueMeta=cataloguePublicMetadata(db.cards,configured);
 const settings=new Map();
 for(const value of configured){
   const number=Number(value?.number);
   if(Number.isSafeInteger(number)&&number>0&&!settings.has(number))settings.set(number,value);
 }
 const numbers=Object.keys(catalogueMeta.seriesTotals).map(Number)
   .filter(number=>Number.isSafeInteger(number)&&number>0).sort((a,b)=>a-b);
 const series=numbers.map(number=>{
   const input=settings.get(number)||{};
   const projected={number,name:typeof input.name==='string'?input.name:'Série '+String(number).padStart(2,'0')};
   for(const key of ['description','color','cover'])if(typeof input[key]==='string')projected[key]=input[key];
   // Compatibility output only: never read or save a configured denominator.
   if(legacyTargetCount)projected.targetCount=catalogueSeriesMetrics(db.cards,number).total;
   return projected;
 });
 return {series,seriesTotals:catalogueMeta.seriesTotals,catalogueMeta};
}
