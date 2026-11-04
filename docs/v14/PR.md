# V14 — Le Sanctuaire : cartes, ouverture cinématique et interface mobile

Mashup V13.0.1 affiche désormais des cartes SVG/CSS reconstruites autour de six matériaux et quatre finitions, dans une interface Sanctuaire centrée sur la collection. L'ouverture passe par un paquet scellé, des révélations différenciées et un récapitulatif avant la confirmation existante.

Le frontend conserve les contrats API et les corps transactionnels de préparation/confirmation des boosters. Aucun backend, catalogue, illustration de joueur, prix, taux ou donnée réelle n'est modifié. Branche créée depuis main b20fb58 ; aucun déploiement inclus.

Validation : 70 tests Node réussis ; Chromium avec API fictives aux largeurs320/390/768/1440 ; galerie24 finitions ; inspection souris/clavier/reduced ; campagne fictive4 manches ; landings marché/échanges/profil/jeux/atelier/admin ; booster avec un prepare/un commit ; zéro erreur console relevée. Captures, WebM et résultats reproductibles : docs/v14/README.md.

Performance mesurée uniquement en Chromium headless Linux sans GPU : collection24 cartes, médiane/p95 rAF16,7/16,8ms identiques à main ; DOM1405→1646, heap indicatif variable selon le garbage collector. Aucun gain de FPS ni validation téléphone physique revendiqués. La pagination conserve les nœuds déjà affichés et les nouveaux cadres n'ont aucune animation autonome.

Avant déploiement : préproduction indépendante, tests Safari/Android physiques et validation des opérations réelles concurrentes. Les garanties backend et la restauration Supabase ne sont pas certifiées par les tests fictifs.
