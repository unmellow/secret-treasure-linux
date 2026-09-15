/* Secret Treasure offline fork — local unlocks + PlayerPrefs persistence.
 * Relatedguy's Unity 2019 WebGL build stores progress in PlayerPrefs (IDBFS /
 * IndexedDB / localStorage). This file flushes that to disk and keeps a
 * readable unlock ledger in localStorage so reloads keep your achievements.
 */
(function () {
  var STORE = "st-fork-unlocks-v1";
  var BACKUP = "st-fork-idbfs-v1";
  var PREFS_BACKUP = "st-fork-playerprefs-v1";

  var CATALOG = [
    { id: "ovary1", title: "Ovary 1", hint: "Unlock the first ovary", match: /ovary\s*1|activateOvary1|UnlockOvary/i },
    { id: "ovary2", title: "Ovary 2", hint: "Unlock the second ovary", match: /ovary\s*2|activateOvary2/i },
    { id: "slap", title: "Slap", hint: "Slap controls unlocked", match: /EnableSlap|SlapA|^slaps$/i },
    { id: "eat", title: "Eat", hint: "Eat action unlocked", match: /EatAss/i },
    { id: "impreg", title: "Impreg", hint: "Impreg scene unlocked", match: /ShowImpreg|impreg/i },
    { id: "treasure", title: "Treasure", hint: "Opened the treasure", match: /Treasure/i },
    { id: "stage2", title: "Stage 2", hint: "Reached stage 2", match: /^stage$/i, min: 2 },
    { id: "stage3", title: "Stage 3", hint: "Reached stage 3", match: /^stage$/i, min: 3 },
    { id: "wet", title: "Wet", hint: "Wetness controls unlocked", match: /WetA|wetness|Wetcontrol/i }
  ];

  function loadLedger() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || '{"unlocked":{},"prefs":{}}');
    } catch (e) {
      return { unlocked: {}, prefs: {} };
    }
  }
  function saveLedger(data) {
    localStorage.setItem(STORE, JSON.stringify(data));
  }

  var ledger = loadLedger();

  function toast(title) {
    var el = document.getElementById("st-toast");
    if (!el) return;
    el.textContent = "Unlocked · " + title;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.classList.remove("show");
    }, 2800);
  }

  function unlock(id, title, meta) {
    if (ledger.unlocked[id]) return false;
    ledger.unlocked[id] = {
      title: title,
      at: Date.now(),
      meta: meta || null
    };
    saveLedger(ledger);
    renderList();
    toast(title);
    return true;
  }

  function considerPref(key, value) {
    ledger.prefs[key] = value;
    CATALOG.forEach(function (item) {
      if (!item.match.test(key)) return;
      var num = Number(value);
      if (item.min && !(num >= item.min)) return;
      if (value === "0" || value === 0 || value === "false") return;
      unlock(item.id, item.title, key + "=" + value);
    });
    if (/unlock/i.test(key) && value && value !== "0") {
      unlock("pref-" + key.toLowerCase(), key, String(value));
    }
  }

  function parsePlayerPrefsText(text) {
    if (!text) return;
    // Unity WebGL often dumps "key value" lines or JSON-ish blobs.
    String(text)
      .split(/[\n\r]+/)
      .forEach(function (line) {
        var m = line.match(/^\s*([^:=]+)[:=]\s*(.+)\s*$/);
        if (m) considerPref(m[1].trim(), m[2].trim());
      });
    try {
      var obj = JSON.parse(text);
      if (obj && typeof obj === "object") {
        Object.keys(obj).forEach(function (k) {
          considerPref(k, obj[k]);
        });
      }
    } catch (e) {}
  }

  function walkFS(path, depth, out) {
    if (!window.FS || depth > 5) return;
    var names;
    try {
      names = FS.readdir(path);
    } catch (e) {
      return;
    }
    names.forEach(function (name) {
      if (name === "." || name === "..") return;
      var p = path + (path.endsWith("/") ? "" : "/") + name;
      var st;
      try {
        st = FS.stat(p);
      } catch (e) {
        return;
      }
      if (FS.isDir(st.mode)) walkFS(p, depth + 1, out);
      else out.push(p);
    });
  }

  function snapshotFS() {
    if (!window.FS) return null;
    var files = [];
    ["/", "/idbfs", "/home", "/tmp"].forEach(function (root) {
      walkFS(root, 0, files);
    });
    var blob = {};
    files.forEach(function (p) {
      if (!/pref|save|unlock|idbfs|unity/i.test(p)) return;
      try {
        var data = FS.readFile(p, { encoding: "binary" });
        var u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
        if (u8.byteLength > 2 * 1024 * 1024) return;
        var s = "";
        for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
        blob[p] = btoa(s);
        var text = s.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "\n");
        parsePlayerPrefsText(text);
      } catch (e) {}
    });
    try {
      localStorage.setItem(BACKUP, JSON.stringify({ t: Date.now(), files: blob }));
    } catch (e) {}
    return blob;
  }

  function restoreFS() {
    if (!window.FS) return;
    var raw;
    try {
      raw = JSON.parse(localStorage.getItem(BACKUP) || "null");
    } catch (e) {
      return;
    }
    if (!raw || !raw.files) return;
    Object.keys(raw.files).forEach(function (p) {
      try {
        var bin = atob(raw.files[p]);
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        var dir = p.replace(/\/[^/]+$/, "");
        try {
          FS.mkdirTree(dir);
        } catch (e) {}
        FS.writeFile(p, u8, { canOwn: true });
      } catch (e) {}
    });
  }

  function flushIDBFS() {
    if (!window.FS || !FS.syncfs) return;
    try {
      FS.syncfs(false, function () {});
    } catch (e) {}
    snapshotFS();
  }

  function loadIDBFS(cb) {
    if (!window.FS || !FS.syncfs) {
      if (cb) cb();
      return;
    }
    try {
      FS.syncfs(true, function () {
        restoreFS();
        snapshotFS();
        if (cb) cb();
      });
    } catch (e) {
      if (cb) cb();
    }
  }

  function hookStorage() {
    try {
      var origSet = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function (k, v) {
        try {
          if (/playerpref|unity|idbfs|prefs/i.test(String(k))) {
            origSet(PREFS_BACKUP, JSON.stringify({ k: k, v: v, t: Date.now() }));
            parsePlayerPrefsText(String(v));
            considerPref(String(k), v);
          }
        } catch (e) {}
        return origSet(k, v);
      };
    } catch (e) {}

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) flushIDBFS();
    });
    window.addEventListener("beforeunload", flushIDBFS);
    window.addEventListener("pagehide", flushIDBFS);
    setInterval(flushIDBFS, 4000);
  }

  function renderList() {
    var list = document.getElementById("st-unlock-list");
    if (!list) return;
    var ids = Object.keys(ledger.unlocked);
    if (!ids.length) {
      list.innerHTML = '<p class="st-empty">Nothing saved yet. Play — unlocks stick around after you close the window.</p>';
      return;
    }
    list.innerHTML = ids
      .sort(function (a, b) {
        return ledger.unlocked[b].at - ledger.unlocked[a].at;
      })
      .map(function (id) {
        var u = ledger.unlocked[id];
        var when = new Date(u.at).toLocaleString();
        return (
          '<li><span class="st-mark"></span><span><b>' +
          escapeHtml(u.title) +
          "</b><small>" +
          escapeHtml(when) +
          "</small></span></li>"
        );
      })
      .join("");
    var count = document.getElementById("st-count");
    if (count) count.textContent = String(ids.length);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      if (c === "&") return "\u0026amp;";
      if (c === "<") return "\u0026lt;";
      if (c === ">") return "\u0026gt;";
      if (c === '"') return "\u0026quot;";
      return "\u0026#39;";
    });
  }

  function exportSave() {
    var payload = {
      version: 1,
      game: "Secret Treasure",
      fork: "offline",
      exportedAt: new Date().toISOString(),
      ledger: ledger,
      backup: localStorage.getItem(BACKUP),
      prefs: localStorage.getItem(PREFS_BACKUP)
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "secret-treasure-save.json";
    a.click();
  }

  function importSave(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (data.ledger) {
          ledger = data.ledger;
          saveLedger(ledger);
        }
        if (data.backup) localStorage.setItem(BACKUP, data.backup);
        if (data.prefs) localStorage.setItem(PREFS_BACKUP, data.prefs);
        restoreFS();
        flushIDBFS();
        renderList();
      } catch (e) {
        alert("Could not read that save file.");
      }
    };
    reader.readAsText(file);
  }

  function mountUI() {
    var css = document.createElement("style");
    css.textContent = [
      "#st-fork-ui{position:fixed;inset:auto 12px 12px auto;z-index:99999;font-family:Georgia,serif;color:#e8dcc8}",
      "#st-fork-btn,#st-panel button{font:600 13px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;background:#1c1612;color:#e8dcc8;border:1px solid #3a322c;border-radius:10px;padding:10px 12px;cursor:pointer}",
      "#st-fork-btn{display:flex;align-items:center;gap:8px;box-shadow:0 10px 30px rgba(0,0,0,.35)}",
      "#st-fork-btn b{font:600 12px/1 system-ui,sans-serif;background:#3a322c;border-radius:999px;padding:3px 7px}",
      "#st-panel{position:fixed;right:12px;bottom:56px;width:min(320px,calc(100vw - 24px));background:#1c1612;border:1px solid #3a322c;border-radius:14px;padding:14px;display:none;box-shadow:0 18px 50px rgba(0,0,0,.45)}",
      "#st-panel.open{display:block}",
      "#st-panel h2{margin:0 0 8px;font:600 16px/1.2 Georgia,serif}",
      "#st-panel p,#st-panel small{color:#9a8b78}",
      "#st-unlock-list{list-style:none;margin:10px 0;padding:0;max-height:240px;overflow:auto}",
      "#st-unlock-list li{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #3a322c}",
      "#st-unlock-list b{display:block;font:600 13px/1.3 Georgia,serif}",
      "#st-unlock-list small{display:block;margin-top:2px;font:12px/1.3 system-ui,sans-serif}",
      ".st-mark{width:8px;height:8px;margin-top:6px;border-radius:50%;background:#c4a574;flex:none}",
      ".st-empty{margin:8px 0;font:13px/1.4 Georgia,serif}",
      ".st-row{display:flex;gap:8px;flex-wrap:wrap}",
      "#st-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(12px);opacity:0;pointer-events:none;background:#1c1612;border:1px solid #c4a574;color:#e8dcc8;padding:10px 14px;border-radius:10px;transition:opacity .2s,transform .2s;z-index:100000;font:600 13px/1 Georgia,serif}",
      "#st-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}"
    ].join("");
    document.head.appendChild(css);

    var wrap = document.createElement("div");
    wrap.id = "st-fork-ui";
    wrap.innerHTML =
      '<button type="button" id="st-fork-btn" aria-expanded="false">Unlocks <b id="st-count">0</b></button>' +
      '<div id="st-panel" role="dialog" aria-label="Saved unlocks">' +
      "<h2>Offline unlocks</h2>" +
      "<p>Saved on this machine. Newgrounds medals are not used.</p>" +
      '<ul id="st-unlock-list"></ul>' +
      '<div class="st-row">' +
      '<button type="button" id="st-export">Export save</button>' +
      '<button type="button" id="st-import">Import</button>' +
      "</div></div>" +
      '<div id="st-toast" role="status"></div>' +
      '<input type="file" id="st-file" accept="application/json" hidden />';
    document.body.appendChild(wrap);

    var btn = document.getElementById("st-fork-btn");
    var panel = document.getElementById("st-panel");
    btn.addEventListener("click", function () {
      var open = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.getElementById("st-export").addEventListener("click", exportSave);
    document.getElementById("st-import").addEventListener("click", function () {
      document.getElementById("st-file").click();
    });
    document.getElementById("st-file").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) importSave(e.target.files[0]);
    });
    renderList();
  }

  function attachUnity(instance) {
    var tries = 0;
    (function wait() {
      tries++;
      var mod = instance && instance.Module;
      if (mod && (mod.FS || window.FS)) {
        if (mod.FS && !window.FS) window.FS = mod.FS;
        loadIDBFS(function () {
          snapshotFS();
        });
        return;
      }
      if (tries < 120) setTimeout(wait, 250);
    })();
  }

  hookStorage();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountUI);
  } else {
    mountUI();
  }

  window.SecretTreasureFork = {
    attachUnity: attachUnity,
    unlock: unlock,
    flush: flushIDBFS,
    ledger: function () {
      return ledger;
    }
  };
})();
