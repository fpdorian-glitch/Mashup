# Validation V15.1

Référence publiée **19375ce (V15)**, candidate **15.1.0**, code **e6c6f95** (identifiant complet enregistré dans le JSON de performance). Essais du 5 novembre 2026, Chromium Linux. Toutes les requêtes hors localhost sont interceptées, avec comptes, inventaires, crédits et résultats fictifs. Aucun appareil physique ou backend de production testé.

## Résultats

| Vérification | Résultat | Preuve |
|---|---|---|
| Référence historique, syntaxe, cartes, économie simulée, sessions et nouveaux modules | **138 / 138 tests Node réussis** | [Sortie complète](unit-results.txt) |
| Parcours du vrai frontend | **15 scénarios/groupes réussis** | [browser-results.json](artifacts/browser-results.json) |
| Démonstrations et contrôles complémentaires | Réussis | [demos-results.json](artifacts/demos-results.json) |
| Comparaison séquentielle V15 / V15.1 | **Trois répétitions par version** | [performance-results.json](artifacts/performance-results.json) |

Les 15 scénarios couvrent :

1. Six campagnes IA complètes : simple et Double sur chacune des fenêtres **320×568**, **360×640**, **390×844**. Quatre manches, alternance du choix joueur/IA et des directions ; nombre de requêtes contrôlé. Les cartes adverses restent cachées avant révélation.
2. Quatre configurations PvP : simple/Double et hôte/invité, valeurs relatives au joueur, règle, attente adverse, poll identique, réponse actualisée et interruption réseau.
3. Modes Spectaculaire/Équilibré/Fluidité, réduction des animations, navigation pendant une réponse IA différée et déconnexion pendant une séquence.
4. Composition d’échange avec choix des deux côtés, quantité, crédits, filtres conservant le brouillon, envoi, contre-offre préremplie et acceptation actualisant le solde depuis le serveur fictif.
5. Réponses de deux partenaires reçues dans l’ordre inverse et réponse après navigation : la bonne collection reste affichée et la nouvelle page n’est pas remplacée.
6. Présentations de victoire, défaite et égalité issues de snapshots serveur, sans récompense inventée lorsqu’elle n’est pas fournie.
7. Accès aux autres onglets : collection, decks, marché, profil, jeux, missions, classements, succès, atelier et administration.

Les tests Node incluent aussi l’invalidation d’une collection reçue après reconnexion au **même identifiant**, la confidentialité avant lecture de métadonnées, les quantités et limites du brouillon, l’annulation de tous les minuteurs/animations, la non-répétition des snapshots et la conservation des fonctions de calcul et des routes existantes.

Aucune exception JavaScript constatée. Les erreurs console HTTP 503 des essais de panne PvP sont **volontairement injectées** ; les autres erreurs console font échouer le test. Aucun appel externe n’est autorisé à continuer vers Supabase.

## Règle permanente et Double

Le rapport navigateur conserve les rectangles des règles, boutons et navigation, pour chaque manche des six campagnes. Le centre des contrôles est testé avec `elementFromPoint` : le contrôle doit être dans la fenêtre, au-dessus du menu et réellement atteignable. Les deux directions proviennent des données du jeu.

Une vérification supplémentaire impose que la zone défilable du Double termine avant le dock :

| Fenêtre | Bas de la scène Double | Haut du dock |
|---|---:|---:|
| 390×844 | 621,0 px | 650,9 px |
| 320×568 | 336,3 px | 374,9 px |
| 360×640 | 397,6 px | 446,9 px |

Le mode Fluidité est contrôlé sur le style calculé : profondeur de la matière **0 px**. Le passage du mode global à économie pendant une confrontation annule immédiatement les animations. Les échanges sont également vérifiés sans débordement sur 320 et 360 px, et les deux collections sont visibles ensemble sur 1440 px.

## Mesures avant / après

Chromium **155.0.8059.79**, Linux x64, AMD EPYC 9V74, viewport **390×844 CSS px**, échelle 1, GPU désactivé. Même jeu fictif, mêmes endpoints interceptés, même machine. Qualité globale haute et mode d’arène V15.1 Spectaculaire. La V15 est extraite par `git archive 19375ce` et servie sur le même serveur local.

Trois répétitions : V15 puis V15.1, chacune dans un contexte neuf. Chaque échantillon contient **120 intervalles rAF**. L’échantillon de confrontation comprend le clic, la reconstruction du rendu et la séquence ; les échanges sont parcourus par défilement. Aucun autre navigateur de validation ni enregistrement vidéo pendant ces mesures. Les valeurs du tableau sont les médianes des trois répétitions.

| Scène | Nœuds DOM V15 → V15.1 | Cartes V15 → V15.1 | p95 rAF V15 → V15.1 |
|---|---:|---:|---:|
| Choix IA simple | 372 → 395 | 1 → 1 | 16,7 → 16,8 ms |
| Confrontation | 377 → 428 | 2 → 2 | 16,8 → 16,8 ms |
| Composition d’échange | 439 → 1712 | 0 → 24 | 16,7 → 16,8 ms |

Le coût supplémentaire des échanges est explicite : le formulaire précédent affichait des options textuelles ; le nouveau rend jusqu’à **douze cartes par collection**, avec les deux grilles présentes dans le DOM et un seul panneau visible sur téléphone. La pagination borne ce coût, mais ce changement ne constitue pas une réduction du DOM. Les cartes cachées dans un panneau ne sont pas animées.

Aucune longue tâche ni intervalle supérieur à 33,34 ms dans les fenêtres échantillonnées. Le maximum ponctuel atteint **33,3 ms** pendant une confrontation dans chacune des versions. Les heaps médians passent approximativement de **3,26 à 3,34 Mo** au choix, **2,65 à 2,74 Mo** à la confrontation et **3,01 à 2,91 Mo** aux échanges ; le garbage collector influence ces valeurs.

**Aucun gain de FPS, de mémoire, d’autonomie ou de température n’est démontré.** Les écarts de 0,1 ms ne sont pas significatifs. Les rAF de ce navigateur ne mesurent pas tout le pipeline GPU et ne garantissent pas les performances d’un téléphone. Les mesures ne représentent ni de grandes images distantes ni une connexion mobile réelle.

## Captures et reproduction

[Comparaison visuelle](artifacts/comparison.html) · [combat filmé](artifacts/combat-preview.webm) · [échanges filmés](artifacts/trades-preview.webm). Les captures comparatives cadrent les contrôles utiles à chaque interface ; la position de défilement diffère lorsque la nouvelle mise en page le nécessite.

```sh
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs tests/v14/*.test.mjs tests/v15/*.test.mjs tests/v15-1/*.test.mjs
npm install --prefix /tmp/mashup-ui-validation --no-audit --no-fund --ignore-scripts playwright-core@1.64.1
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-1/browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-1/demos.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v15-1/performance.cjs
```

Node 24, Chromium (`/usr/bin/chromium` ou `CHROMIUM_PATH`), Git contenant la référence et `tar` sont requis. ffmpeg produit les WebM à partir du screencast. Les performances doivent être exécutées seules et en dernier. Le workflow GitHub `Frontend regression tests` exécute la suite Node ; il ne publie rien. Le statut CI distant doit être vérifié séparément dans GitHub.

## Avant publication

- Revue artistique et test réel Safari/iPhone et Chrome/Android : tactile, pointercancel, safe areas réelles, veille/reprise, orientation, chauffe et sessions longues.
- Supabase de préproduction indépendant : deux vrais clients PvP, Double et Parimatch, absence de double exécution économique, permissions et reprise après perte d’une réponse.
- Concurrence réelle des échanges et des inventaires, évolutions de collection pendant une contre-offre, cartes retirées ou archivées pendant l’échange.
- Validation explicite de la fusion. Aucun résultat de restauration Supabase ou de fonctionnement natif n’est revendiqué.
