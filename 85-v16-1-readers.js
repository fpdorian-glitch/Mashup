/* Share only concurrent social GETs. No cache, storage or wallet authority. */
export function createSocialReads(){
 const pending=new Map();let generation=0;
 const eligible=p=>p==='/api/trades'||p==='/api/pvp'||p==='/api/pvp/invitations';
 const clone=v=>typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));
 async function run(scope,path,load,retries=1){
  if(!eligible(path))return load();const before=generation,key=generation+'|'+scope+'|'+path;
  let task=pending.get(key);if(!task){task=Promise.resolve().then(load);pending.set(key,task);}
  try{const value=await task;if(before!==generation){if(retries>0)return run(scope,path,load,retries-1);throw Error('Les données ont changé. Actualise cet écran.');}return clone(value);}finally{if(pending.get(key)===task)pending.delete(key);}
 }
 return{run,invalidate(){generation++;pending.clear();},clear(){generation++;pending.clear();},size:()=>pending.size};
}
