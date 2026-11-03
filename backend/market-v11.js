/* Mashup V11 — public listings with private escrow.
 * Executed inside the existing PostgreSQL game_runtime FOR UPDATE transaction.
 * No real currency; all amounts are in-game credits.
 * Secret cards cannot be listed (undiscovered content remains secret).
 */
const V11_MAX_PRICE=250000;
const V11_MARKET_BASE={common:90,rare:220,epic:650,legendary:1800,mythic:4800,ultra:11500};
function marketV11Card(db,id){
 return db.cards.find(c=>c.id===id&&!c.archived)||null;
}
function marketV11Estimate(db,card){
 if(!card)return 0;
 const base=V11_MARKET_BASE[card.rarity]||90;
 const finish=card.variant==='gold'?1.5:card.variant==='full_art'?1.24:1;
 // Scarcity proxy excludes admin, and is intentionally only an indicative guide.
 const owners=db.users.filter(u=>u.role!=='admin'&&!u.disabled&&(Number(u.state?.owned?.[card.id])||0)>0).length;
 const scarce=owners<=1?1.2:owners<=3?1.1:1;
 return Math.max(10,Math.round(base*finish*scarce/10)*10);
}
function marketV11CardPublic(c){
 return {id:c.id,name:c.name,rarity:c.rarity,variant:c.variant,family:c.family,series:Number(c.editionSeries)||1};
}
function marketV11Result(db,l){
 const c=marketV11Card(db,l.cardId);
 const seller=db.users.find(u=>u.id===l.seller);
 return {id:l.id,card:c?marketV11CardPublic(c):null,sellerId:l.seller,
   sellerName:seller?(seller.pseudo||seller.username?.split('@')[0]||'Joueur'):'Joueur',
   price:l.price,estimate:c?marketV11Estimate(db,c):0,status:l.status,
   createdAt:l.createdAt,updatedAt:l.updatedAt};
}
function marketV11List(db,u){
 const listings=Array.isArray(db.listingsV11)?db.listingsV11:[];
 const available=listings.filter(l=>l.status==='active'&&marketV11Card(db,l.cardId)&&
   db.users.some(owner=>owner.id===l.seller&&!owner.disabled))
   .slice(-160).reverse().map(l=>marketV11Result(db,l));
 const mine=listings.filter(l=>l.seller===u.id).slice(-25).reverse().map(l=>marketV11Result(db,l));
 return {listings:available,myListings:mine,limits:{maxPrice:V11_MAX_PRICE,maxActive:12}};
}
function marketV11ValidateCard(db,u,id){
 if(typeof id!=='string'||id.length>100)fail(400,'Identifiant de carte incorrect.');
 const card=marketV11Card(db,id);
 if(!card)fail(404,'Cette carte n’est plus dans le catalogue.');
 if(card.variant==='secret')fail(403,'Les cartes Secrètes ne peuvent pas être affichées dans le marché public.');
 if((Number(u.state?.owned?.[id])||0)<1)fail(409,'Tu ne possèdes plus d’exemplaire disponible.');
 return card;
}
function marketV11Create(db,u,input){
 const card=marketV11ValidateCard(db,u,input?.cardId);
 const price=Number(input?.price);
 if(!Number.isSafeInteger(price)||price<10||price>V11_MAX_PRICE)fail(400,'Prix : entre 10 et 250 000 crédits.');
 db.listingsV11=Array.isArray(db.listingsV11)?db.listingsV11:[];
 if(db.listingsV11.filter(l=>l.status==='active'&&l.seller===u.id).length>=12)fail(409,'Tu as déjà 12 annonces actives.');
 if(db.listingsV11.filter(l=>l.status==='active').length>=160)fail(409,'Marché saturé : réessaie après une vente.');
 // Physically remove one copy from seller inventory. It is HELD in this listing.
 // Trades/decks cannot use it; a cancellation returns exactly one copy.
 u.state.owned[card.id]-=1;
 for(const key of ['deck','deckDouble'])if(Array.isArray(u.state[key]))
   u.state[key]=u.state[key].filter(id=>Number(u.state.owned?.[id])>0);
 const now=Date.now();
 const listing={id:crypto.randomUUID(),seller:u.id,cardId:card.id,price,status:'active',createdAt:now,updatedAt:now};
 db.listingsV11.push(listing);
 // Historical fulfilled listings kept for users; active items are never discarded.
 db.listingsV11=db.listingsV11.filter(l=>l.status==='active'||now-l.updatedAt<45*86400000).slice(-650);
 return {listing:marketV11Result(db,listing),state:u.state};
}
function marketV11Cancel(db,u,id){
 const listing=(db.listingsV11||[]).find(l=>l.id===id&&l.seller===u.id);
 if(!listing)fail(404,'Annonce introuvable.');
 if(listing.status!=='active')fail(409,'Annonce déjà terminée.');
 // Return escrow exactly once.
 u.state.owned[listing.cardId]=(Number(u.state.owned[listing.cardId])||0)+1;
 listing.status='cancelled';listing.updatedAt=Date.now();
 return {listing:marketV11Result(db,listing),state:u.state};
}
function marketV11Buy(db,buyer,id){
 const listing=(db.listingsV11||[]).find(l=>l.id===id);
 if(!listing||listing.status!=='active')fail(409,'Cette carte vient d’être vendue ou retirée.');
 if(listing.seller===buyer.id)fail(400,'Tu ne peux pas acheter ta propre carte.');
 const seller=db.users.find(u=>u.id===listing.seller&&!u.disabled);
 if(!seller)fail(409,'Le vendeur n’est plus disponible.');
 const card=marketV11Card(db,listing.cardId);
 if(!card||card.variant==='secret')fail(409,'Carte indisponible.');
 const payment=Number(listing.price);
 const funds=Number(buyer.state?.coins),sellerFunds=Number(seller.state?.coins);
 if(!Number.isSafeInteger(payment)||payment<10||payment>V11_MAX_PRICE)fail(409,'Annonce invalide.');
 if(!Number.isSafeInteger(funds)||funds<payment)fail(409,'Crédits insuffisants.');
 if(!Number.isSafeInteger(sellerFunds)||sellerFunds+payment>1000000)fail(409,'Plafond de crédits du vendeur atteint.');
 if(!Number.isSafeInteger(Number(buyer.state.owned?.[card.id])||0)||Number(buyer.state.owned?.[card.id]||0)>=1000000)fail(409,'Limite de collection atteinte.');
 // Atomic: one escrowed card -> buyer, credits -> seller. One row lock prevents double-buy.
 buyer.state.coins=funds-payment;seller.state.coins=sellerFunds+payment;
 buyer.state.owned[card.id]=(Number(buyer.state.owned[card.id])||0)+1;
 buyer.state.latestCardId=card.id;
 listing.status='sold';listing.buyer=buyer.id;listing.updatedAt=Date.now();
 seller.marketSalesV11=(Number(seller.marketSalesV11)||0)+1;
 buyer.marketPurchasesV11=(Number(buyer.marketPurchasesV11)||0)+1;
 seller.tradeCountV11=(Number(seller.tradeCountV11)||0)+1;
 buyer.tradeCountV11=(Number(buyer.tradeCountV11)||0)+1;
 return {listing:marketV11Result(db,listing),state:buyer.state,changed:true,otherUserId:seller.id};
}
