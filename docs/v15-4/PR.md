La V15.4 ajoute Mashup Match et améliore l’arène, les matières des cartes, l’ouverture tactile des boosters, le compteur du Casino et la fiabilité des actualisations.

Mashup Match possède un vrai moteur déterministe, 100 niveaux dans dix mondes, bonus combinables, cascades, obstacles, progression et éditeur économique. Les cent grilles canoniques ont chacune un parcours gagnant vérifié. Un entraînement local explicitement sans crédits fonctionne si le service de campagne n’est pas activé ; aucune victoire client ne donne de crédit réel.

L’arène conserve ses règles et ses requêtes serveur. Le Casino affiche son horloge avant le direct et recalcule l’heure depuis le serveur. Les actualisations sont différées pendant parties/transactions, et un changement de compte pendant la lecture Auth bloque l’envoi d’une ancienne action.

Les sources du catalogue, illustrations, fragments économiques et corrections V15.3.1 sont protégées par comparaison à `f82a8cd`. Aucun joueur réel, tirage, inventaire ou solde n’a été modifié.

Validation : suites Node du client et du backend privé, scénarios Chromium de campagne, économie, Casino à deux comptes, combats IA/PvP, échanges, boosters et PWA. Les preuves, captures, vidéos et mesures comparatives se trouvent dans `docs/v15-4/validation.md` et `docs/v15-4/performance.md`.

**Publication coordonnée bloquée** : les fonctions Supabase exactes n’ont pas pu être récupérées. Le service privé est implémenté et testé hors du dépôt public, mais son raccordement au routeur authentifié, à la transaction SQL et au miroir du portefeuille reste à vérifier. Aucune migration ou fonction n’est déployée. Voir `docs/v15-4/release-plan.md` avant toute fusion/publication présentée comme une V15.4 complète.
