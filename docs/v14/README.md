# Mashup V14 — Le Sanctuaire

Version jouable du frontend existant, développée depuis `main` **b20fb58** (V13.0.1) sur **feature/mashup-v14-ultimate**, le 5 novembre 2026 (Europe/Paris). Aucun déploiement, aucune modification d'Edge Function et aucune opération sur les données de production.

## Voir le résultat

Les captures montrent réellement le jeu dans Chromium avec des comptes, soldes et résultats fictifs. La planche de cartes utilise des illustrations abstraites originales générées localement pour le laboratoire ; elle ne remplace aucune illustration du jeu.

- [Accueil mobile](artifacts/home-mobile.png) · [Accueil ordinateur](artifacts/home-desktop.png)
- [Les 24 combinaisons rareté/finition](artifacts/cards-24-finishes.png) · [Cartes sur mobile](artifacts/cards-mobile.png)
- [Inspection](artifacts/card-inspection.png) · [Collection](artifacts/collection-mobile.png)
- [Ouverture filmée — WebM](artifacts/booster-preview.webm)
- [Paquet scellé](artifacts/booster-01-sealed.png) → [Révélation](artifacts/booster-04-reveal.png) → [Résumé](artifacts/booster-05-summary.png)
- [Arène](artifacts/arena-mobile.png) · [Combat](artifacts/battle-mobile.png) · [Marché](artifacts/market-mobile.png) · [Échanges](artifacts/trades-mobile.png)
- [Profil](artifacts/profile-mobile.png) · [Memory](artifacts/memory-mobile.png) · [Atelier](artifacts/studio-mobile.png) · [Administration](artifacts/admin-mobile.png)

## Lots développés

| Lot | Réalisation | Vérification |
|---|---|---|
| 1. Système visuel et mobile | Palette encre/or/ivoire/cristal, typographies natives sans réseau, sceau original, accueil centré sur les cartes possédées, navigation dessinée et menu complet | 320/390/768/1440 px, menus joueur/admin, login, fermeture clavier, préférences persistées |
| 2. Moteur de cartes | Cadres SVG/CSS réellement intégrés, six matériaux, quatre variantes, Ultra Secrète distincte, textes et stats séparés des couches optiques | 31 tests cartes ; 24 combinaisons rendues ; images inchangées entre finitions ; confidentialité et cinq stats vérifiées |
| 3. Inspection/holographie | Reflet clipsé à l'illustration, lumière suivant rotation, geste souris gauche/droite ou doigt, flèches clavier, retour amorti, inclinaison limitée à 23°/14° | Souris/clavier, arrêt lors du masquage, réduction des animations sans rotation, qualité économique |
| 4. Boosters | Scène de paquet scellé, déchirure courte, présage avant flip selon rareté, cartes rangées dans l'ordre serveur, récapitulatif avant confirmation, mode rapide | Tests contrôleur ; parcours scellé→3 cartes→résumé→confirmation ; un prepare/un commit ; vidéo et captures |
| 5. Autres interfaces | Collection/decks, arène et résultats, marché/échanges/picker, profil, missions, succès, atelier/admin et journal harmonisés | Parcours métiers simulés et campagne de quatre manches ; aucun onglet supprimé |
| 6. Performances et finitions | Cache catalogue indexé, recherche normalisée/collateur réutilisé, append collection conservant les nœuds, observer limité aux sous-arbres ajoutés, transitions sans lecture de layout forcée, feedback de solde non bloquant | Tests dédiés, comparaison instrumentée avec main, erreurs console contrôlées |

Les styles restent en couches pour préserver les interfaces anciennes : le nouveau moteur remplace les anciens cadres/overlays, et le design system V14 unifie les écrans. Une consolidation future du CSS pourra réduire les règles héritées ; elle n'a pas été simulée comme achevée.

## Protection des données et contrats

- `backend/`, `content/`, `reset.html` et le studio `27-v11-3-image-studio.js` restent inchangés.
- Illustrations, fichiers d'art, identifiants, cinq statistiques, séries, numérotation, filtres et outils de cadrage restent pilotés par les données existantes.
- Le corps de `openPack` et celui de `finishOpening` sont identiques à main, vérifiés par test : mêmes prix, tentatives, openingId, résultats, prepare/cancel/commit. Aucun calcul de tirage ajouté.
- Le paquet scellé ne contient pas les résultats cachés. Le récapitulatif apparaît uniquement après toutes les révélations ; il rappelle que la confirmation finale reste nécessaire. Afficher le résumé n'attribue aucune carte.
- Les contrôles de confidentialité précèdent le rendu des noms/images/statistiques. Le drapeau existant `revealedOpponent` reste l'autorisation explicite des révélations serveur en combat/booster.
- Aucun compte créé, aucun vrai achat/tirage/transfert/email envoyé. Aucun secret ni export de joueur dans le dépôt.
- La restauration Supabase et les garanties transactionnelles du backend ne sont toujours pas certifiées : les sources complètes et un environnement de récupération isolé restent nécessaires, comme indiqué en phase 0.

## Résultats et reproduction

Voir [validation.md](validation.md), [preuves Node](unit-results.txt) et les JSON [navigateur](artifacts/browser-results.json), [parcours métiers](artifacts/journey-results.json), [comparaison performance](artifacts/performance-results.json).

```sh
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs tests/v14/*.test.mjs
npm install --prefix /tmp/mashup-ui-validation --no-audit --no-fund --ignore-scripts playwright-core@1.64.1
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v14/browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v14/journeys.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v14/performance.cjs
```

Node24, Chromium à `/usr/bin/chromium` (ou CHROMIUM_PATH), `tar` et l'historique Git des commits de référence sont requis. ffmpeg/VP9 est facultatif pour la vidéo. Les scripts ne contactent pas Supabase : ils interceptent toutes les requêtes extérieures, servent les fixtures en mémoire et bloquent les services workers. Ne pas confondre ce laboratoire avec une préproduction réelle : une copie du jeu ouverte sans interception conserve ses URL de backend existantes.

## Mesures et limites

Linux/Chromium headless, GPU désactivé, même viewport390×844, 36 cartes fictives, qualité spectaculaire, 120 intervalles rAF par scène. Aucune validation sur téléphone physique. Les rAF ne mesurent pas tout le pipeline GPU ni le ressenti tactile réel.

| Scène / mesure | main V13.0.1 | V14.0.1 |
|---|---:|---:|
| Accueil, nœuds DOM | 600 | 683 |
| Collection24 cartes, nœuds DOM | 1 405 | 1 647 |
| Collection, images HTML séparées dans cette fixture SVG | 8 | 0 |
| Collection, intervalle médian / p95 rAF | 16,7 / 16,8 ms | 16,7 / 16,7 ms |
| Collection, heap JS indicatif | 3 069 837 octets | 3 118 836 octets |
| Long tasks observées pendant chaque échantillon | 0 | 0 |

**Aucun gain de FPS démontré.** Les nouveaux cadres augmentent le DOM : environ +11/12 éléments par carte standard/FullArt/Gold et -4 pour une Secrète, selon les mesures du composant. Le coût reste explicite. Les cadres image séparés et les anciens overlays ont été retirés ; les images réelles des joueurs, lorsqu'elles existent, restent évidemment des images à charger. Le gain vérifié de pagination est structurel : les premières cartes ne sont plus recréées ni redécodées lors de l'ajout des suivantes. La pagination progressive ne constitue pas une virtualisation à DOM strictement borné.

Pas de flou, de filtre SVG, d'animation permanente ou de promotion GPU par carte dans le nouveau moteur. Les effets sont désactivés en économie, mouvement réduit ou hors écran. Les scènes exceptionnelles restent limitées à une carte/une ouverture. La mesure mémoire dépend du garbage collector et ne prouve pas l'absence de fuite sur de longues sessions.

## Reste à améliorer et validation avant publication

1. Tester Safari/iOS et Chrome/Android sur téléphones physiques : sessions prolongées, RAM faible, température, écran120Hz, veille/reprise, mode autonome et tactile.
2. Effectuer la vraie préproduction Supabase indépendante et la restauration complète de référence ; tester concurrence/idempotence serveur et reprise des opérations après fermeture brutale.
3. Mesurer sur catalogue et images de taille réelle ; envisager virtualisation stricte et miniatures serveur si les profils démontrent leur nécessité.
4. Consolider les anciennes couches CSS et extraire davantage du monolithe, sans mélanger cette opération aux règles économiques.
5. Ajouter des tests intégrés multi-joueurs en préproduction : PvP simultané, mises, achats concurrents, récompenses et éditions administrateur. Les parcours locaux actuels ne certifient pas le backend.
6. Capacitor, notifications natives/haptique et distribution signée restent de futurs lots. Cette V14 reste un jeu web ; aucune app native ou disponibilité hors ligne n'est revendiquée.

Retour arrière frontend : rétablir ensemble les fichiers et versions de b20fb58. Aucune migration DB à inverser. Ne pas restaurer un ancien snapshot de données par-dessus des transactions légitimes.

## Livraison GitHub

Branche envoyée : `feature/mashup-v14-ultimate`, commit de développement `3b172a0`. La commande de création de pull request a été exécutée, mais l'accès à `https://api.github.com/graphql` est refusé par le réseau (`Forbidden`). Aucune pull request créée, aucune fusion et aucun déploiement.

Le titre et la description sont prêts dans [PR.md](PR.md). [Ouvrir la création de PR](https://github.com/fpdorian-glitch/Mashup/pull/new/feature/mashup-v14-ultimate).

Le seul domaine `api.github.com` a été ajouté au brouillon des paramètres de l'environnement cloud, en conservant les domaines existants. Ce brouillon n'est pas appliqué : enregistrer puis publier la configuration de l'environnement dans ses paramètres est nécessaire avant de retenter l'accès automatique. Cette opération est distincte de la publication du jeu. Aucun jeton supplémentaire n'a été demandé ni copié ; les droits API restent à vérifier une fois le domaine accessible.

## V14.0.1 — Brillance et reflets verts

Les finitions optiques réagissent désormais à l'inclinaison : déplacement du point lumineux, orientation du faisceau, intensité selon l'angle et diffraction en sens inverse. Les couleurs dépendent du matériau ; les Secrètes utilisent une gamme émeraude/vert pâle, les Ultra Secrètes un chrome opalin vert. Il s'agit d'une approximation de reflet en CSS, sans rendu 3D lourd ni capteur.

Deux pseudo-éléments sont peints dans la fenêtre d'illustration existante : aucun nœud de carte ajouté, aucune animation autonome. Les noms et les cinq statistiques restent au-dessus des effets. Le mode économique, la réduction des animations et le masquage hors écran désactivent la finition. Les communes classiques conservent leur finition mate.

[Preuves détaillées de brillance](shine/README.md) · [Secrète inclinée](shine/secret-right.png) · [Ultra Secrète](shine/ultra-secret-right.png) · [Reflet en mouvement](shine/secret-motion.webm).

71 tests Node réussis. Le contrôle Chromium ciblé vérifie aussi les gestes souris, clavier et tactiles sur les deux Secrètes, les teintes vertes, la conservation des images/statistiques et les trois modes de protection. Aucune donnée de joueur ni opération de production impliquée.
