import test from 'node:test';
import assert from 'node:assert/strict';
import {arenaBattleMarkup} from '../../57-v15-1-battle-view.js';

test('Une carte archivée ne révèle plus son contenu dans les légendes ou matières du combat',()=>{
 const card={archived:true,get name(){throw Error('retired name');},get rarity(){throw Error('retired rarity');},get variant(){throw Error('retired variant');}};
 const html=arenaBattleMarkup({stage:'reveal',playerCards:[card],enemyCards:[card],source:'pvp',winner:'player',pValue:90,eValue:66,playerScore:1,enemyScore:0},{esc:String,renderCard(){throw Error('Retired renderer called');}});
 assert.equal((html.match(/CARTE ARCHIVÉE/g)||[]).length,2);
 assert.match(html,/>90<\/b>/);assert.match(html,/>66<\/b>/);
});

test('Une carte adverse archivée et cachée garde le dos générique sans annoncer son retrait',()=>{
 const hidden={get archived(){throw Error('hidden flag');},get name(){throw Error('hidden name');}};
 const html=arenaBattleMarkup({stage:'choose',source:'pvp',enemyRevealed:false,enemyCards:[hidden],direction:'higher'},{esc:String,renderCard(){throw Error('Hidden renderer called');}});
 assert.match(html,/CARTE NON RÉVÉLÉE/);assert.doesNotMatch(html,/CARTE ARCHIVÉE/);
});
