/* One activity gate for optional application reloads. It never owns game state. */
export function createUpdateSafety({readState=()=>({})}={}) {
  const requests=new Map();
  let serial=0;
  function begin(reason='Enregistrement en cours.') {
    const id=++serial;
    requests.set(id,String(reason));
    let ended=false;
    return ()=>{if(!ended){ended=true;requests.delete(id);}};
  }
  function status() {
    let state;
    try{state=readState()||{};}catch{return {safe:false,reason:'Chargement du jeu en cours.',pending:requests.size};}
    const reasons=[];
    if(state.opening)reasons.push('Termine et confirme ton booster avant de mettre à jour.');
    if(state.battle)reasons.push('Termine ou quitte ton combat avant de mettre à jour.');
    if(state.match)reasons.push('Termine ta partie de Mashup Match avant de mettre à jour.');
    if(state.memory)reasons.push('Termine ta partie de Memory avant de mettre à jour.');
    if(state.saving)reasons.push('La sauvegarde est en cours. Réessaie dans quelques instants.');
    reasons.push(...requests.values());
    return {safe:reasons.length===0,reason:reasons[0]||'',pending:requests.size};
  }
  return Object.freeze({begin,status});
}
