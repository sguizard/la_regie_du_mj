#!/usr/bin/env bash
# La Régie du MJ — Copyright (C) 2026 Sébastien Guizard — GPL-3.0-or-later
# Sert « La Régie du MJ » sur http://localhost:8000 (cache navigateur désactivé).
set -e
cd "$(dirname "$0")"
PORT="${1:-8000}"
if command -v python3 >/dev/null 2>&1; then
  exec python3 serve.py "${PORT}"
elif command -v npx >/dev/null 2>&1; then
  echo "La Régie du MJ  ->  http://localhost:${PORT}"
  exec npx --yes serve -l "${PORT}" --no-clipboard -c 0 .
else
  echo "python3 (ou npx) est requis pour lancer le serveur." >&2
  exit 1
fi
