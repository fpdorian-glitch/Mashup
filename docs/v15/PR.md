# Mashup V15 — cartes vivantes, boosters interruptibles et album de collection

V15 prolonge V14.0.2 avec des cartes inspectables en relief et recto/verso, une révélation de booster progressive selon la rareté, des confrontations IA/PvP animées depuis l’état serveur et un album paginé en complément de la collection classique. La déconnexion invalide les anciennes réponses et nettoie les opérations visuelles et files de sauvegarde de la session précédente.

## Changements

- Inspection : quatre tranches, biseau et dos générique, plans séparés et lumière liée à l’inclinaison ; géométrie réservée à une carte inspectée. Chemins plats en économie et mouvement réduit.
- Boosters : horloge annulable et accélération pendant prélude, flip, rangement ou ouverture du scellé. Les communes passent vite ; les grandes raretés disposent d’une mise en scène plus longue.
- Arène : confrontation simultanée, statistique choisie, scores et résultat ; animations courtes sans verrou des actions, sans répétition au poll identique.
- Album : six emplacements par feuillet mobile, douze sur grand écran, progression de série indépendante des filtres, manquantes neutres et Secrètes non obtenues entièrement exclues. Vue classique et filtres conservés.
- Sessions : rejet des réponses d’anciennes sessions, y compris au même identifiant, et isolation des polls PvP/invitations et sauvegardes de préférences.

## Protection

Part de `main` **18f8d14**. Aucun changement de backend, catalogue, illustrations, cadrages, règles, probabilités ou données de production. Aucune nouvelle route API ; mêmes payloads prepare/cancel/commit. Tous les tests navigateur interceptent les appels externes avec des données fictives.

## Validation

Résultats et commandes reproductibles : [rapport V15](README.md), [validation](validation.md), [preuves Node](unit-results.txt), [régression navigateur](artifacts/browser-results.json), [fiabilité](artifacts/reliability-results.json), [mesures V14/V15](artifacts/performance-results.json).

[Comparaison visuelle](artifacts/comparison.html) · [24 finitions](artifacts/cards-24-finishes.png) · [inspection](artifacts/card-inspection.png) · [ouverture filmée](artifacts/booster-preview.webm) · [album](artifacts/album-mobile.png).

Chromium Linux avec cinq largeurs de fenêtre ; aucune validation sur téléphone physique ou Safari. Les mesures rAF ne couvrent pas le pipeline GPU. La concurrence et l’idempotence du véritable backend nécessitent toujours une préproduction isolée. Pas de migration DB ; retour arrière par annulation des commits frontend V15. Aucun déploiement inclus dans cette PR.

---

Branche : `feature/mashup-v15-immersion` → `main`.

Commande préparée (le corps de PR s’arrête avant ce séparateur) :

```sh
gh pr create --repo fpdorian-glitch/Mashup --base main --head feature/mashup-v15-immersion --title "Mashup V15 — cartes vivantes, boosters interruptibles et album" --body-file /tmp/mashup-v15-pr-body.md
```

[Créer la PR dans GitHub](https://github.com/fpdorian-glitch/Mashup/compare/main...feature/mashup-v15-immersion?expand=1).
