/* Mashup V10.9: bilateral card/credit trades and curated public showcases.
 * No new public database tables: all writes run in the existing locked runtime
 * SQL transaction. No inventory can be transferred until both are validated.
 */
const TRADE_ALLOWED_STATES=['pending','accepted','declined','cancelled','expired','countered'];
function tradeCardBrief(db,id){
 const c=db.cards.find(x=>x.id===id&&!x.archived);
 return c?{id:c.id,name:c.name,rarity:c.rarity,variant:c.variant,series:Number(c.editionSeries)||1}:null;
}
function tradeItems(db,source,holder){
 if(!Array.isArray(source)||source.length>5)fail(400,'Cinq cartes différentes maximum.');
 const unique=new Set();
 return source.map(raw=>{
   const id=String(raw?.id||''),qty=Number(raw?.qty);
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||unique.has(id))fail(400,'Liste de cartes invalide.');
   unique.add(id);
   if(!Number.isSafeInteger(qty)||qty<1||qty>20)fail(400,'Quantité de 1 à 20 requise.');
   if(!db.cards.some(c=>c.id===id&&!c.archived))fail(409,'Carte non disponible.');
   if((Number(holder.state?.owned?.[id])||0)<qty)fail(409,'Cartes insuffisantes pour cet échange.');
   return {id,qty};
 });
}
function tradeCredits(value,holder){
 if(!Number.isSafeInteger(value)||value<0||value>200000)fail(400,'Mise limitée à 200 000 crédits.');
 if((Number(holder.state?.coins)||0)<value)fail(409,'Crédits insuffisants pour proposer cet échange.');
 return value;
}
function tradePlayer(db,id){
 return db.users.find(x=>x.id===id&&!x.disabled)||null;
}
function tradeSummary(db,t){
 return {id:t.id,from:t.from,to:t.to,fromName:tradePlayer(db,t.from)?.pseudo||tradePlayer(db,t.from)?.username?.split('@')[0]||'Joueur',
 toName:tradePlayer(db,t.to)?.pseudo||tradePlayer(db,t.to)?.username?.split('@')[0]||'Joueur',
 offer:t.offer.map(x=>({...x,card:tradeCardBrief(db,x.id)})),request:t.request.map(x=>({...x,card:tradeCardBrief(db,x.id)})),
 offerCredits:t.offerCredits,requestCredits:t.requestCredits,status:t.status,
 createdAt:t.createdAt,updatedAt:t.updatedAt};
}
function tradeList(db,u){
 const items=Array.isArray(db.tradesV109)?db.tradesV109:[];
 const now=Date.now();
 for(const t of items)if(t.status==='pending'&&now-t.createdAt>7*86400000){t.status='expired';t.updatedAt=now;}
 const players=db.users.filter(x=>x.id!==u.id&&!x.disabled).map(x=>({id:x.id,pseudo:x.pseudo||x.username?.split('@')[0]||'Joueur'}));
 return {players,trades:items.filter(t=>t.from===u.id||t.to===u.id).slice(-50).reverse().map(t=>tradeSummary(db,t))};
}
function tradePartner(db,u,id){
 const target=tradePlayer(db,id);
 if(!target||target.id===u.id)fail(404,'Joueur introuvable.');
 const cards=db.cards.filter(c=>!c.archived&&c.variant!=='secret'&&(Number(target.state?.owned?.[c.id])||0)>0)
  .map(c=>({...tradeCardBrief(db,c.id),qty:Math.min(20,Number(target.state.owned[c.id])||0)}));
 return {id:target.id,pseudo:target.pseudo||target.username?.split('@')[0],cards};
}
function tradeNew(db,u,data){
 const to=tradePlayer(db,String(data?.to||''));
 if(!to||to.id===u.id)fail(404,'Destinataire invalide.');
 const offer=tradeItems(db,data.offer||[],u), request=tradeItems(db,data.request||[],to);
 const offerCredits=tradeCredits(data.offerCredits??0,u),requestCredits=tradeCredits(data.requestCredits??0,to);
 if(!offer.length&&!request.length&&!offerCredits&&!requestCredits)fail(400,'Choisis au moins une carte ou quelques crédits.');
 db.tradesV109=Array.isArray(db.tradesV109)?db.tradesV109:[];
 if(db.tradesV109.filter(x=>x.from===u.id&&x.status==='pending').length>=10)fail(409,'Tu as déjà dix propositions en attente.');
 const now=Date.now();
 const t={id:crypto.randomUUID(),from:u.id,to:to.id,offer,request,offerCredits,requestCredits,
    createdAt:now,updatedAt:now,status:'pending'};
 db.tradesV109.push(t);db.tradesV109=db.tradesV109.filter(x=>x.status==='pending'||now-x.updatedAt<30*86400000).slice(-400);
 return {trade:tradeSummary(db,t)};
}
function tradeRespond(db,u,data){
 const t=(db.tradesV109||[]).find(x=>x.id===data?.id&&(x.to===u.id||x.from===u.id));
 if(!t)fail(404,'Proposition introuvable.');
 if(t.status!=='pending')fail(409,'Cette proposition est déjà terminée.');
 if(Date.now()-t.createdAt>7*86400000){t.status='expired';fail(409,'La proposition a expiré.');}
 const action=data.action;
 if(action==='cancel'){
   if(t.from!==u.id)fail(403,'Seul l’expéditeur peut annuler.');
   t.status='cancelled';t.updatedAt=Date.now();return {trade:tradeSummary(db,t),changed:false};
 }
 if(t.to!==u.id)fail(403,'Réponse réservée au destinataire.');
 if(action==='decline'){t.status='declined';t.updatedAt=Date.now();return {trade:tradeSummary(db,t),changed:false};}
 if(action==='counter'){
   // The old offer is superseded only when a valid new offer exists.
   const counter=tradeNew(db,u,{...data,to:t.from});
   t.status='countered';t.updatedAt=Date.now();
   return {...counter,changed:false};
 }
 if(action!=='accept')fail(400,'Action inconnue.');
 const from=tradePlayer(db,t.from),to=tradePlayer(db,t.to);
 if(!from||!to)fail(409,'Un joueur n’est plus disponible.');
 // Re-validate BOTH inventories and balances at acceptance, within row lock.
 const give=tradeItems(db,t.offer,from),take=tradeItems(db,t.request,to);
 tradeCredits(t.offerCredits,from);tradeCredits(t.requestCredits,to);
 const nextFrom=Number(from.state.coins)-t.offerCredits+t.requestCredits;
 const nextTo=Number(to.state.coins)-t.requestCredits+t.offerCredits;
 if(!Number.isSafeInteger(nextFrom)||!Number.isSafeInteger(nextTo)||nextFrom>1000000||nextTo>1000000)fail(409,'Plafond de crédits dépassé.');
 for(const c of give){from.state.owned[c.id]-=c.qty;to.state.owned[c.id]=(to.state.owned[c.id]||0)+c.qty;}
 for(const c of take){to.state.owned[c.id]-=c.qty;from.state.owned[c.id]=(from.state.owned[c.id]||0)+c.qty;}
 from.state.coins=nextFrom;to.state.coins=nextTo;
 t.status='accepted';t.updatedAt=Date.now();
 return {trade:tradeSummary(db,t),changed:true,otherUserId:from.id,state:to.state};
}
const V109_SHOWCASE_THEMES=['emerald','midnight','gold','cosmic'];
function showcaseSummary(u,db,viewerId){
 const own=viewerId===u.id;
 const choices=Array.isArray(u.showcaseHighlightsV109)?u.showcaseHighlightsV109:[];
 const cards=choices.slice(0,3).map(id=>db.cards.find(c=>c.id===id&&!c.archived&&Number(u.state?.owned?.[c.id])>0))
   .filter(c=>c&&(c.variant!=='secret'||own));
 const theme=V109_SHOWCASE_THEMES.includes(u.showcaseThemeV109)?u.showcaseThemeV109:'emerald';
 const eligible=!!(u.collectionRewardsV108&&Object.entries(u.collectionRewardsV108).some(([k,v])=>k.endsWith(':100')&&v===true));
 const title=eligible&&u.showcaseTitleV109==='master'?'Maître de la série':'Collectionneur du Multivers';
 return {cards,theme,title};
}
function saveShowcase(u,db,data){
 const ids=data?.cards;
 if(!Array.isArray(ids)||ids.length>3||new Set(ids).size!==ids.length)fail(400,'Choisis jusqu’à trois cartes différentes.');
 for(const id of ids){
   if(typeof id!=='string'||!db.cards.some(c=>c.id===id&&!c.archived)||Number(u.state?.owned?.[id])<1)fail(409,'Carte de vitrine non possédée.');
 }
 const theme=data.theme;
 if(!V109_SHOWCASE_THEMES.includes(theme))fail(400,'Thème de vitrine inconnu.');
 if(!['collector','master'].includes(data.title))fail(400,'Titre inconnu.');
 const isMaster=Object.entries(u.collectionRewardsV108||{}).some(([key,claimed])=>key.endsWith(':100')&&claimed===true);
 if(data.title==='master'&&!isMaster)fail(403,'Titre réservé aux séries complétées.');
 u.showcaseHighlightsV109=ids;u.showcaseThemeV109=theme;u.showcaseTitleV109=data.title;
 return {showcase:showcaseSummary(u,db,u.id)};
}
