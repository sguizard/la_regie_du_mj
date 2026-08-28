// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Écran vue joueurs =====

import { $, blobToBitmap } from './util.js';
import * as db from './db.js';
import { Bus } from './sync.js';
import { Stage } from './stage.js';

let stage, bus;
let currentSceneId = null;
let loadSeq = 0;              // incrémenté à chaque chargement de scène
let loading = false;
let loadingTarget = null;
let pendingMsgs = [];         // messages « live » reçus pendant un chargement
let applied = { grid: 0, tokens: 0, fog: 0 }; // horodatage du dernier message appliqué par type
const tokenImages = new Map();

export async function initPlayer() {
  await db.openDB();
  stage = new Stage($('#player-canvas'), 'player');
  bus = new Bus();

  bus.on('present', (m) => showScene(m.sceneId, m.ts));
  bus.on('grid', (m) => live(m, 'grid', () => stage.setGrid(m.grid)));
  bus.on('tokens', (m) => live(m, 'tokens', () => stage.setTokens(m.tokens)));
  bus.on('fogStroke', (m) => live(m, 'fog', () => {
    if (stage.fog) { stage.fog.strokeSeg(m.seg.from, m.seg.to, m.radius, m.mode); stage.invalidate(); }
  }));
  bus.on('fog', (m) => live(m, 'fog', async () => {
    if (stage.fog) { await stage.fog.loadBlob(m.blob); stage.invalidate(); }
  }));
  bus.on('clear', () => {
    loadSeq++;
    currentSceneId = null;
    stage.setScene(null, null);
    $('#player-idle').classList.remove('hidden');
    $('#player-blackout').classList.add('hidden');
  });
  bus.on('blackout', (m) => {
    $('#player-blackout').classList.toggle('hidden', !m.on);
  });

  wireIdleUI();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { stage.invalidate(); bus.send({ t: 'hello' }); }
  });
  bus.send({ t: 'hello' });

  const last = await db.getMeta('presentingSceneId');
  if (last) showScene(last);

  if (new URLSearchParams(location.search).has('debug')) {
    window.__mj = { stage, bus, showScene, get sceneId() { return currentSceneId; } };
  }
}

/** Applique un message « live » (grille / tokens / brouillard) ou le met en file
 *  d'attente si un chargement de scène est en cours. L'horodatage `m.ts` ordonne
 *  les applications : un message plus ancien que le dernier appliqué est ignoré. */
function live(m, kind, apply) {
  if (loading && m.sceneId === loadingTarget) { pendingMsgs.push({ kind, ts: m.ts, apply }); return; }
  if (m.sceneId !== currentSceneId) return;
  if (m.ts && m.ts < applied[kind]) return;
  if (m.ts) applied[kind] = m.ts;
  apply();
}

async function showScene(sceneId, ts) {
  if (!sceneId) return;
  // déjà affichée et pas de chargement en cours : les messages live suffisent
  if (sceneId === currentSceneId && !loading) return;

  const seq = ++loadSeq;
  const baseTs = ts || Date.now();
  loading = true;
  loadingTarget = sceneId;
  pendingMsgs = [];
  applied = { grid: baseTs, tokens: baseTs, fog: baseTs };

  try {
    const s = await db.get('scenes', sceneId);
    if (seq !== loadSeq) return;
    if (!s) return;

    $('#player-idle').classList.add('hidden');
    const cv = $('#player-canvas');
    cv.style.opacity = '0';

    const image = await blobToBitmap(s.imageBlob);
    if (seq !== loadSeq) return;

    for (const t of s.tokens || []) {
      if (t.imageRef && !tokenImages.has(t.imageRef)) {
        const lib = await db.get('tokenLibrary', t.imageRef);
        if (lib) { try { tokenImages.set(t.imageRef, await blobToBitmap(lib.imageBlob)); } catch { /* ignore */ } }
      }
    }
    if (seq !== loadSeq) return;
    stage.setTokenImages(tokenImages);

    currentSceneId = sceneId;
    stage.setScene(s, image, { fit: true });
    if (stage.fog) await stage.fog.loadBlob(s.fogBlob || null);
    if (seq !== loadSeq) return;
    stage.invalidate();

    // rejoue les messages arrivés pendant le chargement (strokes idempotents)
    const q = pendingMsgs.filter((x) => !x.ts || x.ts >= baseTs);
    pendingMsgs = [];
    for (const { kind, ts: mts, apply } of q) {
      if (mts) applied[kind] = Math.max(applied[kind], mts);
      await apply();
    }

    requestAnimationFrame(() => { cv.style.opacity = '1'; });
  } finally {
    if (seq === loadSeq) { loading = false; loadingTarget = null; }
  }
}

// curseur + bouton plein écran auto-masqués
function wireIdleUI() {
  const root = $('#player-app');
  let t = null;
  const wake = () => {
    root.classList.add('show-cursor');
    clearTimeout(t);
    t = setTimeout(() => root.classList.remove('show-cursor'), 2500);
  };
  root.addEventListener('mousemove', wake);
  root.addEventListener('pointerdown', wake);
  $('#player-fs').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
}
