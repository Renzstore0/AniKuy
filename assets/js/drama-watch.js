(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const el = {
    title: $("dramaWatchTitle"),
    player: $("dramaPlayer"),
    loading: $("dramaLoading"),
    qualityBtn: $("dramaQualityBtn"),
    qualityMenu: $("dramaQualityMenu"),
    qualityLabel: $("dramaQualityLabel"),
    shareBtn: $("dramaShareBtn"),
    backBtn: $("backButton"),
  };

  const closePanels = () => el.qualityMenu?.classList.remove("show");
  const togglePanel = () => el.qualityMenu?.classList.toggle("show");

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".player-toolbar") && !e.target.closest(".dropdown-panel")) closePanels();
  });

  const showLoading = (on, text = "Memuat episode...") => {
    if (!el.loading) return;
    const t = el.loading.querySelector(".txt");
    if (t) t.textContent = text;
    el.loading.classList.toggle("show", !!on);
  };

  const getParams = () => {
    const p = new URLSearchParams(location.search);
    return {
      bookId: p.get("bookId") || "",
      chapterId: p.get("chapterId") || "",
      chapterIndex: p.get("chapterIndex") ? Number(p.get("chapterIndex")) : null,
      name: p.get("name") || "",
    };
  };

  // =========================
  // HOOKS (kamu isi sendiri)
  // =========================
  // window.getDramaEpisodes = async (bookId) => [{chapterId, chapterIndex, ...}, ...]
  // window.getDramaStream   = async ({bookId, chapterIndex, chapterId}) => { videoUrl, qualities:[{quality, videoPath, isDefault}] }
  const fetchEpisodes = async (bookId) => {
    if (typeof window.getDramaEpisodes === "function") return await window.getDramaEpisodes(bookId);

    // fallback kalau kamu masih pakai apiGetDrama (same origin)
    if (typeof window.apiGetDrama === "function") {
      const eps = await window.apiGetDrama(`/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`);
      return Array.isArray(eps) ? eps : [];
    }

    throw new Error("NO_EPISODE_PROVIDER");
  };

  const fetchStream = async ({ bookId, chapterIndex, chapterId }) => {
    if (typeof window.getDramaStream === "function") {
      return await window.getDramaStream({ bookId, chapterIndex, chapterId });
    }

    // fallback contoh (kalau kamu punya endpoint sendiri)
    if (typeof window.apiGetDrama === "function" && chapterIndex != null) {
      return await window.apiGetDrama(
        `/api/dramabox/stream?bookId=${encodeURIComponent(bookId)}&chapterIndex=${encodeURIComponent(chapterIndex)}`
      );
    }

    throw new Error("NO_STREAM_PROVIDER");
  };

  // =========================
  // NORMALIZER
  // =========================
  const normalizeEpisodes = (payload) => {
    if (Array.isArray(payload)) return payload;

    const candidates = [
      payload?.data?.result?.chapterList,
      payload?.data?.chapterList,
      payload?.chapterList,
      payload?.data,
      payload?.result,
      payload?.list,
      payload?.items,
    ];

    for (const c of candidates) {
      if (Array.isArray(c)) return c;
      if (Array.isArray(c?.chapterList)) return c.chapterList;
    }
    return [];
  };

  // stream payload extractor (fleksibel)
  const extractStreamData = (payload) => {
    // paling sering: payload.data.result.data atau payload.data
    const d =
      payload?.data?.result?.data ||
      payload?.data?.data ||
      payload?.data ||
      payload?.result ||
      payload;

    return d || {};
  };

  const buildQualityListFromStream = (streamPayload) => {
    const d = extractStreamData(streamPayload);

    // format A: { qualities:[{quality, videoPath, isDefault}] }
    if (Array.isArray(d?.qualities)) {
      return d.qualities
        .filter((x) => x?.videoPath)
        .map((x) => ({
          q: x.quality ? `${x.quality}p` : "Auto",
          qNum: Number(x.quality) || 0,
          url: x.videoPath,
          isDefault: x.isDefault === 1,
        }))
        .sort((a, b) => (b.qNum - a.qNum) || (b.isDefault - a.isDefault));
    }

    // format B (punyamu lama): episode.cdnList[].videoPathList[]
    // (nggak ada di stream; cuma jaga-jaga)
    const cdn = (d?.cdnList || []).find((c) => c?.isDefault === 1) || (d?.cdnList || [])[0];
    const list = cdn?.videoPathList || [];
    if (Array.isArray(list) && list.length) {
      return list
        .filter((x) => x?.videoPath)
        .map((x) => ({
          q: x.quality ? `${x.quality}p` : "Auto",
          qNum: Number(x.quality) || 0,
          url: x.videoPath,
          isDefault: x.isDefault === 1,
        }))
        .sort((a, b) => (b.qNum - a.qNum) || (b.isDefault - a.isDefault));
    }

    // fallback url tunggal
    if (d?.videoUrl) {
      return [{ q: "Auto", qNum: 0, url: d.videoUrl, isDefault: true }];
    }

    return [];
  };

  const setPlayer = async (url) => {
    if (!el.player) return;
    el.player.pause?.();
    el.player.src = url || "";
    el.player.load();
    try { await el.player.play?.(); } catch {}
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
        showLoading(true, "Ganti kualitas...");
        await setPlayer(it.url);
        showLoading(false);
        renderQuality(qualities, it.url);
        closePanels();
      };
      el.qualityMenu.appendChild(b);
    });
  };

  // =========================
  // PLAYER STATE
  // =========================
  let episodes = [];
  let currentIdx = -1;
  let switching = false;

  const sortEpisodes = (eps) =>
    eps.slice().sort((a, b) => (Number(a?.chapterIndex) || 0) - (Number(b?.chapterIndex) || 0));

  const findIndexFromParams = (eps, { chapterId, chapterIndex }) => {
    const sorted = sortEpisodes(eps);

    if (Number.isFinite(chapterIndex)) {
      const byIndex = sorted.findIndex((x) => Number(x?.chapterIndex) === Number(chapterIndex));
      if (byIndex >= 0) return byIndex;
    }

    if (chapterId) {
      const byId = sorted.findIndex((x) => String(x?.chapterId) === String(chapterId));
      if (byId >= 0) return byId;
    }

    return 0; // default EP pertama
  };

  const pushUrl = ({ bookId, chapterId, chapterIndex, name }) => {
    const u = new URL(location.href);
    u.searchParams.set("bookId", bookId);
    if (chapterId) u.searchParams.set("chapterId", chapterId);
    if (Number.isFinite(chapterIndex)) u.searchParams.set("chapterIndex", String(chapterIndex));
    if (name) u.searchParams.set("name", name);
    history.pushState({ bookId, chapterId, chapterIndex, name }, "", u.toString());
  };

  const updateTitle = (name, epNumber) => {
    if (!el.title) return;
    const base = name ? `Nonton • ${name}` : "Nonton Drama";
    el.title.textContent = epNumber ? `${base} • EP ${epNumber}` : base;
  };

  const playAt = async (idx, { push = true } = {}) => {
    if (switching) return;
    switching = true;

    try {
      const params = getParams();
      const sorted = sortEpisodes(episodes);

      if (!sorted[idx]) {
        toast("Episode tidak ditemukan");
        return;
      }

      currentIdx = idx;
      const ep = sorted[idx];

      const chapterIndex = Number(ep?.chapterIndex);
      const chapterId = ep?.chapterId ? String(ep.chapterId) : params.chapterId;

      // update URL tanpa reload
      if (push) {
        pushUrl({ bookId: params.bookId, chapterId, chapterIndex, name: params.name });
      }

      const epNo = Number.isFinite(chapterIndex) ? chapterIndex + 1 : idx + 1;
      updateTitle(params.name, epNo);

      showLoading(true, "Memuat video...");

      const streamPayload = await fetchStream({
        bookId: params.bookId,
        chapterIndex: Number.isFinite(chapterIndex) ? chapterIndex : params.chapterIndex,
        chapterId,
      });

      const qualities = buildQualityListFromStream(streamPayload);
      if (!qualities.length) {
        toast("Link video tidak tersedia");
        return;
      }

      const active = qualities.find((x) => x.isDefault) || qualities[0];
      el.qualityLabel && (el.qualityLabel.textContent = active.q);

      await setPlayer(active.url);
      renderQuality(qualities, active.url);
    } catch (e) {
      console.error("[playAt] error:", e);
      toast("Gagal memuat video");
    } finally {
      showLoading(false);
      switching = false;
    }
  };

  const playNext = async () => {
    const sorted = sortEpisodes(episodes);
    const next = currentIdx + 1;
    if (next >= sorted.length) return toast("Udah episode terakhir");
    await playAt(next, { push: true });
  };

  // =========================
  // INIT
  // =========================
  async function init() {
    const params = getParams();
    if (!params.bookId) return toast("bookId tidak ditemukan");

    if (el.backBtn) el.backBtn.onclick = () => history.back();

    el.qualityBtn && (el.qualityBtn.onclick = () => togglePanel());

    el.shareBtn &&
      (el.shareBtn.onclick = () =>
        navigator.share
          ? navigator.share({ title: document.title, url: location.href })
          : navigator.clipboard
              .writeText(location.href)
              .then(() => toast("Link disalin"))
              .catch(() => toast("Gagal menyalin link")));

    if (!el.player) return;

    // auto next (tanpa reload)
    el.player.addEventListener("ended", () => {
      // biar nggak “kedip” kalau user klik manual
      playNext().catch(() => {});
    });

    showLoading(true, "Memuat episode...");

    try {
      const raw = await fetchEpisodes(params.bookId);
      episodes = normalizeEpisodes(raw);
      if (!episodes.length) return toast("Episode tidak ditemukan");

      // cache biar cepat
      try {
        sessionStorage.setItem(`dramabox_eps_${params.bookId}`, JSON.stringify(episodes));
      } catch {}

      const idx = findIndexFromParams(episodes, params);
      await playAt(idx, { push: false });
    } catch (e) {
      console.error("[init] error:", e);
      toast("Gagal memuat episode");
    } finally {
      showLoading(false);
    }

    // back/forward browser (tanpa reload)
    window.addEventListener("popstate", async () => {
      const p = getParams();
      const idx = findIndexFromParams(episodes, p);
      await playAt(idx, { push: false });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
