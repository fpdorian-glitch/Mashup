# Publication du client Mashup 16.0.0

La demande du propriétaire « Publie la dernier version », reçue le **7 novembre 2026**, autorise l’envoi de la V16 validée sur `main` et sa publication par la configuration GitHub Pages existante. Elle succède à la préparation sur `feature/mashup-v16-mobile-shell`.

## Contrôles effectués avant l’envoi

- `main` distant vérifié à `79172e1e11b5b529009d23f0357c5e923954f32c`, ancêtre de la V16 : publication possible en avance rapide, sans réécriture d’historique.
- Le workflow distant de la branche, commit `26bc81b`, a terminé avec succès : [GitHub Actions 42370508726](https://github.com/fpdorian-glitch/Mashup/actions/runs/42370508726). La réussite a été lue sur la page officielle GitHub Actions, indépendamment des tests locaux.
- Métadonnées de sortie cohérentes en `16.0.0`, date de publication `2026-11-07`, badge « APERÇU » retiré du journal. Aucun changement de fonctionnalités ajouté à cette étape.
- **414/414 tests Node** réussis sur la version à publier : [journal](release-unit-results.txt).
- **16 scénarios navigateur** réussis avec des comptes fictifs, dont navigation, achat en attente/refusé, réponse partielle, compte, booster, Match et Memory : [journal](release-browser-results.txt), [résultats structurés](artifacts/release-browser-results.json).
- Aucun fichier `backend/`, `content/`, `assets/`, moteur de carte ou règle modifié depuis la référence par cette préparation de publication. Aucun appel Supabase réel, aucune migration et aucun changement de données de joueurs.

## Envoi et vérification

La publication utilise le mode déjà employé par ce dépôt : `main` à la racine pour GitHub Pages. L’envoi doit rester une avance rapide normale, sans `--force`. La tête distante doit correspondre au commit de sortie ; le workflow « pages build and deployment » doit ensuite terminer avec succès pour ce commit.

Suivi : [GitHub Actions](https://github.com/fpdorian-glitch/Mashup/actions). Site : [Mashup](https://fpdorian-glitch.github.io/Mashup/).

L’accès direct au domaine GitHub Pages depuis cet environnement reçoit un refus du proxy réseau (`403 Forbidden`). Cela limite la vérification HTTP du site servi, sans établir un échec du déploiement. Le contrôle du workflow doit donc être distingué d’une ouverture effective du site dans cet environnement. Aucun essai sur téléphone physique n’est revendiqué.

## Retour arrière

Référence précédente : `79172e1e11b5b529009d23f0357c5e923954f32c`. En cas de besoin, préparer un nouveau commit rétablissant le client de référence puis le publier normalement, sans réécrire l’historique. Conserver les comptes, inventaires, soldes, progressions et données Supabase ; ne jamais remettre une ancienne sauvegarde financière par-dessus des opérations récentes.
