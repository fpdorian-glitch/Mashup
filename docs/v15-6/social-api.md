# Contrat de lecture sociale Match — V15.6

Le client utilise une lecture serveur dédiée. Le service préparé et ses tests restent dans `/workspace/mashup-backend-private`, hors du dépôt public. **Les sources des Edge Functions déployées n’ont pas pu être récupérées ; aucune route ni migration Supabase n’a été déployée.** Les exemples ci-dessous décrivent le contrat développé, pas un service de production observé.

## Transport

L’acteur vient exclusivement du routeur JWT existant. Ne jamais accepter d’identité, rôle, score, niveau ou étoiles dans le JSON client. Les trois lectures utilisent `GET`, sans corps, via `mashup-games?route=match%2F…` :

| Route Match | Lecture |
|---|---|
| `leaderboard` | Première page, 25 joueurs maximum |
| `leaderboard/<cursor>` | Page suivante, curseur opaque base64url borné à256caractères |
| `players/<id>` | Agrégats publics des dix mondes d’un joueur |

Le client transmet le nom de route à son transport existant, qui encode le paramètre entier. Aucun paramètre de pagination ou objet de progression n’est ajouté au corps.

## Liste publique

```json
{
  "available": true,
  "protocol": 1,
  "generatedAt": 1793966400000,
  "cacheTtlMs": 60000,
  "players": [{
    "id": "fiction-player", "pseudo": "Alex", "rank": 1,
    "highestLevel": 21, "currentWorld": 3,
    "totalStars": 54, "completedLevels": 20
  }],
  "nextCursor": null,
  "total": 1
}
```

Ordre : niveaux terminés décroissants, étoiles décroissantes, identifiant public croissant. Le rang est calculé côté serveur ; le curseur ne contient aucun rang accepté du client. La pagination keyset évite un offset arbitraire. Si une progression change entre deux pages, son rang peut se déplacer ; le client déduplique les identifiants et propose une actualisation explicite.

`highestLevel = min(100, completedLevels + 1)` et `currentWorld = ceil(highestLevel / 10)`. Cent niveaux terminés se distinguent donc de 99par `completedLevels`, même si le niveau affiché reste100. Les étoiles sont comprises entre une et trois par niveau terminé, pour un total maximal300.

## Détail public

```json
{
  "available": true, "protocol": 1,
  "generatedAt": 1793966400000, "cacheTtlMs": 60000,
  "player": {
    "id": "fiction-player", "pseudo": "Alex",
    "highestLevel": 2, "currentWorld": 1,
    "totalStars": 3, "completedLevels": 1,
    "worlds": [
      {"id":1,"completed":1,"stars":3},
      {"id":2,"completed":0,"stars":0},
      {"id":3,"completed":0,"stars":0},
      {"id":4,"completed":0,"stars":0},
      {"id":5,"completed":0,"stars":0},
      {"id":6,"completed":0,"stars":0},
      {"id":7,"completed":0,"stars":0},
      {"id":8,"completed":0,"stars":0},
      {"id":9,"completed":0,"stars":0},
      {"id":10,"completed":0,"stars":0}
    ]
  }
}
```

Le détail ne contient pas de rang. Les dix mondes sont ordonnés de 1 à 10 ; leurs sommes concordent avec les totaux. Un monde comporte au maximum dix réussites et trente étoiles.

## Confidentialité et origine

- La projection lit seulement la progression autoritaire persistée et les pseudos publics. Elle ignore `unlocked` non corroboré, données d’entraînement, sauvegardes locales et statistiques déclarées par le navigateur.
- Un niveau manquant ou une étoile invalide ne permet pas d’inventer une progression après un trou dans la campagne.
- Aucun email, portefeuille, inventaire, deck, attribution, sauvegarde détaillée, session, seed, image ou secret n’est retourné. Un pseudo absent ne reprend jamais l’email comme valeur de secours.
- Les comptes bloqués/désactivés et les joueurs explicitement masqués sont exclus. Le compte demandeur est revérifié à chaque lecture, y compris avec un index caché.
- Une lecture ne crée pas de progression et n’écrit aucun crédit, reçu ou journal financier. Les tests comparent l’intégralité de l’état avant/après.

## Cache et coût

Pages limitées à25 côté serveur. Cache client par compte/session de 60 secondes, détail borné, actualisation explicite et aucun polling par geste ou par coup. Le service privé limite à trente lectures par minute et par acteur, sans écrire cette limite dans la sauvegarde. Le cache serveur de test est borné par révision/TTL et mutualise les reconstructions simultanées.

La production devra utiliser une projection/requête indexée minimale ; l’adaptateur en mémoire est réservé aux tests. Télécharger tous les documents des joueurs pour les filtrer côté navigateur ou Edge Function ne satisfait pas cette condition. Les [preuves agrégées](aggregate-results.json) mesurent les payloads fictifs, pas l’egress réel Supabase.

## Erreurs

401 : identité absente/invalide ; 403 : compte non autorisé ; 404 : route ou progression publique inconnue/masquée ; 405 : méthode autre queGET ; 400 : corps client, curseur ou id invalide ; 429 : limite de lecture ; 503 : projection serveur incompatible. Un service absent n’affiche aucun classement inventé à partir de l’entraînement.

## Évolutions nécessaires avant activation

Le schéma réel reste inconnu. Aucune migration exécutable n’a été créée ou appliquée. Si le stockage existant permet une projection indexée, aucune migration n’est nécessaire. Sinon, préparer une table/vue privée d’agrégats, alimentée dans la transaction de victoire existante et sans droit d’écriture client. Les noms, index et politiques doivent être déterminés après lecture des sources exactes.

Tester l’adaptateur réel sur des comptes fictifs : autorisations négatives, pagination, compte bloqué, absence de champs privés, victoire reflétée une fois, lectures sans modification de crédit et volume réseau. Le retour arrière désactive seulement les routes sociales et conserve toute donnée additive ; il ne réinitialise aucune progression.
