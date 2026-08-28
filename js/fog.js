// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Masque de brouillard de guerre =====
// Le masque est un canvas hors-écran, résolution plafonnée.
// Zones OPAQUES (peintes en blanc) = révélées.
// Zones TRANSPARENTES = cachées.

const MAX_SIDE = 2048;

export class FogMask {
  /** @param {number} imgW @param {number} imgH dimensions natives de la battlemap */
  constructor(imgW, imgH) {
    this.imgW = imgW;
    this.imgH = imgH;
    const scale = Math.min(1, MAX_SIDE / Math.max(imgW, imgH));
    this.w = Math.max(1, Math.round(imgW * scale));
    this.h = Math.max(1, Math.round(imgH * scale));
    this.scale = this.w / imgW; // monde -> masque
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    // état initial : tout caché (canvas transparent)
  }

  /** Peint un segment de pinceau en coordonnées MONDE. mode: 'reveal' | 'hide'. */
  strokeSeg(fromWorld, toWorld, worldRadius, mode) {
    const c = this.ctx;
    const s = this.scale;
    c.globalCompositeOperation = mode === 'hide' ? 'destination-out' : 'source-over';
    c.strokeStyle = '#fff';
    c.fillStyle = '#fff';
    c.lineWidth = Math.max(1, worldRadius * 2 * s);
    c.beginPath();
    c.moveTo(fromWorld.x * s, fromWorld.y * s);
    c.lineTo(toWorld.x * s, toWorld.y * s);
    c.stroke();
    // pastille aux extrémités pour un clic simple
    c.beginPath();
    c.arc(toWorld.x * s, toWorld.y * s, Math.max(0.5, worldRadius * s), 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
  }

  revealAll() {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  hideAll() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  toBlob() {
    return new Promise((res) => this.canvas.toBlob(res, 'image/png'));
  }

  async loadBlob(blob) {
    this.hideAll();
    if (!blob) return;
    const bmp = await createImageBitmap(blob);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(bmp, 0, 0, this.w, this.h);
    bmp.close?.();
  }
}
