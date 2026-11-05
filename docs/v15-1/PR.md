# Mashup V15.1 — Arena Reborn et échanges depuis les collections

Les combats V15 demandaient de remonter la page pour vérifier la règle ; les échanges se composaient avec des listes déroulantes. Cette version place la règle et les cinq choix dans un dock mobile permanent, ajoute une scène de confrontation commune IA/PvP et permet de choisir directement les cartes dans les collections des deux joueurs.

## Changements

- Cartes physiques V15, scène en profondeur, phases explicites de révélation/comparaison/impact/résultat et présentations de victoire/défaite/égalité.
- Animations annulables et passables, sans verrou métier ; modes Spectaculaire/Équilibré/Fluidité et réduction des animations prioritaire.
- Règle ↑/↓ provenant exclusivement de la direction serveur, visible près des choix en simple, Double et PvP sur petit écran.
- Double mobile en rangées de deux cartes ; une zone défilable préserve leur taille et laisse les choix accessibles.
- Échanges : deux collections visuelles, onglets mobiles, recherche/filtres/tri, pagination, quantités, récapitulatif et contre-offres préremplies.
- Réponses tardives isolées après navigation, changement de partenaire ou reconnexion ; informations adverses masquées avant autorisation.

## Protection et validation

**138 tests unitaires et 15 scénarios/groupes navigateur réussis**, plus contrôles ciblés du mode économie et du Double. Comparaison séquentielle sur trois répétitions par version ; les mesures Chromium sont comparables, sans gain FPS revendiqué.

Référence : main **19375ce**, V15. Aucun changement de backend, données de production, catalogue, illustrations, règles, probabilités, récompenses ou contrat API. Les requêtes de validation d’échanges et de combat restent celles du jeu existant.

[Rapport fonctionnel](README.md) · [tests et performances mesurées](validation.md) · [comparaison V15/V15.1](artifacts/comparison.html) · [combat filmé](artifacts/combat-preview.webm) · [sélection d’échanges filmée](artifacts/trades-preview.webm).

Les essais utilisent Chromium Linux et des API intégralement interceptées avec données fictives. Aucun téléphone physique ou vrai backend n’est déclaré testé. Le retour arrière ne nécessite aucune migration de données. Aucun déploiement et aucune fusion inclus dans cette PR.

---

Branche : `feature/mashup-v15-1-arena-reborn` → `main`.

Commande préparée, avec le corps situé avant ce séparateur :

```sh
gh pr create --repo fpdorian-glitch/Mashup --base main --head feature/mashup-v15-1-arena-reborn --title "Mashup V15.1 — Arena Reborn et échanges visuels" --body-file /tmp/mashup-v151-pr-body.md
```

[Ouvrir la création de PR](https://github.com/fpdorian-glitch/Mashup/compare/main...feature/mashup-v15-1-arena-reborn?expand=1).


État réel : branche poussée. La création automatique de PR a échoué sur `api.github.com/graphql` (`Forbidden`). Aucune PR distante, fusion ou publication réalisée. Titre, description et preuves prêts pour la revue ; statut CI distant à consulter dans GitHub.
