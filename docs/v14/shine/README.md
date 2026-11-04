# V14.0.1 — preuves des reflets

Le test ciblé [shine-browser.cjs](../../../tests/v14/shine-browser.cjs) est passé dans Chromium le 4 novembre 2026 à 23:48 UTC. Il exécute le jeu actuel en local, avec 36 cartes de laboratoire, un compte fictif et toutes les réponses distantes interceptées. Aucune requête n'atteint Supabase ou la production.

Les captures ci-dessous viennent du navigateur, sans retouche. Les vidéos contiennent de vraies trames Chromium horodatées, encodées en WebM.

| Finition | Neutre | Inclinaison à droite | Inclinaison à gauche | Mouvement |
| --- | --- | --- | --- | --- |
| Secrète, émail vert | [PNG](secret-neutral.png) | [PNG](secret-right.png) | [PNG](secret-left.png) | [WebM, 4,93 s](secret-motion.webm) |
| Ultra Secrète, opale verte | [PNG](ultra-secret-neutral.png) | [PNG](ultra-secret-right.png) | [PNG](ultra-secret-left.png) | [WebM, 5,10 s](ultra-secret-motion.webm) |

Le [rapport JSON](report.json) conserve les styles calculés, coordonnées de lampe et de diffraction, sources d'illustration, statistiques, événements de test et résultats.

Vérifications réalisées sur les deux finitions :

- Les couleurs calculées du reflet et du spectre ont une composante verte dominante. Les teintes de lumière sont respectivement `#3de68b` et `#8cfbb2`.
- Le déplacement de souris, les flèches du clavier et une séquence tactile Chromium déplacent la lampe et la diffraction. Sur l'inclinaison droite, la lampe passe de `(50 %, 40 %)` à environ `(82 %, 13 %)`, la diffraction se déplace en sens inverse et l'intensité passe de `0,46` à `0,64`.
- Les sources SVG restent identiques à chaque geste. Les cinq statistiques restent visibles et inchangées : `94 / 65 / 89 / 85 / 96` et `95 / 66 / 90 / 86 / 97` pour ces deux cartes fictives.
- Le réglage « Fluidité & autonomie » masque les couches de reflet. La préférence système « Réduire les animations » les masque aussi et maintient l'inclinaison à zéro.
- Le marqueur CSS `v12-offscreen`, appliqué directement à la carte de test, masque les reflets ; son retrait les rétablit. Cette assertion contrôle le garde CSS, sans prétendre retester le déclenchement de l'IntersectionObserver.
- Aucun événement `pageerror` ni erreur de console. Aucun parcours de booster ou de combat n'est déclenché par ce test.

Commande utilisée dans cet environnement :

```sh
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v14/shine-browser.cjs
```

Chromium s'exécute en mode headless sous Linux, dans une fenêtre de 390 × 844 pixels. Ces preuves valident les interactions et le rendu locaux ; elles ne constituent pas une mesure de fluidité sur téléphone physique ni une validation de Safari/iOS. Les données des joueurs, le backend de production et les mécanismes de sauvegarde ne sont pas sollicités.
