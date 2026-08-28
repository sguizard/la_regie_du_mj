#!/usr/bin/env python3
# La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
"""Serveur statique local pour « La Régie du MJ ».

Sert le dossier de l'application en désactivant le cache navigateur — indispensable
pour un outil qu'on édite : sinon le navigateur garde d'anciens modules JS et
l'application se retrouve dans un état incohérent (ex. la vue joueurs qui ne se met
plus à jour).

Peut aussi être empaqueté en exécutable autonome (PyInstaller) : dans ce cas il sert
le dossier de l'exécutable et ouvre le navigateur automatiquement.
"""
import os
import sys
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

FROZEN = getattr(sys, "frozen", False)


def app_dir():
    """Dossier à servir : celui de l'exécutable si figé, sinon celui de ce script."""
    if FROZEN:
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # sortie plus discrète
        sys.stderr.write("  " + (fmt % args) + "\n")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(NoCacheHandler, directory=app_dir())
    httpd = ThreadingHTTPServer(("", port), handler)
    url = f"http://localhost:{port}"
    print(f"La Régie du MJ  ->  {url}   (Ctrl+C pour arrêter)")
    if FROZEN:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    httpd.serve_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except OSError as exc:
        print(f"\nImpossible de démarrer le serveur : {exc}")
        if FROZEN:
            input("Appuie sur Entrée pour quitter. ")
        sys.exit(1)
