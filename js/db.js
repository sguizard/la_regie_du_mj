// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Couche IndexedDB =====
// Stores :
//   decks         { id, name, order }
//   scenes        { id, kind:'battlemap', name, deckId, order,
//                   imageBlob, thumbBlob,
//                   grid?, fogBlob?, tokens? }        (champs battlemap)
//   tokenLibrary  { id, name, imageBlob, thumbBlob }
//   templates     { id, name, color, type, sizeCells, hpMax, hpShare, conditions, imageRef }
//   meta          { key, value }

const DB_NAME = 'mj-toolboox';
const DB_VERSION = 2;

let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('decks')) db.createObjectStore('decks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('scenes')) db.createObjectStore('scenes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('tokenLibrary')) db.createObjectStore('tokenLibrary', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode = 'readonly') {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(store) {
  return wrap((await tx(store)).getAll());
}

export async function get(store, id) {
  return wrap((await tx(store)).get(id));
}

export async function put(store, obj) {
  const os = await tx(store, 'readwrite');
  await wrap(os.put(obj));
  return obj;
}

export async function del(store, id) {
  const os = await tx(store, 'readwrite');
  return wrap(os.delete(id));
}

export async function clearStore(store) {
  const os = await tx(store, 'readwrite');
  return wrap(os.clear());
}

export async function clearAll() {
  await Promise.all(['decks', 'scenes', 'tokenLibrary', 'templates', 'meta'].map(clearStore));
}

// ---- meta ----
export async function getMeta(key, fallback = null) {
  const row = await get('meta', key);
  return row ? row.value : fallback;
}
export async function setMeta(key, value) {
  return put('meta', { key, value });
}

// ---- estimation du stockage ----
export async function storageEstimate() {
  if (navigator.storage?.estimate) {
    try { return await navigator.storage.estimate(); } catch { /* ignore */ }
  }
  return null;
}
