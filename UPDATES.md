## Mashup V15.4.0 — Le Nexus des mondes (préparée le 5 novembre 2026)

- Arène Nexus, matières des cartes, scellés tactiles, horloge serveur du Casino et actualisation protégée.
- Mashup Match : 100 niveaux et dix mondes, moteur déterministe et campagne d’entraînement complète.
- Service de campagne privé préparé ; raccordement et déploiement Supabase nécessaires avant activation des gains réels.
- Protections de récupération et confirmation automatique V15.3.2 conservées ; bilan consultable après confirmation.
- Aucun déploiement, migration ou changement de données réelles effectué par cette préparation.

## Mashup V15.3.2 — Ouvertures fiabilisées (5 novembre 2026)

- Confirmation automatiquement déclenchée dès que la dernière carte d'un booster est mise de côté. Le serveur reste seul responsable de l'attribution et du débit.
- Enregistrement local, propre à chaque compte, de l'identifiant d'une ouverture préparée pour reprendre sa confirmation après une interruption.
- Alerte dans Boosters avec actions explicites de récupération ou d'abandon ; aucune ouverture suivante avant résolution du tirage en attente.
- Aucun changement de la base de données ni des rares cartes / taux de tirage.
- Les tirages anciens non confirmés sans reçu conservé ne peuvent pas être réattribués automatiquement.

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
