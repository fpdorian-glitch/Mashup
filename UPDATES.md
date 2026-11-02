# Publier une mise à jour de Mashup (à partir de V10.2)

Mashup est hébergé sur GitHub Pages. Les comptes, collections et crédits sont dans Supabase et ne dépendent pas du cache de l'écran d'accueil.

## Invariants du système de mise à jour

Chaque nouvelle mise en ligne doit modifier **ensemble, dans la même PR GitHub** :

1. `version.json` : augmenter `version` (par exemple `10.3.0`), changer `notes`.
2. `index.html` : augmenter `<meta name="mashup-version" content="10.3.0">`.
3. `index.html` : changer les paramètres `?v=` des fichiers CSS/JS modifiés pour invalider le cache de Safari.
4. `09-mashup-updates.js` : augmenter `CURRENT_VERSION`, puis changer son `?v=` dans `index.html`.
5. Garder le chargement du contrôleur de versions dans `index.html` pour les nouvelles visites.

**Déployer et vérifier GitHub Pages** avant d'annoncer la version aux joueurs.
Ne jamais effacer `localStorage`, révoquer les sessions Supabase ou supprimer les données utilisateurs pour mettre à jour des assets statiques.

## Fonctionnement sur iPhone

- Au démarrage, au retour dans l'application et périodiquement (toutes les 4 minutes lorsqu'elle est au premier plan), le contrôleur lit `version.json` avec `cache: 'no-store'` et un paramètre unique.
- Si la version distante est plus récente, il propose une mise à jour. Aucune partie active n'est interrompue sans validation.
- Au clic, il vérifie que la nouvelle version de `index.html` est déjà publiée, puis ouvre l'URL courante en ajoutant `mashup_build` et `refresh` pour éviter l'ancien cache HTML.
- Le bouton ⟳ dans la barre supérieure permet de vérifier les mises à jour manuellement.
- **Premier passage depuis une V10.1 ou antérieure :** l'ancien code n'a pas le contrôleur. Il peut être nécessaire de lancer une première fois le site via Safari ou d'actualiser/réinstaller le raccourci pour récupérer la V10.2. Ensuite, le contrôleur gère les versions suivantes.

Ce système de mise à jour ne crée pas de mode hors-ligne et n'a pas besoin d'un service worker ; cette décision évite un deuxième cache opaque sur iOS.
