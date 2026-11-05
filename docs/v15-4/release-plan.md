# Publication coordonnée et retour arrière

L’utilisateur a demandé la publication de la V15.4 après vérification. Le développement a avancé sans nouvelle demande d’autorisation ; l’absence d’accès aux sources privées et au déploiement Supabase empêche cependant de remplir les étapes backend requises avant cette publication.

## État vérifié

| Élément | État |
|---|---|
| Client V15.4 et tests isolés | Préparés sur branche dédiée |
| Service Match privé et tests de sécurité | Préparés, adaptateur transactionnel en mémoire |
| Sources exactes `mashup-api-gh` et `mashup-games` | Non téléchargées : connexion officielle indisponible |
| Schéma, RPC, permissions et miroir du portefeuille | Non vérifiés |
| Migrations appliquées | Aucune |
| Edge Functions déployées | Aucune |
| Données de joueurs réels modifiées | Aucune |
| Restauration Supabase réellement testée | Non |
| V15.4 publiée sur `main` / GitHub Pages | Non |

## Préparation à effectuer avec l’accès privé

1. Télécharger exactement les deux fonctions déployées, leurs dépendances et leurs configurations. Conserver versions et empreintes dans le dossier privé ; contrôler l’absence de clés avant tout transfert. Ne pas copier ces sources dans le dépôt public.
2. Lire le schéma et la transaction financière existante. Relier le service au même utilisateur authentifié et au même verrouillage que les achats, paris et autres gains. La clé d’attribution et le miroir du portefeuille doivent être validés dans le même commit SQL.
3. Choisir l’évolution additive adaptée au schéma observé : nouveaux champs JSON ou tables privées, reçus uniques et références de sessions. Aucun remplacement, réinitialisation ou effacement du document historique n’est nécessaire.
4. Construire une préproduction indépendante avec des comptes fictifs. Comparer les données historiques avant/après. Tester permissions négatives, double clic, retry après commit, concurrence Match/achat/pari et panne entre écritures.
5. Effectuer une sauvegarde et une restauration réellement vérifiées dans ce projet isolé. Les tests actuels de copie mémoire ne satisfont pas cette étape.
6. Déployer le backend compatible, vérifier le handshake, les cent gains configurables, les restrictions de rôle et les récompenses de première victoire. Vérifier également les contrats réels du Casino, sans créer de pari pour un vrai joueur.
7. Créer puis fusionner la PR du client après réussite des contrôles et disponibilité du backend. Vérifier le commit déployé par GitHub Pages, la version du site et une session autorisée. La publication n’est pas déclarée faite tant que ces états n’ont pas été observés.

## Retour arrière sans perte

- Désactiver d’abord les nouvelles récompenses et les nouveaux départs Match côté serveur ; conserver les parties, reçus, progressions et journaux.
- Revenir au routeur compatible précédent en conservant les champs additionnels. Garder un moteur compatible pour terminer les sessions engagées ; à défaut, les suspendre sans consommer leurs coups ou crédits.
- Revenir au commit client précédent après vérification de compatibilité. Le mode entraînement reste isolé et ne peut convertir une victoire locale en gain réel.
- **Ne pas restaurer un ancien solde par-dessus des achats, paris ou gains légitimes plus récents.** Une éventuelle correction financière nécessite un rapprochement à partir des reçus, pas une remise à zéro.
- Ne supprimer aucune table, colonne, carte ou historique à l’occasion du retour arrière. Une opération irréversible ou présentant un risque de perte reste soumise à validation spécifique.

## Accès et limitations connues

La connexion Supabase MCP et les identités/secrets de déploiement ne sont pas configurés. Le CLI Supabase n’est pas authentifié. L’API GitHub était également refusée par la politique réseau de cet environnement lors de la livraison précédente ; le statut de la tentative actuelle sera consigné dans `delivery.md`.

Android Chrome et iPhone Safari physiques n’ont pas été testés. Les essais présents utilisent Chromium Linux, des fenêtres mobiles et le tactile simulé. Aucun résultat d’authentification/JWT/RLS, de paiement ou de calendrier de production n’est déduit de ces simulations.
