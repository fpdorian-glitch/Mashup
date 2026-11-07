# Mashup V16 — architecture et audit UX/réseau

Ce document décrit les vérifications de préparation. La publication autorisée ensuite est suivie dans [PUBLICATION.md](PUBLICATION.md).

Référence publiée examinée : `79172e1e11b5b529009d23f0357c5e923954f32c` (V15.7.2). Développement sur `feature/mashup-v16-mobile-shell`, sans publication.

## Interface livrée

- Structure fixe dès le premier affichage ; hauteur du viewport visuel, zones de sécurité et panneaux de défilement internes. Le mode jeu libère le bandeau supérieur et conserve les cinq destinations en bas.
- Accueil recentré sur la galerie 3D existante : balayage, sélection magnétique, nom/prix/ouverture, probabilités issues du bootstrap confirmé et raccourcis. Les trois cartes décoratives de l’ancien accueil ne sont plus téléchargées avant de visiter leur écran.
- Collection : choix de série, album et grille conservés, recherche, favoris, filtres dans une fenêtre dédiée, inspection 3D originale, progression, vitrine et decks.
- Jouer : Arène IA, PvP, Match, Casino, Ligue IA, mini-jeux. Les rubriques du Casino et les historiques défilent dans leur propre panneau ; Memory possède sa rubrique. Les commandes originales restent branchées sur leurs protocoles.
- Marché : Acheter / Vendre / Mes annonces / Échanges ; grille paginée par lots de 40, filtres conservés, sélection dans la collection et écran du prix. Confirmation d’achat native, annulation sans requête, disponibilité et débit vérifiés par le serveur.
- Profil, missions, succès, classements, règles, amis, atelier et administration réorganisés. Les formulaires sont déplacés dans des rubriques, avec leurs identifiants et gestionnaires existants.
- Historique natif et retour visible ; mémoires des filtres et positions en RAM ; protection des écritures critiques et des réponses provenant d’un ancien compte. Les préférences économiques ne deviennent jamais des preuves de transaction.

## Responsabilités des fichiers

| Fichier | Responsabilité |
|---|---|
| `77-v16-navigation.js` | Historique de document, superpositions, restauration et blocage des écritures |
| `78-v16-app.css` | Mobilier de l’application, dimensions, panneaux et navigation ; aucun matériau de carte |
| `79-v16-network.js` | Regroupement des GET, cache borné de présentation et validation de l’état complet |
| `80-v16-screens.js` | Hub de jeu, menu, adaptation des rubriques et viewport |
| `index.html` | Raccordement aux fonctions existantes, accueil, collection et confirmation marché |
| `04-games-ui.js` | Ouverture directe des sections et présentation Ligue ; protocoles conservés |
| `22-v11-economy-ui.js` | Rubriques du marché et suppression du bootstrap redondant lorsque possible |
| `20-market-v10-9.js` | Même optimisation prudente après acceptation d’un échange |
| `61-v15-3-market-art.js` | Arrêt des observations hors écran, borne et nettoyage du cache par session |

Les moteurs, matières, illustrations, fichiers de contenu, règles et fragments backend sont contrôlés contre la référence. Les seules modifications de `57-v15-1-battle-view.js` et `64-v15-4-match-ui.js` concernent les versions des imports. Les anciens tests de verrouillage de fichiers ont été adaptés uniquement pour les fichiers de présentation autorisés ; les nouveaux tests contrôlent le HTML des cartes du marché et les contrats de transaction.

## Inventaire des transferts

| Source / parcours | Contrat constaté dans le client | Traitement V16 |
|---|---|---|
| GitHub Pages | HTML, JS, CSS, SVG, manifeste, `version.json` | Pas de nouveau framework/CDN ; quatre modules dédiés supplémentaires |
| Auth Supabase | Session/JWT via SDK existant | Contrôles de compte et d’époque conservés ; aucun secret ajouté |
| `mashup-api-gh` : `/api/status`, `/api/auth/me`, `/api/bootstrap` | Configuration initiale, utilisateur, catalogue, séries, inventaire, profil, taux | Autorité inchangée ; bootstrap non conservé en cache réutilisable |
| Illustrations `mashup-art?card=…&key=…` | URL séparée, révision dans la clé ; base64 hors du catalogue courant | URLs, octets, résolution et renderer inchangés ; `loading=lazy` et cache HTTP existants réutilisés |
| `/api/market/listings`, `/api/market/preview/:id` | Annonces publiques, illustration autorisée d’une annonce | Lecture des annonces réutilisable 10 s, bouton Actualiser force une lecture ; aperçu à l’approche du viewport, cache 96 entrées, nettoyage au logout |
| `/api/market/list`, `/buy`, `/cancel`, `/api/trades/respond` | Écritures serveur ; état de compte parfois présent dans la réponse | POST jamais caché. État complet vérifié avant de remplacer le bootstrap ; repli vers bootstrap si absent/partiel |
| `/api/leaderboard`, `/api/achievements` | Présentation des classements/succès | Cache RAM respectivement 20 et 15 s ; toute écriture l’invalide |
| `/api/dev-posts` | Journal | Ouvert à la demande ; cache RAM 90 s et bouton d’actualisation |
| Profils | Profil propre déjà dans le bootstrap, profils publics à la demande | Pas de nouvelle copie persistante. Politique 15 s seulement pour un éventuel GET `/api/profile`, non utilisé par le profil propre actuel |
| `/api/pvp/invitations`, `/api/pvp`, `/api/battles/*` | Invitations, reprise, états et choix des manches | Aucun TTL ajouté ; cadence active conservée et GET simultanés identiques regroupés |
| `mashup-games` : `status`, `bet`, `start`, `move`, `daily`, `match/*` | Horloge, parties, coups et gains confirmés | Aucun cache d’état actif, aucun changement des requêtes d’écriture ou de leurs gains |
| Missions, collection, préférences et administration | Lectures/écritures spécialisées | Aucun cache d’autorité ; gestionnaires et contrôles conservés |
| Arrière-plan | Sondages PvP, invitations et jeux vérifient déjà la visibilité | Gardes existantes conservées ; aucun nouvel intervalle réseau V16 |

Le coordinateur conserve au maximum 24 réponses et 750 000 octets, uniquement en RAM et dans le périmètre compte+époque. Il clone les réponses pour éviter les mutations entre consommateurs. Une réponse contenant un état ou un solde au premier niveau n’entre pas dans le cache réutilisable. Une écriture invalide les lectures avant et après son exécution ; une lecture antérieure à l’écriture est relancée au plus une fois. Une réponse d’un autre compte est rejetée. Il ne stocke ni JWT, ni email, ni inventaire dans un nouveau stockage disque.

La validation de l’état complet exige les crédits/éclats, quantités, deux decks, favoris, compteurs de base et indicateur du booster gratuit. Une réponse incomplète emprunte le rechargement de secours. Les données du serveur restent seules autoritaires.

## Catalogue et confidentialité

La V16 ne change ni le contenu ni les réglages des séries. La navigation joueur et la galerie excluent les séries masquées. Une série visible mais non autorisée dans les boosters reste exclue de la sélection par série. Les métadonnées d’affichage d’un booster mixte sont filtrées sans modifier sa configuration de tirage. Le catalogue client joueur est également limité aux séries visibles. La règle des Secrètes non découvertes est conservée.

Ces gardes d’interface ne prouvent pas la sécurité du serveur : Supabase doit continuer à ne transmettre aucune métadonnée privée et à filtrer tous les pools de tirage, y compris les boosters globaux. Les sources effectivement déployées et les règles SQL/RLS n’ont pas été accessibles dans cette session. Aucun appel de production n’a servi à les vérifier.

## Suite backend proposée, non implémentée ni déployée

Le catalogue initial continue à arriver entièrement dans `/api/bootstrap`. Le gain V16 concerne surtout les visites et les bootstrap évités après transaction. Pour aller plus loin : récupérer les sources déployées par OAuth/MCP, mesurer les réponses réelles, puis préparer en environnement privé un contrat versionné distinguant métadonnées publiques, état personnel et données admin. Étudier un ETag/digest de catalogue et un delta par révision, avec une réponse complète de secours et invalidation atomique lors des changements de visibilité. Ne pas remplacer ce contrat par un cache local sans contrôle serveur de la visibilité et de la session.

Vérifier ensuite les en-têtes réels de `mashup-art` : cache privé approprié, URL révisée à chaque changement d’image et comportement en cas de retrait/visibilité. Le laboratoire démontre le fonctionnement du cache Chromium avec les en-têtes qu’il configure ; il ne démontre pas les en-têtes actuellement déployés. Aucune migration SQL, conversion d’image, purge, modification de données ou intervention sur une Edge Function n’a été réalisée.
