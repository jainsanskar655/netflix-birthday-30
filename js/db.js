/* ===============================================================
   DB — tiny IndexedDB wrapper for offline persistence
   Stores:  "meta"  -> user content overrides (JSON)
            "media" -> uploaded video / thumbnail Blobs
   =============================================================== */
(function () {
  var DB_NAME = "netflix-birthday";
  var DB_VER = 1;
  var _db = null;

  function open() {
    return new Promise(function (resolve, reject) {
      if (_db) return resolve(_db);
      if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
        if (!db.objectStoreNames.contains("media")) db.createObjectStore("media");
      };
      req.onsuccess = function () { _db = req.result; resolve(_db); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var s = t.objectStore(store);
        var out = fn(s);
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  var URLS = {};
  function objectURL(key, blob) {
    if (!URLS[key]) URLS[key] = URL.createObjectURL(blob);
    return URLS[key];
  }
  function revoke(key) {
    if (URLS[key]) { URL.revokeObjectURL(URLS[key]); delete URLS[key]; }
  }

  window.DB = {
    saveMeta: function (obj) { return tx("meta", "readwrite", function (s) { s.put(obj, "content"); }); },
    loadMeta: function () { return tx("meta", "readonly", function (s) { return s.get("content"); }); },
    putMedia: function (id, blob) { return tx("media", "readwrite", function (s) { s.put(blob, id); }); },
    getMedia: function (id) { return tx("media", "readonly", function (s) { return s.get(id); }); },
    delMedia: function (id) { return tx("media", "readwrite", function (s) { s.delete(id); }); },
    listMedia: function () { return tx("media", "readonly", function (s) { return s.getAllKeys(); }); },
    objectURL: objectURL,
    revoke: revoke,
    clearAll: function () {
      URLS = {};
      return Promise.all([
        tx("meta", "readwrite", function (s) { s.clear(); }),
        tx("media", "readwrite", function (s) { s.clear(); })
      ]);
    }
  };

  /* ===============================================================
     Cloud — shared "temp DB" backed by Netlify Functions + Blobs.
     Falls back to IndexedDB (DB above) when not running on Netlify.
     =============================================================== */
  var CHUNK = 4 * 1024 * 1024; // 4 MB

  window.Cloud = {
    enabled: false,
    lastError: null,

    detect: async function () {
      try {
        var r = await fetch("/api/content", { cache: "no-store" });
        if (r.ok) { this.enabled = true; return true; }
      } catch (e) { /* not hosted with functions */ }
      this.enabled = false;
      return false;
    },

    load: async function () {
      var r = await fetch("/api/content", { cache: "no-store" });
      if (!r.ok) throw new Error("load failed " + r.status);
      var t = await r.text();
      if (!t) return null;
      try { return JSON.parse(t); } catch (e) { return null; }
    },

    save: async function (obj) {
      var r = await fetch("/api/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(obj)
      });
      if (!r.ok) throw new Error("save failed " + r.status);
      return r.json();
    },

    /* Upload any File/Blob in chunks; returns { url, key } */
    upload: async function (file, onProgress) {
      var id = (self.crypto && crypto.randomUUID)
        ? crypto.randomUUID().replace(/-/g, "")
        : "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      var total = file.size;
      var count = Math.max(1, Math.ceil(total / CHUNK));
      for (var i = 0; i < count; i++) {
        var slice = file.slice(i * CHUNK, Math.min((i + 1) * CHUNK, total));
        var res = await fetch("/api/media?action=put&id=" + id + "&page=" + i, {
          method: "POST",
          body: slice,
          headers: { "x-file-type": file.type || "" }
        });
        if (!res.ok) throw new Error("Upload failed at part " + (i + 1) + "/" + count);
        if (onProgress) onProgress((i + 1) / count * 0.95);
      }
      var params = new URLSearchParams({
        action: "finalize", id: id, total: String(total), chunk: String(CHUNK),
        type: file.type || "application/octet-stream", name: file.name || "", count: String(count)
      });
      var f = await fetch("/api/media?" + params.toString(), { method: "POST" });
      if (!f.ok) throw new Error("Could not finalize upload");
      var d = await f.json();
      if (onProgress) onProgress(1);
      return { url: d.url, key: d.key };
    },

    remove: async function (key) {
      if (!key) return;
      try { await fetch("/api/media?id=" + encodeURIComponent(key), { method: "DELETE" }); } catch (e) { }
    }
  };
})();
