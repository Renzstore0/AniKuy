// assets/js/drama-watch.js
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  // =========================
  // PARAMS
  // =========================
  const p = new URLSearchParams(location.search);
  const bookId = p.get("bookId");
  const name = p.get("name") || "";
  // boleh salah satu: chapterIndex atau chapterId
  const chapterIndexParam = p.get("chapterIndex");
  const chapterIdParam = p.get("chapterId");

  // =========================
  // ELEMENTS
  // =========================
  const el = {
    title: $("dramaWatchTitle"),
    player: $("dramaPlayer"),
    loading: $("dramaLoading"),
    qualityBtn: $("dramaQualityBtn"),
    qualityMenu: $("dramaQualityMenu"),
    qualityLabel: $("dramaQualityLabel"),
    shareBtn: $("dramaShareBtn"),
    back: $("backButton"),
  };

  // =========================
  // CONFIG (ANABOT ONLY)
  // =========================
  const DRAMA_BASE = "https://anabot.my.id/api/search/drama/dramabox";
  const LS_DRAMA_KEY = "dramabox_apikey";

  const getDramaApiKey = () => {
    const k =
      (window.DRAMA_APIKEY && String(window.DRAMA_APIKEY).trim()) ||
      (localStorage.getItem(LS_DRAMA_KEY) || "").trim() ||
      "freeApikey";
    return k;
  };

  const buildUrl = (path, params = {}) => {
    const u = new URL(`${DRAMA_BASE}/${String(path).replace(/^\//, "")}`);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
    u.searchParams.set("apikey", getDramaApiKey());
    return u.toString();
  };

  // =========================
  // FETCH (fallback proxy biar gak mentok CORS)
  // =========================
  const fetchJsonTry = async (url, timeoutMs = 20000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        signal: ctrl.signal,
        headers: { Accept: "application/json,text/plain,*/*" },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} :: ${text.slice(0, 160)}`);

      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Response bukan JSON");
      }
    } finally {
      clearTimeout(t);
    }
  };

  const fetchJsonWithFallback = async (realUrl) => {
    const tries = [
      realUrl,
      `https://corsproxy.io/?${encodeURIComponent(realUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(realUrl)}`,
      `https://cors.isomorphic-git.org/${realUrl}`,
    ];

    let lastErr = null;
    for (const u of tries) {
      try {
        return await fetchJsonTry(u);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("FETCH_FAILED");
  };

  // =========================
  // UI HELPERS
  // =========================
  const showLoading = (on) => {
    if (!el.loading) return;
    el.loading.classList.toggle("show", !!on);
  };

  const closePanels = () => el.qualityMenu?.classList.remove("show");
  const togglePanel = () => el.qualityMenu?.classList.toggle("show");

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".player-toolbar") && !e.target.closest(".dropdown-panel")) closePanels();
  });

  // =========================
  // DATA NORMALIZE
  // =========================
  const normalizeChapterList = (payload) => {
    const direct = payload?.data?.result?.chapterList;
    if (Array.isArray(direct)) return direct;

    const candidates = [
      payload?.data?.chapterList,
      payload?.chapterList,
      payload?.data?.result?.data?.chapterList,
      payload?.data?.data?.chapterList,
      payload?.data,
      payload?.result,
      payload?.list,
      payload?.items,
      payload?.rows,
    ];

    for (const c of candidates) {
      if (Array.isArray(c)) return c;
      if (Array.isArray(c?.chapterList)) return c.chapterList;
    }
    return [];
  };

  const normalizeStreamData = (payload) => {
    return (
      payload?.data?.result?.data ||
      payload?.data?.result ||
      payload?.result ||
      payload?.data ||
      payload ||
      null
    );
  };

  // =========================
  // PLAYER READY WAIT (biar loading ga ilang sebelum bener-bener siap)
  // =========================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const waitPlayerReady = (token, timeoutMs = 35000) =>
    new Promise((resolve, reject) => {
      if (!el.player) return reject(new Error("NO_PLAYER"));

      let done = false;
      const v = el.player;

      const cleanup = () => {
        v.removeEventListener("playing", onOk);
        v.removeEventListener("canplay", onOk);
        v.removeEventListener("loadeddata", onOk);
        v.removeEventListener("error", onErr);
        v.removeEventListener("stalled", onErrSoft);
        v.removeEventListener("abort", onErrSoft);
        clearTimeout(t);
      };

      const finishOk = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve(true);
      };

      const finishErr = (err) => {
        if (done) return;
        done = true;
        cleanup();
        reject(err || new Error("VIDEO_ERROR"));
      };

      const onOk = () => {
        // kalau request udah diganti, jangan resolve
        if (token !== loadToken) return;
        finishOk();
      };

      const onErr = () => finishErr(new Error("VIDEO_ERROR"));
      const onErrSoft = () => {
        // soft error: biar retry yang nangani
        // (biar gak langsung dianggap sukses)
      };

      v.addEventListener("playing", onOk, { once: true });
      v.addEventListener("canplay", onOk, { once: true });
      v.addEventListener("loadeddata", onOk, { once: true });
      v.addEventListener("error", onErr, { once: true });
      v.addEventListener("stalled", onErrSoft, { once: true });
      v.addEventListener("abort", onErrSoft, { once: true });

      const t = setTimeout(() => finishErr(new Error("VIDEO_TIMEOUT")), timeoutMs);
    });

  const setPlayer = async (url, token) => {
    if (!el.player) return;

    const v = el.player;
    v.pause();
    v.src = url || "";
    v.load();

    // coba play supaya buffering jalan (kalau diblok autoplay, tetap lanjut nunggu canplay/loadeddata)
    try {
      await v.play();
    } catch (_) {}

    await waitPlayerReady(token);
  };

  // =========================
  // QUALITY
  // =========================
  const buildQualityList = (streamData) => {
    const qualities = Array.isArray(streamData?.qualities) ? streamData.qualities : [];
    const baseUrl = streamData?.videoUrl;

    const list = qualities
      .filter((x) => x?.videoPath)
      .map((x) => ({
        q: x.quality ? `${x.quality}p` : "Auto",
        qNum: Number(x.quality) || 0,
        url: x.videoPath,
        isDefault: x.isDefault === 1,
      }))
      .sort((a, b) => (b.qNum - a.qNum) || (b.isDefault - a.isDefault));

    if (list.length) return list;
    if (baseUrl) return [{ q: "Auto", qNum: 0, url: baseUrl, isDefault: true }];
    return [];
  };

  const renderQuality = (qualities, activeUrl) => {
    if (!el.qualityMenu) return;

    el.qualityMenu.innerHTML = `<div class="dropdown-title">Pilih Kualitas</div>`;
    if (!qualities.length) {
      el.qualityMenu.innerHTML += `<div class="dropdown-empty">Tidak tersedia</div>`;
      return;
    }

    qualities.forEach((it) => {
      const b = document.createElement("button");
      b.className = "dropdown-item" + (it.url === activeUrl ? " active" : "");
      b.textContent = it.q;

      b.onclick = () => {
        // ganti kualitas tanpa reload, tapi loading nempel sampai ready
        loadVideoUrlWithRetry(it.url, it.q, { preferQualityNum: it.qNum });
        closePanels();
      };

      el.qualityMenu.appendChild(b);
    });
  };

  // =========================
  // STATE
  // =========================
  let chapters = [];
  let currentIndex = 0;

  // token buat cancel request sebelumnya (biar retry ga numpuk)
  let loadToken = 0;

  const updateTitle = () => {
    const epNo = currentIndex + 1;
    const base = name ? name : "Nonton Drama";
    const t = `EP ${epNo}${chapters.length ? ` / ${chapters.length}` : ""} • ${base}`;
    document.title = `AniKuy - ${t}`;
    if (el.title) el.title.textContent = t;
  };

  const updateUrlState = (idx, push = true) => {
    const u = new URL(location.href);
    u.searchParams.set("bookId", String(bookId || ""));
    u.searchParams.set("chapterIndex", String(idx));
    if (name) u.searchParams.set("name", name);

    const ep = chapters[idx];
    if (ep?.chapterId) u.searchParams.set("chapterId", String(ep.chapterId));

    const st = { bookId, chapterIndex: idx, name };
    if (push) history.pushState(st, "", u.toString());
    else history.replaceState(st, "", u.toString());
  };

  // =========================
  // LOADERS
  // =========================
  const loadChapters = async () => {
    const url = buildUrl("chapter", { id: bookId });
    const payload = await fetchJsonWithFallback(url);
    chapters = normalizeChapterList(payload);

    chapters = chapters
      .slice()
      .sort((a, b) => (Number(a?.chapterIndex) || 0) - (Number(b?.chapterIndex) || 0));
  };

  const resolveInitialIndex = () => {
    if (chapterIndexParam != null && chapterIndexParam !== "") {
      const n = Number(chapterIndexParam);
      if (Number.isFinite(n) && n >= 0) return n;
    }

    if (chapterIdParam && chapters.length) {
      const i = chapters.findIndex((x) => String(x?.chapterId) === String(chapterIdParam));
      if (i >= 0) return Number(chapters[i]?.chapterIndex) || i;
    }

    return 0;
  };

  const fetchStream = async (idx) => {
    const url = buildUrl("stream", { bookId, chapterIndex: idx });
    const payload = await fetchJsonWithFallback(url);
    return normalizeStreamData(payload);
  };

  // =========================
  // RETRY ENGINE (loading terus sampai bener-bener sukses / request diganti)
  // =========================
  let lastQualities = [];
  let lastActiveUrl = "";

  const pickQualityByNum = (qualities, qNum) => {
    if (!qualities?.length) return null;
    const exact = qualities.find((x) => Number(x.qNum) === Number(qNum));
    return exact || null;
  };

  const playEpisode = async (idx, { pushState = true, preferQualityNum = null } = {}) => {
    if (!el.player) return;
    if (!bookId) return toast("bookId tidak ada");

    // cancel request sebelumnya
    const token = ++loadToken;

    idx = Number(idx) || 0;
    if (idx < 0) idx = 0;
    if (chapters.length && idx > chapters.length - 1) idx = chapters.length - 1;

    currentIndex = idx;
    updateTitle();
    updateUrlState(idx, pushState);

    closePanels();
    showLoading(true);

    let attempt = 0;
    let delay = 800; // start cepat

    while (token === loadToken) {
      attempt++;

      try {
        const streamData = await fetchStream(idx);
        const qualities = buildQualityList(streamData);

        if (!qualities.length) throw new Error("NO_VIDEO_URL");

        // pilih kualitas: kalau user minta qNum tertentu -> ambil itu, kalau gak -> default/pertama
        const byPref = preferQualityNum != null ? pickQualityByNum(qualities, preferQualityNum) : null;
        const active = byPref || qualities.find((x) => x.isDefault) || qualities[0];

        el.qualityLabel && (el.qualityLabel.textContent = active.q);

        // simpan biar quality menu tetap konsisten
        lastQualities = qualities;
        lastActiveUrl = active.url;

        await setPlayer(active.url, token);

        // sukses beneran (canplay/loadeddata/playing)
        renderQuality(qualities, active.url);
        showLoading(false);
        return;
      } catch (e) {
        console.warn("[playEpisode retry] attempt:", attempt, e);

        // tetep loading, dan retry terus
        if (attempt === 1) toast("Memuat episode...");
        // backoff biar ga spam server
        await sleep(delay);
        delay = Math.min(Math.floor(delay * 1.6), 12000);
      }
    }
  };

  const loadVideoUrlWithRetry = async (url, label, { preferQualityNum = null } = {}) => {
    if (!el.player) return;

    // cancel request sebelumnya
    const token = ++loadToken;

    closePanels();
    showLoading(true);
    if (el.qualityLabel && label) el.qualityLabel.textContent = label;

    let attempt = 0;
    let delay = 800;

    while (token === loadToken) {
      attempt++;

      try {
        // coba pakai URL yang dipilih dulu
        await setPlayer(url, token);

        // sukses
        lastActiveUrl = url;
        if (lastQualities?.length) renderQuality(lastQualities, url);
        showLoading(false);
        return;
      } catch (e) {
        console.warn("[quality retry] attempt:", attempt, e);

        // kalau url sign expired / error, refetch stream biar dapat url baru
        try {
          const streamData = await fetchStream(currentIndex);
          const qualities = buildQualityList(streamData);
          lastQualities = qualities;

          const byPref = preferQualityNum != null ? pickQualityByNum(qualities, preferQualityNum) : null;
          const active = byPref || qualities.find((x) => x.isDefault) || qualities[0];

          url = active?.url || url;
          if (el.qualityLabel && active?.q) el.qualityLabel.textContent = active.q;
        } catch (_) {
          // abaikan, nanti retry loop lanjut
        }

        if (attempt === 1) toast("Memuat ulang...");
        await sleep(delay);
        delay = Math.min(Math.floor(delay * 1.6), 12000);
      }
    }
  };

  const playNext = async () => {
    if (chapters.length && currentIndex >= chapters.length - 1) {
      toast("Episode terakhir");
      return;
    }
    await playEpisode(currentIndex + 1, { pushState: true });
  };

  // =========================
  // INIT
  // =========================
  async function init() {
    if (el.back) el.back.addEventListener("click", () => history.back());

    if (!bookId) {
      toast("Parameter bookId tidak ada");
      return;
    }

    if (el.qualityBtn) el.qualityBtn.onclick = () => togglePanel();

    if (el.shareBtn) {
      el.shareBtn.onclick = () =>
        navigator.share
          ? navigator.share({ title: document.title, url: location.href })
          : navigator.clipboard
              .writeText(location.href)
              .then(() => toast("Link disalin"))
              .catch(() => toast("Gagal menyalin link"));
    }

    // auto next saat selesai
    if (el.player) {
      el.player.addEventListener("ended", () => playNext());

      // kalau error video, biar reload stream & retry otomatis (loader tetap nyala)
      el.player.addEventListener("error", () => {
        // panggil ulang episode yang sama (akan retry sampai sukses)
        playEpisode(currentIndex, { pushState: false });
      });
    }

    try {
      showLoading(true);
      await loadChapters();
      const idx = resolveInitialIndex();
      updateUrlState(idx, false);
      await playEpisode(idx, { pushState: false });
    } catch (e) {
      console.error("[init] error:", e);
      // jangan matiin loading permanen kalau masih bisa retry,
      // tapi kalau chapter list gagal total, ya kasih notif
      showLoading(false);
      toast("Gagal memuat episode");
    }

    // handle back/forward browser (tanpa reload)
    window.addEventListener("popstate", () => {
      const sp = new URLSearchParams(location.search);
      const idx = Number(sp.get("chapterIndex") || 0);
      playEpisode(idx, { pushState: false });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
