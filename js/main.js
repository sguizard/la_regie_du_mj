// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Point d'entrée : langue + choix du rôle (régie / vue joueurs) =====

import { $, $$ } from './util.js';
import { initI18n, getLang, setLang, availableLangs } from './i18n.js';

const LANG_NAMES = { fr: 'Français', en: 'English', es: 'Español' };

initI18n();
wireLangSelectors();

const view = new URLSearchParams(location.search).get('view');
const landing = $('#landing');

function wireLangSelectors() {
  $$('.lang-select').forEach((sel) => {
    sel.innerHTML = '';
    for (const l of availableLangs()) {
      const o = document.createElement('option');
      o.value = l;
      o.textContent = LANG_NAMES[l] || l.toUpperCase();
      sel.append(o);
    }
    sel.value = getLang();
    sel.addEventListener('change', () => setLang(sel.value));
  });
  window.addEventListener('langchange', () => {
    $$('.lang-select').forEach((s) => { s.value = getLang(); });
  });
}

function startGM() {
  landing.classList.add('hidden');
  $('#player-app').classList.add('hidden');
  $('#gm-app').classList.remove('hidden');
  import('./gm.js').then((m) => m.initGM());
}

function startPlayer() {
  landing.classList.add('hidden');
  $('#gm-app').classList.add('hidden');
  $('#player-app').classList.remove('hidden');
  import('./player.js').then((m) => m.initPlayer());
}

if (view === 'player') {
  startPlayer();
} else if (view === 'gm') {
  startGM();
} else {
  landing.classList.remove('hidden');
  $('#go-gm').addEventListener('click', () => {
    history.replaceState(null, '', '?view=gm');
    startGM();
  });
  $('#go-player').addEventListener('click', () => {
    history.replaceState(null, '', '?view=player');
    startPlayer();
  });
}
