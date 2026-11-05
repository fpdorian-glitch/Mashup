/* V15.3.2 — Récupération des ouvertures préparées.
 * Seul un identifiant de tirage est enregistré localement ; jamais de clé ni de carte.
 * Le serveur conserve l'autorité pour la validation, le débit et la propriété.
 */
const DEFAULT_PREFIX='mashup-pending-booster-v1532';
const validUser = id => typeof id==='string' && /^[a-zA-Z0-9-]{12,100}$/.test(id);
const validPack = id => typeof id==='string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
const validOpening = id => typeof id==='string' && /^[a-zA-Z0-9-]{12,100}$/.test(id);

export function createPendingPackStorage(storage, prefix=DEFAULT_PREFIX) {
  const keyFor = userId => prefix + ':' + userId;
  function read(userId) {
    if(!validUser(userId))return null;
    try {
      const saved=JSON.parse(storage?.getItem(keyFor(userId))||'null');
      if(saved?.userId!==userId||!validPack(saved?.packId)||!validOpening(saved?.openingId))return null;
      return {userId,packId:saved.packId,openingId:saved.openingId};
    } catch {return null;}
  }
  function remember(userId,packId,openingId) {
    if(!validUser(userId)||!validPack(packId)||!validOpening(openingId))return false;
    try {
      storage?.setItem(keyFor(userId),JSON.stringify({userId,packId,openingId}));
      return read(userId)?.openingId===openingId;
    } catch {return false;}
  }
  function forget(userId,openingId) {
    const saved=read(userId);
    if(!saved||saved.openingId!==openingId)return false;
    try {storage?.removeItem(keyFor(userId));return true;} catch{return false;}
  }
  return {read,remember,forget};
}

export function shouldConfirmRevealedPack({revealed,total,pendingId,busy=false,loading=false,finalizing=false}={}) {
  return !!pendingId && Number.isSafeInteger(total) && total>0 &&
    Number.isSafeInteger(revealed) && revealed===total &&
    !busy && !loading && !finalizing;
}
