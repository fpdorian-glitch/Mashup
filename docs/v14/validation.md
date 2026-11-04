# Laboratoire de validation V14

Les scripts de `tests/v14` servent le dépôt depuis une adresse HTTP locale et exécutent Chromium. Toutes les requêtes extérieures sont interceptées et reçoivent une réponse fictive locale. Les comptes, soldes, collections et ouvertures montrés sont inventés. Aucune requête n'est envoyée aux services Supabase réels. Les SVG de collection proviennent des ressources publiques du dépôt ; la planche de 24 cartes utilise des illustrations abstraites produites localement avec Canvas.

## Reproduire

Prérequis : Node.js, `playwright-core`, Chromium et `tar`. Le navigateur ne nécessite pas de compte Mashup. Depuis la racine du dépôt :

```sh
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v14/browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v14/journeys.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v14/performance.cjs
```

`CHROMIUM_PATH` permet d'indiquer un autre binaire. Les captures et rapports JSON sont écrits dans `docs/v14/artifacts/`. Les tests existants ne sont pas remplacés. Le script de performance extrait la référence locale `b20fb58` dans un répertoire temporaire, puis le supprime ; il ne modifie pas la branche ni les sources de cette référence.

Si `ffmpeg` est disponible avec le codec VP9, le parcours booster produit également `booster-preview.webm`. Il assemble les images du screencast Chromium en conservant leurs horodatages ; il ne fabrique pas d'images intermédiaires. L'enregistrement est limité à l'ouverture et n'est pas actif pendant les mesures de performance. Les captures PNG restent disponibles si l'encodage vidéo n'est pas installé.

## Parcours couverts

- Accueil aux largeurs 320, 390, 768 et 1440 px ; action booster visible ; absence de débordement horizontal à l'accueil et en collection.
- Menu administrateur, menu joueur, droits de navigation, fermeture avec Échap, déconnexion et persistance du choix des effets.
- Collection fictive : recherche, remise à zéro, pagination et conservation des premiers nœuds DOM ; decks : 24 puis 36 cartes.
- Détail et inspection d'une carte, geste souris et clavier, respect de la préférence de réduction des animations.
- Booster fictif : sceau si présent, trois révélations, récapitulatif, un seul appel de préparation et un seul appel de confirmation. Le test vérifie que le sceau et le récapitulatif n'envoient pas la confirmation.
- Galerie rendue avec le véritable module de cartes : six raretés × quatre variantes, cinq statistiques sur chacune, Ultra Secrète, absence d'informations et d'image sur une carte non découverte.
- Absence d'exception JavaScript et d'erreur console pendant les parcours.

Le script `journeys.cjs` complète ces contrôles avec une campagne de quatre manches dont le serveur est simulé, puis les écrans défis en ligne, marché avec annonce fictive, sélecteur de vente, échange privé avec ami fictif, profil, jeux/Memory, classements, succès, atelier et administration. Il n'enregistre pas de profil, ne publie pas d'annonce, ne valide pas d'échange et ne crée pas de carte. Les choix et réponses de combat sont des fixtures écrites pour exercer l'affichage ; leurs valeurs ne prouvent pas la justesse du moteur serveur. Les sorties figurent dans `journey-results.json`.

## Lire les mesures

`performance-results.json` compare main `b20fb58` et V14 sur la même machine et les mêmes données fictives. Deux scènes sont échantillonnées : accueil immobile et défilement de la collection. Chaque scène collecte 120 intervalles `requestAnimationFrame`, leur médiane et leur p95, les intervalles supérieurs à 33,34 ms, le nombre de nœuds DOM/cartes/images, le heap JavaScript si exposé et les long tasks observées pendant l'échantillon.

Ces mesures décrivent une simulation Chromium headless sous Linux avec GPU désactivé. Elles ne constituent pas un test sur Android ou iPhone, une mesure de consommation, de température, de débit réseau réel ou de rendu GPU. Le heap dépend du garbage collector. Une médiane proche de 16,7 ms ne permet pas d'affirmer « 60 fps sur mobile ». Les essais sur appareils physiques et les contrats backend nécessitent une validation distincte.

## État d'exécution

Les parcours navigateur et métiers ont réellement été exécutés le 4 novembre 2026. Les preuves sont `artifacts/browser-results.json`, `artifacts/journey-results.json`, les PNG et `artifacts/booster-preview.webm`. Le rapport navigateur vérifie notamment les 24 images conservées et les cinq valeurs visibles en collection, inspection et galerie, sans collision entre titre et statistiques. La vidéo provient de frames réelles de l'ouverture dans Chromium, avec les mêmes données fictives que les captures.

La comparaison du 4 novembre 2026, à 390 × 844 px et qualité haute, donne :

| Scène | Référence b20fb58 | V14 | Lecture |
| --- | ---: | ---: | --- |
| Accueil, nœuds DOM | 600 | 682 | +82 nœuds pour la nouvelle présentation |
| Collection, nœuds DOM | 1 405 | 1 646 | +241 nœuds pour les gravures et matériaux |
| Collection, cartes rendues | 24 | 24 | Pagination initiale conservée |
| Accueil, intervalle rAF p50 / p95 | 16,7 / 16,8 ms | 16,7 / 16,7 ms | Écart trop faible pour conclure à un gain |
| Collection défilée, intervalle rAF p50 / p95 | 16,7 / 16,8 ms | 16,7 / 16,8 ms | Aucun gain mesuré dans cette simulation |
| Collection, heap JS utilisé | 3 069 549 octets | 3 119 777 octets | +50 228 octets ; GC non contrôlé |
| Long tasks durant les 120 frames de collection | 0 | 0 | Échantillon limité à environ deux secondes |

Le nombre d'images HTML passe de 8 à 0 dans la collection de ces fixtures : les illustrations intégrées sont des SVG et les anciens fichiers de cadres sont remplacés par des gravures SVG locales. Cela ne signifie pas que les illustrations importées par les joueurs sont supprimées ; la galerie vérifie séparément la conservation de chaque `src` sur les quatre finitions.

Ces résultats ne démontrent pas une hausse de FPS sur téléphone. Le nouveau cadre augmente le DOM ; les mesures ne montrent pas de dégradation des intervalles rAF dans cette courte simulation. Les rapports JSON contiennent les valeurs détaillées et les limites. Aucune restauration Supabase ni validation de sécurité backend n'est réalisée par ce laboratoire.
