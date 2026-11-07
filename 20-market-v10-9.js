import {hasCompleteAccountState} from './79-v16-network.js?v=16.0.0';
import {
  createTradeSelection,
  filterTradeCards,
} from "./56-v15-1-trade-selection.js?v=15.1.0";
/* Two authorised collections. The trade API remains the only inventory authority. */
export function createMarketUI({
  api,
  esc,
  toast,
  onAccepted,
  getOwnCards,
  getCurrentUser,
  onFreshAccount,
  onState,
  renderCard,
  resolveCard = card => card,
  getView = () => "market",
  getMarketMode = () => "trades",
  getSessionKey = () => getCurrentUser()?.id,
}) {
  let players = [],
    trades = [],
    target = null,
    partnerName = "",
    counterId = "",
    root = null,
    generation = 0,
    partnerRequest = 0,
    session = null,
    loading = false,
    writing = false,
    activeSide = "offer";
  const selection = createTradeSelection(),
    filters = { offer: {}, request: {} },
    pages = { offer: 0, request: 0 },
    credits = { offer: 0, request: 0 };
  const statusName = {
    pending: "En attente",
    accepted: "Échange effectué",
    declined: "Refusé",
    cancelled: "Annulé",
    expired: "Expiré",
    countered: "Contre-offre envoyée",
  };
  const token = () => ({
    generation,
    session: getSessionKey(),
    user: getCurrentUser()?.id,
  });
  const alive = (t) =>
    t.generation === generation &&
    t.session === getSessionKey() &&
    t.user === getCurrentUser()?.id &&
    !!root &&
    root.isConnected !== false &&
    getView() === "market" &&
    getMarketMode() === "trades";
  function own() {
    selection.setInventory("offer", getOwnCards());
  }
  const sideName = (side) =>
    side === "offer"
      ? "Ma collection"
      : "Collection de " + (partnerName || "ce joueur");
  function option(value, label, current) {
    return (
      '<option value="' +
      esc(value) +
      '" ' +
      (String(current) === String(value) ? "selected" : "") +
      ">" +
      esc(label) +
      "</option>"
    );
  }
  function cardHTML(card) {
    return renderCard
      ? renderCard(card, { revealedOpponent: true, lazy: true })
      : '<div class="v151-trade-unavailable">' +
          esc(card.name) +
          "<small>" +
          esc(card.rarity) +
          "</small></div>";
  }
  function selectionHTML(side) {
    const list = selection.items(side);
    return (
      '<div class="v151-trade-selected" aria-label="Cartes ' +
      (side === "offer" ? "proposées" : "demandées") +
      '">' +
      (list.length
        ? list
            .map((item) => {
              const c = selection.card(side, item.id);
              return (
                '<div class="v151-trade-selected-line"><span>' +
                esc(c.name) +
                '</span><label><span class="sr-only">Exemplaires de ' +
                esc(c.name) +
                '</span><input data-trade-qty="' +
                side +
                '" data-id="' +
                esc(item.id) +
                '" type="number" inputmode="numeric" min="1" max="' +
                c.qty +
                '" value="' +
                item.qty +
                '" aria-label="Exemplaires de ' +
                esc(c.name) +
                '"></label><button type="button" data-trade-remove="' +
                side +
                '" data-id="' +
                esc(item.id) +
                '" aria-label="Retirer ' +
                esc(c.name) +
                '">×</button></div>'
              );
            })
            .join("")
        : "<p>Aucune carte choisie</p>") +
      "</div>"
    );
  }
  function collectionHTML(side) {
    const all = selection.cards(side),
      f = filters[side],
      list = filterTradeCards(all, f),
      page = Math.min(
        pages[side],
        Math.max(0, Math.ceil(list.length / 12) - 1),
      );
    pages[side] = page;
    const series = [
      ...new Set(all.map((c) => c.editionSeries || c.series || 1)),
    ].sort((a, b) => a - b);
    return (
      '<section class="v151-trade-collection" data-trade-side="' +
      side +
      '"><header><small>' +
      (side === "offer" ? "JE PROPOSE" : "JE DEMANDE") +
      "</small><h4>" +
      esc(sideName(side)) +
      "</h4><span>" +
      selection.items(side).length +
      ' / 3 cartes choisies</span></header><div class="v151-trade-filters"><label class="v151-search">Rechercher<input type="search" data-trade-filter="search" data-side="' +
      side +
      '" value="' +
      esc(f.search || "") +
      '" placeholder="Nom ou univers…"></label><label>Rareté<select data-trade-filter="rarity" data-side="' +
      side +
      '">' +
      option("all", "Toutes", f.rarity || "all") +
      ["common", "rare", "epic", "legendary", "mythic", "ultra"]
        .map((r, i) =>
          option(
            r,
            ["Commune", "Rare", "Épique", "Légendaire", "Mythique", "Ultra"][i],
            f.rarity,
          ),
        )
        .join("") +
      '</select></label><label>Série<select data-trade-filter="series" data-side="' +
      side +
      '">' +
      option("all", "Toutes", f.series || "all") +
      series.map((n) => option(n, "Série " + n, f.series)).join("") +
      '</select></label><label>Trier<select data-trade-filter="sort" data-side="' +
      side +
      '">' +
      [
        ["rarity", "Rareté"],
        ["name", "Nom A → Z"],
        ["quantity", "Exemplaires"],
      ]
        .map(([v, l]) => option(v, l, f.sort || "rarity"))
        .join("") +
      '</select></label></div><div class="v151-trade-grid">' +
      (list.length
        ? list
            .slice(page * 12, page * 12 + 12)
            .map((c) => {
              const selected = selection.selected(side, c.id);
              return (
                '<button type="button" class="v151-trade-card ' +
                (selected ? "is-selected" : "") +
                '" data-trade-card="' +
                esc(c.id) +
                '" data-side="' +
                side +
                '" aria-pressed="' +
                !!selected +
                '" aria-label="' +
                (selected ? "Retirer " : "Choisir ") +
                esc(c.name) +
                '">' +
                cardHTML(c) +
                '<span class="v151-trade-card-label"><strong>' +
                esc(c.name) +
                "</strong><span>" +
                (selected
                  ? "✓ Choisie"
                  : "× " + c.qty + " disponible" + (c.qty > 1 ? "s" : "")) +
                "</span></span></button>"
              );
            })
            .join("")
        : '<p class="v151-trade-empty">' +
          (loading && side === "request"
            ? "Chargement de sa collection…"
            : "Aucune carte dans cette sélection.") +
          "</p>") +
      '</div><nav class="v151-trade-pages" aria-label="Pages ' +
      esc(sideName(side)) +
      '"><button type="button" data-trade-page="' +
      side +
      '" data-page="' +
      (page - 1) +
      '" ' +
      (!page ? "disabled" : "") +
      ">←</button><span>Page " +
      (page + 1) +
      " / " +
      Math.max(1, Math.ceil(list.length / 12)) +
      " · " +
      list.length +
      ' cartes</span><button type="button" data-trade-page="' +
      side +
      '" data-page="' +
      (page + 1) +
      '" ' +
      ((page + 1) * 12 >= list.length ? "disabled" : "") +
      ">→</button></nav>" +
      selectionHTML(side) +
      '<label class="v151-trade-credits">Crédits ' +
      (side === "offer" ? "proposés" : "demandés") +
      '<input data-trade-credits="' +
      side +
      '" id="trade-' +
      side +
      '-credits" type="number" inputmode="numeric" min="0" max="200000" value="' +
      credits[side] +
      '"></label></section>'
    );
  }
  function renderCollections() {
    if (!root) return;
    const host = root.querySelector(".v151-trade-collections");
    if (host) {
      host.dataset.active = activeSide;
      host.innerHTML = collectionHTML("offer") + collectionHTML("request");
    }
    root.querySelectorAll("[data-trade-tab]").forEach((button) => {
      const side = button.dataset.tradeTab;
      button.setAttribute("aria-pressed", String(side === activeSide));
      button.textContent =
        (side === "offer" ? "Je propose" : "Je demande") +
        " · " +
        selection.items(side).length +
        "/3";
    });
    updateReview();
  }
  function updateReview() {
    const box = root?.querySelector(".v151-trade-review");
    if (!box) return;
    box.innerHTML = ["offer", "request"]
      .map(
        (side) =>
          "<div><b>" +
          (side === "offer" ? "Tu proposes" : "Tu demandes") +
          "</b><span>" +
          esc(
            selection
              .items(side)
              .map((x) => selection.card(side, x.id).name + " ×" + x.qty)
              .join(" · ") || "Aucune carte",
          ) +
          "</span><small>" +
          esc(credits[side]) +
          " crédits</small></div>",
      )
      .join("");
  }
  function render() {
    if (!root) return;
    own();
    root.innerHTML =
      '<div class="page-lead"><div class="eyebrow">ÉCHANGES · DE COLLECTION À COLLECTION</div><h1 class="heading">Trouvons un <em>accord.</em></h1><p class="text-sub">Choisis directement les cartes dans vos deux collections, puis compose ta proposition.</p></div><section class="market-compose"><div class="market-partner"><label>Joueur<select id="trade-partner">' +
      option("", "Choisir un joueur", target) +
      players.map((p) => option(p.id, p.pseudo, target)).join("") +
      '</select></label><button class="btn btn-sm" data-action="trade-load-target" ' +
      (writing ? "disabled" : "") +
      ">Voir sa collection ↗</button></div>" +
      (target
        ? '<p class="small-note">' +
          (counterId ? "Contre-offre · " : "") +
          'Trois cartes différentes par côté, jusqu’à vingt exemplaires chacune. Aucun transfert avant acceptation.</p><div class="v151-trade-tabs" aria-label="Collections à échanger"><button type="button" data-trade-tab="offer">Je propose</button><button type="button" data-trade-tab="request">Je demande</button></div><div class="v151-trade-collections"></div><section class="v151-trade-review" aria-label="Récapitulatif de la proposition"></section><div class="v151-trade-submit"><button class="btn btn-primary" data-action="trade-send" ' +
          (loading || writing ? "disabled" : "") +
          ">" +
          (writing
            ? "Envoi en cours…"
            : counterId
              ? "Envoyer la contre-offre"
              : "Envoyer la proposition") +
          " →</button>" +
          (counterId
            ? '<button class="btn" data-action="trade-clear-counter">Annuler la contre-offre</button>'
            : "") +
          "</div>"
        : '<p class="small-note">Choisis un joueur pour découvrir les cartes qu’il peut échanger.</p>') +
      '</section><section class="panel market-list"><div class="flex-between"><h3>Mes propositions</h3><button class="btn btn-sm" data-action="trade-refresh">Actualiser</button></div>' +
      (trades.length
        ? trades
            .map((t) => {
              const incoming = t.to === getCurrentUser()?.id;
              const assets = (items, coins) =>
                (items || [])
                  .map(
                    (x) =>
                      "<span>" +
                      esc(x.card?.name || "Carte indisponible") +
                      " ×" +
                      esc(x.qty) +
                      "</span>",
                  )
                  .join("") +
                (coins ? "<span>" + esc(coins) + " crédits</span>" : "");
              return (
                '<article class="market-trade"><div class="market-trade-top"><strong>' +
                esc(incoming ? t.fromName : t.toName) +
                "</strong><small>" +
                esc(statusName[t.status] || t.status) +
                '</small></div><div class="market-trade-columns"><div><small>' +
                esc(t.fromName) +
                " propose</small>" +
                assets(t.offer, t.offerCredits) +
                "</div><div><small>" +
                esc(t.toName) +
                " propose</small>" +
                assets(t.request, t.requestCredits) +
                "</div></div>" +
                (t.status === "pending"
                  ? '<div class="market-trade-actions">' +
                    (incoming
                      ? '<button class="btn btn-primary btn-sm" data-action="trade-accept" data-id="' +
                        esc(t.id) +
                        '">Accepter</button><button class="btn btn-sm" data-action="trade-counter" data-id="' +
                        esc(t.id) +
                        '">Contre-offre</button><button class="btn btn-sm" data-action="trade-decline" data-id="' +
                        esc(t.id) +
                        '">Refuser</button>'
                      : '<button class="btn btn-sm" data-action="trade-cancel" data-id="' +
                        esc(t.id) +
                        '">Annuler</button>') +
                    "</div>"
                  : "") +
                "</article>"
              );
            })
            .join("")
        : '<p class="small-note">Aucun échange pour le moment.</p>') +
      "</section>";
    if (target) renderCollections();
    if(writing)root.querySelectorAll(".market-compose input,.market-compose select,.market-compose button").forEach(control=>control.disabled=true);
  }
  async function refresh() {
    const t = token();
    try {
      const r = await api("/api/trades");
      if (!alive(t)) return;
      players = r.players || [];
      trades = r.trades || [];
      render();
    } catch (e) {
      if (alive(t)) toast(e.message || "Échanges indisponibles.", true);
    }
  }
  async function selectPartner(id) {
    if(writing)return false;
    const t = token(),
      request = ++partnerRequest;
    target = id || null;
    activeSide = "offer";
    partnerName = players.find((p) => p.id === id)?.pseudo || "";
    counterId = "";
    selection.clear();
    selection.setInventory("request", []);
    credits.offer = credits.request = 0;
    pages.offer = pages.request = 0;
    filters.offer = {};
    filters.request = {};
    loading = !!id;
    render();
    if (!id) return false;
    try {
      const r = await api("/api/trades/partner/" + encodeURIComponent(id));
      if (!alive(t) || request !== partnerRequest) return false;
      if (r.id !== id)
        throw new Error(
          "La collection reçue ne correspond pas au joueur choisi.",
        );
      partnerName = r.pseudo || partnerName;
      selection.setInventory("request", (r.cards || []).filter(card=>card&&!card.hidden&&!card.archived).map(resolveCard));
      loading = false;
      render();
      return true;
    } catch (e) {
      if (alive(t) && request === partnerRequest) {
        target = null;
        selection.setInventory("request", []);
        loading = false;
        render();
        toast(e.message, true);
      }
      return false;
    }
  }
  function collect() {
    own();
    for (const side of ["offer", "request"])
      if (
        !Number.isSafeInteger(Number(credits[side])) ||
        Number(credits[side]) < 0 ||
        Number(credits[side]) > 200000
      )
        throw new Error(
          "Entre un montant entier de crédits entre 0 et 200 000.",
        );
    if (root?.querySelector("[data-trade-qty]:invalid"))
      throw new Error("Corrige la quantité indiquée.");
    return {
      to: target,
      offer: selection.items("offer"),
      request: selection.items("request"),
      offerCredits: Number(credits.offer),
      requestCredits: Number(credits.request),
    };
  }
  async function send() {
    if (writing || loading || !target) return;
    const t = token();
    let data;
    try {
      data = collect();
      if (
        !data.offer.length &&
        !data.request.length &&
        !data.offerCredits &&
        !data.requestCredits
      )
        throw new Error("Choisis au moins une carte ou un montant.");
    } catch (e) {
      toast(e.message, true);
      return;
    }
    writing = true;
    render();
    try {
      if (counterId)
        await api("/api/trades/respond", {
          ...data,
          id: counterId,
          action: "counter",
        });
      else await api("/api/trades/create", data);
      if (!alive(t)) return;
      writing = false;
      counterId = "";
      target = null;
      selection.clear();
      selection.setInventory("request", []);
      toast("Proposition envoyée.");
      await refresh();
    } catch (e) {
      if (alive(t)) {
        writing = false;
        render();
        toast(
          e.message +
            " Envoi non confirmé : actualise tes propositions avant de réessayer.",
          true,
        );
      }
    } finally {
      if (t.session === getSessionKey()) {
        writing = false;
        if (root && t.generation !== generation) void refresh();
      }
    }
  }
  async function action(kind, id) {
    if (writing) return;
    const trade = trades.find((x) => x.id === id);
    if (!trade) return;
    if (kind === "counter") {
      if (!(await selectPartner(trade.from))) return;
      counterId = id;
      selection.hydrate("offer", trade.request);
      selection.hydrate("request", trade.offer);
      credits.offer = trade.requestCredits || 0;
      credits.request = trade.offerCredits || 0;
      render();
      root
        .querySelector(".market-compose")
        ?.scrollIntoView({ block: "start", behavior: "auto" });
      return;
    }
    const t = token();
    writing = true;
    try {
      const r = await api("/api/trades/respond", { id, action: kind });
      if (!alive(t)) {
        if (
          kind === "accept" &&
          r.state &&
          t.session === getSessionKey() &&
          t.user === getCurrentUser()?.id
        )
          onState?.(r.state);
        return;
      }
      writing = false;
      toast(
        kind === "accept" ? "Échange effectué !" : "Proposition mise à jour.",
      );
      if (kind === "accept") {
        if (hasCompleteAccountState(r.state)) onState?.(r.state);
        else await onFreshAccount();
        onAccepted?.();
      }
      if (alive(t)) await refresh();
    } catch (e) {
      if (alive(t)) toast(e.message, true);
    } finally {
      if (t.session === getSessionKey()) {
        writing = false;
        if (root && t.generation !== generation) void refresh();
      }
    }
  }
  function click(event) {
    const b = event.target.closest(
      "[data-trade-card],[data-trade-remove],[data-trade-page],[data-trade-tab]",
    );
    if (!b || writing) return;
    if (b.hasAttribute("data-trade-tab")) {
      activeSide = b.dataset.tradeTab;
      renderCollections();
      return;
    }
    if (b.hasAttribute("data-trade-page")) {
      const side = b.dataset.tradePage;
      pages[side] = Math.max(0, Number(b.dataset.page) || 0);
    } else {
      const side = b.dataset.side || b.dataset.tradeRemove,
        error = selection.toggle(side, b.dataset.tradeCard || b.dataset.id);
      if (error) toast(error, true);
    }
    renderCollections();
  }
  function input(event) {
    const el = event.target;
    if (writing) return;
    if (el.dataset.tradeFilter) {
      const side = el.dataset.side;
      filters[side][el.dataset.tradeFilter] = el.value;
      pages[side] = 0;
      const focus =
        el.dataset.tradeFilter === "search"
          ? { start: el.selectionStart, end: el.selectionEnd }
          : null;
      renderCollections();
      if (focus) {
        const next = root.querySelector(
          '[data-trade-filter="search"][data-side="' + side + '"]',
        );
        next?.focus({ preventScroll: true });
        next?.setSelectionRange(focus.start, focus.end);
      }
    } else if (el.dataset.tradeQty) {
      const error = selection.quantity(
        el.dataset.tradeQty,
        el.dataset.id,
        el.value,
      );
      if (error) {
        el.setCustomValidity(error);
        el.reportValidity();
      } else {
        el.setCustomValidity("");
        updateReview();
      }
    } else if (el.dataset.tradeCredits) {
      credits[el.dataset.tradeCredits] = el.value === "" ? 0 : Number(el.value);
      updateReview();
    }
  }
  function unmount() {
    generation++;
    if (root) {
      root.removeEventListener("click", click);
      root.removeEventListener("input", input);
      root.removeEventListener("change", change);
    }
    root = null;
    loading = false;
  }
  function change(event) {
    if (event.target.tagName === "SELECT") input(event);
  }
  function clearSession() {
    unmount();
    players = [];
    trades = [];
    target = null;
    partnerName = "";
    counterId = "";
    selection.clear();
    selection.setInventory("offer", []);
    selection.setInventory("request", []);
    credits.offer = credits.request = 0;
    writing = false;
    session = null;
  }
  function mount() {
    if (session !== getSessionKey()) clearSession();
    else unmount();
    session = getSessionKey();
    root =
      document.getElementById("market-v11-content") ||
      document.getElementById("page");
    if (!root) return;
    root.addEventListener("click", click);
    root.addEventListener("input", input);
    root.addEventListener("change", change);
    render();
    void refresh();
  }
  return {
    mount,
    refresh,
    selectPartner,
    loadTarget: () =>
      selectPartner(document.getElementById("trade-partner")?.value),
    send,
    action,
    unmount,
    clearSession,
    clearCounter: () => selectPartner(null),
  };
}
