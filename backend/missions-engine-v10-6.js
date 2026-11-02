/* Mashup V10.6 — journal of authoritative quest progress.
 * This module is embedded verbatim into Supabase Edge Function mashup-api-gh,
 * before handle(). No schema change, no frontend-provided progress.
 * Period rollover uses Europe/Paris calendar dates (including DST).
 */
const MISSION_DEFAULT_REWARDS=Object.freeze({
  dailyBooster:90,dailyBattle:100,dailyVictory:140,dailyBonus:200,
  weeklyBoosters:300,weeklyBattles:320,weeklyVictories:420,weeklyBonus:550
});
const MISSION_DEFS=Object.freeze({
  daily:[
    {id:'booster',key:'packs',target:1,rewardKey:'dailyBooster',title:'Une découverte',description:'Ouvre et confirme 1 booster.',icon:'◈'},
    {id:'battle',key:'battles',target:1,rewardKey:'dailyBattle',title:'À l’assaut !',description:'Termine 1 combat de campagne dans l’Arène.',icon:'⚔'},
    {id:'victory',key:'wins',target:1,rewardKey:'dailyVictory',title:'Victoire du jour',description:'Gagne 1 combat de campagne.',icon:'✦'}
  ],
  weekly:[
    {id:'boosters',key:'packs',target:5,rewardKey:'weeklyBoosters',title:'Explorateur du multivers',description:'Ouvre et confirme 5 boosters.',icon:'◈'},
    {id:'battles',key:'battles',target:5,rewardKey:'weeklyBattles',title:'Champion de l’Arène',description:'Termine 5 combats de campagne.',icon:'⚔'},
    {id:'victories',key:'wins',target:3,rewardKey:'weeklyVictories',title:'Conquérant',description:'Remporte 3 combats de campagne.',icon:'✦'}
  ]
});
function missionParisKeys(date=new Date()){
  const fmt=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'
  });
  const parts=Object.fromEntries(fmt.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const day=parts.year+'-'+parts.month+'-'+parts.day;
  const midnight=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)));
  const monday=(midnight.getUTCDay()+6)%7;
  midnight.setUTCDate(midnight.getUTCDate()-monday);
  return {day,week:midnight.toISOString().slice(0,10)};
}
function cleanMissionCounters(source){
  const d={};
  for(const key of ['packs','battles','wins']){
    const n=Number(source?.[key]);
    d[key]=Number.isSafeInteger(n)&&n>=0?Math.min(n,100000):0;
  }
  return d;
}
function missionRollover(u,date=new Date()){
  const keys=missionParisKeys(date);
  let m=u.missionsV106;
  if(!m||typeof m!=='object'||Array.isArray(m)){
    m={day:keys.day,week:keys.week,daily:{packs:0,battles:0,wins:0},weekly:{packs:0,battles:0,wins:0},claimedDaily:[],claimedWeekly:[],dailyBonusClaimed:false,weeklyBonusClaimed:false};
  }
  if(m.day!==keys.day){
    m.day=keys.day;m.daily={packs:0,battles:0,wins:0};m.claimedDaily=[];m.dailyBonusClaimed=false;
  }
  if(m.week!==keys.week){
    m.week=keys.week;m.weekly={packs:0,battles:0,wins:0};m.claimedWeekly=[];m.weeklyBonusClaimed=false;
  }
  m.daily=cleanMissionCounters(m.daily);
  m.weekly=cleanMissionCounters(m.weekly);
  m.claimedDaily=Array.isArray(m.claimedDaily)?[...new Set(m.claimedDaily.filter(x=>typeof x==='string'))].slice(0,3):[];
  m.claimedWeekly=Array.isArray(m.claimedWeekly)?[...new Set(m.claimedWeekly.filter(x=>typeof x==='string'))].slice(0,3):[];
  m.dailyBonusClaimed=!!m.dailyBonusClaimed;
  m.weeklyBonusClaimed=!!m.weeklyBonusClaimed;
  u.missionsV106=m;
  return m;
}
function missionRewards(db){
  const cfg=db.missionRewards||{};
  return Object.fromEntries(Object.entries(MISSION_DEFAULT_REWARDS).map(([k,n])=>{
    const value=cfg[k];
    return [k,Number.isSafeInteger(value)&&value>=0&&value<=5000?value:n];
  }));
}
function validateMissionRewards(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Réglages des missions invalides.');
  const out={};
  for(const k of Object.keys(MISSION_DEFAULT_REWARDS)){
    const value=input[k];
    if(!Number.isSafeInteger(value)||value<0||value>5000)fail(400,'Récompense invalide : entier entre 0 et 5 000 crédits.');
    out[k]=value;
  }
  return out;
}
function missionSummary(u,db,date=new Date()){
  const m=missionRollover(u,date), rewards=missionRewards(db);
  const groups={};
  for(const scope of ['daily','weekly']){
    const claimed=new Set(scope==='daily'?m.claimedDaily:m.claimedWeekly);
    const source=m[scope];
    const tasks=MISSION_DEFS[scope].map(def=>{
      const progress=Math.min(def.target,source[def.key]||0);
      const complete=progress>=def.target;
      return {id:def.id,title:def.title,description:def.description,icon:def.icon,
        progress,target:def.target,reward:rewards[def.rewardKey],completed:complete,claimed:claimed.has(def.id)};
    });
    const bonusKey=scope==='daily'?'dailyBonus':'weeklyBonus';
    const bonusClaimed=scope==='daily'?m.dailyBonusClaimed:m.weeklyBonusClaimed;
    groups[scope]={tasks,bonus:{id:'bonus',reward:rewards[bonusKey],
      completed:tasks.every(t=>t.completed),claimed:bonusClaimed}};
  }
  return {day:m.day,week:m.week,timezone:'Europe/Paris',...groups,
    adminSettings:u.role==='admin'?rewards:undefined};
}
function missionRecordEvent(u,event,count=1,date=new Date()){
  if(!['packs','battles','wins'].includes(event)||!Number.isSafeInteger(count)||count<1||count>10)return;
  const m=missionRollover(u,date);
  for(const scope of ['daily','weekly'])m[scope][event]=Math.min(100000,m[scope][event]+count);
}
function missionClaimReward(u,db,scope,id,date=new Date()){
  if(!['daily','weekly'].includes(scope))fail(400,'Période de mission inconnue.');
  if(typeof id!=='string'||id.length>40)fail(400,'Mission inconnue.');
  const m=missionRollover(u,date), cfg=missionRewards(db);
  const defs=MISSION_DEFS[scope];
  const suffix=scope==='daily'?'Daily':'Weekly';
  let claimed=false,reward=0;
  if(id==='bonus'){
    claimed=scope==='daily'?m.dailyBonusClaimed:m.weeklyBonusClaimed;
    if(!defs.every(def=>m[scope][def.key]>=def.target))fail(409,'Termine les trois missions pour débloquer le bonus.');
    reward=cfg[scope==='daily'?'dailyBonus':'weeklyBonus'];
  }else{
    const def=defs.find(x=>x.id===id);
    if(!def)fail(400,'Mission inconnue.');
    claimed=(scope==='daily'?m.claimedDaily:m.claimedWeekly).includes(id);
    if((m[scope][def.key]||0)<def.target)fail(409,'Cette mission n’est pas encore terminée.');
    reward=cfg[def.rewardKey];
  }
  if(claimed)fail(409,'Cette récompense a déjà été récupérée.');
  const credits=Number(u.state?.coins);
  if(!Number.isSafeInteger(credits)||credits<0||credits+reward>1000000)fail(409,'Plafond du portefeuille atteint : dépense quelques crédits avant de récupérer cette récompense.');
  if(id==='bonus'){
    if(scope==='daily')m.dailyBonusClaimed=true;else m.weeklyBonusClaimed=true;
  }else if(scope==='daily')m.claimedDaily.push(id);else m.claimedWeekly.push(id);
  u.state.coins=credits+reward;
  return {ok:true,reward,state:u.state,missions:missionSummary(u,db,date)};
}
