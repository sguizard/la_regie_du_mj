# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [1.0.0] - 2026-08-28

Première version publiée. Outil de cartes tactiques pour parties de JDR en présentiel :
une **régie** sur l'écran du MJ, une **vue joueurs** sur la TV, synchronisées en local
via le navigateur. Aucune dépendance, aucun compte, aucun serveur distant.

### Cartes & présentation
- Import d'images par bouton ou glisser-déposer ; chaque carte est une scène tactique.
- « Présenter aux joueurs » pousse la scène sur la vue joueurs ; « Masquer joueurs »
  bascule celle-ci en écran noir (état conservé au rechargement).
- Duplication d'une carte (**⧉**) et suppression à l'unité (**✕**, avec confirmation).
- Réduction automatique des images trop grandes à l'import (carte ≤ 2560 px,
  token ≤ 512 px).
- Decks : regroupement manuel des scènes, renommage par double-clic, recherche par nom.

### Grille
- Grille carrée réglable : taille de case, décalage X/Y, couleur, opacité, épaisseur.
- Sous-grille ×2 à ×5, aimantation des tokens (suit la sous-grille quand elle est active).
- Calibrage en traçant la diagonale d'une case ; outil grille pour déplacer /
  redimensionner à la souris.

### Tokens
- Disques colorés ou images importées ; nom, type PJ/PNJ, initiative, PV / PV max.
- Points de vie : barre, dégâts / soin, PV visibles aux joueurs (masqués / barre /
  barre + chiffres), marqueur « à terre » à 0 PV.
- Liste des tokens dans la barre latérale, triable (initiative ou type + nom).
- **Sélection multiple** : Ctrl/⌘ + clic, Maj + clic (plage), Maj + glisser (rectangle).
  Panneau d'édition groupée : dégâts / soin, type, taille, initiative, PV max, couleur,
  visibilité, PV vus par les joueurs, duplication, suppression. Déplacement de groupe
  en gardant la formation.
- **Duplication** des tokens sélectionnés (**Ctrl/⌘ + D** ou bouton) : tout est repris.
- **États** : icônes prédéfinies (poison, étourdi, endormi, en feu…) + états
  personnalisés, affichés en pastilles au bord du token sur les deux vues.

### Brouillard de guerre
- Pinceau manuel révéler / cacher, curseur d'aperçu, tout révéler / tout cacher.
- **Annulation** du dernier coup de pinceau (**Ctrl+Z** ou bouton ↶, une douzaine
  de niveaux).

### Suivi d'initiative
- Bandeau d'ordre de jeu (**⚔️**) : combattants triés par initiative, tour courant
  en surbrillance + chevron doré sur la carte.
- ◀ / ▶ / touche **N**, compteur de round, clic sur un combattant pour aller à son tour.
- Affichage optionnel de l'ordre sur la vue joueurs (tokens cachés = « ? »).

### Confort
- **Règle de mesure** : maintenir **M** et glisser (distance en cases, grille et
  à vol d'oiseau).
- **Ping** : double-clic sur la carte → repère animé sur les deux vues.
- Molette de la souris sur n'importe quel champ numérique ou curseur.
- Boîtes de dialogue internes (pas `window.confirm` / `prompt`, bloqués par le
  navigateur après plusieurs pop-ups).

### Données
- Persistance IndexedDB ; rechargement sans risque (scène présentée et état restaurés).
- **Export / Import** de toute la campagne dans un fichier `.json` autoportant
  (cartes, decks, tokens, images) — sauvegarde et transfert entre machines.

### Langues
- Français (défaut), anglais, espagnol — sélecteur mémorisé, suivi dans la vue joueurs.
- README trilingue.

### Lancement
- `serve.sh` (macOS / Linux) et `serve.bat` (Windows) → `serve.py` (Python 3,
  cache navigateur désactivé), repli `npx serve`.
- Exécutable Windows autonome `serve.exe` fourni dans l'archive de release (aucun
  prérequis à installer).
