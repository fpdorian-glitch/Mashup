# Phase 0 — Référence et protection

Référence : commit d6ed7db3e522d41f4cb1ed91b4ed09aa88539e49, version 12.1.0. Préparé le 4 novembre 2026. Branche phase-0/reference-protection.

## Résultat et périmètre

Dossier de référence et tests hors ligne uniquement. Aucune correction de phase 1, aucun changement du jeu ou de configuration cloud, aucun appel Supabase, aucune sauvegarde de données réelles et aucun déploiement. Les fixtures sont entièrement fictives. Les documents ne contiennent ni export joueur ni secret. Les sources complètes des trois Edge Functions, le schéma SQL, les politiques RLS et la configuration Auth/Storage sont absents.

La préparation documentaire est disponible ; la protection opérationnelle reste NON VALIDÉE tant que la restauration intégrée n'a pas été exécutée en environnement indépendant. Un aller-retour JSON synthétique ne constitue pas une restauration Supabase.

- [Inventaire fonctionnel et dépendances](inventory.md)
- [Contrats observés et données protégées](contracts.md)
- [Sauvegarde, restauration et préproduction](protection.md)
- [Tests de référence et critères de passage](validation.md)
- [Registre des risques](risks.md)
- [Preuves d'exécution](evidence.txt)
- `source-inventory.json` : empreintes SHA-256 des sources et appels API avec fichier/ligne. Extraction lexicale reproductible, pas une preuve d'exhaustivité du backend.

## Rejouer sans réseau

Depuis la racine : `node --test --test-isolation=none tests/phase-0/reference.test.mjs` puis `python3 tools/phase-0/inspect.py`.
Node 24 et Python 3 sont disponibles dans l'environnement examiné. Aucun paquet à installer. Le test désactive fetch et n'utilise pas de compte. Ne pas servir le checkout et ouvrir le jeu pour un test isolé : ses URL Supabase restent celles de production.

## Passage à la phase 1

Conditions : inventaire revu ; contrats inconnus explicités ; projet de test indépendant identifié ; fonctions et schéma récupérés de façon sécurisée ; sauvegarde complète protégée ; restauration sur cible isolée réellement testée ; comparaison des comptes et invariants réussie ; plan manuel réalisé sur préproduction ; risques résiduels acceptés ; validation explicite du propriétaire. Aucun de ces points externes n'est implicitement acquis par les tests locaux. Phase 1 non engagée.
