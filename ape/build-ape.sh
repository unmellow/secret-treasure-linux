#!/usr/bin/env bash
# Pack Secret Treasure into a Cosmopolitan Actually Portable Executable
# (redbean). Always starts from a fresh redbean so old zip entries cannot
# shadow updated index.html / clicks.js.
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

ZIP=""
if command -v zip >/dev/null 2>&1; then
  ZIP="$(command -v zip)"
else
  echo "Fetching Cosmopolitan zip…"
  fetch "$ZIP_URL" "$STAGE/zip.com"
  chmod +x "$STAGE/zip.com"
  ZIP="$STAGE/zip.com"
fi

echo "Fetching redbean…"
fetch "$REDBEAN_URL" "$STAGE/redbean.com"
rm -f "$OUT"
cp "$STAGE/redbean.com" "$OUT"
chmod +x "$OUT"

python3 - "$GAME" "$STAGE/assets" <<'PY'
import gzip, pathlib, shutil, sys
src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
(dst / "Build").mkdir(parents=True)
for name in ("index.html", ".init.lua", "clicks.js", "fork.js"):
    shutil.copy2(src / name, dst / name)
shutil.copy2(src / "Build" / "UnityLoader.js", dst / "Build" / "UnityLoader.js")
shutil.copy2(src / "Build" / "build.json", dst / "Build" / "build.json")
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
  "$ZIP" -r -9 "$OUT" index.html .init.lua clicks.js fork.js Build
)
"$ZIP" -A "$OUT" >/dev/null 2>&1 || true
chmod +x "$OUT"

python3 - "$OUT" <<'PY'
import zipfile, sys
z = zipfile.ZipFile(sys.argv[1])
names = z.namelist()
need = ["index.html", "clicks.js", "fork.js", ".init.lua", "Build/build.json"]
missing = [n for n in need if n not in names]
if missing:
    raise SystemExit("APE zip missing: " + ", ".join(missing))
# First listing of index.html must be the one we just added (no stale copy).
print("APE zip entries:", len(names))
print("index.html count:", names.count("index.html"))
print("clicks.js count:", names.count("clicks.js"))
PY

echo "Built $OUT ($(wc -c < "$OUT") bytes)"

# Same polyglot bytes: dual-ship .com + .exe for Windows PE path (or tell
# users to rename .com -> .exe). ReactOS rename is unsupported / wontfix.
if [[ "$OUT" == *.com ]]; then
  EXE="${OUT%.com}.exe"
  cp -f "$OUT" "$EXE"
  chmod +x "$EXE"
  echo "Also wrote $EXE (identical bytes; Windows prefers .exe)"
fi

echo
echo "Linux:   ./ape/secret-treasure   # or: sh $OUT   # or: sh $OUT --assimilate"
echo "Windows: ./ape/secret-treasure.cmd  (prefers .exe, else .com)"
echo "         Ship both .exe and .com, or rename .com -> .exe"
echo "Listens on http://127.0.0.1:19996/ (reuses port if already up)"
