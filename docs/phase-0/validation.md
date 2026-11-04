# Validation de référence

## Tests automatiques exécutables hors ligne

Commande : `node --test --test-isolation=none tests/phase-0/reference.test.mjs` (Node 24, aucun package). Aucune requête réseau, aucune base, aucune credential. Fragments exécutés en VM avec uniquement fail/crypto et fixtures synthétiques. Ils ne valident ni JWT, ni RLS, ni verrous, ni transactions, ni le routage déployé.

Les tests vérifient : empreintes de toutes les sources de référence ; rendu caché/admin/possédé et échappement ; vente/annulation/achat avec conservation cartes/crédits ; refus d'achat répété ; échange accepté une fois ; récompense de collection/bon et succès uniques ; calendrier de missions aux changements d'heure ; récompense de mission unique ; défaut connu de réponse Jeux tardive reproduit sans correction. Le comparateur tools/phase-0/compare-synthetic.mjs est testé sur une copie fichier JSON fictive et rejette corruption/perte de champs ; cela ne valide ni un dump SQL ni Auth/Storage. Un test qui confirme ce défaut n'est pas un test d'acceptation de l'interface ; le résultat reste un problème ouvert.

## Scénarios intégrés à exécuter sur préproduction

Tous NON EXÉCUTÉS. Préconditions communes : cible et comptes de test indépendants, horloge contrôlée quand possible, capture des états avant/après, absence d'accès production. Préparer deux sessions pour concurrence. Ne pas enregistrer tokens/mots de passe dans les preuves.

| ID | Opérations | Résultat attendu |
|---|---|---|
| T01 AUTH | Connexion valide/invalide, compte bloqué, password provisoire, expiration, logout puis autre compte avec réponse retardée | bon compte seulement ; aucune réponse ancienne appliquée ; refus serveur sans mutation |
| T02 RECOVERY | Email de test, lien valide/expiré/réutilisé, changement et reconnexion | identité et données conservées ; redirect de test ; aucun email réel |
| T03 RIGHTS | Joueur appelle chaque route admin ; lit/modifie objets d'autrui ; JWT absent/invalide | refus effectif sans modification ; secrets/cartes cachées non divulgués |
| T04 CATALOG | Toutes raretés/variantes, inconnue, secrète, archivée/restaurée, filtre/recherche, détail/zoom | ID/quantités conservés ; droits d'affichage exacts ; image et statistiques inchangées |
| T05 PACK | Gratuit, crédits, éclats et bon ; prepare/cancel/commit ; doubles clics et rejeu même ID ; fermer à chaque étape, réponse perdue | un débit/attribution ; résultat retrouvable ; pas de retirage abusif ; claims exacts |
| T06 DECK | 3/6 cartes, ordre, favoris, sauvegardes rapides, fermeture immédiate, plusieurs appareils | deck valide ; aucune ancienne réponse écrasant la dernière révision ; défaut documenté sinon |
| T07 AI | Simple/Double, 4 manches, haute/basse, égalité/écarts, victoire/défaite/nul, abandon et reprise | résultat et gains selon règles de référence serveur ; récompense unique |
| T08 PVP | Défi/accepter/refuser/annuler ; négocier mises ; simultanéité, délais, déconnexion et reprise | un match/mise/règlement ; résultat déterminé serveur ; pas de fuite des cartes cachées |
| T09 MARKET | Lister dernière copie, annuler, acheter ; deux acheteurs et annulation concurrente | un seul gagnant ; quantité disponible + séquestre conservée ; somme crédits conservée |
| T10 TRADE | Offre et contre-offre, refus, annulation, expiration, acceptation répétée et manque inventaire | tout transféré une fois ou rien ; decks nettoyés ; crédits conservés |
| T11 MEMORY | Six paires, première erreur gratuite, trois erreurs, revealUntil, abandon/rejouer, bonus répété | état serveur autoritaire ; gains/bonus uniques ; aucune solution cachée dans réponse |
| T12 LEAGUE | Pari limite et invalide, fermeture des mises, match/règlement/reprise | cote figée, débit unique et gain exact ; pas de pari tardif |
| T13 PROGRESS | Jour/semaine Paris et DST, paliers série, bons, succès, limites portefeuille | reset conforme ; claim unique ; aucun compteur historique perdu |
| T14 PROFILE | Avatar, vitrine/thème/titre et carte échangée/archivée/secrète | visibilité et éligibilité correctes ; profil conservé |
| T15 ADMIN | Inviter/bloquer/crédits, éditer cartes/séries/taux/récompenses, simulation, journal, archive/restaure, import synthétique | droits admin ; simulation sans attribution ; aucun ID historique perdu |
| T16 ART | Individuel/lot 6, noms ambigus/doublons/erreurs partielles, zoom/cadrage, très grandes dimensions | seules cartes approuvées modifiées ; reprise erreurs ; empreintes autres champs identiques |
| T17 FACTORY | 100 prompts, filtres, conversion 720×600, suivi local ; IA seulement avec stub | nom/format exacts ; aucune dépense réelle ni import automatique |
| T18 UPDATE | Nouvelle version et diffusion partielle, offline, pendant booster/combat/save | pas de purge/session perdue ; reprise serveur ; build cohérent |
| T19 MOBILE | Android/iPhone, clavier, safe areas, rotation, retour, veille, faible mémoire, motion réduite | parcours utilisables ; aucune navigation écrasée ; mesures mémoire/frames consignées |
| T20 RESTORE | Procédure protection.md sur cible isolée | restauration réelle de l'archive testée, identités/liens/assets/permissions/invariants égaux |

## Porte de sortie

Documents et tests locaux seuls ne suffisent pas. Exiger T01–T20 exécutés ou exceptions précises acceptées, sauvegarde/restauration prouvée, projet isolé opérationnel, sources/contrats critiques disponibles, défauts et risques résiduels reconnus. Un échec applicatif connu peut être l'objet de la phase 1, sans être maquillé en test réussi ; sécurité et protection des données non démontrées restent des réserves explicites. Validation utilisateur requise avant phase 1.
