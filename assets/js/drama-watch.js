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
  // FETCH (dengan fallback proxy biar gak mentok CORS)
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
    // yang paling umum:
    // { success:true, data:{ result:{ chapterList:[...] } } }
    const direct = payload?.data?.result?.chapterList;
    if (Array.isArray(direct)) return direct;

    // beberapa variasi:
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
    // contoh response kamu:
    // payload.data.result.data.{ videoUrl, qualities, chapterIndex }
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
  // PLAYER / QUALITY
  // =========================
  const setPlayer = async (url) => {
    if (!el.player) return;
    el.player.pause();
    el.player.src = url || "";
    el.player.load();
    // autoplay kalau browser ngizinin
    try {
      await el.player.play();
    } catch {}
  };

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

    if (baseUrl) {
      return [{ q: "Auto", qNum: 0, url: baseUrl, isDefault: true }];
    }

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
      b.onclick = async () => {
        el.qualityLabel && (el.qualityLabel.textContent = it.q);
        showLoading(true);
        await setPlayer(it.url);
        showLoading(false);
        renderQuality(qualities, it.url);
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
  let isLoadingEp = false;

  const updateTitle = () => {
    const epNo = currentIndex + 1;
    const base = name ? name : "Nonton Drama";
    const t = `EP ${epNo}${chapters.length ? ` / ${chapters.length}` : ""} • ${base}`;
    document.title = `AniKuy - ${t}`;
    if (el.title) el.title.textContent = t;
  };

  const updateUrlState = (idx, push = true) => {
    // kita simpan chapterIndex biar jelas
    const u = new URL(location.href);
    u.searchParams.set("bookId", String(bookId || ""));
    u.searchParams.set("chapterIndex", String(idx));
    if (name) u.searchParams.set("name", name);

    // optional: simpan chapterId juga (kalau ada)
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

    // urutin kalau ada chapterIndex
    chapters = chapters.slice().sort((a, b) => (Number(a?.chapterIndex) || 0) - (Number(b?.chapterIndex) || 0));
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

    // default EP 0
    return 0;
  };

  const fetchStream = async (idx) => {
    const url = buildUrl("stream", { bookId, chapterIndex: idx });
    const payload = await fetchJsonWithFallback(url);
    const data = normalizeStreamData(payload);
    return data;
  };

  const playEpisode = async (idx, { pushState = true } = {}) => {
    if (!el.player) return;
    if (!bookId) return toast("bookId tidak ada");

    if (isLoadingEp) return;
    isLoadingEp = true;

    try {
      idx = Number(idx) || 0;
      if (idx < 0) idx = 0;
      if (chapters.length && idx > chapters.length - 1) idx = chapters.length - 1;

      currentIndex = idx;
      updateTitle();
      updateUrlState(idx, pushState);

      closePanels();
      showLoading(true);

      const streamData = await fetchStream(idx);
      const qualities = buildQualityList(streamData);

      if (!qualities.length) {
        toast("Link video tidak tersedia");
        showLoading(false);
        return;
      }

      const active = qualities.find((x) => x.isDefault) || qualities[0];
      el.qualityLabel && (el.qualityLabel.textContent = active.q);

      await setPlayer(active.url);
      renderQuality(qualities, active.url);

      showLoading(false);
    } catch (e) {
      console.error("[playEpisode] error:", e);
      showLoading(false);
      toast("Gagal memuat episode");
    } finally {
      isLoadingEp = false;
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

    // tombol kualitas
    if (el.qualityBtn) el.qualityBtn.onclick = () => togglePanel();

    // share
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
      el.player.addEventListener("ended", () => {
        // langsung lanjut tanpa reload
        playNext();
      });

      // kalau error player
      el.player.addEventListener("error", () => {
        toast("Video error");
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
