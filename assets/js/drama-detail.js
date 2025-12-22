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

  // fallback API (kalau /api/... di server kamu belum nge-proxy)
  const FALLBACK_API_BASE = "https://dramabox.sansekai.my.id";

  /* =======================
     FETCH HELPER
  ======================= */
  const fetchJson = async (url, { timeoutMs = 15000 } = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  };

  // Coba same-origin dulu (/api/...), kalau gagal baru fallback ke domain API langsung
  const apiGetDrama = async (path) => {
    if (/^https?:\/\//i.test(path)) return fetchJson(path);
    try {
      return await fetchJson(path);
    } catch {
      return fetchJson(new URL(path, FALLBACK_API_BASE).toString());
    }
  };

  /* =======================
     SAFE PARSE / NORMALIZE
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

  const normalizeBook = (res) => {
    if (!res) return null;
    return res?.data?.book || res?.data || res?.book || res;
  };

  /* =======================
     CACHE
  ======================= */
  const getSavedBook = () => {
    try {
      if (!bookId) return null;
      const raw = sessionStorage.getItem(`dramabox_book_${bookId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  /* =======================
     UI: DETAIL (COVER/JUDUL/TOTAL/SINOPSIS)
  ======================= */
  const buildDetail = (b) => {
    if (!el.detail) return;

    const title = b?.bookName || nameFromUrl || `Book ${bookId || "-"}`;
    const poster = b?.coverWap || b?.cover || "";
    const intro = b?.introduction || "";
    const tags = Array.isArray(b?.tags) ? b.tags : [];

    el.detail.innerHTML = `
      <div class="anime-detail-card" style="${poster ? `--detail-bg:url('${poster}')` : ""}">
        <div class="detail-poster"><img alt="${title}"></div>

        <div>
          <div class="detail-main-title"></div>

          <div class="detail-meta">
            <div><span class="label">Total Episode:</span> ${b?.chapterCount ?? b?.totalEpisode ?? "?"}</div>
          </div>

          <div class="detail-genres" id="dramaTags"></div>
        </div>
      </div>

      <div class="detail-actions">
        <button type="button" class="btn-play" id="dramaPlayFirst">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"></path></svg>
          <span>Putar EP 1</span>
        </button>
      </div>

      <p id="dramaSynopsis" class="synopsis"></p>
    `;

    const img = el.detail.querySelector(".detail-poster img");
    img.src = poster || "/assets/img/placeholder-poster.png";
    img.onerror = () => {
      img.onerror = null;
      img.src = "/assets/img/placeholder-poster.png";
    };

    el.detail.querySelector(".detail-main-title").textContent = title;

    const tagWrap = $("dramaTags");
    if (tagWrap) {
      tagWrap.innerHTML = "";
      if (tags.length) {
        tags.slice(0, 12).forEach((t) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "genre-pill";
          btn.textContent = t;
          btn.onclick = () => toast(t);
          tagWrap.appendChild(btn);
        });
      }
    }

    const syn = $("dramaSynopsis");
    const synText = intro ? String(intro).trim() : "Tidak ada sinopsis.";
    syn.textContent = synText;

    // tombol baca selengkapnya
    if (synText !== "Tidak ada sinopsis.") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "synopsis-toggle";
      btn.textContent = "Baca selengkapnya";
      btn.onclick = () => {
        const on = syn.classList.toggle("expanded");
        btn.textContent = on ? "Tutup" : "Baca selengkapnya";
      };
      el.detail.appendChild(btn);
    }
  };

  /* =======================
     UTIL EPISODE
  ======================= */
  const epNum = (t, idx) => {
    const s = String(t || "");
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : idx + 1;
  };

  const getVideoUrl = (ep) => {
    const cdn = ep?.cdnList?.find((c) => c.isDefault) || ep?.cdnList?.[0];
    if (!cdn) return "";
    const v =
      cdn.videoPathList?.find((x) => x.isDefault) ||
      cdn.videoPathList?.find((x) => x.quality === 720) ||
      cdn.videoPathList?.[0];
    return v?.videoPath || "";
  };

  /* =======================
     LOAD BOOK DETAIL (OPSIONAL)
     - Kalau endpoint kamu belum ada, aman: tetap pakai cache / URL.
  ======================= */
  async function loadBookDetail() {
    const saved = getSavedBook();
    buildDetail(saved || { bookName: nameFromUrl, chapterCount: "?", tags: [] });

    if (!bookId) return;

    // opsional: coba ambil detail dari API (kalau ada)
    // kamu bisa ganti path ini sesuai endpoint detail yang kamu punya
    try {
      const res = await apiGetDrama(
        `/api/dramabox/detail?bookId=${encodeURIComponent(bookId)}`
      );
      const book = normalizeBook(res);
      if (book) {
        try {
          sessionStorage.setItem(`dramabox_book_${bookId}`, JSON.stringify(book));
        } catch {}
        buildDetail(book);
      }
    } catch {
      // abaikan kalau endpoint detail tidak ada
    }
  }

  /* =======================
     LOAD EPISODES (FIXED)
  ======================= */
  async function loadEpisodes() {
    if (!bookId) return toast("bookId tidak ditemukan");
    if (!el.list) return;

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
    if (!Array.isArray(eps) || !eps.length) {
      el.list.innerHTML = `<div class="season-empty">Episode tidak ditemukan.</div>`;
      return;
    }

    // cache (opsional)
    try {
      sessionStorage.setItem(`dramabox_eps_${bookId}`, JSON.stringify(eps));
    } catch {}

    const sorted = eps
      .slice()
      .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0));

    el.list.innerHTML = "";
    sorted.forEach((ep, i) => {
      const item = document.createElement("div");
      item.className = "episode-item";

      const n = epNum(ep.chapterName, i);
      const lock = ep.isCharge ? " • VIP" : "";

      item.innerHTML = `<span>Episode ${n}${lock}</span>`;
      item.onclick = () => {
        const videoUrl = getVideoUrl(ep);
        if (!videoUrl) return toast("Video tidak tersedia");

        location.href =
          `/drama/watch?video=${encodeURIComponent(videoUrl)}` +
          `&bookId=${encodeURIComponent(bookId)}` +
          `&chapterId=${encodeURIComponent(ep.chapterId || "")}` +
          `&name=${encodeURIComponent(nameFromUrl || "")}`;
      };

      el.list.appendChild(item);
    });

    // play first
    const firstBtn = $("dramaPlayFirst");
    if (firstBtn) {
      firstBtn.onclick = () => {
        const first = sorted[0];
        const videoUrl = getVideoUrl(first);
        if (!first?.chapterId || !videoUrl) return toast("Video tidak tersedia");

        location.href =
          `/drama/watch?video=${encodeURIComponent(videoUrl)}` +
          `&bookId=${encodeURIComponent(bookId)}` +
          `&chapterId=${encodeURIComponent(first.chapterId)}` +
          `&name=${encodeURIComponent(nameFromUrl || "")}`;
      };
    }
  }

  /* =======================
     INIT
  ======================= */
  document.addEventListener("DOMContentLoaded", () => {
    if (el.back) el.back.addEventListener("click", () => history.back());

    // episode search
    if (el.search) {
      el.search.addEventListener("input", () => {
        const q = el.search.value.trim().toLowerCase();
        el.list?.querySelectorAll(".episode-item")?.forEach((it) => {
          it.style.display = (it.textContent || "").toLowerCase().includes(q)
            ? ""
            : "none";
        });
      });
    }

    loadBookDetail();
    loadEpisodes();
  });
})();
