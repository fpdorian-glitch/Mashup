/* Mashup V10.9: admin-configurable collection rewards & one-time booster coupons. */
const V109_COLLECTION_DEFAULTS={25:{credits:300,boosterId:''},50:{credits:600,boosterId:'cosmos'},75:{credits:1000,boosterId:''},100:{credits:2000,boosterId:''}};
function collectionRewardConfig(db){
 const out={};const packs=getPackMap(db);
 for(const [percent,base] of Object.entries(V109_COLLECTION_DEFAULTS)){
   const raw=db.collectionRewardConfigV109?.[percent]||base;
   const credits=Number.isSafeInteger(raw.credits)&&raw.credits>=0&&raw.credits<=5000?raw.credits:base.credits;
   const boosterId=raw.boosterId===''?'':packs[raw.boosterId]?raw.boosterId:'';
   out[percent]={credits,boosterId,boosterName:packs[boosterId]?.name||''};
 }
 return out;
}
function saveCollectionRewardConfig(db,input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Réglages invalides.');
 const packs=getPackMap(db),next={};
 for(const percent of Object.keys(V109_COLLECTION_DEFAULTS)){
   const raw=input[percent];
   if(!raw||!Number.isSafeInteger(raw.credits)||raw.credits<0||raw.credits>5000)fail(400,'Gains : 0 à 5000 crédits.');
   if(typeof raw.boosterId!=='string'||(raw.boosterId!==''&&!packs[raw.boosterId]))fail(400,'Booster de récompense inconnu.');
   next[percent]={credits:raw.credits,boosterId:raw.boosterId};
 }
 db.collectionRewardConfigV109=next;
 return collectionRewardConfig(db);
}
function collectionRewardSummary(u,db){
 const claimed=u.collectionRewardsV108&&typeof u.collectionRewardsV108==='object'&&!Array.isArray(u.collectionRewardsV108)?u.collectionRewardsV108:{};
 const catalog=Array.isArray(db.cards)?db.cards:[];
 const cfg=collectionRewardConfig(db);
 return (Array.isArray(db.series)?db.series:[]).map(series=>{
   const number=Number(series.number);
   const cards=catalog.filter(c=>!c.archived&&c.variant!=='secret'&&(Number(c.editionSeries)||1)===number);
   const total=number===1?158:(Number.isSafeInteger(Number(series.targetCount))&&Number(series.targetCount)>0?Number(series.targetCount):cards.length||1);
   const owned=cards.filter(c=>Number(u.state?.owned?.[c.id])>0).length;
   return {series:number,name:String(series.name||'Série'),owned,total,percent:Math.min(100,Math.floor(100*owned/Math.max(1,total))),
     tiers:Object.entries(cfg).map(([threshold,prize])=>{
       const pct=Number(threshold);
       return {percent:pct,reward:prize.credits,boosterId:prize.boosterId,boosterName:prize.boosterName,
         unlocked:owned*100>=total*pct,claimed:claimed[number+':'+pct]===true};
     }),badge:claimed[number+':100']===true?'Maître de la série':null
   };
 }).filter(s=>Number.isSafeInteger(s.series)&&s.series>0);
}
function claimCollectionReward(u,db,series,percent){
 if(!Number.isSafeInteger(series)||!Number.isSafeInteger(percent)||!Object.prototype.hasOwnProperty.call(V109_COLLECTION_DEFAULTS,percent))fail(400,'Palier de collection inconnu.');
 const entry=collectionRewardSummary(u,db).find(x=>x.series===series);
 if(!entry)fail(404,'Série introuvable.');
 const tier=entry.tiers.find(x=>x.percent===percent);
 if(!tier?.unlocked)fail(409,'Collection insuffisante pour ce palier.');
 if(tier.claimed)fail(409,'Récompense déjà récupérée.');
 const balance=Number(u.state?.coins),reward=tier.reward;
 if(!Number.isSafeInteger(balance)||balance<0||balance+reward>1000000)fail(409,'Plafond de crédits atteint.');
 u.collectionRewardsV108||={};
 u.collectionRewardsV108[series+':'+percent]=true;
 u.state.coins=balance+reward;
 if(tier.boosterId){
   u.packVouchersV109||={};
   u.packVouchersV109[tier.boosterId]=Math.min(100,Math.max(0,Number(u.packVouchersV109[tier.boosterId])||0)+1);
 }
 return {ok:true,reward,boosterId:tier.boosterId,state:u.state,vouchers:u.packVouchersV109||{},
   collectionRewards:collectionRewardSummary(u,db)};
}
