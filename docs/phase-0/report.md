# Rapport de phase 0

## Livrables

Les sept objectifs sont couverts par un inventaire fonctionnel, les contrats client observés avec leurs limites, la liste des actifs/invariants, une procédure de sauvegarde complète et de restauration, le cahier de préproduction, une matrice de 20 parcours intégrés, un registre de 15 risques et une suite de 15 tests hors ligne. Voir README.md pour les liens.

## Preuves

15 tests exécutés, 15 réussis, zéro échec, zéro ignoré (evidence.txt). Ils comprennent la vérification SHA-256 des sources applicatives, la syntaxe des 12 modules racine, le masquage/échappement du rendu, les règles partielles vente/annulation/achat, les échanges, claims collection/succès/missions, calendrier Paris/DST et la reproduction R03. La copie fichier JSON fictive et les contrôles de corruption passent ; il ne s'agit pas d'une restauration DB. Les fragments tournent séquentiellement en VM et ne démontrent aucune isolation SQL/concurrence réelle.

Aucun code applicatif, catalogue, réglage cloud ou version du jeu modifié. Aucun déploiement et aucune opération sur Supabase. Documents/scripts/tests uniquement, sans données personnelles ni valeurs de clés. Les chemins de test et références sont fictifs.

## Réserves et éléments à sécuriser

- Sources des trois Edge Functions, schéma, liens Auth/joueurs, RLS/grants, mécanisme de verrou et version déployée non accessibles dans ce dépôt.
- Sauvegarde production non réalisée ; complétude Auth/Storage/config et rétention/PITR inconnues.
- Projet de préproduction indépendant non provisionné ; front actuel pointe toujours vers production. Aucun smoke test réseau ne doit être lancé sur cette copie en la prenant pour une préproduction.
- Aucune restauration Supabase exécutée ni validée. Ni les 15 tests locaux ni le comparateur synthétique ne lèvent cette réserve.
- T01–T20 et tests Android/iPhone non exécutés ; risques R01/R02 critiques et R03–R07 élevés restent ouverts.

Accès/actions nécessaires détaillés dans protection.md : sources privées exactes, métadonnées de backup, opérateur habilité sauvegarde, cible de test indépendante et accès limité à cette cible. Fournir les accès via paramètres sécurisés/gestionnaire de secrets, jamais dans le chat ou Git. Le choix du provisionnement et ses éventuels coûts doit être explicite. Aucune publication du jeu nécessaire à la revue de ces documents.

## Décision de passage

Phase 0 préparatoire livrée ; protection opérationnelle encore non validée. Le passage à la phase 1 exige revue du périmètre, préproduction isolée, restauration réellement réussie et comparée, contrats critiques connus ou réserves explicites acceptées, puis validation utilisateur. Aucune phase 1 engagée et aucun défaut applicatif corrigé.
