Les séries pouvaient conserver un nombre manuel après modification du catalogue. La collection, les numéros affichés et les récompenses peuvent désormais utiliser une projection commune des cartes normales actives et uniques. Les Secrètes gardent leur numéro hors série ; les numéros historiques et références des joueurs restent inchangés.

Le catalogue source Convergence contient exactement 100 cartes normales et dix Power Rangers. La proposition conserve les 100 identifiants, prépare dix archives réversibles et ramène ce fichier à 90 normales actives, sans Secrète. Le jeu charge son catalogue depuis Supabase : ces nombres ne sont pas présentés comme un inventaire de production et aucune carte réelle n’a été archivée.

Validation : 210/210 tests Node, 11 vérifications navigateur isolées du catalogue et 15 scénarios de régression des combats, échanges et onglets. Sont notamment couverts l’ajout, l’archivage/restauration, les Secrètes, la série vide, le changement de compte et les réponses partielles/tardives. Les preuves et captures sont dans `docs/catalogue/validation.md`.

Les fragments backend disponibles utilisent le même moteur, sans changement des montants ou clés de réclamation. Le routeur Supabase complet manque : son intégration, les contrôles d’acquisition, le préflight des références et un test réel de restauration restent nécessaires avant déploiement. Voir `docs/catalogue/backend-integration.md` et `docs/catalogue/inventory.md`.

Ne pas fusionner, publier ou exécuter l’archivage de production sans validation de l’utilisateur.
