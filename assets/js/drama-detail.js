(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const p = new URLSearchParams(location.search);
  const bookId = p.get("bookId");
  const nameFromUrl = p.get("name") || "";

  const el = {
    detail: $("dramaDetailContent"),
    list: $("dramaEpisodeList"),
    search: $("dramaEpisodeSearchInput"),
    back: $("backButton"),
  };

  const FALLBACK_API_BASE = "https://dramabox.sansekai.my.id";

  /* =======================
     FETCH HELPER
  ======================= */
  const fetchJson = async (url, { timeoutMs = 15000 } = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  };

  const apiGetDrama = async (path) => {
    if (/^https?:\/\//i.test(path)) return fetchJson(path);
    try {
      return await fetchJson(path);
    } catch {
      return fetchJson(new URL(path, FALLBACK_API_BASE).toString());
    }
  };

  /* =======================
     NORMALIZER (FIX UTAMA)
  ======================= */
  const normalizeEpisodes = (res) => {
    if (Array.isArray(res)) return res;
    return (
      res?.data?.list ||
      res?.data?.episodes ||
      res?.data ||
      res?.list ||
      res?.episodes ||
      []
    );
  };

  /* =======================
     AMBIL VIDEO URL
  ======================= */
  const getVideoUrl = (ep) => {
    const cdn =
      ep?.cdnList?.find((c) => c.isDefault) || ep?.cdnList?.[0];
    if (!cdn) return "";

    const video =
      cdn.videoPathList?.find((v) => v.isDefault) ||
      cdn.videoPathList?.find((v) => v.quality === 720) ||
      cdn.videoPathList?.[0];

    return video?.videoPath || "";
  };

  const epNum = (name, idx) => {
    const m = String(name || "").match(/(\d+)/);
    return m ? parseInt(m[1], 10) : idx + 1;
  };

  /* =======================
     LOAD EPISODES (FIXED)
  ======================= */
  async function loadEpisodes() {
    if (!bookId || !el.list) return;

    el.list.innerHTML = `<div class="season-empty">Memuat episode...</div>`;

    let res;
    try {
      res = await apiGetDrama(
        `/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`
      );
    } catch {
      el.list.innerHTML = `<div class="season-empty">Gagal memuat episode.</div>`;
      toast("Gagal memuat episode");
      return;
    }

    const eps = normalizeEpisodes(res);
    if (!eps.length) {
      el.list.innerHTML = `<div class="season-empty">Episode tidak ditemukan.</div>`;
      return;
    }

    const sorted = eps.slice().sort(
      (a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0)
    );

    el.list.innerHTML = "";
    sorted.forEach((ep, i) => {
      const n = epNum(ep.chapterName, i);
      const vip = ep.isCharge ? " • VIP" : "";

      const item = document.createElement("div");
      item.className = "episode-item";
      item.innerHTML = `<span>Episode ${n}${vip}</span>`;

      item.onclick = () => {
        const videoUrl = getVideoUrl(ep);
        if (!videoUrl) {
          toast("Video tidak tersedia");
          return;
        }
        location.href =
          `/drama/watch?video=` +
          encodeURIComponent(videoUrl) +
          `&bookId=${encodeURIComponent(bookId)}` +
          `&chapterId=${encodeURIComponent(ep.chapterId || "")}` +
          `&name=${encodeURIComponent(nameFromUrl)}`;
      };

      el.list.appendChild(item);
    });

    // Putar EP 1
    const firstBtn = $("dramaPlayFirst");
    if (firstBtn) {
      firstBtn.onclick = () => {
        const first = sorted[0];
        const videoUrl = getVideoUrl(first);
        if (!videoUrl) return;
        location.href =
          `/drama/watch?video=` +
          encodeURIComponent(videoUrl) +
          `&bookId=${encodeURIComponent(bookId)}` +
          `&chapterId=${encodeURIComponent(first.chapterId)}` +
          `&name=${encodeURIComponent(nameFromUrl)}`;
      };
    }
  }

  /* =======================
     INIT
  ======================= */
  document.addEventListener("DOMContentLoaded", () => {
    el.back?.addEventListener("click", () => history.back());

    el.search?.addEventListener("input", () => {
      const q = el.search.value.toLowerCase();
      el.list
        ?.querySelectorAll(".episode-item")
        ?.forEach((it) => {
          it.style.display = it.textContent
            .toLowerCase()
            .includes(q)
            ? ""
            : "none";
        });
    });

    loadEpisodes();
  });
})();
