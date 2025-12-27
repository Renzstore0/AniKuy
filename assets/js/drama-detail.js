/* ========= assets/js/detail.js (UPDATED FULL) ========= */
(() => {
  "use strict";

  const $id = (id) => document.getElementById(id);
  const $qs = (sel) => document.querySelector(sel);
  const toast = (m) => typeof window.showToast === "function" && window.showToast(m);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const isDFav =
    typeof window.isDramaFavorite === "function" ? window.isDramaFavorite : () => false;
  const addDFav =
    typeof window.addDramaFavorite === "function" ? window.addDramaFavorite : () => {};
  const rmDFav =
    typeof window.removeDramaFavorite === "function" ? window.removeDramaFavorite : () => {};

  const p = new URLSearchParams(location.search);
  const bookId = p.get("bookId");
  const nameFromUrl = p.get("name") || "";

  // ---- DOM refs ----
  let el = { detail: null, list: null, search: null, back: null };

  const pickEl = (...ids) => {
    for (const id of ids) {
      const node = id ? $id(id) : null;
      if (node) return node;
    }
    return null;
  };

  const pickSel = (...sels) => {
    for (const s of sels) {
      const node = s ? $qs(s) : null;
      if (node) return node;
    }
    return null;
  };

  const hydrateEls = () => {
    el.detail =
      pickEl("dramaDetailContent", "detailContent") ||
      pickSel("[data-drama-detail]", ".drama-detail-content", ".detail-content");

    el.list =
      pickEl(
        "dramaEpisodeList",
        "episodeList",
        "episode-list",
        "episodeContainer",
        "episodes",
        "episodeWrap",
        "episodeMount"
      ) ||
      pickSel(
        "[data-episode-list]",
        ".episode-list",
        ".episodeList",
        "#episode-list",
        "#episodeContainer",
        ".episodes",
        ".episode-container"
      );

    el.search =
      pickEl("dramaEpisodeSearchInput", "episodeSearchInput", "episodeSearch") ||
      pickSel("[data-episode-search]", ".episode-search input", "input.episode-search");

    el.back = pickEl("backButton") || pickSel("[data-back]", ".back-button", ".btn-back");
  };

  const ensureEpisodeMount = () => {
    // re-check dulu
    hydrateEls();
    if (el.list) return;

    const mainMount =
      pickEl("mainContent") ||
      pickSel("#mainContent", "main", "[role='main']") ||
      document.body;

    const mount =
      pickEl("episodeSection", "dramaEpisodeSection") ||
      pickSel("#episodeSection", "[data-episode-section]", ".episode-section") ||
      (el.detail ? el.detail.closest("#mainContent, main, [role='main']") : null) ||
      mainMount;

    // bersihin duplikat kalau sebelumnya kebikin di body
    const old = $id("dramaEpisodeList");
    if (old && old.parentElement && old.parentElement !== mount) {
      try {
        old.remove();
      } catch {}
    }

    const box = document.createElement("div");
    box.id = "dramaEpisodeList";
    box.className = "episode-list";
    box.style.marginTop = "12px";

    mount.appendChild(box);
    el.list = box;
  };

  // ====== STYLE GRID (5 kolom) ======
  const ensureEpisodeGridStyle = () => {
    if (document.getElementById("episodeGridStyle")) return;
    const st = document.createElement("style");
    st.id = "episodeGridStyle";
    st.textContent = `
      .episode-grid{
        display:grid;
        grid-template-columns:repeat(5, minmax(0, 1fr));
        gap:10px;
        padding: 8px 0;
      }
      .episode-box{
        box-sizing:border-box;
        border:1px solid rgba(255,255,255,.18);
        background: rgba(255,255,255,.06);
        color:#fff;
        border-radius:12px;

        height:46px;
        width:100%;
        padding:0;

        display:flex;
        align-items:center;
        justify-content:center;

        font-weight:700;
        font-size:14px;
        line-height:1;
        white-space:nowrap;
        font-variant-numeric: tabular-nums;

        user-select:none;
        cursor:pointer;
        transition: transform .08s ease, background .12s ease, opacity .12s ease;
      }
      .episode-box:active{ transform: scale(.98); }
      .episode-box[data-vip="1"]{ opacity:.65; }
      .episode-box[aria-disabled="true"]{ opacity:.45; cursor: not-allowed; }
      .episode-box .vip-badge{ display:none !important; }
      .season-empty{ opacity:.8; padding:10px 0; }
      .episode-error{ opacity:.9; padding:10px 0; }
      .episode-retry-btn{
        margin-top:8px;
        padding:10px 12px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,.18);
        background: rgba(255,255,255,.08);
        color:#fff;
        cursor:pointer;
        display:inline-flex;
        align-items:center;
        gap:8px;
      }
    `;
    document.head.appendChild(st);
  };

  // ====== RYHAR ONLY (fallback kalau core.js belum kebaca) ======
  const DRAMA_FALLBACK_BASE = "https://api.ryhar.my.id/api/internet/dramabox";
  const LS_DRAMA_KEY = "dramabox_apikey";

  const getDramaApiKey = () => {
    const k =
      (window.DRAMA_APIKEY && String(window.DRAMA_APIKEY).trim()) ||
      (localStorage.getItem(LS_DRAMA_KEY) || "").trim() ||
      "RyAPIs";
    return k;
  };

  const fetchJsonTry = async (url, timeoutMs = 18000) => {
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
        return text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`INVALID_JSON :: ${text.slice(0, 160)}`);
      }
    } finally {
      clearTimeout(t);
    }
  };

  const fetchJson = async (realUrl) => {
    let lastErr = null;
    for (let i = 0; i < 3; i++) {
      try {
        return await fetchJsonTry(realUrl, 18000 + i * 4000);
      } catch (e) {
        lastErr = e;
        await sleep(350 + i * 400);
      }
    }
    throw lastErr || new Error("FETCH_FAILED");
  };

  const apiGetDramaSafe = async (path, params) => {
    if (typeof window.apiGetDrama === "function") return await window.apiGetDrama(path, params);

    const pth = String(path || "");
    const norm = pth.startsWith("/") ? pth : `/${pth}`;
    const url = new URL(DRAMA_FALLBACK_BASE + norm);

    if (params && typeof params === "object") {
      Object.entries(params).forEach(([k, v]) => {
        if (v == null) return;
        url.searchParams.set(String(k), String(v));
      });
    }

    url.searchParams.set("apikey", getDramaApiKey());
    return await fetchJson(url.toString());
  };

  // ---- episode normalize (lebih toleran) ----
  const normalizeEpisodes = (payload) => {
    const p = payload || {};
    const r =
      p.result?.list ||
      p.result?.items ||
      p.result?.chapterList ||
      p.result?.chapters ||
      p.result?.episodeList ||
      p.data?.result?.list ||
      p.data?.result?.items ||
      p.data?.list ||
      p.data?.items ||
      p.episodes ||
      p.list ||
      p.items ||
      p.result ||
      p.data;

    if (Array.isArray(r)) return r;
    if (r && Array.isArray(r.list)) return r.list;
    if (r && Array.isArray(r.items)) return r.items;
    if (r && Array.isArray(r.chapterList)) return r.chapterList;
    if (r && Array.isArray(r.chapters)) return r.chapters;
    return [];
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

  const setSavedBook = (b) => {
    try {
      if (!bookId || !b) return;
      sessionStorage.setItem(`dramabox_book_${bookId}`, JSON.stringify(b));
    } catch {}
  };

  const getCachedEps = () => {
    try {
      if (!bookId) return null;
      const raw = sessionStorage.getItem(`dramabox_eps_${bookId}`);
      const arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  };

  const getEpId = (ep) =>
    ep?.chapterId || ep?.chapterID || ep?.chapter_id || ep?.id || ep?.episodeId || ep?.episode_id || "";

  const epNum = (ep, idx) => {
    const ci = ep?.chapterIndex ?? ep?.index ?? ep?.chapter_index;
    const ciNum = typeof ci === "string" ? Number(ci) : ci;
    if (typeof ciNum === "number" && Number.isFinite(ciNum)) return ciNum + 1;

    const s = String(ep?.chapterName || ep?.name || ep?.title || "");
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : idx + 1;
  };

  const isDesktopNow = () =>
    window.matchMedia && window.matchMedia("(min-width: 900px)").matches;

  // ====== DETAIL ======
  const ensureEpisodeSectionInDetail = () => {
    if (!el.detail) return;
    if ($id("episodeSection")) return;

    const sec = document.createElement("div");
    sec.id = "episodeSection";
    sec.className = "episode-section";
    sec.style.marginTop = "6px";
    el.detail.appendChild(sec);
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

        <div class="detail-info">
          <div class="detail-main-title"></div>
          <div class="detail-meta">
            <div><span class="label">Total Episode:</span> ${b?.chapterCount ?? "?"}</div>
          </div>

          <div class="detail-genres" id="dramaTags"></div>
          <button type="button" class="genre-toggle" id="dramaGenreToggle" style="display:none">Lainnya</button>
        </div>

        <div class="detail-synopsis-box">
          <div class="detail-synopsis-title">Sinopsis</div>
          <p id="dramaSynopsis" class="synopsis synopsis--card"></p>
          <button type="button" class="synopsis-toggle" id="dramaSynToggle" style="display:none">Baca selengkapnya</button>
        </div>
      </div>

      <div class="detail-actions">
        <button type="button" class="btn-play" id="dramaPlayFirst">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"></path></svg>
          <span>Putar EP 1</span>
        </button>

        <button type="button" class="btn-fav" id="dramaFavBtn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4 8.04 4 9.54 4.81 10.35 6.09 11.16 4.81 12.66 4 14.2 4 16.7 4 18.7 6 18.7 8.5c0 3.78-3.4 6.86-8.55 11.54z" fill="currentColor"></path></svg>
          <span class="fav-text" id="dramaFavText"></span>
        </button>
      </div>

      <!-- mount area episode: pasti ada -->
      <div id="episodeSection" class="episode-section"></div>
    `;

    const img = el.detail.querySelector(".detail-poster img");
    img.src = poster || "/assets/img/placeholder-poster.png";
    img.onerror = () => {
      img.onerror = null;
      img.src = "/assets/img/placeholder-poster.png";
    };

    el.detail.querySelector(".detail-main-title").textContent = title;

    // ===== GENRE =====
    const tagWrap = $id("dramaTags");
    const genreToggle = $id("dramaGenreToggle");
    const MAX_TAGS_MOBILE = 3;
    const desktop = isDesktopNow();
    let tagsExpanded = desktop;

    const renderTags = () => {
      if (!tagWrap) return;
      tagWrap.innerHTML = "";

      const list = tagsExpanded ? tags : tags.slice(0, MAX_TAGS_MOBILE);

      list.forEach((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "genre-pill";
        btn.textContent = t;
        btn.onclick = () => toast(t);
        tagWrap.appendChild(btn);
      });

      if (!genreToggle) return;

      if (desktop || tags.length <= MAX_TAGS_MOBILE) {
        genreToggle.style.display = "none";
      } else {
        genreToggle.style.display = "inline-block";
        genreToggle.textContent = tagsExpanded ? "Tutup" : "Lainnya";
      }
    };

    if (genreToggle) {
      genreToggle.onclick = () => {
        tagsExpanded = !tagsExpanded;
        renderTags();
      };
    }
    renderTags();

    // ===== SINOPSIS =====
    const syn = $id("dramaSynopsis");
    const synToggle = $id("dramaSynToggle");
    const synText = intro ? String(intro).trim() : "Tidak ada sinopsis.";
    if (syn) syn.textContent = synText;

    if (syn && synToggle) {
      const desktop2 = isDesktopNow();

      if (desktop2) {
        syn.classList.add("expanded");
        synToggle.style.display = "none";
      } else {
        syn.classList.remove("expanded");
        synToggle.style.display = "none";
        synToggle.textContent = "Baca selengkapnya";

        synToggle.onclick = () => {
          const on = syn.classList.toggle("expanded");
          synToggle.textContent = on ? "Tutup" : "Baca selengkapnya";
        };

        requestAnimationFrame(() => {
          const need = synText !== "Tidak ada sinopsis." && syn.scrollHeight > syn.clientHeight + 2;
          synToggle.style.display = need ? "inline-block" : "none";
        });
      }
    }

    // ===== FAVORIT =====
    const favText = $id("dramaFavText");
    const favBtn = $id("dramaFavBtn");
    const refreshFav = () => {
      if (!favText) return;
      favText.textContent = isDFav(bookId) ? "Hapus dari Favorit" : "Favorit";
    };
    refreshFav();

    favBtn &&
      favBtn.addEventListener("click", () => {
        if (!bookId) return;
        const payload = {
          bookId,
          bookName: title,
          coverWap: poster,
          cover: b?.cover || "",
          chapterCount: b?.chapterCount != null ? String(b.chapterCount) : "",
          tags,
        };
        isDFav(bookId) ? rmDFav(bookId) : addDFav(payload);
        refreshFav();
      });

    // pastikan mount episode sudah ada
    ensureEpisodeSectionInDetail();
  };

  const renderEpisodeGrid = (episodes) => {
    ensureEpisodeGridStyle();
    ensureEpisodeMount();
    if (!el.list) return;

    const grid = document.createElement("div");
    grid.className = "episode-grid";

    const sorted = episodes
      .slice()
      .sort((a, b) => (Number(a?.chapterIndex) || 0) - (Number(b?.chapterIndex) || 0));

    sorted.forEach((ep, i) => {
      const n = epNum(ep, i);
      const vip = Number(ep?.isCharge || ep?.vip || 0) ? 1 : 0;

      const chapterId = getEpId(ep);

      const box = document.createElement("div");
      box.className = "episode-box";
      box.setAttribute("data-ep", String(n));
      box.setAttribute("data-vip", String(vip));
      box.textContent = String(n);

      if (!chapterId) {
        box.setAttribute("aria-disabled", "true");
      } else {
        box.onclick = () => {
          location.href = `/drama/watch?bookId=${encodeURIComponent(
            bookId
          )}&chapterId=${encodeURIComponent(chapterId)}&name=${encodeURIComponent(
            nameFromUrl || ""
          )}`;
        };
      }

      grid.appendChild(box);
    });

    el.list.innerHTML = "";
    el.list.appendChild(grid);

    const firstBtn = $id("dramaPlayFirst");
    if (firstBtn) {
      firstBtn.onclick = () => {
        const first = sorted.find((x) => !!getEpId(x)) || sorted[0];
        const cid = getEpId(first);
        if (!cid) return;
        location.href = `/drama/watch?bookId=${encodeURIComponent(
          bookId
        )}&chapterId=${encodeURIComponent(cid)}&name=${encodeURIComponent(nameFromUrl || "")}`;
      };
    }
  };

  // optional detail API
  async function loadDetailFromApi() {
    if (!bookId) return;
    const candidates = ["/detail", "/bookdetail", "/bookDetail", "/info"];
    for (const path of candidates) {
      try {
        const payload = await apiGetDramaSafe(path, { bookId, id: bookId });
        const book = payload?.result || payload?.data?.result || payload?.data || payload;
        if (book && (book.bookName || book.coverWap || book.cover || book.chapterCount)) {
          setSavedBook(book);
          buildDetail(book);
          return;
        }
      } catch {}
    }
  }

  const showEpisodeError = (msg) => {
    ensureEpisodeGridStyle();
    ensureEpisodeMount();
    if (!el.list) return;

    el.list.innerHTML = `
      <div class="episode-error">${msg || "Gagal memuat episode."}</div>
      <button class="episode-retry-btn" type="button" id="episodeRetryBtn">↻ Muat ulang</button>
    `;
    const btn = $id("episodeRetryBtn");
    if (btn) btn.onclick = () => loadEpisodes();
  };

  async function loadEpisodes() {
    // tunggu DOM “nempel” (buat SPA / render telat)
    for (let t = 0; t < 30; t++) {
      hydrateEls();
      if (el.detail || el.list) break;
      await sleep(100);
    }

    ensureEpisodeGridStyle();
    ensureEpisodeMount();

    if (!bookId) return toast("bookId tidak ditemukan");
    if (!el.list) return toast("Container episode tidak ditemukan");

    el.list.innerHTML = `<div class="season-empty">Memuat episode...</div>`;

    // tampilkan cache dulu
    const cached = getCachedEps();
    if (cached?.length) renderEpisodeGrid(cached);

    const params = { bookId, bookid: bookId, book_id: bookId, id: bookId };

    const EP_PATHS = [
      "/allepisode",
      "/allEpisode",
      "/allEpisodes",
      "/episodes",
      "/episode",
      "/episode/list",
      "/chapters",
      "/chapter",
      "/chapterList",
      "/chapter/list",
      "/season/episode",
    ];

    const maxRound = 5;

    for (let round = 1; round <= maxRound; round++) {
      for (const path of EP_PATHS) {
        try {
          const payload = await apiGetDramaSafe(path, params);
          const eps = normalizeEpisodes(payload);

          if (eps && eps.length) {
            try {
              sessionStorage.setItem(`dramabox_eps_${bookId}`, JSON.stringify(eps));
            } catch {}

            renderEpisodeGrid(eps);
            return;
          }
        } catch (e) {
          // lanjut endpoint berikutnya
        }
      }
      await sleep(650 * round);
    }

    const cached2 = getCachedEps();
    if (cached2?.length) return renderEpisodeGrid(cached2);

    showEpisodeError("Episode gagal dimuat. Coba tombol Muat ulang.");
  }

  const init = () => {
    hydrateEls();

    if (el.back) el.back.addEventListener("click", () => history.back());

    const saved = getSavedBook();
    buildDetail(saved || { bookName: nameFromUrl, chapterCount: "?", tags: [] });

    loadDetailFromApi();

    // search episode
    hydrateEls();
    if (el.search) {
      el.search.addEventListener("input", () => {
        const q = el.search.value.trim().toLowerCase();
        const boxes = el.list?.querySelectorAll(".episode-box") || [];
        boxes.forEach((b) => {
          const n = (b.getAttribute("data-ep") || "").toLowerCase();
          b.style.display = !q || n.includes(q) ? "" : "none";
        });
      });
    }

    loadEpisodes();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
