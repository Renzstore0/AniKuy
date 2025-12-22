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

  const buildDetail = (b) => {
    if (!el.detail) return;

    const title = b?.bookName || nameFromUrl || `Book ${bookId || "-"}`;
    const poster = b?.coverWap || b?.cover || "";
    const intro = b?.introduction || "";
    const tags = Array.isArray(b?.tags) ? b.tags : [];

    el.detail.innerHTML = `
      <div class="anime-detail-card" style="${poster ? `--detail-bg:url('${poster}')` : ""}">
        <div class="detail-poster"><img alt=""></div>
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
    if (tagWrap && tags.length) {
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

  async function loadEpisodes() {
    if (!bookId) return toast("bookId tidak ditemukan");
    if (!el.list) return;

    let eps;
    try {
      eps = await apiGetDrama(`/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`);
    } catch {
      return;
    }

    if (!Array.isArray(eps) || !eps.length) {
      el.list.innerHTML = `<div class="season-empty">Episode tidak ditemukan.</div>`;
      return;
    }

    // simpan biar watch page bisa ambil lebih cepat (opsional)
    try {
      sessionStorage.setItem(`dramabox_eps_${bookId}`, JSON.stringify(eps));
    } catch {}

    el.list.innerHTML = "";
    eps
      .slice()
      .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0))
      .forEach((ep, i) => {
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
    firstBtn &&
      (firstBtn.onclick = () => {
        const first = eps
          .slice()
          .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0))[0];
        if (!first?.chapterId) return;
        location.href = `/drama/watch?bookId=${encodeURIComponent(bookId)}&chapterId=${encodeURIComponent(
          first.chapterId
        )}&name=${encodeURIComponent(nameFromUrl || "")}`;
      });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const saved = getSavedBook();
    buildDetail(saved || { bookName: nameFromUrl, chapterCount: "?", tags: [] });

    // episode search
    el.search &&
      el.search.addEventListener("input", () => {
        const q = el.search.value.trim().toLowerCase();
        el.list?.querySelectorAll(".episode-item")?.forEach((it) => {
          it.style.display = (it.textContent || "").toLowerCase().includes(q) ? "" : "none";
        });
      });

    loadEpisodes();
  });
})();
