import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createArchivePlan,applyArchivePlan,restoreArchivePlan,inspectUniverse,countCatalogue} from '../../tools/catalogue/archive-plan.mjs';
import {aggregateReport} from '../../tools/catalogue/audit.mjs';

const card=(id='s2-conv-power-rangers-01',extra={})=>({id,name:'Carte fictive',universe:'Power Rangers',loreGroup:'power-rangers',editionSeries:2,editionNumber:53,variant:'standard',rarity:'legendary',...extra});
const fixture=()=>({cards:[card(),card('s2-conv-obsession-01',{name:'Autre carte',universe:'Obsession',loreGroup:'obsession'})],users:[{id:'fiction-user',email:'private@example.invalid',password:'NEVER-OUTPUT',state:{owned:{'s2-conv-power-rangers-01':3},deck:['s2-conv-power-rangers-01'],deckDouble:['s2-conv-power-rangers-01'],coins:1234,dust:37},achievementsV11:{first_legend:true}}],listingsV11:[],tradesV109:[],battles:[],pvpMatches:[],openings:[]});

test('Univers : variantes explicites de casse, accents, espaces et tirets sans recherche floue du nom',()=>{
  for(const universe of ['POWER RANGERS','Power-Ranger','power_rangers','Pówer Ràngers','Power Rang ers','PowerRangers'])assert.equal(inspectUniverse(card('opaque-card',{universe,loreGroup:undefined})).decision,'match',universe);
  assert.equal(inspectUniverse(card('ordinary-id',{name:'Power Rangers',universe:'Obsession',loreGroup:undefined})).decision,'other');
  assert.equal(inspectUniverse(card('s2-conv-power-rangers-01',{universe:'Obsession'})).decision,'ambiguous');
  assert.equal(inspectUniverse(card('s2-conv-power-rangers-01',{family:'Haikyuu!!'})).decision,'ambiguous');
  assert.equal(inspectUniverse(card('s2-conv-obsession-01')).decision,'ambiguous');
  assert.equal(inspectUniverse(card('s2-conv-power-rangers-01',{universe:undefined,loreGroup:undefined})).decision,'ambiguous');
});
test('Série 2 uniquement ; les contradictions bloquent sans archiver un autre univers',()=>{
  const snapshot={cards:[card(),card('outside',{editionSeries:1}),card('conflict',{family:'Autre univers'})]};
  const plan=createArchivePlan(snapshot);assert.deepEqual(plan.toArchive,['s2-conv-power-rangers-01']);assert.equal(plan.ignoredOtherSeries,1);assert.equal(plan.ambiguous.length,1);
  assert.throws(()=>applyArchivePlan(snapshot,plan),/ambigu/);assert.equal(snapshot.cards[0].archived,undefined);
});
test('Les données de joueurs absentes restent inconnues ; des tableaux fournis vides signifient zéro connu',()=>{
  const absent=createArchivePlan({cards:[card()]});assert.equal(absent.impacts.ownership.status,'unknown');assert.equal(absent.impacts.listings.status,'unknown');assert.ok(absent.blockingReasons.includes('unknown-or-partial-openings'));
  const empty=createArchivePlan({cards:[card()],users:[],listingsV11:[],tradesV109:[],battles:[],pvpMatches:[],openings:[]});assert.equal(empty.impacts.ownership.status,'known');assert.equal(empty.impacts.ownership.affectedUsers,0);assert.equal(empty.impacts.listings.activeEscrows,0);assert.equal(empty.productionExecutable,false);
});
test('Préflight : copies possédées, deux decks, séquestres, échanges, combats et ouvertures en cours',()=>{
  const s=fixture(),id=s.cards[0].id;
  s.listingsV11=[{id:'sale',cardId:id,status:'active'},{id:'sold',cardId:id,status:'sold'}];
  s.tradesV109=[{id:'trade',status:'pending',offer:[{id,qty:2}],request:[]}];
  s.battles=[{id:'battle',finished:false,player:[[id]],enemy:[]}];s.pvpMatches=[{id:'pvp',status:'active',ownCards:[{id}]}];s.openings=[{id:'opening',status:'prepared',results:[{id}]}];
  const p=createArchivePlan(s);assert.equal(p.impacts.ownership.availableCopies,3);assert.equal(p.impacts.decks.references,1);assert.equal(p.impacts.doubleDecks.references,1);assert.equal(p.impacts.listings.reservedCopies,1);assert.equal(p.impacts.trades.pendingTrades,1);assert.equal(p.impacts.battles.activeReferences,1);assert.equal(p.impacts.pvp.activeReferences,1);assert.equal(p.impacts.openings.activeReferences,1);
  for(const key of ['active-market-escrows','pending-trades','active-battles','active-pvp','active-openings'])assert.ok(p.blockingReasons.includes(key));
});
test('Un état d’opération inconnu reste bloquant ; les références historiques ne sont pas supprimées',()=>{
  const s=fixture(),id=s.cards[0].id;s.battles=[{id:'history',finished:true,player:[id]},{id:'unknown',status:'new-backend-state',player:[id]}];const p=createArchivePlan(s);assert.equal(p.impacts.battles.status,'partial');assert.equal(p.impacts.battles.historicalReferences,1);assert.equal(p.impacts.battles.uncertainReferences,1);
});
test('Archivage sur copie : seuls les flags des IDs exacts changent, rien dans les comptes ou références',()=>{
  const s=fixture(),before=structuredClone(s),p=createArchivePlan(s),result=applyArchivePlan(s,p);
  assert.deepEqual(s,before);assert.equal(result.snapshot.cards[0].archived,true);assert.equal(result.snapshot.cards[1].archived,undefined);
  for(const key of ['users','listingsV11','tradesV109','battles','pvpMatches','openings'])assert.deepEqual(result.snapshot[key],s[key]);
  assert.deepEqual(result.snapshot.cards.map(c=>c.id),s.cards.map(c=>c.id));assert.deepEqual(result.snapshot.cards.map(c=>c.editionNumber),s.cards.map(c=>c.editionNumber));
  assert.deepEqual(restoreArchivePlan(result.snapshot,result.receipt),s);assert.equal(result.snapshot.cards[0].archived,true);
});
test('Restauration exacte de la présence du flag, y compris false ; refus si le catalogue a changé',()=>{
  const s=fixture();s.cards[0].archived=false;const plan=createArchivePlan(s),result=applyArchivePlan(s,plan);const restored=restoreArchivePlan(result.snapshot,result.receipt);assert.equal(Object.hasOwn(restored.cards[0],'archived'),true);assert.equal(restored.cards[0].archived,false);
  const changed=structuredClone(result.snapshot);changed.cards[0].name='Édition concurrente';assert.throws(()=>restoreArchivePlan(changed,result.receipt),/modifié/);
  s.cards.push(card('new',{universe:'Autre',loreGroup:'other'}));assert.throws(()=>applyArchivePlan(s,plan),/modifié/);
});
test('Comptage : identités uniques, normales seulement, secrètes et archives distinctes, aucun total manuel',()=>{
  const rows=[card(),card(),card('secret',{variant:'secret'}),card('old',{archived:true}),card('unpublished',{is_published:false})];
  const p=createArchivePlan({cards:rows,targetCount:999});assert.equal(p.before.normalActive,1);assert.equal(p.before.secretActive,1);assert.equal(p.before.archived,1);assert.equal(p.before.inactiveOther,1);assert.equal(p.before.duplicateRows,1);const after=applyArchivePlan({cards:rows,targetCount:999},p);assert.equal(after.after.normalActive,0);assert.equal(after.after.secretActive,0);
});
test('Audit privé : seuls les agrégats sortent, jamais identités joueurs, mots de passe ou noms de cartes',()=>{
  const s=fixture();s.cards[0].name='PRIVATE-CARD-NAME';const before=structuredClone(s),report=aggregateReport(s,{simulate:true});const text=JSON.stringify(report);
  for(const value of ['fiction-user','private@example.invalid','NEVER-OUTPUT','PRIVATE-CARD-NAME','s2-conv-power-rangers-01'])assert.ok(!text.includes(value),value);
  assert.equal(report.simulation.archiveFlagRoundTripExact,true);assert.equal(report.simulation.productionRestorationTested,false);assert.deepEqual(s,before);
});
test('CLI : dry-run par défaut, simulation mémoire, rapport privé agrégé et refus des modes d’exécution',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mashup-catalogue-audit-'));
  try{
    const file=path.join(directory,'private-snapshot.json');fs.writeFileSync(file,JSON.stringify(fixture()));
    const root=new URL('../../',import.meta.url),run=args=>spawnSync(process.execPath,['tools/catalogue/audit.mjs',...args],{cwd:root,encoding:'utf8'});
    const dry=run(['--snapshot',file]);assert.ifError(dry.error);assert.equal(dry.status,0);assert.equal(JSON.parse(dry.stdout).mode,'dry-run');assert.ok(!dry.stdout.includes('NEVER-OUTPUT'));assert.equal(fs.readdirSync(directory).length,1);
    const report=path.join(directory,'report.json'),simulation=run(['--snapshot',file,'--simulate','--report',report]);assert.ifError(simulation.error);assert.equal(simulation.status,0);assert.equal(JSON.parse(simulation.stdout).simulation.archiveFlagRoundTripExact,true);assert.ok(!fs.readFileSync(report,'utf8').includes('private@example.invalid'));
    assert.equal(run(['--snapshot',file,'--report',file]).status,1);assert.ok(fs.readFileSync(file,'utf8').includes('NEVER-OUTPUT'));assert.equal(run(['--apply']).status,1);assert.equal(run(['--execute']).status,1);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('Snapshot livré : 100 IDs conservés, dix Power Rangers archivées, 90 normales actives',()=>{
  const source=JSON.parse(fs.readFileSync(new URL('../../content/convergence-series2.json',import.meta.url),'utf8'));const plan=createArchivePlan(source);
  assert.equal(source.cards.length,100);assert.equal(new Set(source.cards.map(c=>c.id)).size,100);assert.equal(plan.targets.length,10);assert.equal(plan.toArchive.length,0);assert.equal(plan.alreadyArchived,10);assert.equal(plan.before.normalActive,90);assert.equal(plan.before.secretActive,0);assert.equal(plan.before.archived,10);
  assert.equal(Object.hasOwn(source,'targetCount'),false);assert.ok(source.cards.every(c=>!Object.hasOwn(c,'editionTotal')));
});

test('Le comptage partagé donne priorité au doublon archivé dans les deux ordres',()=>{
  const active=card(),archived=card(undefined,{archived:true});
  for(const rows of [[active,archived],[archived,active]]){const count=countCatalogue(rows);assert.equal(count.normalActive,0);assert.equal(count.archived,1);assert.equal(count.duplicateRows,1);}
});

test('Le manifeste restaure exactement les dix flags du fichier livré sans réintroduire de total manuel',()=>{
  const raw=fs.readFileSync(new URL('../../content/convergence-series2.json',import.meta.url)),source=JSON.parse(raw),manifest=JSON.parse(fs.readFileSync(new URL('../../docs/catalogue/power-rangers-manifest.json',import.meta.url),'utf8'));
  assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.sourceSha256After);
  const restored=restoreArchivePlan(source,manifest.archiveReceipt);assert.equal(countCatalogue(restored.cards).normalActive,100);assert.equal(countCatalogue(restored.cards).archived,0);
  assert.deepEqual(restored.cards.map(c=>c.id),source.cards.map(c=>c.id));assert.deepEqual(restored.cards.map(c=>c.editionNumber),source.cards.map(c=>c.editionNumber));
  assert.equal(Object.hasOwn(restored,'targetCount'),false);assert.ok(restored.cards.every(c=>!Object.hasOwn(c,'editionTotal')));
});

test('Nouvelles références après préflight et portefeuille récent restent préservés sur copie et restauration',()=>{
  const s=fixture(),plan=createArchivePlan(s),id=s.cards[0].id;s.users[0].state.coins=4321;s.openings=[{id:'new-opening',status:'prepared',results:[{id}]}];
  const result=applyArchivePlan(s,plan);assert.ok(result.blockingReasons.includes('active-openings'));assert.equal(result.snapshot.users[0].state.coins,4321);
  result.snapshot.users[0].state.coins=4500;const restored=restoreArchivePlan(result.snapshot,result.receipt);assert.equal(restored.users[0].state.coins,4500);assert.deepEqual(restored.openings,s.openings);
});
test('Deux états contradictoires de la même ouverture ne peuvent masquer une opération active',()=>{
  const s=fixture(),id=s.cards[0].id;s.openings=[{id:'same',status:'committed',results:[{id}]}];s.packOpenings=[{id:'same',status:'prepared',results:[{id}]}];
  const plan=createArchivePlan(s);assert.equal(plan.impacts.openings.status,'partial');assert.equal(plan.impacts.openings.uncertainReferences,1);assert.ok(plan.blockingReasons.includes('unknown-or-partial-openings'));
});
