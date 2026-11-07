# Mashup V16 — le multivers en poche

Branche : `feature/mashup-v16-mobile-shell`. Référence : `79172e1` (V15.7.2 publiée). Aucun déploiement ni changement de données de joueurs.

La V16 remplace les pages principales défilantes par cinq destinations fixes et des sous-écrans : accueil avec galerie 3D, collection et filtres, six modes de jeu, marché en quatre rubriques, menu et administration. Le moteur des cartes et les règles sont conservés.

- [Architecture, audit UX/réseau et limites backend](architecture-et-reseau.md)
- [Validation, métriques et limites des essais](validation.md)
- [Description de la Pull Request](PR.md)
- [Comparaison visuelle avant/après](artifacts/comparison.html)
- [Accueil mobile](artifacts/home-390.png), [petit écran](artifacts/home-320.png), [ordinateur](artifacts/home-1280.png)
- [Vente depuis la collection](artifacts/market-sell.png), [confirmation d’achat](artifacts/market-confirm.png)
- [Match tactile](artifacts/match-touch-preview.webm), [booster](artifacts/v16-booster.webm), [combat](artifacts/combat-preview.webm), [échanges](artifacts/trades-preview.webm)

## Reproduire les tests

Node 24, Chromium et `playwright-core` requis pour les tests navigateur. Ils ne constituent pas des dépendances du jeu. Ne pas utiliser de compte ni de service de production pour ces scripts.

```sh
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs tests/v14/*.test.mjs tests/v15/*.test.mjs tests/v15-1/*.test.mjs tests/catalogue/*.test.mjs tests/v15-3/*.test.mjs tests/v15-4/*.test.mjs tests/v15-5/*.test.mjs tests/v15-6/*.test.mjs tests/v15-7/*.test.mjs tests/v16/*.test.mjs
node tests/v16/browser.cjs
node tests/v16/regression.cjs
node tests/v16/casino.cjs
node tests/v16/cards.cjs
node tests/v16/network-browser.cjs
```

Configurer `NODE_PATH` si Playwright est installé dans un répertoire de validation distinct, et éventuellement `CHROMIUM_PATH` pour le binaire. Le binaire par défaut est `/usr/bin/chromium`. Ses mesures doivent être exécutées seules, sans vidéo ou autre suite simultanée.

`tests/v16/match.cjs` utilise en plus `MASHUP_MATCH_FIXTURE_MODULE`, chemin d’un service de test privé local compatible. Aucun code backend privé n’est copié dans ce dépôt ; les autres tests ne nécessitent pas ce fichier. Le service employé est une simulation en mémoire, pas une copie attestée de l’Edge Function déployée.

## Validation avant publication par le propriétaire

1. Examiner les changements et les captures, puis essayer la branche dans un hébergement de prévisualisation isolé.
2. Sur un projet de test avec comptes fictifs, confirmer les contrats réels : état complet ou repli après achat/échange, reprise d’un booster et des combats, gains Match, visibilité des séries, administration.
3. Sur Android et iPhone physiques : navigation Retour, clavier, rotation, zones de sécurité, installation PWA, multitâche et réseau intermittent. Ces essais matériels n’ont pas été réalisés ici.
4. Mesurer les octets réels et les en-têtes d’illustration Supabase. Aucune économie de production n’est garantie par les chiffres du laboratoire.
5. Publier uniquement après validation explicite. Les métadonnées de cette branche indiquent `development` ; la date/statut de sortie sont à établir au moment de la publication.

Retour arrière : conserver la référence publiée `79172e1`, puis rétablir les fichiers frontend de cette référence dans une PR corrective si nécessaire. Aucune restauration de base ni migration inverse n’est nécessaire pour cette V16. Ne jamais effacer le stockage Auth ou la progression d’entraînement pour revenir en arrière.

Le workflow GitHub prépare aussi ces cinq suites publiques en séquence et archive leurs preuves. Son exécution distante n’est pas attestée par les essais locaux ; elle reste à consulter sur la branche. Les tests Match avec service privé sont exécutés localement uniquement.

## État de livraison

Le développement testé a été poussé sur `feature/mashup-v16-mobile-shell` (commit de code `d9b0176`). La création automatique de PR par `gh pr create` a échoué : `Post https://api.github.com/graphql: Forbidden`. La description est prête dans [PR.md](PR.md).

[Ouvrir la Pull Request sur GitHub](https://github.com/fpdorian-glitch/Mashup/pull/new/feature/mashup-v16-mobile-shell). La PR n’a donc pas été créée automatiquement. Aucune fusion ni publication n’a été effectuée.
