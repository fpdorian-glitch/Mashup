# Mashup Match — contrat client/serveur préparé

Ce document ne contient pas le backend privé ni les sources Supabase déployées. Il décrit le contrat de la V15.4 ; les routes doivent être intégrées dans le routeur authentifié existant avant d’être déclarées disponibles en production. Aucun gain réel n’est attribué par le navigateur.

L’adaptateur client utilise `api(route, body)` pour les routes logiques suivantes. Le routage HTTP exact est décidé après lecture des Edge Functions privées ; ce contrat n’affirme pas qu’une nouvelle route est déjà déployée.

| Route logique | Requête | Réponse principale |
|---|---|---|
| `status` | GET, sans corps | `{available:true, version, progress, active, economy, state}` |
| `start` | POST `{levelId, requestId}` | Même snapshot ; `active` contient la nouvelle partie ou la partie reprise. |
| `move` | POST `{sessionId, revision, from, to, requestId}` | Snapshot confirmé, `valid`, `events`, `reward` éventuelle. |
| `abandon` | POST `{sessionId, revision, requestId}` | Snapshot avec `active:null`, sans récompense. |
| `admin-config` | GET, administrateur | `{config, revision, economy}` |
| `admin-config` | POST `{config, revision, requestId}`, administrateur | Configuration validée, nouvelle révision et grille des cent gains. |

`progress` est `{unlocked:1..101, levels:{[id]:{completed, stars, bestScore, rewardClaimed}}}`. Le niveau 101 signifie que les cent niveaux sont terminés. Les niveaux déjà terminés restent rejouables.

`active` est `null` ou `{id, revision, levelId, state, reward}`. Son `state` est l’état du moteur Match, tandis que le `state` à la racine est le portefeuille/état du compte existant. Seul ce dernier peut être transmis au gestionnaire de crédits de Mashup. `active.reward` conserve le gain exact déjà confirmé pour l’écran de résultat après reconnexion, même si le barème a changé ; il ne signale pas une nouvelle attribution. Les indices `from` et `to` désignent deux cases du tableau plat du moteur. Un échange invalide ne consomme pas de mouvement ni de révision.

`requestId` est une chaîne alphanumérique, tiret ou soulignement, de 8 à 100 caractères, unique pour une intention utilisateur. En cas de doute réseau, réessayer **le même corps et le même identifiant**. Réutiliser un identifiant pour une autre commande est refusé. Une réponse idempotente indique `idempotent:true` et contient le portefeuille et la progression actuels, afin de ne pas remplacer un solde récent par un ancien reçu.

`reward` est `{credits, firstWin, replay, granted, reason}`. Les gains sont appliqués dans la même transaction que la progression, le claim et le journal. Une victoire ne vient jamais d’un booléen client : le serveur applique les coups et vérifie le transcript avec le moteur déterministe partagé.

La campagne utilise les seeds canoniques définis dans le catalogue des niveaux, pour lesquels cent parcours gagnants ont été vérifiés. Ces seeds ne proviennent jamais des commandes client. L’identifiant de session est indépendant et lié au compte authentifié.

## Configuration économique

```json
{
  "enabled": true,
  "tiers": [{"from": 1, "to": 10, "credits": 20}],
  "overrides": {"42": 150},
  "replay": {"enabled": false, "credits": 0, "dailyCap": 0, "perLevelCap": 0}
}
```

L’exemple montre une seule tranche pour illustrer son format : la vraie configuration doit couvrir **1 à 100 sans trou ni chevauchement**. Valeurs par défaut par monde : 20, 35, 50, 75, 100, 150, 200, 275, 350 et 500 crédits. Une dérogation individuelle remplace le montant de sa tranche. Les montants sont validés côté serveur.

`dailyCap` limite les crédits de replay par jour UTC serveur ; `perLevelCap` les limite par niveau et par jour UTC. Les premières récompenses sont exclues de ces plafonds de replay. La projection publique `economy` contient `{enabled, levelRewards:{1:20,...,100:500}, replay}`. Les joueurs ne peuvent pas lire ou modifier la configuration privée via la route administrateur.

Une désactivation temporaire permet encore de jouer et sauvegarde la progression ; une première récompense non accordée reste disponible pour une réussite ultérieure après réactivation. Si le portefeuille dépasserait son plafond, le dernier coup est refusé atomiquement et reste réessayable après une dépense. Aucun claim n’est consommé par cette erreur.

## Erreurs et disponibilité

401 : connexion absente ; 403 : acteur interdit, niveau verrouillé ou accès administrateur refusé ; 404 : session/route introuvable ; 409 : révision dépassée, partie terminée, identifiant réutilisé différemment ou plafond du portefeuille ; 429 : limite de commandes ; 503 : moteur/version serveur incompatible.

Après un conflit de révision, relire `status` et afficher la session confirmée. Une réponse tardive d’un ancien compte ou d’une page retirée ne doit pas mettre à jour l’interface. Le mode entraînement hors serveur, s’il est proposé, doit être nommé explicitement : aucun crédit réel ni sauvegarde interappareils ne peut y être promis.

## Limites de validation actuelles

Le service privé préparé possède des tests de refus des scores et états client, isolation de comptes, réclamations uniques, replays plafonnés, administration, concurrence et rollback sur un adaptateur transactionnel en mémoire. Il ne remplace pas les tests du schéma réel, des permissions/RLS, des verrous SQL et du miroir de portefeuille. Les sources déployées et la connexion Supabase sont nécessaires avant une mise en ligne coordonnée.

Résultat local : **26/26 tests réussis**, incluant les **100 niveaux réels** et leurs parcours gagnants joués via le service. Les gains, progressions et comptes utilisés pour ce contrôle sont entièrement fictifs. [Résultat agrégé](match-backend-validation.json).
