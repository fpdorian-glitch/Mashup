# Registre des risques

Gravité = impact potentiel, pas preuve d'exploitation. Aucun correctif réalisé.

| ID | Gravité | Statut/preuve | Risque et condition de clôture |
|---|---|---|---|
| R01 | Critique | Backend/SQL/RLS absents | Autorisations, JWT, isolation joueur/admin et transaction inconnus. Clore par inspection sources déployées + tests négatifs sur cible indépendante. |
| R02 | Critique | Aucune restauration exécutée | Sauvegarde incomplète possible (Auth, images, séquestres). Clore par restauration isolée et comparaison exacte. |
| R03 | Haute | Reproduit par simulation Jeux | Réponse tardive écrase #page après navigation. Clore après correction autorisée et test d'acceptation inverse. |
| R04 | Haute | API retourne state entier, protection commune de révision absente | Réponse ancienne/cross-session susceptible d'écraser état récent. Clore par tests d'ordre et changement de compte. |
| R05 | Haute | Booster pending en mémoire, reprise bootstrap non explicite | Fermeture/perte réseau et idempotence serveur inconnue. Clore par crash/rejeu/statut définitif et débit unique. |
| R06 | Haute | URLs production codées en dur | Copie frontend ne constitue pas préproduction. Clore par build isolé et blocage réseau prod vérifiés. |
| R07 | Haute | Commentaire FOR UPDATE seulement dans fragments | Concurrent buy/cancel/claim : garanties non établies. Clore par tests de concurrence SQL/API et transaction rollback. |
| R08 | Moyenne | Save préférences différé 240 ms, pas de garantie fermeture | Perte derniers decks/favoris. Clore par interruption et indicateur d'état confirmé. |
| R09 | Moyenne | innerHTML fréquent ; échappement présent ; aucune XSS démontrée | Audit champs/URL/CSP et tests payload sans exécution ; évaluer dépendance CDN et session persistante. |
| R10 | Moyenne | DOM complet, canvas/base64, couches CSS, polling | Mémoire/latence mobile ; profiler appareils de référence avant de prétendre fluidité. |
| R11 | Moyenne | Anciennes branches après return, fragments versionnés | Régression lors extraction/suppression ; cartographier chemins actifs, ne rien supprimer en phase 0. |
| R12 | Moyenne | Updater reload, version multiples | Rechargement pendant transaction ; tests compatibilité et reprise. |
| R13 | Moyenne | Worker IA optionnel, jeton partagé sans quota applicatif | Coûts si jeton compromis ; stub seulement en tests, quotas et contrôle identité à étudier. |
| R14 | Moyenne | Édition art envoie carte complète | Écrasement de changement concurrent ; tester conflit et version serveur. |
| R15 | Moyenne | tradeList modifie expiration en fragment | GET peut écrire : ne pas sonder la production pendant audit ; confirmer transaction et contrat. |

Accès manquants et procédure de levée : protection.md. Aucun accès administratif supplémentaire ni secret ne doit être envoyé dans le chat ou commité. Aucune nouvelle clé nécessaire aux tests hors ligne.
