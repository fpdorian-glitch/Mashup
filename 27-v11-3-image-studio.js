/* Mashup V11.3 — Studio visuels.
   Admin-only interface. Bulk files are reviewed before any save; ambiguous
   filenames never modify cards. Reuses the existing secured cards endpoint.
*/
export function createImageStudio({getCards,getAdmin,escapeHtml,openCropper,saveCard,notify}){
  let query='',missingOnly=true,limit=12,pending=[],busy=false;
  const $=id=>document.getElementById(id);
  function key(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,'');
  }
  function hasArt(c){return !!(c.art&&String(c.art).trim());}
  function label(c){return escapeHtml(c.name||'Carte')+' · '+escapeHtml(c.family||'Univers')+' · S'+String(Number(c.editionSeries)||1).padStart(2,'0');}
  function markup(){
    if(!getAdmin())return '';
    return '<section id="image-studio" class="panel studio-shell" aria-label="Studio des illustrations">'+
      '<div class="studio-lead"><div><span class="eyebrow">MASHUP · STUDIO VISUELS</span>'+
      '<h3>Donne vie à tes cartes.</h3><p>Retrouve une carte, ajoute son illustration et ajuste son cadrage sans toucher aux statistiques ni à la rareté.</p></div>'+
      '<span class="studio-lead-mark" aria-hidden="true">✧</span></div>'+
      '<div class="studio-controls"><label>Retrouver une carte<input type="search" id="studio-query" placeholder="Nom, univers ou numéro…" autocomplete="off"></label>'+
      '<label>Afficher<select id="studio-visibility"><option value="missing">Cartes sans image</option><option value="all">Toutes les cartes</option></select></label></div>'+
      '<div class="studio-grid" id="studio-grid" aria-live="polite"></div><div id="studio-grid-more" class="studio-more"></div>'+
      '<div class="studio-batch"><span class="eyebrow">IMPORTER EN SÉRIE</span><h4>Plusieurs images d’un coup</h4>'+
      '<p>Renomme tes fichiers comme les cartes (ex. <b>Hinata.png</b>) ou utilise leur identifiant exact. Vérifie les correspondances avant publication. Maximum 6 fichiers par lot.</p>'+
      '<label class="btn studio-batch-file">＋ Choisir plusieurs images <input id="studio-batch-files" type="file" accept="image/png,image/jpeg,image/webp" multiple></label>'+
      '<div id="studio-batch-review" class="studio-review" aria-live="polite"></div>'+
      '<p class="small-note">Import en série : cadrage centré automatique. Pour ajuster le zoom ou la position, utilise « Recadrer » sur une carte.</p></div>'+
      '</section>';
  }
  function refresh(){
    if(!getAdmin())return;
    const grid=$('studio-grid'),more=$('studio-grid-more');
    if(!grid||!more)return;
    const cards=getCards().filter(c=>c&&!c.hidden);
    const q=key(query);
    const matches=cards.filter(c=>(!missingOnly||!hasArt(c))&&(!q||key(c.name+' '+c.family+' '+(c.editionNumber||'')).includes(q)||key(c.id).includes(q)))
      .sort((a,b)=>Number(hasArt(a))-Number(hasArt(b))||String(a.name||'').localeCompare(String(b.name||''),'fr'));
    const shown=matches.slice(0,limit);
    grid.innerHTML=shown.length?shown.map(c=>{
      const art=hasArt(c);
      const visual=art?'<img src="'+escapeHtml(c.art)+'" alt="" loading="lazy" decoding="async">':
        '<span class="studio-placeholder" aria-hidden="true">'+escapeHtml(c.icon||'✦')+'</span>';
      return '<article class="studio-card"><div class="studio-art">'+visual+'</div><div class="studio-card-copy">'+
        '<strong title="'+escapeHtml(c.name)+'">'+escapeHtml(c.name)+'</strong>'+
        '<small>'+escapeHtml(c.family||'Univers')+' · S'+String(Number(c.editionSeries)||1).padStart(2,'0')+'</small>'+
        '<span class="studio-status '+(art?'is-ready':'')+'">'+(art?'✓ Image présente':'◌ Sans illustration')+'</span>'+
        '<label class="studio-upload-btn">'+(art?'✎ Recadrer / remplacer':'＋ Ajouter une image')+
        '<input type="file" accept="image/png,image/jpeg,image/webp" data-studio-card-file="'+escapeHtml(c.id)+'" aria-label="Importer une illustration pour '+escapeHtml(c.name)+'"></label>'+
        '</div></article>';
    }).join(''):'<div class="studio-no-results">Aucune carte correspondante. Essaie un autre nom ou sélectionne « Toutes les cartes ».</div>';
    const remaining=matches.length-shown.length;
    more.innerHTML='<small>'+shown.length+' / '+matches.length+' carte(s) affichée(s)</small>'+
      (remaining>0?'<button class="btn btn-sm" data-action="studio-more" type="button">Afficher '+Math.min(12,remaining)+' autres cartes ↗</button>':'');
  }
  function search(value){query=String(value||'');limit=12;refresh();}
  function visibility(value){missingOnly=value!=='all';limit=12;refresh();}
  function more(){limit+=12;refresh();}
  async function single(file,id){
    if(!getAdmin()||!file||busy)return;
    if(!getCards().some(c=>c.id===id))throw new Error('Carte introuvable.');
    await openCropper(file,id);
  }
  function prepare(files){
    if(!getAdmin()||busy)return;
    const review=$('studio-batch-review');
    if(!review)return;
    pending=[];
    const selected=Array.from(files||[]);
    if(!selected.length){review.textContent='Aucun fichier sélectionné.';return;}
    if(selected.length>6){review.textContent='Limite : 6 images par lot. Choisis moins de fichiers.';return;}
    const seen=new Set(),rows=[];
    for(const file of selected){
      const stem=String(file.name||'').replace(/\.(png|jpe?g|webp)$/i,'');
      const k=key(stem);
      const matches=getCards().filter(c=>c&&!c.hidden&&(key(c.id)===k||key(c.name)===k));
      let status='';
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024)status='Format invalide ou image de plus de 15 Mo';
      else if(matches.length===0)status='Aucune correspondance : renomme le fichier';
      else if(matches.length>1)status='Nom ambigu : utilise l’identifiant de la carte';
      else if(seen.has(matches[0].id))status='Doublon dans ce lot';
      else{const c=matches[0];seen.add(c.id);pending.push({file,id:c.id});status='✓ '+label(c)+(hasArt(c)?' (remplacement)':'');}
      rows.push('<div class="studio-match"><b>'+escapeHtml(file.name)+'</b><span>'+status+'</span></div>');
    }
    review.innerHTML='<div class="studio-match-list">'+rows.join('')+'</div>'+
      (pending.length?'<button type="button" class="btn btn-primary" data-action="studio-batch-confirm">Enregistrer '+pending.length+' illustration(s) ↗</button>':'')+
      '<small>Seules les correspondances validées seront importées. Les fichiers sans correspondance sont ignorés.</small>';
  }
  async function cropCentered(file){
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Image illisible'));image.src=url;});
      const canvas=document.createElement('canvas');canvas.width=720;canvas.height=600;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponible');
      ctx.imageSmoothingQuality='high';
      const scale=Math.max(canvas.width/image.width,canvas.height/image.height);
      const width=image.width*scale,height=image.height*scale;
      ctx.drawImage(image,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
      let data=canvas.toDataURL('image/jpeg',.76);
      if(data.length>650000)data=canvas.toDataURL('image/jpeg',.62);
      if(data.length>950000)throw new Error('Image trop lourde après recadrage');
      return data;
    }finally{URL.revokeObjectURL(url);}
  }
  async function confirmBatch(){
    if(!getAdmin()||busy||!pending.length)return;
    const items=pending.slice();
    const replaces=items.filter(({id})=>hasArt(getCards().find(c=>c.id===id)||{})).length;
    if(!window.confirm('Publier '+items.length+' image(s) sur Mashup'+(replaces?' dont '+replaces+' remplacement(s)':'')+' ?'))return;
    busy=true;
    const review=$('studio-batch-review');let success=0,errors=[];
    if(review)review.textContent='Importation : 0 / '+items.length+'…';
    try{
      for(let i=0;i<items.length;i++){
        const item=items[i],card=getCards().find(c=>c.id===item.id);
        if(!card){errors.push(item.file.name+' : carte introuvable');continue;}
        try{
          const data=await cropCentered(item.file);
          await saveCard(card,data);
          success++;
        }catch(error){errors.push(item.file.name+' : '+String(error.message||'échec de l’import'));}
        if(review)review.textContent='Importation : '+(i+1)+' / '+items.length+'…';
      }
      pending=[];refresh();
      if(review)review.innerHTML='<p><strong>'+success+' illustration(s) enregistrée(s).</strong></p>'+
        (errors.length?'<p class="studio-errors">'+errors.map(escapeHtml).join(' · ')+'</p>':'')+
        '<p>Tu peux recadrer une image individuellement depuis le studio.</p>';
      notify(success+' illustration(s) mise(s) à jour'+(errors.length?' · '+errors.length+' échec(s)':'')+'.',!!errors.length);
    }finally{busy=false;}
  }
  return {markup,refresh,search,visibility,more,single,prepare,confirmBatch};
}
