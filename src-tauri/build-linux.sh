#!/usr/bin/env bash
# Build Secret Treasure as a native Linux app.
# AppImage bundling is fragile on Arch/Manjaro (linuxdeploy + FUSE + RELR).
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v cargo >/dev/null; then
  echo "Install Rust from https://rustup.rs then re-run."
  exit 1
fi

if ! command -v cargo-tauri >/dev/null && ! cargo tauri --version >/dev/null 2>&1; then
  cargo install tauri-cli --locked --version '^2'
fi

if ! pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
  echo "Missing webkit2gtk-4.1."
  echo "  Manjaro/Arch: sudo pacman -S --needed webkit2gtk-4.1 gtk3 librsvg patchelf base-devel fuse2"
  echo "  Debian/Ubuntu: sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev patchelf"
  exit 1
fi

# FUSE: linuxdeploy/appimagetool are themselves AppImages.
# RELR: linuxdeploy's ancient strip cannot parse Arch binutils output.
export APPIMAGE_EXTRACT_AND_RUN=1
export NO_STRIP=true
export ARCH="${ARCH:-x86_64}"

BUNDLE="${1:-appimage}"

if [[ "$BUNDLE" == "appimage" ]]; then
  echo "Building AppImage (NO_STRIP=1, APPIMAGE_EXTRACT_AND_RUN=1)…"
  if cargo tauri build --bundles appimage; then
    echo
    echo "AppImage:"
    ls -lh target/release/bundle/appimage/*.AppImage 2>/dev/null || true
    exit 0
  fi
  echo
  echo "AppImage bundling failed. That is common on Manjaro/Arch."
  echo "Building the native ELF instead — you can run that directly:"
fi

cargo tauri build --no-bundle
BIN="target/release/secret-treasure"
echo
echo "Native binary: $BIN"
ls -lh "$BIN"
echo
echo "Run:  $(pwd)/$BIN"
echo
echo "Retry AppImage after:"
echo "  sudo pacman -S --needed fuse2"
echo "  sudo chmod u+s \"\$(command -v fusermount)\""
echo "  ./build-linux.sh appimage"
