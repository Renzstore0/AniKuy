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

  // inject CSS grid episode (5 kotak per baris)
  const injectStyle = () => {
    if (document.getElementById("episodeGridStyle")) return;
    const st = document.createElement("style");
    st.id = "episodeGridStyle";
    st.textContent = `
      .episode-grid{
        display:grid;
        grid-template-columns:repeat(5, minmax(0, 1fr));
        gap:10px;
        padding: 6px 2px 2px;
      }
      .episode-box{
        height:48px;
        border-radius:12px;
        border:1px solid rgba(120,160,255,.35);
        background: rgba(20,28,60,.35);
        color:#e9f0ff;
        font-weight:700;
        font-size:14px;
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        user-select:none;
        -webkit-tap-highlight-color: transparent;
      }
      .episode-box:active{
        transform: scale(.98);
      }
      .episode-box.is-hidden{ display:none; }

      /* biar tetap enak di HP kecil */
      @media (max-width: 380px){
        .episode-grid{ gap:8px; }
        .episode-box{ height:44px; border-radius:10px; }
      }
    `;
    document.head.appendChild(st);
  };

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

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Response bukan JSON");
      }
    } finally {
      clearTimeout(t);
    }
  };

  // same-origin dulu (/api/...), kalau gagal baru fallback ke domain API langsung
  const apiGetDrama = async (path) => {
    const isAbsolute = /^https?:\/\//i.test(path);
    if (isAbsolute) return fetchJson(path);

    try {
      return await fetchJson(path);
    } catch {
      const url = new URL(path, FALLBACK_API_BASE).toString();
      return fetchJson(url);
    }
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

  // unwrap response: {data:[...]}, {result:[...]}, {list:[...]} dll
  const unwrap = (x) => {
    if (!x) return x;

    if (typeof x === "string") {
      try {
        return JSON.parse(x);
      } catch {
        return x;
      }
    }

    if (Array.isArray(x)) return x;

    if (typeof x === "object") {
      const keys = ["data", "result", "results", "list", "rows", "items", "episodes", "chapterList"];
      for (const k of keys) {
        if (k in x) return unwrap(x[k]);
      }
    }

    return x;
  };

  const normalizeEpisodes = (resp) => {
    const u = unwrap(resp);
    return Array.isArray(u) ? u : [];
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

  const renderEpisodesGrid = (eps) => {
    if (!el.list) return;

    injectStyle();

    if (!Array.isArray(eps) || !eps.length) {
      el.list.innerHTML = `<div class="season-empty">Episode tidak ditemukan.</div>`;
      return;
    }

    // urutkan
    const sorted = eps.slice().sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0));

    // wrapper grid
    el.list.innerHTML = `<div class="episode-grid" id="episodeGrid"></div>`;
    const grid = $("episodeGrid");
    if (!grid) return;

    // bikin kotak angka episode
    sorted.forEach((ep, i) => {
      const n = epNum(ep.chapterName, i);

      const box = document.createElement("div");
      box.className = "episode-box";
      box.textContent = String(n);
      box.dataset.ep = String(n);

      box.onclick = () => {
        const chapterId = ep.chapterId || "";
        if (!chapterId) return toast("chapterId kosong");
        location.href = `/drama/watch?bookId=${encodeURIComponent(bookId)}&chapterId=${encodeURIComponent(
          chapterId
        )}&name=${encodeURIComponent(nameFromUrl || "")}`;
      };

      grid.appendChild(box);
    });

    // tombol putar ep1
    const firstBtn = $("dramaPlayFirst");
    if (firstBtn) {
      firstBtn.onclick = () => {
        const first = sorted[0];
        const chapterId = first?.chapterId;
        if (!chapterId) return toast("chapterId kosong");
        location.href = `/drama/watch?bookId=${encodeURIComponent(bookId)}&chapterId=${encodeURIComponent(
          chapterId
        )}&name=${encodeURIComponent(nameFromUrl || "")}`;
      };
    }
  };

  async function loadEpisodes() {
    if (!bookId) return toast("bookId tidak ditemukan");
    if (!el.list) return;

    el.list.innerHTML = `<div class="season-empty">Memuat episode...</div>`;

    const candidates = [
      `/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`,
      `/api/dramabox/allEpisode?bookId=${encodeURIComponent(bookId)}`,
      `/api/dramabox/episodes?bookId=${encodeURIComponent(bookId)}`,
      `/api/dramabox/episode?bookId=${encodeURIComponent(bookId)}`,
      `/api/dramabox/chapterList?bookId=${encodeURIComponent(bookId)}`,
    ];

    let lastErr = null;
    let eps = null;

    for (const url of candidates) {
      try {
        const resp = await apiGetDrama(url);
        const arr = normalizeEpisodes(resp);
        if (Array.isArray(arr) && arr.length) {
          eps = arr;
          break;
        }
      } catch (e) {
        lastErr = e;
      }
    }

    if (!eps || !eps.length) {
      const cached = getCachedEpisodes();
      if (Array.isArray(cached) && cached.length) {
        toast("Gagal load dari server, pakai cache");
        renderEpisodesGrid(cached);
        return;
      }

      el.list.innerHTML = `<div class="season-empty">Gagal memuat episode.</div>`;
      toast("Gagal memuat episode");
      if (lastErr) console.warn("loadEpisodes error:", lastErr);
      return;
    }

    // cache
    try {
      sessionStorage.setItem(`dramabox_eps_${bookId}`, JSON.stringify(eps));
    } catch {}

    renderEpisodesGrid(eps);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // back
    if (el.back) el.back.addEventListener("click", () => history.back());

    // detail (cover/judul/total/sinopsis tetap)
    const saved = getSavedBook();
    buildDetail(saved || { bookName: nameFromUrl, chapterCount: "?", tags: [] });

    // search (filter kotak episode berdasarkan angka)
    if (el.search) {
      el.search.addEventListener("input", () => {
        const q = el.search.value.trim();
        const grid = $("episodeGrid");
        if (!grid) return;

        const boxes = grid.querySelectorAll(".episode-box");
        if (!q) {
          boxes.forEach((b) => b.classList.remove("is-hidden"));
          return;
        }

        boxes.forEach((b) => {
          const ep = b.dataset.ep || "";
          b.classList.toggle("is-hidden", !ep.includes(q));
        });
      });
    }

    loadEpisodes();
  });
})();
