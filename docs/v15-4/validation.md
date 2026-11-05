# Validation V15.4 — 5 novembre 2026

Le client a été vérifié après intégration de `main` V15.3.2 (`d486c86`). Tous les essais utilisent des comptes, cartes et soldes fictifs. Les requêtes navigateur sont interceptées, sans appel à la production. Captures et vidéos proviennent du véritable client rendu dans Chromium Linux 155.0.8059.79.

## Résultats observés

| Vérification exécutée | Résultat | Preuve |
|---|---|---|
| Suites Node client et régressions historiques | **319/319**, aucun échec ni test ignoré | [Sortie complète](unit-results.txt) |
| Service Match privé | **26/26**, aucun échec ni test ignoré | [Résultats agrégés](match-backend-validation.json), sortie complète dans le dossier privé |
| Campagne Match et économie intégrées | **9 scénarios réussis** | [Rapport Match](artifacts/browser-results.json) |
| Combats IA/PvP, échanges et navigation | **15 scénarios réussis** | [Régressions](artifacts/regression-results.json) |
| Boosters, récupération V15.3.2, Memory et PWA | **5 scénarios réussis** | [Interruptions](artifacts/booster-update-results.json) |
| Casino, deux comptes et horloges décalées | **7 contrôles réussis** | [Rapport Casino](artifacts/casino-browser-results.json) |
| Matériaux, variantes et geste du booster | **24 cartes, 120 statistiques, 6 substrats distincts** | [Rapport matériaux](artifacts/cards-boosters-browser-results.json) |
| Performance comparative | 7 parcours séquentiels, dont 3 par version en qualité élevée | [Mesures et limites](performance.md) |

Les 36 scénarios/contrôles navigateur détaillés sont complétés par la galerie de matériaux. Ce nombre ne représente pas des tests de transactions de production.

## Périmètre vérifié

**Match :** échanges valides/invalides, bonus de quatre/cinq/L/T et combinaisons, gravité, cascades, obstacles, mélange contrôlé, victoire/défaite et budget de coups. Les cent configurations sont contrôlées et les cent grilles canoniques possèdent un transcript gagnant exécuté par le moteur. Le service privé joue aussi les cent transcripts, débloque les niveaux et attribue 17 550 crédits fictifs de première victoire.

Les tests du service refusent les scores, seeds, rôles et gains imposés par le client. Ils vérifient identifiants, révisions, sessions, rôles stockés, limites de requêtes, répétitions/concurrence, attribution unique, rollback injecté, plafonds, changement de jour UTC et reprise d’une partie depuis une autre instance. **L’adaptateur transactionnel testé est en mémoire, avec sérialisation et commit sur copie. Ces tests ne valident pas une transaction SQL Supabase.**

Le navigateur vérifie la reprise après actualisation et dans un second contexte navigateur, l’isolement d’un autre compte, la réponse perdue après victoire suivie d’un retry, le solde confirmé, les gains Admin, les replays plafonnés, la suspension/réactivation des gains et les réponses tardives après navigation. Le mode entraînement fonctionne avec un ancien backend, conserve son parcours local et n’attribue aucun crédit. Dimensions contrôlées : 320, 390 et 1024 px, avec mouvement réduit.

**Arène et échanges :** combats simples/doubles IA, hôte/invité PvP, règles MAX/MIN permanentes à 320, 360 et 390 px, victoire/défaite/égalité, profils graphiques, interruptions réseau, navigation et déconnexion. Les échanges conservent sélection dans les deux collections, filtres, quantités, proposition, contre-offre et acceptation, avec rejet des réponses d’un ancien partenaire. Les résultats économiques sont des réponses simulées du serveur existant.

**Boosters et cartes :** ouverture normale/exceptionnelle, résumé, matrices de face non inversées après révélation, geste incomplet annulé, annulation de préparation, protection contre fermeture, confirmation perdue puis retry sur le même identifiant, ticket V15.3.2 retrouvé après actualisation et retour final aux Boosters. Les débits, tirages et commits du backend existant sont simulés ; aucune preuve de son idempotence réelle n’en est déduite.

**Casino :** compteur visible avant le direct à 320 × 568 et 390 × 844, deux comptes fictifs avec horloges décalées de −2 minutes et +4 heures, échéance commune, actualisation, reprise, alerte de vingt secondes, fermeture des mises et transitions serveur. Ce scénario n’envoie que des lectures de statut. Les paris, résultats et paiements réels ne sont pas exécutés.

**Protection générale :** contrôle de session avant/après récupération Auth, refus des réponses d’un ancien compte, conservation des modifications locales de deck/collection lors d’un gain Match, solde confirmé après sortie de la vue, blocage des actualisations pendant partie/achat/sauvegarde et conservation du stockage de connexion. Memory est parcouru jusqu’à une victoire simulée avec ses douze choix, puis une défaite. Les suites historiques couvrent catalogue, confidentialité des Secrètes, progression/succès et contrats du marché.

Un garde compare au commit `d486c86` les sources du catalogue, illustrations, fragments backend/économiques, rendu de base, Image Studio et récupération V15.3.2 : ces fichiers restent inchangés. Les modules inline compilent et les ressources locales/versionnées sont vérifiées.

## Reproduction

Depuis la racine du dépôt, avec Node 24 :

```sh
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs tests/v14/*.test.mjs tests/v15/*.test.mjs tests/v15-1/*.test.mjs tests/catalogue/*.test.mjs tests/v15-3/*.test.mjs tests/v15-4/*.test.mjs
```

Installer `playwright-core` dans un préfixe extérieur au dépôt et disposer de Chromium à `/usr/bin/chromium`. `ffmpeg` encode les enregistrements. Le harnais utilise un serveur HTTP local ; cet environnement exige une autorisation d’exécution pour les sockets et sous-processus Chromium.

```sh
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-4/regression.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-4/booster-update-browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-4/casino-browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-4/cards-boosters-browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules MASHUP_MATCH_FIXTURE_MODULE=/workspace/mashup-backend-private/fixture-service.mjs node tests/v15-4/browser.cjs
node --test /workspace/mashup-backend-private/tests/match-service.test.mjs
```

Le test intégré Match nécessite le module privé et échoue explicitement s’il manque ; les sources privées ne sont pas publiées dans GitHub. Les tests Node client fonctionnent sans lui. Exécuter le benchmark séparément, sans autre suite navigateur concurrente, selon [performance.md](performance.md).

## Limites et conditions de publication

- Aucun Android/iPhone physique, Safari iOS, écran installé PWA ni GPU mobile réel n’a été testé.
- Illustrations et latences du réseau de production non mesurées. Les cent niveaux ont une solution canonique ; leur difficulté demande encore un équilibrage par des joueurs.
- Sources exactes des Edge Functions, routeur authentifié, transactions SQL, miroir du portefeuille et politiques JWT/RLS à récupérer et vérifier. Les gains Match réels ne sont pas activés.
- Aucun compte réel, inventaire, solde, historique, catalogue ou paramètre de production modifié. Aucune migration, restauration, Edge Function ou publication sur `main` effectuée.
- Une restauration Supabase n’est **pas validée** : elle doit être réellement exécutée en préproduction indépendante. La copie mémoire des tests n’en tient pas lieu.

Voir le [plan de publication et de retour arrière](release-plan.md) et le [statut Git/PR de livraison](delivery.md).
