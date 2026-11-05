import { reflectionForTilt } from './41-v14-runtime.js?v=14.0.1';
/* Mobile presentation layer. No API, economy, catalogue or account writes. */
const KEY='mashup-display-v13';
const PATHS={home:'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',cards:'M5 4h14v17H5ZM9 1h13v16M8 8h8M8 12h8M8 16h5',arena:'m4 3 17 17M3 4l3-1 1 4-4-1Zm17-1L3 20M21 4l-3-1-1 4 4-1ZM2 17l5 5m10 0 5-5',market:'M3 9h18l-2-6H5ZM5 10v11h14V10M9 21v-7h6v7',more:'M4 5h16M4 12h16M4 19h16',arrow:'M5 12h14m-6-6 6 6-6 6',star:'m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z',decks:'M4 7h13v15H4ZM8 3h13v15',missions:'m5 12 4 4 10-10M4 3h10M3 3v18h18V11',profile:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 22v-3a9 9 0 0 1 18 0v3',settings:'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6'};
export function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="${PATHS[name]||PATHS.star}"/></svg>`;}
export function resolveQuality(mode,{reduced=false,cores=8,memory=8,saveData=false}={}){
 if(reduced)return 'eco';
 if(mode==='eco'||mode==='high')return mode;
 return saveData||(cores>0&&cores<=4)||(memory>0&&memory<=4)?'eco':'high';
}
export function homeMarkup({esc,cards,renderCard,packs,state,user,owned,total}){
 const rank={common:0,rare:1,epic:2,legendary:3,mythic:4,ultra:5};
 // A private showcase: no undiscovered, hidden or archived card can enter this scene.
 const featured=cards.filter(c=>!c.hidden&&!c.archived&&Number(state.owned?.[c.id])>0).sort((a,b)=>(rank[b.rarity]||0)-(rank[a.rarity]||0)).slice(0,3);
 const pack=packs.find(p=>p.free&&!state.freePackUsed)||packs[0];
 const discoveries=Math.max(0,Number(owned)||0),catalogue=Math.max(0,Number(total)||0);
 const percent=catalogue?Math.min(100,Math.floor(discoveries/catalogue*100)):0;
 const first=String(user?.pseudo||'Collectionneur').split(' ')[0];
 const openings=Math.max(0,Number(state.opened)||0),victories=Math.max(0,(Number(state.wins)||0)+(Number(state.doubleWins)||0));
 return `<section class="m13-home m14-sanctuary"><header class="m13-greeting"><div><span class="m13-eyebrow">MASHUP · LE MULTIVERS À COLLECTIONNER</span><h1>${first==='Collectionneur'?'Ton sanctuaire':'Bienvenue, '+esc(first)}<span>.</span></h1></div><button class="m13-profile" data-view="profile" aria-label="Mon profil">${icon('profile')}</button></header>
 <section class="m13-hero" aria-labelledby="m14-hero-title"><div class="m13-orbits" aria-hidden="true"><i></i><i></i><i></i><span>✦</span></div><div class="m13-hero-copy"><span class="m13-label"><i></i> V15 · CARTES VIVANTES</span><h2 id="m14-hero-title">Tes légendes<br><em>prennent vie.</em></h2><p>Réunis l’extraordinaire.<br> Chaque carte ouvre un nouveau monde.</p></div>
 <div class="m13-showcase" data-featured-count="${featured.length}" aria-label="${featured.length?'Tes découvertes les plus rares':'Le début de ta collection'}"><div class="m14-celestial-dial" aria-hidden="true"><span></span><i>✧</i><b>✦</b></div>${featured.length?featured.map((c,i)=>`<div class="m13-show-card m13-show-card-${i}">${renderCard(c,{lazy:true,accessible:true})}</div>`).join(''):`<div class="m13-card-back"><span>✦</span><strong>MASHUP</strong><small>UN MONDE À DÉCOUVRIR</small><i aria-hidden="true"></i></div>`}<div class="m13-show-caption"><span aria-hidden="true">✧</span>${featured.length?'LES JOYAUX DE TA COLLECTION':'TA PREMIÈRE LÉGENDE T’ATTEND'}<span aria-hidden="true">✧</span></div></div>
 <div class="m13-hero-actions">${pack?`<button class="btn btn-primary m14-invoke" data-action="open-pack" data-pack="${esc(pack.id)}"><span>${icon('star')} ${pack.free&&!state.freePackUsed?'Ouvrir mon booster offert':'Ouvrir un booster'}</span>${icon('arrow')}</button>`:''}<button class="m13-text-button" data-view="collection">Découvrir ma collection ${icon('arrow')}</button></div><div class="m14-hero-signature" aria-hidden="true"><span></span> COLLECTIONNER L’IMPOSSIBLE <span></span></div></section>
 <section class="m14-chronicle" aria-label="Ton parcours"><div class="m14-section-heading"><span class="m13-eyebrow">TON HISTOIRE S’ÉCRIT</span><h2>Carte après carte.</h2><span class="m14-heading-ornament" aria-hidden="true">✦</span></div><div class="m13-stats"><button data-view="collection"><span>DÉCOUVERTES</span><strong>${discoveries}<small> / ${catalogue}</small></strong><i class="m13-progress" aria-hidden="true"><b style="width:${percent}%"></b></i><em>${percent} % du catalogue normal</em></button><button data-view="packs"><span>BOOSTERS OUVERTS</span><strong>${openings}<small> invocations</small></strong><em>Autant de mondes dévoilés</em></button><button data-view="arena"><span>VICTOIRES EN ARÈNE</span><strong>${victories}<small> victoires</small></strong><em>La prochaine t’attend ${icon('arrow')}</em></button></div></section>
 <nav class="m13-quick" aria-label="Continue ton aventure"><button data-view="arena"><span class="m13-quick-icon">${icon('arena')}</span><span><em>01 / L’ARÈNE</em><strong>Fais parler tes cartes.</strong><small>Prépare ton deck. Relève le défi.</small></span>${icon('arrow')}</button><button data-view="missions"><span class="m13-quick-icon">${icon('missions')}</span><span><em>02 / LES MISSIONS</em><strong>Un défi. Un pas de plus.</strong><small>Progresse et découvre tes récompenses.</small></span>${icon('arrow')}</button><button data-view="market"><span class="m13-quick-icon">${icon('market')}</span><span><em>03 / LE MARCHÉ</em><strong>La pièce qui te manque.</strong><small>Achète, vends et échange avec tes amis.</small></span>${icon('arrow')}</button></nav></section>`;
}
export function createMobilePresentation({getUser,getView,onNavigate}){
 let mode='auto',activeCard=null,frame=0,lastX=0,lastY=0,returnFocus=null;
 try{const saved=localStorage.getItem(KEY);if(['auto','high','eco'].includes(saved))mode=saved;}catch{}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const sidebarIcons={packs:'home',collection:'cards',arena:'arena',games:'arena',market:'market',missions:'missions',decks:'decks',online:'profile',profile:'profile',leaderboard:'star',achievements:'star',rules:'cards',admin:'settings',creator:'cards'};
 for(const item of document.querySelectorAll('.sidebar .nav-item[data-view]')){const slot=item.querySelector('.nav-icon');if(slot)slot.innerHTML=icon(sidebarIcons[item.dataset.view]||'star');}
 const nav=document.createElement('nav');nav.className='m13-dock';nav.setAttribute('aria-label','Navigation mobile');nav.hidden=true;
 const destinations=[['packs','home','Accueil'],['collection','cards','Collection'],['arena','arena','Arène'],['market','market','Marché']];
 nav.innerHTML=destinations.map(([v,i,label])=>`<button data-m13-view="${v}">${icon(i)}<span>${label}</span><i></i></button>`).join('')+`<button data-m13-menu>${icon('more')}<span>Plus</span><i></i></button>`;
 document.body.append(nav);
 const options=document.createElement('button');options.className='m13-options';options.setAttribute('aria-label','Menu et effets visuels');options.innerHTML=icon('settings');options.setAttribute('data-m13-menu','');document.querySelector('.topbar-right')?.prepend(options);
 const sheet=document.createElement('dialog');sheet.className='m13-sheet';sheet.setAttribute('aria-labelledby','m13-sheet-title');
 document.body.append(sheet);
 function quality(){
  const value=resolveQuality(mode,{reduced:reduced.matches,cores:navigator.hardwareConcurrency||0,memory:navigator.deviceMemory||0,saveData:!!navigator.connection?.saveData});
  document.documentElement.dataset.m13Quality=value;return value;
 }
 function resetCard(){if(activeCard){activeCard.classList.remove('m13-card-active');activeCard.style.removeProperty('--m13-x');activeCard.style.removeProperty('--m13-y');for(const key of ['--v14-sheen-angle','--v14-reflection-strength','--v14-foil-x','--v14-foil-y'])activeCard.style.removeProperty(key);activeCard=null;}if(frame)cancelAnimationFrame(frame);frame=0;}
 function close(){if(sheet.open)sheet.close();document.body.classList.remove('m13-sheet-open');returnFocus?.focus?.();}
 function menu(){
  returnFocus=document.activeElement;
  const links=[['games','arena','Ligue & Memory'],['missions','missions','Missions'],['decks','decks','Mes decks'],['online','profile','Mes amis'],['leaderboard','star','Classements'],['achievements','star','Succès'],['profile','profile','Mon profil'],['rules','cards','Règles']];
  if(getUser()?.role==='admin')links.push(['admin','settings','Administration'],['creator','cards','Atelier visuel']);
  sheet.innerHTML=`<div class="m13-sheet-handle" aria-hidden="true"></div><header><div><span class="m13-eyebrow">LES PORTES DU MULTIVERS</span><h2 id="m13-sheet-title">Poursuis l’aventure.</h2></div><button class="m13-close" data-m13-close aria-label="Fermer">×</button></header><div class="m13-menu-grid">${links.map(([v,i,label])=>`<button data-m13-view="${v}">${icon(i)}<span>${label}</span>${icon('arrow')}</button>`).join('')}</div><section class="m13-settings"><h3>${icon('settings')} Le confort de jeu</h3><label for="m13-quality">Effets visuels</label><select id="m13-quality"><option value="auto">Adaptatifs · recommandé</option><option value="high">Spectaculaires</option><option value="eco">Fluidité & autonomie</option></select><button class="m13-signout" data-action="logout">Se déconnecter</button><p>Les effets respectent toujours le réglage « Réduire les animations » de ton appareil.</p></section>`;
  sheet.querySelector('select').value=mode;sheet.showModal();document.body.classList.add('m13-sheet-open');
 }
 function click(e){
  const dest=e.target.closest('button[data-m13-view]');if(dest){close();onNavigate(dest.dataset.m13View);return;}
  if(e.target.closest('[data-m13-menu]'))menu();
  if(e.target.closest('[data-m13-close]')||e.target===sheet)close();
 }
 options.addEventListener('click',click);nav.addEventListener('click',click);sheet.addEventListener('click',click);sheet.addEventListener('close',()=>document.body.classList.remove('m13-sheet-open'));
 sheet.addEventListener('change',e=>{if(e.target.id!=='m13-quality')return;mode=e.target.value;try{localStorage.setItem(KEY,mode);}catch{}quality();resetCard();});
 function sync(){
  const user=getUser(),view=getView();nav.hidden=!user;document.body.dataset.m13View=view;document.body.classList.toggle('m13-authenticated',!!user);
  for(const b of nav.querySelectorAll('[data-m13-view]')){const selected=b.dataset.m13View===view;b.classList.toggle('is-active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
  nav.querySelector('[data-m13-menu]').classList.toggle('is-active',!destinations.some(([v])=>v===view));
  if(!user)close();resetCard();
 }
 // Pointer-driven light on a single card; no idle render loop, no scroll interception.
 document.addEventListener('pointermove',e=>{
  if(document.hidden||qualityValue()==='eco'||e.pointerType==='touch')return;
  const card=e.target.closest('.m13-show-card .tcg-card,.collection-grid .tcg-card,.detail-grid .tcg-card');
  if(!card||card.classList.contains('locked-card')){resetCard();return;}
  if(activeCard!==card){resetCard();activeCard=card;card.classList.add('m13-card-active');}
  const rect=card.getBoundingClientRect();lastX=Math.min(100,Math.max(0,(e.clientX-rect.left)/rect.width*100));lastY=Math.min(100,Math.max(0,(e.clientY-rect.top)/rect.height*100));
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(activeCard?.isConnected){activeCard.style.setProperty('--m13-x',lastX+'%');activeCard.style.setProperty('--m13-y',lastY+'%');const light=reflectionForTilt((50-lastY)*.28,(lastX-50)*.46);activeCard.style.setProperty('--v14-sheen-angle',light.angle+'deg');activeCard.style.setProperty('--v14-reflection-strength',String(light.strength));activeCard.style.setProperty('--v14-foil-x',light.foilX+'%');activeCard.style.setProperty('--v14-foil-y',light.foilY+'%');}});
 },{passive:true});
 function qualityValue(){return document.documentElement.dataset.m13Quality;}
 document.addEventListener('pointerout',e=>{if(activeCard&&!activeCard.contains(e.relatedTarget))resetCard();},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetCard();});
 reduced.addEventListener('change',()=>{quality();resetCard();});quality();sync();
 return {sync,close};
}
