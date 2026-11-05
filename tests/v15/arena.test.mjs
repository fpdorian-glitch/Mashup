import test from 'node:test';
import assert from 'node:assert/strict';
import { combatPresentationKey, createArenaPresentation } from '../../50-v15-arena.js';

function node() {
  const classes = new Set(), attributes = new Map();
  return {
    classes, attributes, calls: [], isConnected: true,
    classList: { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)), toggle(name, force) { if (force) classes.add(name); else classes.delete(name); } },
    setAttribute: (name, value) => attributes.set(name, value), removeAttribute: name => attributes.delete(name),
    animate(frames, options) { const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } }; this.calls.push(animation); return animation; }
  };
}
function scene({ pvp = false } = {}) {
  const field = node(), teams = [node(), node()], stats = [node(), node()], scores = [node(), node()], result = node(), pvpScore = node();
  field.ownerDocument = { visibilityState: 'visible' };
  field.matches = () => true;
  field.querySelectorAll = selector => {
    if (selector === '.combat-duel > .combat-team,.pvp-duel-grid > .pvp-side') return teams;
    if (selector === '.duel-score > div > strong') return pvp ? [] : scores;
    if (selector === '.v15-stat-selected') return stats.filter(n => n.classes.has('v15-stat-selected'));
    if (selector === '[data-v15-side]') return teams;
    if (selector === '.v10-stat-0,[data-stat="power"]') return stats;
    return [];
  };
  field.querySelector = selector => selector === '.flex-between h3' ? pvpScore : result;
  return { field, teams, stats, scores, result, pvpScore };
}
const choose = { matchId: 'fixture-match', round: 0, stage: 'choose', turn: 'player', playerScore: 0, enemyScore: 0 };
const reveal = { ...choose, stage: 'reveal', stat: 'power', winner: 'player', playerScore: 1 };

test('Arène : empreinte stable malgré horodatage et propriétés serveur sans rapport', () => {
  assert.equal(combatPresentationKey(choose), combatPresentationKey({ ...choose, updatedAt: 1200, owner: { id: 'fixture' } }));
  assert.notEqual(combatPresentationKey(choose), combatPresentationKey(reveal));
  assert.notEqual(combatPresentationKey(choose), combatPresentationKey({ ...choose, matchId: 'another-match' }));
  assert.equal(combatPresentationKey({}), combatPresentationKey({ playerScore: null }));
  assert.equal(combatPresentationKey({ winner: '<unknown>' }), combatPresentationKey({ winner: '' }));
});

test('Arène : les deux équipes entrent ensemble sans délai ni verrou de jeu', () => {
  const s = scene(), presentation = createArenaPresentation();
  const result = presentation.update({ ...choose, root: s.field });
  assert.equal(result.changed, true); assert.equal(result.animated, true);
  assert.deepEqual(s.teams.map(n => n.calls.length), [1, 1]);
  for (const team of s.teams) { assert.equal(team.calls[0].options.duration, 180); assert.equal(team.calls[0].options.delay, undefined); assert.equal(team.calls[0].options.fill, 'none'); }
  assert.equal(s.field.attributes.get('data-v15-stage'), 'choose');
  assert.equal(s.field.attributes.get('data-v15-winner'), '');
  assert.equal(s.field.style, undefined); // The controller never sets visibility or pointer blocking.
  assert.equal(s.scores[0].calls.length, 0);
});

test('Arène : résultat fourni intact, vraie statistique surlignée, point changé pulsé une seule fois', () => {
  const s = scene(), presentation = createArenaPresentation();
  presentation.update({ ...choose, root: s.field });
  const original = { ...reveal, root: s.field };
  presentation.update(original);
  assert.equal(original.playerScore, 1); assert.equal(original.winner, 'player');
  assert.ok(s.stats.every(n => n.classes.has('v15-stat-selected')));
  assert.equal(s.field.attributes.get('data-v15-stat'), 'power');
  assert.equal(s.field.attributes.get('data-v15-winner'), 'player');
  assert.equal(s.scores[0].calls.length, 1); assert.equal(s.scores[1].calls.length, 0);
  assert.equal(s.result.calls.length, 1);
  const repeated = presentation.update({ ...original, updatedAt: 'poll' });
  assert.equal(repeated.changed, false); assert.equal(repeated.animated, false);
  assert.equal(s.scores[0].calls.length, 1); assert.equal(s.result.calls.length, 1);
  presentation.update({ ...choose, round: 1, playerScore: 1, root: s.field });
  assert.ok(s.stats.every(n => !n.classes.has('v15-stat-selected')));
});

test('Arène PvP : changement du score adverse anime le compteur existant, sans fabriquer de résultat', () => {
  const s = scene({ pvp: true }), presentation = createArenaPresentation();
  presentation.update({ ...choose, root: s.field });
  presentation.update({ ...choose, stage: 'reveal', enemyScore: 1, root: s.field });
  assert.equal(s.pvpScore.calls.length, 1);
  assert.equal(s.field.attributes.get('data-v15-winner'), '');
  assert.ok(s.stats.every(n => !n.classes.has('v15-stat-selected')));
});

test('Arène : snapshot identique sur DOM reconstruit ne rejoue pas le combat', () => {
  const first = scene(), second = scene(), presentation = createArenaPresentation();
  presentation.update({ ...reveal, root: first.field });
  const animation = first.teams[0].calls[0];
  const result = presentation.update({ ...reveal, root: second.field });
  assert.equal(result.changed, false); assert.equal(result.animated, false);
  assert.equal(animation.cancelled, true);
  assert.equal(second.teams[0].calls.length, 0);
  assert.ok(second.stats[0].classes.has('v15-stat-selected'));
  assert.ok(!first.field.classes.has('v15-arena-scene'));
});

test('Arène : nouvelle partie et sortie de page annulent immédiatement les animations', () => {
  const s = scene(), presentation = createArenaPresentation();
  presentation.update({ ...choose, root: s.field });
  const first = s.teams[0].calls[0];
  presentation.update({ ...choose, matchId: 'new-match', playerScore: 4, root: s.field });
  assert.equal(first.cancelled, true);
  assert.equal(s.scores[0].calls.length, 0); // Account/match change cannot animate another player's balance.
  const latest = s.teams[0].calls[1];
  presentation.clear();
  assert.equal(latest.cancelled, true);
  assert.equal(s.field.attributes.has('data-v15-stage'), false);
  assert.equal(s.field.classes.has('v15-arena-scene'), false);
  assert.equal(s.teams[0].attributes.has('data-v15-side'), false);
  assert.equal(presentation.update({ root: null }).key, null);
});

test('Arène : modes réduit/éco, document masqué et animation indisponible restent fonctionnels', () => {
  for (const option of [{ isReducedMotion: () => true }, { getQuality: () => 'eco' }]) {
    const s = scene(), presentation = createArenaPresentation(option);
    const result = presentation.update({ ...reveal, root: s.field });
    assert.equal(result.animated, false); assert.ok(s.stats[0].classes.has('v15-stat-selected'));
    assert.ok(s.field.classes.has('v15-arena-quiet'));
  }
  const s = scene(), presentation = createArenaPresentation();
  s.field.ownerDocument.visibilityState = 'hidden';
  assert.equal(presentation.update({ ...reveal, root: s.field }).animated, false);
  s.field.ownerDocument.visibilityState = 'visible';
  for (const element of [...s.teams, ...s.scores, s.result]) element.animate = () => { throw new Error('Unsupported browser'); };
  assert.doesNotThrow(() => presentation.update({ ...choose, round: 1, root: s.field }));
  s.field.isConnected = false;
  assert.equal(presentation.update({ ...choose, root: s.field }).key, null);
});

test('Arène : désactivation en cours de manche et passage éco nettoient les animations', () => {
  const s = scene(); let quality = 'high';
  const presentation = createArenaPresentation({ getQuality: () => quality });
  presentation.update({ ...choose, root: s.field });
  const first = s.teams[0].calls[0];
  quality = 'eco';
  presentation.update({ ...choose, root: s.field });
  assert.equal(first.cancelled, true);
  assert.ok(s.field.classes.has('v15-arena-quiet'));
  presentation.update({ ...choose, root: s.field, active: false });
  assert.equal(s.field.classes.has('v15-arena-scene'), false);
});
