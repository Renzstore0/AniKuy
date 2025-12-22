(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => (typeof showToast === "function" ? showToast(m) : console.log("[toast]", m));

  const p = new URLSearchParams(location.search);
  const bookId = p.get("bookId");
  const nameFromUrl = p.get("name") || "";
  const apiKeyFromUrl = p.get("apiKey") || p.get("apikey") || p.get("key") || "";

  const el = {
    detail: $("dramaDetailContent"),
    list: $("dramaEpisodeList"),
    search: $("dramaEpisodeSearchInput"),
    back: $("backButton"),
  };

  // fallback API (kalau /api/... di server kamu belum nge-proxy)
  const FALLBACK_API_BASE = "https://dramabox.sansekai.my.id";

  // inject style buat grid episode (5 kotak per baris)
  (function injectStyle() {
    if (document.getElementById("episodeGridStyle")) return;
    const s = document.createElement("style");
    s.id = "episodeGridStyle";
    s.textContent = `
      .episode-grid{
        display:grid;
        grid-template-columns:repeat(5,minmax(0,1fr));
        gap:10px;
        margin-top:10px;
      }
      .episode-box{
        width:100%;
        aspect-ratio: 1 / 1;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.06);
        color:#fff;
        font-weight:700;
        letter-spacing:.2px;
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        user-select:none;
        -webkit-tap-highlight-color: transparent;
        transition: transform .06s ease, background .12s ease, border-color .12s ease;
      }
      .episode-box:active{ transform:scale(.98); }
      .episode-box:hover{ background:rgba(255,255,255,.09); border-color:rgba(255,255,255,.22); }
      .episode-box.is-vip{
        border-color: rgba(255,215,0,.35);
        background: rgba(255,215,0,.08);
      }
      .season-empty{
        padding:14px 0;
        opacity:.9;
      }
    `;
    document.head.appendChild(s);
  })();

  const fetchJson = async (url, { timeoutMs = 20000 } = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        headers: {
          Accept: "application/json",
        },
      });

      // biar gampang debug kalau ternyata 404/403 HTML dll
      const text = await res.text();

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        err.body = text?.slice(0, 300);
        throw err;
      }

      try {
        return JSON.parse(text);
      } catch {
        const err = new Error("Response bukan JSON");
        err.body = text?.slice(0, 300);
        throw err;
      }
    } finally {
      clearTimeout(t);
    }
  };

  const withApiKey = (urlStr) => {
    if (!apiKeyFromUrl) return urlStr;
    try {
      const u = new URL(urlStr, location.origin);
      // kirim keduanya biar fleksibel
      if (!u.searchParams.get("apiKey")) u.searchParams.set("apiKey", apiKeyFromUrl);
      if (!u.searchParams.get("apikey")) u.searchParams.set("apikey", apiKeyFromUrl);
      return u.toString();
    } catch {
      return urlStr;
    }
  };

  // coba beberapa endpoint (same-origin dulu, baru fallback domain)
  const tryMany = async (paths) => {
    let lastErr;

    for (const raw of paths) {
      const isAbs = /^https?:\/\//i.test(raw);

      // 1) absolute langsung
      if (isAbs) {
        try {
          return await fetchJson(withApiKey(raw));
        } catch (e) {
          lastErr = e;
          continue;
        }
      }

      // 2) same-origin
      try {
        return await fetchJson(withApiKey(raw));
      } catch (e) {
        lastErr = e;
      }

      // 3) fallback domain
      try {
        const abs = new URL(raw, FALLBACK_API_BASE).toString();
        return await fetchJson(withApiKey(abs));
      } catch (e2) {
        lastErr = e2;
      }
    }

    throw lastErr || new Error("Request gagal");
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

  const extractEpisodeArray = (payload) => {
    if (Array.isArray(payload)) return payload;

    // banyak API suka bungkus di data/list/result/rows
    const candidates = [
      payload?.data,
      payload?.list,
      payload?.result,
      payload?.rows,
      payload?.episodes,
      payload?.items,
    ];

    for (const c of candidates) if (Array.isArray(c)) return c;

    // cari array pertama di level 1
    if (payload && typeof payload === "object") {
      for (const k of Object.keys(payload)) {
        if (Array.isArray(payload[k])) return payload[k];
      }
    }

    return null;
  };

  const extractBook = (payload) => {
    if (!payload || typeof payload !== "object") return null;
    return payload?.data || payload?.result || payload?.book || payload;
  };

  const buildDetail = (b) => {
    if (!el.detail) return;

    const title = b?.bookName || b?.title || nameFromUrl || `Book ${bookId || "-"}`;
    const poster = b?.coverWap || b?.cover || b?.poster || "";
    const intro = b?.introduction || b?.synopsis || b?.desc || "";
    const tags = Array.isArray(b?.tags) ? b.tags : Array.isArray(b?.tagList) ? b.tagList : [];

    const total =
      b?.chapterCount ??
      b?.episodeCount ??
      b?.totalEpisode ??
      b?.totalEpisodes ??
      b?.total ??
      "?";

    el.detail.innerHTML = `
      <div class="anime-detail-card" style="${poster ? `--detail-bg:url('${poster}')` : ""}">
        <div class="detail-poster"><img alt="${title}"></div>
        <div>
          <div class="detail-main-title"></div>
          <div class="detail-meta">
            <div><span class="label">Total Episode:</span> ${total}</div>
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

  const renderEpisodesGrid = (episodes) => {
    if (!el.list) return;

    el.list.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "episode-grid";
    el.list.appendChild(grid);

    const sorted = episodes
      .slice()
      .sort((a, b) => (a?.chapterIndex ?? 0) - (b?.chapterIndex ?? 0));

    sorted.forEach((ep, i) => {
      const n = epNum(ep?.chapterName, i);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "episode-box" + (ep?.isCharge ? " is-vip" : "");
      btn.dataset.ep = String(n);
      btn.textContent = String(n);

      btn.onclick = () => {
        location.href = `/drama/watch?bookId=${encodeURIComponent(bookId)}&chapterId=${encodeURIComponent(
          ep?.chapterId || ""
        )}&name=${encodeURIComponent(nameFromUrl || "")}`;
      };

      grid.appendChild(btn);
    });

    // play first
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

    // search (filter angka episode)
    if (el.search) {
      el.search.addEventListener("input", () => {
        const q = el.search.value.trim();
        const boxes = el.list.querySelectorAll(".episode-box");
        boxes.forEach((b) => {
          const ep = b.dataset.ep || "";
          b.style.display = !q || ep.includes(q) ? "" : "none";
        });
      });
    }
  };

  async function loadEpisodes() {
    if (!bookId) return toast("bookId tidak ditemukan");
    if (!el.list) return;

    el.list.innerHTML = `<div class="season-empty">Memuat episode...</div>`;

    // kalau API lagi rewel, minimal masih bisa tampil dari cache
    const cached = getCachedEpisodes();

    try {
      const paths = [
        `/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`,
        `/api/dramabox/allEpisode?bookId=${encodeURIComponent(bookId)}`,
        `/api/dramabox/episodes?bookId=${encodeURIComponent(bookId)}`,
        `/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`,
        `/dramabox/allEpisode?bookId=${encodeURIComponent(bookId)}`,
      ];

      const payload = await tryMany(paths);
      const eps = extractEpisodeArray(payload);

      if (!eps || !eps.length) {
        if (cached?.length) {
          renderEpisodesGrid(cached);
          toast("API kosong, pakai cache episode");
          return;
        }
        el.list.innerHTML = `<div class="season-empty">Episode tidak ditemukan.</div>`;
        return;
      }

      // cache
      try {
        sessionStorage.setItem(`dramabox_eps_${bookId}`, JSON.stringify(eps));
      } catch {}

      renderEpisodesGrid(eps);
    } catch (e) {
      console.error("loadEpisodes error:", e);

      if (cached?.length) {
        renderEpisodesGrid(cached);
        toast("Gagal load API, pakai cache episode");
        return;
      }

      el.list.innerHTML = `<div class="season-empty">Gagal memuat episode.</div>`;
      toast("Gagal memuat episode");
    }
  }

  async function loadDetailOptional() {
    // tetap tampil dari session dulu biar cover/judul/sinopsis gak hilang
    const saved = getSavedBook();
    buildDetail(saved || { bookName: nameFromUrl, chapterCount: "?", tags: [] });

    // optional: coba ambil detail dari API (kalau ada), kalau gagal ya skip
    if (!bookId) return;

    try {
      const paths = [
        `/api/dramabox/bookdetail?bookId=${encodeURIComponent(bookId)}`,
        `/api/dramabox/detail?bookId=${encodeURIComponent(bookId)}`,
        `/api/dramabox/book?bookId=${encodeURIComponent(bookId)}`,
        `/dramabox/bookdetail?bookId=${encodeURIComponent(bookId)}`,
      ];
      const payload = await tryMany(paths);
      const b = extractBook(payload);
      if (b) buildDetail(b);
    } catch {
      // diam aja, karena udah ada dari session
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (el.back) el.back.addEventListener("click", () => history.back());

    loadDetailOptional();
    loadEpisodes();
  });
})();
