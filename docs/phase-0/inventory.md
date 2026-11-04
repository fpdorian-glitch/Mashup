# Inventaire fonctionnel

Statuts : observé = présent dans les sources ; non validé = pas de test intégré du service. Toutes les fonctionnalités serveur ci-dessous sont observées mais non validées en intégration.

| ID | Système et fonctionnalités à conserver | Sources principales | Dépendances et données |
|---|---|---|---|
| AUTH | Connexion privée, autorisation du compte, activation admin initiale, déconnexion, mot de passe provisoire/obligatoire, récupération par email | index.html bootOnline/loadOnlineGame/showAuth ; reset.html | Supabase Auth JS 2.76.1 via jsDelivr ; API auth ; identité, rôle, disabled, mustChange ; email/redirections externes |
| CAT | Catalogue, séries/numérotation, six raretés, variantes standard/full_art/gold/secret, cartes cachées/archivées | index.html ; 06-v10-cards.js ; content/convergence-series2.json | bootstrap, identifiants stables ; cadres SVG ; illustrations et cinq statistiques |
| COLL | Collection, possession/doublons, filtres/recherche/tri, pagination progressive, favoris, détails, zoom/inclinaison, progression et paliers de série | index.html ; 18-v10-8-collection.js | state.owned/favorites ; cartes, séries, récompenses réclamées, bons |
| PACK | Booster gratuit initial, achats crédits/éclats/bons, préparation, révélation, annulation pendant préparation, confirmation, garanties et taux configurables | index.html ; 12-booster-reveal.js | prepare/commit/cancel ; attemptId/openingId ; résultats, soldes, opened, freePackUsed |
| DECK | Équipes classique 3 cartes et Double 6 cartes, ordre des duos, filtres, retrait/ajout | index.html renderDecks/editDeckCard | possession, préférences, catalogue |
| AI | Campagnes classique et Double, sélection de statistique, direction haute/basse, manches, scores/écarts, nul, série, récompenses, abandon/reprise | index.html startBattle/renderCombat | routes battles ; état et résultat serveur ; réglages de récompenses |
| PVP | Annuaire, défis et invitations, acceptation/refus/annulation, Simple/Double/Parimatch, négociation de mise, tours, horloges et classement | index.html renderOnline/pollInvitations | routes pvp ; identités, decks, mises et réservations, statut de match |
| GAMES | Ligue IA/casino commun, cotes, paris, historique, classement des 20 IA, alertes ; Memory 6 paires, abandon/rejouer, récompense et bonus quotidien | 04-games-ui.js | mashup-games ; horloge serveur, réglages admin, sessionId, mises/gains ; Notification facultative |
| TRADE | Échanges privés cartes/crédits, partenaire, proposition, contre-offre, refus, annulation, acceptation et expiration | 20-market-v10-9.js ; backend/market-v10-9.js | inventaires des deux joueurs ; historique tradesV109 ; aucune réservation à la proposition dans le fragment |
| SALE | Marché public, estimation, filtres, sélection de collection, vente avec séquestre, achat, annulation, historique personnel | 22-v11-economy-ui.js ; 29-v11-4-market-picker.js ; backend/market-v11.js | listingsV11 ; transfert crédits/cartes, retrait des decks si dernière copie |
| PROFILE | Pseudo/avatar, vitrine principale et trois cartes, thèmes/titres, annuaire | index.html ; backend/market-v10-9.js | profil, possession, progression et droits des cartes secrètes |
| PROGRESS | Missions quotidiennes/hebdomadaires et bonus, succès permanents et gains uniques, classements collection/prestige/arène/séries/raretés | 15-missions-ui.js ; 22-v11-economy-ui.js ; backend/missions-engine-v10-6.js, achievements-v11.js, leaderboards-v11.js | compteurs et marqueurs claim ; calendrier Europe/Paris ; séries/catalogue |
| ADMIN | Invitation, réinitialisation mot de passe, blocage, crédits ; création/édition/archivage/restauration cartes ; séries ; packs/taux/contenus ; simulation ; récompenses arène/missions/collection/jeux | index.html et modules concernés | autorisation serveur requise pour chaque route ; limites et transaction inconnues pour le routeur absent |
| ART | Import individuel, cadrage/zoom, suppression image ; lots max 6, correspondances/revue, erreurs partielles | 27-v11-3-image-studio.js ; index.html cropper | Canvas, fichiers locaux, JPEG base64 ; admin/cards ; mashup-art en lecture |
| FACTORY | 100 briefs, filtres, copie prompt, conversion JPEG 720×600, suivi local, génération optionnelle et ZIP limité | art-factory/index.html, generator.js, worker.js, README.md | JSON/CSV, Canvas, localStorage ; Worker Cloudflare + fournisseur d'images optionnels ; aucune clé requise au jeu |
| OPS | Journal des nouveautés administrable, règles, indicateur hors ligne, contrôle de versions/actualisation, adaptations tactiles et réduction d'animations, galerie de patrons, import ancien/export local | 09-mashup-updates.js ; 10-development-journal.js ; 32-v12-performance.js ; patrons/index.html ; index.html | version.json/meta/URLs versionnées ; stockage local ; admin/import distinct d'une sauvegarde serveur |

## Architecture et dépendances transversales

GitHub Pages → modules ES natifs et styles → Supabase Auth + Edge Functions. Pas de package.json, lockfile, migrations SQL ou suite de tests initiale. Aucun service worker déclaré par l'updater. Interface en ligne ; bandeau hors connexion sans file transactionnelle durable. State mutable central, routage manuel, rendu par chaînes HTML, événements délégués.

CSS : base intégrée puis couches 03,07,08,11,13,16,17,19,21,23,24,25,26,28,30,31,34 ; 33-card-concepts.css existe et doit être distingué des feuilles chargées par le jeu principal. Préserver écrans étroits, safe areas, clavier, réduit-motion et modes de révélation.

Calendriers/temps : missions Europe/Paris, délais PvP et Ligue, polling PvP 6 s/invitations 20 s, boucle Jeux 1 s avec requêtes conditionnelles, vérification version 4 min. Les processus mobiles ne garantissent pas ces intervalles en arrière-plan.

Sources backend partielles avec fonctions globales externes (fail, getPackMap, routeur, transaction). Les versions collection-rewards-v10-8 et v10-9 définissent des règles apparentées : ordre d'intégration et version déployée inconnus. Ne pas concaténer arbitrairement tous les fragments.
