# Mashup Art Factory — Convergence (série 2)

Ce dossier accompagne les **100 nouvelles cartes** du catalogue \`content/convergence-series2.json\` (numéros 003 à 102, 10 univers). Les cartes préexistantes protégées dans le catalogue ne sont pas reprises ici.

## Utilisation rapide

1. Ouvrir [le studio de préparation](./index.html) via GitHub Pages : \`https://fpdorian-glitch.github.io/Mashup/art-factory/\`.
2. Choisir une carte et cliquer **Copier le prompt**.
3. Générer une illustration originale dans l'outil d'images de votre choix (hors de cet outil). **Ne pas reproduire les acteurs, le design officiel des personnages, logos ou costumes distinctifs.**
4. Dans le studio, **Charger une image**, contrôler le recadrage 6:5 et télécharger le JPEG renommé.
5. Sur Mashup, aller dans **Atelier → Studio des illustrations → Importer en série** et charger jusqu'à **6 fichiers** nommés comme les identifiants.
6. Marquer la carte « Validée » dans Art Factory après avoir constaté que l'import Mashup a réussi.

## Formats

- Format cible **JPEG, 720 × 600 pixels**, paysage 6:5 (le vrai visuel se place dans la fenêtre d'art de la carte ; Mashup ajoute déjà sa propre bordure et ses statistiques).
- Les prompts demandent un sujet centré avec des marges ; le traitement recadre au centre sans déformation.
- Noms **par identifiant exact** ; exemple : \`s2-conv-haikyuu-01.jpg\`. Éviter \`S2_013_Hinata.jpg\` : le Studio Mashup ne reconnaîtra pas automatiquement ce préfixe.
- Sources acceptées par le convertisseur : JPG, PNG, WebP, au maximum 15 Mo.
- Les fichiers sont traités localement dans le navigateur avec Canvas. Le site ne transmet pas les images à un service tiers.
- Le suivi « À générer / Prête / Validée » utilise le stockage local du navigateur et n'est pas synchronisé avec le jeu.

## Fichiers

- [convergence-prompts.csv](./convergence-prompts.csv) : prompts complets, format CSV avec séparateur \`;\`, BOM UTF-8 compatible Excel français.
- [convergence-prompts.json](./convergence-prompts.json) : index exact de toutes les cartes, briefs, prompts, palette et fichiers attendus.
- [index.html](./index.html) : l'interface autonome de préparation et de conversion.

## Direction artistique

Tous les briefs utilisent une direction commune : illustration originale haut de gamme, rendu peint réaliste, lumière cinématographique, cadrage 6:5, sujet centré et aucune typographie. Chaque univers possède ses propres accents visuels et chacune des 100 cartes un concept de scène distinct.

**Droits :** ces prompts sont volontairement indépendants des apparences officielles. La génération IA ne garantit toutefois pas l'absence de risques juridiques. Conserver des noms, marques ou personnages de franchises peut toujours poser des problèmes de propriété intellectuelle et, pour les acteurs et personnalités, de droit à l'image — surtout en cas de diffusion commerciale. Pour une publication large, préférer des cartes et titres entièrement originaux, et faire valider les droits nécessaires.

## Remarque sur l'automatisation

Le studio ne génère **pas** les images lui-même. Il prépare les 100 prompts, aide à contrôler le format et le nom, et suit l'avancement. Un service de génération automatique nécessiterait un backend sécurisé, un modèle autorisé, une gestion des coûts et une validation avant publication ; il n'est pas inclus ici. Aucun changement n'est apporté au serveur Supabase, aux comptes ni aux cartes Mashup.
