# Mashup V15.6 — Entre tes mains

Version de développement préparée le **6 novembre 2026**, Europe/Paris, depuis `main` V15.5.1, commit `15968dc`. Branche : `feature/mashup-v15-6-immersion-match-2`.

**Aucune publication du jeu, fusion dans `main`, migration ou fonction Supabase déployée.** Cette livraison est destinée à la vérification finale par ChatGPT. Les sources déployées exactes n’ont pas pu être inspectées : aucune connexion Supabase MCP/OAuth ni identité de déploiement n’est disponible dans cet environnement.

## Fonctionnalités développées

### Les paquets deviennent les objets de la galerie

Les anciennes fenêtres de boosters sont remplacées par des emballages autonomes : face avant, dos, côtés, épaisseur, soudures crantées, plis et reflet métallique. Le paquet central est mis en avant, ses voisins restent inclinés et en retrait. Le rail utilise l’inertie et le repositionnement natifs du navigateur, avec gestes tactiles, glissement souris, clavier et boutons de navigation.

Les filtres par série restent stricts. Le nom, le prix, les bons éventuels, le nombre de cartes et la garantie du paquet sélectionné sont regroupés sous la scène. Le bouton utilise toujours le même identifiant de booster et le même flux de préparation/confirmation. La galerie n’inspecte aucun tirage ou catalogue pour dessiner l’emballage.

Trois objets au maximum gardent leurs faces 3D actives. L’inclinaison suit le pointeur seulement sur le paquet central, sans boucle au repos. Les profils économie et mouvement réduit retirent les plans et reflets secondaires.

### Une ouverture physique, sans modifier le tirage

Le paquet scellé possède aussi une épaisseur et un dos. Le haut se déchire selon le geste, puis des dos génériques émergent. La déchirure reste courte, accélérable et accessible par tap ou clavier. Les cartes forment une pile avec tranches papier ; les effets exceptionnels existants restent disponibles.

La face réelle n’est plus insérée dans le DOM tant que le joueur n’a pas choisi sa révélation. La création de la face choisie commence au clic de révélation, ce qui prépare ses styles pendant le prélude existant. Elle devient visible au retournement ; aucune carte suivante n’est préparée dans le DOM. Le résumé conserve l’ordre reçu et la confirmation automatique/reprise V15.3.2 est conservée.

**Limite du protocole historique :** la réponse serveur de préparation contient déjà les résultats. Le rendu différé empêche leur divulgation dans le DOM et l’accessibilité avant révélation ; il ne cache pas une réponse réseau à une personne utilisant les outils de développement. Une révélation cryptographiquement opaque nécessiterait une évolution serveur distincte. Aucun tel changement n’est présenté comme effectué ici.

### Match suit réellement le doigt

Une case se soulève dès la prise, suit les coordonnées du pointeur avant son relâchement et fait réagir le voisin. Revenir en arrière annule la prévisualisation. Le relâchement produit une seule commande adjacente, dont la validité reste décidée par le moteur/serveur existant. Une réponse lente garde un retour visuel local, sans simuler de score ni crédit.

Le déplacement n’utilise ni reconstruction du DOM, ni appel réseau, ni lecture répétée de géométrie. Seules la case déplacée et sa voisine portent les transformations temporaires. Les annulations couvrent perte de capture, `pointercancel`, sortie du plateau, focus, page masquée, rotation, nouveau compte et démontage. La sélection par deux touches, le clavier et le mouvement réduit restent pris en charge.

Les événements déjà confirmés du moteur alimentent une couche temporaire de chutes, destructions et atterrissages. Cette présentation ne décide pas du résultat et n’impose aucune attente avant la commande suivante. Une interaction suivante peut l’annuler immédiatement.

### Progression publique des joueurs

La campagne donne accès à un classement paginé et au détail des dix mondes d’un joueur : pseudo, niveau atteint, monde actuel, étoiles, niveaux terminés et distinctions. La lecture dédiée ne transmet ni images, ni cartes, ni portefeuille, ni sauvegarde complète.

Le cache client est limité à 25 entrées, séparé par compte/session, avec une durée de 60 secondes et un délai de dix secondes entre actualisations manuelles. Aucun polling social ni requête de classement pendant un geste. L’entraînement local n’est jamais utilisé pour créer un rang ou des étoiles en ligne.

Le service de lecture privé et son adaptateur de test fonctionnent réellement ; leur raccordement au routeur et au stockage déployés reste à faire. Sans route compatible, l’écran signale l’indisponibilité du classement. Il n’invente aucun résultat. Le [contrat social](social-api.md) et les [preuves agrégées privées](aggregate-results.json) décrivent précisément ce périmètre.

## Architecture et fichiers

| Fichier | Rôle |
|---|---|
| `69-v15-5-booster-browser.js`, `70-v15-5-boosters.css` | Emballages, filtre, scène, inertie, sélection et lifecycle de la galerie |
| `38-v14-booster.js`, `39-v14-booster.css`, `47-v15-booster.css` | Scellé 3D, déchirure, émergence générique et pile |
| `71-v15-6-match-gesture.js`, `72-v15-6-match-motion.css` | Suivi continu local, preview, ressort et annulations |
| `73-v15-6-match-social.js`, `74-v15-6-match-social.css` | Projection publique stricte, cache et écrans sociaux |
| `75-v15-6-match-presentation.js`, `76-v15-6-match-presentation.css` | Lecture visuelle annulable des événements confirmés du moteur |
| `64-v15-4-match-ui.js` | Intégration des nouveaux contrôleurs, verrou réseau et reprise manuelle de campagne depuis l’entraînement |
| `index.html` | Galerie, détails sélectionnés, nettoyage par vue/compte et rendu différé des faces |
| `09-mashup-updates.js`, `57-v15-1-battle-view.js`, manifeste, version et journal | Version de développement et cohérence du cache des ressources |
| `tests/v15-6/` | Tests unitaires, navigateur, harnais isolé et comparaison avec V15.5.1 |

Le moteur `62-v15-4-match-engine.js`, les cent niveaux `63-v15-4-match-levels.js`, les fragments économiques/backend, illustrations, catalogue, récupération des boosters, Casino et optimisation d’invitations V15.5.1 sont conservés octet pour octet. Le protocole Match existant reste `15.4.0` ; le protocole social `1` est indépendant de la version du client.

## Vérification et publication future

Voir [les tests et leurs limites](validation.md), [les performances](performance.md) et [les instructions de livraison/publication pour ChatGPT](publication.md).

Captures du vrai client : [galerie](artifacts/booster-gallery-mobile.png), [geste en cours](artifacts/match-continuous-drag.png), [classement](artifacts/match-social-ranking.png), [détail joueur](artifacts/match-social-player.png).

Démonstrations : [Match tactile](artifacts/match-touch-preview.webm), [ouverture 3D](artifacts/booster-3d-preview.webm). [Comparaison V15.5.1/V15.6](artifacts/comparison.html).
