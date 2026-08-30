// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Sauvegarde : export / import de toute la campagne =====
// Un fichier JSON autoportant : decks + scènes + bibliothèque de tokens,
// images (cartes, vignettes, brouillard) encodées en data URL.

import { getAll, put, clearAll } from './db.js';

const FORMAT = 'regie-du-mj/backup';
const VERSION = 1;

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataURLToBlob(dataURL) {
  const res = await fetch(dataURL);
  return res.blob();
}

/** Construit l'objet de sauvegarde complet. */
export async function buildBackup() {
  const [decks, scenes, tokenLibrary, templates] = await Promise.all([
    getAll('decks'), getAll('scenes'), getAll('tokenLibrary'), getAll('templates'),
  ]);

  const outScenes = [];
  for (const s of scenes) {
    outScenes.push({
      id: s.id,
      kind: s.kind || 'battlemap',
      name: s.name,
      deckId: s.deckId ?? null,
      order: s.order ?? 0,
      grid: s.grid ?? null,
      tokens: s.tokens ?? [],
      combat: s.combat ?? null,
      playerFrame: s.playerFrame ?? null,
      image: s.imageBlob ? await blobToDataURL(s.imageBlob) : null,
      thumb: s.thumbBlob ? await blobToDataURL(s.thumbBlob) : null,
      fog: s.fogBlob ? await blobToDataURL(s.fogBlob) : null,
    });
  }

  const outTokens = [];
  for (const t of tokenLibrary) {
    outTokens.push({
      id: t.id,
      name: t.name,
      image: t.imageBlob ? await blobToDataURL(t.imageBlob) : null,
      thumb: t.thumbBlob ? await blobToDataURL(t.thumbBlob) : null,
    });
  }

  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    decks: decks.map((d) => ({ id: d.id, name: d.name, order: d.order ?? 0 })),
    scenes: outScenes,
    tokenLibrary: outTokens,
    templates: (templates || []).map((t) => ({ ...t })),
  };
}

export function isBackupFormat(data) {
  return !!data && data.format === FORMAT && Array.isArray(data.scenes);
}

export function isEmptyBackup(data) {
  return !data
    || (!(data.scenes || []).length
      && !(data.decks || []).length
      && !(data.tokenLibrary || []).length);
}

/** Valide puis restaure une sauvegarde : REMPLACE toutes les données existantes.
 *  Tout est décodé en mémoire d'abord — en cas de fichier corrompu, les données
 *  actuelles ne sont pas effacées. */
export async function restoreBackup(data) {
  if (!isBackupFormat(data)) throw new Error('bad-backup');

  const decks = (data.decks || []).map((d) => ({ id: d.id, name: d.name, order: d.order ?? 0 }));

  const scenes = [];
  for (const s of data.scenes) {
    scenes.push({
      id: s.id,
      kind: s.kind || 'battlemap',
      name: s.name,
      deckId: s.deckId ?? null,
      order: s.order ?? 0,
      grid: s.grid ?? null,
      tokens: s.tokens ?? [],
      combat: s.combat ?? null,
      playerFrame: s.playerFrame ?? null,
      imageBlob: s.image ? await dataURLToBlob(s.image) : null,
      thumbBlob: s.thumb ? await dataURLToBlob(s.thumb) : null,
      fogBlob: s.fog ? await dataURLToBlob(s.fog) : null,
    });
  }

  const tokens = [];
  for (const t of data.tokenLibrary || []) {
    tokens.push({
      id: t.id,
      name: t.name,
      imageBlob: t.image ? await dataURLToBlob(t.image) : null,
      thumbBlob: t.thumb ? await dataURLToBlob(t.thumb) : null,
    });
  }

  const templates = (data.templates || [])
    .filter((t) => t && t.id)
    .map((t) => ({
      id: t.id,
      name: t.name || '',
      color: t.color || '#c0392b',
      type: t.type ?? null,
      def: t.def ?? null,
      sizeCells: t.sizeCells || 1,
      hpMax: t.hpMax || null,
      hpShare: t.hpShare || 'off',
      conditions: Array.isArray(t.conditions) ? t.conditions : [],
      imageRef: t.imageRef || null,
    }));

  // tout est prêt : on remplace
  await clearAll();
  for (const d of decks) await put('decks', d);
  for (const s of scenes) await put('scenes', s);
  for (const t of tokens) await put('tokenLibrary', t);
  for (const t of templates) await put('templates', t);
}
