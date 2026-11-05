# Validation V15.6

Référence figée : `15968dc`, V15.5.1. Tous les comptes, cartes, soldes et progressions des essais sont fictifs. Les requêtes externes du navigateur sont interceptées ; aucun compte réel ni backend déployé n’a été utilisé.

## Tests exécutés

- **Référence avant modification : 325/325 tests Node réussis**, sans échec ni test ignoré. [Sortie conservée](baseline-unit-results.txt).
- **Client après intégration et corrections : 387/387 tests Node réussis**, sans échec ni test ignoré. [Sortie complète](unit-results.txt).
- **Service privé : 43/43 tests réussis**, dont 26 historiques Match et 17 sociaux. Les [résultats agrégés](aggregate-results.json) sont publics ; le code et la sortie complète restent dans le dossier privé.
- **48 scénarios/contrôles Chromium réussis** : 19 interactions V15.6, 15 régressions, 5 interruptions, 7 Casino et 2 options de galerie. Les rapports ci-dessous consignent les parcours, captures et conditions ; un contrôle peut regrouper plusieurs assertions.

| Rapport navigateur | Périmètre |
|---|---|
| [Interactions V15.6](artifacts/browser-results.json) | Geste continu, vrai événement tactile CDP, annulations, réseau lent, commandes uniques, clavier, classement, cache, comptes, filtres, révélation, récupération et lifecycle |
| [Régressions](artifacts/regression-results.json) | 15 scénarios IA/PvP, simples/doubles, MAX/MIN, résultats, échanges et navigation |
| [Interruptions](artifacts/booster-update-results.json) | 5 scénarios de confirmation/retry/récupération, Memory et actualisation pendant transaction |
| [Casino](artifacts/casino-browser-results.json) | 7 contrôles à deux comptes, horloges décalées, actualisation, reprise et phases serveur |
| [Options de galerie](artifacts/gallery-options-results.json) | 2 contrôles : qualité appliquée immédiatement et défilement conservé après ouverture/confirmation/retour |

Les tests ne se limitent pas à la compilation. Le navigateur prend un symbole avant relâchement, mesure son déplacement, observe les mutations DOM et compte les appels. Il vérifie les retours sur mouvement invalide, un relâchement unique avec réponse lente et l’absence de double première récompense via le service privé. Les dimensions incluent 320, 390 et 1024 px ; le tactile, la rotation et le mouvement réduit sont simulés.

Le contrôle de listeners utilise le protocole de débogage Chromium sur `#page` avant/après cinq remontages. Les tests unitaires des contrôleurs vérifient aussi trente/cinquante cycles complets de montage/démontage, frames, timers, captures et animations. Ces observations ne constituent pas une preuve d’absence de fuite mémoire dans toute l’application.

Après la dernière optimisation de révélation, les deux contrôles d’options/retour de galerie ont été rejoués avec succès. Trois révélations supplémentaires du client non réécrit, mesurées avant le clic, sont détaillées dans [booster-final-results.json](artifacts/booster-final-results.json) ; elles ne sont pas ajoutées artificiellement au compte des 48 scénarios fonctionnels.

## Contrats et protections

Les moteurs, les cent niveaux, les fragments économiques/backend, les illustrations, le catalogue, le Casino et la récupération des ouvertures restent identiques à V15.5.1. Un test compare ces fichiers octet pour octet. Les suites historiques de confidentialité des Secrètes, collections, marché, comptes et mise à jour PWA continuent à passer.

Les nouveaux contrôles couvrent notamment :

- Mouvement local avant relâchement : aucune API, aucun `innerHTML`, lectures de géométrie uniquement au début ; deux cases transformées au maximum.
- Annulation par `pointercancel`, perte de capture/focus, masquage, redimensionnement/rotation, sortie du plateau, multitouch ou changement d’état/compte.
- Nouveau tap volontaire immédiatement après un drag, sans confondre ce tap avec le clic synthétique précédent.
- Commande réseau en attente : pas de seconde commande ; le parcours reste affiché si le joueur l’a choisi avant la réponse.
- Sceau détruit : le symbole reste présent dans la couche visuelle de chute ; clavier et rotation peuvent interrompre une cascade.
- Progression d’entraînement conservée séparément lors d’une vérification manuelle de campagne en ligne, sans envoi de victoire locale.
- Classement GET dédié, schéma public strict, champs privés refusés, détails cohérents, cache séparé par session et aucune réponse tardive sur une autre page. Une réponse incompatible contenant un portefeuille ne peut pas modifier le solde depuis ces lectures sociales.
- Emballages sans accès au contenu préparé ; face de carte absente du DOM avant révélation ; textes non inversés après retournement.

Les lectures sociales privées sont également testées sur 1 001 joueurs fictifs : pagination keyset, classement stable, plafonds, contrôles des comptes, cache et coalescence. Une lecture ne modifie aucune sauvegarde ni aucun solde. Les anciens tests Match continuent à vérifier les cent niveaux, attributions uniques, concurrence, rollback et refus des gains déclarés par le navigateur, sur leur adaptateur mémoire.

## Reproduire

Node 24, depuis la racine du dépôt :

```sh
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs tests/v14/*.test.mjs tests/v15/*.test.mjs tests/v15-1/*.test.mjs tests/catalogue/*.test.mjs tests/v15-3/*.test.mjs tests/v15-4/*.test.mjs tests/v15-5/*.test.mjs tests/v15-6/*.test.mjs
```

Pour le navigateur : installer `playwright-core` hors du dépôt, disposer de Chromium (`/usr/bin/chromium`) et de `ffmpeg`. Le harnais ouvre un serveur HTTP local et intercepte les destinations externes. L’environnement cloud exige une autorisation d’exécution pour les sous-processus et sockets ; la première exécution Node restreinte avait échoué sur trois `spawnSync EPERM`, puis la suite a passé avec les permissions d’exécution adaptées.

```sh
NODE_PATH=/tmp/mashup-ui-validation/node_modules MASHUP_MATCH_FIXTURE_MODULE=/workspace/mashup-backend-private/fixture-service.mjs node tests/v15-6/browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-6/regression.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-6/interruptions.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-6/casino.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-6/gallery-options.cjs
node --test --test-isolation=none /workspace/mashup-backend-private/tests/match-service.test.mjs /workspace/mashup-backend-private/tests/match-social-service.test.mjs
```

La suite intégrée V15.6 exige le module privé et échoue explicitement s’il manque. Ne pas publier ce module dans GitHub pour rendre le test public autonome. Les tests unitaires client fonctionnent sans lui.

## Limites réelles

Aucun Android/iPhone physique, Safari iOS, SQL réel, JWT/RLS, calendrier de production ou réseau Supabase réel testé. Le cache social et les octets mesurés ne prouvent pas une baisse d’egress de production. Les illustrations réelles et leur téléchargement ne sont pas reproduits par les fixtures.

Aucune restauration Supabase validée : elle n’a pas été réalisée. Aucun déploiement ou migration appliqué. Le service privé social fonctionne sur une lecture mémoire ; l’adaptateur indexé réel reste à écrire après récupération des sources déployées. Les conditions d’activation sont dans [publication.md](publication.md).

Les [mesures de performance](performance.md) distinguent les observations et les objectifs, ainsi que la régression initiale du booster et son suivi après correction.
