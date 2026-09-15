# Secret Treasure (Linux)

Offline copy of **Secret Treasure** 0.8 (Relatedguy, Unity 2019.4 WebGL) in a [Tauri 2](https://github.com/tauri-apps/tauri) Linux desktop shell.

Original WebGL game: Newgrounds upload `1623136`. This repo is a local player — no Newgrounds session, medals, or login.

## Layout

```
public/game/     Unity WebGL payload (index.html + Build/)
src-tauri/       Tauri 2 app (loads public/game in WebKitGTK)
run-web.sh       Zero-compile fallback (Python static server)
```

Native resolution is **996 × 666**. The desktop window is 996 × 700 so the title bar fits; the player letterboxes on resize.

## 1. Native Linux app (Tauri)

Needs Rust, Tauri CLI 2, and WebKitGTK 4.1.

```bash
# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev patchelf
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install tauri-cli --locked --version "^2"

git clone https://github.com/unmellow/secret-treasure-linux.git
cd secret-treasure-linux/src-tauri
chmod +x build-linux.sh
./build-linux.sh
```

Run:

```bash
./target/release/secret-treasure
```

Packages land under `src-tauri/target/release/bundle/` (`.deb` and `.AppImage`).

Fedora: `webkit2gtk4.1-devel gtk3-devel librsvg2-devel patchelf`. Arch: `webkit2gtk-4.1 gtk3 librsvg patchelf`.

## 2. Browser, no compile

```bash
chmod +x run-web.sh
./run-web.sh
```

Serves `public/game` and opens it in the default browser. Do not open `index.html` as a `file://` URL — Unity WebGL needs HTTP.

## Notes

- `.unityweb` files are gzip payloads. Serve them as `application/octet-stream` with **no** extra `Content-Encoding` header (the Unity loader inflates them).
- WebGL 2 preferred, WebGL 1 fallback.
- Online Newgrounds API features will not work.
