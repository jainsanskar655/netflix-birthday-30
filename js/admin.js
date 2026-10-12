/* ===============================================================
   ADMIN — Configure Mode  (Ctrl + A + S)
   Add / edit / delete birthday wishes, import & export content.
   =============================================================== */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var NB = window.NB;
  var pending = { video: null, thumb: null };
  var editingId = null;

  function openAdmin() {
    var C = NB.getContent();
    if (!C) { NB.toast("Still loading, try again…", true); return; }
    var sel = $("#wRow");
    sel.innerHTML = (C.rows || []).map(function (r) { return '<option value="' + r.id + '">' + NB.esc(r.title) + "</option>"; }).join("") || '<option value="continue">Continue Watching</option>';
    $("#admin").classList.add("open");
    document.body.style.overflow = "hidden";
    renderList();
    loadStoryEditor();
    if (!C.rows || !C.rows.length) return;
  }
  function closeAdmin() { $("#admin").classList.remove("open"); document.body.style.overflow = ""; resetForm(); }
  function toggleAdmin() { if ($("#admin").classList.contains("open")) closeAdmin(); else openAdmin(); }

  function resetForm() {
    editingId = null; pending.video = null; pending.thumb = null;
    ["wTitle", "wVideoUrl", "wDesc"].forEach(function (id) { $("#" + id).value = ""; });
    $("#wVideo").value = ""; $("#wThumb").value = ""; $("#wSeason").value = 1; $("#wEpisode").value = 1;
    $("#wishForm").querySelector("button[type=submit]").textContent = "＋ Add to library";
    $("#adminProgress").textContent = "";
    var cancel = $("#wCancelEdit"); if (cancel) cancel.remove();
  }

  function renderList() {
    var C = NB.getContent();
    var host = $("#adminList"); host.innerHTML = "";
    var ids = Object.keys(C.library);
    $("#admCount").textContent = ids.length;
    ids.forEach(function (id) {
      var it = C.library[id];
      var row = document.createElement("div");
      row.className = "admin-item";
      row.innerHTML =
        '<div class="ai-thumb" style="' + NB.thumbStyle(it) + '"></div>' +
        "<div><h4>" + NB.esc(it.title) + "</h4><small>" + NB.esc(it.from || "") + " · " + ((it.episodes || []).length) + " episode(s)</small></div>" +
        '<div class="ai-actions"><button data-act="play">▶</button><button data-act="edit">Edit</button><button data-act="del" class="del">Delete</button></div>';
      row.querySelector('[data-act="play"]').onclick = function () { $("#admin").classList.remove("open"); NB.openDetail(id); };
      row.querySelector('[data-act="edit"]').onclick = function () { editItem(id); };
      row.querySelector('[data-act="del"]').onclick = function () { delItem(id); };
      host.appendChild(row);
    });
  }

  function editItem(id) {
    var C = NB.getContent(); var it = C.library[id]; if (!it) return;
    editingId = id; pending.video = null; pending.thumb = null;
    $("#wTitle").value = it.title || "";
    $("#wDesc").value = it.description || "";
    var ep = (it.episodes || [])[0] || {};
    $("#wVideoUrl").value = it.video || ep.video || "";
    $("#wSeason").value = ep.season || 1;
    $("#wEpisode").value = ep.episode || 1;
    var rowId = findRow(id); if (rowId) $("#wRow").value = rowId;
    $("#adminProgress").textContent = "Editing: " + it.title;
    var btn = $("#wishForm").querySelector("button[type=submit]"); btn.textContent = "✓ Save changes";
    if (!$("#wCancelEdit")) {
      var b = document.createElement("button");
      b.type = "button"; b.id = "wCancelEdit"; b.className = "admin-btn ghost"; b.textContent = "Cancel edit"; b.style.marginTop = "8px";
      b.onclick = function () { resetForm(); };
      btn.parentNode.insertBefore(b, btn.nextSibling);
    }
    $("#admin").querySelector(".admin-col").scrollTop = 0;
  }

  function findRow(id) {
    var C = NB.getContent(); var found = null;
    (C.rows || []).forEach(function (r) { if ((r.itemIds || []).indexOf(id) >= 0) found = r.id; });
    return found;
  }

  function delItem(id) {
    var C = NB.getContent(); var it = C.library[id]; if (!it) return;
    if (!confirm('Delete "' + it.title + '"? This cannot be undone.')) return;
    (it.episodes || []).forEach(function (e) {
      if (e.videoKey) DB.delMedia(e.videoKey); if (e.thumbKey) DB.delMedia(e.thumbKey);
    });
    if (it.videoKey) DB.delMedia(it.videoKey); if (it.thumbKey) DB.delMedia(it.thumbKey);
    delete C.library[id];
    (C.rows || []).forEach(function (r) { r.itemIds = (r.itemIds || []).filter(function (x) { return x !== id; }); });
    NB.save(); NB.renderAll(); renderList();
    NB.toast("Deleted");
  }

  function uid(prefix) { return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  async function submit(e) {
    e.preventDefault();
    var C = NB.getContent();
    var title = $("#wTitle").value.trim(); if (!title) return;
    var desc = $("#wDesc").value.trim();
    var url = $("#wVideoUrl").value.trim();
    var season = Number($("#wSeason").value) || 1;
    var episode = Number($("#wEpisode").value) || 1;
    var rowId = $("#wRow").value;

    $("#adminProgress").textContent = "Saving…";
    try {
      var existing = editingId ? C.library[editingId] : null;
      var id = editingId || uid("wish");
      var cloud = NB.isCloud && NB.isCloud();
      var prog = function (t) { $("#adminProgress").textContent = t; };

      // video: uploaded file (cloud or local) or URL
      var existingEp = existing && existing.episodes && existing.episodes[0] ? existing.episodes[0] : null;
      var videoKey = existingEp ? existingEp.videoKey : null;
      var videoUrl = url || (existingEp ? existingEp.video : "") || "";
      if (pending.video) {
        if (cloud) {
          prog("Uploading video… 0%");
          var up = await Cloud.upload(pending.video, function (fr) { prog("Uploading video… " + Math.round(fr * 100) + "%"); });
          videoUrl = up.url; videoKey = null;
        } else {
          videoKey = uid("vid");
          await DB.putMedia(videoKey, pending.video);
          prog("Video stored in this browser ✓");
        }
      }
      // thumbnail
      var thumbKey = existing ? existing.thumbKey : null;
      var thumbUrl = existing ? existing.thumb : "";
      if (pending.thumb) {
        if (cloud) {
          prog("Uploading thumbnail…");
          var tu = await Cloud.upload(pending.thumb, function (fr) { prog("Uploading thumbnail… " + Math.round(fr * 100) + "%"); });
          thumbUrl = tu.url; thumbKey = null;
        } else {
          thumbKey = uid("img");
          await DB.putMedia(thumbKey, pending.thumb);
        }
      }

      var item = existing || {};
      item.id = id;
      item.badge = item.badge || "N FILM";
      item.title = title;
      item.from = item.from || extractFrom(title);
      item.description = desc;
      item.hue = (item.hue != null) ? item.hue : (Math.abs(hashStr(title)) % 360);
      item.genres = item.genres && item.genres.length ? item.genres : ["Birthday"];
      item.starring = item.starring && item.starring.length ? item.starring : [item.from];
      item.year = item.year || new Date().getFullYear();
      item.maturity = item.maturity || "U";
      item.match = item.match || (90 + (Math.abs(hashStr(title)) % 10));
      item.thumb = thumbUrl || null;
      item.thumbKey = thumbKey || null;
      if (videoUrl) item.video = videoUrl; else delete item.video;
      var ep = (item.episodes && item.episodes[0]) || { id: uid("ep") };
      ep.season = season; ep.episode = episode; ep.title = title; ep.description = desc;
      ep.duration = ep.duration || "";
      if (videoUrl) ep.video = videoUrl; else delete ep.video;
      ep.videoKey = videoKey || null;
      ep.hue = item.hue;
      item.episodes = [ep];

      C.library[id] = item;

      // rows
      if (rowId) {
        var row = (C.rows || []).filter(function (r) { return r.id === rowId; })[0];
        if (!row) { row = { id: rowId, title: rowId, type: "cards", itemIds: [] }; C.rows.push(row); }
        (C.rows || []).forEach(function (r) { r.itemIds = (r.itemIds || []).filter(function (x) { return x !== id; }); });
        row.itemIds.unshift(id);
      }

      await NB.refreshMedia();
      await NB.save();
      NB.renderAll();
      renderList();
      NB.toast(editingId ? "Saved changes ✓" : "Added “" + title + "” ✓");
      resetForm();
      if (!C.rows || !C.rows.length) { }
    } catch (err) {
      console.error(err);
      $("#adminProgress").textContent = "";
      NB.toast("Something went wrong saving", true);
    }
  }

  function extractFrom(title) {
    var m = title.match(/(?:from|by)\s+(.+)$/i); if (m) return m[1];
    return "Friends";
  }
  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0; return h; }

  function exportJSON() {
    var C = NB.getContent();
    var data = JSON.stringify(C, null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "birthday-content.json";
    a.click();
    URL.revokeObjectURL(a.href);
    NB.toast("Exported content (videos stay in browser)");
  }
  function importJSON(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var obj = JSON.parse(r.result);
        if (!obj.library) throw new Error("bad file");
        NB.setContent(obj);
        NB.save(); NB.renderAll(); renderList();
        NB.toast("Imported ✓");
      } catch (e) { NB.toast("Invalid JSON file", true); }
    };
    r.readAsText(file);
  }
  async function resetAll() {
    if (!confirm("Reset everything back to the default birthday content? Uploaded videos will be removed.")) return;
    try { await DB.clearAll(); } catch (e) { }
    var fresh = NB.clone(window.DEFAULT_CONTENT);
    NB.setContent(fresh);
    NB.save(); await NB.refreshMedia(); NB.renderAll(); renderList(); resetForm();
    NB.toast("Reset to defaults");
  }

  /* ===============================================================
     HIS STORY editor
     =============================================================== */
  var editReasons = [], editFaq = [], storyPending = { hero: null };

  function setVal(id, v) { var e = $("#" + id); if (e) e.value = v; }
  function setText(id, v) { var e = $("#" + id); if (e) e.textContent = v; }
  function textVal(id) { var e = $("#" + id); return e ? e.value.trim() : ""; }
  function attr(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function escHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function showPreview(id, url) { var e = $("#" + id); if (!e) return; e.style.backgroundImage = url ? "url('" + url + "')" : ""; e.classList.toggle("show", !!url); }

  function loadStoryEditor() {
    var C = NB.getContent(); if (!C) return;
    var s = C.story || {};
    setVal("stNav", s.navLabel || "His Story");
    var h = s.hero || {};
    setVal("stHeroTitle", h.title || ""); setVal("stHeroSub", h.subtitle || ""); setVal("stHeroTag", h.tagline || "");
    showPreview("stHeroPreview", NB.picOf ? NB.picOf(h) : (h.image || ""));
    var why = s.why || {}; setVal("stWhyTitle", why.title || ""); setVal("stWhyBody", why.body || "");
    var q = s.quote || {}; setVal("stQuote", q.text || ""); setVal("stQuoteBy", q.by || "");
    var rs = s.reasons || {}; setVal("stReasonsTitle", rs.title || "Reasons We Love You");
    editReasons = (rs.items || []).map(function (r) { return Object.assign({}, r); });
    var fq = s.faq || {}; setVal("stFaqTitle", fq.title || "Frequently Asked Questions");
    editFaq = (fq.items || []).map(function (f) { return Object.assign({}, f); });
    storyPending.hero = null; var hi = $("#stHeroImg"); if (hi) hi.value = "";
    renderReasonRows(); renderFaqRows();
    setText("storyProgress", "");
  }

  function renderReasonRows() {
    var host = $("#stReasonsList"); if (!host) return;
    host.innerHTML = "";
    editReasons.forEach(function (r, i) {
      if (!r.id) r.id = uid("r");
      var pic = NB.picOf ? NB.picOf(r) : (r.image || "");
      var row = document.createElement("div"); row.className = "st-row";
      row.innerHTML =
        '<div class="st-row-top"><div class="st-thumb"' + (pic ? ' style="background-image:url(\'' + pic + '\')"' : "") + "></div>" +
        '<input class="st-title" placeholder="Title" value="' + attr(r.title) + '" />' +
        '<button type="button" class="st-del">Delete</button></div>' +
        '<textarea class="st-text" rows="2" placeholder="Why you love him…">' + escHtml(r.text || "") + "</textarea>" +
        '<input type="file" class="st-file" accept="image/*" />';
      row.querySelector(".st-title").oninput = function () { r.title = this.value; };
      row.querySelector(".st-text").oninput = function () { r.text = this.value; };
      row.querySelector(".st-file").onchange = function () {
        var f = this.files[0]; if (!f) return;
        r._file = f;
        row.querySelector(".st-thumb").style.backgroundImage = "url('" + URL.createObjectURL(f) + "')";
      };
      row.querySelector(".st-del").onclick = function () { editReasons.splice(i, 1); renderReasonRows(); };
      host.appendChild(row);
    });
    setText("stReasonsCount", editReasons.length);
  }

  function renderFaqRows() {
    var host = $("#stFaqList"); if (!host) return;
    host.innerHTML = "";
    editFaq.forEach(function (f, i) {
      if (!f.id) f.id = uid("f");
      var row = document.createElement("div"); row.className = "st-row";
      row.innerHTML =
        '<div class="st-row-top"><input class="st-q" placeholder="Question" value="' + attr(f.q) + '" />' +
        '<button type="button" class="st-del">Delete</button></div>' +
        '<textarea class="st-a" rows="2" placeholder="Answer">' + escHtml(f.a || "") + "</textarea>";
      row.querySelector(".st-q").oninput = function () { f.q = this.value; };
      row.querySelector(".st-a").oninput = function () { f.a = this.value; };
      row.querySelector(".st-del").onclick = function () { editFaq.splice(i, 1); renderFaqRows(); };
      host.appendChild(row);
    });
  }

  async function uploadImage(file) {
    if (NB.isCloud && NB.isCloud()) { var r = await Cloud.upload(file); return { image: r.url, imageKey: null }; }
    var key = uid("img"); await DB.putMedia(key, file); return { image: null, imageKey: key };
  }

  async function saveStory(e) {
    if (e) e.preventDefault();
    var C = NB.getContent();
    var prog = function (t) { setText("storyProgress", t); };
    prog("Saving story…");
    try {
      var s = Object.assign({}, C.story || {});
      s.navLabel = textVal("stNav") || "His Story";
      s.hero = Object.assign({}, s.hero || {}, { title: textVal("stHeroTitle"), subtitle: textVal("stHeroSub"), tagline: textVal("stHeroTag") });
      if (storyPending.hero) {
        prog("Uploading hero photo…");
        var hr = await uploadImage(storyPending.hero);
        s.hero.image = hr.image; s.hero.imageKey = hr.imageKey;
      }
      if (s.hero.image == null) delete s.hero.image;
      if (s.hero.imageKey == null) delete s.hero.imageKey;
      s.why = Object.assign({}, s.why || {}, { title: textVal("stWhyTitle"), body: textVal("stWhyBody") });
      s.quote = Object.assign({}, s.quote || {}, { text: textVal("stQuote"), by: textVal("stQuoteBy") });

      s.reasons = { title: textVal("stReasonsTitle") || "Reasons We Love You", items: [] };
      for (var i = 0; i < editReasons.length; i++) {
        var r = editReasons[i];
        var item = { id: r.id, title: r.title || "", text: r.text || "", image: r.image || null, imageKey: r.imageKey || null };
        if (r._file) {
          prog("Uploading photo " + (i + 1) + " of " + editReasons.length + "…");
          var ur = await uploadImage(r._file);
          item.image = ur.image; item.imageKey = ur.imageKey;
        }
        if (item.image == null) delete item.image;
        if (item.imageKey == null) delete item.imageKey;
        s.reasons.items.push(item);
      }
      s.faq = {
        title: textVal("stFaqTitle") || "Frequently Asked Questions",
        items: editFaq.map(function (f) { return { id: f.id, q: f.q || "", a: f.a || "" }; })
      };

      C.story = s;
      await NB.refreshMedia();
      await NB.save();
      NB.renderStory();
      loadStoryEditor();
      NB.toast("Story saved ✓");
    } catch (err) {
      console.error(err);
      setText("storyProgress", "");
      NB.toast("Could not save story", true);
    }
  }

  /* ---------- wiring ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    $("#wishForm").addEventListener("submit", submit);
    $("#wVideo").addEventListener("change", function () {
      pending.video = this.files[0] || null;
      $("#adminProgress").textContent = pending.video ? ("Video ready: " + pending.video.name + " (" + (pending.video.size / 1048576).toFixed(1) + " MB)") : "";
    });
    $("#wThumb").addEventListener("change", function () { pending.thumb = this.files[0] || null; });
    $("#adminClose").onclick = closeAdmin;
    $("#adminExport").onclick = exportJSON;
    $("#adminImportBtn").onclick = function () { $("#adminImport").click(); };
    $("#adminImport").addEventListener("change", function () { if (this.files[0]) importJSON(this.files[0]); this.value = ""; });
    $("#adminReset").onclick = resetAll;

    // Story tab + editor
    $$(".admin-tab").forEach(function (tab) {
      tab.onclick = function () {
        $$(".admin-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var name = tab.getAttribute("data-atab");
        $$(".admin-body").forEach(function (b) { b.classList.toggle("hidden", b.getAttribute("data-apane") !== name); });
        if (name === "story") loadStoryEditor();
      };
    });
    $("#storyForm").addEventListener("submit", saveStory);
    $("#stHeroImg").addEventListener("change", function () {
      storyPending.hero = this.files[0] || null;
      if (storyPending.hero) showPreview("stHeroPreview", URL.createObjectURL(storyPending.hero));
    });
    $("#stAddReason").onclick = function () { editReasons.push({ id: uid("r"), title: "", text: "", image: null, imageKey: null }); renderReasonRows(); };
    $("#stAddFaq").onclick = function () { editFaq.push({ id: uid("f"), q: "", a: "" }); renderFaqRows(); };

    // Ctrl + A then S  OR  Ctrl + Shift + A
    var awaiting = false, timer = null;
    document.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      var tag = (e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea";
      if (e.ctrlKey && !e.shiftKey && k === "a" && !typing) {
        awaiting = true; clearTimeout(timer); timer = setTimeout(function () { awaiting = false; }, 1500); return;
      }
      if (awaiting && k === "s") { awaiting = false; clearTimeout(timer); e.preventDefault(); toggleAdmin(); return; }
      if (e.ctrlKey && e.shiftKey && k === "a") { e.preventDefault(); toggleAdmin(); }
      if (k === "escape" && $("#admin").classList.contains("open")) { closeAdmin(); }
    });
  });
})();
