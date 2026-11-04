# Protection, sauvegarde et préproduction

## État réel

Aucun projet Supabase indépendant n'a été créé, aucune sauvegarde réelle téléchargée et aucune restauration Supabase exécutée. Les bindings de la machine observés n'offrent pas d'identité Supabase administrative ; aucun secret n'a été recherché dans les fichiers. Aucune connexion SQL ni appel API de production n'est nécessaire aux tests fournis.

## Éléments manquants précis

1. Sources exactes déployées de mashup-api-gh, mashup-games, mashup-art (versions, imports et paramètres verify_jwt), migrations, fonctions SQL et code de transaction. À fournir via canal privé autorisé, pas dans le dépôt public si sensible.
2. Schéma réel incluant liens joueurs/Auth, index, contraintes, triggers, fonctions SECURITY DEFINER, grants, politiques RLS et configuration des buckets/objets d'images.
3. Métadonnées de sauvegarde : offre Supabase, sauvegardes automatiques/PITR disponibles, rétention, procédure de restauration supportée et lieu de stockage chiffré. Objectif proposé à approuver : RPO ≤24 h, RTO ≤4 h ; ils ne sont pas validés ni garantis.
4. Projet Supabase de préproduction indépendant autorisé (création potentiellement payante), référence de projet, accès de déploiement limité à celui-ci et comptes fictifs. Accès opérateur aux sauvegardes via outil sécurisé, jamais secret en chat/Git.
5. Pour une sauvegarde réelle : compte DB en lecture/outil de backup avec accès aux schémas nécessaires dont Auth, ou export/restauration Supabase gérée ; privilèges exacts à déterminer après schéma. La clé publique du frontend ne suffit pas. Aucun besoin d'ajouter une service-role au client.
6. Isolation réseau et messagerie de test, stockage de test, URL de callback de test et désactivation des tâches externes et coûts IA.

## Sauvegarde complète (procédure à exécuter ultérieurement par un opérateur autorisé)

- Inventorier schémas réellement utilisés et couverture de l'outil ; ne pas supposer qu'un dump public inclut Auth, Storage ou rôles.
- Sélectionner une sauvegarde gérée/PITR ou un export logique sous snapshot cohérent. Archiver simultanément version des Edge Functions, SQL, paramètres non secrets et empreintes des ressources. Aucune commande de dump générique n'est fournie tant que schéma et outil supporté ne sont pas établis.
- Inclure comptes Auth et identités/associations dans la méthode supportée, tables jeu, états globaux, séquestres, opérations en cours, réglages, claims, et métadonnées d'images. Les mots de passe/sessions sont sensibles : ne jamais les exposer ni les remplacer par un export profil incomplet.
- Stockage Supabase : sauvegarder séparément les octets des objets et leur manifeste si non couverts par le backup DB. Métadonnées Storage seules insuffisantes. Couvrir aussi images stockées dans un document JSON/base64 si c'est le modèle réel.
- Capturer les paramètres Auth/redirects/providers, RLS/grants/fonctions/rôles applicatifs. Secrets : références de coffre et procédure de réinjection séparée, pas de valeurs dans les manifests.
- Écrire les exports hors checkout et hors racine servie, chiffrés, avec accès restreint, durée de rétention et suppression sécurisée décidées par l'opérateur. Ne pas compter sur .gitignore comme protection.
- Manifeste privé : timestamp/snapshot/source, version outils et PostgreSQL, périmètre/exclusions, octets, SHA-256 de chaque fichier, compteurs et contrôles par compte. Logs publics limités au résultat agrégé ; jamais JWT, DSN, emails, mots de passe, corps de requête ni inventaires réels.
- Vérifier lisibilité des archives et intégrité ; ceci valide une archive, PAS sa restauration.

## Préproduction indépendante

Deux niveaux : (A) tests hors ligne livrés, sans service ; (B) futur projet Supabase indépendant avec jeu déployé séparément, Auth/Storage/Functions/SQL de test et données entièrement synthétiques. Ne pas cloner la production avec des données personnelles pour créer cette préproduction.

Les URL actuelles sont codées en dur dans index.html/reset.html et safeImage. Le projet actuel ne possède pas de sélecteur d'environnement fiable. Ne pas ouvrir simplement une copie du frontend en croyant qu'elle est isolée : elle contacte la production. Une adaptation d'environnement du client devra être approuvée dans une phase de développement ; elle n'est pas réalisée ici. D'ici là, utiliser uniquement les tests hors ligne et préparer les contrats côté test.

Critères d'isolation : référence distincte de production ; aucune clé/URL production dans le build test ni dépendance transitive de test ; credentials et buckets distincts ; allowlist réseau refusant le domaine production ; emails vers boîte de capture/identités .invalid ; aucune tâche cron/webhook externe active ; génération payante désactivée ; API test refusant sessions de production. Un simple nom « staging » ou CORS ne prouve pas l'isolation.

Jeu fictif : admin de test, deux joueurs actifs, un bloqué et un compte exigeant changement du mot de passe ; cartes des six raretés/quatre variantes, une archivée ; crédits/éclats/bons, decks, annonce active avec séquestre, échange pending, match et ouverture en cours, claims quotidiens/permanents. Les mots de passe seront créés uniquement dans le gestionnaire sécurisé du projet test. Les fixtures locales n'ont pas vocation à être importées dans un schéma SQL inconnu.

## Répétition de restauration isolée — obligation avant validation

1. Identifier une cible vierge jetable distincte ; confirmer son identifiant auprès de l'opérateur et bloquer toute sortie vers production. Ne jamais restaurer vers le projet réel, même « temporairement ».
2. Restaurer une archive de répétition synthétique via le mécanisme Supabase/PostgreSQL réellement retenu. Ne pas restaurer une base sur place ni exécuter DROP/clean sur un projet existant.
3. Réinstaller schéma/permissions/versions de Functions de référence ; réinjecter uniquement secrets de test. Restaurer objets d'images et vérifier chaque empreinte.
4. Comparer chaque objet et compte à la source synthétique ; comptes Auth ↔ joueurs sans orphelin, soldes/dust/bons, owned+séquestres, decks, claims, cartes archivées, opérations en cours.
5. Exécuter les scénarios de validation.md, dont connexion/récupération test, achat concurrent et rejeu de confirmation. Les requêtes ambiguës doivent être résolues par lecture du statut, pas rejouées aveuglément.
6. Mesurer RTO ; établir RPO depuis snapshot ; conserver rapport privé d'exécution (cible, archive, version, checksums, tests, écarts) et synthèse publique sans identités.
7. Après réussite, tester la procédure de sauvegarde réelle uniquement avec autorisation adéquate ; un test de restauration de la véritable sauvegarde nécessite un environnement de récupération privé séparé, sans emails/webhooks ni accès large. Il ne doit pas alimenter la préproduction des développeurs.

Statuts distincts : procédure écrite / archive intégrité vérifiée / restauration synthétique SQL passée / sauvegarde réelle créée / restauration réelle isolée passée. Actuellement seul le premier est acquis. L'export/import ancien dans l'interface ne remplace aucun de ces contrôles.

Retour arrière futur : revenir au code précédent compatible ; ne jamais écraser des transactions légitimes par un ancien snapshot. Toute récupération réelle nécessite gel d'écritures, rapprochement des opérations post-snapshot et approbation dédiée. Phase 0 n'exécute aucune de ces actions.
