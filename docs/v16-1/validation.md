# Validation, performances et limites

Mesures du 7 novembre 2026. Référence publiée rétablie `2043148` = interface V15.7.2, numéro technique 16.0.1. Comparaison avec le brouillon V16.1, pas avec l’interface V16 abandonnée.

## Méthode

Chromium 155 Linux headless, Playwright 1.64.1, rendu GPU désactivé, tactile/dimensions simulés. Chaque version démarre dans un contexte indépendant avec les mêmes 36 cartes et le même inventaire fictifs. Trois répétitions alternées par version et par format, 390×844 et 1280×800 ; 90 intervalles requestAnimationFrame pendant le défilement de l’accueil, puis 60 dans la collection. Aucun autre parcours/encodage vidéo exécuté en parallèle des mesures.

Le harnais intercepte tout appel externe, y compris Auth, Supabase, polices et CDN. Il ne contacte aucun compte réel. Les interceptions désactivent le cache HTTP de Chromium. Les illustrations réelles ne sont ni retéléchargées de production ni évaluées sur réseau mobile. Les tailles locales décodées, disponibles dans le JSON brut, ne sont pas des octets compressés envoyés par GitHub/CDN. Aucun résultat de batterie, mémoire GPU, coût Postgres ou egress de production n’est déduit de ces mesures.

Données complètes : [performance-results.json](artifacts/performance-results.json). La mesure des intervalles rAF n’est pas un test de charge sur Android bas de gamme ni une mesure exhaustive du temps de rendu GPU.

## Résultats observés

| Mesure | V15.7.2 | V16.1 | Lecture |
| --- | ---: | ---: | --- |
| Éléments DOM accueil, mêmes données | 674 | 439 | −34,9 %, retrait de la grande présentation de cartes |
| Éléments DOM collection | 1 666 | 1 695 | +29 pour le panneau de raretés |
| p95 rAF accueil, trois passages/format | ~16,8 ms | ~16,8 ms | pas de régression constatée dans ce laboratoire |
| Rechargement du catalogue pour le panneau de raretés | 0 | 0 | calcul sur le catalogue déjà présent |
| GET existant de récompenses lors d’ouverture collection | 1 | 1 | conservé, pas attribué au nouveau panneau |
| GET sociaux au démarrage en mode historique | invitations | invitations + échanges | coût additionnel nécessaire aux notifications globales |

Les filtres de collection, le passage album/classique et les filtres/recherche de joueurs ne déclenchent pas de requête supplémentaire dans les scénarios dédiés. Les images, styles et modules des cartes sont inchangés ; leur coût par carte n’est pas prétendu réduit.

## Réseau et coût des notifications

Le démarrage fictif conserve exactement le même corps bootstrap (24 172 octets dans la fixture) et ajoute la liste d’échanges (68 octets quand elle est vide avec le seul partenaire fictif). Les valeurs varient avec les vrais comptes. Le nouveau service social optionnel ne transfère ni catalogue, ni inventaire, ni illustrations, ni solde.

[network-results.json](artifacts/network-results.json) compare 50 propositions fictives identiques :

| Corps JSON sans compression | Octets |
| --- | ---: |
| Liste historique complète des 50 échanges | 28 950 |
| Projection sociale privée, sans détails des cartes/crédits | 8 440 |
| Projection inchangée | 113 |

Ce n’est pas une économie mesurée sur Supabase. Un autre joueur qui renouvelle son bail change la projection de présence ; les notifications ou taux peuvent aussi changer. Le corps « inchangé » n’est donc pas garanti à chaque appel.

Mode historique livré : GET échanges global toutes les 45 s en premier plan ; les GET déjà effectués par le marché alimentent directement la cloche. Invitations : cadence historique conservée, 90 s globalement / 30 s sur les écrans en ligne. Les appels simultanés identiques sont regroupés. Le bilan réseau global augmente sur les pages qui n’avaient aucune notification d’échange auparavant ; il n’est pas présenté comme une baisse générale d’egress.

Service optionnel : une synchronisation sociale légère visible toutes les 30 s, baux 90 s, inactivité après 120 s ; Realtime privé éventuel en signal d’invalidation. Aucun sondage périodique caché. Un dernier statut inactif peut être envoyé au passage en arrière-plan. Les nouvelles lectures sont acquittées explicitement, indépendamment des transactions d’échange. Les paramètres inchangés ne sont pas retransmis. Aucun abonnement public où le client choisit librement l’identité d’un autre joueur.

Les GET sociaux et pulses expirent côté transport après 12 s ; le contrôleur borne aussi l’attente totale à 15 s. Les actions économiques conservent leur traitement/reprise existant. Une écriture invalide les GET en vol pour tous leurs consommateurs ; une deuxième mutation pendant la relecture provoque une erreur contrôlée au lieu d’appliquer un solde périmé.

## Reproduire

Depuis la racine du dépôt, Node 24 et Git avec l’historique de référence disponible :

```sh
node --test --test-isolation=none tests/phase-0/reference.test.mjs tests/mobile/presentation.test.mjs tests/v14/*.test.mjs tests/v15/*.test.mjs tests/v15-1/*.test.mjs tests/catalogue/*.test.mjs tests/v15-3/*.test.mjs tests/v15-4/*.test.mjs tests/v15-5/*.test.mjs tests/v15-6/*.test.mjs tests/v15-7/*.test.mjs tests/v16-1/*.test.mjs
```

Installer Playwright **hors du projet**, sans modifier les dépendances du jeu :

```sh
npm install --prefix /tmp/mashup-ui-validation playwright-core@1.64.1
```

Fournir `CHROMIUM_PATH` si Chromium n’est pas dans `/usr/bin/chromium`. Puis, séparément et séquentiellement :

```sh
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v16-1/browser.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v16-1/regression.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v16-1/interruptions.cjs
NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v16-1/performance.cjs
```

Pour les scénarios facultatifs qui emploient le service privé en mémoire :

```sh
MASHUP_SOCIAL_FIXTURE_MODULE=/workspace/mashup-backend-private/social-v161/fixture-service.mjs NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v16-1/social-integration.cjs
MASHUP_SOCIAL_FIXTURE_MODULE=/workspace/mashup-backend-private/social-v161/fixture-service.mjs NODE_PATH=/tmp/mashup-ui-validation/node_modules node tests/v16-1/network.cjs
node --test /workspace/mashup-backend-private/social-v161/security.test.mjs
```

Ces scripts échouent sans chemin explicite ; aucune redirection automatique vers un serveur réel. Ils ne sont pas exécutables depuis le seul dépôt public sans le paquet privé. Le workflow public exécute les tests Node et les scénarios navigateur compatibles avec l’API historique, sans secret Supabase.

## Validation restant à faire

- Android réel concerné par la régression V16, iPhone Safari et installation sur écran d’accueil.
- Contrats exacts des fonctions déployées, mapping Auth/compte, taux réellement retournés aux joueurs, restauration isolée, migration SQL, RLS, vérification des permissions des canaux privés et envoi événementiel réel.
- Compteurs après administration réelle sur une base de test ; transactions concurrentes entre deux comptes fictifs sur cette base.
- Mesures cache chaud/froid sur hébergement réel, compression, images/CDN, réseau mobile et logs d’egress Supabase avec accord approprié.
- Création effective de la PR et résultat du workflow GitHub à confirmer dans l’état de livraison ; les succès locaux ne constituent pas un succès CI distant.
