/* Mashup V10.8 — collection rewards (server authoritative).
 * Claim idempotence is stored with the player in mashup_private.game_runtime,
 * in the same transaction as the existing wallet mirror.
 * Secret cards never contribute to milestones.
 * Load catalogue-core.js before this fragment. Counts are derived, never configured.
 */
const COLLECTION_REWARD_TIERS=Object.freeze({25:300,50:600,75:1000,100:2000});
function collectionRewardSummary(u,db){
  const claimed=u.collectionRewardsV108&&typeof u.collectionRewardsV108==='object'&&!Array.isArray(u.collectionRewardsV108)?u.collectionRewardsV108:{};
  const catalog=Array.isArray(db.cards)?db.cards:[];
  const seenSeries=new Set();
  return (Array.isArray(db.series)?db.series:[]).filter(series=>{
    const number=Number(series?.number);
    if(!Number.isSafeInteger(number)||number<1||seenSeries.has(number))return false;
    seenSeries.add(number);return true;
  }).map(series=>{
    const number=Number(series.number);
    const {total,owned,percent}=catalogueSeriesMetrics(catalog,number,u.state?.owned||{});
    return {series:number,name:String(series.name||'Série'),owned,total,percent,
      tiers:Object.entries(COLLECTION_REWARD_TIERS).map(([threshold,value])=>{
        const pct=Number(threshold);
        return {percent:pct,reward:value,unlocked:total>0&&owned*100>=total*pct,claimed:claimed[number+':'+pct]===true};
      }),
      badge:claimed[number+':100']===true?'Maître de la série':null
    };
  }).filter(s=>Number.isSafeInteger(s.series)&&s.series>0);
}
function claimCollectionReward(u,db,series,percent){
  if(!Number.isSafeInteger(series)||!Number.isSafeInteger(percent)||!Object.prototype.hasOwnProperty.call(COLLECTION_REWARD_TIERS,percent))fail(400,'Palier de collection inconnu.');
  const entry=collectionRewardSummary(u,db).find(x=>x.series===series);
  if(!entry)fail(404,'Série introuvable.');
  const tier=entry.tiers.find(x=>x.percent===percent);
  if(!tier?.unlocked)fail(409,'Collection insuffisante pour ce palier.');
  if(tier.claimed)fail(409,'Récompense déjà récupérée.');
  const balance=Number(u.state?.coins),reward=tier.reward;
  if(!Number.isSafeInteger(balance)||balance<0||balance+reward>1000000)fail(409,'Plafond de crédits atteint : dépense quelques crédits avant la récompense.');
  u.collectionRewardsV108||={};
  u.collectionRewardsV108[series+':'+percent]=true;
  u.state.coins=balance+reward;
  return {ok:true,reward,state:u.state,collectionRewards:collectionRewardSummary(u,db)};
}
