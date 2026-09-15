#!/usr/bin/env bash
# Build Secret Treasure as a native Linux app (deb + AppImage).
# Requires: Rust, Tauri CLI 2, and WebKitGTK 4.1 devel packages.
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
  echo "  Manjaro/Arch: sudo pacman -S --needed webkit2gtk-4.1 gtk3 librsvg patchelf base-devel"
  echo "  Debian/Ubuntu: sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev patchelf"
  exit 1
fi

cargo tauri build
echo
echo "Artifacts:"
echo "  target/release/secret-treasure"
echo "  target/release/bundle/deb/"
echo "  target/release/bundle/appimage/"
