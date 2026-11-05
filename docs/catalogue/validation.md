# Validation du catalogue automatique

Les tests utilisent des objets fictifs ou le catalogue public du dépôt. Les requêtes externes du laboratoire navigateur sont interceptées avant accès au réseau. Aucun compte réel, tirage réel ou solde Supabase n’a été utilisé.

Résultat du 5 novembre 2026 : **210/210 tests Node réussis**, **11 vérifications catalogue en navigateur réussies** et **15 scénarios de régression réussis**. Zéro test ignoré dans la suite Node. Les limites ci-dessous restent applicables.

## Commandes reproductibles

Depuis la racine, avec Node 24 :

```sh
node tools/catalogue/build-server-core.mjs --check
node tools/catalogue/audit.mjs --simulate
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs tests/v14/*.test.mjs tests/v15/*.test.mjs tests/v15-1/*.test.mjs tests/catalogue/*.test.mjs
```

Le job GitHub Actions existant exécute cette dernière commande pour la branche et les pull requests. Les tests historiques de protection ont une liste explicite des seuls fragments/catalogues dont la modification est autorisée par cette tâche. Les sources des illustrations, cadrages, marchés, échanges et règles de combat restent protégées.

Pour le navigateur, installer Playwright Core dans un répertoire de développement externe au jeu, puis utiliser Chromium :

```sh
npm install --prefix /tmp/mashup-ui-validation playwright-core
NODE_PATH=/tmp/mashup-ui-validation/node_modules CHROMIUM_PATH=/usr/bin/chromium node tests/catalogue/browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules CHROMIUM_PATH=/usr/bin/chromium node tests/catalogue/regression.cjs
```

Ces commandes servent uniquement l’application sur une adresse locale éphémère et produisent les preuves dans `docs/catalogue/artifacts/`. Les écrans et vidéos sont des captures du vrai client avec réponses API fictives, pas des maquettes ni une session de production. Chromium Linux simule le tactile et les dimensions mobiles ; aucun téléphone physique n’a été testé.

## Couverture demandée

| Situation | Vérification |
|---|---|
| Ajout normal | Le total augmente, le numéro visible et la progression sont recalculés ; aucune cible manuelle à saisir. |
| Archivage | La carte disparaît des choix actifs ; propriété et références de decks sont conservées. |
| Restauration | Le total et les numéros reviennent ; les flags précédents sont restaurés exactement sur copie isolée. |
| Ajout/retrait de Secrète | Aucun effet sur le total normal ou sa révision publique ; numéro historique hors série conservé. |
| Nouvelle série | 0/0, pas de trophée vide ni de récompense automatiquement débloquée. |
| Numérotation | Séquence compacte dans l’ordre historique ; aucun changement d’ID ou de `editionNumber` stocké. |
| Progression | 45 normales distinctes sur 90 donnent 50 %, quel que soit le nombre de copies. |
| Retrait d’univers | Alias explicites normalisés, contradictions bloquantes ; dix Power Rangers et aucune autre franchise dans le fichier. |
| Références et économie | Collections, decks, annonces et propositions conservés sur copies ; montants et réclamations uniques inchangés. |
| Actualisation/autre compte | Snapshots remplacés, caches invalidés, même dénominateur et progression propre à chaque compte. |
| Réponses tardives | Une lecture antérieure n’écrase pas une nouvelle réclamation, un catalogue invalidé ou un compte déconnecté. |
| Payload partiel | Projection de 91 normales, une seule carte transmise : 91 emplacements normaux, pochettes neutres et progression 45/91. |
| Confidentialité | Pas d’emplacement ni de contenu d’une Secrète inconnue ; getters privés piégés dans les tests. |

Le navigateur vérifie les interactions administrateur réelles contre une API simulée : création, archivage, restauration, séries, récompenses et navigation. La régression reprend également les combats IA simples/doubles sur 320×568, 360×640 et 390×844, le PvP hôte/invité, les résultats, les interruptions réseau simulées, les réponses tardives et les échanges avec quantités/contre-offres.

## Preuves enregistrées

- [Résultat de la suite Node](unit-results.txt).
- [Scénario catalogue en navigateur](artifacts/browser-results.json).
- [Régression des fonctionnalités existantes](artifacts/regression-results.json).
- [Audit hors ligne du fichier préparé](artifacts/offline-audit.json).
- [Collection 45/90](artifacts/collection-auto-45-90.png), [album](artifacts/album-auto.png), [gestion des séries](artifacts/admin-series-auto.png).

Les rapports JSON contiennent les requêtes et comptes fictifs du laboratoire pour rendre les assertions contrôlables. Ils ne contiennent aucune donnée de joueur réel ni clé Supabase.

## Ce que ces preuves ne valident pas

L’authentification réelle, les permissions/RLS, les transactions concurrentes, les caches du serveur privé, les tirages déployés et la résolution des opérations en cours nécessitent un backend complet et une préproduction indépendante. La restauration Supabase n’a pas été exécutée et n’est pas déclarée validée. Les nombres de production restent inconnus. Les conditions de passage à une opération réelle sont détaillées dans [l’inventaire](inventory.md) et le [contrat backend](backend-integration.md).
