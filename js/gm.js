// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== La régie (écran du MJ) =====

import { $, $$, el, uid, clamp, debounce, throttle, formatBytes, blobToBitmap, confirmAction } from './util.js';
import * as db from './db.js';
import { Bus } from './sync.js';
import { Stage, defaultGrid } from './stage.js';
import { importScenes, importTokens } from './import.js';
import { t as tr, applyI18n } from './i18n.js';

let stage, bus;
let decks = [];
let scenes = [];
let tokenLib = [];
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
  window.addEventListener('langchange', () => {
    applyI18n(document);
    updateBlackoutBtn();
    setPlayerPill(_pillOn);
    if (!selectedId) $('#scene-name').textContent = tr('topbar.noScene');
    if (stage.selectedIds.size >= 2) $('#mp-title').textContent = tr('multi.title', { n: stage.selectedIds.size });
    renderSidebar();
    renderTokenList();
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
  [decks, scenes, tokenLib] = await Promise.all([
    db.getAll('decks'), db.getAll('scenes'), db.getAll('tokenLibrary'),
  ]);
  decks.sort((a, b) => a.order - b.order);
  scenes.sort((a, b) => a.order - b.order);

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
}

async function persistCurrentScene() {
  const s = scenes.find((x) => x.id === selectedId);
  if (!s || !stage.scene) return;
  s.kind = 'battlemap';
  s.grid = stage.scene.grid;
  s.tokens = structuredClone(stage.tokens);
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
    push('tokens', { sceneId: presentingId, tokens: structuredClone(stage.tokens) });
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
  if (!confirmAction(tr('confirm.wipe'))) return;
  await db.clearAll();
  for (const u of thumbUrls.values()) URL.revokeObjectURL(u);
  thumbUrls.clear(); tokenImages.clear();
  decks = []; scenes = []; tokenLib = [];
  selectedId = presentingId = null;
  if (blackout) await setBlackout(false);
  stage.setScene(null, null);
  bus.send({ t: 'clear' });
  renderSidebar(); renderAppearance();
  $('#scene-name').textContent = tr('topbar.noScene');
  $('#btn-present').disabled = true;
  $('#map-toolbar').classList.add('hidden');
  $('.side-tokens').classList.add('hidden');
  setConfigOpen(false);
  $('#token-props').classList.add('hidden');
  $('#multi-props').classList.add('hidden');
  refreshStorage();
}

async function refreshStorage() {
  const est = await db.storageEstimate();
  $('#storage-usage').textContent = est?.usage ? formatBytes(est.usage) : '';
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
  const name = prompt(tr('deck.namePrompt'), tr('deck.newName'));
  if (!name) return;
  const order = decks.reduce((m, d) => Math.max(m, d.order), 0) + 1;
  await db.put('decks', { id: uid('deck'), name: name.trim(), order });
  await reloadAll();
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
  row.append(thumb, label);

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
  if (!confirmAction(tr('confirm.deleteDeck'))) return;
  for (const s of scenes.filter((x) => x.deckId === deckId)) { s.deckId = null; await db.put('scenes', s); }
  await db.del('decks', deckId);
  await reloadAll();
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
  stage.invalidate();
  $('#map-toolbar').classList.remove('hidden');
  $('.side-tokens').classList.remove('hidden');
  syncGridPanel();
  setTool('move');
  $('#token-props').classList.add('hidden');
  $('#multi-props').classList.add('hidden');
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
  ['#tp-label', '#tp-color', '#tp-size', '#tp-hp', '#tp-hpmax', '#tp-init'].forEach((s) => $(s).addEventListener('input', tpApply));
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

function setTool(t) {
  tool = t;
  $$('.tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
  $('#fog-group').classList.toggle('hidden', t !== 'reveal' && t !== 'hide');
  if (t !== 'reveal' && t !== 'hide') stage?.setBrushCursor(null);
  const cursor = t === 'move' ? 'default' : (t === 'token' ? 'copy' : (t === 'grid' ? 'move' : 'crosshair'));
  $('#gm-canvas').style.cursor = cursor;
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
  if (mode === 'reveal') stage.fog.revealAll(); else stage.fog.hideAll();
  stage.invalidate();
  await persistCurrentScene();
  if (selectedId === presentingId) push('fog', { sceneId: selectedId, blob: await stage.fog.toBlob() });
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
    $('#mp-size').value = '';
    $('#mp-type').value = '';
    $('#mp-hpshare').value = '';
    $('#multi-props').classList.remove('hidden');
  } else {
    $('#multi-props').classList.add('hidden');
    if (n === 0) $('#token-props').classList.add('hidden');
  }
  renderTokenList();
}

function openTokenProps(t) {
  stage.selectOnly(t.id);
  $('#multi-props').classList.add('hidden');
  $('#tp-label').value = t.label || '';
  $('#tp-type').value = t.type === 'pj' || t.type === 'pnj' ? t.type : '';
  $('#tp-init').value = t.initiative ?? '';
  $('#tp-color').value = t.color || '#c0392b';
  $('#tp-size').value = t.sizeCells || 1;
  $('#tp-visible').checked = !!t.visibleToPlayers;
  $('#tp-hp').value = t.hp ?? '';
  $('#tp-hpmax').value = t.hpMax ?? '';
  $('#tp-hpshare').value = t.hpShare || 'off';
  $('#token-props').classList.remove('hidden');
  renderAppearance();
  renderTokenList();
}

// ---------------------------------------------------------------- liste des tokens (combat)
async function afterTokenEdit() {
  stage.invalidate();
  renderTokenList();
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
    init.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = prompt('Initiative ?', '');
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
    name.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = (prompt(tr('tokens.namePrompt'), '') || '').trim();
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
    add.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = Math.max(0, Math.round(+prompt(tr('tokens.hpMaxPrompt'), '10') || 0));
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
  row.append(badge, swatch, name, init, line2);
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
      if (!confirmAction(tr('appearance.confirmRemoveLib', { name: t.name }))) return;
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
      await persistCurrentScene();
      if (selectedId === presentingId) push('fog', { sceneId: selectedId, blob: await stage.fog.toBlob() });
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

/** Crée un token (disque par défaut) à la position monde donnée et le sélectionne.
 *  Le nom / les PV se règlent depuis la liste (+ nom, + PV) ou l'engrenage ⚙. */
async function createTokenAt(worldPos) {
  if (!stage.scene) return;
  const t = {
    id: uid('t'),
    label: '',
    type: null,
    initiative: null,
    color: '#c0392b',
    imageRef: null,
    pos: worldPos,
    sizeCells: 1,
    visibleToPlayers: true,
    hpMax: null,
    hp: null,
    hpShare: 'off',
  };
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

// ---------------------------------------------------------------- clavier
let spaceHeld = false;
function wireKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (e.code === 'Space') { spaceHeld = true; $('#gm-canvas').style.cursor = 'grab'; return; }
    if (!stage.scene) return;
    const k = e.key.toLowerCase();
    if (k === 'f') stage.fit();
    if (k === 'v') setTool('move');
    if (k === 'r') setTool('reveal');
    if (k === 'h') setTool('hide');
    if (k === 't') setTool('token');
    if (k === 'g') toggleConfig();
    if (k === 'a') quickAddToken();
    if ((e.key === 'Delete' || e.key === 'Backspace') && stage.selectedIds.size) {
      const ids = new Set(stage.selectedIds);
      stage.tokens = stage.tokens.filter((x) => !ids.has(x.id));
      stage.clearSelection();
      $('#token-props').classList.add('hidden');
      applySelectionUI();
      afterTokenEdit();
    }
    if (e.key === 'Escape') {
      stage.clearSelection();
      applySelectionUI();
      closeFloaties(); closeAppearanceMenu(); calibrating = false; stage.setCalibrateRect(null); hideHint();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { spaceHeld = false; setTool(tool); }
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
