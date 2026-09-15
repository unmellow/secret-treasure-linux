# Secret Treasure (Linux)

Offline copy of **Secret Treasure** 0.8 (Relatedguy, Unity 2019.4 WebGL) in a [Tauri 2](https://github.com/tauri-apps/tauri) Linux desktop shell.

Repo: https://github.com/unmellow/secret-treasure-linux

## Layout

```
public/game/     Unity WebGL payload
src-tauri/       Tauri 2 app
run-web.sh       Zero-compile fallback
```

Native resolution is **996 × 666**. Window is 996 × 700.

## Manjaro — recommended path

On Manjaro/Arch, **AppImage bundling often fails**. That is a linuxdeploy bug (old `strip` vs RELR relocations, and/or FUSE). The native binary still runs.

```bash
sudo pacman -Syu --needed \
  webkit2gtk-4.1 gtk3 librsvg patchelf \
  base-devel curl wget file openssl \
  appmenu-gtk-module libappindicator-gtk3 xdg-utils fuse2

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
cargo install tauri-cli --locked --version "^2"

git clone https://github.com/unmellow/secret-treasure-linux.git
cd secret-treasure-linux
git pull
cd src-tauri
chmod +x build-linux.sh
./build-linux.sh
```

If AppImage fails, the script falls back to:

```
src-tauri/target/release/secret-treasure
```

Run that file. You do not need an AppImage to play on your own machine.

### Retry AppImage (optional)

```bash
sudo pacman -S --needed fuse2
sudo chmod u+s "$(command -v fusermount)"
cd src-tauri
export APPIMAGE_EXTRACT_AND_RUN=1 NO_STRIP=true
./build-linux.sh appimage
```

Typical bundler errors and what they mean:

| Message | Fix |
|---|---|
| `failed to run linuxdeploy` + `unknown type [0x13]` / `.relr.dyn` | `NO_STRIP=true` (already in `build-linux.sh`) and `strip = false` in `Cargo.toml` |
| `AppImages require FUSE` / `libfuse.so.2` | `sudo pacman -S fuse2` (not the `fuse` package) |
| `fusermount: Operation not permitted` | `sudo chmod u+s "$(command -v fusermount)"` |
| `could not find system library webkit2gtk-4.1` | install **`webkit2gtk-4.1`**, not `webkit2gtk` |

An AppImage built on Manjaro is also a poor portable artifact (newer glibc). For playing locally, use the ELF.

## Browser, no compile

```bash
chmod +x run-web.sh
./run-web.sh
```

Do not open `index.html` as `file://`.

## Notes

- `.unityweb` files are gzip payloads. Serve as `application/octet-stream` with no extra `Content-Encoding`.
- Newgrounds medals/login will not work offline.
