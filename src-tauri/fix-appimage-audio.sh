#!/usr/bin/env bash
# Patch an already-built AppImage so AppRun cannot point GStreamer at an
# empty bundled plugin dir. Prefer rebuilding so the ELF unsets these itself.
set -euo pipefail
cd "$(dirname "$0")"

AI="${1:-}"
if [[ -z "$AI" ]]; then
  AI="$(ls -1t target/release/bundle/appimage/*.AppImage 2>/dev/null | head -n1 || true)"
fi
if [[ -z "$AI" || ! -f "$AI" ]]; then
  echo "Usage: $0 /path/to/Secret-Treasure.AppImage" >&2
  exit 1
fi
AI="$(readlink -f "$AI")"
chmod +x "$AI"

WORK="$(mktemp -d)"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "Extracting $AI"
(
  cd "$WORK"
  export APPIMAGE_EXTRACT_AND_RUN=1
  "$AI" --appimage-extract >/dev/null
)

ROOT="$WORK/squashfs-root"
if [[ ! -f "$ROOT/AppRun" ]]; then
  echo "No AppRun inside AppImage" >&2
  exit 1
fi

# Insert immediately before every exec so it cannot run after the binary starts.
python3 - "$ROOT/AppRun" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
text = p.read_text(errors="replace")
snippet = """# host audio: do not use empty bundled GStreamer dir
unset GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0
unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0
unset GST_PLUGIN_SCANNER GST_PLUGIN_SCANNER_1_0
# Keep WebKitGTK sandbox on (do not export WEBKIT_DISABLE_SANDBOX*).
if [ -d /usr/lib/gstreamer-1.0 ]; then
  export GST_PLUGIN_SYSTEM_PATH_1_0=/usr/lib/gstreamer-1.0
elif [ -d /usr/lib64/gstreamer-1.0 ]; then
  export GST_PLUGIN_SYSTEM_PATH_1_0=/usr/lib64/gstreamer-1.0
fi
if [ -z "${PULSE_SERVER:-}" ] && [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "$XDG_RUNTIME_DIR/pulse/native" ]; then
  export PULSE_SERVER="unix:$XDG_RUNTIME_DIR/pulse/native"
fi
"""
if "host audio: do not use empty bundled GStreamer dir" not in text:
    import re
    text2, n = re.subn(r"^exec ", snippet + "exec ", text, count=1, flags=re.M)
    if n == 0:
        text2 = text.rstrip() + "\n" + snippet
    p.write_text(text2)
    print("patched AppRun exec")
else:
    print("AppRun already patched")
PY

# Neutralize GST exports in hooks
find "$ROOT" -type f \( -name 'AppRun*' -o -path '*/apprun-hooks/*' \) -print0 \
  | xargs -0 sed -i \
    -e 's/^export GST_PLUGIN_SYSTEM_PATH/# &/' \
    -e 's/^export GST_PLUGIN_PATH/# &/' \
    -e 's/^export GST_PLUGIN_SCANNER/# &/' \
    -e 's/^export GDK_BACKEND=x11/# &/' \
    2>/dev/null || true

find "$ROOT" -type f \( -name 'libpulse*' -o -name 'libpipewire*' -o -name 'libspa-0.2*' \) -delete 2>/dev/null || true

OUT="${AI%.AppImage}-audio.AppImage"
if [[ "$OUT" == "$AI" ]]; then OUT="${AI}.audio"; fi

TOOL=""
for c in appimagetool appimagetool-x86_64.AppImage; do
  if command -v "$c" >/dev/null 2>&1; then TOOL="$(command -v "$c")"; break; fi
done
if [[ -z "$TOOL" ]]; then
  CACHE="$HOME/.cache/secret-treasure"
  mkdir -p "$CACHE"
  TOOL="$CACHE/appimagetool-x86_64.AppImage"
  if [[ ! -x "$TOOL" ]]; then
    echo "Fetching appimagetool…"
    curl -fL --retry 3 -o "$TOOL" \
      https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage \
      || curl -fkL --retry 3 -o "$TOOL" \
      https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage
    chmod +x "$TOOL"
  fi
fi

echo "Repacking $OUT"
export APPIMAGE_EXTRACT_AND_RUN=1 ARCH="${ARCH:-x86_64}"
"$TOOL" "$ROOT" "$OUT"
chmod +x "$OUT"
echo "Patched AppImage: $OUT"
echo
echo "If that is still silent, skip AppImage and use the ELF:"
echo "  target/release/secret-treasure"
echo "Or run the extracted tree (no FUSE):"
echo "  APPIMAGE_EXTRACT_AND_RUN=1 $OUT"
