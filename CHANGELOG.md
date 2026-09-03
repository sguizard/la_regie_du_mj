# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [1.4.0] - 2026-09-02

### Corrigé
- **Les decks pliés se dépliaient tout seuls** dès qu'on cliquait sur une carte, ou à
  n'importe quel autre rafraîchissement de la barre latérale : l'état plié n'existait
  que comme classe CSS, effacée à chaque reconstruction de la liste. Il est désormais
  conservé en mémoire. Une recherche en cours déplie temporairement les decks, pour ne
  pas masquer ses résultats.

### Ajouté
- **Sélection multiple de cartes** dans la barre latérale, avec les mêmes gestes que la
  liste des tokens : `Ctrl`/`Cmd`+clic pour ajouter ou retirer, `Maj`+clic pour une
  plage (y compris d'un deck à l'autre), `Échap` pour revenir à la carte ouverte. Le
  groupe se glisse d'un deck à l'autre en conservant son ordre relatif ; les boutons ⧉
  et ✕ d'une carte sélectionnée agissent sur tout le groupe, la suppression ne
  demandant qu'une seule confirmation qui annonce le nombre de cartes.
- **Réordonner les decks** en glissant leur en-tête au-dessus ou au-dessous d'un autre
  deck, avec un trait indiquant le point d'insertion. « Sans deck » reste épinglé en
  tête. L'ordre est enregistré (le champ `order` des decks était déjà persisté mais
  n'avait aucune interface).
- **ATK et DM sur les tokens** : bonus d'attaque (affiché signé) et dégâts en notation
  de dés (`2d6`, `1d8 + 3`). Champs dans les propriétés (⚙) et dans l'édition multiple,
  et troisième ligne dans la liste des tokens — affichée seulement si l'un des deux est
  renseigné, pour ne pas alourdir les tokens qui n'en ont pas — où ils se modifient sur
  place. Repris par les modèles de créature et l'export/import. Une saisie de DM hors
  notation de dés est signalée en doré sans jamais être refusée : rien ne doit bloquer
  en pleine partie. Infos MJ uniquement, comme la DEF.

### Modifié
- **Tous les raccourcis à lettre passent sous `Ctrl+Meta`** : `Ctrl+Meta+V`, `+R`, `+H`,
  `+T`, `+A`, `+N`, `+G`, `+F`, et `Ctrl+M` devient `Ctrl+Meta+M` pour la règle de
  mesure. Les lettres nues ne sont plus reconnues : une frappe isolée ne déclenche donc
  plus la recherche de texte du navigateur. `Ctrl+Z` (annuler) et `Ctrl+D` (dupliquer)
  restent inchangés, tout comme `Suppr`, `Échap`, les flèches et `Espace`.
- **Initiative et DEF sont désormais l'une au-dessus de l'autre** dans les propriétés
  d'un token comme dans l'édition multiple, au lieu d'être côte à côte : leurs champs
  occupent toute la largeur du panneau.

## [1.3.3] - 2026-09-02

### Corrigé
- **Les cartes du bas d'un deck bien rempli étaient inatteignables** : le deck était
  écrasé pour tenir dans la barre latérale au lieu de la faire déborder, si bien
  qu'aucun défilement ne s'enclenchait et que les dernières cartes restaient coupées.
  Chaque deck défile désormais sur lui-même (plafonné à 320 px), et la liste des decks
  défile normalement quand ils sont nombreux.

## [1.3.2] - 2026-08-30

### Modifié
- **La règle de mesure devient un outil à bascule** : `Ctrl+M` (ou le nouveau bouton
  📏 de la barre d'outils) l'active et la désactive, au lieu de « maintenir M ».
  L'outil reste actif pour enchaîner plusieurs mesures ; `Ctrl+M` à nouveau ou `Échap`
  pour revenir à l'outil précédent.

## [1.3.1] - 2026-08-30

### Ajouté
- **Ctrl+Z annule aussi la suppression de tokens** (et pas seulement le brouillard) :
  timeline d'annulation partagée entre les deux ; le(s) token(s) restauré(s)
  retrouve(nt) tous leurs champs et redeviennent la sélection. Le bouton ↶ de la
  barre d'outils reste dédié au brouillard.

## [1.3.0] - 2026-08-30

### Ajouté
- **Valeur de DEF** (défense / classe d'armure) sur les tokens : champ dans les
  propriétés (⚙), bouton **+ DEF** et champ éditable dans la liste des tokens, réglage
  groupé dans l'édition multiple, et repris par les modèles de créature et
  l'export/import. Info MJ uniquement (jamais affichée aux joueurs).

## [1.2.0] - 2026-08-30

Modèles de créature, confort de placement, et exécutables macOS / Linux.

### Ajouté
- **Modèles de créature** : enregistre un token complet réutilisable (nom, PV,
  couleur, type, taille, image, états) via ⚙ → « ⭐ Enregistrer comme modèle ». Une
  puce par modèle sous « + Ajouter un token » ; clic = pose un token pré-rempli. Les
  modèles sont partagés entre toutes les scènes et inclus dans l'export/import.
  (IndexedDB passe en version 2 — nouveau magasin `templates`.)
- **Flèches du clavier** : décalent d'une case le(s) token(s) sélectionné(s).
- **Alerte de stockage** : l'indicateur d'espace passe en doré (infobulle + message)
  au-delà de ~1,5 Go ou 80 % du quota du navigateur, pour penser à exporter.
- **Exécutables autonomes macOS (Apple Silicon) et Linux** dans les releases, en plus
  de Windows (même approche PyInstaller, build multi-plateforme).

## [1.1.0] - 2026-08-30

Amélioration de la vue joueurs.

### Ajouté
- **Cadrage de la vue joueurs** (outil 📺) : trace le rectangle de la carte montré aux
  joueurs, ou « 🎯 Ma vue » pour reprendre la portion visible dans la régie, ou
  « 🗺 Toute la carte » pour le comportement par défaut. Le cadre est enregistré avec
  la scène (et dans l'export), diffusé en direct ; le hors-cadre est grisé sur la régie.
  Résout les bandes noires quand la battlemap n'est pas au format de la TV.
- **Déplacement fluide des tokens sur la vue joueurs** : les tokens glissent vers leur
  nouvelle position au lieu de sauter. Respecte « réduire les animations » du système.
  La régie reste directe.

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
