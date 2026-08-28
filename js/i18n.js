// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Internationalisation (léger, sans dépendance) =====
// Ajouter une langue = ajouter une entrée dans DICT avec les mêmes clés.

const DICT = {
  fr: {
    'app.title': 'La Régie du MJ',
    'app.name': 'La Régie du&nbsp;MJ',

    'lang.label': 'Langue',
    'landing.tagline': 'Cartes tactiques, tokens et brouillard de guerre pour vos parties en présentiel.',
    'landing.openGm': 'Ouvrir la régie',
    'landing.openPlayer': 'Ouvrir la vue joueurs',
    'landing.hint': 'Ouvrez la régie sur votre écran, la vue joueurs sur la TV.',

    'topbar.noScene': 'Aucune carte',
    'topbar.present': 'Présenter aux joueurs',
    'topbar.hidePlayers': '🚫 Masquer joueurs',
    'topbar.showPlayers': '👁 Afficher joueurs',
    'topbar.blackoutTitle': 'Masquer la scène aux joueurs (écran noir)',
    'topbar.openPlayer': 'Ouvrir la vue joueurs',
    'topbar.playerOpen': 'Vue joueurs : ouverte',
    'topbar.playerClosed': 'Vue joueurs : fermée',
    'topbar.fit': 'Ajuster',
    'topbar.fitTitle': 'Ajuster la vue (touche F)',
    'topbar.fullscreenTitle': 'Plein écran',
    'topbar.storageTitle': 'Espace de stockage utilisé',
    'topbar.wipe': 'Vider tout',
    'topbar.wipeTitle': 'Effacer toutes les données',

    'sidebar.addMap': '+ Ajouter une carte',
    'sidebar.search': 'Rechercher une carte…',
    'sidebar.addDeck': '+ Nouveau deck',
    'sidebar.dropzone': 'Déposez des images de cartes ici',
    'sidebar.noDeck': 'Sans deck',
    'deck.renameTitle': 'Double-clic pour renommer',
    'deck.deleteTitle': 'Supprimer le deck',
    'deck.newName': 'Nouveau deck',
    'deck.namePrompt': 'Nom du deck :',
    'scene.deleteTitle': 'Supprimer la carte',
    'dialog.confirm': 'Confirmer',
    'dialog.cancel': 'Annuler',
    'dialog.ok': 'OK',

    'backup.export': '⬇ Exporter',
    'backup.exportTitle': 'Télécharger une sauvegarde (cartes, decks, tokens, images)',
    'backup.import': '⬆ Importer',
    'backup.importTitle': 'Restaurer depuis un fichier de sauvegarde',
    'backup.empty': 'Rien à exporter pour le moment.',
    'backup.exported': 'Sauvegarde téléchargée.',
    'backup.confirmImport': 'Importer cette sauvegarde ? Elle remplacera TOUTES les cartes, decks et tokens actuels. Action irréversible.',
    'backup.badFile': 'Fichier de sauvegarde invalide ou illisible.',
    'backup.done': 'Sauvegarde importée.',

    'tokens.head': 'Tokens',
    'tokens.title': 'Tokens ({n})',
    'tokens.amountTitle': 'Montant appliqué par les boutons −/+',
    'tokens.sortTitle': 'Tri de la liste',
    'tokens.sortInit': 'Tri : initiative (décroissante)',
    'tokens.sortType': 'Tri : type puis nom',
    'tokens.add': '+ Ajouter un token',
    'tokens.addTitle': 'Poser un token au centre de la vue',
    'tokens.empty': 'Aucun token. Outil ⛃ pour en poser.',
    'tokens.addInit': '+ init',
    'tokens.addInitTitle': "Définir l'initiative",
    'tokens.initTitle': 'Initiative',
    'tokens.initPrompt': 'Initiative ?',
    'tokens.addType': '+ type',
    'tokens.addTypeTitle': 'Définir le type',
    'tokens.toggleType': 'Basculer PJ / PNJ',
    'tokens.chooseImage': 'Choisir une image',
    'tokens.addName': '+ nom',
    'tokens.namePrompt': 'Nom du token ?',
    'tokens.configTitle': 'Configurer ce token',
    'tokens.visibleYes': 'Visible par les joueurs',
    'tokens.visibleNo': 'Masqué aux joueurs',
    'tokens.deleteTitle': 'Supprimer ce token',
    'tokens.dmgTitle': 'Retirer {n} PV',
    'tokens.healTitle': 'Rendre {n} PV',
    'tokens.addHp': '+ PV',
    'tokens.hpMaxPrompt': 'PV max de ce token ?',

    'tool.move': 'Déplacer / sélectionner (V)',
    'tool.reveal': 'Révéler le brouillard (R)',
    'tool.hide': 'Re-cacher le brouillard (H)',
    'tool.token': 'Poser un token (T)',
    'tool.grid': 'Déplacer / redimensionner la grille',
    'tool.config': 'Réglages de la grille (G)',
    'tool.brushTitle': 'Taille du pinceau',
    'tool.revealAll': '🔦 tout',
    'tool.hideAll': '🌫 tout',
    'tool.revealAllTitle': 'Tout révéler',
    'tool.hideAllTitle': 'Tout cacher',
    'tool.fogUndoTitle': 'Annuler le dernier coup de pinceau (Ctrl+Z)',

    'config.grid': 'Grille',
    'config.cellSize': 'Taille de case (px)',
    'config.offsetX': 'Décalage X',
    'config.offsetY': 'Décalage Y',
    'config.calibrate': 'Calibrer (tracer une case)',
    'config.color': 'Couleur',
    'config.opacity': 'Opacité',
    'config.width': 'Épaisseur',
    'config.subdiv': 'Sous-grille',
    'config.subdivNone': 'Aucune',
    'config.subdivHalf': '×2 (demi-cases)',
    'config.snap': 'Aimantation des tokens',
    'config.showPlayers': 'Visible par les joueurs',
    'config.close': 'Fermer',

    'props.token': 'Token',
    'props.name': 'Nom',
    'props.type': 'Type',
    'props.typeNone': '—',
    'props.initiative': 'Initiative',
    'props.color': 'Couleur',
    'props.size': 'Taille',
    'props.visible': 'Visible par les joueurs',
    'props.appearance': 'Apparence',
    'props.disc': 'Disque',
    'props.importImage': 'Importer une image…',
    'props.hpSection': 'Points de vie',
    'props.hp': 'PV',
    'props.hpMax': 'PV max',
    'props.amount': 'Montant',
    'props.dmg': '− Dégâts',
    'props.dmgTitle': 'Retirer des PV',
    'props.heal': '+ Soin',
    'props.healTitle': 'Rendre des PV',
    'props.hpShare': 'PV vus par les joueurs',
    'props.hpShareOff': 'Masqués',
    'props.hpShareBar': 'Barre seule',
    'props.hpShareFull': 'Barre + chiffres',
    'props.delete': 'Supprimer le token',
    'props.close': 'Fermer',

    'appearance.menuTitle': 'Apparence du token',
    'appearance.disc': 'Disque',
    'appearance.import': 'Importer…',
    'appearance.use': 'Utiliser « {name} »',
    'appearance.removeLibTitle': 'Retirer de la bibliothèque',
    'appearance.confirmRemoveLib': 'Retirer « {name} » de la bibliothèque ?',
    'appearance.noImages': 'Aucune image importée.',

    'multi.title': '{n} tokens',
    'multi.keep': '— (inchangé)',
    'multi.allVisible': '👁 Tous visibles',
    'multi.allHidden': '🚫 Tous masqués',
    'multi.delete': 'Supprimer les {n} tokens',
    'multi.hint': '{n} tokens sélectionnés',

    'hint.calibrate': "Tracez la diagonale d'UNE case sur la carte.",
    'hint.cellSize': 'Case : {px} px',

    'confirm.wipe': 'Effacer TOUTES les cartes, decks et tokens ? Action irréversible.',
    'confirm.deleteDeck': 'Supprimer ce deck ? Les cartes seront déplacées vers « Sans deck ».',
    'confirm.deleteScene': 'Supprimer la carte « {name} » ? Sa grille, ses tokens et son brouillard seront perdus. Action irréversible.',

    'player.waiting': 'En attente du MJ…',
    'player.fullscreenTitle': 'Plein écran',

    'misc.unnamed': 'Sans nom',
  },

  en: {
    'app.title': 'La Régie du MJ',
    'app.name': 'La Régie du&nbsp;MJ',

    'lang.label': 'Language',
    'landing.tagline': 'Tactical maps, tokens and fog of war for your in-person games.',
    'landing.openGm': 'Open the console',
    'landing.openPlayer': 'Open the player view',
    'landing.hint': 'Open the console on your screen, the player view on the TV.',

    'topbar.noScene': 'No map',
    'topbar.present': 'Show to players',
    'topbar.hidePlayers': '🚫 Hide from players',
    'topbar.showPlayers': '👁 Show players',
    'topbar.blackoutTitle': 'Hide the scene from players (black screen)',
    'topbar.openPlayer': 'Open the player view',
    'topbar.playerOpen': 'Player view: open',
    'topbar.playerClosed': 'Player view: closed',
    'topbar.fit': 'Fit',
    'topbar.fitTitle': 'Fit view to map (F key)',
    'topbar.fullscreenTitle': 'Fullscreen',
    'topbar.storageTitle': 'Storage used',
    'topbar.wipe': 'Wipe all',
    'topbar.wipeTitle': 'Erase all data',

    'sidebar.addMap': '+ Add a map',
    'sidebar.search': 'Search a map…',
    'sidebar.addDeck': '+ New deck',
    'sidebar.dropzone': 'Drop map images here',
    'sidebar.noDeck': 'No deck',
    'deck.renameTitle': 'Double-click to rename',
    'deck.deleteTitle': 'Delete deck',
    'deck.newName': 'New deck',
    'deck.namePrompt': 'Deck name:',
    'scene.deleteTitle': 'Delete map',
    'dialog.confirm': 'Confirm',
    'dialog.cancel': 'Cancel',
    'dialog.ok': 'OK',

    'backup.export': '⬇ Export',
    'backup.exportTitle': 'Download a backup (maps, decks, tokens, images)',
    'backup.import': '⬆ Import',
    'backup.importTitle': 'Restore from a backup file',
    'backup.empty': 'Nothing to export yet.',
    'backup.exported': 'Backup downloaded.',
    'backup.confirmImport': 'Import this backup? It will replace ALL current maps, decks and tokens. This cannot be undone.',
    'backup.badFile': 'Invalid or unreadable backup file.',
    'backup.done': 'Backup imported.',

    'tokens.head': 'Tokens',
    'tokens.title': 'Tokens ({n})',
    'tokens.amountTitle': 'Amount applied by the −/+ buttons',
    'tokens.sortTitle': 'List sorting',
    'tokens.sortInit': 'Sort: initiative (descending)',
    'tokens.sortType': 'Sort: type then name',
    'tokens.add': '+ Add a token',
    'tokens.addTitle': 'Drop a token at the centre of the view',
    'tokens.empty': 'No token. Use the ⛃ tool to place one.',
    'tokens.addInit': '+ init',
    'tokens.addInitTitle': 'Set initiative',
    'tokens.initTitle': 'Initiative',
    'tokens.initPrompt': 'Initiative?',
    'tokens.addType': '+ type',
    'tokens.addTypeTitle': 'Set the type',
    'tokens.toggleType': 'Toggle PC / NPC',
    'tokens.chooseImage': 'Choose an image',
    'tokens.addName': '+ name',
    'tokens.namePrompt': 'Token name?',
    'tokens.configTitle': 'Configure this token',
    'tokens.visibleYes': 'Visible to players',
    'tokens.visibleNo': 'Hidden from players',
    'tokens.deleteTitle': 'Delete this token',
    'tokens.dmgTitle': 'Remove {n} HP',
    'tokens.healTitle': 'Restore {n} HP',
    'tokens.addHp': '+ HP',
    'tokens.hpMaxPrompt': "This token's max HP?",

    'tool.move': 'Move / select (V)',
    'tool.reveal': 'Reveal fog (R)',
    'tool.hide': 'Re-hide fog (H)',
    'tool.token': 'Place a token (T)',
    'tool.grid': 'Move / resize the grid',
    'tool.config': 'Grid settings (G)',
    'tool.brushTitle': 'Brush size',
    'tool.revealAll': '🔦 all',
    'tool.hideAll': '🌫 all',
    'tool.revealAllTitle': 'Reveal everything',
    'tool.hideAllTitle': 'Hide everything',
    'tool.fogUndoTitle': 'Undo last brush stroke (Ctrl+Z)',

    'config.grid': 'Grid',
    'config.cellSize': 'Cell size (px)',
    'config.offsetX': 'Offset X',
    'config.offsetY': 'Offset Y',
    'config.calibrate': 'Calibrate (draw one cell)',
    'config.color': 'Colour',
    'config.opacity': 'Opacity',
    'config.width': 'Thickness',
    'config.subdiv': 'Sub-grid',
    'config.subdivNone': 'None',
    'config.subdivHalf': '×2 (half-cells)',
    'config.snap': 'Snap tokens',
    'config.showPlayers': 'Visible to players',
    'config.close': 'Close',

    'props.token': 'Token',
    'props.name': 'Name',
    'props.type': 'Type',
    'props.typeNone': '—',
    'props.initiative': 'Initiative',
    'props.color': 'Colour',
    'props.size': 'Size',
    'props.visible': 'Visible to players',
    'props.appearance': 'Appearance',
    'props.disc': 'Disc',
    'props.importImage': 'Import an image…',
    'props.hpSection': 'Hit points',
    'props.hp': 'HP',
    'props.hpMax': 'Max HP',
    'props.amount': 'Amount',
    'props.dmg': '− Damage',
    'props.dmgTitle': 'Remove HP',
    'props.heal': '+ Heal',
    'props.healTitle': 'Restore HP',
    'props.hpShare': 'HP shown to players',
    'props.hpShareOff': 'Hidden',
    'props.hpShareBar': 'Bar only',
    'props.hpShareFull': 'Bar + numbers',
    'props.delete': 'Delete the token',
    'props.close': 'Close',

    'appearance.menuTitle': 'Token appearance',
    'appearance.disc': 'Disc',
    'appearance.import': 'Import…',
    'appearance.use': 'Use "{name}"',
    'appearance.removeLibTitle': 'Remove from the library',
    'appearance.confirmRemoveLib': 'Remove "{name}" from the library?',
    'appearance.noImages': 'No image imported.',

    'multi.title': '{n} tokens',
    'multi.keep': '— (unchanged)',
    'multi.allVisible': '👁 All visible',
    'multi.allHidden': '🚫 All hidden',
    'multi.delete': 'Delete the {n} tokens',
    'multi.hint': '{n} tokens selected',

    'hint.calibrate': 'Draw the diagonal of ONE cell on the map.',
    'hint.cellSize': 'Cell: {px} px',

    'confirm.wipe': 'Erase ALL maps, decks and tokens? This cannot be undone.',
    'confirm.deleteDeck': 'Delete this deck? Its maps will move to "No deck".',
    'confirm.deleteScene': 'Delete the map "{name}"? Its grid, tokens and fog will be lost. This cannot be undone.',

    'player.waiting': 'Waiting for the GM…',
    'player.fullscreenTitle': 'Fullscreen',

    'misc.unnamed': 'Untitled',
  },

  es: {
    'app.title': 'La Régie du MJ',
    'app.name': 'La Régie du&nbsp;MJ',

    'lang.label': 'Idioma',
    'landing.tagline': 'Mapas tácticos, tokens y niebla de guerra para vuestras partidas presenciales.',
    'landing.openGm': 'Abrir la consola',
    'landing.openPlayer': 'Abrir la vista de jugadores',
    'landing.hint': 'Abre la consola en tu pantalla, la vista de jugadores en la TV.',

    'topbar.noScene': 'Sin mapa',
    'topbar.present': 'Mostrar a los jugadores',
    'topbar.hidePlayers': '🚫 Ocultar a jugadores',
    'topbar.showPlayers': '👁 Mostrar jugadores',
    'topbar.blackoutTitle': 'Ocultar la escena a los jugadores (pantalla negra)',
    'topbar.openPlayer': 'Abrir la vista de jugadores',
    'topbar.playerOpen': 'Vista de jugadores: abierta',
    'topbar.playerClosed': 'Vista de jugadores: cerrada',
    'topbar.fit': 'Ajustar',
    'topbar.fitTitle': 'Ajustar la vista al mapa (tecla F)',
    'topbar.fullscreenTitle': 'Pantalla completa',
    'topbar.storageTitle': 'Espacio de almacenamiento usado',
    'topbar.wipe': 'Borrar todo',
    'topbar.wipeTitle': 'Borrar todos los datos',

    'sidebar.addMap': '+ Añadir un mapa',
    'sidebar.search': 'Buscar un mapa…',
    'sidebar.addDeck': '+ Nuevo mazo',
    'sidebar.dropzone': 'Suelta aquí imágenes de mapas',
    'sidebar.noDeck': 'Sin mazo',
    'deck.renameTitle': 'Doble clic para renombrar',
    'deck.deleteTitle': 'Eliminar el mazo',
    'deck.newName': 'Nuevo mazo',
    'deck.namePrompt': 'Nombre del mazo:',
    'scene.deleteTitle': 'Eliminar el mapa',
    'dialog.confirm': 'Confirmar',
    'dialog.cancel': 'Cancelar',
    'dialog.ok': 'OK',

    'backup.export': '⬇ Exportar',
    'backup.exportTitle': 'Descargar una copia de seguridad (mapas, mazos, tokens, imágenes)',
    'backup.import': '⬆ Importar',
    'backup.importTitle': 'Restaurar desde un archivo de copia de seguridad',
    'backup.empty': 'Nada que exportar por ahora.',
    'backup.exported': 'Copia de seguridad descargada.',
    'backup.confirmImport': '¿Importar esta copia de seguridad? Reemplazará TODOS los mapas, mazos y tokens actuales. Acción irreversible.',
    'backup.badFile': 'Archivo de copia de seguridad no válido o ilegible.',
    'backup.done': 'Copia de seguridad importada.',

    'tokens.head': 'Tokens',
    'tokens.title': 'Tokens ({n})',
    'tokens.amountTitle': 'Cantidad aplicada por los botones −/+',
    'tokens.sortTitle': 'Orden de la lista',
    'tokens.sortInit': 'Orden: iniciativa (descendente)',
    'tokens.sortType': 'Orden: tipo y luego nombre',
    'tokens.add': '+ Añadir un token',
    'tokens.addTitle': 'Colocar un token en el centro de la vista',
    'tokens.empty': 'Ningún token. Usa la herramienta ⛃ para colocar uno.',
    'tokens.addInit': '+ inic',
    'tokens.addInitTitle': 'Definir la iniciativa',
    'tokens.initTitle': 'Iniciativa',
    'tokens.initPrompt': '¿Iniciativa?',
    'tokens.addType': '+ tipo',
    'tokens.addTypeTitle': 'Definir el tipo',
    'tokens.toggleType': 'Cambiar PJ / PNJ',
    'tokens.chooseImage': 'Elegir una imagen',
    'tokens.addName': '+ nombre',
    'tokens.namePrompt': '¿Nombre del token?',
    'tokens.configTitle': 'Configurar este token',
    'tokens.visibleYes': 'Visible para los jugadores',
    'tokens.visibleNo': 'Oculto a los jugadores',
    'tokens.deleteTitle': 'Eliminar este token',
    'tokens.dmgTitle': 'Quitar {n} PV',
    'tokens.healTitle': 'Restaurar {n} PV',
    'tokens.addHp': '+ PV',
    'tokens.hpMaxPrompt': '¿PV máx. de este token?',

    'tool.move': 'Mover / seleccionar (V)',
    'tool.reveal': 'Revelar la niebla (R)',
    'tool.hide': 'Volver a ocultar la niebla (H)',
    'tool.token': 'Colocar un token (T)',
    'tool.grid': 'Mover / redimensionar la rejilla',
    'tool.config': 'Ajustes de la rejilla (G)',
    'tool.brushTitle': 'Tamaño del pincel',
    'tool.revealAll': '🔦 todo',
    'tool.hideAll': '🌫 todo',
    'tool.revealAllTitle': 'Revelar todo',
    'tool.hideAllTitle': 'Ocultar todo',
    'tool.fogUndoTitle': 'Deshacer el último trazo de pincel (Ctrl+Z)',

    'config.grid': 'Rejilla',
    'config.cellSize': 'Tamaño de casilla (px)',
    'config.offsetX': 'Desplazamiento X',
    'config.offsetY': 'Desplazamiento Y',
    'config.calibrate': 'Calibrar (trazar una casilla)',
    'config.color': 'Color',
    'config.opacity': 'Opacidad',
    'config.width': 'Grosor',
    'config.subdiv': 'Subrejilla',
    'config.subdivNone': 'Ninguna',
    'config.subdivHalf': '×2 (media casilla)',
    'config.snap': 'Ajustar tokens a la rejilla',
    'config.showPlayers': 'Visible para los jugadores',
    'config.close': 'Cerrar',

    'props.token': 'Token',
    'props.name': 'Nombre',
    'props.type': 'Tipo',
    'props.typeNone': '—',
    'props.initiative': 'Iniciativa',
    'props.color': 'Color',
    'props.size': 'Tamaño',
    'props.visible': 'Visible para los jugadores',
    'props.appearance': 'Apariencia',
    'props.disc': 'Disco',
    'props.importImage': 'Importar una imagen…',
    'props.hpSection': 'Puntos de vida',
    'props.hp': 'PV',
    'props.hpMax': 'PV máx.',
    'props.amount': 'Cantidad',
    'props.dmg': '− Daño',
    'props.dmgTitle': 'Quitar PV',
    'props.heal': '+ Curar',
    'props.healTitle': 'Restaurar PV',
    'props.hpShare': 'PV visibles para los jugadores',
    'props.hpShareOff': 'Ocultos',
    'props.hpShareBar': 'Solo barra',
    'props.hpShareFull': 'Barra + números',
    'props.delete': 'Eliminar el token',
    'props.close': 'Cerrar',

    'appearance.menuTitle': 'Apariencia del token',
    'appearance.disc': 'Disco',
    'appearance.import': 'Importar…',
    'appearance.use': 'Usar «{name}»',
    'appearance.removeLibTitle': 'Quitar de la biblioteca',
    'appearance.confirmRemoveLib': '¿Quitar «{name}» de la biblioteca?',
    'appearance.noImages': 'Ninguna imagen importada.',

    'multi.title': '{n} tokens',
    'multi.keep': '— (sin cambios)',
    'multi.allVisible': '👁 Todos visibles',
    'multi.allHidden': '🚫 Todos ocultos',
    'multi.delete': 'Eliminar los {n} tokens',
    'multi.hint': '{n} tokens seleccionados',

    'hint.calibrate': 'Traza la diagonal de UNA casilla en el mapa.',
    'hint.cellSize': 'Casilla: {px} px',

    'confirm.wipe': '¿Borrar TODOS los mapas, mazos y tokens? Acción irreversible.',
    'confirm.deleteDeck': '¿Eliminar este mazo? Los mapas pasarán a «Sin mazo».',
    'confirm.deleteScene': '¿Eliminar el mapa «{name}»? Se perderán su cuadrícula, sus tokens y su niebla. Acción irreversible.',

    'player.waiting': 'Esperando al Máster…',
    'player.fullscreenTitle': 'Pantalla completa',

    'misc.unnamed': 'Sin nombre',
  },
};

const FALLBACK = 'fr';
const STORE_KEY = 'regie-lang';

let lang = detectLang();

function detectLang() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && DICT[saved]) return saved;
  } catch { /* ignore */ }
  return FALLBACK; // français par défaut, quelle que soit la langue du navigateur
}

/** Traduit une clé. `vars` : { name, n, px, … } interpolés via {name}. */
export function t(key, vars) {
  let s = (DICT[lang] && DICT[lang][key]) ?? (DICT[FALLBACK][key]) ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
  return s;
}

export function getLang() { return lang; }
export function availableLangs() { return Object.keys(DICT); }

function refresh() {
  applyI18n(document);
  document.documentElement.lang = lang;
  document.title = t('app.title');
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

export function setLang(l) {
  if (!DICT[l] || l === lang) return;
  lang = l;
  try { localStorage.setItem(STORE_KEY, l); } catch { /* ignore */ }
  refresh();
}

/** Applique les traductions aux éléments [data-i18n*] sous `root`. */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

export function initI18n() {
  document.documentElement.lang = lang;
  document.title = t('app.title');
  applyI18n(document);
  // suit un changement de langue fait dans une autre fenêtre (régie ↔ vue joueurs)
  window.addEventListener('storage', (e) => {
    if (e.key === STORE_KEY && e.newValue && DICT[e.newValue] && e.newValue !== lang) {
      lang = e.newValue;
      refresh();
    }
  });
}
