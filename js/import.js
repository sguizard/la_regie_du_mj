// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Import d'images : cartes tactiques + tokens =====

import { uid, makeThumbnail, downscaleImage } from './util.js';

const MAX_MAP_SIDE = 2560;   // au-delà : la carte est réduite à l'import
const MAX_TOKEN_SIDE = 512;  // idem pour les images de tokens
import { put, getAll } from './db.js';
import { defaultGrid } from './stage.js';
import { t as tr } from './i18n.js';

async function nextOrder(store, deckId = undefined) {
  const rows = await getAll(store);
  const scoped = deckId === undefined ? rows : rows.filter((r) => r.deckId === deckId);
  return scoped.reduce((m, r) => Math.max(m, r.order ?? 0), 0) + 1;
}

function baseName(file) {
  return (file.name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || tr('misc.unnamed');
}

/** Importe une liste de fichiers image comme cartes tactiques. */
export async function importScenes(files, deckId = null) {
  const created = [];
  let order = await nextOrder('scenes', deckId);
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const imageBlob = await downscaleImage(file.slice(0, file.size, file.type), MAX_MAP_SIDE);
    const thumbBlob = await makeThumbnail(imageBlob, 320);
    const scene = {
      id: uid('scene'),
      kind: 'battlemap',
      name: baseName(file),
      deckId,
      order: order++,
      imageBlob,
      thumbBlob,
      grid: defaultGrid(),
      fogBlob: null,
      tokens: [],
    };
    await put('scenes', scene);
    created.push(scene);
  }
  return created;
}

/** Importe des images dans la bibliothèque de tokens. */
export async function importTokens(files) {
  const created = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const imageBlob = await downscaleImage(file.slice(0, file.size, file.type), MAX_TOKEN_SIDE);
    const thumbBlob = await makeThumbnail(imageBlob, 128);
    const tok = { id: uid('tok'), name: baseName(file), imageBlob, thumbBlob };
    await put('tokenLibrary', tok);
    created.push(tok);
  }
  return created;
}
