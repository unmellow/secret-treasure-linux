#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/public/game"
PORT="${PORT:-19996}"
URL="http://127.0.0.1:${PORT}/"

open_url() {
  if command -v xdg-open >/dev/null 2>&1; then
    (sleep 0.2; xdg-open "$URL") >/dev/null 2>&1 &
  fi
}

port_bound() {
  python3 -c "import socket;s=socket.socket();s.settimeout(0.35);r=s.connect_ex(('127.0.0.1',$PORT));s.close();raise SystemExit(0 if r==0 else 1)" 2>/dev/null
}

if port_bound; then
  echo "Secret Treasure already at $URL — opening browser"
  open_url
  exit 0
fi

open_url
echo "Secret Treasure at $URL  (Ctrl+C to stop)"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
