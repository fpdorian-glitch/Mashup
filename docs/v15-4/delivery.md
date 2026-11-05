# Livraison V15.4

État préparé le 5 novembre 2026, Europe/Paris.

- Branche : `feature/mashup-v15-4-grand-update`.
- Dernière version de `main` intégrée et vérifiée par `git fetch origin main` : `d486c862fc3c27f467cc7aaeb282dcb3f87352fd` (V15.3.2).
- Client V15.4.0, tests, captures, vidéos, contrats et procédure de retour arrière préparés dans cette branche.
- Service Match privé dans `/workspace/mashup-backend-private`, hors du dépôt public, avec historique Git local sans remote. Paquet de revue local : `review/mashup-match-v15.4-private.tar.gz`, empreintes dans `review/SHA256SUMS` et `review/manifest.json`. Ce paquet ne contient aucune donnée de production, clé secrète ou source déployée.

La publication de la branche et la création de la PR seront consignées après leur tentative. Le texte de PR est prêt dans [PR.md](PR.md).

**Aucune fusion dans `main`, publication GitHub Pages, migration ou fonction Supabase déployée.** Les sources backend exactes et la connexion Supabase officielle manquent ; voir [les conditions de publication](release-plan.md). Les [résultats de validation](validation.md) distinguent les tests exécutés des vérifications de production restantes.
