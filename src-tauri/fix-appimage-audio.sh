#!/usr/bin/env bash
# AppImage-only audio fix.
# linuxdeploy's GTK hook exports GST_PLUGIN_SYSTEM_PATH_1_0 into an empty
# $APPDIR/usr/lib/gstreamer-1.0 (bundleMediaFramework is false). That hides
# the host GStreamer plugins, so WebKit WebAudio is silent. The ELF binary
# does not set that variable, which is why it has sound.
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

mkdir -p "$ROOT/apprun-hooks"
cat > "$ROOT/apprun-hooks/zzz-host-audio.sh" <<'HOOK'
# Prefer the machine's GStreamer / PipeWire. The bundled plugin dir is empty.
unset GST_PLUGIN_SYSTEM_PATH
unset GST_PLUGIN_SYSTEM_PATH_1_0
unset GST_PLUGIN_PATH
unset GST_PLUGIN_PATH_1_0
unset GST_PLUGIN_SCANNER
unset GST_PLUGIN_SCANNER_1_0
export WEBKIT_DISABLE_SANDBOX=1
export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1
if [ -z "${PULSE_SERVER:-}" ] && [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "$XDG_RUNTIME_DIR/pulse/native" ]; then
  export PULSE_SERVER="unix:$XDG_RUNTIME_DIR/pulse/native"
fi
HOOK

# GTK hook often sets GST_* and GDK_BACKEND=x11 — neutralize those lines.
if [[ -d "$ROOT/apprun-hooks" ]]; then
  sed -i \
    -e 's/^export GST_PLUGIN_SYSTEM_PATH/# &/' \
    -e 's/^export GST_PLUGIN_PATH/# &/' \
    -e 's/^export GST_PLUGIN_SCANNER/# &/' \
    -e 's/^export GDK_BACKEND=x11/# &/' \
    "$ROOT/apprun-hooks"/* 2>/dev/null || true
fi

# AppRun itself may export GST_*. Append our unset so it wins.
if ! grep -q 'zzz-host-audio' "$ROOT/AppRun"; then
  {
    echo
    echo '# host audio — sourced last'
    echo '. "$APPDIR/apprun-hooks/zzz-host-audio.sh"'
  } >> "$ROOT/AppRun"
fi

# Do not shadow host PipeWire with a bundled Pulse client.
find "$ROOT" -type f \( \
  -name 'libpulse*' -o -name 'libpipewire*' -o -name 'libspa-0.2*' \
  \) -delete 2>/dev/null || true

OUT="${AI%.AppImage}-audio.AppImage"
if [[ "$OUT" == "$AI" ]]; then
  OUT="${AI}.audio"
fi

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
echo "Run:  $OUT"
