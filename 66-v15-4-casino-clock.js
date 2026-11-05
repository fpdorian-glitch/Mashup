/* Mashup V15.4 — a projection of the server schedule, never a match scheduler.
 * All dates are absolute server timestamps. No ten-minute fallback is invented.
 */
export function casinoTimestamp(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const number = Number(value);
  if (Number.isFinite(number) && number >= 0) return number;
  const date = Date.parse(value);
  return Number.isFinite(date) && date >= 0 ? date : null;
}

export function formatCasinoCountdown(milliseconds) {
  if (!Number.isFinite(milliseconds)) return '--:--';
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}

export function casinoClockState(snapshot, serverNow, {stale = false} = {}) {
  const current = snapshot?.current;
  // closesAt is the existing deployed client contract. startsAt is accepted only
  // when the server explicitly supplies an absolute start time instead.
  const deadline = casinoTimestamp(current?.closesAt) ?? casinoTimestamp(current?.startsAt);
  const synchronized = Number.isFinite(serverNow);
  const remainingMs = deadline !== null && synchronized ? Math.max(0, deadline - serverNow) : null;
  const urgent = remainingMs !== null && remainingMs > 0 && remainingMs <= 20000;
  const live = snapshot?.live;
  const finished = live && (live.finished === true || (live.winner !== undefined && live.winner !== null) || ['finished', 'settled'].includes(live.status));
  const explicitClosed = current && (snapshot?.enabled === false || current.bettingOpen === false || current.locked === true || ['closed', 'live', 'finished', 'settled', 'cancelled'].includes(current.status));
  const windowOpen = !!current && synchronized && deadline !== null && deadline > serverNow && !explicitClosed;
  let phase = !synchronized ? 'syncing' : deadline === null ? 'waiting' : remainingMs === 0 || explicitClosed ? 'closed' : urgent ? 'closing' : 'open';
  if (live) phase = finished ? 'results' : 'live';
  const labels = {
    syncing: 'Synchronisation avec la ligue',
    waiting: 'Prochain duel en préparation',
    open: 'Paris ouverts',
    closing: 'Fermeture imminente des paris',
    closed: 'Paris fermés · confirmation du serveur',
    live: 'Combat en cours',
    results: 'Résultats disponibles'
  };
  return {
    matchId: current?.id ?? (deadline === null ? null : 'scheduled-' + deadline),
    deadline, serverNow: synchronized ? serverNow : null, remainingMs,
    seconds: remainingMs === null ? null : Math.ceil(remainingMs / 1000),
    text: formatCasinoCountdown(remainingMs), phase, label: labels[phase], urgent,
    synchronized, stale, windowOpen,
    canBet: windowOpen && !stale && !!snapshot?.league && snapshot?.enabled !== false && !snapshot?.bet
  };
}

export function createCasinoClock({now = () => Date.now(), maxAge = 30000} = {}) {
  let offset = null, received = null;
  function observe(snapshot, {sentAt, receivedAt = now()} = {}) {
    const server = casinoTimestamp(snapshot?.now);
    if (server === null || !Number.isFinite(receivedAt)) return false;
    const start = Number.isFinite(sentAt) && sentAt <= receivedAt ? sentAt : receivedAt;
    // Midpoint correction bounds ordinary transit error without depending on the
    // device clock being correct or on a setInterval running while suspended.
    const transit = Math.min(30000, Math.max(0, receivedAt - start));
    offset = server - (receivedAt - transit / 2);
    received = receivedAt;
    return true;
  }
  function serverNow() {return offset === null ? null : now() + offset;}
  function read(snapshot) {
    const local = now();
    return casinoClockState(snapshot, serverNow(), {stale: received === null || local < received || local - received > maxAge});
  }
  function clear() {offset = null; received = null;}
  return {observe, now: serverNow, read, clear};
}
