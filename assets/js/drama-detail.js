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
        border:1px solid rgba(255,255,255,.18);
        background: rgba(255,255,255,.06);
        color:#fff;
        border-radius:12px;
        height:46px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        user-select:none;
        cursor:pointer;
        transition: transform .08s ease, background .12s ease;
      }
      .episode-box:active{ transform: scale(.98); }
      .episode-box[data-vip="1"]{
        opacity:.65;
      }
      .episode-box .vip-badge{
        font-size:10px;
        margin-left:6px;
        padding:2px 6px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,.18);
        background: rgba(0,0,0,.15);
      }
    `;
    document.head.appendChild(st);
  };

  // ====== FETCH JSON via SAME-ORIGIN PROXY ======
  const fetchJson = async (url, { timeoutMs = 15000 } = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });

      const text = await res.text();

      if (!res.ok) {
        // biar gampang debug
        throw new Error(`HTTP ${res.status} :: ${text.slice(0, 120)}`);
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

  // Normalisasi: API kadang array, kadang {data:[]}, {result:[]}, dll
  const normalizeEpisodes = (payload) => {
    if (Array.isArray(payload)) return payload;

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
    ];

    for (const c of candidates) {
      if (Array.isArray(c)) return c;
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

  const epNum = (t, idx) => {
    const s = String(t || "");
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : idx + 1;
  };

  // ====== DETAIL (cover/judul/total/sinopsis tetap) ======
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
      tags.slice(0, 12).forEach((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "genre-pill";
        btn.textContent = t;
        btn.onclick = () => toast(t);
        tagWrap.appendChild(btn);
      });
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
    ensureEpisodeGridStyle();

    // container grid
    const grid = document.createElement("div");
    grid.className = "episode-grid";

    const sorted = episodes.slice().sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0));

    sorted.forEach((ep, i) => {
      const n = epNum(ep.chapterName, i);
      const vip = Number(ep.isCharge || ep.chargeChapter || ep.isVip || 0) ? 1 : 0;

      const box = document.createElement("div");
      box.className = "episode-box";
      box.setAttribute("data-ep", String(n));
      box.setAttribute("data-vip", String(vip));
      box.innerHTML = `${n}${vip ? `<span class="vip-badge">VIP</span>` : ""}`;

      box.onclick = () => {
        location.href = `/drama/watch?bookId=${encodeURIComponent(bookId)}&chapterId=${encodeURIComponent(
          ep.chapterId || ""
        )}&name=${encodeURIComponent(nameFromUrl || "")}`;
      };

      grid.appendChild(box);
    });

    el.list.innerHTML = "";
    el.list.appendChild(grid);

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

    try {
      // PAKAI PROXY VERCEL (same-origin)
      const payload = await fetchJson(`/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`);
      const eps = normalizeEpisodes(payload);

      if (!eps.length) {
        el.list.innerHTML = `<div class="season-empty">Episode tidak ditemukan.</div>`;
        return;
      }

      // cache opsional
      try {
        sessionStorage.setItem(`dramabox_eps_${bookId}`, JSON.stringify(eps));
      } catch {}

      renderEpisodeGrid(eps);
    } catch (e) {
      el.list.innerHTML = `<div class="season-empty">Gagal memuat episode.</div>`;
      toast("Gagal memuat episode");
      // biar kamu gampang cek errornya di console
      console.error("[loadEpisodes] error:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (el.back) el.back.addEventListener("click", () => history.back());

    const saved = getSavedBook();
    buildDetail(saved || { bookName: nameFromUrl, chapterCount: "?", tags: [] });

    // search episode: cocokkan angka episode
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
