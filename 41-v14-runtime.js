/* Presentation-only helpers: no network, persistence, or game-rule mutations. */
export const normalizeSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
const searchTexts = new WeakMap();
export function cardSearchText(card) {
  const source = `${card.name || ''} ${card.subtitle || ''} ${card.family || ''}`;
  const previous = searchTexts.get(card);
  if (previous?.source === source) return previous.text;
  const text = normalizeSearch(source);
  searchTexts.set(card, {source, text});
  return text;
}
export function createCatalogueIndex() {
  let previousBase, previousCustom, baseSize = -1, customSize = -1, cards = [], index = new Map();
  function refresh(base, custom = []) {
    if (base !== previousBase || custom !== previousCustom || base.length !== baseSize || custom.length !== customSize) {
      previousBase = base; previousCustom = custom; baseSize = base.length; customSize = custom.length;
      cards = [...base, ...custom]; index = new Map();
      // Preserve original .find() precedence if a legacy import duplicated an ID.
      for (const card of cards) if (!index.has(card.id)) index.set(card.id, card);
    }
    return cards;
  }
  return {all: refresh, get(id, base, custom) {refresh(base, custom); return index.get(id);}};
}
const windows = new WeakMap();
export function renderCardWindow(root, items, markup, {append = false, version = ''} = {}) {
  const old = windows.get(root);
  const canAppend = append && old && old.version === version && old.items.length <= items.length &&
    old.items.every((card, i) => card === items[i]);
  if (canAppend) {
    const extra = items.slice(old.items.length);
    if (extra.length) root.insertAdjacentHTML('beforeend', extra.map(markup).join(''));
  } else root.innerHTML = items.map(markup).join('');
  windows.set(root, {items: items.slice(), version});
  return {appended: !!canAppend, count: items.length};
}
export function inspectionLimits({reduced = false, quality = 'high'} = {}) {
  return reduced ? {x: 0, y: 0} : quality === 'eco' ? {x: 5, y: 8} : {x: 14, y: 23};
}
const balanceAnimations = new WeakMap();
export function presentBalance(element, amount, {motion = true} = {}) {
  if (!element) return;
  const value = Number(amount) || 0;
  const previous = element.dataset.balance;
  if (previous === String(value)) return;
  element.dataset.balance = String(value);
  element.textContent = value.toLocaleString('fr-FR');
  balanceAnimations.get(element)?.cancel();
  if (previous !== undefined && value > Number(previous) && motion && element.animate) {
    balanceAnimations.set(element, element.animate([{opacity: .35}, {opacity: 1}], {duration: 340, easing: 'ease-out'}));
  }
}
