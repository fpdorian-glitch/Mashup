# Publication de Mashup 15.1.0

La demande « Publie la prochaine version » autorise la fusion et la publication de la V15.1 préparée. Les mentions de non-publication dans les rapports précédents décrivent la préparation avant cette autorisation.

- Version à publier : **15.1.0 — Arena Reborn et échanges visuels**.
- Référence de production précédente : `19375ce` (V15).
- Livraison vérifiée : `8b0d7db`, incluant les fonctionnalités `e6c6f95` et leurs preuves.
- Contrôle de publication : **138 tests unitaires réussis**, puis **15 groupes navigateur et démonstrations réussis** sur une archive exacte de la livraison, dans un répertoire isolé.
- Aucune requête Supabase réelle pendant ces vérifications. Backend, catalogue, illustrations et données de joueurs inchangés.

La publication utilise la configuration existante GitHub Pages, **main / racine** : fusion Git en avance rapide puis envoi de main, sans réécriture d’historique et sans migration de données.

L’API GitHub refuse la création automatique de PR dans cet environnement. La page publique [GitHub Actions](https://github.com/fpdorian-glitch/Mashup/actions) permet de suivre le build Pages. L’accès HTTPS direct à l’URL du jeu est bloqué par le réseau de l’environnement ; il ne constitue donc pas ici une preuve de vérification du site servi.

Site : https://fpdorian-glitch.github.io/Mashup/
