import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');

test('The admin can configure visibility independently from booster eligibility',()=>{
  assert.match(html,/data-series-toggle="visible"/);
  assert.match(html,/data-series-toggle="boosterEnabled"/);
  assert.match(html,/for\(const field of \['visible','boosterEnabled'\]\)/);
  assert.match(html,/checkbox\.checked/);
});

test('New admin series are private and unavailable in boosters by default',()=>{
  assert.match(html,/seriesDraft\.push\(\{number:n,[^\n]*visible:false,boosterEnabled:false\}\)/);
  assert.match(html,/x\.visible!==false\?'checked'/);
  assert.match(html,/x\.boosterEnabled!==false\?'checked'/);
});

test('Player-facing release notes do not announce unannounced series',()=>{
  const version=JSON.parse(readFileSync(new URL('../../version.json',import.meta.url),'utf8'));
  assert.doesNotMatch(version.notes,/série\s*0[34]|fortnite|mario/i);
  assert.equal(version.version,'16.1.1');
});

test('The admin never submits a fixed target count with the series settings',()=>{
  assert.doesNotMatch(html,/series:seriesDraft\.map\(x=>\(\{\.\.\.x,targetCount:/);
  assert.match(html,/series:seriesDraft\.map\(x=>\(\{\.\.\.x\}\)\)/);
  assert.match(html,/Total calculé automatiquement à chaque ajout/);
});
