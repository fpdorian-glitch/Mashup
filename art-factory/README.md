# Mashup Art Factory — Convergence (série 2)

Ce dossier accompagne les **100 nouvelles cartes** du catalogue \`content/convergence-series2.json\` (numéros 003 à 102, 10 univers). Les cartes préexistantes protégées dans le catalogue ne sont pas reprises ici.

## Utilisation rapide

1. Ouvrir [le studio de préparation](./index.html) via GitHub Pages : \`https://fpdorian-glitch.github.io/Mashup/art-factory/\`.
2. Choisir une carte et cliquer **Copier le prompt**.
3. Générer une illustration originale dans un outil d’images externe **ou** utiliser « Générer cette carte » après configuration de la passerelle sécurisée. **Ne pas reproduire les acteurs, le design officiel des personnages, logos ou costumes distinctifs.**
4. Dans le studio, **Charger une image** (mode manuel), ou attendre la génération automatique, contrôler le recadrage 6:5 et télécharger le JPEG renommé.
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

## Génération automatique (optionnelle)

Le site fonctionne **sans service IA** pour consulter les 100 briefs, copier les prompts, recadrer et renommer les images. Une fonction de génération directe a été ajoutée avec un **Worker Cloudflare** (fichier [worker.js](./worker.js)) : elle est désactivée tant que tu ne configures pas le Worker et ses secrets. Les clés API ne doivent jamais être placées dans les fichiers publics de GitHub ou dans le navigateur.

### Activer la passerelle sécurisée avec Cloudflare

1. Ouvrir **Cloudflare Dashboard → Workers & Pages → Create → Worker**, puis créer un Worker (ex. `mashup-art-factory`).
2. Dans l'éditeur de code du Worker, remplacer le code d'exemple par celui de `art-factory/worker.js` et **déployer**.
3. Dans **Settings → Variables and Secrets**, ajouter deux **secrets chiffrés** :
   - `OPENAI_API_KEY` : clé API OpenAI personnelle avec facturation active, obtenue depuis https://platform.openai.com/api-keys ;
   - `ART_FACTORY_TOKEN` : mot de passe aléatoire long (32 caractères minimum), distinct de tout mot de passe personnel.
4. Retourner sur https://fpdorian-glitch.github.io/Mashup/art-factory/ puis saisir l'URL publique `https://...workers.dev` du Worker et le code `ART_FACTORY_TOKEN` dans le nouveau panneau IA.
5. Cliquer **Tester**. Si la connexion réussit, sélectionner une carte et cliquer **Générer cette carte**. Un résultat est automatiquement recadré puis prêt à télécharger sous son identifiant exact.
6. Pour trois images d'un coup, filtrer les cartes et cliquer **Générer 3 cartes + ZIP** : la création est séquentielle, nécessite confirmation, et fournit une archive contenant au maximum 3 JPEG.

**Sécurité et coûts :** les requêtes sont payantes sur l'API OpenAI, séparément de l'abonnement ChatGPT. Le Worker appelle actuellement `gpt-image-2.5-flare`, avec une image WebP par appel, en 1200 × 1008 et qualité medium. Il limite la taille des prompts et n'autorise comme origine que le site public de Mashup, mais le vrai contrôle d'accès repose sur `ART_FACTORY_TOKEN`. Ne partage pas ce code. Le navigateur conserve seulement l'adresse du Worker, jamais le code privé ni la clé API. Interrompre une génération après envoi ne garantit pas l'annulation de sa facturation.

**États du jeu :** les images ne sont pas envoyées automatiquement dans Supabase ni publiées chez les joueurs. Elles doivent être vérifiées et importées dans le Studio visuels Mashup par l'administrateur (6 fichiers maximum par lot).

### Variante en ligne de commande

Depuis le dossier `art-factory`, avec Wrangler et un compte Cloudflare connecté :

```bash
npx wrangler deploy worker.js --name mashup-art-factory
npx wrangler secret put OPENAI_API_KEY --name mashup-art-factory
npx wrangler secret put ART_FACTORY_TOKEN --name mashup-art-factory
```

Les secrets doivent être saisis dans l'invite Wrangler ; **ne pas** les écrire dans les commandes ni dans des fichiers versionnés.

Aucune modification des comptes, crédits ou collections Mashup n'est réalisée par l'Art Factory.
