// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== La régie (écran du MJ) =====

import { $, $$, el, uid, clamp, debounce, throttle, formatBytes, blobToBitmap } from './util.js';
import * as db from './db.js';
import { Bus } from './sync.js';
import { Stage, defaultGrid } from './stage.js';
import { importScenes, importTokens } from './import.js';
import { buildBackup, restoreBackup, isBackupFormat, isEmptyBackup } from './backup.js';
import { t as tr, applyI18n } from './i18n.js';

let stage, bus;
let decks = [];
let scenes = [];
let tokenLib = [];
let templates = [];
const tokenImages = new Map();      // id -> ImageBitmap
const thumbUrls = new Map();        // id -> objectURL (scènes + tokens)

let selectedId = null;              // scène ouverte dans l'éditeur
let presentingId = null;            // scène poussée aux joueurs
let tool = 'move';
let brushPx = 90;                   // diamètre en px écran
let calibrating = false;
let playerWin = null;
let blackout = false;              // scène masquée aux joueurs (écran noir)
let tlSort = 'init';               // 'init' | 'type' — tri de la liste des tokens

/** Confirmation via une boîte de dialogue interne (pas window.confirm, que le
 *  navigateur peut bloquer après plusieurs pop-ups). Renvoie une promesse booléenne. */
function askConfirm(message) {
  return new Promise((resolve) => {
    const modal = $('#confirm-modal');
    const ok = $('#confirm-modal-ok');
    const cancel = $('#confirm-modal-cancel');
    $('#confirm-modal-text').textContent = message;
    modal.classList.remove('hidden');
    ok.focus();

    const done = (v) => {
      modal.classList.add('hidden');
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey, true);
      resolve(v);
    };
    const onOk = () => done(true);
    const onCancel = () => done(false);
    const onBackdrop = (e) => { if (e.target === modal) done(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(true); }
    };
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey, true);
  });
}

/** Saisie via une boîte de dialogue interne (remplace window.prompt, bloqué par
 *  le navigateur après plusieurs pop-ups). Renvoie la valeur, ou null si annulé. */
function askPrompt(message, { value = '', type = 'text', min, step } = {}) {
  return new Promise((resolve) => {
    const modal = $('#prompt-modal');
    const input = $('#prompt-modal-input');
    const ok = $('#prompt-modal-ok');
    const cancel = $('#prompt-modal-cancel');
    $('#prompt-modal-text').textContent = message;
    input.type = type;
    if (min != null) input.min = min; else input.removeAttribute('min');
    if (step != null) input.step = step; else input.removeAttribute('step');
    input.value = value;
    modal.classList.remove('hidden');
    input.focus();
    input.select();

    const done = (v) => {
      modal.classList.add('hidden');
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      input.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onDocKey, true);
      resolve(v);
    };
    const onOk = () => done(input.value);
    const onCancel = () => done(null);
    const onBackdrop = (e) => { if (e.target === modal) done(null); };
    const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); done(input.value); } };
    const onDocKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); }
    };
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    input.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onDocKey, true);
  });
}

// ---------------------------------------------------------------- init
export async function initGM() {
  await db.openDB();
  stage = new Stage($('#gm-canvas'), 'gm');
  bus = new Bus();

  bus.on('hello', () => { _lastHello = performance.now(); rebroadcastPresent(); });

  await reloadAll();

  document.addEventListener('visibilitychange', () => { if (!document.hidden) stage.invalidate(); });

  wireTopbar();
  wireSidebar();
  wireToolbar();
  wireMultiProps();
  wireCanvas();
  wireKeyboard();
  wireWheelNumbers();
  wireCombat();
  window.addEventListener('langchange', () => {
    applyI18n(document);
    updateBlackoutBtn();
    setPlayerPill(_pillOn);
    if (!selectedId) $('#scene-name').textContent = tr('topbar.noScene');
    if (stage.selectedIds.size >= 2) {
      const n = stage.selectedIds.size;
      $('#mp-title').textContent = tr('multi.title', { n });
      $('#mp-delete').textContent = tr('multi.delete', { n });
      $('#mp-dup').textContent = tr('multi.duplicate', { n });
    }
    renderSidebar();
    renderTokenList();
    renderInitiativeBar();
  });
  refreshStorage();
  setInterval(refreshStorage, 8000);
  setInterval(() => {
    const open = playerWin && !playerWin.closed;
    setPlayerPill(open || _helloSeenRecently());
  }, 2000);

  // restaure l'état après un rechargement de la régie
  const has = (id) => id && scenes.some((s) => s.id === id);
  tlSort = (await db.getMeta('tokenSort')) || 'init';
  $('#tl-sort').value = tlSort;
  const presentedId = await db.getMeta('presentingSceneId');
  if (has(presentedId)) presentingId = presentedId;
  const gmSceneId = await db.getMeta('gmSceneId');
  const toOpen = has(gmSceneId) ? gmSceneId : (has(presentedId) ? presentedId : null);
  if (toOpen) await selectScene(toOpen);
  if (await db.getMeta('playerBlackout')) await setBlackout(true);
  // la vue joueurs a pu tourner pendant le rechargement : on la resynchronise
  if (presentingId) await broadcastScene(true);

  if (new URLSearchParams(location.search).has('debug')) {
    window.__mj = { stage, bus, get scenes() { return scenes; }, get presentingId() { return presentingId; }, selectScene, persistCurrentScene };
  }
}

// ---------------------------------------------------------------- données
async function reloadAll() {
  [decks, scenes, tokenLib, templates] = await Promise.all([
    db.getAll('decks'), db.getAll('scenes'), db.getAll('tokenLibrary'), db.getAll('templates'),
  ]);
  decks.sort((a, b) => a.order - b.order);
  scenes.sort((a, b) => a.order - b.order);
  templates.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { numeric: true }));

  // vignettes + images de tokens
  for (const s of [...scenes, ...tokenLib]) {
    if (!thumbUrls.has(s.id) && s.thumbBlob) thumbUrls.set(s.id, URL.createObjectURL(s.thumbBlob));
  }
  for (const t of tokenLib) {
    if (!tokenImages.has(t.id)) {
      try { tokenImages.set(t.id, await blobToBitmap(t.imageBlob)); } catch { /* ignore */ }
    }
  }
  stage.setTokenImages(tokenImages);
  renderSidebar();
  renderAppearance();
  renderTemplates();
  refreshStorage();
}

async function persistCurrentScene() {
  const s = scenes.find((x) => x.id === selectedId);
  if (!s || !stage.scene) return;
  s.kind = 'battlemap';
  s.grid = stage.scene.grid;
  s.tokens = structuredClone(stage.tokens);
  s.combat = stage.scene.combat ?? null;
  s.playerFrame = stage.scene.playerFrame ?? null;
  if (stage.fog) s.fogBlob = await stage.fog.toBlob();
  await db.put('scenes', s);
}

// ---------------------------------------------------------------- topbar
function wireTopbar() {
  $('#btn-present').addEventListener('click', presentCurrent);
  $('#btn-blackout').addEventListener('click', () => setBlackout(!blackout));
  $('#btn-open-player').addEventListener('click', () => {
    playerWin = window.open('?view=player', 'mjtb_player');
  });
  $('#btn-fit').addEventListener('click', () => stage.fit());
  $('#btn-fullscreen').addEventListener('click', toggleFullscreen);
  $('#btn-wipe').addEventListener('click', wipeAll);
}

function updateBlackoutBtn() {
  const b = $('#btn-blackout');
  b.classList.toggle('on', blackout);
  b.textContent = blackout ? tr('topbar.showPlayers') : tr('topbar.hidePlayers');
}

async function setBlackout(on) {
  blackout = on;
  updateBlackoutBtn();
  push('blackout', { on });
  await db.setMeta('playerBlackout', on);
}

/** Émet un message horodaté (l'horodatage sert d'ordre d'application côté joueurs). */
function push(type, payload = {}) {
  bus.send({ t: type, ts: Date.now(), ...payload });
}

async function presentCurrent() {
  if (!selectedId) return;
  presentingId = selectedId;
  await persistCurrentScene();
  await db.setMeta('presentingSceneId', presentingId);
  await broadcastScene(false);
  renderSidebar();
}

/** Renvoie l'état courant de la scène présentée. includeFog : joindre le masque complet. */
async function broadcastScene(includeFog) {
  push('blackout', { on: blackout });
  if (!presentingId) return;
  push('present', { sceneId: presentingId });
  if (stage.scene?.id === presentingId) {
    push('grid', { sceneId: presentingId, grid: stage.scene.grid });
    push('frame', { sceneId: presentingId, frame: stage.scene.playerFrame ?? null });
    push('tokens', { sceneId: presentingId, tokens: structuredClone(stage.tokens) });
    const cs = stage.scene.combat;
    push('initiative', {
      sceneId: presentingId,
      on: !!(cs && cs.on && cs.showPlayers),
      turnId: cs?.turnId ?? null,
      round: cs?.round ?? 1,
    });
    if (includeFog && stage.fog) push('fog', { sceneId: presentingId, blob: await stage.fog.toBlob() });
  }
}
const rebroadcastPresent = () => broadcastScene(true);

let _lastHello = 0;
function _helloSeenRecently() { return _lastHello > 0 && performance.now() - _lastHello < 6000; }

async function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

async function wipeAll() {
  if (!(await askConfirm(tr('confirm.wipe')))) return;
  await db.clearAll();
  for (const u of thumbUrls.values()) URL.revokeObjectURL(u);
  thumbUrls.clear(); tokenImages.clear();
  decks = []; scenes = []; tokenLib = []; templates = [];
  selectedId = presentingId = null;
  if (blackout) await setBlackout(false);
  stage.setScene(null, null);
  bus.send({ t: 'clear' });
  renderSidebar(); renderAppearance(); renderTemplates();
  $('#scene-name').textContent = tr('topbar.noScene');
  $('#btn-present').disabled = true;
  $('#map-toolbar').classList.add('hidden');
  $('.side-tokens').classList.add('hidden');
  setConfigOpen(false);
  $('#token-props').classList.add('hidden');
  $('#multi-props').classList.add('hidden');
  resetCombatUI();
  refreshStorage();
}

let _storageWarned = false;
async function refreshStorage() {
  const est = await db.storageEstimate();
  const el = $('#storage-usage');
  el.textContent = est?.usage ? formatBytes(est.usage) : '';
  // alerte quand on approche du plafond du navigateur, ou après ~1,5 Go
  const usage = est?.usage || 0;
  const quota = est?.quota || 0;
  const high = (quota && usage / quota > 0.8) || usage > 1.5e9;
  el.classList.toggle('warn', high);
  el.title = high ? tr('topbar.storageWarn') : tr('topbar.storageTitle');
  if (high && !_storageWarned) {
    _storageWarned = true;
    showHint(tr('topbar.storageWarn'));
  } else if (!high) {
    _storageWarned = false;
  }
}

let _pillOn = false;
function setPlayerPill(on) {
  _pillOn = on;
  const pill = $('#player-status');
  pill.textContent = on ? tr('topbar.playerOpen') : tr('topbar.playerClosed');
  pill.className = 'pill ' + (on ? 'pill-on' : 'pill-off');
}

// ---------------------------------------------------------------- sidebar
function wireSidebar() {
  $('#btn-add-map').addEventListener('click', () => $('#file-map').click());
  $('#btn-add-deck').addEventListener('click', addDeck);
  $('#btn-add-token').addEventListener('click', quickAddToken);
  $('#tl-sort').addEventListener('change', (e) => {
    tlSort = e.target.value;
    db.setMeta('tokenSort', tlSort);
    renderTokenList();
  });

  const addFiles = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const created = await importScenes(files, null);
    await reloadAll();
    if (created[0]) selectScene(created[0].id);
  };

  $('#file-map').addEventListener('change', async (e) => {
    await addFiles(e.target.files);
    e.target.value = '';
  });

  $('#btn-export').addEventListener('click', exportCampaign);
  $('#btn-import').addEventListener('click', () => $('#file-backup').click());
  $('#file-backup').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) await importCampaign(file);
  });

  const dz = $('#dropzone');
  ;['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => {
    e.preventDefault(); dz.classList.add('drag-over');
  }));
  ;['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('drag-over')));
  dz.addEventListener('drop', async (e) => {
    e.preventDefault();
    await addFiles(e.dataTransfer.files);
  });

  $('#search').addEventListener('input', renderSidebar);
}

async function addDeck() {
  const name = await askPrompt(tr('deck.namePrompt'), { value: tr('deck.newName') });
  if (!name || !name.trim()) return;
  const order = decks.reduce((m, d) => Math.max(m, d.order), 0) + 1;
  await db.put('decks', { id: uid('deck'), name: name.trim(), order });
  await reloadAll();
}

// ---------------------------------------------------------------- sauvegarde
async function exportCampaign() {
  const data = await buildBackup();
  if (isEmptyBackup(data)) { showHint(tr('backup.empty')); return; }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `regie-du-mj-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showHint(tr('backup.exported'));
}

async function importCampaign(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    showHint(tr('backup.badFile'));
    return;
  }
  if (!isBackupFormat(data)) { showHint(tr('backup.badFile')); return; }
  if (!(await askConfirm(tr('backup.confirmImport')))) return;

  try {
    await restoreBackup(data);
  } catch {
    showHint(tr('backup.badFile'));
    await reloadAll();
    return;
  }

  // vue joueurs + affichage régie remis à zéro
  for (const u of thumbUrls.values()) URL.revokeObjectURL(u);
  thumbUrls.clear();
  tokenImages.clear();
  selectedId = presentingId = null;
  await db.setMeta('gmSceneId', null);
  await db.setMeta('presentingSceneId', null);
  if (blackout) await setBlackout(false);
  stage.setScene(null, null);
  bus.send({ t: 'clear' });
  $('#scene-name').textContent = tr('topbar.noScene');
  $('#btn-present').disabled = true;
  $('#map-toolbar').classList.add('hidden');
  $('.side-tokens').classList.add('hidden');
  setConfigOpen(false);
  $('#token-props').classList.add('hidden');
  $('#multi-props').classList.add('hidden');
  resetCombatUI();

  await reloadAll();
  refreshStorage();
  showHint(tr('backup.done'));
}

function renderSidebar() { renderDeckList(); }

function deckSection(deckId, title, removable) {
  const q = $('#search').value.trim().toLowerCase();
  let list = scenes.filter((s) => (s.deckId ?? null) === deckId);
  if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
  if (q && !list.length) return null;

  const wrap = el('div', { class: 'deck', 'data-deck': deckId ?? '' });
  const head = el('div', { class: 'deck-head' }, [
    el('span', { class: 'deck-caret', text: '▾' }),
    el('span', { class: 'deck-title', text: title, title: tr('deck.renameTitle') }),
    el('span', { class: 'deck-count', text: String(list.length) }),
  ]);
  if (removable) {
    const del = el('button', { class: 'deck-del', title: tr('deck.deleteTitle'), text: '✕' });
    del.addEventListener('click', (e) => { e.stopPropagation(); removeDeck(deckId); });
    head.append(del);
  }
  head.addEventListener('click', () => wrap.classList.toggle('collapsed'));
  if (removable) {
    const titleEl = head.querySelector('.deck-title');
    titleEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      titleEl.setAttribute('contenteditable', 'true');
      titleEl.focus();
      document.execCommand?.('selectAll', false, null);
    });
    titleEl.addEventListener('blur', async () => {
      titleEl.removeAttribute('contenteditable');
      const d = decks.find((x) => x.id === deckId);
      if (d && titleEl.textContent.trim()) { d.name = titleEl.textContent.trim(); await db.put('decks', d); }
      else renderSidebar();
    });
    titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } });
  }

  const body = el('div', { class: 'deck-scenes' });
  for (const s of list) body.append(sceneRow(s));

  // drop d'une scène vers ce deck
  ;['dragenter', 'dragover'].forEach((ev) => wrap.addEventListener(ev, (e) => {
    if (e.dataTransfer.types.includes('text/scene-id')) { e.preventDefault(); wrap.classList.add('drag-over'); }
  }));
  wrap.addEventListener('dragleave', () => wrap.classList.remove('drag-over'));
  wrap.addEventListener('drop', async (e) => {
    wrap.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/scene-id');
    if (!id || e.target.closest('.scene-row')) return; // le drop sur une ligne est géré ailleurs
    e.preventDefault();
    await moveScene(id, deckId, null);
  });

  wrap.append(head, body);
  return wrap;
}

function renderDeckList() {
  const host = $('#deck-list');
  host.innerHTML = '';
  const sansDeck = deckSection(null, tr('sidebar.noDeck'), false);
  if (sansDeck) host.append(sansDeck);
  for (const d of decks) {
    const sec = deckSection(d.id, d.name, true);
    if (sec) host.append(sec);
  }
}

function sceneRow(s) {
  const row = el('div', {
    class: 'scene-row' + (s.id === selectedId ? ' selected' : '') + (s.id === presentingId ? ' presenting' : ''),
    draggable: 'true',
  });
  const thumb = el('img', { class: 'scene-thumb', alt: '' });
  if (thumbUrls.has(s.id)) thumb.src = thumbUrls.get(s.id);
  const label = el('span', { class: 'scene-label', text: s.name, title: s.name });
  const dup = el('button', { class: 'scene-dup', title: tr('scene.duplicateTitle'), text: '⧉' });
  dup.addEventListener('click', (e) => { e.stopPropagation(); duplicateScene(s.id); });
  const del = el('button', { class: 'scene-del', title: tr('scene.deleteTitle'), text: '✕' });
  del.addEventListener('click', (e) => { e.stopPropagation(); deleteScene(s.id); });
  row.append(thumb, label, dup, del);

  row.addEventListener('click', () => selectScene(s.id));
  label.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    label.setAttribute('contenteditable', 'true');
    label.focus();
  });
  label.addEventListener('blur', async () => {
    label.removeAttribute('contenteditable');
    const name = label.textContent.trim();
    if (name && name !== s.name) { s.name = name; await db.put('scenes', s); if (s.id === selectedId) $('#scene-name').textContent = name; }
    else label.textContent = s.name;
  });
  label.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); label.blur(); } });

  row.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/scene-id', s.id);
    e.dataTransfer.effectAllowed = 'move';
  });
  ;['dragenter', 'dragover'].forEach((ev) => row.addEventListener(ev, (e) => {
    if (e.dataTransfer.types.includes('text/scene-id')) { e.preventDefault(); e.stopPropagation(); }
  }));
  row.addEventListener('drop', async (e) => {
    const id = e.dataTransfer.getData('text/scene-id');
    if (!id || id === s.id) return;
    e.preventDefault(); e.stopPropagation();
    await moveScene(id, s.deckId ?? null, s);
  });
  return row;
}

async function moveScene(id, deckId, afterScene) {
  const s = scenes.find((x) => x.id === id);
  if (!s) return;
  s.deckId = deckId;
  // réordonner : placer juste après afterScene, sinon à la fin du deck
  const siblings = scenes.filter((x) => (x.deckId ?? null) === deckId && x.id !== id)
    .sort((a, b) => a.order - b.order);
  const idx = afterScene ? siblings.findIndex((x) => x.id === afterScene.id) + 1 : siblings.length;
  siblings.splice(idx, 0, s);
  siblings.forEach((x, i) => { x.order = i + 1; });
  await Promise.all(siblings.map((x) => db.put('scenes', x)));
  await reloadAll();
}

async function removeDeck(deckId) {
  if (!(await askConfirm(tr('confirm.deleteDeck')))) return;
  for (const s of scenes.filter((x) => x.deckId === deckId)) { s.deckId = null; await db.put('scenes', s); }
  await db.del('decks', deckId);
  await reloadAll();
}

async function duplicateScene(id) {
  const s = scenes.find((x) => x.id === id);
  if (!s) return;
  const sib = scenes.filter((x) => (x.deckId ?? null) === (s.deckId ?? null));
  const copy = {
    id: uid('scene'),
    kind: s.kind || 'battlemap',
    name: `${s.name} ${tr('scene.copySuffix')}`,
    deckId: s.deckId ?? null,
    order: sib.reduce((m, x) => Math.max(m, x.order ?? 0), 0) + 1,
    grid: structuredClone(s.grid ?? null),
    tokens: structuredClone(s.tokens ?? []),
    combat: structuredClone(s.combat ?? null),
    imageBlob: s.imageBlob,
    thumbBlob: s.thumbBlob,
    fogBlob: s.fogBlob ?? null,
  };
  await db.put('scenes', copy);
  await reloadAll();
  await selectScene(copy.id);
}

async function deleteScene(id) {
  const s = scenes.find((x) => x.id === id);
  if (!s) return;
  if (!(await askConfirm(tr('confirm.deleteScene', { name: s.name })))) return;

  await db.del('scenes', id);
  if (thumbUrls.has(id)) { URL.revokeObjectURL(thumbUrls.get(id)); thumbUrls.delete(id); }

  if (id === presentingId) {
    presentingId = null;
    await db.setMeta('presentingSceneId', null);
    bus.send({ t: 'clear' });
  }
  if (id === selectedId) {
    selectedId = null;
    await db.setMeta('gmSceneId', null);
    stage.setScene(null, null);
    $('#scene-name').textContent = tr('topbar.noScene');
    $('#btn-present').disabled = true;
    $('#map-toolbar').classList.add('hidden');
    $('.side-tokens').classList.add('hidden');
    setConfigOpen(false);
    $('#token-props').classList.add('hidden');
    $('#multi-props').classList.add('hidden');
    resetCombatUI();
  }

  await reloadAll();
  refreshStorage();
}

// ---------------------------------------------------------------- sélection de scène
async function selectScene(id) {
  const s = scenes.find((x) => x.id === id);
  if (!s) return;
  selectedId = id;
  await db.setMeta('gmSceneId', id);
  $('#scene-name').textContent = s.name;
  $('#btn-present').disabled = false;

  const image = await blobToBitmap(s.imageBlob);
  stage.setScene(s, image, { fit: true });
  if (stage.fog) await stage.fog.loadBlob(s.fogBlob || null);
  updateFogUndoBtn();
  stage.invalidate();
  $('#map-toolbar').classList.remove('hidden');
  $('.side-tokens').classList.remove('hidden');
  syncGridPanel();
  setTool('move');
  $('#token-props').classList.add('hidden');
  $('#multi-props').classList.add('hidden');
  const cs = combatState();
  $('#btn-combat').classList.toggle('active', !!cs.on);
  stage.setTurn(cs.on ? cs.turnId : null);
  renderInitiativeBar();
  updateFrameGroupUI();
  renderTokenList();
  renderSidebar();
}

// ---------------------------------------------------------------- barre d'outils
function wireToolbar() {
  $$('.tool[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $('#brush-size').addEventListener('input', (e) => {
    brushPx = +e.target.value;
    if (stage.brushCursor) { stage.brushCursor.r = brushPx / 2; stage.invalidate(); }
  });
  $('#btn-reveal-all').addEventListener('click', () => bulkFog('reveal'));
  $('#btn-hide-all').addEventListener('click', () => bulkFog('hide'));
  $('#btn-fog-undo').addEventListener('click', fogUndo);

  $('#btn-frame-view').addEventListener('click', frameToCurrentView);
  $('#btn-frame-full').addEventListener('click', () => commitPlayerFrame(null));

  $('#btn-config').addEventListener('click', toggleConfig);
  $('#config-panel-close').addEventListener('click', () => setConfigOpen(false));
  $('#token-props-close').addEventListener('click', () => $('#token-props').classList.add('hidden'));

  // grille — application visuelle immédiate, persistance / diffusion différée
  const applyGridVisual = () => {
    const g = stage.scene.grid;
    g.cellPx = clamp(+$('#grid-size').value || 70, 4, 2000);
    g.offsetX = +$('#grid-offx').value || 0;
    g.offsetY = +$('#grid-offy').value || 0;
    g.color = $('#grid-color').value;
    g.opacity = clamp((+$('#grid-opacity').value || 0) / 100, 0, 1);
    g.width = clamp(+$('#grid-width').value || 1, 0.5, 6);
    g.subdiv = clamp(Math.round(+$('#grid-subdiv').value || 1), 1, 8);
    g.snap = $('#grid-snap').checked;
    g.showToPlayers = $('#grid-show').checked;
    stage.invalidate();
  };
  const gridPersist = debounce(async () => {
    await persistCurrentScene();
    if (selectedId === presentingId) push('grid', { sceneId: selectedId, grid: stage.scene.grid });
  }, 200);
  const onGridInput = () => { applyGridVisual(); gridPersist(); };
  ['#grid-size', '#grid-offx', '#grid-offy', '#grid-color', '#grid-opacity', '#grid-width']
    .forEach((s) => $(s).addEventListener('input', onGridInput));
  ['#grid-snap', '#grid-show', '#grid-subdiv'].forEach((s) => $(s).addEventListener('change', onGridInput));
  $('#btn-calibrate').addEventListener('click', () => {
    calibrating = true;
    showHint(tr('hint.calibrate'));
  });

  // props token
  const selectedToken = () => stage.tokens.find((x) => x.id === stage.selectedTokenId);
  const commitToken = afterTokenEdit;

  // apparence : disque plein ou image de la bibliothèque
  $('#tp-appear-disc').addEventListener('click', () => {
    const t = selectedToken();
    if (!t) return;
    t.imageRef = null;
    afterTokenEdit();
    renderAppearance();
  });
  $('#tp-import-token').addEventListener('click', () => $('#file-token').click());
  $('#tam-disc').addEventListener('click', () => setAppearance(null));
  $('#tam-import').addEventListener('click', () => $('#file-token').click());
  $('#file-token').addEventListener('change', async (e) => {
    const created = await importTokens([...e.target.files]);
    e.target.value = '';
    await reloadAll();
    const t = selectedToken();
    if (t && created[0]) { t.imageRef = created[0].id; await afterTokenEdit(); }
    renderAppearance();
    if (!$('#token-appearance-menu').classList.contains('hidden')) closeAppearanceMenu();
  });

  const tpApply = debounce(async () => {
    const t = selectedToken();
    if (!t) return;
    t.label = $('#tp-label').value;
    t.type = ['pj', 'pnj'].includes($('#tp-type').value) ? $('#tp-type').value : null;
    t.initiative = $('#tp-init').value === '' ? null : Math.round(+$('#tp-init').value);
    t.def = $('#tp-def').value === '' ? null : Math.round(+$('#tp-def').value);
    t.color = $('#tp-color').value;
    t.sizeCells = clamp(+$('#tp-size').value || 1, 0.25, 8);
    t.visibleToPlayers = $('#tp-visible').checked;
    t.hpShare = $('#tp-hpshare').value;
    const hpMax = Math.max(0, Math.round(+$('#tp-hpmax').value || 0)) || null;
    t.hpMax = hpMax;
    if (hpMax == null) {
      t.hp = null;
    } else {
      t.hp = $('#tp-hp').value === '' ? hpMax : Math.max(0, Math.round(+$('#tp-hp').value || 0));
      if ($('#tp-hp').value === '') $('#tp-hp').value = t.hp;
    }
    await commitToken();
  }, 150);
  ['#tp-label', '#tp-color', '#tp-size', '#tp-hp', '#tp-hpmax', '#tp-init', '#tp-def'].forEach((s) => $(s).addEventListener('input', tpApply));
  ['#tp-visible', '#tp-hpshare', '#tp-type'].forEach((s) => $(s).addEventListener('change', tpApply));

  const adjustHp = async (sign) => {
    const t = selectedToken();
    if (!t || !(t.hpMax > 0)) return;
    const amt = Math.max(1, Math.round(+$('#tp-hp-amt').value || 1));
    t.hp = Math.max(0, (t.hp ?? t.hpMax) + sign * amt);
    $('#tp-hp').value = t.hp;
    await commitToken();
  };
  $('#tp-dmg').addEventListener('click', () => adjustHp(-1));
  $('#tp-heal').addEventListener('click', () => adjustHp(+1));

  $('#tp-dup').addEventListener('click', duplicateSelectedTokens);
  $('#tp-save-template').addEventListener('click', saveTokenAsTemplate);
  $('#tp-delete').addEventListener('click', async () => {
    stage.tokens = stage.tokens.filter((x) => x.id !== stage.selectedTokenId);
    stage.clearSelection();
    $('#token-props').classList.add('hidden');
    applySelectionUI();
    await afterTokenEdit();
  });
}

/** Molette de la souris sur un champ numérique / curseur = ajuste la valeur. */
function wireWheelNumbers() {
  document.addEventListener('wheel', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || (el.type !== 'number' && el.type !== 'range')) return;
    e.preventDefault();
    const step = parseFloat(el.step) || 1;
    const min = el.min === '' ? -Infinity : parseFloat(el.min);
    const max = el.max === '' ? Infinity : parseFloat(el.max);
    const cur = parseFloat(el.value) || 0;
    let next = clamp(cur + (e.deltaY < 0 ? step : -step), min, max);
    next = Math.round(next * 1000) / 1000;
    if (next === cur) return;
    el.value = next;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { passive: false });
}

// ---------------------------------------------------------------- suivi d'initiative
function combatState() {
  if (!stage.scene) return null;
  if (!stage.scene.combat) {
    stage.scene.combat = { on: false, showPlayers: false, turnId: null, round: 1 };
  }
  return stage.scene.combat;
}

/** Tokens ayant une initiative, triés (init décroissante, puis nom). */
function combatants() {
  return stage.tokens
    .filter((t) => t.initiative != null)
    .sort((a, b) => (b.initiative - a.initiative)
      || (a.label || '￿').localeCompare(b.label || '￿', 'fr', { numeric: true }));
}

function isDowned(t) { return t.hpMax > 0 && (t.hp ?? t.hpMax) <= 0; }

function wireCombat() {
  $('#btn-combat').addEventListener('click', () => setCombatOn(!(combatState()?.on)));
  $('#init-close').addEventListener('click', () => setCombatOn(false));
  $('#init-prev').addEventListener('click', () => advanceTurn(-1));
  $('#init-next').addEventListener('click', () => advanceTurn(1));
  $('#init-players').addEventListener('click', toggleCombatShowPlayers);
}

/** Diffuse l'état du suivi d'initiative à la vue joueurs (visible seulement si
 *  le suivi est actif ET « afficher aux joueurs » est coché). */
function broadcastInitiative() {
  if (selectedId !== presentingId) return;
  const cs = stage.scene?.combat;
  push('initiative', {
    sceneId: selectedId,
    on: !!(cs && cs.on && cs.showPlayers),
    turnId: cs?.turnId ?? null,
    round: cs?.round ?? 1,
  });
}

function renderInitiativeBar() {
  const bar = $('#initiative-bar');
  const cs = stage.scene?.combat;
  if (!cs || !cs.on) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');

  const list = combatants();
  if (list.length && !list.some((t) => t.id === cs.turnId)) cs.turnId = list[0].id;
  if (!list.length) cs.turnId = null;

  $('#init-round').textContent = tr('combat.round', { n: cs.round || 1 });
  $('#init-players').classList.toggle('active', !!cs.showPlayers);
  $('#init-prev').disabled = !list.length;
  $('#init-next').disabled = !list.length;

  const host = $('#init-list');
  host.innerHTML = '';
  if (!list.length) {
    host.append(el('span', { class: 'init-empty', text: tr('combat.empty') }));
    return;
  }
  for (const t of list) {
    const chip = el('div', {
      class: 'init-chip' + (t.id === cs.turnId ? ' current' : '') + (isDowned(t) ? ' downed' : ''),
    });
    const sw = el('span', { class: 'init-swatch' });
    sw.style.background = t.color || '#c0392b';
    chip.append(
      el('span', { class: 'init-num', text: String(t.initiative) }),
      sw,
      el('span', { text: t.label || '—' }),
    );
    chip.addEventListener('click', () => setTurnTo(t.id));
    host.append(chip);
  }
}

async function setCombatOn(on) {
  const cs = combatState();
  if (!cs) return;
  cs.on = on;
  if (on && !cs.turnId) {
    cs.turnId = combatants()[0]?.id ?? null;
    cs.round = 1;
  }
  $('#btn-combat').classList.toggle('active', on);
  stage.setTurn(on ? cs.turnId : null);
  renderInitiativeBar();
  await persistCurrentScene();
  broadcastInitiative();
}

async function toggleCombatShowPlayers() {
  const cs = combatState();
  if (!cs) return;
  cs.showPlayers = !cs.showPlayers;
  $('#init-players').classList.toggle('active', cs.showPlayers);
  await persistCurrentScene();
  broadcastInitiative();
}

async function advanceTurn(dir) {
  const cs = stage.scene?.combat;
  if (!cs || !cs.on) return;
  const list = combatants();
  if (!list.length) return;
  let idx = list.findIndex((t) => t.id === cs.turnId);
  if (idx < 0) {
    idx = 0;
  } else {
    idx += dir;
    if (idx >= list.length) { idx = 0; cs.round = (cs.round || 1) + 1; }
    else if (idx < 0) { idx = list.length - 1; cs.round = Math.max(1, (cs.round || 1) - 1); }
  }
  cs.turnId = list[idx].id;
  await applyTurnChange();
}

async function setTurnTo(id) {
  const cs = stage.scene?.combat;
  if (!cs) return;
  cs.turnId = id;
  await applyTurnChange();
}

async function applyTurnChange() {
  const cs = stage.scene?.combat;
  stage.setTurn(cs?.on ? cs.turnId : null);
  renderInitiativeBar();
  await persistCurrentScene();
  broadcastInitiative();
}

/** Après un changement de token (init, PV, suppression) : revalide le tour courant. */
function refreshCombatAfterTokenChange() {
  const cs = stage.scene?.combat;
  if (!cs || !cs.on) { renderInitiativeBar(); return; }
  const list = combatants();
  const before = cs.turnId;
  if (list.length && !list.some((t) => t.id === before)) cs.turnId = list[0].id;
  if (!list.length) cs.turnId = null;
  stage.setTurn(cs.turnId);
  renderInitiativeBar();
  if (cs.turnId !== before) broadcastInitiative();
}

function resetCombatUI() {
  $('#initiative-bar').classList.add('hidden');
  $('#btn-combat').classList.remove('active');
  stage.setTurn(null);
}

function setTool(t) {
  tool = t;
  $$('.tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
  $('#fog-group').classList.toggle('hidden', t !== 'reveal' && t !== 'hide');
  $('#frame-group').classList.toggle('hidden', t !== 'frame');
  if (t !== 'reveal' && t !== 'hide') stage?.setBrushCursor(null);
  stage?.setFrameEditing(t === 'frame');
  if (t === 'frame') { updateFrameGroupUI(); showHint(tr('frame.hint')); }
  const cursor = t === 'move' ? 'default' : (t === 'token' ? 'copy' : (t === 'grid' ? 'move' : 'crosshair'));
  $('#gm-canvas').style.cursor = cursor;
}

function updateFrameGroupUI() {
  const custom = !!stage.scene?.playerFrame;
  const el = $('#frame-state');
  el.textContent = tr(custom ? 'frame.stateCustom' : 'frame.stateFull');
  el.classList.toggle('on', custom);
  $('#btn-frame-full').disabled = !custom;
}

/** Enregistre le cadre « vue joueurs » de la scène, le persiste et le diffuse. */
async function commitPlayerFrame(rect) {
  if (!stage.scene) return;
  stage.setPlayerFrame(rect);
  updateFrameGroupUI();
  await persistCurrentScene();
  if (selectedId === presentingId) push('frame', { sceneId: selectedId, frame: rect || null });
}

/** « Cadrer sur ma vue » : la portion de carte visible dans la régie devient le cadre joueurs. */
function frameToCurrentView() {
  if (!stage.scene || !stage.image) return;
  const tl = stage.screenToWorld({ x: 0, y: 0 });
  const br = stage.screenToWorld({ x: stage.cssW, y: stage.cssH });
  const x = clamp(Math.min(tl.x, br.x), 0, stage.imgW);
  const y = clamp(Math.min(tl.y, br.y), 0, stage.imgH);
  const w = clamp(Math.max(tl.x, br.x), 0, stage.imgW) - x;
  const h = clamp(Math.max(tl.y, br.y), 0, stage.imgH) - y;
  if (w < 40 || h < 40) return;
  commitPlayerFrame({ x, y, w, h });
}

function setConfigOpen(open) {
  $('#config-panel').classList.toggle('hidden', !open);
  $('#btn-config').classList.toggle('active', open);
  if (open) syncGridPanel();
}
function toggleConfig() {
  setConfigOpen($('#config-panel').classList.contains('hidden'));
}
function closeFloaties() {
  setConfigOpen(false);
}

function syncGridPanel() {
  if (!stage.scene) return;
  const d = defaultGrid();
  const g = stage.scene.grid || d;
  $('#grid-size').value = Math.round(g.cellPx);
  $('#grid-offx').value = Math.round(g.offsetX);
  $('#grid-offy').value = Math.round(g.offsetY);
  $('#grid-color').value = g.color || d.color;
  $('#grid-opacity').value = Math.round((g.opacity == null ? d.opacity : g.opacity) * 100);
  $('#grid-width').value = g.width || d.width;
  $('#grid-subdiv').value = Math.round(g.subdiv || 1);
  $('#grid-snap').checked = !!g.snap;
  $('#grid-show').checked = !!g.showToPlayers;
}

async function bulkFog(mode) {
  if (!stage.fog) return;
  stage.fog.pushUndo();
  if (mode === 'reveal') stage.fog.revealAll(); else stage.fog.hideAll();
  stage.invalidate();
  updateFogUndoBtn();
  await commitFog();
}

/** Persiste le masque de brouillard et le diffuse à la vue joueurs si besoin. */
async function commitFog() {
  await persistCurrentScene();
  if (selectedId === presentingId && stage.fog) {
    push('fog', { sceneId: selectedId, blob: await stage.fog.toBlob() });
  }
}

function updateFogUndoBtn() {
  const b = $('#btn-fog-undo');
  if (b) b.disabled = !(stage.fog && stage.fog.canUndo);
}

/** Annule le dernier coup de pinceau / « tout révéler-cacher ». */
async function fogUndo() {
  if (!stage.fog || !stage.fog.undo()) return;
  stage.invalidate();
  updateFogUndoBtn();
  await commitFog();
}

/** Ouvre les propriétés du token, ou les referme si elles sont déjà ouvertes pour lui. */
function toggleTokenProps(t) {
  const panel = $('#token-props');
  const openForThis = !panel.classList.contains('hidden') && stage.selectedTokenId === t.id;
  if (openForThis) panel.classList.add('hidden');
  else openTokenProps(t);
}

/** Affiche le bon panneau selon le nombre de tokens sélectionnés. */
function applySelectionUI() {
  const n = stage.selectedIds.size;
  if (n >= 2) {
    $('#token-props').classList.add('hidden');
    $('#mp-title').textContent = tr('multi.title', { n });
    $('#mp-delete').textContent = tr('multi.delete', { n });
    $('#mp-dup').textContent = tr('multi.duplicate', { n });
    $('#mp-size').value = '';
    $('#mp-init').value = '';
    $('#mp-def').value = '';
    $('#mp-hpmax').value = '';
    $('#mp-type').value = '';
    $('#mp-hpshare').value = '';
    $('#multi-props').classList.remove('hidden');
  } else {
    $('#multi-props').classList.add('hidden');
    if (n === 0) $('#token-props').classList.add('hidden');
  }
  renderTokenList();
}

/** Duplique le(s) token(s) sélectionné(s), décalé(s) d'une case, et sélectionne les copies. */
async function duplicateSelectedTokens() {
  const originals = stage.selectedTokens();
  if (!originals.length || !stage.scene) return;
  const cell = stage.scene.grid?.cellPx || 70;
  const newIds = [];
  for (const src of originals) {
    const copy = structuredClone(src);
    copy.id = uid('t');
    copy.pos = stage.snapWorld({ x: src.pos.x + cell, y: src.pos.y + cell });
    stage.tokens.push(copy);
    newIds.push(copy.id);
  }
  const propsOpen = !$('#token-props').classList.contains('hidden');
  stage.setSelection(newIds);
  if (newIds.length === 1 && propsOpen) {
    openTokenProps(stage.tokens.find((t) => t.id === newIds[0]));
  } else {
    applySelectionUI();
  }
  await afterTokenEdit();
}

function openTokenProps(t) {
  stage.selectOnly(t.id);
  $('#multi-props').classList.add('hidden');
  $('#tp-label').value = t.label || '';
  $('#tp-type').value = t.type === 'pj' || t.type === 'pnj' ? t.type : '';
  $('#tp-init').value = t.initiative ?? '';
  $('#tp-def').value = t.def ?? '';
  $('#tp-color').value = t.color || '#c0392b';
  $('#tp-size').value = t.sizeCells || 1;
  $('#tp-visible').checked = !!t.visibleToPlayers;
  $('#tp-hp').value = t.hp ?? '';
  $('#tp-hpmax').value = t.hpMax ?? '';
  $('#tp-hpshare').value = t.hpShare || 'off';
  $('#token-props').classList.remove('hidden');
  renderAppearance();
  renderTokenConditions();
  renderTokenList();
}

// ---------------------------------------------------------------- états (conditions)
const CONDITION_PRESETS = ['☠️', '😵', '💤', '🔥', '🩸', '⬇️', '🕸️', '🛡️', '⚡', '🐌'];

function renderTokenConditions() {
  const presetHost = $('#tp-cond-presets');
  const listHost = $('#tp-cond-list');
  if (!presetHost || !listHost) return;
  presetHost.innerHTML = '';
  listHost.innerHTML = '';
  const t = stage.tokens.find((x) => x.id === stage.selectedTokenId);
  if (!t) return;
  const conds = t.conditions || [];

  for (const emo of CONDITION_PRESETS) {
    const b = el('button', { class: 'cond-btn' + (conds.includes(emo) ? ' active' : ''), text: emo });
    b.addEventListener('click', () => toggleCondition(t, emo));
    presetHost.append(b);
  }
  for (const c of conds.filter((x) => !CONDITION_PRESETS.includes(x))) {
    const x = el('button', { class: 'cond-x', text: '✕' });
    x.addEventListener('click', () => toggleCondition(t, c));
    listHost.append(el('span', { class: 'cond-chip' }, [el('span', { text: c }), x]));
  }
  const add = el('button', { class: 'cond-btn cond-add', text: '＋', title: tr('props.condPrompt') });
  add.addEventListener('click', async () => {
    const v = ((await askPrompt(tr('props.condPrompt'))) || '').trim();
    if (v && !(t.conditions || []).includes(v)) {
      (t.conditions ||= []).push(v);
      afterTokenEdit();
      renderTokenConditions();
    }
  });
  listHost.append(add);
}

function toggleCondition(t, c) {
  t.conditions ||= [];
  const i = t.conditions.indexOf(c);
  if (i >= 0) t.conditions.splice(i, 1);
  else t.conditions.push(c);
  if (!t.conditions.length) delete t.conditions;
  afterTokenEdit();
  renderTokenConditions();
}

// ---------------------------------------------------------------- liste des tokens (combat)
async function afterTokenEdit() {
  stage.invalidate();
  renderTokenList();
  refreshCombatAfterTokenChange();
  await persistCurrentScene();
  broadcastTokens();
}

function setTokenHp(t, value) {
  if (!(t.hpMax > 0)) return;
  t.hp = Math.max(0, Math.round(value || 0));
  if (stage.selectedTokenId === t.id) $('#tp-hp').value = t.hp;
  afterTokenEdit();
}

// ---------------------------------------------------------------- édition groupée
function wireMultiProps() {
  const sel = () => stage.selectedTokens();
  const commit = () => afterTokenEdit();
  const amount = () => Math.max(1, Math.round(+$('#mp-amount').value || 1));

  $('#mp-dmg').addEventListener('click', () => {
    for (const t of sel()) if (t.hpMax > 0) t.hp = Math.max(0, (t.hp ?? t.hpMax) - amount());
    commit();
  });
  $('#mp-heal').addEventListener('click', () => {
    for (const t of sel()) if (t.hpMax > 0) t.hp = (t.hp ?? 0) + amount();
    commit();
  });
  $('#mp-type').addEventListener('change', (e) => {
    const v = ['pj', 'pnj'].includes(e.target.value) ? e.target.value : null;
    if (e.target.value === '') return;
    for (const t of sel()) t.type = v;
    commit();
  });
  $('#mp-size').addEventListener('change', (e) => {
    if (e.target.value === '') return;
    const v = clamp(+e.target.value || 1, 0.25, 8);
    for (const t of sel()) t.sizeCells = v;
    commit();
  });
  $('#mp-init').addEventListener('change', (e) => {
    if (e.target.value === '') return;
    const v = Math.round(+e.target.value || 0);
    for (const t of sel()) t.initiative = v;
    commit();
  });
  $('#mp-def').addEventListener('change', (e) => {
    if (e.target.value === '') return;
    const v = Math.round(+e.target.value || 0);
    for (const t of sel()) t.def = v;
    commit();
  });
  $('#mp-hpmax').addEventListener('change', (e) => {
    if (e.target.value === '') return;
    const v = Math.max(0, Math.round(+e.target.value || 0)) || null;
    for (const t of sel()) {
      t.hpMax = v;
      t.hp = v == null ? null : Math.min(t.hp ?? v, v);
    }
    commit();
  });
  $('#mp-color').addEventListener('input', (e) => {
    for (const t of sel()) t.color = e.target.value;
    commit();
  });
  $('#mp-hpshare').addEventListener('change', (e) => {
    if (e.target.value === '') return;
    for (const t of sel()) t.hpShare = e.target.value;
    commit();
  });
  $('#mp-show').addEventListener('click', () => { for (const t of sel()) t.visibleToPlayers = true; commit(); });
  $('#mp-hide').addEventListener('click', () => { for (const t of sel()) t.visibleToPlayers = false; commit(); });
  $('#mp-dup').addEventListener('click', duplicateSelectedTokens);
  $('#mp-delete').addEventListener('click', () => {
    const ids = new Set(stage.selectedIds);
    stage.tokens = stage.tokens.filter((t) => !ids.has(t.id));
    stage.clearSelection();
    applySelectionUI();
    afterTokenEdit();
  });
  $('#multi-props-close').addEventListener('click', () => $('#multi-props').classList.add('hidden'));
}

function renderTokenList() {
  const host = $('#tl-rows');
  if (!host || !stage.scene) return;
  host.innerHTML = '';
  $('#tl-title').textContent = tr('tokens.title', { n: stage.tokens.length });
  if (!stage.tokens.length) {
    host.append(el('p', { class: 'tl-empty', text: tr('tokens.empty') }));
    return;
  }
  for (const t of sortedTokens()) host.append(tokenListRow(t));
}

/** Copie triée de stage.tokens pour l'affichage (n'altère pas l'ordre de rendu). */
function sortedTokens() {
  const byName = (a, b) => (a.label || '￿').localeCompare(b.label || '￿', 'fr', { numeric: true });
  const arr = [...stage.tokens];
  if (tlSort === 'type') {
    const rank = (t) => (t.type === 'pj' ? 0 : t.type === 'pnj' ? 1 : 2);
    arr.sort((a, b) => rank(a) - rank(b) || byName(a, b));
  } else {
    arr.sort((a, b) => (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity) || byName(a, b));
  }
  return arr;
}

function tokenListRow(t) {
  const hasHp = t.hpMax > 0;
  const hp = t.hp ?? t.hpMax ?? 0;
  const ratio = hasHp ? clamp(hp / t.hpMax, 0, 1) : 0;
  const downed = hasHp && hp <= 0;
  const amount = () => Math.max(1, Math.round(+$('#tl-amount').value || 1));

  const row = el('div', {
    class: 'tl-row' + (t.type ? ' tl-' + t.type : '')
      + (stage.selectedIds.has(t.id) ? ' sel' : '') + (downed ? ' downed' : ''),
  });

  // initiative : « + init » si non définie, sinon champ éditable (aligné à droite)
  let init;
  if (t.initiative == null) {
    init = el('button', { class: 'tl-add tl-init-slot', text: tr('tokens.addInit'), title: tr('tokens.addInitTitle') });
    init.addEventListener('click', async (e) => {
      e.stopPropagation();
      const v = await askPrompt(tr('tokens.initPrompt'), { type: 'number', step: '1' });
      if (v !== null && v.trim() !== '') { t.initiative = Math.round(+v) || 0; afterTokenEdit(); }
    });
  } else {
    init = el('input', { class: 'tl-init tl-init-slot', type: 'number', step: '1', value: t.initiative, title: tr('tokens.initTitle') });
    init.addEventListener('click', (e) => e.stopPropagation());
    init.addEventListener('change', () => {
      t.initiative = init.value === '' ? null : Math.round(+init.value);
      if (stage.selectedTokenId === t.id) $('#tp-init').value = t.initiative ?? '';
      afterTokenEdit();
    });
  }

  // DEF : « + DEF » si non définie, sinon petit champ éditable
  let def;
  if (t.def == null) {
    def = el('button', { class: 'tl-add tl-def-slot', text: tr('tokens.addDef'), title: tr('tokens.addDefTitle') });
    def.addEventListener('click', async (e) => {
      e.stopPropagation();
      const v = await askPrompt(tr('tokens.defPrompt'), { type: 'number', step: '1' });
      if (v !== null && v.trim() !== '') { t.def = Math.round(+v) || 0; afterTokenEdit(); }
    });
  } else {
    def = el('span', { class: 'tl-def tl-def-slot', title: tr('tokens.defTitle') }, [
      el('span', { class: 'tl-def-lbl', text: 'DEF' }),
      (() => {
        const inp = el('input', { type: 'number', step: '1', value: t.def });
        inp.addEventListener('click', (e) => e.stopPropagation());
        inp.addEventListener('change', () => {
          t.def = inp.value === '' ? null : Math.round(+inp.value);
          if (stage.selectedTokenId === t.id) $('#tp-def').value = t.def ?? '';
          afterTokenEdit();
        });
        return inp;
      })(),
    ]);
  }

  // type : « + type » si non défini, sinon badge PJ/PNJ (clic = bascule)
  let badge;
  if (!t.type) {
    badge = el('button', { class: 'tl-add', text: tr('tokens.addType'), title: tr('tokens.addTypeTitle') });
    badge.addEventListener('click', (e) => { e.stopPropagation(); t.type = 'pnj'; afterTokenEdit(); });
  } else {
    const isPj = t.type === 'pj';
    badge = el('button', {
      class: 'tl-type ' + (isPj ? 'tl-type-pj' : 'tl-type-pnj'),
      text: isPj ? 'PJ' : 'PNJ', title: tr('tokens.toggleType'),
    });
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      t.type = isPj ? 'pnj' : 'pj';
      if (stage.selectedTokenId === t.id) $('#tp-type').value = t.type;
      afterTokenEdit();
    });
  }

  const swatch = (t.imageRef && thumbUrls.get(t.imageRef))
    ? el('img', { class: 'tl-swatch', src: thumbUrls.get(t.imageRef), alt: '', title: tr('tokens.chooseImage') })
    : el('span', { class: 'tl-swatch', title: tr('tokens.chooseImage') });
  if (!t.imageRef) swatch.style.background = t.color || '#c0392b';
  swatch.addEventListener('click', (e) => { e.stopPropagation(); openAppearanceMenu(t, swatch); });

  let name;
  if (t.label) {
    name = el('span', { class: 'tl-name', text: t.label, title: t.label });
  } else {
    name = el('button', { class: 'tl-name tl-add', text: tr('tokens.addName') });
    name.addEventListener('click', async (e) => {
      e.stopPropagation();
      const v = ((await askPrompt(tr('tokens.namePrompt'))) || '').trim();
      if (v) { t.label = v; afterTokenEdit(); }
    });
  }

  const gear = el('button', { class: 'tl-btn', text: '⚙', title: tr('tokens.configTitle') });
  gear.addEventListener('click', (e) => { e.stopPropagation(); toggleTokenProps(t); });

  const eye = el('button', {
    class: 'tl-btn tl-eye' + (t.visibleToPlayers ? ' on' : ''),
    text: '👁', title: t.visibleToPlayers ? tr('tokens.visibleYes') : tr('tokens.visibleNo'),
  });
  eye.addEventListener('click', (e) => {
    e.stopPropagation();
    t.visibleToPlayers = !t.visibleToPlayers;
    afterTokenEdit();
  });

  const del = el('button', { class: 'tl-x', text: '✕', title: tr('tokens.deleteTitle') });
  del.addEventListener('click', (e) => {
    e.stopPropagation();
    stage.tokens = stage.tokens.filter((x) => x.id !== t.id);
    if (stage.selectedIds.has(t.id)) {
      stage.selectedIds.delete(t.id);
      stage.selectedTokenId = [...stage.selectedIds].pop() ?? null;
      $('#token-props').classList.add('hidden');
      applySelectionUI();
    }
    afterTokenEdit();
  });

  const line2 = el('div', { class: 'tl-line2' });
  line2.append(gear, eye, del);

  const hpWrap = el('span', { class: 'tl-hp' });
  if (hasHp) {
    const bar = el('span', { class: 'tl-hpbar' }, [el('i')]);
    bar.firstChild.style.width = `${ratio * 100}%`;
    bar.firstChild.style.background = ratio > 0.5 ? '#3a9d54' : (ratio > 0.25 ? '#c8922e' : '#c0392b');
    const cur = el('input', { class: 'tl-hp-cur', type: 'number', min: '0', value: hp });
    cur.addEventListener('click', (e) => e.stopPropagation());
    cur.addEventListener('change', () => setTokenHp(t, +cur.value));
    const dmg = el('button', { class: 'tl-btn', text: '−', title: tr('tokens.dmgTitle', { n: amount() }) });
    dmg.addEventListener('click', (e) => { e.stopPropagation(); setTokenHp(t, (t.hp ?? t.hpMax) - amount()); });
    const heal = el('button', { class: 'tl-btn', text: '+', title: tr('tokens.healTitle', { n: amount() }) });
    heal.addEventListener('click', (e) => { e.stopPropagation(); setTokenHp(t, (t.hp ?? 0) + amount()); });
    hpWrap.append(dmg, bar, cur, el('span', { class: 'tl-hp-max', text: `/ ${t.hpMax}` }), heal);
  } else {
    const add = el('button', { class: 'tl-add', text: tr('tokens.addHp') });
    add.addEventListener('click', async (e) => {
      e.stopPropagation();
      const raw = await askPrompt(tr('tokens.hpMaxPrompt'), { value: '10', type: 'number', min: '0', step: '1' });
      if (raw === null) return;
      const v = Math.max(0, Math.round(+raw || 0));
      if (v > 0) { t.hpMax = v; t.hp = v; afterTokenEdit(); }
    });
    hpWrap.append(add);
  }

  row.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey) {
      stage.toggleSelected(t.id);
    } else if (e.shiftKey && stage.selectedTokenId) {
      const order = sortedTokens();
      const a = order.findIndex((x) => x.id === stage.selectedTokenId);
      const b = order.findIndex((x) => x.id === t.id);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const anchor = stage.selectedTokenId;
        stage.setSelection([...new Set([...stage.selectedIds, ...order.slice(lo, hi + 1).map((x) => x.id)])]);
        stage.selectedTokenId = anchor;
      }
    } else {
      stage.selectOnly(t.id);
      stage.centerOn(t.pos);
    }
    applySelectionUI();
  });

  line2.append(hpWrap);
  row.append(badge, swatch, name, def, init, line2);
  return row;
}

// ---------------------------------------------------------------- apparence du token sélectionné
function renderAppearance() {
  const host = $('#tp-lib-grid');
  if (!host) return;
  host.innerHTML = '';
  const sel = stage.tokens.find((x) => x.id === stage.selectedTokenId);
  for (const t of tokenLib) {
    const wrap = el('div', { class: 'tl-wrap' });
    const img = el('img', {
      alt: t.name, title: tr('appearance.use', { name: t.name }), src: thumbUrls.get(t.id) || '',
    });
    if (sel && sel.imageRef === t.id) img.style.borderColor = 'var(--accent)';
    img.addEventListener('click', () => {
      if (!sel) return;
      sel.imageRef = t.id;
      afterTokenEdit();
      renderAppearance();
    });
    const del = el('button', { class: 'tl-del', text: '✕', title: tr('appearance.removeLibTitle') });
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!(await askConfirm(tr('appearance.confirmRemoveLib', { name: t.name })))) return;
      await db.del('tokenLibrary', t.id);
      tokenImages.delete(t.id);
      for (const tk of stage.tokens) if (tk.imageRef === t.id) tk.imageRef = null;
      await afterTokenEdit();
      await reloadAll();
    });
    wrap.append(img, del);
    host.append(wrap);
  }
}

// ---- menu rapide d'apparence (clic sur la pastille d'un token) ----
let appearanceTargetId = null;

function openAppearanceMenu(t, anchorEl) {
  const r = anchorEl.getBoundingClientRect();
  appearanceTargetId = t.id;
  stage.selectOnly(t.id);
  applySelectionUI();

  const menu = $('#token-appearance-menu');
  const grid = $('#tam-grid');
  grid.innerHTML = '';
  for (const lib of tokenLib) {
    const img = el('img', { alt: lib.name, title: tr('appearance.use', { name: lib.name }), src: thumbUrls.get(lib.id) || '' });
    if (t.imageRef === lib.id) img.style.borderColor = 'var(--accent)';
    img.addEventListener('click', () => setAppearance(lib.id));
    grid.append(img);
  }
  if (!tokenLib.length) grid.append(el('p', { class: 'tl-empty', text: tr('appearance.noImages') }));

  menu.classList.remove('hidden');
  const mw = 190;
  let left = r.right + 8;
  if (left + mw > window.innerWidth - 8) left = r.left - mw - 8;
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.min(r.top, window.innerHeight - menu.offsetHeight - 8)}px`;

  setTimeout(() => document.addEventListener('pointerdown', closeAppearanceOnOutside), 0);
}

function closeAppearanceMenu() {
  $('#token-appearance-menu').classList.add('hidden');
  appearanceTargetId = null;
  document.removeEventListener('pointerdown', closeAppearanceOnOutside);
}
function closeAppearanceOnOutside(e) {
  if (!e.target.closest('#token-appearance-menu')) closeAppearanceMenu();
}

async function setAppearance(imageRef) {
  const t = stage.tokens.find((x) => x.id === appearanceTargetId);
  if (t) { t.imageRef = imageRef; await afterTokenEdit(); }
  closeAppearanceMenu();
}

// ---------------------------------------------------------------- canvas : interactions
function broadcastTokens() {
  if (selectedId === presentingId) push('tokens', { sceneId: selectedId, tokens: structuredClone(stage.tokens) });
}
const broadcastTokensThrottled = throttle(broadcastTokens, 60);
const broadcastFogStroke = throttle((seg, radius, mode) => {
  if (selectedId === presentingId) push('fogStroke', { sceneId: selectedId, seg, radius, mode });
}, 40);
const broadcastGridThrottled = throttle(() => {
  if (stage.scene && selectedId === presentingId) push('grid', { sceneId: selectedId, grid: stage.scene.grid });
}, 80);

/** Rectangle monde normalisé et borné à l'image, à partir de deux coins. */
function rectFromWorld(a, b) {
  const x0 = clamp(Math.min(a.x, b.x), 0, stage.imgW);
  const y0 = clamp(Math.min(a.y, b.y), 0, stage.imgH);
  const x1 = clamp(Math.max(a.x, b.x), 0, stage.imgW);
  const y1 = clamp(Math.max(a.y, b.y), 0, stage.imgH);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Met à jour la règle de mesure entre deux points monde (a = origine, b = fin). */
function updateRuler(a, b) {
  const cell = stage.scene?.grid?.cellPx || 70;
  const dx = b.x - a.x, dy = b.y - a.y;
  const euclid = Math.hypot(dx, dy) / cell;
  const squares = Math.max(Math.abs(dx), Math.abs(dy)) / cell;
  const text = `${Math.round(squares)} ${tr('ruler.cells')} (~${euclid.toFixed(1)})`;
  stage.setRuler({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, text });
}

function wireCanvas() {
  const cv = $('#gm-canvas');
  let mode = null;            // 'pan' | 'token-drag' | 'fog' | 'calibrate' | 'grid-move' | 'grid-size' | 'marquee'
  let last = null;            // dernier point écran
  let dragToken = null;
  let dragGroup = null;       // [{ id, x0, y0 }] pour un déplacement groupé
  let dragOrigin = null;      // point monde au début du drag de token
  let fogLastWorld = null;
  let calStart = null;
  let marqStart = null;       // point monde au début du rectangle de sélection
  let gridMoveStart = null;   // { world, offX, offY }
  let gridSizeStart = null;   // { y, cell }
  let rulerStart = null;      // point monde au début d'une mesure
  let frameStart = null;      // coin monde au début du tracé du cadre joueurs
  let framePrev = null;       // cadre joueurs avant le tracé (pour annuler un micro-clic)

  const isBrushTool = () => tool === 'reveal' || tool === 'hide';
  const updateBrush = (p) => {
    if (stage.scene && isBrushTool() && p) {
      stage.setBrushCursor(p, brushPx, tool === 'hide' ? 'hide' : 'reveal');
    } else if (stage.brushCursor) {
      stage.setBrushCursor(null);
    }
  };

  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = stage.localPoint(e);
    stage.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, p);
    updateBrush(p);
  }, { passive: false });
  cv.addEventListener('pointerleave', () => stage.setBrushCursor(null));

  // double-clic = ping (« regarde ici ») pour soi + les joueurs
  cv.addEventListener('dblclick', (e) => {
    if (!stage.scene) return;
    const w = stage.screenToWorld(stage.localPoint(e));
    stage.addPing(w);
    if (selectedId === presentingId) push('ping', { sceneId: selectedId, x: w.x, y: w.y });
  });

  cv.addEventListener('pointerdown', (e) => {
    if (!stage.scene) return;
    cv.setPointerCapture(e.pointerId);
    const p = stage.localPoint(e);
    last = p;
    const wantPan = e.button === 1 || e.button === 2 || spaceHeld;

    // touche M maintenue : mesure de distance (prioritaire sur l'outil courant)
    if (rulerHeld && e.button === 0) {
      mode = 'ruler';
      rulerStart = stage.snapWorld(stage.screenToWorld(p));
      updateRuler(rulerStart, rulerStart);
      return;
    }

    if (calibrating && e.button === 0) {
      mode = 'calibrate';
      calStart = stage.screenToWorld(p);
      return;
    }
    // outil grille + clic droit maintenu : glisser vertical = taille de case
    if (tool === 'grid' && e.button === 2 && stage.fog) {
      mode = 'grid-size';
      gridSizeStart = { y: p.y, cell: stage.scene.grid.cellPx };
      return;
    }
    if (wantPan) { mode = 'pan'; return; }
    if (!stage.fog) { mode = 'pan'; return; }

    if (tool === 'move') {
      const multi = e.shiftKey || e.ctrlKey || e.metaKey;
      const hit = stage.tokenAt(p);
      if (hit) {
        if (multi) {
          stage.toggleSelected(hit.id);
          applySelectionUI();
          mode = null;
        } else {
          if (!stage.selectedIds.has(hit.id)) { stage.selectOnly(hit.id); applySelectionUI(); }
          mode = 'token-drag';
          dragToken = stage.tokens.find((x) => x.id === hit.id);
          dragOrigin = stage.screenToWorld(p);
          dragGroup = stage.selectedIds.size > 1
            ? stage.selectedTokens().map((t) => ({ id: t.id, x0: t.pos.x, y0: t.pos.y }))
            : null;
        }
      } else if (multi) {
        mode = 'marquee';
        marqStart = stage.screenToWorld(p);
      } else {
        stage.clearSelection();
        applySelectionUI();
        mode = 'pan';
      }
    } else if (tool === 'reveal' || tool === 'hide') {
      mode = 'fog';
      stage.fog.pushUndo(); // mémorise l'état d'avant le trait (Ctrl+Z)
      const w = stage.screenToWorld(p);
      const radius = (brushPx / 2) / stage.cam.zoom;
      stage.fog.strokeSeg(w, w, radius, tool === 'hide' ? 'hide' : 'reveal');
      broadcastFogStroke({ from: w, to: w }, radius, tool === 'hide' ? 'hide' : 'reveal');
      fogLastWorld = w;
      stage.invalidate();
    } else if (tool === 'token') {
      createTokenAt(stage.snapWorld(stage.screenToWorld(p)));
      mode = null;
    } else if (tool === 'grid') {
      mode = 'grid-move';
      const g = stage.scene.grid;
      gridMoveStart = { world: stage.screenToWorld(p), offX: g.offsetX, offY: g.offsetY };
    } else if (tool === 'frame') {
      mode = 'frame';
      frameStart = stage.screenToWorld(p);
      framePrev = stage.scene?.playerFrame ? { ...stage.scene.playerFrame } : null;
    }
  });

  cv.addEventListener('pointermove', (e) => {
    const p = stage.localPoint(e);
    updateBrush(p);
    if (!mode) return;
    const dx = p.x - last.x, dy = p.y - last.y;
    last = p;

    if (mode === 'pan') { stage.panBy(dx, dy); }
    else if (mode === 'token-drag' && dragToken) {
      const snapped = stage.snapWorld(stage.screenToWorld(p));
      if (dragGroup) {
        const dX = snapped.x - stage.snapWorld(dragOrigin).x;
        const dY = snapped.y - stage.snapWorld(dragOrigin).y;
        for (const g of dragGroup) {
          const tk = stage.tokens.find((x) => x.id === g.id);
          if (tk) tk.pos = { x: g.x0 + dX, y: g.y0 + dY };
        }
      } else {
        dragToken.pos = snapped;
      }
      stage.invalidate();
      broadcastTokensThrottled();
    } else if (mode === 'marquee' && marqStart) {
      const w = stage.screenToWorld(p);
      stage.setMarquee({ x0: marqStart.x, y0: marqStart.y, x1: w.x, y1: w.y });
    } else if (mode === 'ruler' && rulerStart) {
      updateRuler(rulerStart, stage.snapWorld(stage.screenToWorld(p)));
    } else if (mode === 'frame' && frameStart) {
      stage.setPlayerFrame(rectFromWorld(frameStart, stage.screenToWorld(p)));
    } else if (mode === 'fog') {
      const w = stage.screenToWorld(p);
      const radius = (brushPx / 2) / stage.cam.zoom;
      const m = tool === 'hide' ? 'hide' : 'reveal';
      stage.fog.strokeSeg(fogLastWorld, w, radius, m);
      broadcastFogStroke({ from: fogLastWorld, to: w }, radius, m);
      fogLastWorld = w;
      stage.invalidate();
    } else if (mode === 'calibrate' && calStart) {
      const w = stage.screenToWorld(p);
      stage.setCalibrateRect({ x0: calStart.x, y0: calStart.y, x1: w.x, y1: w.y });
    } else if (mode === 'grid-move' && gridMoveStart) {
      const g = stage.scene.grid;
      const cell = g.cellPx || 1;
      const wrap = (v) => ((v % cell) + cell) % cell;
      const w = stage.screenToWorld(p);
      g.offsetX = wrap(gridMoveStart.offX + (w.x - gridMoveStart.world.x));
      g.offsetY = wrap(gridMoveStart.offY + (w.y - gridMoveStart.world.y));
      stage.invalidate();
      syncGridPanel();
      broadcastGridThrottled();
    } else if (mode === 'grid-size' && gridSizeStart) {
      const g = stage.scene.grid;
      g.cellPx = clamp(Math.round(gridSizeStart.cell + (gridSizeStart.y - p.y)), 4, 2000);
      stage.invalidate();
      syncGridPanel();
      showHint(tr('hint.cellSize', { px: g.cellPx }));
      broadcastGridThrottled();
    }
  });

  cv.addEventListener('pointerup', async (e) => {
    try { cv.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const finished = mode;
    mode = null;

    if (finished === 'token-drag') {
      dragGroup = null; dragOrigin = null;
      await persistCurrentScene();
      broadcastTokens();
    } else if (finished === 'ruler') {
      // clic sans glisser : rien à mesurer, on efface
      if (stage.ruler && stage.ruler.x0 === stage.ruler.x1 && stage.ruler.y0 === stage.ruler.y1) {
        stage.setRuler(null);
      }
      rulerStart = null;
    } else if (finished === 'frame') {
      frameStart = null;
      const f = stage.scene?.playerFrame;
      const ok = f && f.w >= 60 && f.h >= 60;
      await commitPlayerFrame(ok ? f : framePrev);
    } else if (finished === 'marquee') {
      const m = stage.marquee;
      stage.setMarquee(null);
      marqStart = null;
      if (m) {
        const add = e.shiftKey || e.ctrlKey || e.metaKey;
        const inRect = stage.tokenIdsInWorldRect(m.x0, m.y0, m.x1, m.y1);
        stage.setSelection(add ? [...new Set([...stage.selectedIds, ...inRect])] : inRect);
      }
      applySelectionUI();
    } else if (finished === 'grid-move' || finished === 'grid-size') {
      gridMoveStart = null;
      gridSizeStart = null;
      hideHint();
      syncGridPanel();
      await persistCurrentScene();
      if (selectedId === presentingId) push('grid', { sceneId: selectedId, grid: stage.scene.grid });
    } else if (finished === 'fog') {
      updateFogUndoBtn();
      await commitFog();
    } else if (finished === 'calibrate' && calStart) {
      const end = stage.screenToWorld(stage.localPoint(e));
      const cell = Math.round(Math.max(Math.abs(end.x - calStart.x), Math.abs(end.y - calStart.y)));
      const start = calStart;
      calibrating = false;
      calStart = null;
      stage.setCalibrateRect(null);
      hideHint();
      if (cell >= 4) {
        const g = stage.scene.grid;
        g.cellPx = cell;
        g.offsetX = ((Math.min(start.x, end.x) % cell) + cell) % cell;
        g.offsetY = ((Math.min(start.y, end.y) % cell) + cell) % cell;
        syncGridPanel();
        stage.invalidate();
        await persistCurrentScene();
        if (selectedId === presentingId) push('grid', { sceneId: selectedId, grid: g });
      }
    }
  });
}

/** Crée un token à la position monde donnée et le sélectionne. `overrides` : champs
 *  pré-remplis (depuis un modèle). Le nom / les PV se règlent depuis la liste ou ⚙. */
async function createTokenAt(worldPos, overrides = {}) {
  if (!stage.scene) return;
  const t = {
    id: uid('t'),
    label: '',
    type: null,
    initiative: null,
    color: '#c0392b',
    imageRef: null,
    sizeCells: 1,
    visibleToPlayers: true,
    hpMax: null,
    hp: null,
    hpShare: 'off',
    ...overrides,
    id: uid('t'),
    pos: worldPos,
  };
  if (t.hpMax > 0) { if (t.hp == null) t.hp = t.hpMax; } else { t.hpMax = null; t.hp = null; }
  if (Array.isArray(t.conditions) && !t.conditions.length) delete t.conditions;
  stage.tokens.push(t);
  stage.selectOnly(t.id);
  applySelectionUI();
  setTool('move');
  hideHint();
  await afterTokenEdit();
}

/** Bouton « + Ajouter un token » : pose un token au centre de la vue. */
function quickAddToken() {
  if (!stage.scene) return;
  createTokenAt(stage.snapWorld(stage.screenToWorld({ x: stage.cssW / 2, y: stage.cssH / 2 })));
}

// ---------------------------------------------------------------- modèles de créature
function renderTemplates() {
  const host = $('#template-list');
  if (!host) return;
  host.innerHTML = '';
  for (const tpl of templates) {
    const chip = el('div', { class: 'tpl-chip', title: tr('templates.placeTitle', { name: tpl.name }) });
    const sw = (tpl.imageRef && thumbUrls.get(tpl.imageRef))
      ? el('img', { class: 'tpl-sw', src: thumbUrls.get(tpl.imageRef), alt: '' })
      : el('span', { class: 'tpl-sw' });
    if (!tpl.imageRef) sw.style.background = tpl.color || '#c0392b';
    const x = el('button', { class: 'tpl-x', text: '✕', title: tr('templates.deleteTitle') });
    x.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (await askConfirm(tr('templates.confirmDelete', { name: tpl.name }))) {
        await db.del('templates', tpl.id);
        await reloadAll();
      }
    });
    chip.append(sw, el('span', { class: 'tpl-name', text: tpl.name }), x);
    chip.addEventListener('click', () => {
      if (!stage.scene) return;
      createTokenAt(stage.snapWorld(stage.screenToWorld({ x: stage.cssW / 2, y: stage.cssH / 2 })), {
        label: tpl.name,
        color: tpl.color,
        type: tpl.type ?? null,
        def: tpl.def ?? null,
        sizeCells: tpl.sizeCells || 1,
        hpMax: tpl.hpMax || null,
        hp: tpl.hpMax || null,
        hpShare: tpl.hpShare || 'off',
        conditions: [...(tpl.conditions || [])],
        imageRef: tpl.imageRef || null,
      });
    });
    host.append(chip);
  }
}

async function saveTokenAsTemplate() {
  const t = stage.tokens.find((x) => x.id === stage.selectedTokenId);
  if (!t) return;
  const name = ((await askPrompt(tr('templates.namePrompt'), { value: t.label || '' })) || '').trim();
  if (!name) return;
  await db.put('templates', {
    id: uid('tpl'),
    name,
    color: t.color || '#c0392b',
    type: t.type ?? null,
    def: t.def ?? null,
    sizeCells: t.sizeCells || 1,
    hpMax: t.hpMax || null,
    hpShare: t.hpShare || 'off',
    conditions: Array.isArray(t.conditions) ? [...t.conditions] : [],
    imageRef: t.imageRef || null,
  });
  await reloadAll();
  showHint(tr('templates.saved', { name }));
}

// ---------------------------------------------------------------- clavier
let spaceHeld = false;
let rulerHeld = false;
function wireKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (e.code === 'Space') { spaceHeld = true; $('#gm-canvas').style.cursor = 'grab'; return; }
    if (!stage.scene) return;
    const k = e.key.toLowerCase();
    // M maintenu : règle de mesure (glisser sur la carte)
    if (k === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!rulerHeld) { rulerHeld = true; showHint(tr('ruler.hint')); }
      $('#gm-canvas').style.cursor = 'crosshair';
      return;
    }
    // Ctrl/Cmd+Z : annuler le dernier coup de pinceau de brouillard
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) {
      e.preventDefault();
      fogUndo();
      return;
    }
    // Ctrl/Cmd+D : dupliquer le(s) token(s) sélectionné(s)
    if ((e.ctrlKey || e.metaKey) && k === 'd') {
      e.preventDefault();
      duplicateSelectedTokens();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return; // laisse les raccourcis navigateur
    if (k === 'f') stage.fit();
    if (k === 'v') setTool('move');
    if (k === 'r') setTool('reveal');
    if (k === 'h') setTool('hide');
    if (k === 't') setTool('token');
    if (k === 'g') toggleConfig();
    if (k === 'a') quickAddToken();
    if (k === 'n') advanceTurn(1);
    if ((e.key === 'Delete' || e.key === 'Backspace') && stage.selectedIds.size) {
      const ids = new Set(stage.selectedIds);
      stage.tokens = stage.tokens.filter((x) => !ids.has(x.id));
      stage.clearSelection();
      $('#token-props').classList.add('hidden');
      applySelectionUI();
      afterTokenEdit();
    }
    // flèches : décale le(s) token(s) sélectionné(s) d'une case
    if (e.key.startsWith('Arrow') && stage.selectedIds.size) {
      e.preventDefault();
      const cell = stage.scene?.grid?.cellPx || 70;
      const dx = (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0) * cell;
      const dy = (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0) * cell;
      for (const t of stage.selectedTokens()) t.pos = { x: t.pos.x + dx, y: t.pos.y + dy };
      stage.invalidate();
      afterTokenEdit();
    }
    if (e.key === 'Escape') {
      stage.clearSelection();
      applySelectionUI();
      stage.setRuler(null);
      if (tool === 'frame') setTool('move');
      closeFloaties(); closeAppearanceMenu(); calibrating = false; stage.setCalibrateRect(null); hideHint();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { spaceHeld = false; setTool(tool); }
    if (e.key.toLowerCase() === 'm' && rulerHeld) {
      rulerHeld = false;
      stage.setRuler(null);
      hideHint();
      setTool(tool);
    }
  });
}

// ---------------------------------------------------------------- hint
let hintTimer = null;
function showHint(msg) {
  clearTimeout(hintTimer);
  const h = $('#hint');
  h.textContent = msg;
  h.classList.add('show');
  hintTimer = setTimeout(() => h.classList.remove('show'), 4000);
}
function hideHint() { clearTimeout(hintTimer); $('#hint').classList.remove('show'); }
