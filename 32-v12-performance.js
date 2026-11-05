/* V14: observe only newly inserted grid subtrees; never scan the whole document
 * after a text change. Existing API/name retained for compatibility. */
export function startMashupV12Performance() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || window.__mashupV12PerformanceStarted) return;
  window.__mashupV12PerformanceStarted = true;
  document.documentElement.dataset.mashupBuild = '15.4.0';
  const page = document.getElementById('page');
  const selector = ['.collection-grid', '.v11-market-grid', '.v114-picker-grid', '.v151-trade-grid', '.v15-album-leaf', '.deck-roster-grid', '.arena-deck-cards']
    .map(grid => grid + ' .tcg-card.v10-tcg').join(',');
  const scanned = new WeakSet(), observed = new Set(), pending = new Set();
  const viewport = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('v12-offscreen', !entry.isIntersecting);
  }, {rootMargin: '160px 0px'}) : null;
  function bindCard(card) {
    if (scanned.has(card)) return;
    scanned.add(card);
    if (viewport) {card.classList.add('v12-offscreen'); viewport.observe(card); observed.add(card);}
    for (const img of card.querySelectorAll('img')) {img.loading = 'lazy'; img.decoding = 'async';}
    // Repair artwork only: replacing a decorative frame with a symbol is wrong.
    for (const img of card.querySelectorAll('.v10-picture img')) {
      img.addEventListener('error', () => {
        if (!img.isConnected) return;
        const fallback = document.createElement('span');
        fallback.className = 'v10-picture-symbol'; fallback.setAttribute('role', 'img');
        fallback.setAttribute('aria-label', 'Illustration indisponible'); fallback.textContent = '✧';
        img.replaceWith(fallback);
      }, {once: true});
    }
  }
  let frame = 0;
  function scan() {
    frame = 0;
    if (document.hidden) return;
    if (viewport) for (const card of observed) if (!card.isConnected) {viewport.unobserve(card); observed.delete(card);}
    for (const node of pending) {
      if (!node.isConnected) continue;
      if (node.matches?.(selector)) bindCard(node);
      for (const card of node.querySelectorAll?.(selector) || []) bindCard(card);
    }
    pending.clear();
  }
  function schedule(node) {
    if (node?.nodeType === 1) pending.add(node);
    if (!frame && pending.size && !document.hidden) frame = requestAnimationFrame(scan);
  }
  if (page && 'MutationObserver' in window) {
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) schedule(node);
      // Also prune detached IntersectionObserver targets after removals.
      if (!frame && records.some(record => [...record.removedNodes].some(node => node.nodeType === 1))) frame = requestAnimationFrame(scan);
    }).observe(page, {subtree: true, childList: true});
  }
  schedule(page);
  document.addEventListener('visibilitychange', () => {if (!document.hidden) schedule(page);});
  const offline = document.createElement('div'); offline.className = 'v12-offline-notice';
  offline.setAttribute('role', 'status'); offline.setAttribute('aria-live', 'polite'); offline.hidden = true;
  offline.textContent = 'Connexion indisponible : les achats et les sauvegardes nécessitent Internet. Tes données ne sont pas effacées.';
  document.body.appendChild(offline);
  const updateConnection = () => {offline.hidden = navigator.onLine !== false;};
  updateConnection(); window.addEventListener('offline', updateConnection); window.addEventListener('online', updateConnection);
}
