# V16 — validation et résultats mesurés

## Résultats fonctionnels

- **413/414 tests Node**, aucune erreur, aucun test ignoré ; référence initiale **391/391**. [Journal final](unit-results.txt), [référence](baseline-unit-results.txt).
- **16 scénarios d’interface** : 320×568, 360×640, 390×844, 430×932 et 1280×800 ; structure fixe, filtres/historique, achat annulé/échoué/en attente, retour navigateur pendant transaction, état complet/partiel, sélection/prix de vente, accès administrateur, booster, Match petit écran, confidentialité, Memory et logout. [Preuve](artifacts/browser-results.json).
- **13 scénarios de régression** : quatre manches IA Classique/Double sur trois tailles, PvP hôte/invité, ordre des statistiques, adversaire caché avant révélation, reprises réseau, échanges/contre-offres/quantités et résultats fournis par le serveur. [Preuve](artifacts/regression-results.json).
- **7 vérifications Casino**, deux comptes fictifs, horloges locales −2 min / +4 h : même échéance serveur, reprise, clôture des paris et résultats. [Preuve](artifacts/casino-browser-results.json).
- **19 vérifications Match/booster/galerie** avec service privé en mémoire : geste continu sans requête, annulations, coup unique en attente, récompense fictive confirmée, lecture publique minimale, comptes séparés, récupération de booster et listeners stables après cinq remontages. [Preuve](artifacts/match-browser-results.json).
- **6 comparaisons de faces**, une par rareté, à 240×340 px : **0 pixel différent**, animations figées dans les deux versions. Il s’agit de cartes fictives rendues par le vrai moteur, pas d’une comparaison de tout le catalogue animé. Le contrôle des fichiers protège en plus tous les matériaux, illustrations, données et moteurs. [Preuve](artifacts/card-comparison.json).

## Protocole réseau reproductible

`tests/v16/network-browser.cjs` sert successivement la référence publiée et la V16 depuis un serveur HTTP local. Le test remplace uniquement les adresses des services et autorise ses URLs d’images locales dans une copie de test du HTML. Auth et API sont fictives ; toutes les adresses HTTPS externes sont bloquées avant chargement. Aucun routage Playwright ne désactive le cache HTTP.

Le catalogue contient **360 cartes fictives**, des métadonnées identiques et des URLs d’images séparées. Chaque illustration a les mêmes **46 483 octets PNG (512 px)** dans les deux versions ; elles ne reproduisent pas la distribution des images réelles. Les JSON ne sont pas compressés. Les en-têtes d’images sont configurés par le laboratoire, pas observés en production.

Les colonnes suivantes sont des **octets de corps de réponse réellement servis localement**, sans en-têtes. « Supabase » et « GitHub » désignent les catégories simulées. **Ce ne sont pas les compteurs d’egress du vrai projet.** [Données brutes et routes](artifacts/network-results.json).

| Mesure | V15.7.2 | V16 |
|---|---:|---:|
| Démarrage : JSON Supabase (octets) | 252 108 | 252 108 |
| Démarrage : requêtes JSON Supabase | 4 | 4 |
| Démarrage : illustrations Supabase (octets) | 139 449 | 0 |
| Démarrage : illustrations téléchargées | 3 | 0 |
| Démarrage : fichiers GitHub (octets) | 1 154 705 | 1 219 127 |
| Démarrage : fichiers GitHub (requêtes) | 75 | 79 |
| Navigation Accueil → Collection → Marché → Accueil : JSON supplémentaire (requêtes / octets) | 2 / 900 | 2 / 900 |
| Même navigation répétée à chaud : JSON supplémentaire (requêtes / octets) | 1 / 876 | 0 / 0 |
| Achat supplémentaire après navigation : JSON supplémentaire (requêtes / octets) | 5 / 260 204 | 2 / 7 344 |
| Session cumulée : JSON Supabase (requêtes) | 23 | 19 |
| Session cumulée : JSON Supabase (octets) | 807 058 | 553 322 |
| Session cumulée : illustrations Supabase (octets) | 1 533 939 | 1 533 939 |

Démarrage, toutes catégories du laboratoire réunies : **1 546 433 → 1 471 406 octets de corps**. Le SDK Auth de test (171 octets) est inclus. CDP mesure séparément **1 564 697 → 1 489 901 octets encodés** avec les en-têtes HTTP locaux.

Session cumulée, toutes catégories du laboratoire réunies : **3 505 620 → 3 316 306 octets de corps**. Le SDK Auth de test (171 octets) est inclus. CDP mesure séparément **3 534 514 → 3 345 290 octets encodés** avec les en-têtes HTTP locaux.

La session cumulée comprend le démarrage, les deux navigations, un achat, un booster de trois cartes, un combat IA de quatre manches et le retour à l’accueil. Les requêtes CDP globales incluent aussi les tentatives externes bloquées et une sonde de cache ; les compteurs par source listent uniquement ce que le serveur local a envoyé.

**Interprétation :** la V16 ajoute du code statique et quatre requêtes GitHub au démarrage. Elle diffère le téléchargement des trois illustrations décoratives de l’ancien accueil ; elle ne réduit ni leur résolution ni leurs octets. Sur la session entière, les mêmes 33 illustrations sont téléchargées. Les économies JSON viennent du cache de présentation et du bootstrap évité lorsque la réponse d’achat est complète. **Le catalogue initial n’est pas allégé.**

Sur la deuxième navigation, **aucune illustration n’est téléchargée à nouveau**. Une sonde `fetch` sur une illustration déjà vue reçoit ses 46 483 octets avec **0 nouvelle requête au serveur** dans les deux versions. Le cache d’images fonctionnait déjà dans la référence : ce résultat ne constitue donc pas un nouveau gain propre à V16.

## Fluidité et mémoire

Chromium Linux, viewport 390×844, GPU désactivé, cache natif, essais séquentiels sans vidéo ou autre suite simultanée. Fenêtres de 90 intervalles `requestAnimationFrame`. Une fenêtre supplémentaire utilise une limitation CPU ×4. Mesures locales uniques, sans valeur statistique de benchmark matériel Android.

| Mesure | V15.7.2 | V16 |
|---|---:|---:|
| Accueil : intervalle p95 (ms) | 16.7 | 16.8 |
| Accueil CPU ×4 : intervalle p95 (ms) | 16.8 | 16.8 |
| Collection en défilement : intervalle p95 (ms) | 16.7 | 16.8 |
| Nœuds DOM de l’accueil | 658 | 393 |
| Heap JS observé à l’accueil (octets) | 4 916 287 | 5 675 822 |

Aucun intervalle supérieur à 33,34 ms ni tâche longue n’a été observé dans les fenêtres d’accueil mesurées. Le rAF ne mesure pas tout le coût GPU ou compositeur. Le heap varie avec le GC : cette observation ne démontre pas un gain mémoire ni une absence de fuite ; le nouveau code peut augmenter le heap de démarrage. Les caches sont bornés et les cycles de montage de Match gardent un nombre stable de listeners.

Les délais « automationToTwoFramesMs » dans les données brutes incluent l’attente d’actionnabilité de Playwright et deux frames après la navigation. Ils décrivent le scénario automatisé, pas une mesure instrumentée du délai tactile ou de latence réseau réelle :

- Collection : 81.6 ms → 82.2 ms.
- Marché : 106.2 ms → 90.3 ms.
- Retour accueil : 149.3 ms → 68.9 ms.

## Limites et points restant à valider avant production

- Aucun téléphone Android/iPhone physique, Safari iOS, clavier matériel réel, achat de joueur ou installation PWA n’a été testé. Le manifeste et les contrats de mise à jour sont contrôlés ; le cache Auth et le stockage d’entraînement existants ne sont pas effacés.
- Aucun accès aux Edge Functions réellement déployées, aux SQL/RLS, aux en-têtes réels des illustrations ou aux métriques Supabase. Aucune affirmation de sécurité backend ou d’économie de facture réelle.
- L’administration est parcourue et ses formulaires restent présents ; les opérations d’administration réelles (création de comptes, réglages, modifications de catalogue) n’ont pas été exécutées.
- Les petits TTL concernent la présentation. Une annonce peut évoluer avant l’achat ; sa disponibilité et son prix effectif restent contrôlés par le serveur.
- Le cache de catalogue différentiel et les changements de headers serveur nécessitent un développement backend privé distinct, décrit dans l’audit.
- Vérifier sur préproduction les réponses de chaque version déployée : une réponse partielle reprend volontairement le chemin bootstrap et réduit le gain réseau.

## Livraison et retour arrière

Branche dédiée uniquement. Aucun changement des sources de rendu des cartes, des fichiers `assets/`, `content/`, des fragments `backend/` ou des données Supabase. Aucun déploiement. Consulter `README.md` pour les critères de publication et le retour à la référence sans toucher à la base.
