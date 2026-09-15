#!/usr/bin/env bash
# Pack Secret Treasure into a Cosmopolitan Actually Portable Executable
# (redbean). One file runs on Linux, Windows, macOS, and BSD.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GAME="$ROOT/public/game"
OUT="${1:-$ROOT/ape/secret-treasure.com}"
STAGE="$(mktemp -d)"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

REDBEAN_URL="${REDBEAN_URL:-https://redbean.dev/redbean-3.0.0.com}"
ZIP_URL="${ZIP_URL:-https://cosmo.zip/pub/cosmos/bin/zip}"

fetch() {
  local url="$1" dest="$2"
  curl -fL --retry 3 -o "$dest" "$url" || curl -fkL --retry 3 -o "$dest" "$url"
}

if ! command -v zip >/dev/null 2>&1; then
  echo "Fetching Cosmopolitan zip…"
  fetch "$ZIP_URL" "$STAGE/zip.com"
  chmod +x "$STAGE/zip.com"
  ZIP="$STAGE/zip.com"
else
  ZIP="$(command -v zip)"
fi

echo "Fetching redbean…"
fetch "$REDBEAN_URL" "$STAGE/redbean.com"
cp "$STAGE/redbean.com" "$OUT"
chmod +x "$OUT"

python3 - "$GAME" "$STAGE/assets" <<'PY'
import gzip, pathlib, shutil, sys
src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
(dst / "Build").mkdir(parents=True)
shutil.copy2(src / "index.html", dst / "index.html")
shutil.copy2(src / ".init.lua", dst / ".init.lua")
shutil.copy2(src / "Build" / "UnityLoader.js", dst / "Build" / "UnityLoader.js")
shutil.copy2(src / "Build" / "build.json", dst / "Build" / "build.json")
# Gunzip Unity payloads so redbean can zip-deflate them and the browser
# will decode Content-Encoding: gzip into raw wasm/data (Unity identity path).
for name in (
    "build.data.unityweb",
    "build.wasm.code.unityweb",
    "build.wasm.framework.unityweb",
):
    raw = gzip.decompress((src / "Build" / name).read_bytes())
    (dst / "Build" / name).write_bytes(raw)
PY

(
  cd "$STAGE/assets"
  "$ZIP" -r -9 "$OUT" index.html .init.lua Build
)
"$ZIP" -A "$OUT" >/dev/null 2>&1 || true
chmod +x "$OUT"
echo "Built $OUT ($(wc -c < "$OUT") bytes)"
echo
echo "Linux / macOS / BSD:  chmod +x $OUT && ./$OUT"
echo "If exec fails:        sh $OUT"
echo "Windows:              rename to secret-treasure.exe and double-click"
echo "Listens on http://127.0.0.1:19996/ and opens a browser."
