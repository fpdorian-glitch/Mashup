# Intégration serveur du catalogue automatique

Ces fichiers préparent une correction dans les **fragments disponibles**. Ils ne constituent pas les sources complètes ou une preuve de déploiement des Edge Functions. Aucune opération Supabase ni écriture sur des comptes réels n’a été effectuée.

## Modules et ordre de chargement

Charger `backend/catalogue-core.js` avant :

- `backend/catalogue-integration.js` ;
- la version de `collection-rewards` effectivement utilisée par le routeur privé ;
- `achievements-v11.js` et `leaderboards-v11.js`.

Les fragments des récompenses V10.8 et V10.9 définissent historiquement les mêmes noms de fonctions : intégrer **la version correspondant au serveur réel**, pas deux implémentations actives simultanément. Les tests isolent chaque version en VM. Le cœur backend est généré depuis le même moteur que le client ; son fonctionnement est déterministe et sans réseau.

API du cœur utilisée ici :

```js
catalogueActiveCards(cards);
catalogueNormalCards(cards, seriesNumber); // série omise : toutes les normales
catalogueOwnedCopies(owned, cardId);
catalogueSeriesMetrics(cards, seriesNumber, owned);
cataloguePublicMetadata(cards, series);
```

Le calcul utilise uniquement les cartes actives uniques du catalogue complet. Les Secrètes ne contribuent jamais aux totaux normaux. Les champs historiques `targetCount`, `editionTotal` et les anciens nombres fixes n’interviennent plus dans les récompenses, succès ou classements.

## Projection des réponses

```js
const metadata = catalogueBootstrapProjection(db);
// {series, seriesTotals, catalogueMeta}
```

`catalogueMeta` reprend exactement la projection publique du cœur : version, révision et totaux/numéros des cartes normales. Ni les objets joueurs ni les Secrètes inconnues ne sont ajoutés. `seriesTotals` est un alias compatible pour les interfaces historiques. Les séries publiques conservent seulement leur numéro, nom, description, couleur et emblème. Les nombres manuels ne sont pas réémis.

L’adaptateur **ne sérialise pas `cards`** : la sélection des informations révélables selon le compte appartient au routeur privé absent. Il doit calculer les métadonnées à partir du **catalogue complet**, puis utiliser son sérialiseur actuel pour les cartes autorisées au joueur. Un catalogue déjà filtré selon la possession ne peut pas produire un dénominateur fiable. Le champ client `hidden` ne prouve pas que le catalogue reçu est complet.

Si l’ancien validateur de séries exige encore un `targetCount`, une option transitoire existe :

```js
catalogueBootstrapProjection(db, {legacyTargetCount: true});
```

Elle ajoute un `targetCount` **dérivé dans la réponse**, sans lire un ancien réglage ni modifier `db.series`. Le cas vide reste zéro. Si le validateur privé refuse zéro, il doit être corrigé : le remplacer par un pour satisfaire l’ancien validateur réintroduirait un faux total. La suppression du champ dans l’écran d’administration ne corrige pas, à elle seule, le validateur ou la persistance du serveur.

## Hooks privés à intégrer

Le routeur doit joindre un snapshot cohérent de `cards`, `series`, `seriesTotals` et `catalogueMeta` après bootstrap, création/édition/import, archivage/restauration et confirmation de booster si celle-ci renvoie le catalogue. Les données et leur révision doivent venir de **la même lecture transactionnelle**. Invalider les caches serveur après modification du catalogue ; ne pas laisser d’anciens `seriesTotals` survivre à de nouvelles cartes.

Les routes concernées existent déjà dans le client. Ce document n’invente ni endpoint ni schéma SQL supplémentaire. Les sources privées sont nécessaires pour vérifier la transaction, les permissions administrateur, la sérialisation, les appels réellement intégrés et la configuration des caches.

## Récompenses et historique

Les montants, paliers 25/50/75/100, bons et clés de réclamation restent inchangés. Les séries vides ont total et progression zéro, sans palier accessible. Un retrait peut légitimement rendre un palier atteignable selon le catalogue corrigé ; il n’efface jamais `collectionRewardsV108` ou `achievementsV11`, et ne permet pas une seconde réclamation d’un palier déjà obtenu.

Les fonctions de lecture ne modifient ni `state.owned`, ni decks, ni portefeuilles, ni annonces ou échanges. Elles ignorent les quantités multiples pour la complétion, qui porte sur les cartes distinctes.

## Archivage Power Rangers : opération séparée, soumise à validation

Le seul changement d’un drapeau dans un fichier de catalogue n’archive pas les cartes de la base réelle. La liste des identifiants et l’état de production doivent d’abord être comparés à la proposition, sur une sauvegarde vérifiable ou une préproduction indépendante.

- Garder les enregistrements, illustrations, identifiants, quantités possédées et historiques ; rendre les cartes inéligibles aux nouvelles acquisitions.
- Les ventes publiques archivées sont masquées par le fragment marché, mais leurs annonces peuvent conserver un séquestre actif : préparer une annulation/restitution exactement une fois, sans perdre l’exemplaire réservé.
- Les échanges en attente contenant une carte archivée échouent à l’acceptation. Préparer leur clôture explicite avec un statut existant et conserver les listes historiques ; aucun transfert ni remboursement de crédits n’est nécessaire si rien n’a encore été prélevé.
- Préserver les références des decks existants ; exclure les cartes archivées des nouvelles sélections et faire contrôler leur éligibilité au démarrage d’un combat par le serveur.
- Vérifier séparément les ouvertures déjà préparées, confirmations en attente, combats actifs et sessions de mini-jeux. Leurs sources sont absentes : leur traitement lors de l’archivage ne peut pas être certifié ici.

Les modifications préparées des fragments ne remplacent pas ces hooks. L’opération réelle, toute éventuelle modification d’inventaire/séquestre et le déploiement des fonctions nécessitent l’accord explicite de l’utilisateur après présentation de la liste et des conséquences.

## Vérification

La suite `tests/catalogue/backend.test.mjs` utilise exclusivement des objets fictifs et des VM locales. Elle charge le cœur puis chaque fragment. Les tests vérifient les changements de catalogue, les séries vides, les doublons, les Secrètes, les références historiques et l’absence de réattribution. Ils ne prouvent ni l’isolation SQL, ni les autorisations réelles, ni la concurrence, ni une restauration Supabase.
