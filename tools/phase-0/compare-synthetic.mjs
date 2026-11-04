// Comparateur hors ligne de répétition JSON ; aucune connexion ni écriture.
// Ce format est synthétique, pas un export Supabase ni une restauration SQL.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export function compareSynthetic(expected,restored){
 for(const value of [expected,restored]){
  assert.equal(value?.fixtureKind,'mashup-phase0-synthetic-v1','Format synthétique obligatoire');
  assert.ok(Array.isArray(value.game?.users),'Jeu synthétique requis');
  assert.ok(Array.isArray(value.game?.cards),'Catalogue synthétique requis');
 }
 // Comparer aussi tous les champs inconnus ; pas seulement soldes et totaux.
 assert.deepEqual(restored,expected,'Écart dans la copie synthétique restaurée');
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  assert.equal(process.argv.length,4,'Deux chemins JSON synthétiques requis');
  compareSynthetic(...process.argv.slice(2).map(p=>JSON.parse(fs.readFileSync(p,'utf8'))));
  console.log('Copie JSON synthétique identique. Restauration Supabase NON validée.');
 }catch{
  console.error('Comparaison refusée ou écart détecté. Aucun contenu de fichier affiché.');process.exitCode=1;
 }
}
