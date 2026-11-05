#!/usr/bin/env node
/* Offline audit. Optional private snapshots are reduced to aggregate output. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createArchivePlan,applyArchivePlan,restoreArchivePlan} from './archive-plan.mjs';

const seed=fileURLToPath(new URL('../../content/convergence-series2.json',import.meta.url));
function argumentsFor(args){
  const options={snapshot:seed,simulate:false,report:null,help:false};
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(arg==='--simulate')options.simulate=true;
    else if(arg==='--help'||arg==='-h')options.help=true;
    else if(arg==='--snapshot'||arg==='--report'){
      const value=args[++i];if(!value||value.startsWith('--'))throw new Error('Arguments invalides.');
      options[arg.slice(2)]=path.resolve(value);
    }else throw new Error('Argument inconnu.');
  }
  return options;
}
export function aggregateReport(snapshot,{publicSeed=false,simulate=false}={}){
  const plan=createArchivePlan(snapshot),reasons={};
  for(const item of plan.ambiguous)reasons[item.reason]=(reasons[item.reason]||0)+1;
  const report={format:'mashup-offline-catalogue-audit-v1',mode:simulate?'in-memory-copy-simulation':'dry-run',datasetScope:publicSeed?'repository-seed-not-production':'private-snapshot-aggregate-only',
    productionExecutable:false,series:plan.series,before:plan.before,
    matchingUniverseCards:plan.targets.length,toArchive:plan.toArchive.length,alreadyArchived:plan.alreadyArchived,
    ambiguousRecords:plan.ambiguous.length,ambiguousReasons:reasons,ignoredOtherSeries:plan.ignoredOtherSeries,
    impacts:plan.impacts,blockingReasons:plan.blockingReasons,productionReviewStatus:plan.productionReviewStatus,coverage:plan.coverage};
  if(publicSeed)report.publicTargets=plan.targets;
  if(simulate){
    const applied=applyArchivePlan(snapshot,plan),restored=restoreArchivePlan(applied.snapshot,applied.receipt);
    assert.deepEqual(restored,snapshot);
    report.simulation={after:applied.after,changedCardRecords:applied.receipt.changes.length,archiveFlagRoundTripExact:true,sourceObjectUnchanged:true,productionRestorationTested:false};
  }
  return report;
}
export function main(args=process.argv.slice(2)){
  const options=argumentsFor(args);
  if(options.help){console.log('Usage : node tools/catalogue/audit.mjs [--snapshot /chemin/prive/catalogue.json] [--simulate] [--report /chemin/nouveau/rapport.json]\nAudit hors ligne uniquement. Aucun HTTP, archivage de production, effacement ou export de joueurs. Un rapport privé contient seulement des agrégats. Un chemin de rapport existant est refusé.');return;}
  const info=fs.statSync(options.snapshot);if(!info.isFile()||info.size>64*1024*1024)throw new Error('Fichier non pris en charge.');
  const snapshot=JSON.parse(fs.readFileSync(options.snapshot,'utf8'));
  const publicSeed=fs.realpathSync(options.snapshot)===fs.realpathSync(seed);
  const report=aggregateReport(snapshot,{publicSeed,simulate:options.simulate}),output=JSON.stringify(report,null,2)+'\n';
  if(options.report)fs.writeFileSync(options.report,output,{encoding:'utf8',flag:'wx'});
  process.stdout.write(output);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch{console.error('Audit refusé : entrée, arguments ou chemin de rapport invalides. Aucun contenu privé affiché, aucune opération distante effectuée.');process.exitCode=1;}
}
