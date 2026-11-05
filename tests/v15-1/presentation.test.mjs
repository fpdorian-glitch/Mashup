import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  arenaSequence,
  arenaSnapshotKey,
  createArenaRebornPresentation,
} from "../../53-v15-1-arena.js";
import {
  arenaBattleMarkup,
  ruleBannerMarkup,
} from "../../57-v15-1-battle-view.js";
import {
  createTradeSelection,
  tradeInventory,
  filterTradeCards,
} from "../../56-v15-1-trade-selection.js";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const stats = ["power", "size", "def", "aura", "intelligence"].map((key) => ({
  key,
  label: key,
}));
test("La direction est explicite, distincte et jamais déduite des scores", () => {
  assert.match(ruleBannerMarkup("higher"), /↑.*PLUS GRAND/s);
  assert.match(ruleBannerMarkup("lower"), /↓.*PLUS FAIBLE/s);
  assert.match(ruleBannerMarkup(null), /RÈGLE EN ATTENTE/);
});
test("Les cartes adverses restent totalement inaccessibles avant autorisation", () => {
  const secret = {
    get name() {
      throw Error("Private");
    },
    get rarity() {
      throw Error("Private");
    },
  };
  let rendered = 0;
  const html = arenaBattleMarkup(
    {
      round: 0,
      mode: "double",
      stage: "choose",
      direction: "lower",
      turn: "player",
      playerCards: [],
      enemyCards: [secret],
      stats,
      values: {},
      playerScore: 1,
      enemyScore: 0,
    },
    {
      esc,
      renderCard: () => {
        rendered++;
        return "";
      },
    },
  );
  assert.equal(rendered, 0);
  assert.equal((html.match(/Carte adverse cachée/g) || []).length, 2);
  assert.equal((html.match(/data-action="challenge-stat"/g) || []).length, 5);
  assert.ok(html.includes("data-rb-stat-dock"));
  assert.ok(!html.includes("Private"));
  for(const stage of [undefined,"unexpected"]){
    const hidden=arenaBattleMarkup({round:0,mode:"double",stage,playerCards:[],enemyCards:[secret]}, {esc,renderCard:()=>{throw Error("Unauthorized renderer");}});
    assert.equal((hidden.match(/Carte adverse cachée/g)||[]).length,2);
  }
});
test("Les résultats imprimés viennent du snapshot, y compris une victoire avec la valeur inférieure", () => {
  const s = {
    round: 3,
    stage: "reveal",
    direction: "lower",
    turn: "player",
    playerCards: [],
    enemyCards: [],
    playerScore: 4,
    enemyScore: 0,
    pValue: 12,
    eValue: 95,
    stat: "power",
    winner: "player",
    finished: true,
    reward: { coins: 123, dust: 7 },
    stats,
  };
  const html = arenaBattleMarkup(s, { esc, renderCard: () => "" });
  assert.ok(html.includes("MANCHE GAGNÉE"));
  assert.ok(html.includes(">12</b>"));
  assert.ok(html.includes("+123 crédits"));
  assert.equal(s.playerScore, 4);
});
test("Une récompense absente n’est pas inventée dans la présentation", () => {
  const html = arenaBattleMarkup(
    {
      finished: true,
      stage: "reveal",
      round: 3,
      playerScore: 2,
      enemyScore: 2,
      winner: "draw",
      stats,
    },
    { esc, renderCard: () => "" },
  );
  assert.ok(!html.includes("+0 crédits"));
  assert.match(html, /équilibre parfait/);
});
function scene() {
  const attrs = new Map(),
    calls = [],
    field = {
      isConnected: true,
      ownerDocument: { visibilityState: "visible" },
      attributes: attrs,
      style: { setProperty() {} },
      matches: () => true,
      setAttribute: (k, v) => attrs.set(k, v),
      removeAttribute: (k) => attrs.delete(k),
      querySelectorAll: (s) => (s === ".rb-team" ? [node(), node()] : []),
      querySelector: () => node(),
    };
  function node() {
    return {
      animate: (frames, options) => {
        const a = {
          frames,
          options,
          cancelled: false,
          cancel() {
            this.cancelled = true;
          },
        };
        calls.push(a);
        return a;
      },
    };
  }
  return { field, attrs, calls };
}
function clock() {
  let n = 0;
  const timers = new Map();
  return {
    timers,
    setTimeout: (fn, ms) => {
      timers.set(++n, { fn, ms });
      return n;
    },
    clearTimeout: (id) => timers.delete(id),
  };
}
const reveal = {
  matchId: "fiction",
  round: 0,
  stage: "reveal",
  winner: "player",
  direction: "lower",
  stat: "power",
  playerScore: 1,
  enemyScore: 0,
  turn: "player",
  mode: "simple",
  pValue: 15,
  eValue: 85,
};
test("Séquences explicites, qualité et préférence de mouvement réduit", () => {
  assert.deepEqual(
    arenaSequence("spectacular").map((x) => x.phase),
    ["reveal", "compare", "impact", "result"],
  );
  assert.ok(
    arenaSequence("balanced").at(-1).at <
      arenaSequence("spectacular").at(-1).at,
  );
  const s = scene(),
    c = clock(),
    p = createArenaRebornPresentation({
      isReducedMotion: () => true,
      clock: c,
    });
  assert.equal(p.update({ ...reveal, root: s.field }).animated, false);
  assert.equal(c.timers.size, 0);
  assert.equal(s.calls.length, 0);
});
test("Un poll identique ne rejoue jamais l’animation ; navigation et skip annulent tout", () => {
  const s = scene(),
    c = clock(),
    p = createArenaRebornPresentation({ clock: c });
  p.update({ ...reveal, root: s.field });
  assert.ok(c.timers.size > 0);
  const count = s.calls.length;
  p.update({ ...reveal, updatedAt: 99, root: s.field });
  assert.equal(s.calls.length, count);
  p.skip();
  assert.equal(c.timers.size, 0);
  assert.ok(s.calls.every((a) => a.cancelled));
  assert.equal(p.phase, "result");
  p.clear();
  assert.equal(p.phase, "idle");
  assert.equal(
    arenaSnapshotKey(reveal),
    arenaSnapshotKey({ ...reveal, updatedAt: 123 }),
  );
});
test("Nouvelle manche annule la précédente et un DOM retiré ne reçoit pas de phase tardive", () => {
  const s = scene(),
    c = clock(),
    p = createArenaRebornPresentation({ clock: c });
  p.update({ ...reveal, root: s.field });
  const old = s.calls.slice();
  p.update({ ...reveal, round: 1, stage: "choose", root: s.field });
  assert.equal(c.timers.size, 0);
  assert.ok(old.every((a) => a.cancelled));
  p.update({ ...reveal, round: 1, root: s.field });
  s.field.isConnected = false;
  for (const t of c.timers.values()) t.fn();
  assert.notEqual(s.attrs.get("data-rb-phase"), "result");
});
const cards = Array.from({ length: 20 }, (_, i) => ({
  id: "fiction-" + i,
  name: "Étoile " + i,
  qty: 3,
  rarity: i % 2 ? "rare" : "common",
  editionSeries: 2,
}));
test("Deux sélections indépendantes, limitées à trois identités sans doublons", () => {
  const m = createTradeSelection();
  for (const side of ["offer", "request"]) m.setInventory(side, cards);
  for (let i = 0; i < 3; i++) assert.equal(m.toggle("offer", cards[i].id), "");
  assert.match(m.toggle("offer", cards[3].id), /Trois/);
  assert.equal(m.toggle("request", cards[0].id), "");
  assert.equal(m.items("offer").length, 3);
  assert.equal(m.items("request").length, 1);
  m.toggle("offer", cards[0].id);
  assert.equal(m.items("offer").length, 2);
});
test("Quantités entières, inventaire réel et limite 20 sans mutation du catalogue", () => {
  const m = createTradeSelection();
  m.setInventory("offer", [...cards, { id: "many", qty: 50 }]);
  m.toggle("offer", cards[0].id);
  for (const value of [0, 4, 1.5, NaN])
    assert.ok(m.quantity("offer", cards[0].id, value));
  assert.equal(m.quantity("offer", cards[0].id, 3), "");
  m.setInventory("offer", [{ ...cards[0], qty: 1 }]);
  assert.equal(m.items("offer")[0].qty, 1);
  assert.equal(cards[0].qty, 3);
  assert.equal(tradeInventory([{ id: "many", qty: 50 }]).get("many").qty, 20);
});
test("Une contre-offre ne charge que les identités autorisées ; les filtres ne changent pas le brouillon", () => {
  const m = createTradeSelection();
  m.setInventory("request", cards);
  m.hydrate("request", [
    { id: "fiction-1", qty: 2 },
    { id: "not-authorised", qty: 1 },
  ]);
  assert.deepEqual(m.items("request"), [{ id: "fiction-1", qty: 2 }]);
  assert.equal(
    filterTradeCards(m.cards("request"), { search: "etoile", rarity: "rare" })
      .length,
    10,
  );
  assert.equal(m.selected("request", "fiction-1"), 2);
});
test("Cartes masquées/archivées supprimées avant lecture de leur identité", () => {
  const poison = {
    hidden: true,
    get id() {
      throw Error("Private");
    },
  };
  assert.equal(
    tradeInventory([poison, { ...cards[0], archived: true }]).size,
    0,
  );
});
test("Contrats serveur protégés, mêmes requêtes de combat et mêmes fonctions de calcul", () => {
  const root = new URL("../../", import.meta.url),
    read = (p) => fs.readFileSync(new URL(p, root), "utf8"),
    git = (...args) => {
      const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      assert.equal(r.status, 0);
      return r.stdout;
    };
  const before = git("show", "19375ce:index.html"),
    after = read("index.html"),
    calls = (s) => s.match(/api\('\/api\/(?:battles|pvp)[^']*',?[^\n]*/g);
  const paths = (s) =>
    [...s.matchAll(/api\(['"]([^'"]+)/g)].map((x) => x[1]).sort();
  assert.deepEqual(paths(after), paths(before));
  assert.deepEqual(paths(read("20-market-v10-9.js")),paths(git("show","19375ce:20-market-v10-9.js")));
  for (const [start, end] of [
    ["function statValue(", "function normalizeCard("],
    ["function chooseOpponents(", "async function startBattle("],
    ["function pickAIStat(", "async function playAITurn("],
  ]) {
    const body = (s) => {
      const a = s.indexOf(start),
        b = s.indexOf(end, a);
      assert.ok(a >= 0 && b > a);
      return s.slice(a, b);
    };
    assert.equal(body(after), body(before));
  }
  assert.equal(
    git(
      "diff",
      "19375ce",
      "--",
      "backend",
      "content",
      "06-v10-cards.js",
      "27-v11-3-image-studio.js",
      "reset.html",
    ),
    "",
  );
});
