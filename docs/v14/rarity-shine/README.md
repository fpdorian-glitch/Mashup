# Brillances par rareté — preuves locales V14.0.2

Le test [rarity-shine.cjs](../../../tests/v14/rarity-shine.cjs) est passé dans Chromium le 5 novembre 2026. Les résultats détaillés sont dans [report.json](report.json).

Les 24 cartes utilisent **la même illustration procédurale originale**, les mêmes cinq statistiques et le vrai `renderMashupV10Card`. Le test charge les styles réels de `index.html`. Les comptes, soldes et réponses API sont fictifs ; toutes les requêtes distantes sont interceptées localement.

| Rareté | Matière | Énergie | Opacité active, lumière .46 | Opacité active, lumière .64 |
|---|---|---:|---:|---:|
| Commune | Satin doux | .16 | .0736 | .1024 |
| Rare | Métal brossé | .42 | .1932 | .2688 |
| Épique | Diffraction améthyste en éventail | .64 | .2944 | .4096 |
| Légendaire | Doubles rubans d’or poli | .88 | .4048 | .5632 |
| Mythique | Facettes de chrome et braises | 1.08 | .4968 | .6912 |
| Ultra | Spectre cristallin et points lumineux | 1.28 | .5888 | .8192 |

Ces opacités ont été contrôlées dans les **styles calculés par le navigateur**, pour les quatre variantes Classique, Full Art, Gold et Secrète, en inspection et au survol actif. Chaque variante conserve six signatures de fond différentes. Les reflets Secrète et Ultra Secrète restent verts ; les finitions ne changent pas l’échelle d’énergie.

## Contrôles réussis

- Les 24 cartes conservent exactement leur source d’illustration et leurs cinq valeurs visibles après changement d’éclairage et de mode.
- La Commune possède un reflet visible mais discret en qualité haute.
- Les reflets disparaissent en qualité éco, avec `prefers-reduced-motion: reduce` et avec le marqueur hors écran `v12-offscreen`.
- Dans le vrai écran d’inspection, les cartes Rare et Ultra Secrète suivent les événements souris, clavier et tactiles Chromium ; les images et statistiques restent identiques.
- Le mode mouvement réduit du jeu passe en éco et garde l’inclinaison à zéro. Le réglage éco du menu masque aussi le reflet en inspection.
- Aucune erreur JavaScript ou console ; aucun appel réel de production, ouverture de booster ou combat.

## Captures sans retouche

- [Planche des 24 cartes](rarity-matrix.png).
- Même éclairage, six raretés : [Classique](standard-same-light.png), [Full Art](full_art-same-light.png), [Gold](gold-same-light.png), [Secrète](secret-same-light.png).
- [Vidéo des six raretés](six-rarities-motion.webm) : 48 trames réellement capturées dans Chromium, avec leurs horodatages ; pas d’images recréées entre les trames.

L’examen visuel des planches Classique et Secrète confirme des matières distinctes. La finition Ultra est volontairement forte ; le sujet et les reliefs de l’illustration restent reconnaissables dans cette scène locale.

## Rejouer

```sh
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v14/rarity-shine.cjs
```

Le laboratoire utilise `/usr/bin/chromium`, `playwright-core` et `ffmpeg`. Les preuves sont produites dans ce dossier. Le test n’écrit aucune donnée distante.

Limites : navigateur Chromium headless sous Linux ; aucune validation sur Android/iPhone physique, Safari, températures ou consommation de batterie. Le garde hors écran est contrôlé par son marqueur CSS réel, sans tester le déclenchement de l’observateur de visibilité. L’identité de la source de l’illustration et la visibilité des statistiques ne mesurent pas à elles seules le contraste perçu de toutes les illustrations du catalogue.
