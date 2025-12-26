/* ========= assets/js/drama-detail.js ========= */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const isDFav =
    typeof window.isDramaFavorite === "function"
      ? window.isDramaFavorite
      : () => false;
  const addDFav =
    typeof window.addDramaFavorite === "function"
      ? window.addDramaFavorite
      : () => {};
  const rmDFav =
    typeof window.removeDramaFavorite === "function"
      ? window.removeDramaFavorite
      : () => {};

  const p = new URLSearchParams(location.search);
  const bookId = p.get("bookId");
  const nameFromUrl = p.get("name") || "";

  const el = {
    detail: $("dramaDetailContent"),
    list: $("dramaEpisodeList"),
    search: $("dramaEpisodeSearchInput"),
    back: $("backButton"),
  };

  // ====== STYLE GRID (5 kolom) ======
  // ✅ VIP disembunyikan + tombol seragam
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
        transition: transform .08s ease, background .12s ease;
      }
      .episode-box:active{ transform: scale(.98); }

      /* opsional: VIP cuma diredup, tanpa tulisan */
      .episode-box[data-vip="1"]{ opacity:.65; }

      /* ✅ sembunyikan badge VIP kalau masih ada */
      .episode-box .vip-badge{ display:none !important; }
    `;
    document.head.appendChild(st);
  };

  // ====== DRAMA API (Ryhar) + apikey ======
  const DRAMA_BASE = "https://api.ryhar.my.id";

  // ✅ samakan dengan core.js + tetap support key lama
  const LS_DRAMA_KEY = "dramabox_apikey";
  const LS_DRAMA_KEY_OLD = "ryhar_apikey";

  const getDramaApiKey = () => {
    const k =
      (window.DRAMA_APIKEY && String(window.DRAMA_APIKEY).trim()) ||
      (localStorage.getItem(LS_DRAMA_KEY) || "").trim() ||
      (localStorage.getItem(LS_DRAMA_KEY_OLD) || "").trim() ||
      "RyAPIs";
    return k;
  };

  // ====== FETCH JSON (timeout + fallback proxy) ======
  const fetchJsonTry = async (url, timeoutMs = 15000) => {
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

  const apiGetDramaSafe = async (path) => {
    // ✅ kalau core.js sudah define window.apiGetDrama, pakai itu
    // (core.js versi update sudah support path /api/internet/dramabox/* juga)
    if (typeof window.apiGetDrama === "function") return await window.apiGetDrama(path);

    const pth = String(path || "");
    const url = pth.startsWith("/") ? DRAMA_BASE + pth : `${DRAMA_BASE}/${pth}`;
    const join = url.includes("?") ? "&" : "?";
    const full = `${url}${join}apikey=${encodeURIComponent(getDramaApiKey())}`;
    return await fetchJsonWithFallback(full);
  };

  // ====== Normalisasi episode ======
  const normalizeEpisodes = (payload) => {
    if (Array.isArray(payload)) return payload;

    // format ryhar:
    // { success:true, message:"Success", result:[...] }
    if (Array.isArray(payload?.result)) return payload.result;

    // format anabot lama:
    // { success:true, data:{ result:{ chapterList:[...] } } }
    const chapterList = payload?.data?.result?.chapterList;
    if (Array.isArray(chapterList)) return chapterList;

    const candidates = [
      payload?.data,
      payload?.result,
      payload?.list,
      payload?.rows,
      payload?.items,
      payload?.chapterList,
      payload?.episodeList,
      payload?.data?.list,
      payload?.data?.rows,
      payload?.data?.items,
      payload?.data?.result,
      payload?.data?.result?.list,
      payload?.data?.result?.items,
    ];

    for (const c of candidates) {
      if (Array.isArray(c)) return c;
      if (Array.isArray(c?.chapterList)) return c.chapterList;
    }
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

  const epNum = (ep, idx) => {
    const ci = ep?.chapterIndex;
    if (typeof ci === "number" && Number.isFinite(ci)) return ci + 1;

    const s = String(ep?.chapterName || "");
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : idx + 1;
  };

  const isDesktopNow = () =>
    window.matchMedia && window.matchMedia("(min-width: 900px)").matches;

  // ====== DETAIL ======
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
    `;

    const img = el.detail.querySelector(".detail-poster img");
    img.src = poster || "/assets/img/placeholder-poster.png";
    img.onerror = () => {
      img.onerror = null;
      img.src = "/assets/img/placeholder-poster.png";
    };

    el.detail.querySelector(".detail-main-title").textContent = title;

    // ===== GENRE (Mobile: Lainnya/Tutup, Desktop: tampil semua tanpa tombol) =====
    const tagWrap = $("dramaTags");
    const genreToggle = $("dramaGenreToggle");

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

    // ===== SINOPSIS (Desktop: full tanpa tombol, Mobile: toggle) =====
    const syn = $("dramaSynopsis");
    const synToggle = $("dramaSynToggle");
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
          const need =
            synText !== "Tidak ada sinopsis." &&
            syn.scrollHeight > syn.clientHeight + 2;
          synToggle.style.display = need ? "inline-block" : "none";
        });
      }
    }

    // ===== FAVORIT (drama) =====
    const favText = $("dramaFavText");
    const favBtn = $("dramaFavBtn");
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

    // auto update kalau resize mobile/desktop
    const mq = window.matchMedia ? window.matchMedia("(min-width: 900px)") : null;
    if (mq) {
      const onChange = () => {
        const d = isDesktopNow();

        tagsExpanded = d ? true : tagsExpanded;
        renderTags();

        if (syn && synToggle) {
          if (d) {
            syn.classList.add("expanded");
            synToggle.style.display = "none";
          } else {
            syn.classList.remove("expanded");
            requestAnimationFrame(() => {
              const need =
                synText !== "Tidak ada sinopsis." &&
                syn.scrollHeight > syn.clientHeight + 2;
              synToggle.style.display = need ? "inline-block" : "none";
              synToggle.textContent = "Baca selengkapnya";
            });
          }
        }
      };

      try {
        mq.addEventListener("change", onChange);
      } catch {
        try {
          mq.addListener(onChange);
        } catch {}
      }
    }
  };

  const renderEpisodeGrid = (episodes) => {
    if (!el.list) return;
    ensureEpisodeGridStyle();

    const grid = document.createElement("div");
    grid.className = "episode-grid";

    const sorted = episodes
      .slice()
      .sort((a, b) => (Number(a?.chapterIndex) || 0) - (Number(b?.chapterIndex) || 0));

    sorted.forEach((ep, i) => {
      const n = epNum(ep, i);
      const vip = Number(ep?.isCharge || ep?.chargeChapter || ep?.isVip || 0) ? 1 : 0;

      const box = document.createElement("div");
      box.className = "episode-box";
      box.setAttribute("data-ep", String(n));
      box.setAttribute("data-vip", String(vip));
      box.textContent = String(n);

      box.onclick = () => {
        location.href = `/drama/watch?bookId=${encodeURIComponent(
          bookId
        )}&chapterId=${encodeURIComponent(ep?.chapterId || "")}&name=${encodeURIComponent(
          nameFromUrl || ""
        )}`;
      };

      grid.appendChild(box);
    });

    el.list.innerHTML = "";
    el.list.appendChild(grid);

    const firstBtn = $("dramaPlayFirst");
    if (firstBtn) {
      firstBtn.onclick = () => {
        const first = sorted[0];
        if (!first?.chapterId) return;
        location.href = `/drama/watch?bookId=${encodeURIComponent(
          bookId
        )}&chapterId=${encodeURIComponent(first.chapterId)}&name=${encodeURIComponent(
          nameFromUrl || ""
        )}`;
      };
    }
  };

  async function loadEpisodes() {
    if (!bookId) return toast("bookId tidak ditemukan");
    if (!el.list) return;

    el.list.innerHTML = `<div class="season-empty">Memuat episode...</div>`;

    try {
      // ✅ endpoint ryhar: /api/internet/dramabox/allepisode?bookId=<bookId>&apikey=...
      const payload = await apiGetDramaSafe(
        `/api/internet/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`
      );
      const eps = normalizeEpisodes(payload);

      if (!eps.length) {
        el.list.innerHTML = `<div class="season-empty">Episode tidak ditemukan.</div>`;
        return;
      }

      try {
        sessionStorage.setItem(`dramabox_eps_${bookId}`, JSON.stringify(eps));
      } catch {}

      renderEpisodeGrid(eps);
    } catch (e) {
      el.list.innerHTML = `<div class="season-empty">Gagal memuat episode.</div>`;
      toast("Gagal memuat episode");
      console.error("[loadEpisodes] error:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (el.back) el.back.addEventListener("click", () => history.back());

    const saved = getSavedBook();
    buildDetail(saved || { bookName: nameFromUrl, chapterCount: "?", tags: [] });

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
  });
})();
