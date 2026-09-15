# Secret Treasure (portable)

Offline copy of **Secret Treasure** 0.8 (Relatedguy, Unity 2019.4 WebGL).

The playable artifact is a [Cosmopolitan](https://github.com/jart/cosmopolitan) **Actually Portable Executable** built with [redbean](https://redbean.dev/): one file that is both a zip archive and a native program for Linux, Windows, macOS, FreeBSD, OpenBSD, and NetBSD (AMD64 + ARM64).

## Download

Release asset: `secret-treasure.com` (~24 MB)

https://github.com/unmellow/secret-treasure-linux/releases

## Run

```bash
chmod +x secret-treasure.com
./secret-treasure.com
```

If the kernel will not exec APE binaries:

```bash
sh ./secret-treasure.com
```

Windows: rename to `secret-treasure.exe` and double-click.

It binds **http://127.0.0.1:19996/** and opens a browser. Needs a browser with WebGL (any current Chrome / Firefox / Edge). No WebKitGTK, no FUSE, no AppImage.

Stop with Ctrl+C.

## Rebuild the APE

```bash
# needs curl + python3; zip comes from the OS or Cosmopolitan
chmod +x ape/build-ape.sh
./ape/build-ape.sh
```

The script gunzips the Unity `.unityweb` payloads, then zip-deflates them into redbean so the browser sees `Content-Encoding: gzip` and Unity receives raw wasm/data.

## Tauri (optional, Linux-native window)

See `src-tauri/`. AppImage bundling is unreliable on Manjaro/Arch; the ELF `src-tauri/target/release/secret-treasure` is enough if you already have WebKitGTK. The APE path above is the portable one.

## Browser, no compile

```bash
chmod +x run-web.sh
./run-web.sh
```
