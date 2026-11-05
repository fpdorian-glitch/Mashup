# Livraison V15.4

État préparé le 5 novembre 2026, Europe/Paris.

- Branche : `feature/mashup-v15-4-grand-update`.
- Dernière version de `main` intégrée et vérifiée par `git fetch origin main` : `d486c862fc3c27f467cc7aaeb282dcb3f87352fd` (V15.3.2).
- Client V15.4.0, tests, captures, vidéos, contrats et procédure de retour arrière préparés dans cette branche.
- Service Match privé dans `/workspace/mashup-backend-private`, hors du dépôt public, avec historique Git local sans remote. Paquet de revue local : `review/mashup-match-v15.4-private.tar.gz`, empreintes dans `review/SHA256SUMS` et `review/manifest.json`. Ce paquet ne contient aucune donnée de production, clé secrète ou source déployée.

## État GitHub observé

- **Branche poussée avec succès** : `git push -u origin feature/mashup-v15-4-grand-update`. Le code et les preuves sont enregistrés au commit `ae08c27` ; une mise à jour documentaire finale consigne le présent statut.
- [Branche sur GitHub](https://github.com/fpdorian-glitch/Mashup/tree/feature/mashup-v15-4-grand-update).
- **PR non créée** : la commande `gh pr create --draft` a retourné `Post "https://api.github.com/graphql": Forbidden`. L’API GitHub n’est pas dans les destinations permises de cet environnement. Aucun contournement réseau tenté.
- [Formulaire de création de la PR](https://github.com/fpdorian-glitch/Mashup/compare/main...feature/mashup-v15-4-grand-update?expand=1) ; texte complet disponible dans [PR.md](PR.md).
- Le workflow de tests du client est configuré pour cette branche. Son exécution distante n’a pas pu être consultée via l’API ; les 319 tests locaux sont observés et leur sortie est conservée.

**Aucune fusion dans `main`, publication GitHub Pages, migration ou fonction Supabase déployée.** Les sources backend exactes et la connexion Supabase officielle manquent ; voir [les conditions de publication](release-plan.md). Les [résultats de validation](validation.md) distinguent les tests exécutés des vérifications de production restantes.
