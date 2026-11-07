/* V15.3: retrieve artwork only for a card on an active, public sale listing. */
export function createMarketArtPreviews({api,renderCard,getCardById,getRoot,getView,getMode}){
 const cache=new Map(),pending=new Set();
 let observer=null,active=new Map();
 function render(listing){
   const card=listing.card||{};
   const local=getCardById(card.id);
   const base=local&&!local.hidden&&!local.archived?local:{...card,editionSeries:card.series,icon:card.icon||'✦'};
   const preview=cache.get(listing.id);
   return renderCard(preview&&preview.id===card.id?{...base,art:preview.art}:base,{lazy:true,revealedOpponent:true});
 }
 async function load(id){
   const listing=active.get(id);
   if(!listing||pending.has(id)||cache.has(id))return;
   pending.add(id);
   try{
     const result=await api('/api/market/preview/'+encodeURIComponent(id));
     if(!result?.card||result.card.id!==listing.card.id)return;
     cache.set(id,{id:result.card.id,art:result.card.art||''});
     const root=getRoot();if(!root||getView()!=='market'||getMode()!=='sale')return;
     for(const el of root.querySelectorAll('[data-v153-listing]')){
       if(el.dataset.v153Listing!==id||!el.isConnected)continue;
       const current=active.get(id);if(current)el.innerHTML=render(current);
     }
   }catch{ /* Keep the graceful no-art fallback during a transient failure. */ }
   finally{pending.delete(id);}
 }
 function observe(listings=[],mine=[]){
   observer?.disconnect();observer=null;
   active=new Map([...listings,...mine].filter(l=>l?.status==='active'&&l.card?.id).map(l=>[l.id,l]));
   const root=getRoot();if(!root)return;
   const nodes=[...root.querySelectorAll('[data-v153-listing]')].filter(el=>{
     const l=active.get(el.dataset.v153Listing);if(!l||cache.has(l.id)||pending.has(l.id))return false;
     const c=getCardById(l.card.id);return !(c&&!c.hidden&&!c.archived&&c.art);
   });
   if(typeof IntersectionObserver==='undefined'){nodes.slice(0,16).forEach(el=>load(el.dataset.v153Listing));return;}
   observer=new IntersectionObserver(entries=>{
     for(const entry of entries)if(entry.isIntersecting){observer?.unobserve(entry.target);load(entry.target.dataset.v153Listing);}
   },{rootMargin:'180px',threshold:0.01});
   nodes.forEach(el=>observer.observe(el));
 }
 return {render,observe};
}
