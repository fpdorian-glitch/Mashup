# Mashup V16 — interface mobile fixe et transferts réseau allégés

L’interface cumulait de longues pages, dispersait les modes et rechargeait le catalogue après des achats déjà accompagnés d’un état confirmé. La V16 ajoute cinq destinations permanentes, un accueil centré sur les boosters, un historique natif protégé et des sous-écrans pour la collection, le marché, les jeux et l’administration.

Les lectures identiques sont regroupées, quelques réponses de présentation restent brièvement en RAM par session, et le bootstrap après achat/échange est évité uniquement lorsque la réponse contient un état de compte complet et valide. Le repli vers le bootstrap est conservé. Les écritures, taux, cartes, règles, récompenses et fonctions Supabase restent inchangés.

Validation : 414 tests Node ; scénarios Chromium de navigation, retours, erreurs réseau, compte, marché, IA/PvP, échanges, Casino, Memory, Match et booster ; comparaison de pixels sur six faces de cartes. Comparatif réseau natif avant/après avec les mêmes illustrations et un catalogue fictif de 360 cartes, cache HTTP actif. Détails, limites et preuves dans `docs/v16/README.md` et `docs/v16/validation.md`.

Aucune publication, migration, modification d’un compte réel ou opération Supabase. Le backend déployé, les en-têtes de cache de production et les téléphones physiques restent à vérifier avant la mise en production. Ne pas fusionner automatiquement cette PR.
