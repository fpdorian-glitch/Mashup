import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {showcaseEligible} from '../../59-v15-3-showcase-picker.js';
import {createMarketArtPreviews} from '../../61-v15-3-market-art.js';

function prepare(){
 const source=fs.readFileSync(new URL('../../backend/market-v11.js',import.meta.url),'utf8');
 const ctx={crypto:{randomUUID:()=> 'listing-1'},fail(status,message){const error=new Error(message);error.status=status;throw error;}};
 vm.runInNewContext(source+'\nthis.marketFns={marketV11Create,marketV11Buy,marketV11Cancel,marketV11Preview,marketV11List}',ctx);
 const secret={id:'unlisted-secret',name:'Carte secrète',rarity:'ultra',variant:'secret',family:'Original',editionSeries:2,editionNumber:131,editionTotal:130,
   power:98,size:43,def:91,aura:97,intelligence:89,art:'data:image/png;base64,ABCD',color1:'#abfef0',color2:'#123456'};
 const seller={id:'seller',role:'player',disabled:false,pseudo:'Vendeur',state:{owned:{'unlisted-secret':1},deck:['unlisted-secret'],deckDouble:[],coins:100}};
 const buyer={id:'buyer',role:'player',disabled:false,pseudo:'Acheteur',state:{owned:{},deck:[],deckDouble:[],coins:2500}};
 const db={cards:[secret],users:[seller,buyer],listingsV11:[]};
 return {f:ctx.marketFns,db,seller,buyer,secret};
}
test('Une Secrète possédée peut être sélectionnée sans révéler les Secrètes inconnues',()=>{
 const cards=[{id:'secret-owned',variant:'secret',qty:1},{id:'secret-unknown',variant:'secret',qty:0},{id:'normal',qty:3},{id:'hidden',hidden:true,qty:1},{id:'archive',archived:true,qty:5}];
 assert.deepEqual(showcaseEligible(cards).map(c=>c.id),['secret-owned','normal']);
});
test('Le marché révèle seulement les cartes effectivement mises en vente',()=>{
 const {f,db,seller,secret}=prepare();
 assert.throws(()=>f.marketV11Preview(db,seller,'listing-1'),{status:404});
 const {listing}=f.marketV11Create(db,seller,{cardId:secret.id,price:900});
 assert.equal(seller.state.owned[secret.id],0);
 assert.equal(seller.state.deck.length,0);
 assert.equal(listing.card.variant,'secret');
 assert.equal(listing.card.art,undefined,'Le catalogue des annonces ne transfère pas les illustrations en masse');
 const art=f.marketV11Preview(db,seller,listing.id);
 assert.equal(art.card.art,secret.art);
 assert.equal(art.card.id,secret.id);
 assert.equal(f.marketV11List(db,seller).listings.length,1);
 f.marketV11Cancel(db,seller,listing.id);
 assert.equal(seller.state.owned[secret.id],1);
 assert.throws(()=>f.marketV11Preview(db,seller,listing.id),{status:404});
 assert.throws(()=>f.marketV11Cancel(db,seller,listing.id),{status:409});
});
test('Achat de Secrète : débit, transfert et impossibilité de double achat',()=>{
 const {f,db,seller,buyer,secret}=prepare();
 const {listing}=f.marketV11Create(db,seller,{cardId:secret.id,price:900});
 f.marketV11Buy(db,buyer,listing.id);
 assert.equal(seller.state.coins,1000);
 assert.equal(buyer.state.coins,1600);
 assert.equal(buyer.state.owned[secret.id],1);
 assert.equal(seller.state.owned[secret.id],0);
 assert.throws(()=>f.marketV11Buy(db,buyer,listing.id),{status:409});
 assert.throws(()=>f.marketV11Preview(db,buyer,listing.id),{status:404});
});
test('Aperçu de marché public sans carte locale : ne demande pas le catalogue privé',()=>{
 const seen=[];
 const painter=createMarketArtPreviews({api:async()=>{},renderCard:(card)=>{seen.push(card);return 'CARD';},
 getCardById:()=>({id:'mystery',hidden:true}),getRoot:()=>null,getView:()=> 'market',getMode:()=> 'sale'});
 const html=painter.render({id:'listing-1',card:{id:'unlisted-secret',name:'Visible en vente',variant:'secret',series:2}});
 assert.equal(html,'CARD');assert.equal(seen.length,1);assert.equal(seen[0].id,'unlisted-secret');
 assert.equal(seen[0].hidden,undefined);
});
