# Mashup V13 · Éclipse

Mise à jour du client existant, préparée sur `feature/mashup-mobile-premium`. Aucun déploiement, aucune migration et aucun accès aux données des joueurs. Les appels serveur restent les contrats existants. Le catalogue, les images, les statistiques et les règles économiques ne sont pas remplacés.

## Expérience

- Accueil personnalisé : trois découvertes possédées mises en scène, statistiques réelles, progression de collection et accès arène/missions/marché. Les cartes cachées, archivées ou non possédées n'entrent pas dans cet aperçu.
- Navigation mobile : Accueil, Collection, Arène, Marché, Plus. Le menu natif dialog garde le focus, se ferme avec Échap et expose Jeux, missions, decks, amis, classements, succès, profil et règles. Admin/atelier selon rôle. Déconnexion conservée dans Plus.
- Direction artistique : nuit encre, violet et citron, nouvelles surfaces, espacements tactiles, login, boosters et scène d'inspection. Les cadres/illustrations actuels sont conservés avec une couche optique supplémentaire.
- Cartes : reflets holographiques localisés au pointeur, reflets liés à l'inclinaison dans l'inspection existante, colorimétrie selon rareté. Aucun moteur 3D ni dépendance graphique ajouté. Pas de boucle d'animation permanente pour les reflets de grille, pas de capteur d'orientation ni permission nécessaire.
- Effets adaptatifs : Auto, Spectaculaires, Fluidité & autonomie. Le choix local n'écrit aucune préférence de compte. La réduction des animations du système prend toujours le dessus. Le mode économique réduit aussi les délais et effets de boosters.
- Mobile installé : manifeste relatif compatible GitHub Pages et icônes locales 180/192/512. Cela prépare l'affichage autonome via ajout à l'écran d'accueil ; ce n'est ni un APK ni une app iOS signée. Aucun service worker ajouté et aucune promesse de jeu hors ligne.

## Fluidité et fiabilité

Decks affichés par lots de 24, sans supprimer d'options ; recherche collection/decks temporisée à 110 ms ; aucune interception des gestes de défilement par les nouveaux effets. Les effets optiques utilisent une frame à la demande sur une seule carte ; arrêt sur sortie/masquage.

Correction R03 : le module Jeux ne dessine plus dans #page quand la vue active n'est pas Jeux. Son polling s'arrête lorsque le document est masqué. Un pari peut encore être suivi quand une autre vue reste visible, sans écraser celle-ci. Les réponses d'un ancien compte sont rejetées par les clients API avant application de leurs données. Cela ne remplace pas un système de révisions serveur ni une garantie transactionnelle.

## Vérifications réellement exécutées

Voir [evidence.txt](evidence.txt).

- 22 tests Node, zéro échec/ignoré : règles métier sur fixtures, références historiques, masquage/échappement, qualité adaptative, version/cohérence des icônes, réponse d'ancien compte rejetée et régression R03 corrigée.
- Chromium avec API Auth/Supabase entièrement simulées et réseau tiers bloqué : accueil, menu, qualité, persistance après rechargement, réduction des animations, Échap, decks 24→36, recherche/reset, collection, détail/inspection, révélation de trois cartes et confirmation une fois, menu joueur sans admin, déconnexion.
- Aucun débordement horizontal sur l'accueil aux largeurs 320,390,768,1440 ; collection vérifiée à 390. Aucune erreur JavaScript durant ces parcours.
- Captures : [mobile](preview-mobile.png), [desktop](preview-desktop.png), [menu/login](preview-login.png), [inspection](preview-card.png), [booster](preview-booster.png). Données fictives, cartes publiques du catalogue de référence, aucune image de joueur.

Les tests de phase 0 ont évolué explicitement : la vérification d'intégrité conserve les empreintes des fichiers inchangés et vérifie la baseline historique pour les fichiers applicatifs modifiés ; le test de reproduction R03 est devenu un test d'acceptation du correctif. Les anciens rapports de phase 0 restent un état historique, pas une preuve de ce build.

## Rejouer

Depuis la racine :

```sh
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs
npm install --prefix /tmp/mashup-ui-validation --no-audit --no-fund --ignore-scripts playwright-core@1.64.1
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/mobile/browser-smoke.cjs
```

Chromium est attendu à /usr/bin/chromium. Le serveur de test écoute uniquement loopback et intercepte les réponses distantes avant chargement du jeu. Ne pas ouvrir une copie non interceptée en la considérant comme une préproduction : les URLs de production sont toujours les URLs applicatives réelles. Le test enregistre des captures de fixtures dans ce dossier. Pour régénérer les icônes depuis le SVG : ajouter MASHUP_GENERATE_ICONS=1 à la commande navigateur (écrit uniquement les trois PNG locaux).

## Limites et revue avant mise en ligne

Aucune mesure FPS/mémoire sur téléphone physique et aucun test Safari réel. Le navigateur Chromium émule les dimensions/tactile ; il ne valide pas les limitations de WebKit/iOS. Aucun achat, tirage, email ou compte réel utilisé ; auth et économie de production non certifiées. Vérifier préproduction isolée, connexion/récupération réelle de test, marché/PvP et interruptions réseau avant publication. Les garde-fous de phase 0 sur sauvegardes restent applicables.

Tous les fichiers backend et les données de catalogue sont inchangés. Le changement de version 13.0.0 ne sera visible sur le site que si cette branche est fusionnée et publiée. Retour arrière : remettre ensemble HTML, CSS/JS, icônes et manifeste de version au build précédent ; aucune restauration de base nécessaire pour les modifications de ce lot. Ne pas effacer le stockage des sessions ou les données des joueurs.

## Finitions renforcées — suivi brillance

Ajout de deux couches décoratives masquées : irisation prismatique et vernis spéculaire. Intensité progressive de commune à Ultra ; Gold métallique dorée ; Secrètes avec micro-éclats. Le masque atténue les couches devant les zones de texte. Les couches sont purement visuelles, non interactives et aria-hidden ; ni illustration ni donnée de carte ne sont modifiées. En mode économique/animations réduites, la couche prismatique est désactivée et le vernis simplifié.

La capture d’inspection montre maintenant le mode spectaculaire pendant un geste d’inclinaison. Le test navigateur vérifie la présence de la finition et le déplacement de la lumière. Les 22 tests Node et le parcours Chromium simulé passent ; aucune mesure sur appareil physique ni publication.
