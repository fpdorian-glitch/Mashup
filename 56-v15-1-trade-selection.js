/* Local draft only; never reserves or transfers an inventory item. */
export function tradeInventory(cards = []) {
  const result = new Map();
  for (const card of cards) {
    if (!card || card.hidden || card.archived) continue;
    const raw = Number(card.qty);
    if (!Number.isSafeInteger(raw) || raw < 1) continue;
    const qty = Math.min(20, raw);
    if (
      typeof card.id !== "string" ||
      !card.id ||
      qty < 1 ||
      result.has(card.id)
    )
      continue;
    result.set(card.id, { ...card, qty });
  }
  return result;
}
export function createTradeSelection() {
  const inventories = { offer: new Map(), request: new Map() },
    picks = { offer: new Map(), request: new Map() };
  const valid = (side) => side === "offer" || side === "request";
  function setInventory(side, cards) {
    if (!valid(side)) return;
    inventories[side] = tradeInventory(cards);
    for (const [id, qty] of picks[side]) {
      const max = inventories[side].get(id)?.qty || 0;
      if (!max) picks[side].delete(id);
      else picks[side].set(id, Math.min(qty, max));
    }
  }
  function toggle(side, id) {
    if (!valid(side) || !inventories[side].has(id))
      return "Carte indisponible dans cette collection.";
    if (picks[side].has(id)) {
      picks[side].delete(id);
      return "";
    }
    if (picks[side].size >= 3)
      return "Trois cartes différentes maximum de chaque côté.";
    picks[side].set(id, 1);
    return "";
  }
  function quantity(side, id, value) {
    if (!valid(side)) return "Collection inconnue.";
    const qty = Number(value),
      max = inventories[side]?.get(id)?.qty || 0;
    if (
      !picks[side]?.has(id) ||
      !Number.isSafeInteger(qty) ||
      qty < 1 ||
      qty > max
    )
      return "Choisis une quantité entière disponible, de 1 à " + max + ".";
    picks[side].set(id, qty);
    return "";
  }
  function hydrate(side, items = []) {
    if (!valid(side)) return;
    picks[side].clear();
    for (const item of items.slice(0, 3))
      if (inventories[side].has(item.id) && !picks[side].has(item.id))
        picks[side].set(
          item.id,
          Math.max(
            1,
            Math.min(
              inventories[side].get(item.id).qty,
              Math.floor(Number(item.qty) || 1),
            ),
          ),
        );
  }
  return {
    setInventory,
    toggle,
    quantity,
    hydrate,
    clear: () => {
      picks.offer.clear();
      picks.request.clear();
    },
    cards: (side) => Array.from(inventories[side]?.values() || []),
    selected: (side, id) => picks[side]?.get(id) || 0,
    items: (side) =>
      Array.from(picks[side] || [], ([id, qty]) => ({ id, qty })),
    card: (side, id) => inventories[side]?.get(id),
  };
}
export function filterTradeCards(
  cards,
  { search = "", rarity = "all", series = "all", sort = "rarity" } = {},
) {
  const norm = (v) =>
      String(v || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    query = norm(search),
    rank = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4, ultra: 5 };
  return cards
    .filter(
      (c) =>
        (!query || norm(c.name + " " + (c.family || "")).includes(query)) &&
        (rarity === "all" || c.rarity === rarity) &&
        (series === "all" ||
          String(c.editionSeries || c.series || 1) === series),
    )
    .sort(
      (a, b) =>
        (sort === "name"
          ? 0
          : sort === "quantity"
            ? b.qty - a.qty
            : (rank[b.rarity] || 0) - (rank[a.rarity] || 0)) ||
        String(a.name).localeCompare(String(b.name), "fr"),
    );
}
