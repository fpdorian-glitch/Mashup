# Performances mesurées — V15.3.2 / V15.4

Comparaison séquentielle après intégration de la dernière version de `main` (`d486c86`). Même Chromium Linux, mêmes données fictives et fenêtre tactile 390 × 844 ; GPU désactivé. Trois répétitions par version en qualité élevée ; une passe supplémentaire en mode économie. Chaque scène mesure 90 intervalles `requestAnimationFrame`.

| Scène | V15.3.2 élevé, p95 médian | V15.4 élevé, p95 médian | V15.4 économie, une passe |
|---|---:|---:|---:|
| Accueil | 16.7 ms | 16.7 ms | 16.8 ms |
| Collection | 16.8 ms | 16.7 ms | 16.7 ms |
| Inspection grand format | 33.3 ms | 16.7 ms | 16.7 ms |
| Arène | 16.7 ms | 16.7 ms | 16.7 ms |
| Marché | 16.7 ms | 16.8 ms | 16.8 ms |
| Casino | 16.8 ms | 16.8 ms | 16.8 ms |
| Memory | 16.8 ms | 16.8 ms | 16.7 ms |
| Administration | 16.8 ms | 16.7 ms | 16.8 ms |
| Mashup Match | Nouveau jeu | 16.8 ms | 16.7 ms |
| Booster exceptionnel | 16.8 ms | 16.8 ms | 16.7 ms |

Ces intervalles montrent une fluidité maintenue dans ce laboratoire. Ils ne mesurent pas tout le travail GPU/compositeur et ne garantissent pas 60 images par seconde sur un téléphone.

Neuf scènes V15.4 élevées ont une médiane de zéro tâche longue dans leur fenêtre. Le booster exceptionnel conserve une médiane d’une tâche longue : 55 ms et 86 ms dans deux passages, aucun événement dans le troisième. Son p95 reste à 16,8 ms, mais cette pointe est une limite réelle à surveiller sur appareil physique. Le mode économie observé évite cette pointe ; un seul passage ne suffit pas à en garantir le comportement sur tout appareil.

## Optimisation de l’inspection

Une première version de travail, comparée à la V15.3.1 (`f82a8cd`), atteignait un p95 médian de 33,3 ms en inspection contre 16,8 ms pour cette référence. La collection restait peinte et floutée derrière l’objet. La version finale utilise une scène opaque dédiée et garde la mise en page de collection invisible pendant l’inspection, sans retirer la carte, ses plans, ses statistiques ou ses reflets. Le substrat imprimé reste fixe, le revêtement et le biseau portent la réponse à la lumière. La comparaison finale a été refaite depuis V15.3.2 ; les résultats figurent ci-dessus.

Les fenêtres de collection restent bornées, les cartes d’album et d’échanges hors écran sont observées aussi, les images de grilles restent différées et les listes Admin ont une peinture différée lorsque le navigateur le permet. La résolution des illustrations en inspection n’est pas réduite.

## Preuves et limites

- [Rapport brut final](artifacts/performance-results.json) : sept parcours, conditions, échantillons, DOM, heaps et deltas.
- [Trace de l’optimisation initiale](artifacts/inspection-optimization.json), avec les références de chaque mesure.
- [Comparaison visuelle finale](artifacts/comparison.html) dans le vrai jeu avec données fictives.

```sh
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-4/performance.cjs
```

Exécuter sans autre benchmark, vidéo ou suite navigateur concurrente. Le jeu de données contient 36 cartes fictives ; 24 cartes sont rendues dans la première fenêtre de collection. Le test ne mesure pas le téléchargement des illustrations réelles ni les délais Supabase. Les heaps varient avec le GC et ne prouvent pas une absence de fuite. Aucun Android/iPhone physique ni moteur Safari iOS n’a été testé.
