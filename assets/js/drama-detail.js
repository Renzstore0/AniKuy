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

  // fallback API (kalau /api/... di server kamu belum nge-proxy / kena CORS)
  const FALLBACK_API_BASE = "https://dramabox.sansekai.my.id";

  const safeText = (s) => String(s ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  }[c]));

  const fetchJson = async (url, { timeoutMs = 20000 } = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        signal: ctrl.signal,
        headers: { "Accept": "application/json, text/plain, */*" },
      });

      const text = await res.text();
      if (!res.ok) {
        const preview = text ? text.slice(0, 140).replace(/\s+/g, " ") : "";
        throw new Error(`HTTP ${res.status}${preview ? ` • ${preview}` : ""}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Response bukan JSON");
      }
    } finally {
      clearTimeout(t);
    }
  };

  // bikin beberapa kandidat URL (same-origin + beberapa variasi fallback)
  const buildCandidates = (path) => {
    const isAbsolute = /^https?:\/\//i.test(path);
    if (isAbsolute) return [path];

    const norm = path.startsWith("/") ? path : `/${path}`;

    // strip "/api" buat server fallback yang tidak pakai prefix /api
    const strippedApi = norm.replace(/^\/api(?=\/)/i, "");
    const strippedApi2 = norm.replace(/^\/api\/dramabox(?=\/)/i, "/dramabox");

    const uniq = (arr) => [...new Set(arr.filter(Boolean))];

    return uniq([
      norm, // 1) same-origin
      new URL(norm, FALLBACK_API_BASE).toString(), // 2) fallback dengan path asli
      new URL(strippedApi, FALLBACK_API_BASE).toString(), // 3) fallback buang /api
      new URL(strippedApi2, FALLBACK_API_BASE).toString(), // 4) fallback buang /api/ dramabox
    ]);
  };

  const apiGetDrama = async (path, opt) => {
    const candidates = buildCandidates(path);
    let lastErr;

    for (const url of candidates) {
      try {
        return await fetchJson(url, opt);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Gagal request");
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
      <div class="anime-detail-card" style="${poster ? `--detail-bg:url('${safeText(poster)}')` : ""}">
        <div class="detail-poster"><img alt="${safeText(title)}"></div>
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

    // tombol baca selengkapnya (sinopsis tetap ada, tidak dihapus)
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

  const renderEpisodes = (eps) => {
    if (!el.list) return;

    if (!Array.isArray(eps) || !eps.length) {
      el.list.innerHTML = `<div class="season-empty">Episode tidak ditemukan.</div>`;
      return;
    }

    const sorted = eps.slice().sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0));

    el.list.innerHTML = "";
    sorted.forEach((ep, i) => {
      const item = document.createElement("div");
      item.className = "episode-item";

      const n = epNum(ep.chapterName, i);
      const lock = ep.isCharge ? " • VIP" : "";

      item.innerHTML = `<span>Episode ${n}${lock}</span>`;
      item.onclick = () => {
        location.href = `/drama/watch?bookId=${encodeURIComponent(bookId)}&chapterId=${encodeURIComponent(
          ep.chapterId || ""
        )}&name=${encodeURIComponent(nameFromUrl || "")}`;
      };

      el.list.appendChild(item);
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
  };

  async function loadEpisodes() {
    if (!bookId) return toast("bookId tidak ditemukan");
    if (!el.list) return;

    el.list.innerHTML = `<div class="season-empty">Memuat episode...</div>`;

    // 1) coba API
    try {
      const eps = await apiGetDrama(`/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`);
      // cache (buat jaga-jaga kalau nanti API down)
      try {
        sessionStorage.setItem(`dramabox_eps_${bookId}`, JSON.stringify(eps));
      } catch {}
      renderEpisodes(eps);
      return;
    } catch (e) {
      // lanjut ke cache
      console.warn("[allepisode] gagal:", e);
    }

    // 2) fallback cache (biar list tetap muncul)
    const cached = getCachedEpisodes();
    if (cached && Array.isArray(cached) && cached.length) {
      renderEpisodes(cached);
      toast("Pakai cache episode (API lagi error)");
      return;
    }

    // 3) gagal total
    el.list.innerHTML = `<div class="season-empty">Gagal memuat episode.</div>`;
    toast("Gagal memuat episode");
  }

  document.addEventListener("DOMContentLoaded", () => {
    // back fallback
    if (el.back) el.back.addEventListener("click", () => history.back());

    // detail tetap tampil (ambil dari sessionStorage / url)
    const saved = getSavedBook();
    buildDetail(saved || { bookName: nameFromUrl, chapterCount: "?", tags: [] });

    // episode search
    if (el.search) {
      el.search.addEventListener("input", () => {
        const q = el.search.value.trim().toLowerCase();
        el.list?.querySelectorAll(".episode-item")?.forEach((it) => {
          it.style.display = (it.textContent || "").toLowerCase().includes(q) ? "" : "none";
        });
      });
    }

    loadEpisodes();
  });
})();
