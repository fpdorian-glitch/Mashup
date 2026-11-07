/* V16 application furniture. Card markup/materials and game rules live elsewhere. */
import {icon} from './35-mobile-premium.js?v=16.0.0';
export const escapeUI=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles={packs:'Accueil',collection:'Collection',games:'Jouer',arena:'Arène',market:'Marché',menu:'Menu',journal:'Le journal',profile:'Mon profil',missions:'Missions',decks:'Mes decks',online:'Mes amis',leaderboard:'Classements',achievements:'Succès',rules:'Comment jouer',admin:'Administration',creator:'Atelier'};
const routeButton=(view,name,symbol,detail='')=>'<button class="v16-mode" type="button" data-v16-view="'+view+'"><span class="v16-mode-icon">'+icon(symbol)+'</span><span><strong>'+escapeUI(name)+'</strong>'+(detail?'<small>'+escapeUI(detail)+'</small>':'')+'</span>'+icon('arrow')+'</button>';

export function playerSeries(series,user){return (Array.isArray(series)?series:[]).filter(s=>user?.role==='admin'||s.visible!==false);}
export function galleryPacks(packs,series){
 const allowed=new Set((series||[]).filter(s=>s.visible!==false&&s.boosterEnabled!==false).map(s=>Number(s.number)));
 return (packs||[]).filter(p=>p&&p.visible!==false).flatMap(p=>{
  if(p.filterMode!=='series')return [p];
  const selected=(p.allowedSeries||[]).filter(id=>allowed.has(Number(id)));
  return selected.length?[{...p,allowedSeries:selected}]:[];
 });
}
export function menuMarkup(user={}){
 return '<section class="v16-screen v16-menu" data-v16-fixed><header class="v16-section-heading"><span class="v16-kicker">TON UNIVERS</span><h1>À toi de jouer.</h1><p>Ton parcours, tes cartes, tes prochains défis.</p></header><div class="v16-scroll v16-menu-grid" data-v16-scroll="menu">'+
  routeButton('profile','Mon profil','profile','Avatar, vitrine et personnalisation')+routeButton('missions','Missions','missions','Défis et récompenses')+routeButton('decks','Mes decks','decks','Classique et Double')+routeButton('online','Mes amis','profile','Profils et duels')+routeButton('achievements','Succès','star','Ton parcours de collectionneur')+routeButton('leaderboard','Classements','star','Les exploits du multivers')+routeButton('journal','Journal','cards','Nouveautés et annonces')+routeButton('rules','Comment jouer','cards','Toutes les règles')+
  (user.role==='admin'?routeButton('admin','Administration','settings','Comptes, séries et économie')+routeButton('creator','Atelier','cards','Cartes et illustrations'):'')+
  '<button class="v16-mode" data-v16-action="settings">'+icon('settings')+'<span><strong>Paramètres</strong><small>Effets, mises à jour et connexion</small></span>'+icon('arrow')+'</button></div></section>';
}
export function playHubMarkup(){
 const game=(id,title,caption,symbol,tag)=>'<button type="button" class="v16-play-tile is-'+id+'" data-v16-game="'+id+'"><span class="v16-play-symbol">'+icon(symbol)+'</span><span class="v16-kicker">'+tag+'</span><strong>'+title+'</strong><small>'+caption+'</small><i aria-hidden="true">'+icon('arrow')+'</i></button>';
 return '<section class="v16-screen v16-play-hub" data-v16-fixed><header class="v16-section-heading"><span class="v16-kicker">LE MULTIVERS T’ATTEND</span><h1>Choisis ton aventure.</h1></header><div class="v16-play-grid v16-scroll" data-v16-scroll="play">'+
  game('match','Mashup Match','100 niveaux · 10 mondes','star','RÉVEILLE LES MONDES')+game('arena','Arène IA','Classique et Double','arena','FAIS PARLER TES CARTES')+game('pvp','Duels en ligne','Affronte tes amis','arena','LE DÉFI EST LANCÉ')+game('casino','Casino','Combats IA et paris','star','CHOISIS TON CAMP')+game('league','Ligue IA','Saisons et combattants','decks','LE SOMMET T’ATTEND')+game('mini','Mini-jeux','Memory et défi quotidien','cards','UNE PAUSE, UN DÉFI')+'</div></section>';
}

/** A bounded memory of list controls and scroll positions. No storage or wallet. */
export function captureScreen(page){
 if(!page)return null;const fields=[];
 for(const node of page.querySelectorAll('input[id],select[id]')){
  if(!/^(collection-|v11-filter-|deck-.*(?:search|filter)|admin-card-search)/.test(node.id)||['password','file','hidden'].includes(node.type))continue;
  fields.push({id:node.id,value:node.value});if(fields.length>=24)break;
 }
 return {fields,scroll:[...page.querySelectorAll('[data-v16-scroll]')].slice(0,12).map(n=>({key:n.dataset.v16Scroll,top:n.scrollTop,left:n.scrollLeft}))};
}
export function restoreScreen(page,saved){
 if(!page||!saved)return;
 for(const item of saved.fields||[]){const n=page.ownerDocument.getElementById(item.id);if(n&&page.contains(n)&&n.value!==item.value){n.value=item.value;n.dispatchEvent(new Event(n.tagName==='SELECT'?'change':'input',{bubbles:true}));}}
 const apply=()=>{for(const item of saved.scroll||[]){const n=[...page.querySelectorAll('[data-v16-scroll]')].find(n=>n.dataset.v16Scroll===item.key);if(n){n.scrollTop=item.top;n.scrollLeft=item.left;}}};
 apply();page.ownerDocument.defaultView?.requestAnimationFrame?.(apply);
}

export function createAppShell({getUser,getAvatar=()=>'',getView,onNavigate,onBack,onGame,onAction,canBack=()=>false,onPanel=()=>{}}){
 const page=document.getElementById('page'),doc=page.ownerDocument,win=doc.defaultView;
 const dock=doc.createElement('nav');dock.className='v16-dock';dock.hidden=true;dock.setAttribute('aria-label','Navigation principale');
 dock.innerHTML=[['packs','home','Accueil'],['collection','cards','Collection'],['games','arena','Jouer'],['market','market','Marché'],['menu','more','Menu']].map(([id,symbol,label])=>'<button type="button" data-v16-view="'+id+'">'+icon(symbol)+'<span>'+label+'</span><i></i></button>').join('');doc.body.append(dock);
 doc.body.classList.add('v16-app');
 const top=doc.querySelector('.topbar'),legacyOptions=doc.querySelector('.m13-options');
 top.innerHTML='<button type="button" class="v16-back v16-icon" data-v16-action="back" aria-label="Revenir à l’écran précédent">'+icon('arrow')+'</button><button type="button" class="v16-avatar" data-v16-view="profile" aria-label="Mon profil"><span id="v16-avatar">M</span></button><div class="v16-identity"><small id="v16-welcome">LE MULTIVERS À COLLECTIONNER</small><strong id="v16-title">Mashup</strong></div><div class="resource resource-coin" title="Crédits confirmés"><span>◉</span><strong id="coin-balance">0</strong></div><div class="resource resource-dust" title="Éclats"><span>✧</span><strong id="dust-balance">0</strong></div><button type="button" class="v16-icon" data-v16-action="notifications" aria-label="Notifications"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4"/></svg><i id="v16-notification-dot" hidden></i></button><button type="button" class="v16-icon" data-v16-action="settings" aria-label="Paramètres">'+icon('settings')+'</button><span id="breadcrumb-current" hidden></span><button id="account-button" hidden></button><button id="mashup-update-check" hidden></button>';
 if(legacyOptions)top.append(legacyOptions);
 let frame=0,processing=false,pager=null;const paneState=new Map();
 function click(event){
  const button=event.target.closest?.('button[data-v16-view],button[data-v16-action],button[data-v16-game],button[data-v16-pane]');if(!button)return;
  if(button.dataset.v16View){event.preventDefault();onNavigate(button.dataset.v16View);}
  else if(button.dataset.v16Game)onGame(button.dataset.v16Game);
  else if(button.dataset.v16Pane!==undefined)selectPane(Number(button.dataset.v16Pane));
  else if(button.dataset.v16Action==='back')onBack();else onAction(button.dataset.v16Action);
 }
 doc.addEventListener('click',click);
 function tabKey(event){const tab=event.target.closest?.('[data-v16-pane]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!pager)return;event.preventDefault();const i=Number(tab.dataset.v16Pane),n=pager.buttons.length,next=event.key==='Home'?0:event.key==='End'?n-1:(i+(event.key==='ArrowLeft'?-1:1)+n)%n;selectPane(next);pager.buttons[next].focus();}
 doc.addEventListener('keydown',tabKey);
 function viewport(){const vv=win.visualViewport;doc.documentElement.style.setProperty('--v16-width',Math.round(doc.documentElement.clientWidth)+'px');doc.documentElement.style.setProperty('--v16-height',Math.round(vv?.height||win.innerHeight)+'px');const keyboard=(vv?.height||win.innerHeight)<win.innerHeight*.76&&['INPUT','TEXTAREA','SELECT'].includes(doc.activeElement?.tagName);doc.body.classList.toggle('v16-keyboard',keyboard);}
 win.addEventListener('resize',viewport);win.visualViewport?.addEventListener('resize',viewport);doc.addEventListener('focusin',viewport);doc.addEventListener('focusout',viewport);
 function sync(){
  const user=getUser(),view=getView();dock.hidden=!user;doc.body.classList.toggle('v16-authenticated',!!user);doc.body.dataset.v16View=view;
  const main=['packs','collection','games','market','menu'].includes(view)?view:view==='arena'?'games':'menu';
  for(const button of dock.querySelectorAll('[data-v16-view]')){const active=button.dataset.v16View===main;button.classList.toggle('is-active',active);active?button.setAttribute('aria-current','page'):button.removeAttribute('aria-current');}
  const back=canBack()||!['packs','collection','games','market','menu'].includes(view);top.querySelector('.v16-back').hidden=!back;top.querySelector('.v16-avatar').hidden=back;
  const avatar=doc.getElementById('v16-avatar'),value=getAvatar();avatar.replaceChildren();if(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)){const img=doc.createElement('img');img.src=value;img.alt='';avatar.append(img);}else avatar.textContent=value&&value.length<12?value:String(user?.pseudo||'M').slice(0,1).toUpperCase();
  doc.getElementById('v16-title').textContent=view==='packs'?'Bonjour, '+String(user?.pseudo||'Collectionneur').split(' ')[0]:titles[view]||'Mashup';
  doc.getElementById('v16-welcome').textContent=view==='packs'?'TON AVENTURE COMMENCE ICI':'MASHUP · LE MULTIVERS';viewport();schedule();
 }
 function selectPane(index){
  if(!pager||!Number.isSafeInteger(index)||!pager.panels[index])return;
  pager.panels.forEach((panel,i)=>{panel.hidden=i!==index;});pager.buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});paneState.set(getView(),index);onPanel(getView(),index,pager.panels[index]);
 }
 function appendPanel(panel,view){
   const i=pager.panels.length;let title=panel.querySelector('h3,h2,h4')?.textContent||panel.querySelector('.eyebrow')?.textContent||'Informations';
   title=title.trim().replace(/\s+/g,' ').slice(0,38);
   const button=doc.createElement('button');button.type='button';button.textContent=title;button.dataset.v16Pane=String(i);button.id='v16-tab-'+i;button.setAttribute('role','tab');button.setAttribute('aria-controls','v16-pane-'+i);pager.tabs.append(button);pager.buttons.push(button);
   const wrapper=doc.createElement('div');wrapper.className='v16-pane v16-scroll';wrapper.id='v16-pane-'+i;wrapper.dataset.v16Scroll=view+'-'+i;wrapper.setAttribute('role','tabpanel');wrapper.setAttribute('aria-labelledby',button.id);wrapper.append(panel);pager.body.append(wrapper);pager.panels.push(wrapper);
 }
 function addPanels(nodes,view){
  const panels=nodes.filter(n=>n.nodeType===1);if(!panels.length)return;
  const frame=doc.createElement('section');frame.className='v16-scaffold';frame.dataset.v16Fixed='';
  const tabs=doc.createElement('nav');tabs.className='v16-subnav';tabs.setAttribute('aria-label','Rubriques de '+(titles[view]||view));tabs.setAttribute('role','tablist');
  const body=doc.createElement('div');body.className='v16-pane-host';
  pager={panels:[],buttons:[],body,tabs};for(const panel of panels)appendPanel(panel,view);
  frame.append(tabs,body);page.append(frame);selectPane(Math.min(paneState.get(view)||0,pager.panels.length-1));
 }
 function adaptMatch(){
  const campaign=page.querySelector('.mm-campaign');if(campaign&&!campaign.dataset.v16Adapted){
   campaign.dataset.v16Adapted='1';const info=doc.createElement('details');info.className='v16-game-info';info.innerHTML='<summary>Progression et effets <span>⌄</span></summary><div></div>';
   for(const selector of ['.mm-campaign-metrics','.mm-comfort','.mm-training-note','.mm156-online-entry']){const node=campaign.querySelector(selector);if(node)info.lastElementChild.append(node);}
   campaign.insertBefore(info,campaign.querySelector('.mm-worlds'));campaign.querySelector('.mm-worlds')?.setAttribute('data-v16-scroll','match-worlds');
  }
  const play=page.querySelector('.mm-play');if(play&&!play.dataset.v16Adapted){play.dataset.v16Adapted='1';const help=play.querySelector('[data-mm-help]'),input=play.querySelector('.mm-input-help');if(help&&input)help.append(input);}
 }
 function reconcile(){
  frame=0;if(processing||!getUser())return;processing=true;
  try{
   const view=getView();doc.body.classList.toggle('v16-focus',!!page.querySelector('.mm-play,.rb-arena,.games-mini-playing'));
   if(view==='games'){
    if(page.querySelector('.mm-app')){adaptMatch();return;}
    if(page.querySelector(':scope > [data-v16-fixed]'))return;
    const nodes=[...page.children],header=doc.createElement('div');header.className='v16-game-header';
    for(const node of nodes.filter(n=>n.matches('.page-lead,nav,#games-casino-clock-panel'))){
     if(node.matches('.page-lead')){const info=doc.createElement('details');info.className='v16-game-info';info.innerHTML='<summary>Informations du mode <span>⌄</span></summary><div></div>';info.lastElementChild.append(node);header.append(info);}else header.append(node);
    }
    for(const layout of page.querySelectorAll(':scope > .games-mini-grid')){for(const child of [...layout.children])page.insertBefore(child,layout);layout.remove();}
    addPanels([...page.children],view);page.querySelector('.v16-scaffold')?.prepend(header);return;
   }
   if(page.querySelector(':scope > [data-v16-fixed]')){
    const extras=[...page.children].filter(n=>!n.hasAttribute('data-v16-fixed')&&!n.matches('.v16-legacy-intro'));
    if(pager&&extras.length){for(const extra of extras)appendPanel(extra,view);selectPane(Math.min(paneState.get(view)||0,pager.panels.length-1));}return;
   }
   pager=null;
   if(['packs','collection','market','menu','journal'].includes(view))return;
   const lead=page.querySelector(':scope > .page-lead');if(lead){lead.classList.add('v16-legacy-intro');}
   if(['profile','creator'].includes(view)){
    const layout=page.querySelector(':scope > .profile-layout,:scope > .creator-layout');
    if(layout){for(const child of [...layout.children])page.insertBefore(child,layout);layout.remove();}
   }
   const panels=[...page.children].filter(n=>n!==lead);
   if(view==='arena'&&page.querySelector('.rb-arena,#pvp-arena-root'))return;
   // Keep campaign setup switches together, while deck and ladder become tabs.
   if(view==='arena'){
    const controls=doc.createElement('section');controls.className='v16-arena-start';controls.innerHTML='<h3>Préparer le combat</h3>';
    for(const n of panels.filter(n=>n.matches('.arena-main-switch,.mode-tabs')))controls.append(n);
    const layout=page.querySelector('.arena-layout');if(layout){const first=layout.firstElementChild;if(first)controls.append(first);for(const rest of [...layout.children])page.append(rest);layout.remove();}
    const remaining=[...page.children].filter(n=>n!==lead&&n!==controls&&!n.matches('.arena-main-switch,.mode-tabs,.arena-layout'));addPanels([controls,...remaining],view);return;
   }
   if(panels.length)addPanels(panels,view);
  }finally{processing=false;}
 }
 function schedule(){if(!frame)frame=win.requestAnimationFrame(reconcile);}
 const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'))schedule();});observer.observe(page,{childList:true,subtree:true});
 viewport();sync();
 return {sync,reconcile,schedule,reveal(node){if(!node)return;reconcile();const pane=node.closest('.v16-pane');if(pane&&pager){const index=pager.panels.indexOf(pane);if(index>=0)selectPane(index);}node.scrollIntoView?.({block:'start',behavior:'instant'});},clear(){paneState.clear();pager=null;page.replaceChildren();doc.body.classList.remove('v16-focus');},destroy(){observer.disconnect();if(frame)win.cancelAnimationFrame(frame);doc.removeEventListener('click',click);doc.removeEventListener('keydown',tabKey);win.removeEventListener('resize',viewport);win.visualViewport?.removeEventListener('resize',viewport);doc.removeEventListener('focusin',viewport);doc.removeEventListener('focusout',viewport);dock.remove();}};
}
