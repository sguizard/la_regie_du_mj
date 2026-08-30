# La Régie du MJ

[Français](README.md) · **English** · [Español](README.es.md)

Tactical maps for in-person tabletop RPG sessions: grid, tokens, hit points, fog of
war. Two windows synced locally:

- **The console** ("la régie") — on your screen: every map, the grid, the tokens, the
  fog brush.
- **Player view** — on the TV / projector: only what the players are allowed to see
  (opaque fog, hidden tokens removed), or a black screen when you decide.

No dependencies, no account, no remote server. Your images stay on your machine
(stored in the browser via IndexedDB).

**Language**: French (default), English or Spanish — selector in the top-right of the
console and on the landing screen. The choice is remembered and follows into the
player view. The name stays "La Régie du MJ" in every language. To add a language:
one entry in `DICT` in [`js/i18n.js`](js/i18n.js) with the same keys.

## Running it

A local static server is required (ES modules + reliable sync between windows) — it
**disables the browser cache** so a plain reload is enough after a code change.

### The easy way: the release executable

On the **[Releases](https://github.com/sguizard/la_regie_du_mj/releases)** page,
download the `.zip` for your platform, extract it, then run **`serve`** — nothing to
install, the browser opens on its own.

- **Windows** (`…-windows.zip`): double-click `serve.exe`.
- **macOS Apple Silicon** (`…-macos-apple-silicon.zip`): in the folder,
  `xattr -dr com.apple.quarantine .` then `./serve` (Intel Macs: see "from source"
  below).
- **Linux** (`…-linux.zip`): `./serve`.

The executables are unsigned: Windows SmartScreen / macOS Gatekeeper will warn on the
first run → **open anyway**. A firewall prompt may also appear — deny public-network
access, `localhost` still works.

### From source (Python 3 or Node.js)

- **macOS / Linux**: `./serve.sh`
- **Windows**: double-click **`serve.bat`** (or type `serve.bat` in PowerShell / cmd)

Both scripts launch `serve.py` if **Python 3** is present, otherwise fall back to
`npx serve` (Node.js, without cache-disabling — then use `Ctrl+Shift+R` after an
update).

**Python 3**: [python.org](https://www.python.org/downloads/) or the Microsoft Store —
on Windows, tick **"Add python.exe to PATH"** during installation. Get the project with
`git clone https://github.com/sguizard/la_regie_du_mj.git` or, on GitHub,
**"Code" → "Download ZIP"**.

### Then

Open **http://localhost:8000** (Chrome, Edge or Firefox) and click **"Open the
console"**. Other port: `./serve.sh 9000`, `serve.bat 9000` or `serve.exe 9000`.

Reloading the console or the player view at any time is safe: the presented scene and
its state (grid, tokens, HP, fog) are restored, and the two windows re-sync.

### Opening the player view

From the console, the **"Open the player view"** button opens a second window
(`?view=player`). Drag it onto the TV and go fullscreen (⛶ button or `F11`). You can
also open `http://localhost:8000/?view=player` directly on the machine wired to the
TV — sync goes through the browser, so both windows must run **in the same browser on
the same machine**.

## Usage

1. **+ Add a map** (or drag-and-drop images onto the sidebar area). Each map is a
   tactical scene. Select it, then **"Show to players"** to send it to the TV. On row
   hover: **⧉** duplicates the map (grid, tokens, fog, initiative tracker); **✕**
   deletes it (with confirmation) — if it was being presented, the player view returns
   to standby.
   Oversized images (map > 2560 px, token > 512 px) are **downscaled automatically** on
   import to save storage space.
2. **🚫 Hide players** (top bar): switches the player view to a **black screen** while
   you prep what's next; click again (**👁 Show players**) to reveal. The state
   survives a reload.
3. **⚙ Grid** (toolbar): cell size, **X/Y offset**, **colour**, **opacity**,
   **thickness**, **sub-grid** (×2 to ×5, thin and discreet), snapping (to the sub-grid
   when it's active), "visible to players". **Calibrate**: trace the diagonal of one
   cell on the map (a preview square + the size in pixels show while you drag). With
   the **▦ Grid** toolbar tool: **left-drag** moves the grid over the map, **right-drag
   up / down** adjusts the cell size.
4. **Tokens** — the left sidebar shows, below the maps, the **list of the scene's
   tokens**. To add a token:
   - **+ Add a token** (below the list): drops a disc at the centre of the view;
   - or the **⛃ Token** tool, then click on the map where you want it;
   - or a **template**: below "+ Add a token", one chip per saved template
     (colour / thumbnail + name). Click = drops a pre-filled token (name, HP, colour,
     type, size, image, conditions). To create a template: a token's ⚙ →
     **⭐ Save as a template**. The chip is removed on hover (**✕**). Templates are
     shared across every scene and included in the export.
   A new token has no name, type, initiative, DEF or HP: on its row, **+ name**,
   **+ type**, **+ init**, **+ DEF** (defence / AC) and **+ HP** add them in one click.
   Once set: the name is edited via ⚙, the initiative and DEF in small fields, the type
   via a **PC / NPC** badge (click = toggle;
   coloured left border). Clicking the **swatch / thumbnail** opens a menu to pick an
   image (library or import) or go back to the disc.
   Row 2: **⚙** (properties), **👁** player visibility, **✕** delete, HP bar + editable
   HP, **−/+** buttons applying the **± amount** at the top of the list.
   Clicking the row (or the token on the map) **selects** it and **centres the map on
   it** — without opening any window.
   - **Multiple selection**: **Ctrl/⌘ + click** (on the map or in the list) adds or
     removes a token from the selection; **Shift + click** in the list selects a range;
     **Shift + drag** on an empty area of the map draws a selection rectangle (adds to
     the selection if Shift is held). When several tokens are selected, a **batch
     editing** panel replaces the properties: damage / heal, type, size, initiative,
     DEF, max HP, colour, player visibility, HP shown to players, **duplication** and
     deletion — applied to all at once (setting max HP to 0 removes HP). Dragging a
     selected token moves **the whole group** while keeping the formation.
     **Ctrl/⌘ + D** duplicates the selection (copies offset by one cell, everything is
     carried over: HP, initiative, conditions…). `Delete` removes the whole selection,
     `Esc` clears it.
   - **Sorting** (menu at the top of the list, remembered): *initiative descending*
     (tokens with no value at the bottom) or *type then name* (PCs first, then NPCs,
     alphabetically). Sorting only affects the list, not the stacking of tokens on the
     map.
   - **Properties** — opens **only via the ⚙ gear** on the row: name, type, initiative,
     DEF, colour, size, HP / max HP, **Appearance** (solid disc or an imported image), "HP
     shown to players" (*hidden* / *bar only* / *bar + numbers*; the GM always sees the
     numbers), **Conditions**, **Duplicate**.
   - **Conditions** (in the properties): a row of preset icons (poison, stunned,
     asleep, burning, bleeding, prone, restrained, shielded, hasted, slowed) — click to
     apply / remove — plus **＋** for a custom condition (emoji or short text).
     Conditions appear as small badges at the token's edge, on the console **and** the
     player view.
   - At 0 HP, the token is greyed out with a red cross.
5. **🔦 Reveal** / **🌫 Hide** tools: paint the fog with the brush (a preview circle
   follows the cursor, green to reveal, red to hide). The size slider, the **reveal all
   / hide all** buttons and **↶ undo** (steps back one brush stroke, also with
   **Ctrl+Z**; about a dozen levels) only appear in the toolbar when one of these two
   tools is selected.

The toolbar is a strip of icons: ✋ move/select · 🔦 reveal · 🌫 hide · ⛃ token · ▦
grid · 📺 player framing · ⚙ grid settings (hover for the tooltip).

**Measuring ruler**: hold **M** and drag on the map. The distance shows in cells — in
grid squares (diagonal = 1) and, in parentheses, as the crow flies. Release M or press
`Esc` to clear. The endpoints snap if grid snapping is active.

### 📺 Player view framing

By default the player view fits the **whole map** on screen — which leaves black bars
when the battlemap doesn't match the TV's aspect. The **📺** tool lets you choose the
portion shown to the players:

- **draw a rectangle** on the map: that's what the players will see (the rest of the
  map is dimmed on your console so you can tell) ;
- or **🎯 My view**: reuses the portion of the map currently visible on your console ;
- **🗺 Whole map** returns to the default.

The frame is saved with the scene and broadcast live. `Esc` leaves the tool.

**Smooth movement**: on the player view, tokens **glide** to their new position instead
of snapping — more legible on a large screen. (Respects the system "reduce motion"
setting.)

### Initiative tracker (turn order)

The **⚔️** button at the top of the token list opens a **turn-order strip** at the
bottom of the map: tokens that have an initiative, sorted highest to lowest, with the
**current turn highlighted** and a **gold chevron** above the token on the map.

- **◀ / ▶** (or the **N** key for "next") change combatant; the **Round** counter
  increments when you wrap back to the top of the order.
- **Click a combatant** = jump straight to its turn.
- **👁** in the strip: shows the turn order **on the player view** (hidden tokens
  appear there as "?"). Without it, only the GM sees the tracker.

Nothing is automatic: advancing turns is up to you. The state (turn, round, player
display) is saved with the scene.

**Mouse wheel** over any number field or slider (HP, initiative, cell size, brush…):
adjusts the value by one step.

**Ping**: double-click anywhere on the map to make an animated "look here" marker
appear — visible on your console and on the player view.

Once a map is presented, every token move, brush stroke or damage is mirrored live to
the player view.

### Decks

**+ New deck**, then drag thumbnails onto the deck. Double-click a deck or scene name
to rename it. The search bar filters by name.

### Keyboard shortcuts (console)

| Key | Action |
|---|---|
| `V` | Move / select tool |
| `R` | Reveal brush |
| `H` | Hide brush |
| `T` | Place-a-token tool |
| `A` | Add a token at the centre |
| `↑` `↓` `←` `→` | Nudge the selected token(s) by one cell |
| `M` (held) + drag | Measuring ruler |
| `N` | Next combatant (initiative tracker) |
| `Ctrl`/`⌘` + `D` | Duplicate the selected token(s) |
| `G` | Toggle the ⚙ Grid panel |
| `F` | Fit the view |
| `Space` + drag | Pan the view |
| wheel | Zoom |
| double-click on the map | Ping ("look here" marker) |
| `Ctrl`/`⌘` + `Z` | Undo the last fog brush stroke |
| `Ctrl`/`⌘` + click · `Shift` + click · `Shift` + drag | Multiple token selection |
| `Delete` | Delete the selected token(s) |
| `Esc` | Clear the selection / close the panels |

## Data & backup

Everything is stored in the browser (IndexedDB, origin `http://localhost:8000`).
- Keep the **same port** from one session to the next, otherwise the data isn't found.
- Usage is shown in the top bar; it **turns gold** with a tooltip when storage fills up
  (past ~1.5 GB or 80% of the browser quota) — time to **export a backup**.
- **"Wipe everything"** erases it all (with confirmation).
- Clearing the site's browsing data also deletes the scenes.

### Export / Import

At the bottom of the map list: **⬇ Export** downloads a self-contained `.json` file
holding **all** the maps, decks and tokens (images included). **⬆ Import** restores
from such a file — it **replaces** all current data (confirmation requested).

Do it regularly: it's the only real backup, and the only way to move your prep from
one machine (or browser) to another. A large file is normal: it carries the images
inline.

## Browsers

Tested on Chrome / Firefox. **Safari does not handle IndexedDB reliably in local mode**
— use Chrome or Firefox.

## Code structure

```
index.html      entry point (console, player view, landing)
style.css
serve.sh / serve.bat / serve.py   local static server without caching (Unix / Windows)
js/
  main.js       language + role routing
  i18n.js       translations (fr / en / es) + selector
  db.js         IndexedDB (decks, scenes, tokenLibrary, meta)
  sync.js       BroadcastChannel between the two windows
  import.js     image import (maps, tokens) + thumbnails
  backup.js     JSON export / import of the whole campaign
  stage.js      pan/zoom camera + image / grid / tokens / fog rendering
  fog.js        fog mask (brush, eraser, undo)
  gm.js         console screen
  player.js     player view screen
```

Add `?debug` to the URL to expose the internal state on `window.__mj`.

## Licence

**La Régie du MJ** — Copyright © 2026 Sébastien Guizard.

This program is free software: you can redistribute it and/or modify it under the
terms of the **GNU General Public License** as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version. It
is distributed without any warranty. See the [LICENSE](LICENSE) file for the full
text, or <https://www.gnu.org/licenses/>.
