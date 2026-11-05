/* Offline catalogue preflight and copy-only simulation. No HTTP or persistence. */
import {createHash} from 'node:crypto';
import {catalogueIsActive,catalogueNormalCards} from '../../58-catalogue.js';

const has=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const isArchiveMarked=card=>card?.archived===true||card?.is_archived===true||['archived','removed','withdrawn','deleted'].includes(String(card?.status||'').toLowerCase());
const seriesOf=card=>{const n=Number(card?.editionSeries??card?.series??1);return Number.isSafeInteger(n)&&n>0?n:1;};
const aliases=new Set(['powerranger','powerrangers']);
const canonical=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const stable=value=>Array.isArray(value)?value.map(stable):isObject(value)?Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,stable(value[key])])):value;
export const catalogueDigest=cards=>createHash('sha256').update(JSON.stringify(stable(cards))).digest('hex');

export function catalogueContainer(snapshot){
  if(Array.isArray(snapshot))return {cards:snapshot};
  if(isObject(snapshot)&&Array.isArray(snapshot.cards))return snapshot;
  if(isObject(snapshot?.game)&&Array.isArray(snapshot.game.cards))return snapshot.game;
  if(isObject(snapshot?.db)&&Array.isArray(snapshot.db.cards))return snapshot.db;
  throw new Error('Structure du catalogue absente ou invalide.');
}

/** Universe labels are decisive. A franchise-like card name alone is never used. */
export function inspectUniverse(card){
  if(!isObject(card))return {decision:'other',reason:'invalid-card'};
  const labels=['family','universe'].filter(key=>typeof card[key]==='string'&&card[key].trim()).map(key=>({key,value:canonical(card[key])}));
  const labelMatch=labels.some(label=>aliases.has(label.value));
  const labelOther=labels.some(label=>!aliases.has(label.value));
  const id=typeof card.id==='string'?card.id:'';
  const idMatch=/^s2-conv-power-rangers?-\d+$/i.test(id);
  const lore=canonical(card.loreGroup),loreMatch=aliases.has(lore);
  const positive=labelMatch||idMatch||loreMatch;
  if(!positive)return {decision:'other',reason:'no-universe-evidence'};
  if(labelOther)return {decision:'ambiguous',reason:'conflicting-universe-label'};
  if(lore&&!loreMatch)return {decision:'ambiguous',reason:'conflicting-lore-group'};
  if(/^s2-conv-.+-\d+$/i.test(id)&&!idMatch)return {decision:'ambiguous',reason:'conflicting-universe-id'};
  if(!labelMatch&&!(idMatch&&loreMatch))return {decision:'ambiguous',reason:'uncorroborated-universe'};
  return {decision:'match',reason:labelMatch?'explicit-universe':'concordant-id-and-lore'};
}

/** Counts distinct card identities; metadata targetCount/editionTotal are ignored. */
export function countCatalogue(cards,series=2){
  const globalIndex=new Map(),seenInSeries=new Set();let duplicateRows=0,invalidRows=0;
  for(const card of cards){
    if(!isObject(card)||typeof card.id!=='string'||!card.id){invalidRows++;continue;}
    if(seriesOf(card)===series){if(seenInSeries.has(card.id))duplicateRows++;seenInSeries.add(card.id);}
    const old=globalIndex.get(card.id);
    if(!old||catalogueIsActive(old)&&!catalogueIsActive(card))globalIndex.set(card.id,card);
  }
  const uniqueCards=Array.from(globalIndex.values()).filter(card=>seriesOf(card)===series),normalIds=new Set(catalogueNormalCards(cards,series).map(card=>card.id));
  const result={records:Array.from(cards).filter(card=>seriesOf(card)===series).length,uniqueCards:uniqueCards.length,normalActive:normalIds.size,secretActive:0,archived:0,inactiveOther:0,unclassifiedActive:0,duplicateRows,invalidRows};
  for(const card of uniqueCards){
    if(isArchiveMarked(card)){result.archived++;continue;}
    if(!catalogueIsActive(card)){result.inactiveOther++;continue;}
    if(card.variant==='secret')result.secretActive++;else if(!normalIds.has(card.id))result.unclassifiedActive++;
  }
  return result;
}

const unknown=reason=>({status:'unknown',reason});
const owns=(object,id)=>isObject(object)&&has(object,id)?object[id]:undefined;
function countUsers(game,ids){
  if(!Array.isArray(game.users))return {ownership:unknown('users-not-provided'),decks:unknown('users-not-provided'),doubleDecks:unknown('users-not-provided')};
  let holders=0,copies=0,missingInventory=0,invalidInventory=0;
  const decks={deck:{affectedUsers:0,references:0,missing:0},deckDouble:{affectedUsers:0,references:0,missing:0}};
  for(const user of game.users){
    const owned=user?.state?.owned;
    if(!isObject(owned))missingInventory++;
    else{let count=0;for(const id of ids){const raw=owns(owned,id);if(raw===undefined)continue;const qty=Number(raw);if(!Number.isSafeInteger(qty)||qty<0){invalidInventory++;continue;}count+=qty;}if(count)holders++;copies+=count;}
    for(const key of Object.keys(decks)){
      const deck=user?.state?.[key];if(!Array.isArray(deck)){decks[key].missing++;continue;}
      if(deck.some(id=>typeof id!=='string')){decks[key].missing++;continue;}
      const matches=deck.filter(id=>ids.has(id)).length;if(matches)decks[key].affectedUsers++;decks[key].references+=matches;
    }
  }
  const summary=value=>({status:value.missing?'partial':'known',affectedUsers:value.affectedUsers,references:value.references,uninspectedUsers:value.missing});
  return {ownership:{status:missingInventory||invalidInventory?'partial':'known',affectedUsers:holders,availableCopies:copies,uninspectedUsers:missingInventory,invalidQuantities:invalidInventory},decks:summary(decks.deck),doubleDecks:summary(decks.deckDouble)};
}
function listingImpact(game,ids){
  if(!Array.isArray(game.listingsV11))return unknown('listingsV11-not-provided');
  let activeEscrows=0,historicalReferences=0,uninspected=0;
  for(const listing of game.listingsV11){
    if(!isObject(listing)||typeof listing.cardId!=='string'){uninspected++;continue;}
    if(!ids.has(listing.cardId))continue;
    if(listing.status==='active')activeEscrows++;else if(['sold','cancelled','expired'].includes(listing.status))historicalReferences++;else uninspected++;
  }
  return {status:uninspected?'partial':'known',activeEscrows,reservedCopies:activeEscrows,historicalReferences,uninspectedRecords:uninspected};
}
function tradeImpact(game,ids){
  if(!Array.isArray(game.tradesV109))return unknown('tradesV109-not-provided');
  let pendingTrades=0,potentialCopies=0,historicalReferences=0,uninspected=0;
  for(const trade of game.tradesV109){
    if(!isObject(trade)||!Array.isArray(trade.offer)||!Array.isArray(trade.request)){uninspected++;continue;}
    const items=[...trade.offer,...trade.request].filter(item=>ids.has(item?.id));if(!items.length)continue;
    if(trade.status==='pending'){pendingTrades++;for(const item of items){const qty=Number(item.qty);if(!Number.isSafeInteger(qty)||qty<1){uninspected++;continue;}potentialCopies+=qty;}}
    else if(['accepted','declined','cancelled','expired','countered'].includes(trade.status))historicalReferences++;
    else uninspected++;
  }
  return {status:uninspected?'partial':'known',pendingTrades,potentialCopiesNotReserved:potentialCopies,historicalReferences,uninspectedRecords:uninspected};
}
function references(value,ids){
  if(typeof value==='string')return ids.has(value);
  if(Array.isArray(value))return value.some(item=>references(item,ids));
  if(isObject(value))return Object.values(value).some(item=>references(item,ids));
  return false;
}
const terminal=new Set(['finished','forfeit','declined','cancelled','canceled','expired','committed','complete','completed','abandoned']);
const active=new Set(['active','pending','prepared','negotiating','choose','reveal','in_progress']);
function operationImpact(game,ids,keys){
  const provided=keys.filter(key=>has(game,key));
  if(!provided.length)return unknown(keys[0]+'-not-provided');
  const records=[];let uninspected=0;
  for(const key of provided){if(Array.isArray(game[key]))records.push(...game[key]);else if(game[key]!==null)uninspected++;}
  let activeReferences=0,historicalReferences=0,uncertainReferences=0;
  const seen=new Map();
  for(const record of records){
    if(!isObject(record)){uninspected++;continue;}
    const identity=record.id?String(record.id):record;
    if(seen.has(identity)){const previous=seen.get(identity);if((references(record,ids)||references(previous,ids))&&JSON.stringify(stable(previous))!==JSON.stringify(stable(record)))uncertainReferences++;continue;}
    seen.set(identity,record);
    if(!references(record,ids))continue;
    if(record.finished===true||terminal.has(record.status))historicalReferences++;
    else if(record.finished===false||active.has(record.status)||active.has(record.stage))activeReferences++;
    else uncertainReferences++;
  }
  return {status:uninspected||uncertainReferences?'partial':'known',activeReferences,historicalReferences,uncertainReferences,uninspectedRecords:uninspected,inspectedContainers:provided};
}

export function inspectReferences(snapshot,cardIds){
  const game=catalogueContainer(snapshot),ids=new Set(cardIds),users=countUsers(game,ids);
  return {...users,listings:listingImpact(game,ids),trades:tradeImpact(game,ids),
    battles:operationImpact(game,ids,['battles']),pvp:operationImpact(game,ids,['pvpMatches']),openings:operationImpact(game,ids,['openings','packOpenings'])};
}

export function createArchivePlan(snapshot,{series=2}={}){
  if(!Number.isSafeInteger(series)||series<1)throw new Error('Série invalide.');
  const game=catalogueContainer(snapshot),targets=[],ambiguous=[],otherSeries=[],seen=new Map();
  game.cards.forEach((card,index)=>{
    if(!isObject(card))return;const verdict=inspectUniverse(card);
    if(verdict.decision==='other')return;
    if(Number(card.editionSeries)!==series){if(!Number.isSafeInteger(Number(card.editionSeries)))ambiguous.push({index,id:typeof card.id==='string'?card.id:null,reason:'series-not-provided'});else otherSeries.push(typeof card.id==='string'?card.id:null);return;}
    if(verdict.decision==='ambiguous'){ambiguous.push({index,id:typeof card.id==='string'?card.id:null,reason:verdict.reason});return;}
    if(typeof card.id!=='string'||!card.id){ambiguous.push({index,id:null,reason:'missing-card-id'});return;}
    const summary={id:card.id,name:String(card.name||''),family:card.family??null,universe:card.universe??null,loreGroup:card.loreGroup??null,rarity:card.rarity??null,variant:card.variant||'standard',editionSeries:series,editionNumber:card.editionNumber??null,alreadyArchived:isArchiveMarked(card)};
    if(seen.has(card.id)){const previous=seen.get(card.id);if(JSON.stringify(previous)!==JSON.stringify(summary))ambiguous.push({index,id:card.id,reason:'conflicting-duplicate-id'});return;}
    seen.set(card.id,summary);targets.push(summary);
  });
  // The same ID must not also occur as an unrelated or differently scoped card.
  for(const target of targets){const rows=game.cards.filter(card=>card?.id===target.id);if(rows.some(card=>Number(card.editionSeries)!==series||inspectUniverse(card).decision!=='match'))ambiguous.push({id:target.id,reason:'conflicting-duplicate-id'});}
  const ids=targets.map(card=>card.id),impacts=inspectReferences(snapshot,ids),blockers=[];
  if(ambiguous.length)blockers.push('ambiguous-catalogue-records');
  const before=countCatalogue(game.cards,series);
  if(before.invalidRows)blockers.push('invalid-catalogue-records');
  if(before.unclassifiedActive)blockers.push('unclassified-active-cards');
  for(const [key,value] of Object.entries(impacts))if(value.status!=='known')blockers.push('unknown-or-partial-'+key);
  if(impacts.listings.activeEscrows)blockers.push('active-market-escrows');
  if(impacts.trades.pendingTrades)blockers.push('pending-trades');
  for(const key of ['battles','pvp','openings'])if(impacts[key].activeReferences)blockers.push('active-'+key);
  return {format:'mashup-offline-universe-archive-plan-v1',scope:'offline-copy-only',productionExecutable:false,series,universe:'Power Rangers',catalogueHash:catalogueDigest(game.cards),
    before,targets,ambiguous,ignoredOtherSeries:otherSeries.length,toArchive:targets.filter(card=>!card.alreadyArchived).map(card=>card.id),alreadyArchived:targets.filter(card=>card.alreadyArchived).length,
    impacts,blockingReasons:[...new Set(blockers)],productionReviewStatus:blockers.length?'blocked':'requires-explicit-approval-and-verified-backup',
    coverage:'Only documented snapshot containers are inspected. Missing data is unknown, not zero. Full deployed schema and transaction behavior remain unverified.'};
}

/** Returns a new object. Does not write a file, call a service or mutate a wallet. */
export function applyArchivePlan(snapshot,plan){
  if(plan?.format!=='mashup-offline-universe-archive-plan-v1'||plan.scope!=='offline-copy-only')throw new Error('Plan hors ligne invalide.');
  if(plan.ambiguous?.length)throw new Error('Plan refusé : des cartes sont ambiguës.');
  const original=catalogueContainer(snapshot);
  if(catalogueDigest(original.cards)!==plan.catalogueHash)throw new Error('Catalogue modifié depuis le préflight.');
  const latest=createArchivePlan(snapshot,{series:plan.series});
  const copy=structuredClone(snapshot),game=catalogueContainer(copy),ids=new Set(plan.toArchive),changes=[];
  game.cards.forEach((card,index)=>{
    if(!ids.has(card?.id))return;
    if(Number(card.editionSeries)!==plan.series||inspectUniverse(card).decision!=='match')throw new Error('Identité ou univers du plan non concordant.');
    changes.push({id:card.id,index,beforeArchived:{present:has(card,'archived'),...(has(card,'archived')?{value:card.archived}:{})},afterArchived:true});card.archived=true;
  });
  if(new Set(changes.map(change=>change.id)).size!==ids.size)throw new Error('Une carte du plan est introuvable.');
  const receipt={format:'mashup-offline-universe-archive-receipt-v1',scope:'offline-copy-only',beforeCatalogueHash:plan.catalogueHash,afterCatalogueHash:catalogueDigest(game.cards),changes};
  return {snapshot:copy,receipt,after:countCatalogue(game.cards,plan.series),blockingReasons:latest.blockingReasons.slice(),productionExecutable:false};
}

/** Restores precisely the flags recorded in a receipt, on another fresh copy. */
export function restoreArchivePlan(snapshot,receipt){
  if(receipt?.format!=='mashup-offline-universe-archive-receipt-v1'||receipt.scope!=='offline-copy-only')throw new Error('Reçu hors ligne invalide.');
  const current=catalogueContainer(snapshot);
  if(catalogueDigest(current.cards)!==receipt.afterCatalogueHash)throw new Error('Catalogue modifié depuis la simulation : restauration refusée.');
  const copy=structuredClone(snapshot),game=catalogueContainer(copy);
  for(const change of receipt.changes){const card=game.cards[change.index];if(!card||card.id!==change.id||card.archived!==change.afterArchived)throw new Error('La carte du reçu a changé.');if(change.beforeArchived.present)card.archived=change.beforeArchived.value;else delete card.archived;}
  if(catalogueDigest(game.cards)!==receipt.beforeCatalogueHash)throw new Error('La copie restaurée ne correspond pas au catalogue initial.');
  return copy;
}
