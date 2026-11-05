# Catalogue automatique — proposition V15.2

Branche `feature/mashup-auto-series-catalog`, issue de `main` au commit `e8461cb`. Les changements sont préparés pour revue : aucune publication, opération Supabase ou modification de joueur réel.

## Résultat vérifiable dans le dépôt

| Convergence, fichier source | Avant | Après préparation |
|---|---:|---:|
| Normales actives | 100 | 90 |
| Secrètes actives | 0 | 0 |
| Archives | 0 | 10 |
| Power Rangers actives | 10 | 0 |
| Identifiants conservés | 100 | 100 |

Il s’agit du compte des enregistrements de `content/convergence-series2.json`. Les anciennes métadonnées annonçaient 102 ; elles ne représentaient pas le contenu du fichier. **Le nombre réel dans Supabase est inconnu** : le catalogue serveur peut contenir des créations absentes du dépôt. Le jeu charge `/api/bootstrap`, pas ce fichier JSON. Il faudra donc une opération Supabase distincte pour archiver les cartes réelles.

La [liste exacte et les impacts](inventory.md), les empreintes et le [manifeste réversible](power-rangers-manifest.json) permettent de revoir les dix cartes avant toute intervention. Les illustrations et briefs sont conservés.

## Une seule définition des nombres et numéros

`58-catalogue.js` fournit le calcul utilisé par le client. `backend/catalogue-core.js` en est une copie générée, vérifiée par les tests, pour les fragments serveur disponibles.

1. Dédupliquer par identifiant ; une occurrence retirée empêche un doublon actif de ressusciter une carte.
2. Exclure les archives, retraits et cartes explicitement inactives.
3. Sélectionner la série réelle, puis exclure les Secrètes du total normal.
4. Compter les identifiants normaux distincts possédés, indépendamment du nombre de copies. Le pourcentage est arrondi à l’entier inférieur ; une série vide reste à 0/0 et ne débloque aucun palier.
5. Produire des numéros affichés compacts de 1 à N dans l’ordre des anciens `editionNumber`, avec un ordre stable en cas d’égalité. Les identifiants et numéros historiques stockés restent inchangés. Une Secrète conserve son numéro spécial, par exemple `N°131 · HORS SÉRIE · S02`.

Le moteur ne consulte jamais `targetCount` ou `editionTotal`. Les modifications administrateur remplacent le snapshot client et invalident l’index, les numéros, la fenêtre de collection et la fraîcheur des récompenses. Le changement de compte efface le snapshot précédent.

Les totaux sont intégrés à l’accueil, la collection, l’album, la sélection des séries, l’administration, l’atelier et les informations de contenu des boosters. Les fragments de récompenses, succès et classements utilisent le même calcul ; les montants, bons, paliers et clés de réclamation restent inchangés. Les droits de réclamer une récompense restent décidés par le serveur.

Pour une réponse serveur partielle, `catalogueMeta` peut transmettre les totaux et numéros **des seules cartes normales**. Cette projection doit être calculée depuis le catalogue serveur complet et jointe au même snapshot. Elle ne contient ni identifiant, contenu ou nombre de Secrètes, ni information de joueur. Sans cette projection, le calcul porte sur les cartes effectivement reçues ; un client ne peut pas deviner des normales absentes de la réponse.

Sans filtre, l’album peut compléter ses emplacements normaux depuis cette projection validée. Une carte possédée dont le contenu n’a pas été transmis reste une pochette neutre « Visuel indisponible », avec sa quantité ; aucun contenu privé n’est inventé. Les recherches et filtres conservent leur sélection et ne déclenchent pas ce remplissage.

La gestion des séries n’offre plus de nombre manuel. Le champ historique `targetCount` est encore envoyé avec le total calculé pour compatibilité avec le routeur existant ; il n’est jamais utilisé comme source de vérité. Le validateur privé doit accepter zéro pour une série vide.

## Protection et limites d’intégration

Les collections, portefeuilles et références des decks ne sont pas réécrits lors du calcul ou de l’archivage simulé. Un deck contenant une référence devenue inactive l’affiche et permet son retrait volontaire ; le client bloque un nouveau combat tant qu’il n’est pas corrigé. Les historiques restent conservés.

Les sources complètes de `mashup-api-gh`, les tirages/confirmations, le schéma et les transactions SQL ne sont pas disponibles. Les fragments préparés ne sont donc **pas présentés comme intégrés au backend déployé**. Voir le [contrat d’intégration serveur](backend-integration.md) pour l’ordre de chargement, la projection des réponses et les hooks manquants.

Avant l’archivage réel, il reste à :

- obtenir un catalogue administrateur complet et refaire l’identification exacte des Power Rangers ;
- auditer les copies possédées, decks, séquestres du marché, échanges et opérations en cours sans publier les données privées ;
- vérifier en préproduction les exclusions dans les tirages, acquisitions et combats, ainsi que les remboursements/annulations éventuellement nécessaires ;
- tester réellement sauvegarde et restauration dans un environnement isolé ;
- présenter la liste et les conséquences actualisées à l’utilisateur, puis obtenir sa validation spécifique avant toute écriture ou tout déploiement Supabase.

L’outil hors ligne reste non exécutable en production. Un test de restauration de copie JSON ne vaut pas validation d’une restauration Supabase.

Les [preuves et commandes de validation](validation.md) accompagnent la proposition.
