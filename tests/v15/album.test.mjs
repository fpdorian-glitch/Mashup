import test from 'node:test';
import assert from 'node:assert/strict';
import {albumMarkup, albumProgress, paginateAlbum} from '../../43-v15-album.js';
import {renderMashupV10Card} from '../../06-v10-cards.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const card = (index, overrides = {}) => ({id: `fiction-${index}`, name: `Carte ${index}`, editionNumber: index, editionSeries: 2, rarity: 'common', variant: 'standard', ...overrides});
const cards = count => Array.from({length: count}, (_, index) => card(index + 1));
const render = value => `<div class="tcg-card" data-fiction-id="${esc(value.id)}">${esc(value.name)}</div>`;
const html = options => albumMarkup({renderCard: render, ...options});

function forbidContent(value, fields = ['name', 'family', 'rarity', 'art', 'editionNumber', 'editionSeries', 'power', 'def', 'ability', 'desc']) {
  for (const field of fields) Object.defineProperty(value, field, {get() { throw new Error(`Confidential content read: ${field}`); }});
  return value;
}

test('A secret not owned has no slot, count, metadata read or render, even with admin-like context', () => {
  const secret = forbidContent({id: 'unseen-secret', variant: 'secret'});
  const baseline = cards(9);
  const owned = {'fiction-1': 2};
  const options = {cards: baseline, catalogue: baseline, owned, series: {targetCount: 9}, pageSize: 6};
  const expected = html(options);
  const actual = html({...options, cards: [...baseline, secret], catalogue: [...baseline, secret], admin: true});
  assert.equal(actual, expected, 'Adding a secret must not change even the page count or completion');
  assert.equal(paginateAlbum({cards: [secret], owned}).total, 0);
  assert.deepEqual(albumProgress({catalogue: [secret], owned}), {obtained: 0, total: 0, percent: 0, complete: false, discoveries: 0});
});

test('Hidden and archived cards are excluded before identity/content reads, even when owned', () => {
  const hidden = forbidContent({hidden: true}, ['id', 'variant', 'name', 'rarity']);
  const archived = forbidContent({archived: true}, ['id', 'variant', 'name', 'rarity']);
  assert.equal(html({cards: [hidden, archived]}), html({cards: []}));
  assert.deepEqual(paginateAlbum({cards: [card(1, {hidden: true}), card(2, {archived: true})], owned: {'fiction-1': 5, 'fiction-2': 1}}).slots, []);
});

test('A missing normal card exposes only a neutral numbered slot, never name/rarity/art/id', () => {
  const missing = forbidContent({id: 'PRIVATE_ID_SENTINEL', editionNumber: 42, variant: 'standard'}, ['name', 'family', 'rarity', 'art', 'power', 'desc']);
  const result = paginateAlbum({cards: [missing]});
  assert.deepEqual(result.slots, [{owned: false, quantity: 0, number: 1}]);
  const output = html({cards: [missing], renderCard() { throw new Error('Missing card rendered'); }});
  assert.match(output, /N° 001/);
  assert.match(output, /v15-album-slot-missing/);
  for (const forbidden of ['PRIVATE_ID_SENTINEL', 'data-id=', '<img', 'variant-standard']) assert.ok(!output.includes(forbidden));
});

test('Owned secrets are accessible discoveries outside normal-series completion', () => {
  const input = [card(1), card(2), card(3, {variant: 'secret', rarity: 'ultra'})];
  const owned = {'fiction-1': 1, 'fiction-3': 2};
  assert.deepEqual(albumProgress({catalogue: input, owned}), {obtained: 1, total: 2, percent: 50, complete: false, discoveries: 1});
  const output = html({cards: input, owned});
  assert.match(output, /data-fiction-id="fiction-3"/);
  assert.match(output, /1 découverte hors-série/);
  assert.match(output, /Découverte secrète/);
  assert.match(output, /2 exemplaires/);
});

test('Pagination renders at most the selected page, with correct stable order and total', () => {
  const input = cards(31);
  const result = paginateAlbum({cards: input, page: 1, pageSize: 12});
  assert.equal(result.page, 1);
  assert.equal(result.pages, 3);
  assert.equal(result.total, 31);
  assert.equal(result.start, 12);
  assert.equal(result.end, 24);
  assert.deepEqual(result.slots.map(slot => slot.number), Array.from({length: 12}, (_, i) => 13 + i));
  assert.equal(result.slots[0].card, undefined);
  assert.equal(paginateAlbum({cards: input, page: 2, pageSize: 12}).slots.length, 7);
});

test('Page is clamped after filtering, invalid input, or an interrupted previous page', () => {
  for (const page of [-10, -Infinity, NaN, Infinity, 'oops', undefined]) assert.equal(paginateAlbum({cards: cards(20), page, pageSize: 8}).page, 0);
  assert.equal(paginateAlbum({cards: cards(20), page: 999, pageSize: 8}).page, 2);
  assert.equal(paginateAlbum({cards: cards(2), page: 999, pageSize: 8}).page, 0);
  assert.equal(paginateAlbum({cards: cards(20), page: 1.9, pageSize: 8}).page, 1);
  const empty = paginateAlbum({cards: [], page: 500});
  assert.equal(empty.pages, 1);
  assert.equal(empty.page, 0);
  assert.equal(empty.end, 0);
});

test('Mobile/desktop page sizes 6, 8 and 12 are accepted; unbounded values fall back to 8', () => {
  for (const pageSize of [6, 8, 12, '12']) assert.equal(paginateAlbum({cards: cards(40), pageSize}).slots.length, Number(pageSize));
  for (const pageSize of [0, -1, 500, NaN, Infinity, 'oops']) assert.equal(paginateAlbum({cards: cards(40), pageSize}).slots.length, 8);
});

test('Progress uses the unfiltered catalogue, never the active owned-only/search filter', () => {
  const catalogue = cards(5);
  const output = html({cards: [catalogue[0]], catalogue, owned: {'fiction-1': 1, 'fiction-2': 1, 'fiction-3': 1}, series: {targetCount: 5}});
  assert.match(output, /3 \/ 5/);
  assert.match(output, /aria-valuenow="3"/);
  assert.match(output, /width:60%/);
  assert.match(output, /Emplacements 1–1 sur 1/);
  assert.ok(!output.includes('Série complète'));
});

test('Obsolete manual targets never override the actual active catalogue', () => {
  const result = albumProgress({catalogue: cards(2), owned: {'fiction-1': 1, 'fiction-2': 1}, series: {targetCount: 130}});
  assert.equal(result.obtained, 2);
  assert.equal(result.total, 2);
  assert.equal(result.complete, true);
  assert.equal(result.percent, 100);
});

test('Completed series receive a visible trophy without counting secrets or duplicate copies', () => {
  const catalogue = [card(1), card(2), card(3, {variant: 'secret'})];
  const owned = {'fiction-1': 18, 'fiction-2': 2};
  const result = albumProgress({catalogue, owned, series: {targetCount: 2}});
  assert.equal(result.complete, true);
  assert.equal(result.percent, 100);
  assert.equal(result.obtained, 2);
  const output = html({cards: catalogue, owned, series: {targetCount: 2}});
  assert.match(output, /v15-album-complete/);
  assert.match(output, /Série complète/);
  assert.ok(!output.includes('hors-série'));
  assert.equal(albumProgress({catalogue: []}).complete, false);
});

test('Duplicates of one identity neither create slots nor inflate completion', () => {
  const entry = card(1);
  const input = [entry, {...entry}];
  assert.equal(paginateAlbum({cards: input}).total, 1);
  assert.equal(albumProgress({catalogue: input, owned: {'fiction-1': 1}}).obtained, 1);
});

test('Prototype properties and invalid quantities cannot grant ownership or reveal a secret', () => {
  const input = [card(1, {id: '__proto__', variant: 'secret'}), card(2, {id: 'toString', variant: 'secret'})];
  assert.equal(paginateAlbum({cards: input, owned: {}}).total, 0);
  for (const quantity of [0, -3, NaN, Infinity, 'oops', 0.5]) {
    assert.equal(paginateAlbum({cards: [card(1, {variant: 'secret'})], owned: {'fiction-1': quantity}}).total, 0);
  }
  assert.equal(paginateAlbum({cards: [card(1)], owned: new Map([['fiction-1', 3]])}).slots[0].quantity, 3);
});

test('Rendering never mutates the catalogue, ownership, series or card object', () => {
  const input = Object.freeze([Object.freeze(card(1)), Object.freeze(card(2, {variant: 'secret'})), Object.freeze(card(3, {archived: true}))]);
  const owned = Object.freeze({'fiction-1': 2, 'fiction-2': 1, 'fiction-3': 4});
  const series = Object.freeze({targetCount: 1, name: 'Série fictive'});
  const before = JSON.stringify({input, owned, series});
  assert.doesNotThrow(() => html({cards: input, owned, series}));
  assert.equal(JSON.stringify({input, owned, series}), before);
});

test('Previous/next buttons are delegated, bounded, keyboard reachable and announced', () => {
  const first = html({cards: cards(14), pageSize: 6});
  assert.match(first, /type="button" data-action="album-page" data-page="0" aria-label="Page précédente de l’album" disabled/);
  assert.match(first, /type="button" data-action="album-page" data-page="1" aria-label="Page suivante de l’album" >/);
  assert.match(first, /role="status" aria-live="polite" aria-atomic="true">Page 1 sur 3/);
  const last = html({cards: cards(14), pageSize: 6, page: 2});
  assert.match(last, /data-page="1" aria-label="Page précédente de l’album" >/);
  assert.match(last, /data-page="2" aria-label="Page suivante de l’album" disabled/);
  assert.match(last, /Emplacements 13–14 sur 14/);
  assert.match(last, /<ol class="v15-album-leaf" start="13"/);
});

test('Owned slots call the current renderer with accessible detail and lazy-image options', () => {
  const calls = [];
  html({cards: cards(3), owned: {'fiction-1': 1, 'fiction-3': 2}, renderCard(value, options) {calls.push([value.id, options]); return '<div class="tcg-card"></div>';}});
  assert.deepEqual(calls, [['fiction-1', {accessible: true, lazy: true}], ['fiction-3', {accessible: true, lazy: true}]]);
});

test('The real card renderer retains illustration, five stats and the original detail action in album', () => {
  const value = card(1, {rarity: 'ultra', variant: 'gold', family: 'Fiction', art: 'data:image/png;base64,AA==', power: 91, size: 35, def: 71, aura: 88, intelligence: 63});
  const state = {owned: {'fiction-1': 1}, artwork: {}};
  const context = {esc, safeImage: uri => uri, CSSColor: (_value, fallback) => fallback, statValue: (c, key) => c[key], STAT_FIELDS: ['power', 'size', 'def', 'aura', 'intelligence'].map(key => ({key, label: key})), RARITIES: {ultra: {label: 'Ultra'}}, rarityName: () => 'Ultra', editionText: () => 'N°001/130 · S02', onlineUser: {role: 'player'}, state};
  const output = html({cards: [value], owned: state.owned, renderCard: (c, options) => renderMashupV10Card(c, options, context)});
  assert.match(output, /data-action="detail" data-id="fiction-1"/);
  assert.match(output, /role="button" tabindex="0"/);
  assert.match(output, /src="data:image\/png;base64,AA=="/);
  assert.equal((output.match(/class="v10-stat v10-stat-/g) || []).length, 5);
  assert.match(output, /Pièce d’exception/);
});

test('Large catalogues remain bounded to one page of rendered cards', () => {
  const input = cards(5000);
  const owned = Object.fromEntries(input.map(value => [value.id, 1]));
  let rendered = 0;
  const output = html({cards: input, owned, page: 200, pageSize: 12, renderCard() { rendered++; return '<div class="tcg-card"></div>'; }});
  assert.equal(rendered, 12);
  assert.equal((output.match(/class="v15-album-slot(?: |")/g) || []).length, 12);
  assert.ok(output.length < 20000);
  assert.match(output, /Page 201 sur 417/);
});

test('Escaping, unknown serials and empty selections stay valid without NaN or private content', () => {
  const output = html({cards: [card(1, {editionNumber: '<script>'})], series: {name: '<img src=x onerror=bad>', targetCount: 'wrong'}});
  assert.ok(!output.includes('<img'));
  assert.match(output, /&lt;img src=x onerror=bad&gt;/);
  assert.match(output, /N° 001/);
  assert.ok(!output.includes('NaN'));
  const empty = html({cards: null, catalogue: null, page: 500});
  assert.match(empty, /Aucun emplacement dans cette sélection/);
  assert.match(empty, /Page 1 sur 1/);
  assert.ok(!empty.includes('Emplacements 1–0'));
  assert.ok(!empty.includes('Série complète'));
});

test('Missing renderer produces an explicit integration error', () => {
  assert.throws(() => albumMarkup({cards: []}), /existing card renderer/);
});
