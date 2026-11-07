import { inspectionObjectMarkup } from "./46-v15-living-cards.js?v=16.1.0";
import { catalogueIsActive } from "./58-catalogue.js";

const escapeText = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));

/** The same comparison rule stays next to all five actions on small screens. */
export function ruleBannerMarkup(direction, esc = escapeText, context = {}) {
  const high = direction === "higher", low = direction === "lower";
  const round = Number(context.round);
  const current = Number.isInteger(round) ? Math.min(4, Math.max(1, round + 1)) : 1;
  const label = context.finished ? "Combat terminé" : "Manche " + current + " / 4";
  const score = Number.isInteger(context.playerScore) && Number.isInteger(context.enemyScore)
    ? ' · ' + context.playerScore + '–' + context.enemyScore : '';
  return '<div class="rb-rule-banner" data-rb-rule data-direction="' +
    (high ? "higher" : low ? "lower" : "unknown") + '">' +
    '<span class="rb-rule-context"><small>' + esc(label + score) + '</small><strong>' +
    esc(context.statLabel || (context.turn === "enemy" ? "Choix adverse" : "Statistique au choix")) +
    '</strong></span><span class="rb-rule-direction"><b aria-hidden="true">' +
    (high ? "↑" : low ? "↓" : "◇") + '</b><span>' +
    esc(high ? "PLUS GRAND GAGNE" : low ? "PLUS FAIBLE GAGNE" : "RÈGLE EN ATTENTE") +
    '</span></span></div>';
}

/** A four-step progress rail, never a prediction of future round results. */
export function roundProgressMarkup(s, esc = String) {
  const raw = Number(s.round), round = Number.isInteger(raw) ? Math.max(0, Math.min(3, raw)) : 0;
  return '<ol class="rb-round-track" aria-label="Progression du combat en quatre manches">' +
    Array.from({length: 4}, (_, i) => {
      const done = s.finished || i < round, current = !s.finished && i === round;
      return '<li class="' + (done ? 'rb-round-done' : current ? 'rb-round-current' : 'rb-round-future') +
        '"' + (current ? ' aria-current="step"' : '') + '><span>' + (done ? '✓' : i + 1) +
        '</span><small>' + esc('Manche ' + (i + 1)) + '</small></li>';
    }).join('') + '</ol>';
}

const FLOOR = '<svg class="rb-table-sigil" viewBox="0 0 640 340" fill="none" aria-hidden="true"><ellipse cx="320" cy="230" rx="292" ry="94"/><ellipse cx="320" cy="230" rx="247" ry="74"/><ellipse cx="320" cy="230" rx="148" ry="47"/><path d="m320 160 52 70-52 70-52-70 52-70Zm-250 70h101m298 0h101M320 136v24m0 140v24"/><path d="m97 160 43 11-12 27-43-11 12-27Zm446 0-43 11 12 27 43-11-12-27Z"/></svg>';

/** Only cards explicitly passed by the authorised battle snapshot are rendered. */
export function arenaBattleMarkup(s, { esc, renderCard, galaxyMark = "" }) {
  const pvp = s.source === "pvp",
    double = s.mode === "double",
    revealed = s.stage === "reveal" || s.finished;
  const winner = ["player", "enemy", "draw"].includes(s.winner) ? s.winner : "";
  const quality = ["spectacular", "balanced", "fluid"].includes(s.quality)
    ? s.quality
    : "balanced";
  const stats = s.stats || [],
    stat = stats.find((f) => f.key === s.stat || f.label === s.stat);
  const card = (c, enemy, hidden, index) => {
    // No name, rarity, identifier or illustration is inspected before the gate.
    if (hidden)
      return (
        '<div class="duel-card-wrap"><span class="duel-label">ADVERSAIRE · ' +
        (index + 1) +
        '</span><div class="rb-card-hidden ' +
        (pvp ? "pvp-hidden" : "mystery-card") +
        '" aria-label="Carte adverse cachée">' +
        galaxyMark +
        '<b>MASHUP</b><small>CARTE NON RÉVÉLÉE</small></div><div class="duel-card-name">À découvrir</div></div>'
      );
    if (!c)
      return '<div class="duel-card-wrap"><div class="rb-card-hidden" aria-label="Carte indisponible"><b>INDISPONIBLE</b></div></div>';
    if (Object.getOwnPropertyDescriptor(c, "hidden")?.value === true)
      return '<div class="duel-card-wrap"><div class="rb-card-hidden" aria-label="Carte indisponible"><b>À DÉCOUVRIR</b></div></div>';
    if (!catalogueIsActive(c))
      return '<div class="duel-card-wrap"><div class="rb-card-hidden" aria-label="Carte archivée"><b>CARTE ARCHIVÉE</b><small>Référence historique conservée</small></div></div>';
    return (
      '<div class="duel-card-wrap"><span class="duel-label">' +
      (enemy ? "ADVERSAIRE" : "TON ÉQUIPE") +
      (double ? " · " + (index + 1) : "") +
      '</span><div class="rb-card-object">' +
      inspectionObjectMarkup(renderCard(c, { revealedOpponent: enemy }), {
        rarity: c.rarity,
        variant: c.variant,
      }) +
      '</div><div class="duel-card-name">' +
      esc(c.name) +
      "</div></div>"
    );
  };
  const own = (s.playerCards || [])
    .map((c, i) => card(c, false, false, i))
    .join("");
  const enemy =
    (s.enemyRevealed ?? revealed)
      ? (s.enemyCards || []).map((c, i) => card(c, true, false, i)).join("")
      : Array.from({ length: double ? 2 : 1 }, (_, i) =>
          card(null, true, true, i),
        ).join("");
  const choose = !revealed && s.turn === "player",
    ai = !pvp && !revealed && s.turn === "enemy";
  const teamNavigation = double ? '<div class="rb-duo-navigation" role="group" aria-label="Équipe visible dans le plateau"><button type="button" data-rb-pan="player" aria-pressed="true" aria-label="Afficher ton duo dans le plateau">Ton duo</button><button type="button" data-rb-pan="enemy" aria-pressed="false" aria-label="Afficher le duo adverse dans le plateau">Duo adverse</button></div>' : '';
  const buttons = choose
    ? '<div class="' +
      (pvp ? "pvp-stats" : "challenge-stat-grid") +
      '">' +
      stats
        .map(
          (f) =>
            '<button class="stat-choice" type="button" data-action="' +
            (pvp ? "pvp-choose" : "challenge-stat") +
            '" data-stat="' +
            esc(f.key) +
            '" ' +
            (!["higher", "lower"].includes(s.direction) ? "disabled" : "") +
            ' title="' + esc(f.label + (s.direction === "lower" ? " · La plus petite valeur gagne" : s.direction === "higher" ? " · La plus grande valeur gagne" : " · Règle en attente")) +
            '"><span class="stat-choice-title">' +
            esc(f.label) +
            "</span><strong>" +
            esc(s.values?.[f.key] ?? "—") +
            "<small> / " +
            (double ? 200 : 100) +
            '</small></strong><span class="rb-stat-direction" aria-hidden="true">' + (s.direction === "higher" ? "↑ MAX" : s.direction === "lower" ? "↓ MIN" : "—") + '</span></button>',
        )
        .join("") +
      "</div>"
    : ai
      ? '<div class="rb-wait rb-ai-choice"><span class="rb-thinking" aria-hidden="true"><i></i><i></i><i></i></span><button class="btn btn-primary" data-action="ai-turn">Découvrir le choix de l’IA →</button></div>'
      : !revealed
        ? '<div class="rb-wait pvp-waiting"><span class="wait-spinner" aria-hidden="true"></span><span>L’adversaire choisit sa statistique.<br>Le résultat viendra du serveur.</span></div>'
        : s.finished
          ? '<button class="btn btn-primary rb-next" data-action="' +
            (pvp ? "pvp-quit" : "quit-battle") +
            '">Revenir à l’arène →</button>'
          : s.meReady
            ? '<div class="rb-wait pvp-waiting">Ton choix est enregistré. En attente de l’adversaire.</div>'
            : '<button class="btn btn-primary rb-next ' +
              (pvp ? "pvp-next-button" : "") +
              '" data-action="' +
              (pvp ? "pvp-next" : "next-round") +
              '">' +
              (pvp ? "Prêt pour la manche suivante" : "Manche suivante") +
              " →</button>";
  const resultTitle =
    winner === "player"
      ? "MANCHE GAGNÉE"
      : winner === "enemy"
        ? "MANCHE PERDUE"
        : winner === "draw"
          ? "ÉGALITÉ"
          : "RÉSULTAT DE LA MANCHE";
  const compare = revealed
    ? '<div class="challenge-result rb-round-result"><div class="challenge-result-title rb-result-title">' +
      resultTitle +
      '</div><div class="comparison-numbers rb-comparison"><div><small>TON ÉQUIPE</small><b>' +
      esc(s.pValue ?? "—") +
      "</b></div><div><strong>" +
      esc(stat?.label || "Comparaison") +
      "</strong><small>" +
      (s.direction === "higher"
        ? "↑ MAX"
        : s.direction === "lower"
          ? "↓ MIN"
          : "Règle serveur") +
      "</small></div><div><small>ADVERSAIRE</small><b>" +
      esc(s.eValue ?? "—") +
      "</b></div></div></div>"
    : "";
  const reward = Number.isFinite(s.reward?.coins)
    ? "<p>+" +
      esc(s.reward.coins) +
      " crédits" +
      (Number.isFinite(s.reward.dust) && s.reward.dust
        ? " · +" + esc(s.reward.dust) + " éclats"
        : "") +
      "</p>"
    : "";
  const outcome = s.finished
    ? '<section class="rb-outcome battle-end" data-result="' +
      winner +
      '"><span class="rb-medal" aria-hidden="true">' +
      (winner === "player" ? "✦" : winner === "enemy" ? "◇" : "◈") +
      "</span><h2>" +
      (winner === "player"
        ? "Une victoire à graver."
        : winner === "enemy"
          ? "Le duel s’achève."
          : "Un équilibre parfait.") +
      '</h2><div class="rb-final-score">' +
      esc(s.playerScore) +
      " – " +
      esc(s.enemyScore) +
      "</div>" +
      reward +
      (Number.isFinite(s.balance)
        ? "<p>Solde serveur : " + esc(s.balance) + " crédits</p>"
        : "") +
      "<p>" +
      esc(s.endNote || "") +
      '</p><p class="rb-outcome-record">' + esc(s.finished ? "Quatre manches · " + (double ? "duos" : "combat simple") : "") + '</p></section>'
    : "";
  return (
    '<div class="rb-shell"><div class="rb-mode-switch arena-main-switch"><button class="btn ' +
    (!pvp ? "btn-primary" : "") +
    '" data-action="arena-section" data-section="campaign">Campagne IA</button><button class="btn ' +
    (pvp ? "btn-primary" : "") +
    '" data-action="arena-section" data-section="online">Défis en ligne</button></div><section class="rb-arena ' +
    (pvp ? "pvp-field" : "challenge-field combat-field") +
    '" data-rb-mode="' +
    (double ? "double" : "simple") +
    '" data-rb-quality="' +
    quality +
    '"><header class="rb-topline"><div class="rb-heading"><small>NEXUS · ' +
    (pvp ? "PVP" : "CAMPAGNE") +
    "</small><h1>" +
    (double ? "Le choc des duos." : "Le cercle des légendes.") +
    '</h1></div><div class="rb-top-actions"><label><span class="sr-only">Qualité des combats</span><select id="rb-quality" aria-label="Qualité des combats">' +
    [
      ["spectacular", "Spectaculaire"],
      ["balanced", "Équilibré"],
      ["fluid", "Fluidité"],
    ]
      .map(
        ([v, label]) =>
          '<option value="' +
          v +
          '" ' +
          (quality === v ? "selected" : "") +
          ">" +
          label +
          "</option>",
      )
      .join("") +
    '</select></label><button class="btn" data-action="arena-skip" title="Terminer les effets visuels">Passer</button><button class="btn" data-action="' +
    (pvp ? "pvp-quit" : "quit-battle") +
    '">' +
    (s.finished ? "Fermer" : "Quitter") +
    '</button></div></header><div class="rb-network" role="status" hidden></div><div class="rb-scoreboard duel-score"><div><small>TOI</small><strong>' +
    esc(s.playerScore) +
    "</strong></div><span><b>MANCHE " +
    esc(Number(s.round) + 1) +
    " / 4</b>" +
    (s.finished
      ? "TERMINÉ"
      : s.turn === "player"
        ? "TON CHOIX"
        : "CHOIX ADVERSE") +
    (pvp && s.deadlineAt
      ? '<span id="pvp-countdown" class="rb-clock" aria-label="Temps restant serveur"></span>'
      : "") +
    "</span><div><small>" +
    esc(s.opponentName || "ADVERSAIRE") +
    "</small><strong>" +
    esc(s.enemyScore) +
    '</strong></div></div>' + roundProgressMarkup(s, esc) + '<div class="rb-stage"><div class="rb-scenery" aria-hidden="true">' + FLOOR + '<span class="rb-horizon"></span><span class="rb-orbit"></span><span class="rb-aurora rb-aurora--player"></span><span class="rb-aurora rb-aurora--enemy"></span><i class="rb-impact"></i><i class="rb-sweep"></i></div><div class="rb-duel ' +
    (pvp ? "pvp-duel-grid" : "combat-duel") +
    '"><div class="rb-team ' +
    (pvp ? "pvp-side" : "combat-team") +
    '" data-rb-side="player">' +
    '<span class="rb-victory-light" aria-hidden="true"></span>' + own +
    '</div><span class="vs" aria-hidden="true"><span>VS</span><i class="rb-vs-wave"></i></span><div class="rb-team ' +
    (pvp ? "pvp-side" : "combat-team") +
    '" data-rb-side="enemy">' +
    '<span class="rb-victory-light" aria-hidden="true"></span>' + enemy +
    '</div></div></div><div class="rb-phase-line" aria-hidden="true"><span class="rb-phase-label"></span></div>' +
    compare +
    outcome +
    '<div class="rb-choice-dock ' +
    (choose ? "challenge-choice" : "") +
    '" data-rb-stat-dock>' +
    ruleBannerMarkup(s.direction, esc, {round: s.round, statLabel: stat?.label, turn: s.turn, finished: s.finished, playerScore: s.playerScore, enemyScore: s.enemyScore}) +
    buttons + teamNavigation +
    '<p class="rb-rule-note">' +
    (double
      ? "Les deux valeurs de chaque équipe sont additionnées."
      : "Une statistique. Une confrontation.") +
    "</p></div>" +
    (s.historyHTML
      ? '<details class="battle-log"><summary>Consulter les résultats détaillés · 4 manches</summary>' +
        s.historyHTML +
        "</details>"
      : "") +
    "</section></div>"
  );
}
