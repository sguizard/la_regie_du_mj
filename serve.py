#!/usr/bin/env python3
# La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
"""Serveur statique local pour « La Régie du MJ ».

Sert le dossier courant en désactivant le cache navigateur — indispensable pour
un outil qu'on édite : sinon le navigateur garde d'anciens modules JS et
l'application se retrouve dans un état incohérent (ex. la vue joueurs qui ne se
met plus à jour).
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


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
    print(f"La Régie du MJ  ->  http://localhost:{port}   (Ctrl+C pour arrêter)")
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
