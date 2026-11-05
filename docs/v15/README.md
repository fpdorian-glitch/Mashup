# Mashup V15 — Living Cards & Immersion

Évolution du jeu existant depuis **main `18f8d14` — V14.0.2**, sur la branche **`feature/mashup-v15-immersion`**. Le jeu reste une application web mobile. Aucun déploiement sur main, aucune modification de données de joueurs ou de Supabase.

## Voir et essayer

Les captures et vidéos montrent le véritable frontend dans Chromium avec des comptes, crédits, tirages et réponses API **fictifs**. Les illustrations du jeu restent intactes. La planche des finitions utilise le moteur de cartes réel ; les données de démonstration ne sont jamais enregistrées dans le catalogue.

- [Comparaison V14/V15](artifacts/comparison.html), avec la même fenêtre et les mêmes données.
- [Accueil mobile](artifacts/home-mobile.png) · [Accueil ordinateur](artifacts/home-desktop.png).
- [24 finitions](artifacts/cards-24-finishes.png) · [Cartes sur mobile](artifacts/cards-mobile.png) · [Inspection](artifacts/card-inspection.png) · [Inspection filmée](artifacts/inspection-preview.webm) · [Dos](artifacts/card-back.png).
- [Ouverture filmée](artifacts/booster-preview.webm) : paquet scellé, révélation progressive, rangement et résumé. La confirmation est vérifiée ensuite par le test.
- [Album, feuillet avec manquantes](artifacts/album-leaf.png) · [Album complet](artifacts/album-mobile.png) · [Collection classique](artifacts/collection-mobile.png) · [Combat IA](artifacts/battle-mobile.png).

Pour inspecter une carte : collection → carte obtenue → carte dans sa fiche. Glisser le doigt ou utiliser les flèches ; **Voir le dos** retourne l’objet, le même bouton revient à la face. Dans la collection, **Mon album** conserve la grille classique accessible et les filtres combinables.

## Lots terminés

| Lot | Fonction réelle | Validation |
|---|---|---|
| Cartes vivantes | Quatre tranches, un dos neutre, biseau métallique, illustration/cadre/texte sur des plans distincts. Épaisseur et relief selon les six raretés et quatre variantes ; lumière liée au geste avec retour amorti. | 24 combinaisons, confidentialité, image et cinq statistiques conservées ; inspection tactile simulée, souris, clavier, dos, économie et mouvement réduit. |
| Boosters | Chronologie annulable indépendante des transactions. Révélation commune de 180 ms, Ultra de 800 ms, Ultra Secrète de 1 000 ms avec prélude. Le mode rapide accélère aussi une animation déjà commencée. | Horloge déterministe, accélérations à plusieurs instants, callbacks uniques, démontage de la modale ; préparation/confirmation vérifiées dans le navigateur avec API interceptée. |
| Arène | Entrée simultanée des cartes, statistique choisie surlignée, score animé seulement lors d’un changement réel, résultat présenté depuis l’état serveur. Vue PvP relative au joueur, y compris invité. | Campagne de quatre manches et snapshots PvP ; poll identique sans répétition ; navigation et mode éco sans verrou d’action. |
| Album | Feuillets de six emplacements sur mobile, douze sur grand écran, progression indépendante des filtres, pochettes neutres pour les manquantes, trophée de série complète et pièces d’exception. | Pagination bornée, filtres/recherche/retour classique ; une Secrète non obtenue ne crée ni emplacement, ni comptage, ni contenu, même pour un administrateur. |
| Fiabilité | Numéro de session invalidant les anciennes réponses, même après reconnexion au même compte. Nettoyage des animations, préférences, polls PvP et invitations à la déconnexion. | Anciennes réponses différées après navigation/reconnexion ; panne avant préparation et échec de confirmation avec nouvelle tentative sur le même openingId. |
| Performance | Géométrie détaillée réservée à l’inspection. Album borné à un feuillet ; animations d’arène courtes sans boucle. Chemins allégés pour faible puissance, économie et mouvement réduit. | Comparaison séquentielle V14/V15, trois répétitions par version ; chiffres et limites dans [validation.md](validation.md). |

Le rendu physique utilise des plans CSS 3D et un éclairage calculé à partir de l’inclinaison. Les reflets sont une approximation artistique des matériaux, sans ray tracing ni accès au capteur du téléphone. Le moteur de face V14 et ses illustrations sont réutilisés. Les finitions sont statiques dans les grilles ; aucun animateur permanent n’est créé par carte.

## Architecture et frontières

- **`06-v10-cards.js` et `37/42`** : face et signatures des raretés existantes, conservées.
- **`45/46`** : enveloppe physique d’inspection, matière et lumière ; aucune requête réseau.
- **`12`, `38`, `47`, `49`** : présentation du booster, paquet scellé et horloge annulable. L’horloge ne sélectionne aucune carte.
- **`50/51`** : présentation IA/PvP à partir d’un snapshot. Aucune règle, aucun score ou gagnant calculé par ce contrôleur.
- **`43/44`** : album en lecture seule, indépendant de la persistance et du réseau.
- **`52`** : contrôles de disposition et finitions communes V15.
- **`index.html`** : intégration aux actions existantes, garde de session et nettoyage des ressources.

L’album n’écrit qu’une préférence locale de disposition. Les decks et favoris utilisent les routes de sauvegarde existantes. Les nouveaux modules de présentation n’écrivent ni inventaire, ni récompense, ni catalogue.

Les styles historiques restent en place : cette livraison n’annonce pas une extraction complète du monolithe ni une consolidation complète des anciennes cascades CSS.

## Protection et limites

`backend/`, `content/`, `reset.html`, le studio `27-v11-3-image-studio.js`, le moteur `06-v10-cards.js`, les probabilités et les règles de combat sont préservés. Les contrats prepare/cancel/commit et les payloads transactionnels restent les mêmes. La révélation respecte l’ordre fourni par le serveur ; confirmer reste nécessaire pour attribuer les cartes.

Toutes les requêtes extérieures sont interceptées dans les essais. Aucune connexion à un vrai compte, aucun achat, tirage, transfert, export de joueurs ou envoi de message réel n’a été effectué. Aucun secret ajouté au dépôt.

**Les tests locaux ne certifient pas le backend.** L’idempotence observée en test est celle du serveur fictif : la vraie concurrence, la reprise d’un commit après fermeture brutale, les autorisations et la restauration Supabase nécessitent une préproduction indépendante et les accès décrits en [phase 0](../phase-0/README.md). Aucune restauration réelle n’est déclarée validée.

Aucun téléphone physique, Safari iOS ou WebView natif n’a été testé ici. Les résultats de Chromium Linux ne garantissent pas le coût GPU, la température, l’autonomie ou la qualité tactile sur Android/iPhone.

## Reproduire les vérifications

Voir [validation.md](validation.md), [résultat Node](unit-results.txt) et les preuves JSON : [navigateur](artifacts/browser-results.json), [interruptions et sessions](artifacts/reliability-results.json), [performances](artifacts/performance-results.json).

```sh
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs tests/v14/*.test.mjs tests/v15/*.test.mjs
npm install --prefix /tmp/mashup-ui-validation --no-audit --no-fund --ignore-scripts playwright-core@1.64.1
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15/browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15/reliability.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15/performance.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15/browser.cjs --demos-only
```

Le workflow `Frontend regression tests` exécute également la suite Node sur la branche V15 et les pull requests, avec des permissions de lecture uniquement. Il ne publie pas le jeu ; son résultat distant doit être consulté dans GitHub. Les essais navigateur et les mesures ci-dessus ont été exécutés localement dans l’environnement cloud.

Prérequis : Node 24, Chromium (`/usr/bin/chromium` ou `CHROMIUM_PATH`), historique Git contenant `18f8d14`, `tar` ; ffmpeg pour les vidéos. Exécuter les performances seules, sans autre navigateur ni enregistrement vidéo. Le laboratoire sert les fichiers sur localhost et bloque les service workers. **Ouvrir simplement une copie du jeu sans cette interception conserve les adresses du backend de production** ; cela ne crée pas une préproduction isolée.

## Validation avant fusion et retour arrière

1. Approuver les rendus, la cadence de chaque rareté, l’album et la présentation des résultats à partir des captures et d’une revue locale.
2. Vérifier Safari/iOS et Chrome/Android sur appareils physiques : glissement et pointercancel, veille/reprise, rotation, carte recto/verso, économie, sessions longues et petite mémoire.
3. Sur Supabase de préproduction exclusivement : tester les deux côtés d’un PvP réel, Double/Parimatch, achats simultanés, decks, favoris, marché, échanges, mini-jeux et reprise d’un booster après perte de réponse.
4. Faire relire le diff des routes et des fichiers protégés ; aucun script de migration DB n’est requis par V15.
5. Fusionner uniquement après validation explicite. Le workflow GitHub Pages publie main selon la configuration existante : ne pas y pousser la branche de travail.

Retour arrière : avant fusion, fermer la PR suffit. Après une éventuelle publication autorisée, rétablir **ensemble** les fichiers frontend et versions de `18f8d14`, ou annuler les commits V15. Il n’y a aucune migration de données à inverser. Ne pas restaurer un ancien inventaire par-dessus de nouvelles transactions légitimes. Les préférences locales V15 sont sans effet dans V14.

Titre, description et commande de PR dans [PR.md](PR.md). La création distante dépend de l’accès API GitHub ; son état effectif doit être vérifié avant de considérer une PR comme créée.


## Livraison GitHub effective

Branche **envoyée sur origin** : `feature/mashup-v15-immersion`. Commit des fonctionnalités : `0e6f0e7` ; preuves de validation : `0d72595`. `main` reste sur `18f8d14` ; aucune fusion et aucun déploiement.

La création de PR a réellement été tentée avec `gh pr create`. Elle a échoué sur `https://api.github.com/graphql` : **Forbidden**. **Aucune PR distante n’a été créée.** La politique réseau actuelle n’autorise pas `api.github.com` ; une fois ce domaine accessible, les droits API devront également être vérifiés. Aucun nouveau jeton n’a été demandé ou copié.

[Ouvrir la création de PR](https://github.com/fpdorian-glitch/Mashup/compare/main...feature/mashup-v15-immersion?expand=1) · [Titre et description préparés](PR.md). La suite CI est configurée, mais son statut distant n’a pas pu être interrogé par cette API. Les résultats locaux restent consultables et reproductibles dans ce dossier.
