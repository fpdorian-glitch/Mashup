/* Mashup Art Factory — optional secure image generation UI.
   This browser code never sees the OpenAI API key. Only a Cloudflare Worker
   with secrets configured server-side may call the paid image API. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const anchor=$('prompt');
if(!anchor)return;
const style=document.createElement('style');
style.textContent='.ai-box{margin:16px 0;padding:14px;border:1px solid #759b8588;border-radius:13px;background:linear-gradient(145deg,#203d3d,#13272d)}.ai-box h3{font-size:16px;color:#edf2bd;margin:2px 0 6px}.ai-box p{font-size:11px;color:#c2d8cf;line-height:1.55;margin:5px 0 13px}.ai-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ai-box label{display:block;color:#c2dbd0;font-size:11px;font-weight:800;margin:9px 0}.ai-box input{display:block;width:100%;background:#091d24;border:1px solid #68847b;border-radius:9px;color:#f3f6f1;padding:10px;margin-top:5px;font-size:12px;min-height:40px}.ai-box .actions{margin:12px 0 0}.ai-box .notice{margin-top:12px;white-space:normal}.ai-box .minor{opacity:.9}.ai-box .minor a{color:#e6e7ad}.ai-box .btn{min-width:100px}.ai-box summary{cursor:pointer;font-size:12px;font-weight:800;color:#d5ebd8;margin:12px 0 5px}@media(max-width:580px){.ai-row{grid-template-columns:1fr}.ai-box .actions .btn{flex:1}}';
document.head.append(style);
const box=document.createElement('section');box.className='ai-box';
box.innerHTML='<span style="font-size:10px;color:#cbebac;letter-spacing:.12em;font-weight:850">MASHUP / GÉNÉRATION ORIGINALE</span>'+
 '<h3>Générer l’image directement dans Art Factory</h3>'+
 '<p>Option automatique via une passerelle Cloudflare sécurisée. La clé API est conservée dans le Worker, jamais ici. Les créations sont facturées par le fournisseur d’images ; une confirmation est demandée pour les séries.</p>'+
 '<div class="ai-row"><label>Adresse du Worker<input id="ai-url" type="url" spellcheck="false" placeholder="https://xxx.workers.dev" autocomplete="url"></label>'+
 '<label>Code d’accès privé<input id="ai-token" type="password" spellcheck="false" autocomplete="off" placeholder="Code secret du Worker"></label></div>'+
 '<div class="actions"><button class="btn" id="ai-test" type="button">Tester</button>'+
 '<button class="btn btn-primary" id="ai-one" type="button">✧ Générer cette carte</button>'+
 '<button class="btn" id="ai-batch" type="button">✧ Générer 3 cartes + ZIP</button>'+
 '<button class="btn" id="ai-stop" type="button" disabled>■ Annuler</button></div>'+
 '<div id="ai-status" class="notice" role="status" aria-live="polite">Aucun service IA connecté pour le moment. La préparation de prompts et la conversion manuelle restent disponibles.</div>'+
 '<details><summary>Comment activer la génération ?</summary><p class="minor">Déploie le fichier <b>worker.js</b> avec Cloudflare Workers et configure les secrets <code>OPENAI_API_KEY</code> et <code>ART_FACTORY_TOKEN</code>. Copie ensuite son adresse et ton code ici. <a href="./README.md">Guide détaillé</a>. Le code d’accès n’est pas sauvegardé sur cet appareil.</p></details>';
anchor.parentNode.insertBefore(box,anchor.previousElementSibling&&anchor.previousElementSibling.getAttribute('for')==='prompt'?anchor.previousElementSibling:anchor);
const $ai=id=>box.querySelector('#'+id);
try{$ai('ai-url').value=localStorage.getItem('mashup-art-factory-worker-url')||'';}catch(_){}
let ctrl=null,working=false;
function status(message,err){const el=$ai('ai-status');el.textContent=message;el.style.borderColor=err?'#c48374':'#759b8570';}
function endpoint(){
 const raw=$ai('ai-url').value.trim();if(!raw)throw Error('Renseigne l’adresse du Worker.');
 let url;try{url=new URL(raw)}catch{throw Error('Adresse du Worker incorrecte.')}
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('La connexion au Worker doit utiliser HTTPS.');
 if(url.search||url.hash)throw Error('Saisis uniquement l’adresse principale du Worker.');
 const result=url.origin+url.pathname.replace(/\/+$/,'');
 try{localStorage.setItem('mashup-art-factory-worker-url',result);}catch(_){}
 return result;
}
async function request(path,payload,signal){
 const secret=$ai('ai-token').value.trim();if(!secret)throw Error('Renseigne le code d’accès privé.');
 const opts={method:payload?'POST':'GET',headers:{Authorization:'Bearer '+secret},signal};
 if(payload){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(payload);}
 const res=await fetch(endpoint()+path,opts);
 let data={};try{data=await res.json()}catch(_){}
 if(!res.ok)throw Error(data.error||'Erreur HTTP '+res.status);
 return data;
}
function busy(on){
 working=on;for(const id of ['ai-test','ai-one','ai-batch'])$ai(id).disabled=on;
 $ai('ai-stop').disabled=!on;
 for(const id of ['search','universe','status-filter','rarity'])$(id).disabled=on;
 $('items').style.pointerEvents=on?'none':'';
}
async function test(){
 try{status('Connexion en cours…');const r=await request('/health');status('Connexion réussie · '+(r.model||'modèle IA')+' · format '+(r.size||'6:5')+'.');}
 catch(e){status(e.message,true);}
}
async function apiGenerate(prompt,signal){
 const data=await request('/generate',{prompt},signal);
 if(!data||data.mime!=='image/webp'||typeof data.image_base64!=='string'||!data.image_base64)throw Error('Réponse de génération invalide.');
 const bytes=atob(data.image_base64),buf=new Uint8Array(bytes.length);
 for(let i=0;i<bytes.length;i++)buf[i]=bytes.charCodeAt(i);
 return new Blob([buf],{type:'image/webp'});
}
function loadImage(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Image générée illisible.'));};
  img.src=url;
 });
}
async function toMashupJpeg(file){
 const img=await loadImage(file);
 const canvas=document.createElement('canvas');canvas.width=720;canvas.height=600;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas indisponible.');
 ctx.fillStyle='#15242d';ctx.fillRect(0,0,720,600);
 const s=Math.max(720/img.naturalWidth,600/img.naturalHeight);
 const w=img.naturalWidth*s,h=img.naturalHeight*s;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(img,(720-w)/2,(600-h)/2,w,h);
 let quality=.85,blob;
 for(let i=0;i<5;i++){
  blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
  if(!blob)throw Error('Encodage JPEG impossible.');
  if(blob.size<650000)break;
  quality-=.12;
 }
 return blob;
}
function current(){return {filename:$('filename').textContent.trim(),name:$('title').textContent.trim(),prompt:$('prompt').value};}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function setPreviewUpload(file,filename){
 const input=$('upload'),transfer=new DataTransfer();
 transfer.items.add(new File([file],filename,{type:file.type}));
 input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 for(let i=0;i<80;i++){
  if(!$('download').disabled&&$('filename').textContent.trim()===filename)return;
  await sleep(80);
 }
 throw Error('La conversion a été trop longue. Télécharge le ZIP contenant ton image.');
}
function download(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
}
let table=null;
function crc(bytes){
 if(!table){table=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);table[i]=c>>>0;}}
 let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;
}
function put16(d,o,v){d.setUint16(o,v,true);}function put32(d,o,v){d.setUint32(o,v>>>0,true);}
async function zipFiles(files){
 const e=new TextEncoder(),parts=[],central=[];let offset=0;
 for(const item of files){
  const name=e.encode(item.name),data=new Uint8Array(await item.blob.arrayBuffer()),checksum=crc(data);
  const local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
  put32(lv,0,0x04034b50);put16(lv,4,20);put16(lv,6,0x0800);put16(lv,8,0);put32(lv,14,checksum);put32(lv,18,data.length);put32(lv,22,data.length);put16(lv,26,name.length);local.set(name,30);
  const center=new Uint8Array(46+name.length),cv=new DataView(center.buffer);
  put32(cv,0,0x02014b50);put16(cv,4,20);put16(cv,6,20);put16(cv,8,0x0800);put16(cv,10,0);put32(cv,16,checksum);put32(cv,20,data.length);put32(cv,24,data.length);put16(cv,28,name.length);put32(cv,42,offset);center.set(name,46);
  parts.push(local,data);central.push(center);offset+=local.length+data.length;
 }
 const centerSize=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),dv=new DataView(end.buffer);
 put32(dv,0,0x06054b50);put16(dv,8,files.length);put16(dv,10,files.length);put32(dv,12,centerSize);put32(dv,16,offset);
 return new Blob([...parts,...central,end],{type:'application/zip'});
}
async function single(){
 if(working)return;
 const card=current();if(!card.prompt||!card.filename.endsWith('.jpg')){status('Sélectionne une carte valide.',true);return;}
 try{endpoint();if(!$ai('ai-token').value.trim())throw Error('Code d’accès privé manquant.');}
 catch(e){status(e.message,true);return;}
 if(!confirm('Générer une illustration pour '+card.name+' via l’API payante ?'))return;
 busy(true);ctrl=new AbortController();
 try{
  status('Création de '+card.name+' en cours…');
  const image=await apiGenerate(card.prompt,ctrl.signal);
  if(current().filename!==card.filename){
   const jpeg=await toMashupJpeg(image);download(jpeg,card.filename);
   status('La sélection a changé : le JPEG '+card.filename+' a été téléchargé pour éviter toute association incorrecte.');
  }else{
   try{
    await setPreviewUpload(image,card.filename);
    status('Illustration générée pour '+card.name+'. Vérifie le cadrage puis clique « Télécharger le JPEG ».');
   }catch(e){
    const jpeg=await toMashupJpeg(image);download(jpeg,card.filename);
    status('Import automatique impossible. Le JPEG '+card.filename+' a été téléchargé sans être associé à une autre carte.');
   }
  }
 }catch(e){status(e.name==='AbortError'?'Requête annulée. Une génération commencée peut rester facturée.':e.message,true);}
 finally{busy(false);ctrl=null;}
}
async function batch(){
 if(working)return;
 const buttons=[...$('items').querySelectorAll('button.item')].slice(0,3);
 if(!buttons.length){status('Aucune carte visible à générer.',true);return;}
 try{endpoint();if(!$ai('ai-token').value.trim())throw Error('Code d’accès privé manquant.');}
 catch(e){status(e.message,true);return;}
 if(!confirm('Générer '+buttons.length+' image(s) via une API facturée, puis les télécharger ensemble en ZIP ?'))return;
 busy(true);ctrl=new AbortController();const files=[];
 try{
  for(let i=0;i<buttons.length;i++){
   if(ctrl.signal.aborted)break;
   buttons[i].click();const card=current();
   if(!card.prompt||!card.filename.endsWith('.jpg'))continue;
   status('Génération '+(i+1)+' / '+buttons.length+' : '+card.name+'…');
   const image=await apiGenerate(card.prompt,ctrl.signal);
   const jpeg=await toMashupJpeg(image);
   files.push({name:card.filename,blob:jpeg});
   await setPreviewUpload(image,card.filename);
  }
 }catch(e){status(e.name==='AbortError'?'Série interrompue. Des requêtes déjà envoyées peuvent être facturées.':e.message,true);}
 finally{
  busy(false);ctrl=null;
  if(files.length){try{const blob=await zipFiles(files);download(blob,'mashup-convergence-'+files.length+'-illustrations.zip');status(files.length+' JPEG prêts dans le fichier ZIP. Les cartes sont marquées « Prête » ; valide-les après import dans Mashup.');}catch(e){status('ZIP indisponible : '+e.message,true);}}
 }
}
$ai('ai-test').addEventListener('click',test);
$ai('ai-one').addEventListener('click',single);
$ai('ai-batch').addEventListener('click',batch);
$ai('ai-stop').addEventListener('click',()=>{if(ctrl)ctrl.abort();});
})();