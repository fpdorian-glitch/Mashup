# Contrats observés client ↔ serveur

Ce document décrit ce que le client envoie/consomme, sans inventer un schéma serveur certifié. `source-inventory.json` complète les routes avec leurs emplacements. Méthode : argument body absent → GET, présent → POST ; paramètre `route` encodé dans l'URL de fonction. Les GET ne sont pas garantis sans effet côté backend : le fragment tradeList expire des propositions.

## Transport et authentification

`api(path,data)` dans index.html : fonction mashup-api-gh ; headers apikey publique, X-Mashup-Request:1 et Bearer access_token si session ; JSON pour POST ; JSON de réponse, champ error pour erreurs HTTP. Aucun contrat d'erreur structuré/versionné ou délai explicite. Client jeux : mashup-games, mêmes headers, refuse sans session, met à jour state.coins depuis output.credits. Vérification JWT, rôle/ownership, CORS, limites, transaction et anti-rejeu : inconnus faute de routeur déployé.

Supabase Auth SDK : signInWithPassword({email,password}), getSession(), signOut(), resetPasswordForEmail({redirectTo}) et updateUser({password}). Session navigateur persistante pour le jeu ; récupération séparée sans persistance. L'URL et la clé publique existantes ne sont pas des credentials admin et ne prouvent aucune autorisation.

## API principale : entrées et sorties minimales observées

| Routes | Entrée | Réponse consommée / dépendance |
|---|---|---|
| status ; auth/me | GET | setupRequired ; user (id, username, pseudo, role, mustChange) |
| auth/setup ; auth/password | formulaire setup / oldPassword,newPassword | achèvement puis rechargement ; contrôles serveur inconnus |
| bootstrap | GET | user,state,cards,series,seriesTotals,profile,packs,packRates,battleRewards,battle,devPosts,missions,collectionRewards,vouchers |
| preferences | deck,deckDouble,favorites | state avec préférences confirmées |
| packs/prepare | id,attemptId | openingId,results |
| packs/cancel ; packs/commit | id,openingId | cancel ignoré ; commit state,vouchers,cards,results ; idempotence à prouver |
| battles/start ; battles/choose ; battles/next ; battles/abandon | mode ; stat ou {} ; {} ; {} | battle,state selon route ; cartes/score/history/reward/finished pour rendu |
| pvp ; pvp/invitations | GET | players,match,leaderboard,balance ; invitation |
| pvp/challenge ; pvp/respond | targetId,mode ; id,accept | relecture PvP |
| pvp/<action> | id et paramètres de l'action (actions observées : bet/config, choose, next, quit) | relecture ; voir actions relevées dans index.html, ne pas inventer leur validation serveur |
| profile ; profile/showcase | pseudo,avatar,showcaseCard ; cards,theme,title | profile,user selon route |
| trades ; trades/partner/<id> | GET | players,trades ; cards du partenaire |
| trades/create ; trades/respond | to,offer,request,offerCredits,requestCredits ; id,action (+ contenu contre-offre) | trade,state,changed selon fragment ; UI recharge compte si acceptation |
| market/listings ; market/list ; market/buy ; market/cancel | GET ; cardId,price ; id ; id | listings,myListings,limits ; listing,state |
| missions ; missions/claim | GET ; scope,id | missions ; state,reward,missions |
| collection/rewards ; collection/rewards/claim | GET ; series,percent | collectionRewards ; state,reward,vouchers |
| achievements ; achievements/claim | GET ; id | achievements ; achievements,state,reward,unlocks |
| leaderboard ; dev-posts | GET | modes,boards,me ; posts |

Toutes les routes ci-dessus sont préfixées `/api/`. Les réponses doivent être validées séparément sur préproduction ; les champs listés ne sont pas une liste exhaustive.

## Administration /api/admin/

- users : GET users ; POST username,password (valeurs uniquement en mémoire lors d'usage réel).
- password-reset : userId,password ; disable : userId,disabled ; credits : userId,delta.
- cards : card complète, incluant art si modifiée ; retour cards/card. Une édition d'image envoie une carte entière : conflit avec édition simultanée possible.
- cards/archived : GET ; archive-card : id,archived → cards et état utilisé selon réponse.
- series : series ; packs : packs,packRates ; packs/simulate : id,openings → statistiques sans attribution attendue, non vérifiée côté serveur.
- battle-rewards : battleRewards ; missions : rewards ; collection/rewards : GET/POST rewards ; jeux : route admin distincte.
- dev-posts : action publish/edit/delete,id,title,body → posts.
- import : save ancien format → cards,state. Ce n'est pas un mécanisme de restauration intégrale.

## mashup-games

Routes status GET ; bet POST {amount,side} ; start POST {type:'memory'} ; move POST {index,sessionId} ou {answer,sessionId} ; abandon POST {sessionId} ; daily POST {} ; admin POST réglages. Réponse consommée : now,credits,league,current,live,bet,historyBets,history,active,daily,settings. Session Memory : id,type,tiles,pairs,mistakes,attempts,first,revealUntil,done,won,reward. La confidentialité des tuiles et les règles de règlement nécessitent les sources absentes. Quiz/comparaison présents comme branches historiques, seul Memory est proposé.

## mashup-art et Art Factory

Le rendu accepte un lien HTTPS vers mashup-art avec paramètres card et key UUID, ou data:image png/jpeg/webp base64. Le sens, la révocation, les droits et le cache de key restent inconnus. Aucun essai réseau réalisé.
Worker optionnel : GET /health, POST /generate {prompt}, Bearer jeton dédié, Origin du site ; réponse ok,mime,image_base64,model. Secrets côté Worker uniquement. Modèle/disponibilité et coûts non testés.

## Objets et invariants à protéger

| Objet logique (pas un schéma SQL établi) | Identifiants/champs observés | Invariant / contrôle de restauration |
|---|---|---|
| Compte Auth et joueur | user.id, rôle, disabled,mustChange, lien Auth inconnu | conserver identités et association exacte, aucun compte orphelin ; accès joueur/admin séparés |
| Inventaire | state.owned[cardId], latestCardId | entiers non négatifs ; IDs historiques, y compris cartes archivées, préservés |
| Portefeuille | state.coins,dust ; vouchers | crédits/éclats/bons exacts, aucun rejeu de récompense ; plafonds selon règles réelles |
| Deck/favoris | deck,deckDouble,favorites | références valides, quantités disponibles, ordre conservé |
| Catalogue | id,editionSeries,editionNumber,variant,rarity,art,archived/hidden | ID stable ; illustration identique par empreinte ; secret non révélé au mauvais utilisateur |
| Ouverture | attemptId,openingId,results ; opened,freePackUsed | un débit et une attribution au plus ; retrouver opérations en cours |
| Vente | listingsV11 id,seller,buyer,cardId,price,status | exemplaires disponibles + séquestres conservés ; sold/cancelled non réappliqués |
| Échange | tradesV109 et quantités/crédits des deux parties | transfert atomique ; pas de double acceptation ; revalidation possession |
| Combat/PvP | match/battle, scores, historique, mises et résultat | résultat et récompense uniques ; reprise d'état cohérente |
| Progression | missionsV106,collectionRewardsV108,packVouchersV109,achievementsV11,compteurs | claims/bonus conservés pour éviter réattribution |
| Profil/config | vitrines,avatar,récompenses,taux,séries,devPosts | contenu et permissions conservés, données privées hors Git |

Conservation : dans une copie sans activité, comparer EXACTEMENT chaque objet et chaque compte, pas seulement les totaux. Lors d'un transfert, somme cartes disponibles + cartes réservées identique ; somme crédits identique hors sources/puits explicitement autorisés. Pour boosters/récompenses, comparer au résultat attendu de l'opération, pas à une conservation globale artificielle. Les résultats/tests actuels des fragments ne prouvent ni transaction SQL ni intégration réelle.
