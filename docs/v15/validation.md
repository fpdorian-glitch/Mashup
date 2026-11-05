# Validation V15 — résultats et limites

Référence publiée : **`18f8d14` — V14.0.2**. Version candidate : branche `feature/mashup-v15-immersion`, V15.0.0. Vérifications réalisées le **5 novembre 2026** dans Chromium Linux, avec données fictives. Aucune requête applicative réelle vers Supabase, aucun téléphone physique et aucun déploiement.

## Preuves exécutées

| Vérification | Résultat | Preuve |
|---|---|---|
| Tests Node : référence, présentation mobile, rendu V14 et modules V15 | **123/123 réussis** | [Sortie complète](unit-results.txt) |
| Régression du vrai frontend dans Chromium | **12 groupes réussis** | [browser-results.json](artifacts/browser-results.json) |
| Réseau, sessions, confidentialité, combats et parcours existants | **11 scénarios réussis** | [reliability-results.json](artifacts/reliability-results.json) |
| Mesures V14/V15 isolées et séquentielles | **3 répétitions par version** | [performance-results.json](artifacts/performance-results.json) |
| Comparaison visuelle | Captures des deux versions, mêmes données et fenêtre | [comparison.html](artifacts/comparison.html) |

La régression navigateur vérifie les cinq largeurs **320, 360, 390, 768 et 1440 px** : accueil, collection classique et album sans débordement horizontal. Elle couvre la pagination progressive de la grille classique conservant les nœuds existants, la recherche, les filtres, le passage album/grille, le menu, les decks, les permissions et la déconnexion.

Les cartes sont examinées sur les **24 combinaisons** de rareté/variante : cinq statistiques visibles, aucune collision avec le titre, illustration conservée. L’inspection utilise les événements réels de souris, le tactile **simulé par CDP** et les flèches du clavier. Les quatre tranches, l’épaisseur, le dos, le retour à la face, le mode économie et le réglage de mouvement réduit sont vérifiés. La lumière calculée du biseau change réellement après un geste : le test lit le gradient du matériau rendu, au-delà des seules variables du contrôleur.

Les 11 scénarios de fiabilité comprennent : préparation différée annulée, confirmation réessayée après réponse perdue, accélération pendant une révélation Ultra, modale retirée avant callback, réponse PvP après navigation, reconnexion à un autre compte puis au même compte, confidentialité des Secrètes non obtenues même pour un administrateur, campagne de quatre manches, PvP et parcours marché/échanges/profil/jeux/classements/succès/atelier/administration. La nouvelle session peut charger son PvP avant le retour d’une requête de l’ancienne session.

**Aucune exception JavaScript dans ces scénarios.** Une erreur console HTTP **503 est volontairement injectée** dans le seul scénario de confirmation perdue. Les autres scénarios et la régression générale n’ont aucune erreur console. La reprise utilise le même `openingId` et produit un seul débit dans le serveur fictif. **Ce résultat ne démontre pas l’idempotence du vrai backend.**

Le jeu serveur simulé comporte 36 cartes, dont 6 Secrètes. En les retirant uniquement de l’inventaire fictif, le test parcourt exactement **30 emplacements** d’album : aucun emplacement, nom, identifiant de carte ou compte ne révèle les six Secrètes inconnues. Quatre normales fictives supplémentaires sont absentes pour montrer les pochettes à compléter dans les captures dédiées.

## Captures et démonstrations

- [Inspection réelle recto/verso et inclinaison](artifacts/inspection-preview.webm) ; [recto](artifacts/card-inspection.png) et [dos](artifacts/card-back.png).
- [Ouverture réelle d’un booster](artifacts/booster-preview.webm), du sceau au récapitulatif ; la confirmation est ensuite vérifiée par le test.
- [24 finitions](artifacts/cards-24-finishes.png) et [rendu mobile](artifacts/cards-mobile.png). Cette planche utilise le véritable moteur, avec illustrations procédurales explicitement fictives. Les captures du jeu utilisent les illustrations existantes.
- [Feuillet d’album à compléter](artifacts/album-leaf.png), capture du composant réellement rendu à 390 px de large ; une fenêtre plus haute permet de montrer le feuillet entier sans barre fixe superposée. [Vue sur fenêtre mobile](artifacts/album-missing-mobile.png).
- [Combat IA](artifacts/battle-mobile.png) et [PvP](artifacts/pvp-mobile.png), avec résultats déterministes provenant du serveur fictif.
- [Comparaison V14/V15](artifacts/comparison.html) : accueil, inspection, combat, collection classique, puis nouveau mode album. V14 ne possédait pas ce mode ; la comparaison conserve sa vue classique.

Les WebM proviennent des images du **screencast réel de Chromium avec leurs horodatages**, assemblées par ffmpeg. Il ne s’agit ni d’animations inventées pour la présentation, ni de captures d’un téléphone physique. Les métadonnées de durée et de nombre d’images sont dans le rapport navigateur.

Pendant la vidéo du booster, le délai mesuré **entre le clic DOM et la carte prête** est de **198 ms pour la commune**, **951 ms pour la Mythique Gold** et **1320 ms pour l’Ultra Secrète**. Un seul échantillon par rareté, sous enregistrement : ces durées illustrent la cadence, sans constituer un benchmark. L’attente de Playwright avant le clic est conservée séparément dans le JSON. L’activation du mode rapide pendant une révélation Ultra l’a terminée en **173 ms supplémentaires** dans le test de fiabilité.

## Performances mesurées

Chromium **155.0.8059.79**, Linux x64, AMD EPYC 9V74, fenêtre **390 × 844 CSS px**, échelle 1, GPU désactivé. Données, navigateur, machine et qualité « Spectaculaires » identiques. V14 est extrait par `git archive 18f8d14`, servi sur le même serveur localhost que V15. Service workers bloqués, API interceptées.

Chaque répétition crée un contexte neuf ; V14 puis V15 sont évaluées successivement. Les scènes sont échantillonnées après chargement : **120 intervalles `requestAnimationFrame`**, collection/album avec défilement. Trois répétitions par version, sans autre navigateur de test ni screencast pendant les mesures. Les valeurs ci-dessous sont les **médianes des trois répétitions**.

| Scène | Cartes V14 → V15 | Nœuds DOM V14 → V15 | p95 intervalle rAF V14 → V15 |
|---|---:|---:|---:|
| Accueil | 3 → 3 | 683 → 688 | 16,8 → 16,7 ms |
| Collection classique | 24 → 24 | 1647 → 1656 | 16,7 → 16,8 ms |
| Inspection, collection derrière | 25 → 25 | 1720 → 1747 | 16,8 → 16,8 ms |
| Album V15, nouveau mode | 6 | 706 | 16,8 ms |

Aucune longue tâche ni intervalle supérieur à 33,34 ms observé pendant les fenêtres échantillonnées. Un intervalle d’inspection V15 a atteint 33,2 ms dans une répétition ; les p95 restent comparables. Les écarts de 0,1 ms ne permettent pas de revendiquer une amélioration de fluidité.

Le gain structurel vérifiable est le nombre d’objets rendus dans l’album : **6 cartes au lieu de 24**, **706 nœuds au lieu de 1656** pour la grille V15, soit environ **57 % de nœuds en moins**. Cela correspond à un autre mode d’affichage avec pagination ; ce n’est pas une mesure du même nombre de cartes. La géométrie d’inspection ajoute 27 nœuds à la page de référence, sans introduire ces tranches dans les grilles.

Les heaps médians V14/V15 sont respectivement de **3,15/3,19 Mo** à l’accueil, **3,18/3,59 Mo** en collection et **3,75/3,83 Mo** en inspection. Les valeurs brutes restent dans le JSON ; elles dépendent notamment du garbage collector. Elles ne prouvent ni une réduction mémoire ni une fuite. Aucune affirmation de gain FPS, de coût GPU, de consommation ou de température n’est tirée de ces essais.

## Reproduire

Prérequis : Node 24, Chromium, Git avec `18f8d14`, `tar` ; ffmpeg pour les WebM. Le chemin Chromium peut être remplacé par `CHROMIUM_PATH`. Aucune dépendance de validation n’est ajoutée au jeu.

```sh
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs tests/v14/*.test.mjs tests/v15/*.test.mjs
npm install --prefix /tmp/mashup-ui-validation --no-audit --no-fund --ignore-scripts playwright-core@1.64.1
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15/browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15/reliability.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15/performance.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15/browser.cjs --demos-only
```

Exécuter les performances seules, après les suites fonctionnelles. `--demos-only` prolonge l’inspection filmée et produit les vues d’album à compléter, sans réexécuter les transactions fictives ; il exige un rapport général déjà réussi. Les résultats sont écrits dans `docs/v15/artifacts/`. Le laboratoire intercepte toutes les requêtes hors localhost, y compris les modules d’authentification : ouvrir le jeu séparément sans ce laboratoire conserve les adresses de production et ne crée pas une préproduction isolée.

## Validation restant nécessaire avant publication

- Téléphones physiques : Safari iOS et Chrome Android, glissement, interruption du geste, recto-verso, rotation, veille/reprise, qualité adaptative, chauffe, autonomie et sessions longues.
- Supabase de préproduction indépendante : deux vrais clients PvP, Double et Parimatch, concurrence des actions économiques, reprise après fermeture brutale, perte de réponse de confirmation, permissions et transactions réelles.
- Marché, échanges, crédits, éclats, decks et mini-jeux avec le vrai backend de test. Les parcours frontend présents ne certifient pas ces règles serveur.
- Revue humaine artistique et validation explicite de la fusion. Aucun déploiement et aucune restauration Supabase réelle n’ont été réalisés ni déclarés validés.
