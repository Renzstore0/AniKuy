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

  // API asal (kalau server kamu belum proxy /api/..)
  const FALLBACK_API_BASE = "https://dramabox.sansekai.my.id";

  // CORS proxy (opsional) buat “maksa” request cross-domain kalau kena CORS
  const CORS_PROXY = "https://api.allorigins.win/raw?url=";

  const injectEpisodeGridStyle = () => {
    if (document.getElementById("episodeGridStyle")) return;
    const style = document.createElement("style");
    style.id = "episodeGridStyle";
    style.textContent = `
      .episode-grid{
        display:grid;
        grid-template-columns:repeat(5, minmax(0, 1fr));
        gap:10px;
        padding:10px 2px;
      }
      .ep-box{
        height:44px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.14);
        background:rgba(40,60,120,.25);
        color:#fff;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        cursor:pointer;
        user-select:none;
        -webkit-tap-highlight-color: transparent;
      }
      .ep-box.vip{
        background:rgba(180,120,0,.25);
        border-color:rgba(255,200,80,.25);
      }
      .ep-box:active{ transform:scale(.98); }
    `;
    document.head.appendChild(style);
  };

  const fetchJson = async (url, { timeoutMs = 15000 } = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      // kadang API balikin JSON string tapi ada whitespace/garbage kecil
      const trimmed = (text || "").trim();
      try {
        return JSON.parse(trimmed);
      } catch {
        throw new Error("Response bukan JSON");
      }
    } finally {
      clearTimeout(t);
    }
  };

  const normalizeEpisodePayload = (payload) => {
    if (Array.isArray(payload)) return payload;

    // dukung beberapa bentuk umum: {data:[]}, {result:[]}, {list:[]}
    const maybe =
      payload?.data ||
      payload?.result ||
      payload?.list ||
      payload?.rows ||
      payload?.items ||
      [];

    return Array.isArray(maybe) ? maybe : [];
  };

  const tryFetchFirstSuccess = async (urls) => {
    let lastErr = null;

    for (const u of urls) {
      try {
        const data = await fetchJson(u);
        const eps = normalizeEpisodePayload(data);
        if (Array.isArray(eps) && eps.length) return eps;
        // kalau response valid tapi kosong, lanjut ke kandidat lain
        lastErr = new Error("List kosong");
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr || new Error("Gagal memuat");
  };

  const getSavedBook = () => {
    try {
      if (!bookId) return null;
      const raw = sessionStorage.getItem(`dramabox_book_${bookId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const getCachedEpisodes = () => {
    try {
      if (!bookId) return null;
      const raw = sessionStorage.getItem(`dramabox_eps_${bookId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const epNum = (t, idx) => {
    const s = String(t || "");
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : idx + 1;
  };

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
            <div><span class="label">Total Episode:</span> ${b?.chapterCount ?? "?"}</div>
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

  const renderEpisodeGrid = (episodes) => {
    if (!el.list) return;

    injectEpisodeGridStyle();

    // urutin by chapterIndex kalau ada
    const sorted = episodes
      .slice()
      .sort((a, b) => (a?.chapterIndex ?? 0) - (b?.chapterIndex ?? 0));

    el.list.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "episode-grid";
    el.list.appendChild(grid);

    sorted.forEach((ep, i) => {
      const n = epNum(ep?.chapterName, i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `ep-box${ep?.isCharge ? " vip" : ""}`;
      btn.textContent = String(n);

      btn.onclick = () => {
        location.href = `/drama/watch?bookId=${encodeURIComponent(bookId)}&chapterId=${encodeURIComponent(
          ep?.chapterId || ""
        )}&name=${encodeURIComponent(nameFromUrl || "")}`;
      };

      grid.appendChild(btn);
    });

    // tombol play first
    const firstBtn = $("dramaPlayFirst");
    if (firstBtn) {
      firstBtn.onclick = () => {
        const first = sorted[0];
        if (!first?.chapterId) return;
        location.href = `/drama/watch?bookId=${encodeURIComponent(bookId)}&chapterId=${encodeURIComponent(
          first.chapterId
        )}&name=${encodeURIComponent(nameFromUrl || "")}`;
      };
    }

    // search: filter kotak berdasarkan nomor
    if (el.search) {
      el.search.addEventListener("input", () => {
        const q = el.search.value.trim().toLowerCase();
        grid.querySelectorAll(".ep-box").forEach((b) => {
          const t = (b.textContent || "").toLowerCase();
          b.style.display = t.includes(q) ? "" : "none";
        });
      });
    }
  };

  async function loadEpisodes() {
    if (!bookId) return toast("bookId tidak ditemukan");
    if (!el.list) return;

    el.list.innerHTML = `<div class="season-empty">Memuat episode...</div>`;

    // kandidat endpoint: same-origin dulu (kalau ada proxy), lalu direct, lalu via CORS proxy
    const basePaths = [
      `/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`,
      `/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`,
    ];

    const directTargets = [
      `${FALLBACK_API_BASE}/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`,
      `${FALLBACK_API_BASE}/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`,
    ];

    const corsProxyTargets = directTargets.map(
      (u) => `${CORS_PROXY}${encodeURIComponent(u)}`
    );

    const candidates = [...basePaths, ...directTargets, ...corsProxyTargets];

    try {
      const eps = await tryFetchFirstSuccess(candidates);

      // cache
      try {
        sessionStorage.setItem(`dramabox_eps_${bookId}`, JSON.stringify(eps));
      } catch {}

      renderEpisodeGrid(eps);
    } catch (e) {
      // fallback: pakai cache terakhir kalau ada
      const cached = getCachedEpisodes();
      if (Array.isArray(cached) && cached.length) {
        toast("API error, pakai cache episode");
        renderEpisodeGrid(cached);
        return;
      }

      el.list.innerHTML = `<div class="season-empty">Gagal memuat episode.</div>`;
      toast("Gagal memuat episode");
      // debug biar kamu gampang cek di console
      console.warn("[EpisodeLoadError]", e);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (el.back) el.back.addEventListener("click", () => history.back());

    const saved = getSavedBook();
    // detail jangan hilang (tetap render dari saved/URL)
    buildDetail(saved || { bookName: nameFromUrl, chapterCount: "?", tags: [] });

    loadEpisodes();
  });
})();
