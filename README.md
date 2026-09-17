# Secret Treasure (portable)

Offline copy of **Secret Treasure** 0.8.5 (Relatedguy, Unity 2019.4 WebGL).

## Portable APE (Cosmopolitan / redbean)

Download **v0.8.5**: https://github.com/unmellow/secret-treasure-linux/releases/tag/v0.8.5

One Cosmopolitan APE + **per-OS launchers** (not Tauri-as-portability). Ship the same polyglot bytes as both `secret-treasure.com` and `secret-treasure.exe` (or rename `.com` → `.exe` on Windows).

### Platform matrix

| Platform | Result | Notes |
|----------|--------|-------|
| **Linux** | **PASS** | `./ape/secret-treasure`, or `sh ./secret-treasure.com`, or `sh ./secret-treasure.com --assimilate` then run the ELF. Do **not** exec the `.com` directly if Wine binfmt is registered. |
| **Windows** | **PASS** (intended) | Prefer `secret-treasure.exe` (rename or dual-ship). Use `ape/secret-treasure.cmd` — reuses port **19996** if already up, else starts the APE and opens the browser. Native PE path; smoke still pending from emulation. |
| **Wine** (on Linux) | **FAIL** | Cosmo sockets break (`Socket operation on non-socket`, empty page). Not native Windows. |
| **ReactOS** | **unsupported / wontfix** | Rename → `.exe` is **not** a support target. |
| Port **19996** | reuse | Second launch opens/points the browser at the existing server (APE `.init.lua`, Linux launcher, Windows `.cmd`, `run-web.sh`). |
| **Holesail** | **N/A** | Not used by this APE path. |

### Linux (Manjaro / Arch) — do not run the `.com` directly if Wine is installed

Wine registers a kernel binfmt for every `MZ` file. Cosmopolitan APE binaries start with `MZ`, so `./secret-treasure.com` is stolen by Wine. You then see:

- `fixme:ntdll:RtlGetCurrentProcessorNumberEx`
- `Socket operation on non-socket`
- Firefox `NS_ERROR_NET_EMPTY_RESPONSE` / empty page on `http://127.0.0.1:19996`

That Wine path is **not** native Windows — it is a broken Linux launch. Use the shell polyglot (or assimilate) below instead.

**Fix — start it through the shell polyglot:**

```bash
chmod +x secret-treasure secret-treasure.com
./secret-treasure
# or:
sh ./secret-treasure.com
```

One-time conversion to a real Linux ELF (Wine will then ignore it):

```bash
sh ./secret-treasure.com --assimilate
./secret-treasure.com
```

After `--assimilate` the file is Linux-only.

It binds **http://127.0.0.1:19996/** and opens a browser. Ctrl+C stops it.
If that port is **already** serving (a previous APE or `./run-web.sh`), a second launch does not fail the bind — it just opens/points the browser at the existing server.

### Windows

```text
secret-treasure.cmd
```

The `.cmd` launcher prefers an already-running `http://127.0.0.1:19996/`; otherwise it starts `secret-treasure.exe` if present, else `secret-treasure.com`, and the APE opens the browser. Packaging: ship **both** `.exe` and `.com` (identical bytes), or rename `.com` → `.exe`.

## Local web server (`run-web.sh`)

For a plain Python static server (no APE / no Tauri):

```bash
./run-web.sh
```

Defaults to **http://127.0.0.1:19996/** so it matches the APE bind port
(`public/game/.init.lua` / `ape/build-ape.sh`). Override if needed:

```bash
PORT=8765 ./run-web.sh
```

Same already-running behavior: if the port is bound, it opens the browser and exits.

## Tauri window (optional) + audio

WebKitGTK sandboxes the web process. That can **mute Unity WebAudio** (Pulse/PipeWire sockets blocked from the sandboxed renderer).

**Safe default:** leave the WebKit sandbox **on**. Prefer mute-with-sandbox over turning the sandbox off. This tree does **not** set `WEBKIT_DISABLE_SANDBOX` / `WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS` by default — do not re-enable sandbox-off as the shipped default.

The Linux binary still cleans AppImage GStreamer env pollution and points Pulse/PipeWire at the host runtime when present.

Rebuild:

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 gtk3 librsvg patchelf base-devel fuse2 \
  gst-plugins-base gst-plugins-good gst-libav gst-plugin-pipewire

cd src-tauri
./build-linux.sh
./target/release/secret-treasure
```

Click once in the game window so the audio context can resume.

AppImage on Manjaro is still the fragile path (linuxdeploy + RELR). Prefer the ELF or the APE.

> **Smoke note:** Tauri GUI changes here were **not GUI-verified on this host** — @Test Tan / Installer to smoke WebAudio with sandbox on.

## Rebuild the APE

```bash
chmod +x ape/build-ape.sh
./ape/build-ape.sh
```

Rebuild packs an updated `/.init.lua` (already-running port reuse) into `secret-treasure.com` and copies the same bytes to `secret-treasure.exe` for Windows dual-ship.

## License

Two different things ship in this tree:

- **Game assets** (`public/game/` — Unity WebGL build and related media): © Relatedguy. These are the original game contents, redistributed here for offline personal play. They are **not** open-sourced by this repo; follow the author’s / Newgrounds terms for the game itself.
- **Linux shell / packaging** (`src-tauri/`, `ape/` including per-OS launchers, `run-web.sh`, and small host helpers such as `clicks.js` / `fork.js`): the portable player, APE/redbean packaging, and local-server glue around those assets. Separate from the game assets above. Distro packaging should treat game content and shell as distinct license scopes (proprietary/game-author terms vs packaging/player code). `clicks.js` is needed for scaled-canvas input; `fork.js` is optional offline-unlock glue.
