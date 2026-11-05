# Performances mesurées — V15.3.1 / V15.4

Comparaison séquentielle avec le même Chromium Linux, les mêmes réponses fictives et une fenêtre tactile 390 × 844. Référence : `f82a8cd`. GPU désactivé. Trois répétitions par version en qualité élevée ; une passe supplémentaire en mode économie. Chaque scène mesure 90 intervalles `requestAnimationFrame`.

Ces mesures montrent une fluidité maintenue dans ce laboratoire. Elles ne constituent pas une mesure du GPU d’un téléphone, un test de Safari iOS ou une promesse de 60 images par seconde sur tous les appareils.

| Scène | V15.3.1 élevé, p95 médian | V15.4 élevé, p95 médian | V15.4 économie, une passe |
|---|---:|---:|---:|
| Accueil | 16.8 ms | 16.8 ms | 16.8 ms |
| Collection | 16.7 ms | 16.7 ms | 16.8 ms |
| Inspection grand format | 16.8 ms | 16.8 ms | 16.7 ms |
| Arène | 16.7 ms | 16.8 ms | 16.7 ms |
| Marché | 16.7 ms | 16.8 ms | 16.7 ms |
| Casino | 16.7 ms | 16.8 ms | 16.7 ms |
| Memory | 16.8 ms | 16.8 ms | 16.7 ms |
| Administration | 16.7 ms | 16.8 ms | 16.8 ms |
| Mashup Match | Nouveau jeu | 16.7 ms | 16.8 ms |
| Booster exceptionnel | 16.8 ms | 16.8 ms | 16.7 ms |

Les médianes de tâches longues pendant les fenêtres V15.4 élevées sont nulles pour ces dix scènes. Cela ne signifie pas qu’aucune tâche longue ne peut survenir au chargement, en dehors des échantillons ou sur un autre appareil. Les comptes DOM et heaps indicatifs figurent dans le rapport brut ; ils ne démontrent pas une absence de fuite mémoire.

## Correction guidée par la mesure

La première version de travail atteignait un p95 médian de 33,3 ms en inspection, contre 16,8 ms pour la référence. L’objet était animé devant une collection entière traitée par le flou du backdrop. La version finale utilise une scène opaque dédiée et garde la mise en page de collection invisible pendant l’inspection ; les illustrations, plans, statistiques et reflets de la carte restent affichés. Le substrat imprimé reste fixe, le revêtement et le biseau portent la réponse à la lumière. Le p95 médian final revient à 16,8 ms.

Les listes de collection restent bornées, les cartes d’album et d’échanges hors écran sont désormais observées aussi, les images de grilles restent différées, et les longues listes Admin ont un rendu de peinture différé lorsque le navigateur le permet. L’inspection ne reçoit pas de dégradation de résolution.

## Preuves et reproduction

- [Rapport brut](artifacts/performance-results.json) : sept parcours, conditions, échantillons et deltas.
- [Trace de l’optimisation](artifacts/inspection-optimization.json).
- [Comparaison visuelle](artifacts/comparison.html), capturée dans le vrai jeu avec données fictives.

```sh
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-4/performance.cjs
```

Ne pas exécuter un autre benchmark, une vidéo ou une suite navigateur en parallèle. Le test utilise 36 cartes fictives, dont 24 sont rendues dans la première fenêtre de collection. Il ne mesure ni les délais Supabase, ni le téléchargement des illustrations réelles, ni un catalogue de plusieurs milliers de cartes.
