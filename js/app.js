/* ===============================================================
   APP — splash, login, profiles, browse, detail, player, search
   =============================================================== */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var MEDIA = {};          // mediaKey -> objectURL
  var CONTENT = null;      // working content
  var state = { profile: null, itemId: null, epIndex: 0, detailId: null, season: 1 };

  /* ---------------- utils ---------------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(t) {
    t = Math.max(0, Math.floor(t || 0));
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s).padStart(2, "0");
  }
  function prog(id) { try { return (JSON.parse(localStorage.getItem("nb_prog") || "{}"))[id] || 0; } catch (e) { return 0; } }
  function setProg(id, v) { try { var p = JSON.parse(localStorage.getItem("nb_prog") || "{}"); p[id] = v; localStorage.setItem("nb_prog", JSON.stringify(p)); } catch (e) { } }

  function mediaUrl(key) { return (key && MEDIA[key]) || ""; }
  function srcOf(o, fallback) {
    if (!o) return fallback || "assets/videos/play1.mp4";
    return o.video || mediaUrl(o.videoKey) || fallback || "assets/videos/play1.mp4";
  }
  function thumbOf(o) {
    if (!o) return "";
    return o.thumb || mediaUrl(o.thumbKey) || "";
  }
  function picOf(o) {
    if (!o) return "";
    return o.image || mediaUrl(o.imageKey) || "";
  }
  function hueOf(o, seed) {
    if (o && o.hue != null) return o.hue;
    var s = String((o && o.id) || seed || "x");
    var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }
  function thumbStyle(o) {
    var url = thumbOf(o);
    if (url) return "background-image:linear-gradient(0deg,rgba(0,0,0,.55),transparent 60%),url('" + url + "');background-size:cover;background-position:center";
    var h = hueOf(o);
    return "background:radial-gradient(circle at 30% 22%,hsl(" + h + " 62% 34% / .6),transparent 58%),linear-gradient(135deg,hsl(" + h + " 46% 20%),hsl(" + ((h + 45) % 360) + " 55% 9%))";
  }

  function toast(msg, isErr) {
    var t = $("#toast"); t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(t._t); t._t = setTimeout(function () { t.className = "toast"; }, 2600);
  }

  function items() { return Object.keys(CONTENT.library).map(function (k) { return CONTENT.library[k]; }); }
  function episodeLabel(item, ep) {
    if (!ep) return "";
    if ((item.episodes || []).length > 1) return 'S' + ep.season + ':E' + ep.episode + ' "' + ep.title + '"';
    return ep.title || item.title;
  }

  /* ---------------- boot ---------------- */
  async function buildMedia() {
    try {
      var keys = await DB.listMedia();
      await Promise.all(keys.map(async function (k) {
        try { var b = await DB.getMedia(k); if (b) MEDIA[k] = DB.objectURL(k, b); } catch (e) { }
      }));
    } catch (e) { /* file:// or blocked — defaults still work */ }
  }

  async function boot() {
    var saved = null, cloud = false;
    try { cloud = await Cloud.detect(); } catch (e) { cloud = false; }
    if (cloud) {
      try { saved = await Cloud.load(); } catch (e) { saved = null; }
    } else {
      try { saved = await DB.loadMeta(); } catch (e) { }
    }
    CONTENT = (saved && saved.library) ? saved : clone(window.DEFAULT_CONTENT);
    await buildMedia();
    if (cloud && !(saved && saved.library)) { try { await Cloud.save(CONTENT); } catch (e) { } }
    document.title = CONTENT.site.name + " — " + CONTENT.site.age;
    setupSplash();
    setupLogin();
    setupNav();
    setupDetail();
    setupPlayer();
    setupSearch();
    renderProfiles();
  }

  /* ---------------- splash ---------------- */
  function setupSplash() {
    var splash = $("#splash"), vid = $("#splashVideo"), gate = $("#splashGate");
    try { if (CONTENT.intro) vid.src = CONTENT.intro; } catch (e) { }
    var done = false;
    function finish() {
      if (done) return; done = true;
      splash.classList.add("fade");
      setTimeout(function () { splash.style.display = "none"; showLogin(); }, 620);
    }
    $("#splashStart").addEventListener("click", function (e) {
      e.stopPropagation();
      splash.classList.add("play");
      try { vid.muted = false; vid.currentTime = 0; vid.play().catch(function () { }); } catch (err) { }
      setTimeout(finish, 6000);
    });
    vid.addEventListener("ended", finish);
    splash.addEventListener("click", function () { if (splash.classList.contains("play")) finish(); });
  }

  /* ---------------- login ---------------- */
  function setupLogin() {
    $("#loginForm").addEventListener("submit", function (e) { e.preventDefault(); showProfiles(); });
    $("#loginSkip").addEventListener("click", function (e) { e.preventDefault(); showProfiles(); });
    $("#loginSkip2").addEventListener("click", function (e) { e.preventDefault(); showProfiles(); });
  }
  function showLogin() {
    $("#login").classList.remove("hidden");
    $("#loginEmail").focus();
  }
  function showProfiles() {
    $("#login").classList.add("hidden");
    renderProfiles();
    $("#profiles").classList.remove("hidden");
  }

  /* ---------------- profiles ---------------- */
  function renderProfiles() {
    var grid = $("#profilesGrid"); if (!grid) return;
    grid.innerHTML = "";
    (CONTENT.profiles || []).forEach(function (p) {
      var el = document.createElement("div");
      el.className = "profile";
      el.innerHTML = '<div class="avatar-lg" style="background:' + (p.color || "linear-gradient(135deg,#333,#111)") + '">' + esc(p.initial || p.name.charAt(0)) + "</div><span>" + esc(p.name) + "</span>";
      el.onclick = function () { enterApp(p); };
      grid.appendChild(el);
    });
    var add = document.createElement("div");
    add.className = "profile add";
    add.innerHTML = '<div class="avatar-lg">＋</div><span>Add Profile</span>';
    add.onclick = function () { toast("Configure mode: press Ctrl + A + S"); };
    grid.appendChild(add);
    $("#profilesTitle").textContent = "Who's watching?";
  }
  function enterApp(p) {
    state.profile = p;
    $("#profiles").classList.add("hidden");
    $("#app").classList.remove("hidden");
    var av = $("#avatarBtn"); av.textContent = (p.initial || p.name.charAt(0)).toUpperCase();
    renderAll();
    showHome();
    window.scrollTo(0, 0);
  }

  /* ---------------- browse ---------------- */
  function setupNav() {
    $("#nav").addEventListener("scroll", function () { });
    window.addEventListener("scroll", function () { $("#nav").classList.toggle("scrolled", window.scrollY > 30); }, { passive: true });
    $("#avatarBtn").onclick = function () {
      $("#app").classList.add("hidden"); renderProfiles(); $("#profiles").classList.remove("hidden"); window.scrollTo(0, 0);
    };
    function activate(nav) {
      $$(".nav-links a").forEach(function (x) { x.classList.toggle("active", x.getAttribute("data-nav") === nav); });
    }
    function navTo(nav) {
      activate(nav);
      if (nav === "story") { showStory(); return; }
      showHome();
      var map = { home: "continue", wishes: "new", roast: "roast", tops: "top10" };
      if (nav === "home") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      var row = document.getElementById("row-" + map[nav]);
      if (row) window.scrollTo({ top: row.offsetTop - 60, behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }
    $$(".nav-links a").forEach(function (a) {
      a.onclick = function () { navTo(a.getAttribute("data-nav")); };
    });
    var wm = $(".wordmark"); if (wm) wm.onclick = function (e) { e.preventDefault(); navTo("home"); };
    $("#heroPlay").onclick = function () { openPlayer(CONTENT.hero, 0); };
    $("#heroMore").onclick = function () { openDetail(CONTENT.hero); };
    var hs = $("#heroStory"); if (hs) hs.onclick = function () { navTo("story"); };
  }

  function showHome() { var s = $("#story"); if (s) s.classList.add("hidden"); $("#home").classList.remove("hidden"); }
  function showStory() { renderStory(); $("#home").classList.add("hidden"); $("#story").classList.remove("hidden"); window.scrollTo(0, 0); }

  function renderHero() {
    var item = CONTENT.library[CONTENT.hero] || items()[0];
    if (!item) return;
    var hero = $("#hero");
    var bg = $(".hero-bg", hero);
    if (!bg) { bg = document.createElement("div"); bg.className = "hero-bg"; hero.insertBefore(bg, hero.firstChild); }
    var url = thumbOf(item);
    if (url) { bg.style.backgroundImage = "url('" + url + "')"; bg.style.background = "url('" + url + "') center 20%/cover no-repeat"; }
    else {
      var h = hueOf(item);
      bg.style.background = "radial-gradient(circle at 72% 30%,hsl(" + h + " 62% 34% / .55),transparent 42%),linear-gradient(135deg,hsl(" + h + " 40% 15%),hsl(" + ((h + 45) % 360) + " 52% 7%))";
    }
    $("#heroTitle").textContent = item.title;
    var eps = item.episodes || [];
    $("#heroMeta").innerHTML =
      '<span>' + esc(item.year || 2026) + '</span>' +
      '<span class="maturity">' + esc(item.maturity || "30") + '</span>' +
      '<span class="badge">' + esc(item.badge || "Birthday Special") + '</span>' +
      (eps.length > 1 ? '<span>' + eps.length + ' Episodes</span>' : (eps[0] && eps[0].duration ? '<span>' + esc(eps[0].duration) + '</span>' : "")) +
      '<span class="match">' + (item.match || 98) + '% Match</span>' +
      '<span class="badge">HD</span>';
    $("#heroDesc").textContent = item.description || "";
    var mute = $("#heroMute"); if (mute) mute.style.display = "none";
  }

  function makeCard(item, opts) {
    opts = opts || {};
    var a = document.createElement("article");
    a.className = "card" + (opts.ranked ? " ranked" : "");
    var p = prog(item.episodes && item.episodes[0] ? item.episodes[0].id : item.id);
    var dur = item.episodes && item.episodes[0] ? item.episodes[0].duration : "";
    var inner = "";
    if (opts.ranked) inner += '<span class="rank">' + opts.rank + "</span>";
    inner += '<div class="thumb" style="' + thumbStyle(item) + '">';
    if (item.badge) inner += '<span class="card-badge">' + esc(item.badge) + "</span>";
    inner += '<span class="thumb-from">' + esc(item.from || "") + "</span>";
    inner += '<span class="thumb-label">' + esc(item.title) + "</span>";
    if (dur) inner += '<span class="duration">' + esc(dur) + "</span>";
    if (p > 0.01) inner += '<div class="prog"><i style="width:' + Math.round(p * 100) + '%"></i></div>';
    inner += "</div>";
    a.innerHTML = inner;
    a.onclick = function () { openDetail(item.id); };
    return a;
  }

  function renderRows() {
    var host = $("#rows"); host.innerHTML = "";
    (CONTENT.rows || []).forEach(function (row) {
      var its = (row.itemIds || []).map(function (id) { return CONTENT.library[id]; }).filter(Boolean);
      if (!its.length) return;
      var block = document.createElement("section");
      block.className = "row-block"; block.id = "row-" + row.id;
      block.innerHTML = '<h2>' + esc(row.title) + '</h2><div class="row-strip"><button class="row-nav left">‹</button><div class="row-scroll"></div><button class="row-nav right">›</button></div>';
      var scroll = $(".row-scroll", block);
      its.forEach(function (it, i) { scroll.appendChild(makeCard(it, { ranked: row.type === "ranked", rank: i + 1 })); });
      var amt = function () { return Math.max(300, scroll.clientWidth * 0.9); };
      $(".row-nav.left", block).onclick = function () { scroll.scrollBy({ left: -amt(), behavior: "smooth" }); };
      $(".row-nav.right", block).onclick = function () { scroll.scrollBy({ left: amt(), behavior: "smooth" }); };
      host.appendChild(block);
    });
  }

  function renderStory() {
    if (!CONTENT) return;
    var link = $('.nav-links a[data-nav="story"]');
    var s = CONTENT.story;
    if (!s) {
      var w = $("#storyWhyBody"); if (w) w.textContent = "No story yet — press Ctrl + A + S to add one.";
      return;
    }
    if (link) link.textContent = s.navLabel || "His Story";

    var h = s.hero || {};
    var t = $("#storyHeroTitle"); if (t) t.textContent = h.title || "";
    var sub = $("#storyHeroSub"); if (sub) sub.textContent = h.subtitle || "";
    var tag = $("#storyHeroTag"); if (tag) tag.textContent = h.tagline || "";
    var bg = $("#storyHeroBg");
    if (bg) {
      var url = picOf(h);
      bg.style.background = url
        ? "linear-gradient(180deg,rgba(10,10,10,.25),rgba(10,10,10,.78)),url('" + url + "') center/cover"
        : "linear-gradient(135deg,#2a0a0d,#0b0b0b)";
    }
    var cta = $("#storyCta"); if (cta) cta.onclick = function () { openPlayer(CONTENT.hero, 0); };

    var why = s.why || {};
    var wt = $("#storyWhyTitle"); if (wt) wt.textContent = why.title || "";
    var wb = $("#storyWhyBody"); if (wb) wb.textContent = why.body || "";

    var rs = s.reasons || {};
    var rt = $("#storyReasonsTitle"); if (rt) rt.textContent = rs.title || "";
    var rhost = $("#storyReasons");
    if (rhost) {
      rhost.innerHTML = "";
      (rs.items || []).forEach(function (r) {
        var u = picOf(r);
        var card = document.createElement("article");
        card.className = "story-card" + (u ? "" : " noimg");
        card.innerHTML =
          '<div class="sc-img"' + (u ? ' style="background-image:url(\'' + u + '\')"' : "") + "></div>" +
          '<div class="sc-body"><h4>' + esc(r.title || "") + "</h4><p>" + esc(r.text || "") + "</p></div>";
        rhost.appendChild(card);
      });
    }

    var fq = s.faq || {};
    var ft = $("#storyFaqTitle"); if (ft) ft.textContent = fq.title || "";
    var fhost = $("#storyFaq");
    if (fhost) {
      fhost.innerHTML = "";
      (fq.items || []).forEach(function (f) {
        var it = document.createElement("div");
        it.className = "faq-item";
        it.innerHTML = '<button class="faq-q" type="button">' + esc(f.q || "") + '</button><div class="faq-a"><p>' + esc(f.a || "") + "</p></div>";
        it.querySelector(".faq-q").onclick = function () { it.classList.toggle("open"); };
        fhost.appendChild(it);
      });
    }

    var q = s.quote || {};
    var qe = $("#storyQuote"); if (qe) qe.textContent = q.text || "";
    var qb = $("#storyQuoteBy"); if (qb) qb.textContent = q.by || "";
  }

  function renderAll() {
    if (!CONTENT) return;
    $("#footName").textContent = CONTENT.site.name;
    $("#footDate").textContent = CONTENT.site.birthday;
    renderHero();
    renderRows();
    renderStory();
  }

  /* ---------------- detail overlay ---------------- */
  var detailItem = null;
  function setupDetail() {
    $("#detailClose").onclick = closeDetail;
    $$("#detailTabs button").forEach(function (b) {
      b.onclick = function () { switchTab(b.getAttribute("data-tab")); };
    });
    $("#detailPlay").onclick = function () { if (detailItem) openPlayer(detailItem.id, 0); };
    $("#detailAdd").onclick = function () { this.classList.toggle("on"); this.textContent = this.classList.contains("on") ? "✓" : "＋"; };
    $("#detailLike").onclick = function () { this.classList.toggle("on"); toast("Added to your list 👍"); };
    $("#seasonSelect").onchange = function () { state.season = Number(this.value); renderEpisodeList(detailItem, state.season); };
  }
  function switchTab(name) {
    $$("#detailTabs button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === name); });
    $$(".tab-panel").forEach(function (p) { p.classList.toggle("hidden", p.getAttribute("data-panel") !== name); });
  }
  function openDetail(id) {
    var item = CONTENT.library[id]; if (!item) return;
    detailItem = item; state.detailId = id; state.season = 1;
    var url = thumbOf(item);
    var hero = $("#detailHero");
    hero.style.background = url ? ("linear-gradient(0deg,#141414,rgba(20,20,20,.2)),url('" + url + "') center/cover") : thumbStyle(item);
    // preview video
    var pv = $("#detailPreview"); var ep0 = (item.episodes || [])[0];
    try {
      if (ep0) { pv.src = srcOf(ep0); pv.play().catch(function () { }); } else { pv.removeAttribute("src"); }
    } catch (e) { }
    $("#detailLogo").textContent = item.title;
    $("#detailMeta").innerHTML =
      '<span class="match">' + (item.match || 98) + '% Match</span>' +
      '<span>' + esc(item.year || 2026) + '</span>' +
      '<span class="maturity">' + esc(item.maturity || "30") + '</span>' +
      (item.episodes && item.episodes.length ? '<span>' + item.episodes.length + ' Episode' + (item.episodes.length > 1 ? 's' : '') + '</span>' : "") +
      '<span class="badge">' + esc(item.badge || "HD") + '</span>';
    $("#detailDesc").textContent = item.description || "";
    $("#detailFacts").innerHTML =
      "<div><b>Starring:</b> " + esc((item.starring || []).join(", ")) + "</div>" +
      "<div><b>Genres:</b> " + esc((item.genres || []).join(", ")) + "</div>" +
      "<div><b>Created by:</b> " + esc(item.creator || item.from || "Netflix") + "</div>";
    renderOverview(item);
    renderSeasons(item);
    renderEpisodeList(item, 1);
    renderMore(item);
    renderAbout(item);
    switchTab("overview");
    $("#detail").classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeDetail() {
    $("#detail").classList.remove("open");
    document.body.style.overflow = "";
    var pv = $("#detailPreview"); try { pv.pause(); } catch (e) { }
  }
  function renderOverview(item) {
    var eps = item.episodes || [];
    $("#overviewSeason").textContent = eps.length > 1 ? "Season 1" : "Featured Message";
    var host = $("#overviewEpisodes"); host.innerHTML = "";
    eps.slice(0, 4).forEach(function (e, i) { host.appendChild(makeEpisodeRow(item, e, i + 1)); });
  }
  function renderSeasons(item) {
    var seasons = {}; (item.episodes || []).forEach(function (e) { seasons[e.season] = 1; });
    var sel = $("#seasonSelect");
    var list = Object.keys(seasons).sort(function (a, b) { return a - b; });
    if (!list.length) list = ["1"];
    sel.innerHTML = list.map(function (s) { return '<option value="' + s + '">Season ' + s + "</option>"; }).join("");
    state.season = Number(list[0]); sel.value = list[0];
  }
  function renderEpisodeList(item, season) {
    var host = $("#episodeList"); host.innerHTML = "";
    var eps = (item.episodes || []).filter(function (e) { return e.season === season; });
    if (!eps.length) { host.innerHTML = '<p style="color:#b3b3b3;padding:20px 0">No episodes in this season.</p>'; return; }
    eps.forEach(function (e, i) { host.appendChild(makeEpisodeRow(item, e, e.episode || i + 1)); });
  }
  function makeEpisodeRow(item, ep, num) {
    var row = document.createElement("div");
    row.className = "episode";
    row.innerHTML =
      '<div class="ep-num">' + num + "</div>" +
      '<div class="ep-thumb" style="' + thumbStyle(ep.hue != null ? ep : item) + '"><div class="play-hint">▶</div></div>' +
      '<div class="ep-info"><h4>' + esc(ep.title) + '</h4><p>' + esc(ep.description || "") + "</p></div>" +
      '<div class="ep-dur">' + esc(ep.duration || "") + "</div>";
    row.onclick = function () {
      var idx = (item.episodes || []).indexOf(ep);
      openPlayer(item.id, idx < 0 ? 0 : idx);
    };
    return row;
  }
  function renderMore(item) {
    var host = $("#moreGrid"); host.innerHTML = "";
    items().filter(function (x) { return x.id !== item.id; }).slice(0, 6).forEach(function (x) {
      var el = document.createElement("div");
      el.className = "more-item";
      var dur = x.episodes && x.episodes[0] ? x.episodes[0].duration : "";
      el.innerHTML =
        '<div class="thumb" style="' + thumbStyle(x) + '">' + (dur ? '<span class="duration">' + esc(dur) + "</span>" : "") + "</div>" +
        "<h4>" + esc(x.title) + "</h4>" +
        '<div class="m-row"><span class="match">' + (x.match || 95) + "% Match</span><span>" + esc(x.year || 2026) + '</span><span class="maturity">' + esc(x.maturity || "U") + "</span></div>" +
        "<p>" + esc(x.description || "") + "</p>";
      el.onclick = function () { openDetail(x.id); };
      host.appendChild(el);
    });
  }
  function renderAbout(item) {
    $("#aboutGrid").innerHTML =
      "<div><b>Description</b><div class='val'>" + esc(item.description || "") + "</div></div>" +
      "<div><b>About</b><div class='val'>" + esc(item.creator || item.from || "") + "</div></div>" +
      "<div><b>Starring</b><div class='val'>" + esc((item.starring || []).join(", ")) + "</div></div>" +
      "<div><b>Genres</b><div class='val'>" + esc((item.genres || []).join(", ")) + "</div></div>" +
      "<div><b>Maturity rating</b><div class='val'>" + esc(item.maturity || "U") + "</div></div>" +
      "<div><b>This title is</b><div class='val'>Feel-good, Heartfelt, Made with love</div></div>";
  }

  /* ---------------- player overlay ---------------- */
  var p = {};
  function setupPlayer() {
    p.overlay = $("#player"); p.video = $("#playerVideo"); p.ui = $("#playerUI");
    p.fill = $("#pFill"); p.buf = $("#pBuffer"); p.knob = $("#pKnob"); p.bar = $("#pBarWrap");
    p.cur = $("#pCurrent"); p.dur = $("#pDuration"); p.title = $("#pTitle");
    p.play = $("#pPlay"); p.playIcon = $("#pPlayIcon");
    p.hideTimer = null; p.dragging = false;

    $("#pBack").onclick = closePlayer;
    p.play.onclick = togglePlay;
    $("#pBack10").onclick = function () { seek(-10); };
    $("#pFwd10").onclick = function () { seek(10); };
    $("#pNext").onclick = playNext;
    $("#pEpisodes").onclick = function () { $("#episodesDrawer").classList.toggle("open"); };
    $("#drawerClose").onclick = function () { $("#episodesDrawer").classList.remove("open"); };
    $("#pFullscreen").onclick = toggleFullscreen;
    $("#pMute").onclick = toggleMute;
    $("#pAudio").onclick = function () { toast("Audio & Subtitles — coming soon"); };
    $("#pAudioBtn").onclick = function () { toast("Audio & Subtitles — coming soon"); };
    $("#pSubs").onclick = function () { toast("Subtitles — on (demo)"); };
    $("#pVolWrap").onclick = function (e) { var r = this.getBoundingClientRect(); p.video.volume = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); updateVolume(); };

    p.video.addEventListener("timeupdate", onTime);
    p.video.addEventListener("progress", onProgress);
    p.video.addEventListener("loadedmetadata", onMeta);
    p.video.addEventListener("play", function () { p.playIcon.textContent = "❚❚"; showUI(); });
    p.video.addEventListener("pause", function () { p.playIcon.textContent = "▶"; showUI(true); });
    p.video.addEventListener("ended", onEnded);
    p.video.addEventListener("click", togglePlay);

    p.bar.addEventListener("mousedown", function (e) { p.dragging = true; scrub(e); });
    window.addEventListener("mousemove", function (e) { if (p.dragging) scrub(e); });
    window.addEventListener("mouseup", function () { p.dragging = false; });

    p.overlay.addEventListener("mousemove", function () { if (p.overlay.classList.contains("open")) showUI(); });
    p.overlay.addEventListener("touchstart", function () { if (p.overlay.classList.contains("open")) showUI(); }, { passive: true });
  }

  function openPlayer(itemId, epIndex) {
    var item = CONTENT.library[itemId]; if (!item) return;
    var eps = item.episodes || [];
    if (!eps.length) eps = [{ id: item.id + "-e1", season: 1, episode: 1, title: item.title, description: item.description, duration: "", video: item.video, videoKey: item.videoKey, hue: item.hue }];
    if (epIndex == null) epIndex = 0;
    state.itemId = itemId; state.epIndex = epIndex;
    var ep = eps[epIndex];
    p.eps = eps; p.item = item;

    var dpv = $("#detailPreview"); try { dpv.pause(); } catch (e) { }
    p.title.innerHTML = esc(episodeLabel(item, ep));
    p.video.src = srcOf(ep);
    var r = prog(ep.id);
    p.overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    var pr = p.video.play();
    if (pr && pr.catch) pr.catch(function () { });
    if (r > 0.02 && r < 0.98) { try { p.video.currentTime = r * (p.video.duration || 0); } catch (e) { } }
    buildDrawer(ep);
    updateNext();
    showUI(true);
    document.title = episodeLabel(item, ep);
  }
  function buildDrawer(activeEp) {
    var host = $("#drawerList"); host.innerHTML = "";
    p.eps.forEach(function (e, i) {
      var d = document.createElement("div");
      d.className = "drawer-ep" + (e.id === activeEp.id ? " active" : "");
      d.innerHTML = '<div class="n">' + (e.episode || i + 1) + "</div><div><h5>" + esc(e.title) + "</h5><p>" + esc(e.description || "") + '</p></div><div class="d">' + esc(e.duration || "") + "</div>";
      d.onclick = function () { openPlayer(state.itemId, i); $("#episodesDrawer").classList.remove("open"); };
      host.appendChild(d);
    });
  }
  function closePlayer() {
    try { p.video.pause(); } catch (e) { }
    saveProgress();
    p.overlay.classList.remove("open");
    $("#episodesDrawer").classList.remove("open");
    document.body.style.overflow = "";
    document.title = CONTENT.site.name + " — " + CONTENT.site.age;
    if ($("#detail").classList.contains("open")) { document.body.style.overflow = "hidden"; var pv = $("#detailPreview"); try { pv.play().catch(function () { }); } catch (e) { } }
  }
  function togglePlay() { if (p.video.paused) p.video.play().catch(function () { }); else p.video.pause(); flashCenter(p.video.paused ? "▶" : "❚❚"); }
  function seek(d) { try { p.video.currentTime = Math.max(0, Math.min((p.video.duration || 1e9), p.video.currentTime + d)); } catch (e) { } flashCenter(d < 0 ? "⟲ 10" : "10 ⟳"); showUI(); }
  function toggleMute() { p.video.muted = !p.video.muted; $("#pMute").textContent = p.video.muted ? "🔇" : "🔊"; }
  function updateVolume() { $("#pVolFill").style.width = Math.round((p.video.muted ? 0 : p.video.volume) * 100) + "%"; $("#pMute").textContent = (p.video.muted || p.video.volume === 0) ? "🔇" : "🔊"; }
  function toggleFullscreen() {
    var el = p.overlay;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(function () { });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
  function flashCenter(txt) {
    var b = $("#playerCenterBig"); b.textContent = txt; b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
  }
  function showUI(sticky) {
    p.ui.classList.remove("hide");
    clearTimeout(p.hideTimer);
    if (sticky) return;
    p.hideTimer = setTimeout(function () {
      if (!p.video.paused && p.overlay.classList.contains("open") && !$("#episodesDrawer").classList.contains("open")) p.ui.classList.add("hide");
    }, 3200);
  }
  function onTime() {
    var v = p.video;
    if (v.duration) {
      var ratio = v.currentTime / v.duration;
      p.fill.style.width = (ratio * 100) + "%";
      p.knob.style.left = (ratio * 100) + "%";
      p.cur.textContent = fmt(v.currentTime);
      p.dur.textContent = fmt(v.duration);
      var ep = p.eps[state.epIndex]; if (ep) setProg(ep.id, ratio);
    }
    updateNext();
  }
  function onProgress() {
    var v = p.video;
    try { if (v.buffered.length) p.buf.style.width = ((v.buffered.end(v.buffered.length - 1) / v.duration) * 100) + "%"; } catch (e) { }
  }
  function onMeta() { p.dur.textContent = fmt(p.video.duration); updateVolume(); }
  function scrub(e) {
    var r = p.bar.getBoundingClientRect();
    var ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    if (p.video.duration) { p.fill.style.width = (ratio * 100) + "%"; p.knob.style.left = (ratio * 100) + "%"; }
    if (!p.dragging) return;
    p.video.currentTime = ratio * (p.video.duration || 0);
  }
  function saveProgress() { try { var ep = p.eps[state.epIndex]; if (ep && p.video.duration) setProg(ep.id, p.video.currentTime / p.video.duration); } catch (e) { } }
  function updateNext() {
    var has = p.eps && state.epIndex < p.eps.length - 1;
    $("#pNext").classList.toggle("hidden", !has);
    if (has) $("#pNextNum").textContent = "▸ " + (p.eps[state.epIndex + 1].episode || state.epIndex + 2);
  }
  function playNext() {
    if (p.eps && state.epIndex < p.eps.length - 1) openPlayer(state.itemId, state.epIndex + 1);
  }
  function onEnded() {
    saveProgress();
    var ep = p.eps[state.epIndex]; if (ep) setProg(ep.id, 0);
    if (state.epIndex < p.eps.length - 1) {
      toast("Next episode playing…");
      setTimeout(playNext, 1200);
    } else {
      flashCenter("▶");
      showUI(true);
    }
  }

  /* ---------------- search ---------------- */
  function setupSearch() {
    $("#searchBtn").onclick = openSearch;
    $("#searchClose").onclick = function () { $("#search").classList.remove("open"); document.body.style.overflow = ""; };
    $("#searchInput").addEventListener("input", function () { renderSearch(this.value); });
  }
  function openSearch() {
    $("#search").classList.add("open");
    document.body.style.overflow = "hidden";
    $("#searchInput").value = "";
    renderSearch("");
    setTimeout(function () { $("#searchInput").focus(); }, 50);
  }
  function renderSearch(q) {
    q = (q || "").trim().toLowerCase();
    var host = $("#searchResults");
    var list = items().filter(function (it) {
      if (!q) return true;
      return (it.title + " " + (it.from || "") + " " + (it.genres || []).join(" ") + " " + (it.starring || []).join(" ")).toLowerCase().indexOf(q) >= 0;
    });
    host.innerHTML = "";
    if (!list.length) { host.innerHTML = '<div class="search-empty">No results for “' + esc(q) + '”. Try another wish!</div>'; return; }
    list.forEach(function (it) { host.appendChild(makeCard(it, {})); });
  }

  /* ---------------- global keyboard ---------------- */
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    var playerOpen = $("#player").classList.contains("open");
    if (e.key === "Escape") {
      if ($("#admin").classList.contains("open")) return; // admin handles
      if (playerOpen) closePlayer();
      else if ($("#search").classList.contains("open")) { $("#search").classList.remove("open"); document.body.style.overflow = ""; }
      else if ($("#detail").classList.contains("open")) closeDetail();
      return;
    }
    if (playerOpen) {
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowLeft" || e.key === "j") seek(-10);
      else if (e.key === "ArrowRight" || e.key === "l") seek(10);
      else if (e.key === "f") toggleFullscreen();
      else if (e.key === "m") toggleMute();
      else if (e.key === "n") playNext();
    }
    if (e.key === "/" && !$("#search").classList.contains("open")) { e.preventDefault(); openSearch(); }
  });

  /* ---------------- expose for admin.js ---------------- */
  window.NB = {
    toast: toast,
    esc: esc,
    getContent: function () { return CONTENT; },
    setContent: function (c) { CONTENT = c; },
    save: function () { return (window.Cloud && Cloud.enabled) ? Cloud.save(CONTENT) : DB.saveMeta(CONTENT); },
    isCloud: function () { return !!(window.Cloud && Cloud.enabled); },
    refreshMedia: buildMedia,
    renderAll: renderAll,
    renderStory: renderStory,
    picOf: picOf,
    media: function () { return MEDIA; },
    openDetail: openDetail,
    closeDetail: closeDetail,
    thumbStyle: thumbStyle,
    clone: clone
  };

  document.addEventListener("DOMContentLoaded", boot);
})();
