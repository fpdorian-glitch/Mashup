import test from 'node:test';
import assert from 'node:assert/strict';
import {seriesPackFilters,packsInFilter,safePackSelection} from '../../69-v15-5-booster-browser.js';
const packs=[{id:'a',filterMode:'all'},{id:'s1',filterMode:'series',allowedSeries:[1]},{id:'both',filterMode:'series',allowedSeries:[1,2]},{id:'s2',filterMode:'series',allowedSeries:[2]},{id:'private',filterMode:'hidden'}];
const series=[{number:1,name:'Origines'},{number:2,name:'Convergence'}];
test('filters rely only on public series numbers',()=>{
 const options=seriesPackFilters(packs,series);
 assert.deepEqual(options.map(x=>x.value),['all','series-1','series-2','other']);
 assert.equal(options[1].label,'Origines');
});
test('no unrelated packs leak into series filter',()=>{
 assert.deepEqual(packsInFilter(packs,'series-1').map(p=>p.id),['s1','both']);
 assert.deepEqual(packsInFilter(packs,'series-2').map(p=>p.id),['both','s2']);
 assert.deepEqual(packsInFilter(packs,'other').map(p=>p.id),['a','private']);
});
test('empty and stale filter falls back to all packs',()=>{
 assert.equal(safePackSelection([],series,'series-2'),'all');
 assert.equal(safePackSelection(packs,series,'series-99'),'all');
 assert.equal(packsInFilter(packs,'all').length,5);
});
test('invalid series identifiers are not interpreted as cards',()=>{
 assert.deepEqual(packsInFilter(packs,'series-2000'),[]);
 assert.equal(seriesPackFilters([{filterMode:'hidden',allowedSeries:[2]}],series).length,1);
});
