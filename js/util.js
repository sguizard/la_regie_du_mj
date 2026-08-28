// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Petites fonctions utilitaires, sans dépendance =====

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/** Throttle « leading + trailing » : appelle fn au plus une fois par `wait` ms. */
export function throttle(fn, wait) {
  let last = 0, timer = null, lastArgs = null;
  return function (...args) {
    const now = performance.now();
    lastArgs = args;
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = performance.now();
        timer = null;
        fn.apply(this, lastArgs);
      }, remaining);
    }
  };
}

export function debounce(fn, wait) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Formate un nombre d'octets en Ko / Mo / Go. */
export function formatBytes(bytes) {
  if (!bytes) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

/** Charge un Blob image en ImageBitmap (décodage rapide, hors thread principal). */
export async function blobToBitmap(blob) {
  return createImageBitmap(blob);
}

/**
 * Génère une vignette JPEG (objet Blob) à partir d'un fichier/blob image.
 * @param {Blob} blob source
 * @param {number} maxSide plus grand côté de la vignette
 */
export async function makeThumbnail(blob, maxSide = 320) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
}

/** Dimensions natives d'une image Blob. */
export async function imageSize(blob) {
  const bmp = await createImageBitmap(blob);
  const size = { w: bmp.width, h: bmp.height };
  bmp.close?.();
  return size;
}

/** Confirmation simple (remplaçable plus tard par une modale maison). */
export function confirmAction(message) {
  return window.confirm(message);
}

/** Crée un élément avec attributs + enfants. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}
