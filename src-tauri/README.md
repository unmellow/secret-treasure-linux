# Secret Treasure — Linux desktop (Tauri 2)

This folder is a [Tauri 2](https://github.com/tauri-apps/tauri) app that loads
the Unity WebGL build from `../public/game` in a native WebKit window.

## Run (Linux)

1. Install Rust: https://rustup.rs
2. Install system libs (Debian/Ubuntu):

   ```bash
   sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev patchelf
   cargo install tauri-cli --locked --version "^2"
   ```

3. From this directory:

   ```bash
   chmod +x build-linux.sh
   ./build-linux.sh
   ```

4. Launch the binary:

   ```bash
   ./target/release/secret-treasure
   ```

   Or install the `.deb` / run the `.AppImage` under `target/release/bundle/`.

Window is 996×700 (the game’s native 996×666 plus title bar). Resize to
letterbox. No Newgrounds login is required for play.
