import test from 'node:test';import assert from 'node:assert/strict';
import {playerSeries,galleryPacks,menuMarkup} from '../../80-v16-screens.js';
const series=[{number:1,name:'Origines',visible:true,boosterEnabled:true},{number:2,name:'Convergence',visible:true,boosterEnabled:true},{number:3,name:'Private draft 3',visible:false,boosterEnabled:false},{number:4,name:'Private draft 4',visible:false,boosterEnabled:false}];
test('Private series remain available to administrators and invisible to player navigation',()=>{
 assert.deepEqual(playerSeries(series,{role:'player'}).map(s=>s.number),[1,2]);assert.equal(playerSeries(series,{role:'admin'}).length,4);
 assert.doesNotMatch(menuMarkup({role:'player'}),/data-v16-view="admin"|data-v16-view="creator"/);assert.match(menuMarkup({role:'admin'}),/data-v16-view="admin"/);
});
test('Gallery filters cannot announce draft series, even from a mixed public/private pack',()=>{
 const packs=[{id:'all',filterMode:'all'},{id:'mixed',filterMode:'series',allowedSeries:[2,3,4]},{id:'draft',filterMode:'series',allowedSeries:[3,4]},{id:'hidden',visible:false}];
 const shown=galleryPacks(packs,series);assert.deepEqual(shown.map(p=>p.id),['all','mixed']);assert.deepEqual(shown[1].allowedSeries,[2]);assert.deepEqual(packs[1].allowedSeries,[2,3,4]);
});
test('Making a series visible alone does not make it eligible for boosters',()=>{
 const metadata=series.map(s=>s.number===3?{...s,visible:true}:s);assert.equal(playerSeries(metadata,{role:'player'}).length,3);assert.equal(galleryPacks([{id:'draft',filterMode:'series',allowedSeries:[3]}],metadata).length,0);
});
