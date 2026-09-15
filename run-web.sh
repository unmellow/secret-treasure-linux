#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/public/game"
PORT="${PORT:-8765}"
if command -v xdg-open >/dev/null; then
  (sleep 0.4; xdg-open "http://127.0.0.1:${PORT}/") >/dev/null 2>&1 &
fi
echo "Secret Treasure at http://127.0.0.1:${PORT}/  (Ctrl+C to stop)"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
