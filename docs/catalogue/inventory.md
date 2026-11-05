# Inventaire Convergence et retrait réversible de Power Rangers

**Périmètre : fichier du dépôt, pas catalogue de production.** Aucun compte ni export Supabase n’a été lu ; aucune opération distante n’a été effectuée. Le jeu charge son catalogue par `/api/bootstrap`, et non depuis `content/convergence-series2.json`. La modification du fichier seule n’archive donc aucune carte réelle.

## Compte vérifié

Le fichier source contenait **100 enregistrements, 100 identifiants distincts**, tous en série 2, de variante `standard` et publiés. La métadonnée manuelle `targetCount: 102` et les `editionTotal: 102` étaient des valeurs déclaratives, pas le compte des enregistrements.

| État du fichier | Avant | Après préparation |
|---|---:|---:|
| Cartes normales actives | 100 | 90 |
| Cartes Secrètes actives | 0 | 0 |
| Cartes archivées | 0 | 10 |
| Power Rangers actives | 10 | 0 |
| Enregistrements / identifiants distincts conservés | 100 / 100 | 100 / 100 |

Les noms Terre, Halloween et Margot figurent dans `existingProtected`, mais **aucun enregistrement de ces trois cartes n’est présent dans ce fichier**. Leur nombre ou leur variante ne doit pas être déduit de cette métadonnée. La série de production peut donc contenir d’autres cartes ; son compte avant/après reste à vérifier sur un catalogue serveur complet.

Le fichier préparé conserve neuf légendaires, dix-huit épiques, dix-huit rares et quarante-cinq communes actives. Les dix cartes retirées sont conservées avec `archived: true`. Les identifiants, l’ordre des enregistrements et les anciens `editionNumber` restent identiques. Seuls les champs manuels `targetCount` et `editionTotal` sont retirés ; les numéros visibles sont calculés séparément par le moteur du catalogue.

## Liste exacte avant archivage

| ID | Carte | Rareté | Variante | Ancien numéro |
|---|---|---|---|---:|
| `s2-conv-power-rangers-01` | Tommy Oliver | legendary | standard | 53 |
| `s2-conv-power-rangers-02` | Jason Lee Scott | epic | standard | 54 |
| `s2-conv-power-rangers-03` | Kimberly Hart | epic | standard | 55 |
| `s2-conv-power-rangers-04` | Billy Cranston | rare | standard | 56 |
| `s2-conv-power-rangers-05` | Rita Repulsa | rare | standard | 57 |
| `s2-conv-power-rangers-06` | Trini Kwan | common | standard | 58 |
| `s2-conv-power-rangers-07` | Zack Taylor | common | standard | 59 |
| `s2-conv-power-rangers-08` | Lord Zedd | common | standard | 60 |
| `s2-conv-power-rangers-09` | Zordon | common | standard | 61 |
| `s2-conv-power-rangers-10` | Alpha 5 | common | standard | 62 |

Pour ces dix cartes, `universe`, `loreGroup` et le préfixe de l’identifiant concordent. La recherche normalise casse, accents, espaces et ponctuation des libellés explicites Power Ranger/Power Rangers ; elle ne cherche jamais une ressemblance approximative dans le nom d’une carte. Un libellé d’un autre univers, un `loreGroup` contradictoire, un identifiant encodant une autre franchise ou une série indéterminée produit une ambiguïté et bloque la simulation d’archivage. Les autres séries ne sont pas ciblées.

Le [manifeste](power-rangers-manifest.json) contient la liste, les empreintes, les comptes observés et le reçu des flags avant/après. Les nombres de ce manifeste sont des preuves historiques de ce fichier ; ils ne servent pas de total codé en dur au jeu.

## Empreintes et conservation

| Fichier | SHA-256 |
|---|---|
| Catalogue avant | `fab1d9fe80581bcbeaedcf34216ee34fb25cdba0253c46ea967f8e52b6b5ebf5` |
| Catalogue préparé | `9ac4fe89aff961977ac106e1e3ae50d471a2bcf07979e2d7f6062d482936246d` |
| Illustrations SVG, inchangées | `8f3094df24fc49e8efac1342dd3ab3c1934088e8d7b8b8a513bab1e88fc5b246` |
| Briefs Art Factory JSON, inchangés | `8c1e90a7a4176cd529023bcde14a1bcb0379c0d9bf902af66676ff4b7d92ff42` |

Les illustrations et briefs restent disponibles pour une restauration. Aucune suppression physique de carte, d’image ou de référence n’est nécessaire.

## Préflight hors ligne et impacts

```sh
node tools/catalogue/audit.mjs
node tools/catalogue/audit.mjs --simulate
node tools/catalogue/audit.mjs --snapshot /chemin/prive/catalogue.json --simulate --report /tmp/nouveau-rapport.json
```

Par défaut, le script lit le fichier préparé et reste en **dry-run**. Il trouvera dix Power Rangers déjà archivées et zéro nouvelle carte à archiver. `--simulate` modifie seulement une copie en mémoire, puis restaure ses flags et compare le résultat exact. Aucun HTTP, aucune écriture de snapshot et aucune exécution de production ne sont proposés. Le rapport refuse d’écraser un fichier existant.

Un snapshot privé accepté peut être `{cards, ...}`, `{game: {cards, ...}}` ou `{db: {cards, ...}}`. Les champs observés `users[].state.owned`, `deck`, `deckDouble`, `listingsV11` et `tradesV109` sont examinés. Les tableaux `battles`, `pvpMatches`, `openings`/`packOpenings` constituent un **format d’export d’audit à adapter au vrai backend** ; leur nom ne prouve pas que le serveur déployé possède ce schéma. Toute table absente est **inconnue**, jamais assimilée à zéro. Un tableau présent et vide représente zéro connu. Une structure incomplète, une quantité invalide ou un statut d’opération inconnu reste bloquant.

Le rapport privé contient seulement des agrégats : nombres de détenteurs/copies, références de decks, séquestres, propositions et opérations en cours. Il n’affiche ni nom ou identifiant de joueur, ni e-mail, mot de passe, portefeuille individuel ou nom de carte privée. Ne pas mettre le snapshot privé dans le dépôt.

Le préflight signale notamment :

- **Collections et decks** : copies et références à conserver ; aucune suppression ou réécriture d’identifiants.
- **Marché** : exemplaires en séquestre. Le fragment fourni masque une annonce de carte archivée et refuse l’achat, mais permet encore l’annulation et le retour du séquestre. Ne pas supprimer les annonces ou leurs cartes réservées.
- **Échanges en attente** : le fragment revalide les inventaires à l’acceptation et refuse les cartes archivées. Annuler ou refuser reste possible. L’outil ne choisit aucune résolution à la place de l’administrateur.
- **Combats et ouvertures en cours** : leur présence ou un état inconnu bloque la préparation d’une opération réelle. Les snapshots/historiques et la transaction serveur complète doivent être examinés avant une décision.

`applyArchivePlan` et `restoreArchivePlan` renvoient de nouvelles copies. Un catalogue modifié depuis le préflight est refusé ; une restauration refuse également un catalogue ayant changé depuis la simulation. Les autres données et toute évolution de portefeuille restent intactes. Le reçu restaure exactement la présence et la valeur antérieure de `archived` ; les anciens totaux manuels ne sont volontairement pas réintroduits.

## Validation et opération Supabase encore nécessaire

Les tests couvrent les alias et contradictions d’univers, le périmètre série 2, l’inconnu distinct de zéro, les références et séquestres, l’archivage/restauration sur copies, la protection contre une modification concurrente du catalogue, la conservation des comptes/decks/crédits, la confidentialité du rapport privé et le CLI non destructif. Le comptage utilise les fonctions actives/normales du module canonique `58-catalogue.js`, y compris la priorité d’un doublon archivé.

```sh
node --test --test-isolation=none tests/catalogue/archive-plan.test.mjs
```

**Ces tests de copies JSON ne valident pas une restauration Supabase.** Le routeur déployé, la fonction réelle d’archivage, les tirages, le stockage SQL et leur transaction complète ne figurent pas dans le dépôt. Il manque un catalogue administrateur complet, un inventaire privé des références, les sources/accès d’intégration serveur et une préproduction avec sauvegarde/restauration réellement éprouvée.

Une opération Supabase reste nécessaire pour retirer les cartes réelles des acquisitions. Elle doit être précédée d’un préflight actualisé, d’une résolution explicite des séquestres/propositions/opérations en cours et d’une validation de l’utilisateur sur la liste exacte. **Aucune opération de production n’a été exécutée.**
