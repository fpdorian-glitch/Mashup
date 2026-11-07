/* New home furniture built on the V15.7.2 packet renderer. */
import {icon} from './35-mobile-premium.js?v=16.1.0';
export const visibleSeries=(series,user)=>(series||[]).filter(s=>user?.role==='admin'||s.visible!==false);
export function visiblePacks(packs,series){
 const eligible=new Set((series||[]).filter(s=>s.visible!==false&&s.boosterEnabled!==false).map(s=>Number(s.number)));
 return (packs||[]).filter(p=>p&&p.visible!==false).flatMap(p=>{if(p.filterMode!=='series')return[p];const allowed=(p.allowedSeries||[]).filter(n=>eligible.has(Number(n)));return allowed.length?[{...p,allowedSeries:allowed}]:[];});
}
export function quickLinks(){
 const item=(id,title,symbol,action=false)=>'<button type="button" '+(action?'data-action':'data-view')+'="'+id+'">'+icon(symbol)+'<span>'+title+'</span>'+icon('arrow')+'</button>';
 return '<nav class="s161-shortcuts" aria-label="Tes prochaines aventures">'+item('open-match','Mashup Match','star',true)+item('missions','Missions','missions')+item('market','Marché & échanges','market')+item('online','Mes amis','profile')+item('collection','Ma collection','cards')+item('s161-journal','Le journal','cards',true)+'</nav>';
}
export function confirmedPackRates(rates,id){
 const row=rates&&Object.hasOwn(rates,id)?rates[id]:null,keys=['common','rare','epic','legendary','mythic','ultra'];
 if(!row||keys.some(k=>!Object.hasOwn(row,k)||!Number.isFinite(row[k])||row[k]<0||row[k]>100))return null;
 if(Math.abs(keys.reduce((n,k)=>n+row[k],0)-100)>.003)return null;
 return keys.map(key=>({key,percent:row[key]}));
}
export function oddsMarkup(pack,rates,rarities,esc,{confirmedAt=null,live=false}={}){
 const rows=confirmedPackRates(rates,pack.id);
 if(!rows)return '<p class="s161-odds-unavailable" role="status">Les taux de ce booster n’ont pas été confirmés par le serveur. Aucune probabilité estimée n’est affichée.</p>';
 const format=n=>n.toLocaleString('fr-FR',{maximumFractionDigits:3});
 return '<p>Répartition de base <strong>par emplacement de carte</strong>, avant les garanties et la redistribution des raretés indisponibles.</p><dl class="s161-odds">'+rows.map(r=>'<div class="s161-rarity-'+r.key+'"><dt><i></i>'+esc(rarities[r.key]?.label||r.key)+'</dt><dd>'+format(r.percent)+' %</dd></div>').join('')+'</dl>'+
  (pack.min&&rarities[pack.min]?'<p class="s161-odds-guarantee">Garantie du booster : '+esc(rarities[pack.min].label)+' ou supérieure, selon les règles du serveur.</p>':'')+
  '<p class="small-note">Les garanties peuvent modifier les chances finales d’un emplacement. Les pools privés et les Secrètes non découvertes ne sont pas détaillés ici.</p><p class="small-note">'+(live?'Paramètres synchronisés avec le serveur.':'Paramètres confirmés lors de la dernière synchronisation du compte.')+(confirmedAt?' Mis à jour à '+esc(new Date(confirmedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}))+'.':'')+'</p>';
}
export function installCompactHeader({getUser,getProfile,safeImage,onNotifications}){
 const top=document.querySelector('.topbar'),breadcrumb=top.querySelector('.breadcrumb'),account=document.getElementById('account-button'),right=top.querySelector('.topbar-right');
 top.classList.add('s161-header');const identity=document.createElement('div');identity.className='s161-identity';identity.innerHTML='<small>TON MULTIVERS</small><strong></strong>';breadcrumb.before(identity);identity.before(account);
 const notify=document.createElement('button');notify.type='button';notify.className='s161-notifications';notify.setAttribute('aria-label','Notifications');notify.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4"/></svg><span hidden>0</span>';right.prepend(notify);notify.addEventListener('click',onNotifications);
 function sync(count=0){const u=getUser(),p=getProfile();top.classList.toggle('s161-signed-in',!!u);identity.querySelector('strong').textContent=u?.pseudo||'Mashup';const avatar=safeImage(p?.avatar);if(avatar){if(account.querySelector('img')?.getAttribute('src')!==avatar){const img=document.createElement('img');img.src=avatar;img.alt='';account.replaceChildren(img);}}else{const value=p?.avatar&&String(p.avatar).length<12?p.avatar:String(u?.pseudo||'M').slice(0,1).toUpperCase();if(account.textContent!==value||account.querySelector('img'))account.textContent=value;}const badge=notify.querySelector('span');badge.hidden=!count;badge.textContent=count>99?'99+':String(count);notify.setAttribute('aria-label',count?'Notifications, '+count+' non lues':'Notifications');}
 sync();return{sync};
}
