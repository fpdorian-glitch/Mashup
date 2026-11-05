/* MASHUP V15 · Arena presentation. Server state remains the only source of truth.
   No timers, requests, locks or game actions: update after rendering a snapshot. */
const STAT_KEYS = ['power', 'size', 'def', 'aura', 'intelligence'];
const STAT_NAMES = ['Puissance', 'Taille', 'Défense', 'Aura', 'Intelligence'];
const FIELD_SELECTOR = '.challenge-field,.pvp-field';
const CLASS_NAMES = ['v15-arena-scene', 'v15-arena-quiet', 'v15-arena-finished'];

function normalise(snapshot = {}) {
  const stage = snapshot.finished ? 'finished' : snapshot.stage === 'reveal' ? 'reveal' : 'choose';
  const stat = STAT_KEYS.includes(snapshot.stat) ? snapshot.stat : '';
  const winner = ['player', 'enemy', 'draw'].includes(snapshot.winner) ? snapshot.winner : '';
  const score = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  return {
    matchId: String(snapshot.matchId ?? snapshot.identity ?? ''),
    round: Number.isFinite(Number(snapshot.round)) ? Number(snapshot.round) : 0,
    stage, stat, winner, playerScore: score(snapshot.playerScore), enemyScore: score(snapshot.enemyScore),
    turn: snapshot.turn === 'enemy' ? 'enemy' : snapshot.turn === 'player' ? 'player' : '',
    finished: Boolean(snapshot.finished)
  };
}

/** Excludes polling timestamps, DOM identity and unrelated player/account data. */
export function combatPresentationKey(snapshot = {}) {
  const s = normalise(snapshot);
  return JSON.stringify([s.matchId, s.round, s.stage, s.stat, s.winner, s.playerScore, s.enemyScore, s.turn]);
}

const all = (root, selector) => Array.from(root?.querySelectorAll?.(selector) || []);
function findField(root) {
  return root?.matches?.(FIELD_SELECTOR) ? root : root?.querySelector?.(FIELD_SELECTOR);
}

/** The short animations move wrappers, preserving each card's physical renderer. */
export function createArenaPresentation(options = {}) {
  let previous = null, previousField = null;
  const animations = new Set();
  function cancelAnimations() {
    for (const animation of animations) {
      try { animation.cancel(); } catch { /* An already detached browser animation is harmless. */ }
    }
    animations.clear();
  }
  function resetField(field) {
    if (!field) return;
    field.classList?.remove(...CLASS_NAMES);
    for (const attribute of ['data-v15-stage', 'data-v15-winner', 'data-v15-turn', 'data-v15-stat']) field.removeAttribute?.(attribute);
    for (const node of all(field, '.v15-stat-selected')) node.classList?.remove('v15-stat-selected');
    for (const node of all(field, '[data-v15-side]')) node.removeAttribute?.('data-v15-side');
  }
  function clear() {
    cancelAnimations();
    resetField(previousField);
    previous = null;
    previousField = null;
  }
  function animate(node, frames, duration) {
    if (!node?.animate) return false;
    try {
      const animation = node.animate(frames, { duration, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'none' });
      animations.add(animation);
      if (animation.finished?.then) animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      return true;
    } catch { return false; }
  }
  function update(snapshot = {}) {
    const root = snapshot.root;
    const field = findField(root);
    if (!field || root?.isConnected === false || snapshot.active === false) {
      clear();
      return { changed: false, animated: false, key: null };
    }
    const s = normalise(snapshot), key = combatPresentationKey(s);
    const changed = !previous || previous.key !== key;
    const sameMatch = previous?.snapshot.matchId === s.matchId;
    const quality = snapshot.quality ?? options.getQuality?.() ?? 'balanced';
    const reduced = options.isReducedMotion?.() ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const quiet = Boolean(reduced || ['eco', 'low', 'lite'].includes(quality));
    const visible = field.ownerDocument?.visibilityState !== 'hidden';
    if (field !== previousField || changed || quiet || !visible) cancelAnimations();
    if (field !== previousField) resetField(previousField);
    field.classList?.add('v15-arena-scene');
    field.classList?.toggle('v15-arena-quiet', quiet);
    field.classList?.toggle('v15-arena-finished', s.finished);
    field.setAttribute?.('data-v15-stage', s.stage);
    field.setAttribute?.('data-v15-winner', s.stage === 'choose' ? '' : s.winner);
    field.setAttribute?.('data-v15-turn', s.turn);
    field.setAttribute?.('data-v15-stat', s.stage === 'choose' ? '' : s.stat);
    for (const node of all(field, '.v15-stat-selected')) node.classList?.remove('v15-stat-selected');
    const statIndex = STAT_KEYS.indexOf(s.stat);
    if (s.stage !== 'choose' && statIndex >= 0) {
      for (const node of all(field, `.v10-stat-${statIndex},[data-stat="${s.stat}"]`)) node.classList?.add('v15-stat-selected');
    }
    const teams = all(field, '.combat-duel > .combat-team,.pvp-duel-grid > .pvp-side');
    teams.forEach((node, index) => node.setAttribute?.('data-v15-side', index === 0 ? 'player' : 'enemy'));
    let animated = false;
    if (changed && !quiet && visible) {
      const reveal = s.stage !== 'choose';
      for (const [index, team] of teams.entries()) {
        animated = animate(team, reveal ? [
          { transform: `translate3d(${index === 0 ? '-10' : '10'}px,6px,0)`, opacity: .65 },
          { transform: 'translate3d(0,0,0)', opacity: 1 }
        ] : [{ transform: 'translate3d(0,8px,0)', opacity: .7 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], reveal ? 260 : 180) || animated;
      }
      // Never pulse on first load, round-only changes, or duplicated polling snapshots.
      if (sameMatch) {
        const scoreNodes = all(field, '.duel-score > div > strong');
        const changedScores = new Set();
        for (const [index, name] of ['playerScore', 'enemyScore'].entries()) {
          if (s[name] !== null && previous.snapshot[name] !== null && s[name] !== previous.snapshot[name]) {
            changedScores.add(scoreNodes[index] || field.querySelector?.('.flex-between h3'));
          }
        }
        for (const scoreNode of changedScores) animated = animate(scoreNode, [
          { transform: 'scale(1)', color: '#f4ecdc' }, { transform: 'scale(1.16)', color: '#f4d99e', offset: .45 }, { transform: 'scale(1)', color: '#f4ecdc' }
        ], 240) || animated;
      }
      if (reveal) {
        const result = field.querySelector?.('.battle-end,.challenge-result,.comparison-numbers');
        animated = animate(result, [{ opacity: .4, transform: 'translate3d(0,8px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], 220) || animated;
      }
    }
    previousField = field;
    previous = { key, snapshot: s };
    return { changed, animated, key, statLabel: statIndex >= 0 ? STAT_NAMES[statIndex] : '' };
  }
  return { update, clear };
}
