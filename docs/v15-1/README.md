# Mashup V15.1 — Arena Reborn & échanges visuels

Commit des fonctionnalités : **e6c6f95**.

Travail basé sur la version publiée **main `19375ce` — V15**, dans **`feature/mashup-v15-1-arena-reborn`**. La V15 et ses illustrations sont conservées. Aucun déploiement sur main, aucune opération sur des données réelles et aucune Edge Function modifiée.

## Voir les fonctionnalités

- [Combat réellement enregistré dans Chromium](artifacts/combat-preview.webm) : quatre manches IA, comparaison, impact et victoire, avec résultats fictifs.
- [Échanges entre les deux collections](artifacts/trades-preview.webm) · [Deux collections sur ordinateur](artifacts/trades-desktop-collections.png).
- [Règle ↑ sur 320×568](artifacts/arena-simple-320-higher.png) · [Règle ↓](artifacts/arena-simple-lower.png).
- [Double sur téléphone](artifacts/arena-double-390-higher.png) · [PvP Double côté invité](artifacts/pvp-double-guest.png).
- [Victoire](artifacts/outcome-player.png) · [Défaite](artifacts/outcome-enemy.png) · [Égalité](artifacts/outcome-draw.png).
- [Comparaison V15 / V15.1](artifacts/comparison.html).

Ces images montrent le véritable jeu web avec des comptes et réponses serveur fictifs. Les cartes dans les captures utilisent les illustrations existantes du dépôt. Aucune illustration n’a été remplacée. Les vidéos assemblent les images du screencast réel avec leurs horodatages ; elles ne représentent pas un téléphone physique.

## Arène

La même scène reçoit les snapshots IA et PvP : deux camps, socles, horizon en perspective, cartes en relief avec les tranches V15 et lumière ponctuelle. Les informations imprimées restent celles des cartes existantes. Le score serveur s’affiche dès réception ; l’animation l’accompagne sans retarder sa disponibilité.

Une chronologie explicite enchaîne **révélation → comparaison → impact → résultat**. Le gagnant reçoit un mouvement d’avancée, le perdant un recul ; la victoire, la défaite et l’égalité ont leurs propres présentations. La mise en scène reste cosmétique. Le contrôleur ne calcule ni gagnant, ni récompense, ni tirage, et ne lance aucune requête.

**Passer** termine immédiatement les effets. Une nouvelle manche, un départ de page, une déconnexion ou le masquage du document annule les animations et minuteurs précédents. Un snapshot identique ne rejoue pas la confrontation, même si le serveur actualise son horodatage ou si le DOM a été reconstruit.

Les modes **Spectaculaire**, **Équilibré** et **Fluidité** se choisissent dans l’arène. Le réglage global d’économie et la préférence système de réduction des animations restent prioritaires. Fluidité supprime les séquences et aplatit la matière ; une modification du réglage global pendant une séquence annule aussi les effets en cours. Les préférences restent locales au navigateur.

## La règle au bon endroit

Le bandeau **↑ PLUS GRAND GAGNE** ou **↓ PLUS FAIBLE GAGNE** est dans le même dock que les cinq statistiques. Sur mobile, ce dock reste au-dessus de la navigation et de la safe area, indépendamment du défilement de la scène. Les deux règles ont des couleurs et des flèches distinctes. Une direction absente produit « Règle en attente », jamais une direction déduite des valeurs.

Les tests vérifient les rectangles réels et le résultat d’`elementFromPoint` sur les contrôles, à **320×568**, **360×640** et **390×844**, pendant toutes les phases de choix des campagnes simples et doubles. La règle est aussi vérifiée en PvP. Dans un Double mobile, chaque équipe a une rangée de deux cartes ; une zone défilable conserve des cartes suffisamment grandes. Sur les petits écrans, parcourir les équipes peut demander un glissement ; la règle et les choix ne quittent pas leur dock.

Les cartes adverses sont remplacées par des dos génériques jusqu’à la phase autorisée. Le rendu du PvP conserve le point de vue du joueur, y compris lorsque celui-ci est invité. Le compteur utilise uniquement une échéance reçue du serveur ; aucun compteur de 75 secondes n’est inventé si cette échéance manque. Un problème réseau décrit une synchronisation interrompue sans prétendre connaître l’état de connexion de l’adversaire. Le contrat consulté ne fournit pas de présence fiable de l’autre joueur : un statut « adversaire déconnecté » ne peut donc pas être ajouté honnêtement sans information serveur supplémentaire.

## Échanges depuis vos collections

La composition utilise deux vraies grilles de cartes, avec le moteur du catalogue actuel : **Je propose / Ma collection** et **Je demande / Collection du joueur**. Les deux sont côte à côte sur ordinateur ; sur téléphone, deux onglets permettent de passer de l’une à l’autre en conservant le brouillon.

- Toucher une carte l’ajoute ou la retire ; sa sélection reste visible.
- Recherche par nom/univers, filtre de rareté et de série, tri par rareté, nom ou quantité, pages de douze cartes.
- Quantités modifiables dans les exemplaires disponibles, jusqu’à vingt ; trois identités de chaque côté, comme dans le formulaire client précédent.
- Sélections conservées pendant les recherches, changements de filtre, pages et onglets.
- Crédits proposés/demandés et récapitulatif des deux côtés avant l’envoi.
- Contre-offre préremplie en inversant cartes, quantités et crédits ; accepter, refuser et annuler restent disponibles.

La collection de l’autre joueur vient exclusivement de l’endpoint partenaire existant. Le catalogue local fournit l’illustration et les statistiques **uniquement pour les identités déjà autorisées par cette réponse**. Une carte absente du catalogue local reçoit une présentation explicite sans statistiques fabriquées. Les réponses de partenaires arrivant dans le désordre, d’une ancienne page ou d’une ancienne session sont ignorées. Les Secrètes exclues par le serveur ne créent aucun emplacement.

Le brouillon ne réserve et ne transfère aucune carte. Les mêmes routes et payloads sont envoyés ; la validation finale des inventaires et crédits appartient toujours au serveur. Aucun envoi économique n’est réessayé automatiquement après une erreur.

## Organisation du code et protection

| Fichiers | Rôle |
|---|---|
| `53-v15-1-arena.js` | Chronologie de présentation annulable, qualités, empreinte du snapshot et transitions. |
| `54-v15-1-arena.css` | Scène, matériaux V15, dock de règle, disposition simple/Double et chemins allégés. |
| `57-v15-1-battle-view.js` | Vue commune IA/PvP, confidentialité des faces, valeurs et résultats autorisés. |
| `20-market-v10-9.js` | Interface des échanges, requêtes existantes et protection du cycle de vie. |
| `55-v15-1-trades.css`, `56-v15-1-trade-selection.js` | Grilles des collections et brouillon local borné, sans effet serveur. |
| `index.html` | Adaptation des snapshots existants, événements, nettoyage et affichage du compte. |

`backend/`, `content/`, le rendu des faces `06-v10-cards.js`, le studio `27-v11-3-image-studio.js` et la récupération de compte restent inchangés. Les fonctions de calcul des statistiques et de décision IA sont comparées à la référence publiée ; les routes client restent identiques. La référence historique de phase 0 est conservée, avec le module d’interface des échanges ajouté aux fichiers dont la version historique est vérifiée.

## Tests, performances et limites

Voir [validation.md](validation.md), [preuve Node](unit-results.txt), [scénarios navigateur](artifacts/browser-results.json), [contrôles et démonstrations complémentaires](artifacts/demos-results.json) et [mesures brutes](artifacts/performance-results.json).

Tous les appels extérieurs du laboratoire sont interceptés, y compris l’authentification ; aucun compte réel, achat, transfert ou export de joueur n’a été utilisé. Une copie du jeu ouverte sans ce laboratoire conserve les adresses de production : elle ne constitue pas une préproduction isolée.

Aucun téléphone physique, Safari iOS, WebView natif, chauffe ou autonomie n’a été testé. Les rAF de Chromium Linux ne mesurent pas tout le pipeline GPU. Les tests simulés ne certifient pas les transactions concurrentes ou la reprise après perte d’une réponse dans le vrai backend.

## Revue et retour arrière

Avant une publication : approuver les rendus, tester Safari/iPhone et Chrome/Android physiques, puis exécuter les parcours à deux clients sur Supabase de préproduction indépendant, notamment Double, Parimatch et acceptations concurrentes d’échanges. La revue doit confirmer que les récompenses et inventaires réels restent sous autorité serveur.

Aucune migration DB n’est nécessaire. Avant fusion, abandonner la branche ne change rien à la production. Après une éventuelle publication approuvée, annuler les commits frontend V15.1 ou rétablir ensemble les fichiers et versions de `19375ce` ; ne pas restaurer un ancien inventaire par-dessus de nouvelles transactions légitimes.

Titre, description et état réel de la livraison GitHub : [PR.md](PR.md). Aucune fusion sur main n’est autorisée par cette livraison.


## Livraison GitHub effective

Branche envoyée sur origin : **feature/mashup-v15-1-arena-reborn**. Fonctionnalités : `e6c6f95` ; preuves et démonstrations : `f3c3719`. Main reste sur `19375ce`.

La commande de création de pull request a été exécutée ; l’accès à `https://api.github.com/graphql` a répondu **Forbidden**. **Aucune PR distante n’a été créée.** La configuration réseau actuelle n’autorise pas `api.github.com` ; les droits API devront aussi être vérifiés une fois ce domaine accessible. Aucun secret supplémentaire demandé ou copié. Le statut CI distant n’a pas pu être consulté par cette API ; les validations locales sont celles documentées ci-dessus.

[Ouvrir la création de PR](https://github.com/fpdorian-glitch/Mashup/compare/main...feature/mashup-v15-1-arena-reborn?expand=1) · [Description prête](PR.md). Aucune fusion, aucun déploiement.
