/* Mashup V10.4 — journal du développement persistant et sécurisé.
   La lecture est ouverte aux joueurs connectés. Seul le serveur autorise l'admin à écrire.
   Aucune donnée de connexion ni de collection n'est stockée localement. */
export function createDevelopmentJournal({api,getUser,esc,toast}){
  let posts=[];
  let editingId=null;
  let saving=false;
  let fetching=null;
  let lastRead=0;
  const isAdmin=()=>getUser()?.role==='admin';
  const $=id=>document.getElementById(id);
  const projectPosts=items=>(Array.isArray(items)?items:[]).filter(p=>p&&typeof p.id==='string'&&typeof p.title==='string'&&typeof p.body==='string').slice(0,30);
  function dateText(input){
    const time=new Date(input||'');
    if(Number.isNaN(time.getTime()))return 'Annonce de l’équipe';
    try{return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(time);}
    catch{return 'Annonce de l’équipe';}
  }
  const escapeNewlines=value=>esc(value).replace(/\r\n?/g,'\n').replace(/\n/g,'<br>');
  // Pinned changelog is shipped with the client so every player sees the
  // current version even when developer-post history cannot be retrieved.
  function releaseMarkup(){
    return '<article class="dev-v12-release" aria-label="Dernière version de Mashup">'+
      '<div class="dev-v12-head"><div><div class="dev-v12-kicker">✦ NOTES DE VERSION · 5 NOVEMBRE 2026</div>'+
      '<h4>Mashup V15.3 — Vitrines &amp; Marché illustré</h4></div><span class="dev-v12-badge">DERNIÈRE VERSION · V15.3.0</span></div>'+
      '<p>Choisis les cartes de ta vitrine depuis une véritable galerie. Sur le Marché, toutes les cartes proposées à la vente affichent leurs illustrations, même les Secrètes non découvertes par l’acheteur.</p>'+
      '<div class="dev-v12-changes">'+
      '<span>Vitrine : sélection des trois cartes et de la carte principale depuis la collection filtrable.</span>'+
      '<span>Marché : illustrations visibles pour les annonces actives, y compris les Secrètes explicitement mises en vente.</span>'+
      '<span>Les Secrètes non découvertes restent invisibles dans l’album et le catalogue classique.</span>'+
      '<span>Plus grand ou plus faible : la règle et les choix restent visibles sur les petits écrans.</span>'+
      '<span>Arène : révélation, comparaison, impact et résultat ; les effets peuvent être passés immédiatement.</span>'+
      '<span>Échanges : deux collections visuelles avec recherche, quantités et contre-offres.</span>'+
      '<span>Six matériaux : papier mat, métal, irisation violette, or noble, chrome noir et chrome blanc.</span>'+
      '<span>Full Art, Gold, Secrète et Ultra Secrète : chaque finition possède sa propre composition.</span>'+
      '<span>Modes économie d’énergie et animations réduites préservés.</span>'+
      '<span>Recherche indexée et cartes déjà affichées conservées au chargement suivant.</span>'+
      '<span>Inspection tactile et clavier, lumière physique et inclinaison maîtrisée.</span>'+
      '<span>Un album paginé à compléter, avec la grille classique toujours disponible.</span>'+
      '<span>Un objet en relief : tranches métalliques et plusieurs plans en inspection tactile.</span>'+
      '</div>'+
      '<details class="dev-v12-history"><summary>Voir les améliorations des versions précédentes</summary>'+
      '<p><b>V13.0 :</b> nouvel accueil Éclipse, navigation mobile, effets adaptatifs, decks optimisés et réponses réseau fiabilisées.</p>'+
      '<p><b>V12.1 :</b> galerie de patrons et archivage réversible des cartes dans l’administration.</p>'+
      '<p><b>V12.0 :</b> harmonisation mobile, finitions de cartes affinées, boosters plus fluides et fiabilisation de la collection.</p>'+
      '<p><b>V11.4 :</b> nouveau Marché illustré, choix des cartes dans une collection filtrable, fiches complètes dans les annonces.</p>'+
      '<p><b>V11.3 :</b> refonte de l’identité visuelle mobile et Studio illustrations dans l’Atelier : cadrage individuel, import en série et prise en charge des cartes secrètes.</p>'+
      '<p><b>V11.2.4 :</b> retournement de booster plus léger sur Android, texte et images lisibles, effets mieux synchronisés.</p>'+
      '<p><b>V11.2.3 :</b> fermeture accidentelle d’un booster empêchée, retour vers l’onglet boosters après validation.</p>'+
      '</details></article>';
  }
  function markup(){
    const editable=isAdmin();
    const list=posts.length?posts.map((p,i)=>`
      <article class="dev-message" aria-labelledby="dev-post-title-${i}">
        <div class="dev-message-ribbon"><span>✦ MESSAGE DU DÉVELOPPEUR</span><time>${esc(dateText(p.updatedAt||p.createdAt))}</time></div>
        <h4 id="dev-post-title-${i}">${esc(p.title)}</h4>
        <p class="dev-message-body">${escapeNewlines(p.body)}</p>
        ${editable?`<div class="dev-message-actions"><button class="btn btn-sm" type="button" data-dev-action="edit" data-id="${esc(p.id)}">Modifier</button><button class="btn btn-sm btn-danger" type="button" data-dev-action="delete" data-id="${esc(p.id)}">Supprimer</button></div>`:''}
      </article>`).join(''):`<div class="dev-empty"><span aria-hidden="true">✧</span><p>Les annonces et les prochaines nouveautés de Mashup apparaîtront ici.</p></div>`;
    const editor=editable?`<form id="dev-editor" class="dev-editor" autocomplete="off">
      <div class="dev-editor-heading"><strong>✎ Publier une annonce</strong><small>Visible par tous les joueurs connectés.</small></div>
      <label for="dev-title">Titre<input id="dev-title" type="text" name="title" maxlength="80" minlength="3" placeholder="Ex. : La prochaine version arrive" required></label>
      <label for="dev-body">Message<textarea id="dev-body" name="body" rows="4" maxlength="1200" placeholder="Décris les nouveautés, les corrections ou les prochaines étapes…" required></textarea></label>
      <div class="dev-editor-actions"><button type="submit" id="dev-save" class="btn btn-primary">Publier le message</button><button type="button" class="btn btn-quiet" id="dev-cancel" data-dev-action="cancel" hidden>Annuler la modification</button></div>
    </form>`:'';
    return `<section id="development-journal" class="dev-journal" aria-label="Journal du développement">
      <div class="dev-journal-heading"><div><div class="eyebrow">✦ LES COULISSES DE MASHUP</div><h3>Journal du <em>développement.</em></h3><p>Nouvelles versions, projets et messages de l’équipe, au même endroit.</p></div>
        <button type="button" class="btn btn-sm dev-refresh" data-dev-action="refresh" aria-label="Actualiser les annonces">↻ Actualiser</button></div>
      ${releaseMarkup()}
      ${editor}
      <div class="dev-message-list">${list}</div>
    </section>`;
  }
  function rerender(){
    const root=$('development-journal');
    if(root)root.outerHTML=markup();
  }
  function setPosts(items){
    posts=projectPosts(items);
    lastRead=Date.now();
    editingId=null;
    rerender();
  }
  async function refresh(force=false){
    if(!getUser())return;
    if(fetching)return fetching;
    if(!force&&(Date.now()-lastRead<75000||document.activeElement?.closest?.('#dev-editor')))return;
    fetching=(async()=>{
      try{
        const response=await api('/api/dev-posts');
        posts=projectPosts(response.posts);
        lastRead=Date.now();
        if(!editingId)rerender();
        else if($('development-journal'))updateListOnly();
        if(force)toast('Annonces actualisées.');
      }catch(e){if(force)toast(e.message||'Impossible d’actualiser les annonces.',true);}
      finally{fetching=null;}
    })();
    return fetching;
  }
  function updateListOnly(){
    const old=$('development-journal')?.querySelector('.dev-message-list');
    if(!old)return;
    // Keep the admin draft while syncing published announcements.
    const root=document.createElement('div');
    root.innerHTML=markup();
    const next=root.querySelector('.dev-message-list');
    if(next)old.replaceWith(next);
  }
  function resetEditor(){
    editingId=null;
    const form=$('dev-editor');if(form)form.reset();
    const save=$('dev-save');if(save)save.textContent='Publier le message';
    const cancel=$('dev-cancel');if(cancel)cancel.hidden=true;
  }
  async function publish(){
    if(!isAdmin()||saving)return;
    const title=$('dev-title')?.value.trim()||'';
    const body=$('dev-body')?.value.trim()||'';
    if(title.length<3||title.length>80){toast('Le titre doit faire entre 3 et 80 caractères.',true);return;}
    if(body.length<1||body.length>1200){toast('Le message doit faire entre 1 et 1200 caractères.',true);return;}
    saving=true;const button=$('dev-save');if(button)button.disabled=true;
    try{
      const response=await api('/api/admin/dev-posts',{action:editingId?'edit':'publish',id:editingId||undefined,title,body});
      resetEditor();posts=projectPosts(response.posts);lastRead=Date.now();rerender();
      toast('Message du développeur publié pour tous les joueurs.');
    }catch(e){toast(e.message||'Publication impossible.',true);}
    finally{saving=false;const save=$('dev-save');if(save)save.disabled=false;}
  }
  async function remove(id){
    if(!isAdmin()||saving||!posts.some(p=>p.id===id))return;
    if(!confirm('Supprimer ce message du journal pour tous les joueurs ?'))return;
    saving=true;
    try{const result=await api('/api/admin/dev-posts',{action:'delete',id});posts=projectPosts(result.posts);lastRead=Date.now();resetEditor();rerender();toast('Message supprimé.');}
    catch(e){toast(e.message||'Suppression impossible.',true);}
    finally{saving=false;}
  }
  function beginEdit(id){
    if(!isAdmin()||saving)return;
    const post=posts.find(p=>p.id===id);if(!post)return;
    editingId=post.id;
    const title=$('dev-title'),body=$('dev-body');if(!title||!body)return;
    title.value=post.title;body.value=post.body;
    if($('dev-save'))$('dev-save').textContent='Enregistrer les modifications';
    if($('dev-cancel'))$('dev-cancel').hidden=false;
    title.focus();$('dev-editor')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  document.addEventListener('submit',event=>{
    if(event.target?.id!=='dev-editor')return;
    event.preventDefault();publish();
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-dev-action]');
    if(!button)return;
    const action=button.dataset.devAction,id=button.dataset.id;
    if(action==='refresh')refresh(true);
    else if(action==='cancel')resetEditor();
    else if(action==='edit')beginEdit(id);
    else if(action==='delete')remove(id);
  });
  return {markup,setPosts,refresh};
}
