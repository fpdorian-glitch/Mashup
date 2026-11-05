# Performances mesurées — V15.5.1 / V15.6

Les mesures utilisent **Chromium Linux 155.0.8059.79, GPU désactivé, fenêtre tactile simulée 390 × 844**, sur AMD EPYC 9V74. Référence extraite en lecture seule depuis `15968dc`. Les comptes et 36 cartes sont fictifs, les ressources locales et les appels Auth/API interceptés. Aucun téléphone physique, Safari iOS, réseau Supabase ou téléchargement des illustrations réelles mesuré.

## Comparaison complète initiale

Sept parcours séquentiels : trois répétitions en qualité élevée par version, puis une passe supplémentaire V15.6 en économie. Chaque scène mesure 90 intervalles `requestAnimationFrame`. Aucun autre benchmark ou enregistrement vidéo ne tourne simultanément.

| Scène | V15.5.1, p95 médian | V15.6, p95 médian initial |
|---|---:|---:|
| Accueil | 16,7 ms | 16,8 ms |
| Galerie de boosters | 16,8 ms | 16,8 ms |
| Collection | 16,8 ms | 16,8 ms |
| Inspection | 16,7 ms | 16,8 ms |
| Arène | 16,8 ms | 16,7 ms |
| Marché | 16,7 ms | 16,8 ms |
| Casino | 16,7 ms | 16,8 ms |
| Memory | 16,7 ms | 16,8 ms |
| Administration | 16,8 ms | 16,8 ms |
| Match au repos | 16,7 ms | 16,8 ms |
| Match pendant déplacement du pointeur | 16,7 ms | 16,8 ms |
| Première révélation exceptionnelle | 16,8 ms | **33,3 ms** |

Le déplacement continu de pointeur de la référence ne déplace pas sa case : le test mesure aussi ce comportement, pas seulement un intervalle d’images. V15.6 déplace réellement le symbole avant relâchement, sans requête pendant le geste. Le total DOM du document accueil/galerie passe de 725 à 674 nœuds ; ce total inclut le journal de version raccourci et ne mesure pas les seuls paquets.

La fenêtre Admin conserve une médiane d’une tâche longue en V15.6, contre zéro dans cette série de référence, malgré un p95 stable. Le code de rendu Admin n’a pas été modifié. Ce résultat reste une limite observée ; les intervalles d’images ne suffisent pas à affirmer une fluidité parfaite.

## Régression détectée et correction du booster

La régression de première révélation n’a pas été masquée dans les résultats. L’ouverture a d’abord reçu une scène opaque, sans flou du fond, gardant le layout sous-jacent invisible. Cette optimisation préserve la position de défilement, mais ne suffit pas à corriger le p95 du booster.

Un suivi de sept parcours a revérifié Match, son glissement et le booster après les corrections de gestes/cascades : **Match et glissement à16,7 ms**, médiane de zéro tâche longue. Le booster reste à33,3 ms en qualité élevée et16,7 ms en économie. Une tâche longue de 55 ms apparaît dans un passage élevé.

Un profil A/B/C a ensuite isolé trois variantes du véritable client, trois passages chacune. **La collecte rAF et les tâches longues commencent avant le clic**, pour inclure la réaction initiale et éviter de déplacer artificiellement le coût hors de la fenêtre :

| Variante de diagnostic | p95 médian |
|---|---:|
| Face créée au démarrage du retournement | 33,4 ms |
| Face créée au clic où le joueur choisit cette révélation | **16,8 ms** |
| Tranches papier neutralisées, hydratation tardive conservée | 33,3 ms |

La deuxième variante a été retenue. Seule la carte choisie est créée, après le clic ; aucune carte suivante n’entre dans le DOM. Le prélude existant prépare ses styles avant le retournement. Les tranches, reflets, illustrations et leur qualité sont conservés, et aucune attente obligatoire supplémentaire n’a été ajoutée.

Dans ce profil, l’insertion HTML choisie prend1,1 à 1,6 ms. Le premier callback rAF suit l’intention en23,6 à 25,6 ms ; la classe de révélation apparaît en293,3 à 295 ms, contre293,1 à 293,8 ms avec hydratation tardive. Une des trois passes retenues conserve une tâche longue de 52 ms, médiane zéro. Le champ technique `handlerMicrotaskMs` du rapport n’est pas une mesure fiable de durée totale du gestionnaire et n’est pas utilisé comme telle.

La vérification finale sur le code retenu, **sans injection ni réécriture du client**, mesure trois révélations avec une fenêtre démarrant avant le clic : **p95 de 16,8 / 16,8 / 16,8 ms**, aucune tâche longue. Les intervalles maximaux restent 33,4 / 50 / 49,9 ms. Le premier callback rAF arrive en 19,6 / 57,5 / 18,6 ms après l’intention : médiane 19,6 ms, mais la pointe de 57,5 ms constitue une limite réelle. Ces résultats corrigent la régression observée dans cette configuration ; ils ne garantissent pas un temps de réaction identique sur tous les appareils.

## Coût réseau et lifecycle

- Pendant le déplacement visuel : **zéro appel API**, aucune reconstruction enfant du plateau, géométrie lue à la prise seulement.
- Cinq remontages Match mesurés par CDP : **9 listeners sur `#page` avant/après**. Les unités testent aussi le nettoyage des frames, timers et captures. Cela ne prouve pas l’absence de toute fuite mémoire de l’application.
- Galerie : trois paquets 3D actifs au maximum ; aucune boucle RAF au repos. Les autres objets perdent leurs plans secondaires et les modes réduits retirent ces effets.
- Social : cache de 60 secondes limité à25 entrées client, actualisation manuelle espacée, pas de polling par geste ou par coup et aucune image.
- Service privé, cohorte de 1001 joueurs : page25 à 3565 octets JSON, détail10 mondes à577 octets ; trois lectures, un index et zéro commit. Ce sont des tailles JSON fictives non compressées, pas une mesure d’egress Supabase.

## Preuves et reproduction

- [Comparaison complète et échantillons bruts initiaux](artifacts/performance-initial.json).
- [Suivi ciblé Match/booster après corrections](artifacts/performance-follow-up.json).
- [Profil A/B/C incluant le clic](artifacts/booster-profile-results.json).
- [Trois révélations finales, client non réécrit](artifacts/booster-final-results.json).
- [Comparaison visuelle du vrai client](artifacts/comparison.html).
- [Interactions et comptage de listeners](artifacts/browser-results.json).

```sh
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-6/performance.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules V156_PERF_SCENES=match,matchContinuousDrag,booster node tests/v15-6/performance.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-6/booster-profile.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-6/booster-final.cjs
```

Exécuter séparément des vidéos et autres suites navigateur. Les intervalles rAF mesurent l’ordonnancement ; ils ne représentent pas tout le travail GPU/compositeur et ne garantissent pas60 FPS sur Android/iPhone. Les heaps dépendent du GC et ne constituent pas une preuve d’absence de fuite. L’egress réel, les appareils physiques et Safari restent à vérifier selon [publication.md](publication.md).
