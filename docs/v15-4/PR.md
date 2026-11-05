La V15.4 ajoute Mashup Match et améliore l’arène, les matières des cartes, l’ouverture tactile des boosters, le compteur du Casino et la fiabilité des actualisations.

Mashup Match possède un vrai moteur déterministe, 100 niveaux dans dix mondes, bonus combinables, cascades, obstacles, progression et éditeur économique. Les cent grilles canoniques ont chacune un parcours gagnant vérifié. Un entraînement local explicitement sans crédits fonctionne si le service de campagne n’est pas activé ; aucune victoire client ne donne de crédit réel.

Les derniers changements de `main` (V15.3.2) sont intégrés : confirmation automatique et récupération des ouvertures. Le bilan reste affiché après sécurisation.

L’arène conserve ses règles et ses requêtes serveur. Le Casino affiche son horloge avant le direct et recalcule l’heure depuis le serveur. Les actualisations sont différées pendant parties/transactions, et un changement de compte pendant la lecture Auth bloque l’envoi d’une ancienne action.

Les sources du catalogue, illustrations, fragments économiques et corrections V15.3.1 et les protections de boosters V15.3.2 sont conservées depuis `d486c86`. Aucun joueur réel, tirage, inventaire ou solde n’a été modifié.

Validation locale : 319/319 tests Node client, 26/26 tests du service privé, 36 scénarios/contrôles Chromium et galerie de 24 cartes. Les cent niveaux canoniques ont un transcript gagnant vérifié. Comparaison séquentielle V15.3.2/V15.4 : p95 médian d’inspection 33,3 → 16,7 ms ; deux passages de booster gardent une tâche longue de 55/86 ms. Tests sur données fictives, API interceptées et service privé transactionnel en mémoire ; aucun téléphone physique ou Safari iOS testé. Preuves, captures, vidéos et mesures dans `docs/v15-4/validation.md` et `docs/v15-4/performance.md`.

**Publication coordonnée bloquée** : les fonctions Supabase exactes n’ont pas pu être récupérées. Le service privé est implémenté et testé hors du dépôt public, mais son raccordement au routeur authentifié, à la transaction SQL et au miroir du portefeuille reste à vérifier. Aucune migration ou fonction n’est déployée. Voir `docs/v15-4/release-plan.md` avant toute fusion/publication présentée comme une V15.4 complète.
