# Retour à l’interface Mashup V15.7.2

Le 7 novembre 2026, le propriétaire a demandé de republier la version précédente après avoir signalé que la V16 ne fonctionne pas sur certains mobiles.

- Référence rétablie : `79172e1e11b5b529009d23f0357c5e923954f32c` (V15.7.2).
- Version remplacée : `d3f9973a61d5c10ae7976dc14e67750fcf6d81ce` (V16.0.0).
- Branche de retour arrière : `fix/restore-v15-7-2-mobile`.
- La branche `feature/mashup-v16-mobile-shell` conserve la V16 pour une éventuelle correction ultérieure. Aucun historique Git n’est réécrit.

## Numéro technique et cache

L’interface, les fonctions et les règles rétablies sont celles de V15.7.2. Le numéro technique de mise à jour est **16.0.1** : l’updater déjà présent dans la V16 ne propose que les versions supérieures. Les paramètres de version des ressources sont renouvelés pour éviter de mélanger le HTML rétabli avec les ressources V16 en cache. Aucun stockage Auth, inventaire ou entraînement n’est effacé.

La comparaison des fichiers de production avec la référence confirme que les différences se limitent aux métadonnées de version et à leurs références d’import. Les différences supplémentaires concernent les attentes de version des tests, leur déclenchement sur la branche de retour arrière et ce dossier de preuves.

## Vérifications

- [391/391 tests automatisés réussis](unit-results.txt).
- [Trois parcours navigateur réussis](browser-results.txt), aux tailles 320×568, 390×844 et 1280×800 : ancien accueil, collection, marché, Match en entraînement et retour à l’accueil.
- Données fictives et requêtes interceptées uniquement. Aucun téléphone physique ni backend déployé testé.
- Cartes, illustrations, catalogue, fonctions Supabase et données de joueurs inchangés. Aucune migration ou restauration de base.

La publication utilise un nouveau commit sur `main` par avance rapide. Son résultat doit être confirmé par le workflow officiel « pages build and deployment ». L’accès direct à GitHub Pages reste bloqué par le réseau de cet environnement ; la réussite du workflow est distincte d’un essai sur les mobiles concernés.
