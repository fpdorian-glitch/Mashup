# Livraison et instructions pour ChatGPT

Cette version est une **branche de développement à vérifier**, conformément à la consigne « NE PUBLIE PAS ». Aucune PR fusionnée, publication GitHub Pages/Vercel, migration ou Edge Function déployée pendant ce travail.

## Références

- Dépôt : `fpdorian-glitch/Mashup`.
- Branche : `feature/mashup-v15-6-immersion-match-2`, créée depuis `main` au commit `15968dc` (V15.5.1).
- Version préparée : `15.6.0`, état `development` dans `version.json`. Le journal indique également une version de développement.
- Le dernier commit et le statut distant sont consignés à la fin de ce document après enregistrement de la branche.

## Préparation backend privée

Le service social est dans `/workspace/mashup-backend-private/match-social-service.mjs`, hors du dépôt public. L’archive de revue `review/mashup-match-v15.6-private.tar.gz` contient les services, fixtures, tests et les modules publics partagés nécessaires aux imports. Ses empreintes se trouvent dans `review/SHA256SUMS-v15.6` et `review/manifest-v15.6.json`. Elle ne contient aucune source déployée, clé ou donnée réelle et ne doit pas être ajoutée au dépôt GitHub public.

Les versions précédemment indiquées de `mashup-api-gh` et `mashup-games` ne sont pas des versions vérifiées pendant ce travail. Ne pas remplacer une fonction entière avec ces modules autonomes. La connexion officielle Supabase est nécessaire pour obtenir les sources exactes et réaliser l’intégration.

## Conditions d’activation du classement

1. Récupérer en privé les versions réellement déployées et leurs dépendances, le schéma, les permissions et les transactions Match actuelles. Calculer les empreintes avant modification.
2. Ajouter les trois lectures GET du [contrat social](social-api.md) au routeur authentifié existant. L’acteur doit venir de la session vérifiée ; aucune progression déclarée par le navigateur n’est acceptée.
3. Fournir au service une projection minimale indexée des progressions déjà validées. **Ne pas télécharger toutes les sauvegardes pour filtrer en mémoire en production.** L’adaptateur mémoire fourni sert seulement aux tests.
4. Si une vue/requête indexée suffit, ne pas créer de migration inutile. Sinon, préparer une évolution additive d’agrégats privés, alimentés depuis la transaction de victoire existante, avec écriture client interdite. Les noms de tables et règles SQL doivent être déterminés depuis les sources réelles, actuellement indisponibles.
5. Vérifier sur préproduction indépendante : accès négatifs, compte bloqué/masqué, pagination, payloads sans champs privés, cohérence des dix mondes, invalidation du cache après victoire et zéro écriture de crédit par lecture. Mesurer les octets effectivement transférés et les requêtes SQL.
6. Une sauvegarde/restauration réelle en environnement isolé reste à effectuer avant toute évolution du stockage réel. Les tests de copie mémoire ne constituent pas une restauration Supabase validée.

## Revue et publication par ChatGPT

1. Relire la branche et les preuves, puis exécuter les tests selon [validation.md](validation.md). Comparer avec le dernier `main` et conserver toute correction publiée entre-temps.
2. Faire une passe sur Android Chrome et iPhone Safari physiques, y compris rotation, mise en veille, PWA installée, geste répété, réseau lent et réouverture d’un booster. Aucun essai physique n’a été réalisé ici.
3. Valider le classement sur l’adaptateur réel en préproduction. Le rendu local avec fixtures ne prouve ni JWT/RLS ni les performances SQL. La campagne Match existante doit continuer à attribuer ses récompenses via son même mécanisme atomique.
4. Après revue et décision de publication, déployer uniquement les lectures compatibles nécessaires, vérifier leur état, puis faire la PR/fusion du client. L’activation du social ne doit pas remplacer le moteur ou réinitialiser les progressions.
5. Passer les métadonnées de `development` à la forme de publication attendue, avec la date réelle de publication ; retirer le libellé de développement du journal. Conserver la cohérence `15.6.0` entre HTML, manifeste, updater et ressources.
6. Contrôler le commit réellement déployé, la version publique et les parcours autorisés. Ne déclarer la publication réussie qu’après observation de ces états.

## Retour arrière

Revenir au client compatible précédent et désactiver seulement les nouvelles lectures sociales si nécessaire. Conserver les agrégats additionnels et toutes les progressions, reçus et attributions. Les lectures ne créent aucun droit à récompense et leur retrait ne nécessite aucune correction de solde.

Ne jamais écraser un portefeuille récent par une ancienne sauvegarde pour annuler cette présentation. Aucun changement de taux, prix, niveaux ou règles ne fait partie de cette branche.

## Statut Git

À compléter après enregistrement et vérification du push de la branche de développement. Aucune publication du jeu autorisée par cette livraison.
