/* Mashup Match — shared deterministic rules. No DOM, clock, network or wallet.
 * Only the authenticated server may turn a validated win into a reward.
 */
export const MATCH_ENGINE_VERSION = '15.4.0-r1';
export const MATCH_SPECIALS = Object.freeze(['row', 'column', 'nova', 'prism']);
const MAX_SIDE = 9, MAX_CASCADES = 32;
const clone = value => JSON.parse(JSON.stringify(value));
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const coordinate = (index, width) => ({x: index % width, y: Math.floor(index / width)});
function nextRandom(state) {
  let x = state.rng >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.rng = x >>> 0;
  return state.rng / 4294967296;
}
function seedNumber(seed) {
  if (typeof seed === 'string') {
    let value = 2166136261;
    for (const character of seed.slice(0, 200)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
    return (value >>> 0) || 1;
  }
  if (!Number.isSafeInteger(seed)) throw new TypeError('Seed must be an integer or string');
  return (seed >>> 0) || 1;
}
const usable = (state, index) => state.mask[index] && state.obstacles[index] === 0;
function adjacent(a, b, width) {
  return Math.abs(a % width - b % width) + Math.abs(Math.floor(a / width) - Math.floor(b / width)) === 1;
}
function neighbours(index, width, height) {
  const {x, y} = coordinate(index, width), result = [];
  if (x) result.push(index - 1);
  if (x + 1 < width) result.push(index + 1);
  if (y) result.push(index - width);
  if (y + 1 < height) result.push(index + width);
  return result;
}
function checkState(state) {
  if (!state || !integer(state.width, 4, MAX_SIDE) || !integer(state.height, 4, MAX_SIDE)) throw new TypeError('Invalid Match state');
  const length = state.width * state.height;
  if (!Array.isArray(state.board) || state.board.length !== length || !Array.isArray(state.mask) || state.mask.length !== length || !Array.isArray(state.obstacles) || state.obstacles.length !== length) throw new TypeError('Invalid Match board');
  if (!integer(state.colors, 4, 6) || !integer(state.movesLeft, 0, 100) || !integer(state.movesUsed, 0, 100) || !integer(state.score, 0, 100000000) || !integer(state.rng, 1, 4294967295)) throw new TypeError('Invalid Match counters');
  if (!['playing', 'won', 'lost'].includes(state.status)) throw new TypeError('Invalid Match status');
  if (!integer(state.levelId, 1, 100000) || !integer(state.seed, 1, 4294967295) || !goalsValid(state.goals, state.colors) || !Array.isArray(state.collected) || state.collected.length !== 6 || state.collected.some(value => !integer(value, 0, 1000000)) || !integer(state.destroyedObstacles, 0, 81)) throw new TypeError('Invalid Match progress');
  if (!Array.isArray(state.starTargets) || state.starTargets.length !== 3 || state.starTargets.some((value, i, array) => !integer(value, 1, 10000000) || (i > 0 && value <= array[i - 1]))) throw new TypeError('Invalid Match stars');
  for (let i = 0; i < length; i++) {
    if (typeof state.mask[i] !== 'boolean' || !integer(state.obstacles[i], 0, 3)) throw new TypeError('Invalid Match terrain');
    const tile = state.board[i];
    if (!state.mask[i]) {if (tile !== null || state.obstacles[i]) throw new TypeError('Invalid Match void'); continue;}
    if (!tile || !integer(tile.kind, 0, state.colors - 1) || !(tile.special === null || MATCH_SPECIALS.includes(tile.special))) throw new TypeError('Invalid Match tile');
  }
}
/** Maximal horizontal/vertical runs; obstacles block a line. */
export function findMatches(board, width, height, obstacles = []) {
  if (!integer(width, 4, MAX_SIDE) || !integer(height, 4, MAX_SIDE) || !Array.isArray(board) || board.length !== width * height) throw new TypeError('Invalid board dimensions');
  const runs = [];
  function scan(indices, direction) {
    let run = [], kind = -1;
    const flush = () => {if (run.length >= 3) runs.push({direction, kind, cells: run.slice()}); run = []; kind = -1;};
    for (const index of indices) {
      const tile = board[index];
      if (!tile || obstacles[index] > 0 || tile.special === 'prism') {flush(); continue;}
      if (tile.kind !== kind) flush();
      kind = tile.kind; run.push(index);
    }
    flush();
  }
  for (let y = 0; y < height; y++) scan(Array.from({length: width}, (_, x) => y * width + x), 'row');
  for (let x = 0; x < width; x++) scan(Array.from({length: height}, (_, y) => y * width + x), 'column');
  const cells = [...new Set(runs.flatMap(run => run.cells))].sort((a, b) => a - b);
  return {runs, cells};
}
function validSwap(state, from, to) {
  if (!usable(state, from) || !usable(state, to)) return false;
  const a = state.board[from], b = state.board[to];
  if (a.special === 'prism' || b.special === 'prism' || (a.special && b.special)) return true;
  const board = state.board.slice(); [board[from], board[to]] = [board[to], board[from]];
  return findMatches(board, state.width, state.height, state.obstacles).cells.some(index => index === from || index === to);
}
/** Legal adjacent pairs, stable in row-major order. Does not mutate the state. */
export function legalMoves(state) {
  checkState(state);
  const moves = [];
  for (let from = 0; from < state.board.length; from++) {
    if (!usable(state, from)) continue;
    for (const to of [from % state.width + 1 < state.width ? from + 1 : -1, from + state.width < state.board.length ? from + state.width : -1]) {
      if (to >= 0 && validSwap(state, from, to)) moves.push({from, to});
    }
  }
  return moves;
}
function fillWithoutMatches(state) {
  for (let index = 0; index < state.board.length; index++) {
    if (!state.mask[index]) {state.board[index] = null; continue;}
    const choices = [];
    for (let kind = 0; kind < state.colors; kind++) {
      const x = index % state.width, y = Math.floor(index / state.width);
      const left = x >= 2 && !state.obstacles[index - 1] && !state.obstacles[index - 2] && state.board[index - 1]?.kind === kind && state.board[index - 2]?.kind === kind;
      const above = y >= 2 && !state.obstacles[index - state.width] && !state.obstacles[index - state.width * 2] && state.board[index - state.width]?.kind === kind && state.board[index - state.width * 2]?.kind === kind;
      if (!left && !above) choices.push(kind);
    }
    state.board[index] = {kind: choices[Math.floor(nextRandom(state) * choices.length)], special: null};
  }
}
function prepareBoard(state) {
  for (let attempt = 0; attempt < 100; attempt++) {
    fillWithoutMatches(state);
    if (legalMoves(state).length) return;
  }
  throw new Error('This terrain cannot produce a playable Match board');
}
function goalsValid(goals, colors) {
  return goals && integer(goals.score ?? 0, 0, 1000000) && integer(goals.obstacles ?? 0, 0, 81) && Array.isArray(goals.collect) && goals.collect.length === 6 && goals.collect.every((count, kind) => integer(count, 0, 500) && (kind < colors || count === 0)) && (goals.score > 0 || goals.obstacles > 0 || goals.collect.some(Boolean));
}
export function createMatch(level, seed = level?.seed ?? 154) {
  if (!level || !integer(level.id, 1, 100000) || !integer(level.width, 4, MAX_SIDE) || !integer(level.height, 4, MAX_SIDE) || !integer(level.colors, 4, 6) || !integer(level.moves, 1, 100)) throw new TypeError('Invalid Match level');
  const length = level.width * level.height;
  if (!Array.isArray(level.mask) || level.mask.length !== length || !Array.isArray(level.obstacles) || level.obstacles.length !== length || !goalsValid(level.goals, level.colors)) throw new TypeError('Invalid level objectives or terrain');
  if (level.starTargets !== undefined && (!Array.isArray(level.starTargets) || level.starTargets.length !== 3 || level.starTargets.some((value, i, array) => !integer(value, 1, 10000000) || (i > 0 && value <= array[i - 1])))) throw new TypeError('Invalid star thresholds');
  if (level.mask.some(value => typeof value !== 'boolean') || level.obstacles.some((hp, i) => !integer(hp, 0, 3) || (!level.mask[i] && hp))) throw new TypeError('Invalid level terrain');
  const initial = seedNumber(seed);
  const state = {engineVersion: MATCH_ENGINE_VERSION, levelId: level.id, width: level.width, height: level.height, colors: level.colors, mask: level.mask.slice(), obstacles: level.obstacles.slice(), board: Array(length).fill(null), seed: initial, rng: initial, score: 0, movesLeft: level.moves, movesUsed: 0, status: 'playing', goals: clone(level.goals), collected: [0, 0, 0, 0, 0, 0], destroyedObstacles: 0, starTargets: Array.isArray(level.starTargets) ? level.starTargets.slice() : [level.goals.score || 1000, (level.goals.score || 1000) * 1.5, (level.goals.score || 1000) * 2], stars: 0};
  if (state.goals.obstacles > state.obstacles.filter(Boolean).length) throw new TypeError('Unreachable obstacle goal');
  prepareBoard(state);
  return state;
}
function matchPlans(matches, preferred, board) {
  const groups = [];
  for (const run of matches.runs) {
    const intersecting = groups.filter(group => run.cells.some(index => group.cells.has(index)));
    if (!intersecting.length) {groups.push({runs: [run], cells: new Set(run.cells)}); continue;}
    const target = intersecting[0]; target.runs.push(run); run.cells.forEach(index => target.cells.add(index));
    for (const other of intersecting.slice(1)) {target.runs.push(...other.runs); other.cells.forEach(index => target.cells.add(index)); groups.splice(groups.indexOf(other), 1);}
  }
  return groups.flatMap(group => {
    const five = group.runs.find(run => run.cells.length >= 5);
    const crossing = group.runs.some(a => group.runs.some(b => a.direction !== b.direction && a.cells.some(index => b.cells.includes(index))));
    const four = group.runs.find(run => run.cells.length >= 4);
    const special = five ? 'prism' : crossing ? 'nova' : four ? four.direction : null;
    if (!special) return [];
    const eligible = (five ? five.cells : [...group.cells]).filter(index => !board[index]?.special);
    if (!eligible.length) return [];
    const index = preferred.find(value => eligible.includes(value)) ?? eligible[Math.floor(eligible.length / 2)];
    return [{index, special}];
  });
}
function areaCells(state, index, radius) {
  const center = coordinate(index, state.width), result = [];
  for (let y = Math.max(0, center.y - radius); y <= Math.min(state.height - 1, center.y + radius); y++) for (let x = Math.max(0, center.x - radius); x <= Math.min(state.width - 1, center.x + radius); x++) if (state.mask[y * state.width + x]) result.push(y * state.width + x);
  return result;
}
function lineCells(state, index, orientation) {
  const {x, y} = coordinate(index, state.width);
  return (orientation === 'row' ? Array.from({length: state.width}, (_, column) => y * state.width + column) : Array.from({length: state.height}, (_, row) => row * state.width + x)).filter(i => state.mask[i]);
}
function specialCells(state, index, targetKind) {
  const tile = state.board[index];
  if (tile.special === 'row' || tile.special === 'column') return lineCells(state, index, tile.special);
  if (tile.special === 'nova') return areaCells(state, index, 1);
  if (tile.special === 'prism') {
    const kind = targetKind ?? state.board.find((candidate, i) => candidate && !state.obstacles[i] && candidate.special !== 'prism')?.kind ?? 0;
    return state.board.flatMap((candidate, i) => candidate && (candidate.kind === kind || i === index) ? [i] : []);
  }
  return [index];
}
function swapSpecials(state, from, to) {
  const a = state.board[from], b = state.board[to];
  if (a.special === 'prism' || b.special === 'prism') {
    if (a.special === 'prism' && b.special === 'prism') return state.board.flatMap((tile, i) => tile ? [i] : []);
    const prism = a.special === 'prism' ? from : to, other = prism === from ? to : from, target = state.board[other];
    if (target.special) for (let i = 0; i < state.board.length; i++) if (state.board[i]?.kind === target.kind && !state.obstacles[i] && i !== prism) state.board[i].special = target.special;
    return [...specialCells(state, prism, target.kind), prism, other];
  }
  if (a.special && b.special) {
    if (a.special === 'nova' && b.special === 'nova') return [...areaCells(state, from, 2), ...areaCells(state, to, 2)];
    if (a.special === 'nova' || b.special === 'nova') {
      const at = a.special === 'nova' ? from : to, {x, y} = coordinate(at, state.width), result = [];
      for (let offset = -1; offset <= 1; offset++) {
        if (y + offset >= 0 && y + offset < state.height) result.push(...lineCells(state, (y + offset) * state.width + x, 'row'));
        if (x + offset >= 0 && x + offset < state.width) result.push(...lineCells(state, y * state.width + x + offset, 'column'));
      }
      return result;
    }
    return [...lineCells(state, from, 'row'), ...lineCells(state, from, 'column'), ...lineCells(state, to, 'row'), ...lineCells(state, to, 'column')];
  }
  return [];
}
function clearWave(state, cells, created, cascade, events) {
  const protectedCells = new Set(created.map(item => item.index)), all = new Set(cells), queue = [...all], activated = new Set();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], tile = state.board[index];
    if (!tile?.special || state.obstacles[index] || protectedCells.has(index) || activated.has(index)) continue;
    activated.add(index);
    for (const affected of specialCells(state, index)) if (!all.has(affected)) {all.add(affected); queue.push(affected);}
  }
  const affectedObstacles = new Set(), cleared = [];
  for (const index of all) {
    if (!state.mask[index]) continue;
    if (state.obstacles[index]) {affectedObstacles.add(index); continue;}
    for (const neighbour of neighbours(index, state.width, state.height)) if (state.obstacles[neighbour]) affectedObstacles.add(neighbour);
    if (protectedCells.has(index) || !state.board[index]) continue;
    const tile = state.board[index]; state.collected[tile.kind]++; cleared.push(index); state.board[index] = null;
  }
  const damaged = [];
  for (const index of affectedObstacles) {
    state.obstacles[index]--; damaged.push({index, hp: state.obstacles[index]});
    if (!state.obstacles[index]) state.destroyedObstacles++;
  }
  for (const item of created) if (state.board[item.index]) state.board[item.index].special = item.special;
  const multiplier = Math.min(cascade, 5), points = (cleared.length * 60 + created.length * 120 + damaged.length * 30) * multiplier;
  state.score += points;
  events.push({type: 'clear', cells: cleared, created, activated: [...activated], damaged, cascade, multiplier, points, board: clone(state.board)});
}
function gravity(state, events) {
  const moves = [], spawned = [];
  for (let x = 0; x < state.width; x++) {
    let segment = [];
    const collapse = () => {
      if (!segment.length) return;
      const tiles = segment.flatMap(index => state.board[index] ? [{index, tile: state.board[index]}] : []);
      for (const index of segment) state.board[index] = null;
      for (let cursor = segment.length - 1; cursor >= 0; cursor--) {
        const target = segment[cursor], source = tiles.pop();
        if (source) {state.board[target] = source.tile; if (source.index !== target) moves.push({from: source.index, to: target});}
        else {state.board[target] = {kind: Math.floor(nextRandom(state) * state.colors), special: null}; spawned.push(target);}
      }
      segment = [];
    };
    for (let y = 0; y < state.height; y++) {
      const index = y * state.width + x;
      if (!state.mask[index] || state.obstacles[index]) collapse(); else segment.push(index);
    }
    collapse();
  }
  events.push({type: 'fall', moves, spawned, board: clone(state.board), obstacles: state.obstacles.slice()});
}
function shuffleMutable(state) {
  const positions = state.board.flatMap((tile, i) => usable(state, i) ? [i] : []), original = positions.map(index => state.board[index]);
  for (let attempt = 0; attempt < 100; attempt++) {
    const shuffled = original.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {const at = Math.floor(nextRandom(state) * (i + 1)); [shuffled[i], shuffled[at]] = [shuffled[at], shuffled[i]];}
    positions.forEach((index, i) => state.board[index] = shuffled[i]);
    if (!findMatches(state.board, state.width, state.height, state.obstacles).cells.length && legalMoves(state).length) return;
  }
  // A pathological distribution is recoloured; all earned specials are retained.
  const specials = original.map(tile => tile.special).filter(Boolean);
  prepareBoard(state);
  positions.slice(0, specials.length).forEach((index, i) => state.board[index].special = specials[i]);
}
export function shuffleBoard(input) {
  checkState(input); const state = clone(input); shuffleMutable(state); return state;
}
export function progressFor(state) {
  const complete = state.score >= (state.goals.score || 0) && state.destroyedObstacles >= (state.goals.obstacles || 0) && state.goals.collect.every((target, kind) => state.collected[kind] >= target);
  return {score: {current: state.score, target: state.goals.score || 0}, collect: state.goals.collect.flatMap((target, kind) => target ? [{kind, current: state.collected[kind], target}] : []), obstacles: {current: state.destroyedObstacles, target: state.goals.obstacles || 0}, complete, status: state.status, stars: state.stars || 0};
}
/** A swap is atomic. Invalid moves neither mutate input nor consume moves. */
export function applyMove(input, move) {
  checkState(input);
  const from = move?.from, to = move?.to, length = input.board.length;
  if (input.status !== 'playing' || !integer(from, 0, length - 1) || !integer(to, 0, length - 1) || !adjacent(from, to, input.width) || !validSwap(input, from, to)) return {state: input, valid: false, reason: input.status !== 'playing' ? 'finished' : 'invalid-swap', events: [{type: 'invalid', from: integer(from, 0, length - 1) ? from : null, to: integer(to, 0, length - 1) ? to : null}]};
  const state = clone(input), events = [{type: 'swap', from, to}];
  [state.board[from], state.board[to]] = [state.board[to], state.board[from]];
  state.movesUsed++; state.movesLeft--;
  let forced = swapSpecials(state, from, to), cascade = 1;
  // The colour selected by the swap is authoritative for this prism blast.
  // Do not re-trigger it with a second, unrelated default colour in clearWave.
  if (forced.length) for (const index of [from, to]) if (state.board[index].special === 'prism') state.board[index].special = null;
  while (cascade <= MAX_CASCADES) {
    const matches = findMatches(state.board, state.width, state.height, state.obstacles);
    if (!forced.length && !matches.cells.length) break;
    const created = forced.length ? [] : matchPlans(matches, [to, from], state.board);
    clearWave(state, [...forced, ...matches.cells], created, cascade, events); gravity(state, events);
    forced = []; cascade++;
  }
  if (findMatches(state.board, state.width, state.height, state.obstacles).cells.length) {shuffleMutable(state); events.push({type: 'shuffle', reason: 'cascade-limit', board: clone(state.board)});}
  if (progressFor(state).complete) {state.status = 'won'; state.stars = 1 + Number(state.score >= state.starTargets[1]) + Number(state.score >= state.starTargets[2]);}
  else if (!state.movesLeft) state.status = 'lost';
  else if (!legalMoves(state).length) {shuffleMutable(state); events.push({type: 'shuffle', reason: 'no-moves', board: clone(state.board)});}
  if (state.status !== 'playing') events.push({type: 'end', status: state.status, stars: state.stars, score: state.score});
  return {state, valid: true, events};
}
/** Server verifier: deterministic reconstruction, never a client-supplied score. */
export function replayMatch(level, seed, moves) {
  if (!Array.isArray(moves) || moves.length > level.moves || moves.length > 100) throw new TypeError('Invalid move transcript');
  let state = createMatch(level, seed);
  for (const move of moves) {const result = applyMove(state, move); if (!result.valid) throw new Error('Invalid replay move'); state = result.state;}
  return state;
}
