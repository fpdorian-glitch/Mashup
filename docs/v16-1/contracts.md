# Contrats et isolation

## Routes existantes conservées

Le client continue à appeler `mashup-api-gh` via le routeur existant avec session Auth. Les payloads des achats, tirages, échanges, contre-offres, défis et choix de combat restent ceux de V15.7.2.

| Source | Usage V16.1 | Écriture de jeu |
| --- | --- | --- |
| `/api/bootstrap` | utilisateur, inventaire, catalogue/metadata, séries, packs, taux confirmés éventuels | aucune nouvelle |
| `/api/admin/...` existantes | configuration et synchronisation confirmée par les écrans actuels | aucune nouvelle route admin |
| GET `/api/trades` | demandes entrantes pending du destinataire ; identité limitée dans la cloche | aucune |
| GET `/api/pvp/invitations` | invitation existante ; cadence 90 s globalement / 30 s sur écrans en ligne en mode historique | aucune |
| GET `/api/pvp` | annuaire/profils et arène existants ; pas de téléchargement récurrent de l’annuaire pour afficher les pastilles | aucune nouvelle |
| `/api/trades/create`, `/respond`, `/partner/:id` | sélection, validation et réponse restent dans le module existant | règles existantes seulement |
| `/api/pvp/challenge` | `{targetId, mode}` | défi existant seulement |

Les erreurs et réponses sont vérifiées contre le compte/epoch de session avant application. Les GET identiques simultanés sont partagés, puis retirés du cache en vol ; leurs réponses sont clonées. Les écritures invalident la génération, y compris celles pendant un GET, afin de relire au lieu d’appliquer un solde ancien. Aucun cache persistant de données économiques ajouté.

## Service social optionnel, non déployé

Le client l’utilise seulement si bootstrap annonce `socialV161.version=1` et `sync=true`. `presence`, `readReceipts`, `realtime` sont des capacités explicites séparées. Aucune détection basée sur un succès accidentel de route.

POST `/api/social/sync` transporte uniquement :

- `deviceId` aléatoire par session, `sequence` monotone ;
- `active` déterminé par visibilité et interaction récente ;
- `cursor` de projection, `configRevision` des seuls taux publiables ;
- `ack:[{id, stamp}]`, au maximum 50 lectures de notifications.

Le serveur doit dériver l’utilisateur du JWT validé. Aucun acteur, crédit, carte ou résultat choisi par le client. Une transaction isolée de métadonnées renouvelle le bail et enregistre les lectures autorisées ; elle ne doit pas réécrire le document du jeu ou prendre le verrou économique.

La réponse versionnée fournit `serverTime`, `leaseMs` (90 s proposé, accepté seulement entre 30 et 180 s), `revision`, `acked`, et les projections modifiées :

- notifications limitées aux demandes que le destinataire est autorisé à consulter : id, type, ref, pseudo, révision, mode éventuel, état non lu ; aucun contenu d’inventaire dans la cloche ;
- présence `source:'lease-v1'` : joueur public autorisé, état, expiration, dernière activité si disponible ;
- configuration : taux des packs visibles uniquement, pas les pools privés ou les Secrètes.

Une réponse inchangée omet les projections déjà présentes. Un changement de taux doit changer la révision de configuration. Une demande de lecture doit être idempotente et ne jamais valoir acceptation. Le cas « demande résolue pendant l’acquittement » doit être finalisé avec l’historique réel avant activation : la simulation actuelle rejette un acquittement absent/obsolète plutôt que d’écrire une lecture non autorisée.

Cadence de secours visible : 30 s ; inactivité après 120 s sans interaction ; dernier pulse inactif lors du passage en arrière-plan ; aucun sondage récurrent caché. Fermeture brutale : le bail expire. Multi-appareil : en ligne si au moins un bail actif valide. Une ancienne séquence ne peut pas ressusciter un appareil après sa séquence inactive plus récente. Si la projection devient trop ancienne, le client affiche la présence indisponible.

Realtime éventuel : canal privé dérivé de l’UUID Auth vérifié du SDK ; message d’invalidation sans données sensibles ; politiques serveur et autorisation du sujet à vérifier. Le client ne publie aucune présence arbitraire dans un canal public. Sans Realtime, le secours périodique reste actif.

## Conservation et retour arrière

Les états lus historiques sont les seuls ajouts en localStorage : IDs de notifications/révisions, namespace par compte, maximum 256 entrées. Pas de pseudo, e-mail, carte, crédits, jeton ou copie de collection ajouté. L’accès au stockage peut échouer sans casser les échanges.

Supprimer l’annonce de capacité ramène le client au protocole historique. Les métadonnées sociales restent séparées ; les tables de comptes, collections, transactions et historiques ne sont pas modifiées par ce brouillon. Aucun script destructif ou déploiement automatique livré.
