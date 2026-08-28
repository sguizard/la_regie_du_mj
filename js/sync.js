// La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
// ===== Synchro locale entre la fenêtre régie et la fenêtre joueurs =====
// Canal BroadcastChannel (même origine). La régie est la source de vérité.
//
// Messages régie -> joueurs :
//   { t:'present', sceneId }                 changer la scène affichée
//   { t:'grid',    sceneId, grid }           réglages de grille
//   { t:'tokens',  sceneId, tokens }         positions / propriétés des tokens
//   { t:'fogStroke', sceneId, seg, radius, mode }  segment de pinceau (temps réel)
//   { t:'fog',     sceneId, blob }           masque complet (autoritatif, au relâché)
//   { t:'clear' }                            base vidée
//
// Messages joueurs -> régie :
//   { t:'hello' }                            la vue joueurs vient de s'ouvrir
//
// Réponse régie : renvoi de present + grid + tokens + fog courants.

const CHANNEL = 'mj-toolboox-v1';

export class Bus {
  constructor() {
    this.ch = new BroadcastChannel(CHANNEL);
    this.handlers = new Map();
    this.ch.onmessage = (ev) => {
      const msg = ev.data;
      if (!msg || !msg.t) return;
      (this.handlers.get(msg.t) || []).forEach((fn) => fn(msg));
      (this.handlers.get('*') || []).forEach((fn) => fn(msg));
    };
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
    return this;
  }

  send(msg) {
    this.ch.postMessage(msg);
  }

  close() {
    this.ch.close();
  }
}
