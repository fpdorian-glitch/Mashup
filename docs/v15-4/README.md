# Mashup V15.4 — Le Nexus des mondes

Branche `feature/mashup-v15-4-grand-update`, créée depuis `main` au commit `f82a8cd` (V15.3.1). Date : 5 novembre 2026, Europe/Paris.

**Le client et le service privé local sont développés et testés. La publication coordonnée reste bloquée par l’absence de connexion Supabase et des sources déployées exactes.** Aucun compte réel, crédit, inventaire, catalogue, annonce ou statistique n’a été modifié. Aucune migration ou Edge Function n’a été déployée.

## Fonctionnalités développées

### Arène Nexus

Un plateau dédié présente les équipes, une entrée VS, le score et un parcours de quatre manches. Le dock réunit numéro de manche, statistique et direction MAX/MIN ; les cinq commandes portent aussi cette direction. Les combats doubles gardent leurs duos et leurs règles. Les commandes de cadrage permettent d’examiner les deux équipes sur les petits écrans.

La confrontation anime les valeurs, la carte gagnante, le recul adverse ou l’égalité. Les résultats conservent les détails fournis par le serveur. Les présentations sont finies, annulables et remplaçables à la navigation ; passer un effet ne retarde jamais une action. Les profils fluide et mouvement réduit restent prioritaires. Une carte adverse non révélée n’est jamais inspectée pour connaître son nom, sa matière ou son illustration.

### Cartes et boosters

Six substrats différencient papier, métal brossé, violet, or, chrome noir et chrome blanc. Gold, Full Art et Secrètes gardent leur composition existante. La lumière spéculaire et le reflet vert des Secrètes réagissent à l’inclinaison, sans modifier les illustrations ou les cinq statistiques.

Le scellé accepte désormais un glissement horizontal, avec annulation des gestes incomplets, verticaux ou interrompus. Le tap et le clavier restent disponibles. Le bilan distingue nouvelles cartes, doublons et pièces remarquables sans changer l’ordre du tirage. Les protections de préparation/confirmation restent en place ; le bouton final ramène aux Boosters. Les tests réels du client vérifient aussi l’orientation des faces et la reprise après réponse perdue.

### Casino et stabilité

Le bloc **PROCHAIN COMBAT IA** apparaît avant les onglets et le combat en direct, y compris pendant le chargement. Il affiche `MM:SS` depuis `current.closesAt` ou un `startsAt` explicitement fourni par le serveur, avec correction d’horloge et resynchronisation après retour au premier plan. Un horaire absent reste `--:--` ; aucun calendrier local n’est inventé.

Le client distingue paris ouverts, fermeture imminente, attente de confirmation, direct et résultats. Les vingt dernières secondes sont signalées visuellement ; l’échéance expirée, un horaire non confirmé ou une perte de synchronisation bloquent les nouvelles mises. Les vrais débits, tirages, fréquences de doubles et paiements restent à la charge du serveur existant, inchangé et non testé en production ici.

Les réponses Jeux et Admin tardives ne repeuplent pas une autre page ou un autre compte. Une transaction ne peut plus être envoyée si le compte change pendant la récupération de sa session Auth.

### Actualisation PWA

Le manifeste, le HTML, les ressources modifiées et le journal annoncent la V15.4.0 sur cette branche. L’updater lit la version du **document HTML chargé**, pour détecter aussi un HTML ancien utilisant un script plus récent. Il vérifie la disponibilité du nouveau HTML avant de changer l’URL.

Une barrière commune diffère l’actualisation pendant booster, combat, Match, Memory, achat et sauvegarde. Elle est revérifiée après la requête de contrôle. Aucun stockage de connexion n’est effacé et aucune mise à jour n’est appliquée automatiquement après une partie. Les anciens clients déjà chargés ne peuvent pas recevoir rétroactivement tous les nouveaux contrôles ; une protection DOM conservatrice couvre les activités visibles si un ancien HTML reçoit le nouvel updater.

## Mashup Match : un jeu complet, deux périmètres explicites

Le moteur déterministe implémente échanges voisins valides/invalides, alignements de trois, rayons de quatre, prismes de cinq, novas en L/T, combinaisons de bonus, gravité, cascades, multiplicateurs, sceaux destructibles, armure, cases infranchissables et mélange d’une grille sans coup. Les symboles SVG et les dix identités de mondes sont originaux.

La campagne possède cent profils de niveaux, huit formes de grille et une progression par objectifs combinés, couleurs et terrain. **Les cent grilles canoniques ont un transcript gagnant vérifié par le vrai moteur**, sans baisse des objectifs. Cela prouve leur faisabilité, pas un équilibrage humain ni la solvabilité de toutes les seeds alternatives. Les sessions de campagne utilisent les seeds canoniques testées.

- **Service en ligne activé** : progression, étoiles, meilleur score, partie active et gains proviennent exclusivement des réponses autoritaires du serveur. Le client intègre les écrans de campagne et l’éditeur Admin des tranches, gains individuels, replays, plafonds et désactivation des récompenses. La prévisualisation couvre les cent gains.
- **Service absent** : le jeu propose clairement un entraînement complet, sans crédit. Parcours, étoiles et partie active sont conservés sur cet appareil, séparément pour chaque compte. Cette progression n’est jamais envoyée comme une victoire de campagne en ligne et ne débloque aucun gain réel.

L’ancien backend peut répondre `200 {}` ou fournir un statut Memory : cela ne suffit pas à activer la campagne en ligne. Un handshake V15.4 explicite et valide est requis.

## Backend privé et intégration restante

Le service autoritaire est conservé dans `/workspace/mashup-backend-private`, **hors du dépôt public**, avec un historique Git local sans remote. Il applique les coups, rejoue les résultats, lie sessions et comptes, vérifie révisions et rôles stockés, et regroupe progression, attribution, portefeuille et journal dans une seule frontière transactionnelle. Requêtes répétées, courses concurrentes, replays plafonnés et rollback ont été testés sur l’adaptateur local en mémoire.

Il manque encore l’adaptateur SQL/routeur réel. Les versions 16 de `mashup-api-gh` et 4 de `mashup-games` ont été indiquées par l’utilisateur ; elles n’ont pas pu être téléchargées ni analysées. Aucune nouvelle autorité de crédits indépendante ni migration SQL supposant un schéma inconnu n’a été introduite.

Le [contrat préparé](match-api.md), les [preuves backend agrégées](match-backend-validation.json) et le [plan de publication/retour arrière](release-plan.md) distinguent ces limites de l’implémentation testée. Le dossier privé contient aussi un paquet de revue avec empreintes ; il ne contient aucune source déployée, donnée réelle ou clé secrète.

## Preuves

Voir [validation.md](validation.md), [les mesures de performance](performance.md) et la [comparaison visuelle V15.3.1/V15.4](artifacts/comparison.html).

Captures : [Match](artifacts/match-board-level-1.png), [campagne](artifacts/match-campaign.png), [économie Admin](artifacts/match-admin-economy.png), [matériaux](artifacts/v154-card-materials.png), [Casino 320 px](artifacts/casino-clock-320.png).

Démonstrations réelles du navigateur : [Mashup Match](artifacts/match-preview.webm), [booster](artifacts/booster-preview.webm), [combat](artifacts/combat-preview.webm), [échanges](artifacts/trades-preview.webm).
