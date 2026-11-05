/* Mashup V15 — collection album, with no persistence or network side effects.
 * cards: filtered/sorted cards from the selected series.
 * catalogue: unfiltered cards from that same series, for honest completion.
 * owned: the existing { [cardId]: copies } inventory, read only.
 * Events are delegated by the application: data-action="album-page", data-page.
 * Undiscovered secrets are removed before pagination, counts or metadata reads.
 */

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

function copiesFor(owned, id) {
  if (!owned || id === undefined || id === null) return 0;
  const raw = owned instanceof Map ? owned.get(id) : Object.hasOwn(owned, id) ? owned[id] : 0;
  const count = Number(raw);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function visibleEntries(cards, owned) {
  const entries = [];
  const seen = new Set();
  for (const card of Array.isArray(cards) ? cards : []) {
    // Check protection flags before reading identity or any card content.
    if (!card || card.hidden || card.archived) continue;
    const id = card.id;
    const quantity = copiesFor(owned, id);
    const secret = card.variant === 'secret';
    if ((secret && !quantity) || seen.has(id)) continue;
    seen.add(id);
    entries.push({card, quantity, secret});
  }
  return entries;
}

/** A bounded view model. Unknown slots deliberately contain no card reference. */
export function paginateAlbum({cards = [], owned = {}, page = 0, pageSize = 8} = {}) {
  const size = [6, 8, 12].includes(Number(pageSize)) ? Number(pageSize) : 8;
  const entries = visibleEntries(cards, owned);
  const pages = Math.max(1, Math.ceil(entries.length / size));
  const requested = Number(page);
  const current = Math.min(pages - 1, Math.max(0, Number.isFinite(requested) ? Math.floor(requested) : 0));
  const start = current * size;
  const slots = entries.slice(start, start + size).map(({card, quantity}, index) => {
    const serial = Number(card.editionNumber);
    const number = Number.isSafeInteger(serial) && serial > 0 ? serial : start + index + 1;
    return quantity
      ? {owned: true, quantity, number, card}
      : {owned: false, quantity: 0, number};
  });
  return {page: current, pageSize: size, pages, total: entries.length, start, end: start + slots.length, slots};
}

/** Normal-series progress excludes all secret cards, whether owned or not. */
export function albumProgress({catalogue = [], owned = {}, series = {}} = {}) {
  const entries = visibleEntries(catalogue, owned);
  const normals = entries.filter(entry => !entry.secret);
  const obtained = normals.reduce((count, entry) => count + Number(entry.quantity > 0), 0);
  const configured = Number(series?.targetCount);
  const total = Number.isSafeInteger(configured) && configured > 0 ? configured : normals.length;
  const percent = total ? Math.min(100, Math.floor(obtained / total * 100)) : 0;
  return {
    obtained,
    total,
    percent,
    complete: total > 0 && obtained >= total,
    discoveries: entries.filter(entry => entry.secret && entry.quantity > 0).length
  };
}

function slotMarkup(slot, renderCard, esc) {
  const serial = String(slot.number).padStart(3, '0');
  if (!slot.owned) {
    return `<li class="v15-album-slot v15-album-slot-missing" aria-label="Emplacement ${serial}, carte non obtenue"><div class="v15-album-pocket"><div class="v15-album-back" aria-hidden="true"><span class="v15-album-back-emblem">M</span><span class="v15-album-back-rule"></span><span class="v15-album-back-text">À DÉCOUVRIR</span></div></div><div class="v15-album-slot-note"><span>N° ${serial}</span><span class="v15-album-missing-note">À compléter</span></div></li>`;
  }
  // Content is inspected only after ownership has been established.
  const {card} = slot;
  const exceptional = ['mythic', 'ultra'].includes(card.rarity) || card.variant === 'secret';
  const finish = card.variant === 'secret' ? 'Découverte secrète' : exceptional ? 'Pièce d’exception' : card.variant === 'gold' ? 'Édition or' : card.variant === 'full_art' ? 'Plein cadre' : 'Dans ton album';
  const cardHTML = renderCard(card, {accessible: true, lazy: true});
  return `<li class="v15-album-slot${exceptional ? ' v15-album-slot-exception' : ''}"><div class="v15-album-pocket">${cardHTML}</div><div class="v15-album-slot-note"><span>N° ${serial}</span><span class="v15-album-copies" aria-label="${slot.quantity} exemplaire${slot.quantity > 1 ? 's' : ''}">× ${slot.quantity}</span></div><div class="v15-album-finish${exceptional ? ' v15-album-seal' : ''}">${exceptional ? '<span aria-hidden="true">✦</span> ' : ''}${esc(finish)}</div></li>`;
}

/**
 * Renders one album page; the host keeps the classic view, filters and controls.
 * renderCard must be the existing renderer, retaining its detail/inspection API.
 * No undiscovered-secret count, placeholder, identity or rarity enters the DOM.
 */
export function albumMarkup({cards = [], catalogue = cards, owned = {}, series = {}, renderCard, esc = escapeHTML, page = 0, pageSize = 8} = {}) {
  if (typeof renderCard !== 'function') throw new TypeError('albumMarkup requires the existing card renderer');
  const window = paginateAlbum({cards, owned, page, pageSize});
  const progress = albumProgress({catalogue, owned, series});
  const name = esc(series?.name || 'Ton album de collection');
  const normalCount = `${progress.obtained} / ${progress.total}`;
  const label = `Page ${window.page + 1} sur ${window.pages}`;
  const nav = `<nav class="v15-album-navigation" aria-label="Pages de l’album"><button class="btn btn-sm v15-album-turn" type="button" data-action="album-page" data-page="${Math.max(0, window.page - 1)}" aria-label="Page précédente de l’album" ${window.page === 0 ? 'disabled' : ''}><span aria-hidden="true">←</span><span>Précédente</span></button><span class="v15-album-page-count" role="status" aria-live="polite" aria-atomic="true">${label}</span><button class="btn btn-sm v15-album-turn" type="button" data-action="album-page" data-page="${Math.min(window.pages - 1, window.page + 1)}" aria-label="Page suivante de l’album" ${window.page === window.pages - 1 ? 'disabled' : ''}><span>Suivante</span><span aria-hidden="true">→</span></button></nav>`;
  const content = window.total
    ? `<ol class="v15-album-leaf" start="${window.start + 1}" aria-label="${label}">${window.slots.map(slot => slotMarkup(slot, renderCard, esc)).join('')}</ol>`
    : '<div class="v15-album-empty"><span aria-hidden="true">◇</span><h3>Aucun emplacement dans cette sélection</h3><p>Modifie tes filtres pour retrouver tes cartes et les emplacements à compléter.</p></div>';
  return `<section class="v15-album${progress.complete ? ' v15-album-complete' : ''}" data-album-page="${window.page}" data-album-page-size="${window.pageSize}" aria-label="Album de collection"><header class="v15-album-cover"><div><span class="v15-album-eyebrow">LE CODEX · ALBUM DE COLLECTION</span><h3>${name}</h3><p>${progress.complete ? 'Toutes les cartes de cette série sont réunies.' : 'Une place pour chacune de tes découvertes.'}</p></div>${progress.complete ? '<span class="v15-album-completion"><span aria-hidden="true">✦</span> Série complète</span>' : `<div class="v15-album-progress"><strong>${normalCount}</strong><span>cartes de la série</span></div>`}</header><div class="v15-album-progressbar" role="progressbar" aria-label="Collection de la série" aria-valuemin="0" aria-valuemax="${progress.total || 1}" aria-valuenow="${Math.min(progress.obtained, progress.total)}" aria-valuetext="${progress.obtained} cartes obtenues sur ${progress.total}"><span style="width:${progress.percent}%"></span></div>${nav}<div class="v15-album-book">${content}</div><footer class="v15-album-footer"><span>${window.total ? `Emplacements ${window.start + 1}–${window.end} sur ${window.total}` : 'Aucun résultat'}</span><span>${progress.discoveries ? `${progress.discoveries} découverte${progress.discoveries > 1 ? 's' : ''} hors-série · ` : ''}Les cartes obtenues s’ouvrent au toucher.</span></footer></section>`;
}
