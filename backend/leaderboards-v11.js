/* Mashup V11 — lightweight, private player ranking. No card artwork sent. */
const V11_RARITY_PRESTIGE={common:1,rare:4,epic:12,legendary:35,mythic:95,ultra:250};
const V11_LEADERBOARD_MODES=[
 {id:'collection',label:'Collectionneur suprême',unit:'cartes distinctes'},
 {id:'prestige',label:'Collection prestige',unit:'points'},
 {id:'arena',label:'Champion de l’Arène',unit:'victoires'},
 {id:'series',label:'Maître des séries',unit:'% complétion'},
 {id:'rarity',label:'Chasseur de raretés',unit:'cartes rares'}
];
function leaderV11Stats(u,db){
 const owned=db.cards.filter(c=>!c.archived&&c.variant!=='secret'&&(Number(u.state?.owned?.[c.id])||0)>0);
 const normalCount=owned.length;
 const prestige=owned.reduce((sum,c)=>sum+(V11_RARITY_PRESTIGE[c.rarity]||1)*
   (c.variant==='gold'?1.5:c.variant==='full_art'?1.25:1),0);
 const series=Array.isArray(db.series)?db.series:[];
 const target=series.reduce((n,s)=>n+(s.number===1?158:Math.max(1,Number(s.targetCount)||1)),0);
 const percent=target?Math.min(100,Math.round(100*normalCount/target)):0;
 const rare=owned.filter(c=>['rare','epic','legendary','mythic','ultra'].includes(c.rarity)).length;
 const wins=(Number(u.state?.wins)||0)+(Number(u.state?.doubleWins)||0)+(Number(u.pvpWins)||0);
 return {collection:normalCount,prestige:Math.round(prestige),arena:wins,series:percent,rarity:rare};
}
function leaderV11Result(db,u){
 const eligible=db.users.filter(x=>x.role!=='admin'&&!x.disabled);
 const rows=eligible.map(x=>({id:x.id,pseudo:x.pseudo||x.username?.split('@')[0]||'Joueur',
   avatar:typeof x.avatar==='string'&&!x.avatar.startsWith('data:')?x.avatar:'✦',
   values:leaderV11Stats(x,db)}));
 return {modes:V11_LEADERBOARD_MODES,me:u.id,
   boards:Object.fromEntries(V11_LEADERBOARD_MODES.map(m=>{
     const sorted=[...rows].sort((a,b)=>b.values[m.id]-a.values[m.id]||a.pseudo.localeCompare(b.pseudo,'fr'));
     const ranked=sorted.map((p,i)=>({id:p.id,pseudo:p.pseudo,avatar:p.avatar,score:p.values[m.id],rank:i+1}));
     const me=ranked.find(p=>p.id===u.id)||null;
     return [m.id,{leaders:ranked.slice(0,12),me,total:ranked.length}];
   }))};
}
