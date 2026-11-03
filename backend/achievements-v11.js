/* Mashup V11 — permanent, one-time, server-validated achievements.
 * Player progress is based on the authoritative catalog and game state.
 */
const V11_ACHIEVEMENT_DEFS=[
 {id:'first_legend',title:'Premier contact',hint:'Obtenir une carte légendaire ou supérieure',goal:1,reward:150},
 {id:'myth_hunter',title:'Chasseur de mythes',hint:'Posséder 5 cartes mythiques différentes',goal:5,reward:500},
 {id:'booster_100',title:'Collectionneur acharné',hint:'Ouvrir 100 boosters',goal:100,reward:850},
 {id:'ultra_secret',title:'L’Impossible',hint:'Découvrir une Ultra Secrète',goal:1,reward:1200},
 {id:'merchant_10',title:'Maître du commerce',hint:'Réaliser 10 échanges ou ventes',goal:10,reward:0,unlocks:'Titre : Maître du commerce'},
 {id:'encyclopedia',title:'L’Encyclopédie',hint:'Compléter une série normale entière',goal:1,reward:1400}
];
function achievementV11Progress(u,db){
 const owned=db.cards.filter(c=>!c.archived&&(Number(u.state?.owned?.[c.id])||0)>0);
 const completedSeries=(Array.isArray(db.series)?db.series:[]).filter(ser=>{
   const total=ser.number===1?158:(Number(ser.targetCount)||1);
   const got=owned.filter(c=>c.variant!=='secret'&&(Number(c.editionSeries)||1)===Number(ser.number)).length;
   return got>=total;
 }).length;
 return {first_legend:owned.filter(c=>['legendary','mythic','ultra'].includes(c.rarity)).length,
   myth_hunter:owned.filter(c=>c.rarity==='mythic').length,
   booster_100:Math.max(0,Number(u.state?.opened)||0),
   ultra_secret:owned.filter(c=>c.variant==='secret'&&c.rarity==='ultra').length,
   merchant_10:Math.max(0,Number(u.tradeCountV11)||0),
   encyclopedia:completedSeries};
}
function achievementV11List(u,db){
 const done=u.achievementsV11&&typeof u.achievementsV11==='object'?u.achievementsV11:{};
 const progress=achievementV11Progress(u,db);
 return V11_ACHIEVEMENT_DEFS.map(def=>{
   const value=Math.min(def.goal,Math.max(0,Number(progress[def.id])||0));
   return {...def,progress:value,completed:value>=def.goal,claimed:done[def.id]===true};
 });
}
function achievementV11Claim(u,db,id){
 const def=V11_ACHIEVEMENT_DEFS.find(x=>x.id===id);
 if(!def)fail(404,'Succès inconnu.');
 if(u.achievementsV11?.[id]===true)fail(409,'Succès déjà récupéré.');
 const entry=achievementV11List(u,db).find(x=>x.id===id);
 if(!entry?.completed)fail(409,'Objectif non encore atteint.');
 const balance=Number(u.state?.coins);
 if(!Number.isSafeInteger(balance)||balance<0||balance+def.reward>1000000)fail(409,'Plafond de crédits atteint.');
 u.achievementsV11||={};
 u.achievementsV11[id]=true;
 u.state.coins=balance+def.reward;
 return {ok:true,reward:def.reward,unlocks:def.unlocks||null,
   state:u.state,achievements:achievementV11List(u,db)};
}
