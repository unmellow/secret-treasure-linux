# Secret Treasure (portable)

Offline copy of **Secret Treasure** 0.8 (Relatedguy, Unity 2019.4 WebGL).

## Portable APE (Cosmopolitan / redbean)

Download **v0.8.2**: https://github.com/unmellow/secret-treasure-linux/releases/tag/v0.8.2

### Linux (Manjaro / Arch) — do not run the `.com` directly if Wine is installed

Wine registers a kernel binfmt for every `MZ` file. Cosmopolitan APE binaries start with `MZ`, so `./secret-treasure.com` is stolen by Wine. You then see:

- `fixme:ntdll:RtlGetCurrentProcessorNumberEx`
- `Socket operation on non-socket`
- Firefox `NS_ERROR_NET_EMPTY_RESPONSE` / empty page on `http://127.0.0.1:19996`

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

Windows: rename `secret-treasure.com` to `secret-treasure.exe`.

## Tauri window (optional) + audio

WebKitGTK sandboxes the web process and that **mutes Unity WebAudio** (Pulse/PipeWire sockets are blocked). The binary now sets:

```
WEBKIT_DISABLE_SANDBOX=1
WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1
```

Rebuild:

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 gtk3 librsvg patchelf base-devel fuse2 \
  gst-plugins-base gst-plugins-good gst-libav gst-plugin-pipewire

cd src-tauri
./build-linux.sh
WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 ./target/release/secret-treasure
```

Click once in the game window so the audio context can resume.

AppImage on Manjaro is still the fragile path (linuxdeploy + RELR). Prefer the ELF or the APE.

## Rebuild the APE

```bash
chmod +x ape/build-ape.sh
./ape/build-ape.sh
```
