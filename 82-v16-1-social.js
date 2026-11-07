/* Account-scoped social projection. Existing trades remain the transaction source.
 * Presence and cross-device read receipts require an explicitly advertised server.
 * Legacy mode stores only read IDs/revisions locally; never copies trade assets.
 */
const idOK=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);
const text=(v,n=80)=>typeof v==='string'?v.slice(0,n):'';
export function tradeNotices(trades,userId){
 return (Array.isArray(trades)?trades:[]).filter(t=>t&&t.to===userId&&t.status==='pending'&&idOK(t.id)).slice(0,50).map(t=>({id:'trade:'+t.id,kind:'trade',ref:t.id,actorId:idOK(t.from)?t.from:null,name:text(t.fromName)||'Un joueur',stamp:String(t.updatedAt??t.createdAt??'pending').slice(0,80)}));
}
function inviteNotice(item){return item&&idOK(item.id)?{id:'battle:'+item.id,kind:'battle',ref:item.id,actorId:idOK(item.from)?item.from:null,name:text(item.pseudo)||'Un joueur',stamp:String(item.updatedAt??item.createdAt??'pending').slice(0,80),mode:['simple','double','parimatch'].includes(item.mode)?item.mode:'simple'}:null;}
function parseNotice(n){if(!n||!['trade','battle'].includes(n.kind)||!idOK(n.ref)||n.id!==n.kind+':'+n.ref||typeof n.stamp!=='string'||n.stamp.length>80||typeof n.unread!=='boolean')return null;return{id:n.id,kind:n.kind,ref:n.ref,actorId:idOK(n.actorId)?n.actorId:null,name:text(n.name)||'Un joueur',stamp:n.stamp,unread:n.unread,mode:['simple','double','parimatch'].includes(n.mode)?n.mode:'simple'};}
export function createSocialHub({api,getUser,getSession,storage=null,now=()=>Date.now(),doc=globalThis.document,events=globalThis.window,setTimer=setTimeout,clearTimer=clearTimeout,onChange=()=>{},onConfig=()=>{},subscribe=null}={}){
 let scope=null,epoch=0,cap=null,notices=[],reads={},pendingAcks=new Map(),announced=new Set(),timer=null,pending=null,lastTradeAt=-Infinity,lastSync=0,revision='',error=false,lastInput=0,serverOffset=0,presence=new Map(),leaseMs=90000,subscription=null,subscribing=false,disposed=false,queued=false;
 const legacyPeriod=45000,livePeriod=30000;
 let queuedHidden=false,cancelRequest=null;
 async function request(path,body,options){
  let timer,cancel;
  const expired=new Promise((_,reject)=>{cancel=()=>reject(Error('Session interrompue.'));cancelRequest=cancel;timer=setTimer(()=>reject(Error('Délai réseau dépassé.')),15000);});
  try{return await Promise.race([Promise.resolve().then(()=>api(path,body,options)),expired]);}
  finally{clearTimer(timer);if(cancelRequest===cancel)cancelRequest=null;}
 }
 const identity=()=>getUser()?.id?String(getUser().id)+'@'+String(getSession()):null;
 const live=()=>cap?.version===1&&cap?.sync===true;
 const visible=()=>!doc?.hidden;
 const active=()=>visible()&&now()-lastInput<120000;
 const key=()=>getUser()?.id?'mashup-social-read-v161:'+encodeURIComponent(getUser().id):null;
 function loadReads(){try{const value=JSON.parse(storage?.getItem(key())||'null');if(value?.version!==1||!Array.isArray(value.items))return{};return Object.fromEntries(value.items.slice(-256).filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&/^(trade|battle):[A-Za-z0-9_-]{1,100}$/.test(x[0])&&typeof x[1]==='string'&&x[1].length<=80));}catch{return{};}}
 function saveReads(){const entries=Object.entries(reads).slice(-256);reads=Object.fromEntries(entries);try{if(key())storage?.setItem(key(),JSON.stringify({version:1,items:entries}));}catch{/* Read state may remain device-local in restricted storage. */}}
 function getPresence(id){const value=presence.get(id);if(!live()||cap.presence!==true||!value||!lastSync||now()-lastSync>leaseMs)return{state:'unknown',label:'Présence indisponible'};const online=value.online&&now()+serverOffset<value.expiresAt;return{state:online?'online':'offline',label:online?'En ligne':'Hors ligne',lastActiveAt:value.lastActiveAt||null};}
 function snapshot(){const rows=notices.map(n=>({...n,unread:live()?!!n.unread&&reads[n.id]!==n.stamp:reads[n.id]!==n.stamp}));return{mode:live()?'server':'legacy',notifications:rows,unread:rows.filter(n=>n.unread).length,error,lastSync,readSync:live()&&cap.readReceipts===true,pendingAcks:pendingAcks.size,presenceAvailable:live()&&cap.presence===true};}
 function emit(){if(!scope)return;const data=snapshot(),fresh=data.notifications.filter(n=>n.unread&&!announced.has(n.id+'@'+n.stamp));for(const n of fresh)announced.add(n.id+'@'+n.stamp);while(announced.size>512)announced.delete(announced.values().next().value);onChange({...data,newUnread:fresh});}
 function observeTrades(data){if(!scope||identity()!==scope||live())return;lastTradeAt=now();notices=[...tradeNotices(data?.trades,getUser().id),...notices.filter(n=>n.kind!=='trade')];emit();}
 function observeInvitation(item){if(!scope||identity()!==scope||live())return;const n=inviteNotice(item);notices=[...notices.filter(n=>n.kind!=='battle'),...(n?[n]:[])];emit();}
 function cancelTimer(){if(timer!==null)clearTimer(timer);timer=null;}
 function schedule(delay=live()?livePeriod:legacyPeriod){cancelTimer();if(!scope||disposed||!visible())return;timer=setTimer(()=>{timer=null;void sync();},delay);}
 function dropSubscription(){const old=subscription;subscription=null;if(typeof old==='function')old();}
 async function listen(){if(!subscribe||!live()||cap.realtime!==true||subscription||subscribing||!visible())return;const token=epoch;subscribing=true;try{const cleanup=await subscribe(()=>{if(token===epoch&&visible())void sync({force:true});});if(token===epoch&&visible())subscription=cleanup;else if(typeof cleanup==='function')cleanup();}catch{/* Polling remains available. */}finally{if(token===epoch)subscribing=false;}}
 function accept(data){
  if(data?.version!==1||!Number.isFinite(data.serverTime)||!Number.isFinite(data.leaseMs)||data.leaseMs<30000||data.leaseMs>180000)throw Error('Synchronisation sociale indisponible.');
  serverOffset=data.serverTime-now();leaseMs=data.leaseMs;lastSync=now();
  if(Array.isArray(data.notifications))notices=data.notifications.slice(0,100).map(parseNotice).filter(Boolean);
  if(Array.isArray(data.acked))for(const a of data.acked)if(pendingAcks.get(a.id)===a.stamp)pendingAcks.delete(a.id);
  for(const n of notices){if(n.unread===false){reads[n.id]=n.stamp;pendingAcks.delete(n.id);}else if(cap?.readReceipts===true&&reads[n.id]===n.stamp&&!pendingAcks.has(n.id)){pendingAcks.set(n.id,n.stamp);queued=true;}}
  saveReads();
  if(data.presence?.source==='lease-v1'&&Array.isArray(data.presence.users)){presence=new Map(data.presence.users.slice(0,500).filter(p=>idOK(p.id)&&typeof p.online==='boolean'&&Number.isFinite(p.expiresAt)).map(p=>[p.id,{online:p.online,expiresAt:p.expiresAt,lastActiveAt:Number.isFinite(p.lastActiveAt)&&p.lastActiveAt<=data.serverTime?p.lastActiveAt:null}]));}
  if(typeof data.revision==='string'&&data.revision.length<=100)revision=data.revision;
  if(data.config&&typeof data.config==='object'){if(typeof data.config.revision==='string'&&data.config.revision.length<=100)configRevision=data.config.revision;onConfig(data.config);}
 }
 async function sync({force=false,allowHidden=false}={}){
  if(!scope||identity()!==scope||disposed||(!visible()&&!allowHidden))return null;
  if(pending){if(force)queued=true;if(allowHidden)queuedHidden=true;return pending;}
  if(live()&&!force&&!pendingAcks.size&&lastSync&&now()-lastSync<livePeriod){schedule(Math.max(1,livePeriod-(now()-lastSync)));return null;}
  if(!live()&&!force&&now()-lastTradeAt<legacyPeriod){schedule();return null;}
  const token=epoch,actor=scope,isLive=live();
  const task=Promise.resolve().then(async()=>{try{
   if(token!==epoch||actor!==identity())return null;
   if(isLive){const body={deviceId,sequence:++sequence,active:active(),cursor:revision,configRevision,ack:[...pendingAcks].slice(0,50).map(([id,stamp])=>({id,stamp}))};const data=await request('/api/social/sync',body,{background:true});if(token!==epoch||actor!==identity())return null;accept(data);}
   else{const data=await request('/api/trades');if(token!==epoch||actor!==identity())return null;observeTrades(data);lastSync=now();}
   error=false;emit();return snapshot();
  }catch{if(token===epoch&&actor===identity()){error=true;emit();}return null;}
  finally{if(token===epoch){pending=null;const hidden=queuedHidden;queuedHidden=false;schedule(error?Math.min(180000,(isLive?livePeriod:legacyPeriod)*2):undefined);if(queued){queued=false;if(hidden&&!visible())void sync({force:true,allowHidden:true});else schedule(0);}}}});
  pending=task;return task;
 }
 let deviceId='',sequence=0,configRevision='';
 function start(capabilities=null){
  const next=identity();if(!next)return;
  const nextCap=capabilities?.version===1?{version:1,sync:capabilities.sync===true,presence:capabilities.presence===true,readReceipts:capabilities.readReceipts===true,realtime:capabilities.realtime===true}:null;
  const changed=next!==scope||JSON.stringify(nextCap)!==JSON.stringify(cap);if(changed){stop();scope=next;sequence=0;deviceId=globalThis.crypto?.randomUUID?.()||'device-'+Math.random().toString(36).slice(2);reads=loadReads();lastInput=now();}
  cap=nextCap;
  if(!changed){emit();schedule();return;}
  void listen();void sync({force:true});
 }
 function stop(){epoch++;scope=null;cancelTimer();cancelRequest?.();dropSubscription();subscribing=false;pending=null;cap=null;notices=[];reads={};presence.clear();pendingAcks.clear();announced.clear();lastSync=0;lastTradeAt=-Infinity;revision='';configRevision='';error=false;queued=false;queuedHidden=false;}
 function markRead(id){const n=notices.find(n=>n.id===id);if(!n)return false;reads[n.id]=n.stamp;saveReads();if(live()&&cap.readReceipts===true)pendingAcks.set(n.id,n.stamp);emit();if(pendingAcks.size)void sync({force:true});return true;}
 function visibility(){if(!scope)return;if(!visible()){cancelTimer();dropSubscription();if(live())void sync({force:true,allowHidden:true});}else{lastInput=now();void listen();void sync({force:true});}}
 function wake(){if(scope&&visible()){lastInput=now();void listen();void sync({force:true});}}
 function input(){lastInput=now();}
 doc?.addEventListener?.('visibilitychange',visibility);doc?.addEventListener?.('pointerdown',input,{passive:true});doc?.addEventListener?.('keydown',input);events?.addEventListener?.('online',wake);
 return{start,stop,sync,observeTrades,observeInvitation,markRead,getPresence,snapshot,signalMutation(){if(scope)schedule(80);},destroy(){disposed=true;stop();doc?.removeEventListener?.('visibilitychange',visibility);doc?.removeEventListener?.('pointerdown',input);doc?.removeEventListener?.('keydown',input);events?.removeEventListener?.('online',wake);}};
}
