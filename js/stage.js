// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Scène rendue : caméra pan/zoom + image + grille + tokens + brouillard =====
// Utilisée à l'identique par la régie ('gm') et la vue joueurs ('player').

import { FogMask } from './fog.js';
import { clamp } from './util.js';

const DEFAULT_CELL = 70; // px monde, si aucune grille définie

export function defaultGrid() {
  return {
    cellPx: DEFAULT_CELL, offsetX: 0, offsetY: 0, showToPlayers: false, snap: true,
    color: '#8fb3ff', opacity: 0.55, width: 1, subdiv: 1,
  };
}

/** '#rrggbb' + alpha -> 'rgba(r,g,b,a)'. */
export function hexToRgba(hex, alpha = 1) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m) return `rgba(143,179,255,${alpha})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

export class Stage {
  constructor(canvas, mode) {
    this.canvas = canvas;
    this.mode = mode;                 // 'gm' | 'player'
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.cam = { zoom: 1, x: 0, y: 0 }; // x,y : décalage écran en px CSS
    this.autoFit = mode === 'player';

    this.scene = null;
    this.image = null;
    this.imgW = 0;
    this.imgH = 0;
    this.tokens = [];
    this.tokenImages = new Map();
    this.fog = null;
    this.selectedTokenId = null;
    this.brushCursor = null;   // { x, y, r, mode } en px écran — aperçu du pinceau (régie)
    this.calibrateRect = null; // { x0, y0, x1, y1 } en coords monde — aperçu du calibrage

    this._dirty = true;
    this._veil = document.createElement('canvas');
    this._vctx = this._veil.getContext('2d');

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas);
    this.resize();

    const loop = () => {
      try {
        if (this._dirty) { this._dirty = false; this._render(); }
      } catch (err) {
        console.error('[Régie] erreur de rendu (la boucle continue)', err);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  invalidate() { this._dirty = true; }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, r.width);
    this.cssH = Math.max(1, r.height);
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
    this._veil.width = this.canvas.width;
    this._veil.height = this.canvas.height;
    if (this.autoFit) this.fit();
    this.invalidate();
  }

  // ---- caméra ----
  worldToScreen(p) {
    return { x: p.x * this.cam.zoom + this.cam.x, y: p.y * this.cam.zoom + this.cam.y };
  }
  screenToWorld(p) {
    return { x: (p.x - this.cam.x) / this.cam.zoom, y: (p.y - this.cam.y) / this.cam.zoom };
  }
  localPoint(ev) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  fit() {
    if (!this.image) return;
    const margin = this.mode === 'player' ? 1 : 0.96;
    const z = Math.min(this.cssW / this.imgW, this.cssH / this.imgH) * margin;
    this.cam.zoom = z;
    this.cam.x = (this.cssW - this.imgW * z) / 2;
    this.cam.y = (this.cssH - this.imgH * z) / 2;
    this.invalidate();
  }
  panBy(dx, dy) { this.cam.x += dx; this.cam.y += dy; this.invalidate(); }
  centerOn(w) {
    this.cam.x = this.cssW / 2 - w.x * this.cam.zoom;
    this.cam.y = this.cssH / 2 - w.y * this.cam.zoom;
    this.invalidate();
  }
  zoomAt(factor, screenPt) {
    const w = this.screenToWorld(screenPt);
    this.cam.zoom = clamp(this.cam.zoom * factor, 0.04, 24);
    this.cam.x = screenPt.x - w.x * this.cam.zoom;
    this.cam.y = screenPt.y - w.y * this.cam.zoom;
    this.invalidate();
  }

  // ---- scène ----
  setScene(scene, image, { fit = false } = {}) {
    this.scene = scene ? { ...scene } : null;
    this.image = image || null;
    this.imgW = image ? image.width : 0;
    this.imgH = image ? image.height : 0;
    this.tokens = scene?.tokens ? structuredClone(scene.tokens) : [];
    this.selectedTokenId = null;
    this.calibrateRect = null;
    if (scene && this.imgW) {
      if (!this.scene.grid) this.scene.grid = defaultGrid();
      this.fog = new FogMask(this.imgW, this.imgH);
    } else {
      this.fog = null;
    }
    if (fit || this.autoFit) this.fit();
    this.invalidate();
  }

  setTokenImages(map) { this.tokenImages = map || new Map(); this.invalidate(); }
  setGrid(grid) { if (this.scene) { this.scene.grid = grid; this.invalidate(); } }
  setTokens(tokens) { this.tokens = structuredClone(tokens || []); this.invalidate(); }

  tokenRadiusWorld(t) {
    const cell = this.scene?.grid?.cellPx || DEFAULT_CELL;
    return (t.sizeCells || 1) * cell / 2;
  }
  tokenAt(screenPt) {
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const t = this.tokens[i];
      const c = this.worldToScreen(t.pos);
      const r = this.tokenRadiusWorld(t) * this.cam.zoom;
      if (Math.hypot(screenPt.x - c.x, screenPt.y - c.y) <= r) return t;
    }
    return null;
  }
  snapWorld(p) {
    const g = this.scene?.grid;
    if (!g?.snap || !g.cellPx) return p;
    // si une sous-grille est active, on aimante sur ses cases (plus fines)
    const cell = g.cellPx / Math.max(1, Math.round(g.subdiv || 1));
    const k = (v, off) => off + (Math.floor((v - off) / cell) + 0.5) * cell;
    return { x: k(p.x, g.offsetX), y: k(p.y, g.offsetY) };
  }

  // ---- rendu ----
  _render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    this._drawAmbiance(ctx);
    if (!this.image) return;

    const o = this.worldToScreen({ x: 0, y: 0 });
    const sw = this.imgW * this.cam.zoom;
    const sh = this.imgH * this.cam.zoom;

    ctx.drawImage(this.image, o.x, o.y, sw, sh);
    this._drawGrid(ctx);
    this._drawTokens(ctx);
    if (this.fog) this._drawFog(ctx);
    if (this.mode === 'gm' && this.brushCursor) this._drawBrushCursor(ctx);
    if (this.mode === 'gm' && this.calibrateRect) this._drawCalibrateRect(ctx);
  }

  _drawBrushCursor(ctx) {
    const b = this.brushCursor;
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.mode === 'hide' ? 'rgba(200,60,50,.14)' : 'rgba(120,205,140,.14)';
    ctx.fill();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = b.mode === 'hide' ? 'rgba(255,150,140,.95)' : 'rgba(185,240,195,.95)';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fill();
    ctx.restore();
  }

  /** @param {?{x:number,y:number}} screenPt  null pour masquer l'aperçu */
  setBrushCursor(screenPt, diameterPx, mode) {
    this.brushCursor = screenPt ? { x: screenPt.x, y: screenPt.y, r: diameterPx / 2, mode } : null;
    this.invalidate();
  }

  /** @param {?{x0:number,y0:number,x1:number,y1:number}} worldRect  null pour masquer */
  setCalibrateRect(worldRect) {
    this.calibrateRect = worldRect;
    this.invalidate();
  }

  _drawCalibrateRect(ctx) {
    const cr = this.calibrateRect;
    const a = this.worldToScreen({ x: cr.x0, y: cr.y0 });
    const b = this.worldToScreen({ x: cr.x1, y: cr.y1 });
    const cell = Math.round(Math.max(Math.abs(cr.x1 - cr.x0), Math.abs(cr.y1 - cr.y0)));
    const side = cell * this.cam.zoom;
    const sx = Math.sign(b.x - a.x) || 1;
    const sy = Math.sign(b.y - a.y) || 1;

    ctx.save();
    // carré résultant (taille de case déduite) — halo sombre + trait clair
    ctx.fillStyle = 'rgba(120,170,255,.20)';
    ctx.fillRect(a.x, a.y, side * sx, side * sy);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.strokeRect(a.x, a.y, side * sx, side * sy);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#cfe0ff';
    ctx.strokeRect(a.x, a.y, side * sx, side * sy);

    // trait de la diagonale tracée
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // étiquette
    const label = `${cell} px`;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lx = a.x + (side * sx) / 2;
    const ly = a.y + (side * sy) / 2;
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = 'rgba(20,22,30,.9)';
    ctx.fillRect(lx - w / 2, ly - 11, w, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, lx, ly);
    ctx.restore();
  }

  _drawAmbiance(ctx) {
    const g = ctx.createRadialGradient(
      this.cssW / 2, this.cssH * 0.4, 0,
      this.cssW / 2, this.cssH * 0.4, Math.max(this.cssW, this.cssH) * 0.8);
    if (this.mode === 'player') { g.addColorStop(0, '#0c0d12'); g.addColorStop(1, '#000'); }
    else { g.addColorStop(0, '#1a1d25'); g.addColorStop(1, '#0b0c10'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
  }

  _drawGrid(ctx) {
    const gr = this.scene.grid;
    if (!gr || !gr.cellPx) return;
    if (this.mode === 'player' && !gr.showToPlayers) return;
    const step = gr.cellPx * this.cam.zoom;
    if (step < 6) return;

    const o = this.worldToScreen({ x: 0, y: 0 });
    const right = o.x + this.imgW * this.cam.zoom;
    const bottom = o.y + this.imgH * this.cam.zoom;
    const opacity = clamp(gr.opacity == null ? 0.55 : gr.opacity, 0, 1);
    const width = clamp(gr.width || 1, 0.5, 6);
    const color = gr.color || '#8fb3ff';

    ctx.save();
    ctx.beginPath();
    ctx.rect(o.x, o.y, this.imgW * this.cam.zoom, this.imgH * this.cam.zoom);
    ctx.clip();

    // sous-grille (subdivisions) — trait plus fin et plus discret, sous la grille principale
    const sub = Math.round(gr.subdiv || 1);
    if (sub > 1 && step / sub >= 4) {
      this._gridPath(ctx, gr.cellPx / sub, o, right, bottom, sub);
      ctx.strokeStyle = hexToRgba(color, opacity * 0.4);
      ctx.lineWidth = Math.max(0.5, width * 0.55);
      ctx.stroke();
    }

    // grille principale
    this._gridPath(ctx, gr.cellPx, o, right, bottom, 1);
    ctx.strokeStyle = hexToRgba(color, opacity);
    ctx.lineWidth = width;
    ctx.stroke();

    ctx.restore();
  }

  /** Ajoute au path courant les lignes verticales + horizontales espacées de `cell`.
   *  `skipEvery > 1` saute les lignes multiples (déjà tracées par la grille au-dessus). */
  _gridPath(ctx, cell, o, right, bottom, skipEvery) {
    const gr = this.scene.grid;
    ctx.beginPath();
    const nx0 = Math.ceil((0 - gr.offsetX) / cell);
    const nx1 = Math.floor((this.imgW - gr.offsetX) / cell);
    for (let n = nx0; n <= nx1; n++) {
      if (skipEvery > 1 && n % skipEvery === 0) continue;
      const x = this.worldToScreen({ x: gr.offsetX + n * cell, y: 0 }).x + .5;
      ctx.moveTo(x, o.y); ctx.lineTo(x, bottom);
    }
    const ny0 = Math.ceil((0 - gr.offsetY) / cell);
    const ny1 = Math.floor((this.imgH - gr.offsetY) / cell);
    for (let n = ny0; n <= ny1; n++) {
      if (skipEvery > 1 && n % skipEvery === 0) continue;
      const y = this.worldToScreen({ x: 0, y: gr.offsetY + n * cell }).y + .5;
      ctx.moveTo(o.x, y); ctx.lineTo(right, y);
    }
  }

  _drawTokens(ctx) {
    for (const t of this.tokens) {
      if (this.mode === 'player' && !t.visibleToPlayers) continue;
      const c = this.worldToScreen(t.pos);
      const r = this.tokenRadiusWorld(t) * this.cam.zoom;
      if (r < 1) continue;
      const img = t.imageRef && this.tokenImages.get(t.imageRef);

      ctx.save();
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      if (img) {
        ctx.save();
        ctx.clip();
        const ar = img.width / img.height;
        let dw = 2 * r, dh = 2 * r;
        if (ar > 1) dw = dh * ar; else dh = dw / ar;
        ctx.drawImage(img, c.x - dw / 2, c.y - dh / 2, dw, dh);
        ctx.restore();
      } else {
        ctx.fillStyle = t.color || '#c0392b';
        ctx.fill();
      }
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.strokeStyle = t.color || '#c0392b';
      ctx.stroke();

      if (t.label) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,.65)';
        ctx.fillStyle = '#fff';
        if (img) {
          const fs = Math.max(9, r * 0.42);
          ctx.font = `600 ${fs}px system-ui, sans-serif`;
          const ly = c.y + r + fs * 0.9;
          ctx.lineWidth = Math.max(2, fs * 0.28);
          ctx.strokeText(t.label, c.x, ly);
          ctx.fillText(t.label, c.x, ly);
        } else {
          const fs = Math.max(9, r * 0.72);
          ctx.font = `700 ${fs}px system-ui, sans-serif`;
          ctx.lineWidth = Math.max(2, fs * 0.22);
          ctx.strokeText(t.label, c.x, c.y);
          ctx.fillText(t.label, c.x, c.y);
        }
      }

      const downed = t.hpMax > 0 && (t.hp ?? t.hpMax) <= 0;
      if (downed) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = 'rgba(38,40,46,.62)';
        ctx.fillRect(c.x - r, c.y - r, 2 * r, 2 * r);
        ctx.restore();
        ctx.strokeStyle = 'rgba(222,60,50,.95)';
        ctx.lineWidth = Math.max(2.5, r * 0.14);
        ctx.lineCap = 'round';
        const d = r * 0.7;
        ctx.beginPath();
        ctx.moveTo(c.x - d, c.y - d); ctx.lineTo(c.x + d, c.y + d);
        ctx.moveTo(c.x + d, c.y - d); ctx.lineTo(c.x - d, c.y + d);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }

      this._drawTokenHp(ctx, t, c, r);

      if (this.mode === 'gm' && !t.visibleToPlayers) {
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (this.mode === 'gm' && t.id === this.selectedTokenId) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#c9a23c';
        ctx.beginPath();
        ctx.arc(c.x, c.y, r + 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** 'none' | 'bar' | 'full' selon le mode et le réglage `hpShare` du token. */
  _tokenHpVisibility(t) {
    if (!(t.hpMax > 0)) return 'none';
    if (this.mode === 'gm') return 'full';
    const share = t.hpShare || 'off';
    return share === 'full' ? 'full' : (share === 'bar' ? 'bar' : 'none');
  }

  _drawTokenHp(ctx, t, c, r) {
    const vis = this._tokenHpVisibility(t);
    if (vis === 'none') return;
    const hp = Math.max(0, t.hp ?? t.hpMax);
    const ratio = clamp(hp / t.hpMax, 0, 1);
    const bw = Math.max(24, r * 1.9);
    const bh = clamp(r * 0.22, 4, 9);
    const bx = c.x - bw / 2;
    const by = c.y - r - bh - 5;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    ctx.fillRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
    ctx.fillStyle = ratio > 0.5 ? '#3a9d54' : (ratio > 0.25 ? '#c8922e' : '#c0392b');
    ctx.fillRect(bx, by, bw * ratio, bh);
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    if (vis === 'full') {
      const fs = clamp(r * 0.42, 9, 15);
      ctx.font = `700 ${fs}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = Math.max(2, fs * 0.32);
      ctx.strokeStyle = 'rgba(0,0,0,.8)';
      ctx.fillStyle = '#fff';
      const txt = `${hp}/${t.hpMax}`;
      ctx.strokeText(txt, c.x, by - 2);
      ctx.fillText(txt, c.x, by - 2);
    }
    ctx.restore();
  }

  _drawFog(ctx) {
    const v = this._veil, vc = this._vctx;
    vc.setTransform(1, 0, 0, 1, 0, 0);
    vc.clearRect(0, 0, v.width, v.height);
    vc.fillStyle = this.mode === 'player' ? '#000' : 'rgba(8,10,16,0.62)';
    vc.fillRect(0, 0, v.width, v.height);
    vc.globalCompositeOperation = 'destination-out';
    const o = this.worldToScreen({ x: 0, y: 0 });
    vc.drawImage(
      this.fog.canvas, 0, 0, this.fog.w, this.fog.h,
      o.x * this.dpr, o.y * this.dpr,
      this.imgW * this.cam.zoom * this.dpr, this.imgH * this.cam.zoom * this.dpr);
    vc.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(v, 0, 0);
    ctx.restore();
  }
}
