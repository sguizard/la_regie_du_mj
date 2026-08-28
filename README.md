# La Régie du MJ

Cartes tactiques pour parties de JDR en présentiel : grille, tokens, points de vie,
brouillard de guerre. Deux fenêtres synchronisées en local :

- **La régie** — sur ton écran : toutes les cartes, la grille, les tokens, le pinceau
  de brouillard.
- **Vue joueurs** — sur la TV / le vidéoprojecteur : uniquement ce que les joueurs ont
  le droit de voir (brouillard opaque, tokens cachés masqués), ou un écran noir quand
  tu le décides.

Aucune dépendance, aucun compte, aucun serveur distant. Tes images restent sur ta
machine (stockées dans le navigateur via IndexedDB).

**Langue** : français (par défaut), anglais ou espagnol — sélecteur en haut à droite de
la régie et sur l'écran d'accueil. Le choix est mémorisé et suit dans la vue joueurs.
Le nom reste « La Régie du MJ » dans toutes les langues. Pour ajouter une langue : une
entrée dans `DICT` de [`js/i18n.js`](js/i18n.js) avec les mêmes clés.

## Lancer

Un serveur statique local est nécessaire (modules ES + synchro fiable entre fenêtres) :

```bash
./serve.sh
```

puis ouvre **http://localhost:8000** et clique **« Ouvrir la régie »**.

`serve.sh` lance `serve.py` (python3) — un petit serveur qui **désactive le cache
navigateur**, pour qu'un simple rechargement suffise après une mise à jour du code.
Fallback `npx serve` si python3 est absent. Autre port : `./serve.sh 9000`.

Recharger la régie ou la vue joueurs à tout moment est sans risque : la scène
présentée et son état (grille, tokens, PV, brouillard) sont restaurés, et les deux
fenêtres se resynchronisent.

### Ouvrir la vue joueurs

Depuis la régie, bouton **« Ouvrir la vue joueurs »** : une seconde fenêtre s'ouvre
(`?view=player`). Fais-la glisser sur la TV et passe-la en plein écran (bouton ⛶ ou
`F11`). Tu peux aussi ouvrir directement `http://localhost:8000/?view=player` sur la
machine reliée à la TV — la synchro passe par le navigateur, donc les deux fenêtres
doivent tourner **dans le même navigateur sur la même machine**.

## Utilisation

1. **+ Ajouter une carte** (ou glisser-déposer des images dans la zone de la barre
   latérale). Chaque carte est une scène tactique. Sélectionne-la, puis
   **« Présenter aux joueurs »** pour l'envoyer sur la TV.
2. **🚫 Masquer joueurs** (barre du haut) : bascule la vue joueurs en **écran noir**
   pendant que tu prépares la suite ; re-clique (**👁 Afficher joueurs**) pour révéler.
   L'état est conservé au rechargement.
3. **⚙ Grille** (barre d'outils) : taille de case, **décalage X/Y**, **couleur**,
   **opacité**, **épaisseur**, **sous-grille** (×2 à ×5, tracé fin et discret),
   aimantation (sur la sous-grille quand elle est active), « visible par les joueurs ».
   **Calibrer** :
   trace la diagonale d'une case sur la carte (un carré d'aperçu + la taille en pixels
   s'affichent pendant le tracé). Avec l'outil **▦ Grille** de la barre d'outils :
   **glisser (clic gauche)** déplace la grille sur la carte, **glisser vers le haut /
   bas avec le clic droit** ajuste la taille des cases.
4. **Tokens** — la barre latérale gauche affiche, sous les cartes, la **liste des
   tokens de la scène**. Pour ajouter un token :
   - **+ Ajouter un token** (sous la liste) : pose un disque au centre de la vue ;
   - ou outil **⛃ Token** puis clic sur la carte à l'endroit voulu.
   Un nouveau token n'a ni nom, ni type, ni initiative, ni PV : sur sa ligne,
   **+ nom**, **+ type**, **+ init** et **+ PV** les ajoutent en un clic. Une fois
   définis : le nom s'édite via ⚙, l'initiative dans un petit champ, le type via un
   badge **PJ / PNJ** (clic = bascule ; bordure colorée à gauche). Cliquer la
   **pastille / vignette** ouvre un menu pour choisir une image (bibliothèque ou
   import) ou revenir au disque.
   Ligne 2 : **⚙** (propriétés), **👁** visibilité joueurs, **✕** supprimer, barre de
   PV + PV modifiables, boutons **−/+** appliquant le **montant ±** en haut de la liste.
   Cliquer la ligne (ou le token sur la carte) le **sélectionne** et **centre la carte
   dessus** — sans ouvrir de fenêtre.
   - **Sélection multiple** : **Ctrl/⌘ + clic** (sur la carte ou dans la liste) ajoute
     ou retire un token de la sélection ; **Maj + clic** dans la liste sélectionne une
     plage ; **Maj + glisser** sur une zone vide de la carte trace un rectangle de
     sélection (ajoute à la sélection si Maj est maintenu). Quand plusieurs tokens sont
     sélectionnés, un panneau **édition groupée** remplace les propriétés : dégâts /
     soin, type, taille, initiative, PV max, couleur, visibilité joueurs, PV vus par
     les joueurs, et suppression — appliqués à tous d'un coup (mettre PV max à 0
     retire les PV). Glisser un token sélectionné déplace
     **tout le groupe** en gardant la formation. `Suppr` supprime toute la sélection,
     `Échap` la vide.
   - **Tri** (menu en haut de la liste, mémorisé) : *initiative décroissante* (les
     tokens sans valeur en bas) ou *type puis nom* (PJ d'abord, puis PNJ, par ordre
     alphabétique). Le tri n'affecte que la liste, pas l'empilement des tokens sur la carte.
   - **Propriétés** — s'ouvre **uniquement via l'engrenage ⚙** de la ligne : nom,
     type, initiative, couleur, taille, PV / PV max, **Apparence** (disque plein ou une
     image importée), « PV vus par les joueurs » (*masqués* / *barre seule* /
     *barre + chiffres* ; le MJ voit toujours les chiffres).
   - À 0 PV, le token est grisé avec une croix rouge.
5. Outils **🔦 Révéler** / **🌫 Cacher** : peins le brouillard au pinceau (un cercle
   d'aperçu suit le curseur, vert pour révéler, rouge pour cacher). Le réglage de
   taille et les boutons **tout révéler / tout cacher** n'apparaissent dans la barre
   d'outils que quand un de ces deux outils est sélectionné.

La barre d'outils est une bande d'icônes : ✋ déplacer/sélectionner · 🔦 révéler ·
🌫 cacher · ⛃ token · ▦ grille · ⚙ réglages de grille (survole pour l'infobulle).

**Molette de la souris** sur n'importe quel champ numérique ou curseur (PV, initiative,
taille de case, pinceau…) : ajuste la valeur d'un cran.

**Ping** : double-clique n'importe où sur la carte pour faire apparaître un repère
animé « regarde ici » — visible sur ta régie et sur la vue joueurs.

Une fois la carte présentée, chaque déplacement de token, coup de pinceau ou dégât
est répercuté en direct sur la vue joueurs.

### Decks
**+ Nouveau deck**, puis glisse les vignettes vers le deck. Double-clic sur un nom de
deck ou de scène pour le renommer. La barre de recherche filtre par nom.

### Raccourcis clavier (régie)
| Touche | Action |
|---|---|
| `V` | Outil déplacer / sélectionner |
| `R` | Pinceau révéler |
| `H` | Pinceau cacher |
| `T` | Outil poser un token |
| `A` | Ajouter un token au centre |
| `G` | Ouvrir/fermer le panneau ⚙ Grille |
| `F` | Ajuster la vue |
| `Espace` + glisser | Déplacer la vue |
| molette | Zoom |
| double-clic sur la carte | Ping (repère « regarde ici ») |
| `Ctrl`/`⌘` + clic · `Maj` + clic · `Maj` + glisser | Sélection multiple de tokens |
| `Suppr` | Supprimer le(s) token(s) sélectionné(s) |
| `Échap` | Vider la sélection / fermer les panneaux |

## Données & sauvegarde

Tout est stocké dans le navigateur (IndexedDB, origine `http://localhost:8000`).
- Garde le **même port** d'une session à l'autre, sinon les données ne sont pas
  retrouvées.
- L'espace utilisé s'affiche dans la barre du haut ; **« Vider tout »** efface tout
  (avec confirmation).
- Vider les données de navigation du site supprime aussi les scènes.

## Navigateurs

Testé sur Chrome / Firefox. **Safari ne gère pas IndexedDB de façon fiable en
local** — utilise Chrome ou Firefox.

## Structure du code

```
index.html      point d'entrée (régie, vue joueurs, accueil)
style.css
serve.sh / serve.py   serveur statique local sans cache
js/
  main.js       langue + routage de rôle
  i18n.js       traductions (fr / en / es) + sélecteur
  db.js         IndexedDB (decks, scenes, tokenLibrary, meta)
  sync.js       BroadcastChannel entre les deux fenêtres
  import.js     import d'images (cartes, tokens) + vignettes
  stage.js      caméra pan/zoom + rendu image / grille / tokens / brouillard
  fog.js        masque de brouillard (pinceau, gomme)
  gm.js         écran régie
  player.js     écran vue joueurs
```

Ajoute `?debug` à l'URL pour exposer l'état interne sur `window.__mj`.

## Licence

**La Régie du MJ** — Copyright © 2026 Sébastien Guizard.

Ce programme est un logiciel libre : vous pouvez le redistribuer et/ou le modifier
selon les termes de la **GNU General Public License** telle que publiée par la Free
Software Foundation, soit la version 3 de la Licence, soit (à votre gré) toute version
ultérieure. Il est distribué sans aucune garantie. Voir le fichier [LICENSE](LICENSE)
pour le texte complet, ou <https://www.gnu.org/licenses/>.

*This program is free software: you can redistribute it and/or modify it under the
terms of the GNU General Public License as published by the Free Software Foundation,
either version 3 of the License, or (at your option) any later version. See
[LICENSE](LICENSE).*
