// assets/js/detail.js
(() => {
  "use strict";

  // ========= DOM helpers =========
  const $id = (id) => document.getElementById(id);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pick = (...els) => els.find(Boolean);

  const animeDetailContent = pick(
    $id("animeDetailContent"),
    $id("animeDetail"),
    $(".anime-detail"),
    $("[data-detail-content]")
  );
  const episodeList = pick($id("episodeList"), $(".episode-list"));
  const seasonList = pick($id("seasonList"), $(".season-list"));
  const tabEpisodes = pick($id("tabEpisodes"), $('[data-tab="episodes"]'));
  const tabSeasons = pick($id("tabSeasons"), $('[data-tab="seasons"]'));
  const slug = new URLSearchParams(location.search).get("slug");

  // ========= safe wrappers =========
  const toast = (m) => typeof showToast === "function" && showToast(m);
  const isFav = typeof isFavorite === "function" ? isFavorite : () => false;
  const addFav = typeof addFavorite === "function" ? addFavorite : () => {};
  const rmFav = typeof removeFavorite === "function" ? removeFavorite : () => {};

  const isDesktopNow = () => window.matchMedia && window.matchMedia("(min-width: 900px)").matches;

  let episodeSearchWrap = null;

  // ========= remove/hide recommendations (global + season tab) =========
  const hideRecommendations = () => {
    const candidates = [
      $id("recommendationGrid"),
      $id("seasonRecommendationGrid"),
      $(".recommendation-grid"),
      $(".recommendations"),
      $("[data-recommendation]"),
      $("[data-rekomendasi]"),
    ].filter(Boolean);

    candidates.forEach((el) => {
      el.innerHTML = "";
      el.style.display = "none";
      const prev = el.previousElementSibling;
      if (prev && /rekomendasi/i.test(prev.textContent || "")) prev.style.display = "none";
    });

    seasonList &&
      $$(
        ".recommendation,.recommendations,.recommendation-grid,[data-recommendation],[data-rekomendasi]",
        seasonList
      ).forEach((el) => el.remove());
  };

  // ========= Season utils =========
  const cleanBase = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")
      .replace(/subtitle indonesia/g, " ")
      .replace(/\s+eps?\.?\s*\d+.*/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normFull = (t) =>
    cleanBase(t)
      .replace(/season\s*\d+(\s*part\s*\d+)?/g, " ")
      .replace(/\d+(st|nd|rd|th)\s*season/g, " ")
      .replace(/\bpart\s*\d+\b/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normRoot = (t) => {
    const w = normFull(t).split(" ").filter(Boolean);
    return w.length >= 2 ? `${w[0]} ${w[1]}` : w.join(" ");
  };

  const hasSeason = (t) =>
    /season\s*\d+|\d+(st|nd|rd|th)\s*season|\bpart\s*\d+\b/i.test(String(t || ""));

  const seasonNo = (t) => {
    const s = String(t || "").toLowerCase();
    const m = s.match(/season\s*(\d+)/) || s.match(/(\d+)(st|nd|rd|th)\s*season/);
    const n = m ? parseInt(m[1], 10) : 1;
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const seasonTitle = (t) =>
    String(t || "")
      .replace(/\(.*?\)/g, "")
      .replace(/subtitle indonesia/gi, "")
      .replace(/\s+eps?\.?\s*\d+.*/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  // ========= Tabs =========
  const setTab = (showEps) => {
    if (!episodeList || !seasonList || !tabEpisodes || !tabSeasons) return;
    tabEpisodes.classList.toggle("active", showEps);
    tabSeasons.classList.toggle("active", !showEps);
    episodeList.classList.toggle("hidden", !showEps);
    seasonList.classList.toggle("hidden", showEps);
    episodeSearchWrap?.classList.toggle("hidden", !showEps);
  };

  // ========= seasons loader =========
  const setSeasonEmpty = (msg = "Season belum ada") => {
    if (!seasonList) return;
    seasonList.innerHTML = "";
    const div = document.createElement("div");
    div.className = "season-empty";
    div.textContent = msg;
    seasonList.appendChild(div);
  };

  async function loadSeasons(d, currentSlug) {
    if (!seasonList) return;
    seasonList.innerHTML = "";

    const title =
      [d?.english, d?.synonyms, d?.title].map((v) => String(v || "").trim()).find(Boolean) || "";
    if (!title) return setSeasonEmpty();

    const q = normRoot(title) || normFull(title) || title;
    if (!q) return setSeasonEmpty();

    let json;
    try {
      json = await apiGet(`/anime/samehadaku/search?q=${encodeURIComponent(q)}`);
    } catch {
      return;
    }

    const list = Array.isArray(json?.data?.animeList) ? json.data.animeList : [];
    const curF = normFull(title);
    const curR = normRoot(title);

    const related = list.filter((a) => {
      if (!a?.animeId || !a?.title) return false;
      const oF = normFull(a.title);
      const oR = normRoot(a.title);
      return (curF && oF === curF) || (curR && oR === curR);
    });

    const seasonLike = hasSeason(title) || related.some((a) => hasSeason(a.title));
    if (!seasonLike) return setSeasonEmpty();

    const seasons = related
      .filter((a) => a.animeId !== currentSlug)
      .map((a) => ({
        slug: a.animeId,
        title: seasonTitle(a.title),
        poster: a.poster || "",
        n: seasonNo(a.title),
        raw: String(a.title || ""),
      }));

    if (!seasons.length) return setSeasonEmpty();

    seasons.sort((a, b) => a.n - b.n || a.raw.localeCompare(b.raw));

    const frag = document.createDocumentFragment();
    for (const s of seasons) {
      const item = document.createElement("div");
      item.className = "season-item";
      item.innerHTML = `
        <div class="season-thumb"><img alt=""></div>
        <div class="season-info"><div class="season-title"></div></div>
      `;

      const img = $("img", item);
      img.src = s.poster || "/assets/img/placeholder-poster.png";
      img.alt = s.title || "Season";
      img.onerror = () => {
        img.onerror = null;
        img.src = "/assets/img/placeholder-poster.png";
      };

      $(".season-title", item).textContent = s.title || "-";
      item.addEventListener("click", () => {
        location.href = `/anime/detail?slug=${encodeURIComponent(s.slug)}`;
      });

      frag.appendChild(item);
    }
    seasonList.appendChild(frag);

    hideRecommendations();
  }

  // ========= detail loader =========
  async function loadDetail(animeSlug) {
    if (!animeDetailContent) return toast('Element detail tidak ketemu (id "animeDetailContent").');

    let json;
    try {
      json = await apiGet(`/anime/samehadaku/anime/${encodeURIComponent(animeSlug)}`);
    } catch {
      return toast("Gagal memuat detail.");
    }

    const d = json?.status === "success" ? json.data : null;
    if (!d) return toast("Detail tidak ditemukan.");

    const titleMain =
      (d.english && String(d.english).trim()) ||
      (d.synonyms && String(d.synonyms).trim()) ||
      (d.title && String(d.title).trim()) ||
      animeSlug;

    const titleJapanese = d.japanese && String(d.japanese).trim() ? String(d.japanese).trim() : "";

    const scoreVal = d.score?.value != null ? String(d.score.value) : "N/A";
    const eps = Array.isArray(d.episodeList) ? d.episodeList : [];

    // synopsis text
    const paragraphs = Array.isArray(d.synopsis?.paragraphs) ? d.synopsis.paragraphs : [];
    const synText =
      paragraphs.map((s) => String(s || "").trim()).filter(Boolean).join(" ") || "Tidak ada sinopsis.";

    animeDetailContent.innerHTML = `
      <div class="anime-detail-card" style="${d.poster ? `--detail-bg:url('${d.poster}')` : ""}">
        <div class="detail-poster"><img alt="${titleMain}"></div>

        <div class="detail-info">
          <div class="detail-main-title"></div>
          ${titleJapanese ? `<div class="detail-sub"></div>` : ""}
          <div class="detail-meta"></div>

          <div class="detail-genres" id="animeGenres"></div>
          <button type="button" class="genre-toggle" id="animeGenreToggle" style="display:none">Lainnya</button>
        </div>

        <div class="detail-synopsis-box">
          <div class="detail-synopsis-title">Sinopsis</div>
          <p id="synopsisText" class="synopsis synopsis--card"></p>
          <button type="button" class="synopsis-toggle" id="synopsisToggle" style="display:none">Baca selengkapnya</button>
        </div>
      </div>

      <div class="detail-actions">
        <button type="button" class="btn-play" id="animePlayBtn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"></path></svg>
          <span>Putar</span>
        </button>

        <button type="button" class="btn-fav" id="animeFavBtn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4 8.04 4 9.54 4.81 10.35 6.09 11.16 4.81 12.66 4 14.2 4 16.7 4 18.7 6 18.7 8.5c0 3.78-3.4 6.86-8.55 11.54z" fill="currentColor"></path></svg>
          <span class="fav-text" id="animeFavText"></span>
        </button>
      </div>
    `;

    const card = $(".anime-detail-card", animeDetailContent);
    if (d.poster) card?.style.setProperty("--detail-bg", `url("${d.poster}")`);

    const posterImg = $(".detail-poster img", animeDetailContent);
    posterImg.src = d.poster || "/assets/img/placeholder-poster.png";
    posterImg.alt = titleMain;
    posterImg.onerror = () => {
      posterImg.onerror = null;
      posterImg.src = "/assets/img/placeholder-poster.png";
    };

    $(".detail-main-title", animeDetailContent).textContent = titleMain;
    if (titleJapanese) $(".detail-sub", animeDetailContent).textContent = titleJapanese;

    $(".detail-meta", animeDetailContent).innerHTML = `
      <div><span class="label">Rating:</span> ${scoreVal}</div>
      <div><span class="label">Tipe:</span> ${d.type || "-"}</div>
      <div><span class="label">Status:</span> ${d.status || "-"}</div>
      <div><span class="label">Episode:</span> ${d.episodes != null ? d.episodes : "?"}</div>
      <div><span class="label">Rilis:</span> ${d.aired || "-"}</div>
      <div><span class="label">Studio:</span> ${d.studios || "-"}</div>
    `;

    // ===== GENRE (Mobile: Lainnya/Tutup, Desktop: tampil semua tanpa tombol) =====
    const genresWrap = $id("animeGenres");
    const genreToggle = $id("animeGenreToggle");
    const genreList = Array.isArray(d.genreList) ? d.genreList : [];

    const MAX_GENRES_MOBILE = 3;
    let genresExpanded = isDesktopNow(); // desktop langsung expanded

    const renderGenres = () => {
      if (!genresWrap) return;
      genresWrap.innerHTML = "";

      const desktop = isDesktopNow();
      const showAll = desktop || genresExpanded;
      const list = showAll ? genreList : genreList.slice(0, MAX_GENRES_MOBILE);

      const frag = document.createDocumentFragment();
      for (const g of list) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "genre-pill";
        btn.textContent = g?.title || "-";
        btn.addEventListener("click", () => {
          if (!g?.genreId) return;
          location.href = `/anime/genre?slug=${encodeURIComponent(g.genreId)}&name=${encodeURIComponent(
            g.title || ""
          )}`;
        });
        frag.appendChild(btn);
      }
      genresWrap.appendChild(frag);

      if (!genreToggle) return;
      if (desktop || genreList.length <= MAX_GENRES_MOBILE) {
        genreToggle.style.display = "none";
      } else {
        genreToggle.style.display = "inline-block";
        genreToggle.textContent = genresExpanded ? "Tutup" : "Lainnya";
      }
    };

    if (genreToggle) {
      genreToggle.onclick = () => {
        genresExpanded = !genresExpanded;
        renderGenres();
      };
    }
    renderGenres();

    // ===== SINOPSIS (Desktop: full tanpa tombol, Mobile: toggle) =====
    const syn = $id("synopsisText");
    const synToggle = $id("synopsisToggle");
    if (syn) syn.textContent = synText;

    const applySynopsisRule = () => {
      if (!syn || !synToggle) return;
      const desktop = isDesktopNow();

      if (desktop) {
        syn.classList.add("expanded");
        synToggle.style.display = "none";
        return;
      }

      syn.classList.remove("expanded");
      synToggle.textContent = "Baca selengkapnya";
      synToggle.style.display = "none";

      if (synText === "Tidak ada sinopsis.") return;

      synToggle.onclick = () => {
        const expanded = syn.classList.toggle("expanded");
        synToggle.textContent = expanded ? "Tutup" : "Baca selengkapnya";
      };

      requestAnimationFrame(() => {
        const need = syn.scrollHeight > syn.clientHeight + 2;
        synToggle.style.display = need ? "inline-block" : "none";
      });
    };

    applySynopsisRule();

    // play
    $id("animePlayBtn")?.addEventListener("click", () => {
      const first = eps[0];
      if (!first?.episodeId) return;
      location.href = `/anime/episode?slug=${encodeURIComponent(first.episodeId)}`;
    });

    // favorite
    const favText = $id("animeFavText");
    const refreshFav = () => {
      if (!favText) return;
      favText.textContent = isFav(animeSlug) ? "Hapus dari Favorit" : "Favorit";
    };
    refreshFav();

    $id("animeFavBtn")?.addEventListener("click", () => {
      const payload = {
        slug: animeSlug,
        title: titleMain,
        poster: d.poster || "",
        rating: scoreVal !== "N/A" ? scoreVal : "",
        episode_count: d.episodes != null ? String(d.episodes) : "",
        status: d.status || "",
      };
      isFav(animeSlug) ? rmFav(animeSlug) : addFav(payload);
      refreshFav();
    });

    // resize watcher (mobile <-> desktop)
    const mq = window.matchMedia ? window.matchMedia("(min-width: 900px)") : null;
    if (mq) {
      const onChange = () => {
        const desktop = isDesktopNow();
        if (desktop) genresExpanded = true;
        renderGenres();
        applySynopsisRule();
      };

      try {
        mq.addEventListener("change", onChange);
      } catch {
        try {
          mq.addListener(onChange);
        } catch {}
      }
    }

    // episodes + search (tetap sama)
    if (episodeList) {
      episodeList.innerHTML = "";
      const old = $id("episodeSearchWrap");
      old?.parentNode?.removeChild(old);
      episodeSearchWrap = null;

      if (eps.length) {
        const wrap = document.createElement("div");
        wrap.id = "episodeSearchWrap";
        wrap.className = "episode-search-wrap";
        wrap.innerHTML =
          '<input class="episode-search-input" type="text" placeholder="Cari episode... (misal: 5 atau 12)">';

        const input = $("input", wrap);
        input.addEventListener("input", () => {
          const q = input.value.trim().toLowerCase();
          $$(".episode-item", episodeList).forEach((it) => {
            it.style.display = (it.textContent || "").toLowerCase().includes(q) ? "" : "none";
          });
        });

        episodeList.parentNode?.insertBefore(wrap, episodeList);
        episodeSearchWrap = wrap;
        tabSeasons?.classList.contains("active") && wrap.classList.add("hidden");
      }

      const frag = document.createDocumentFragment();
      for (let i = eps.length - 1; i >= 0; i--) {
        const ep = eps[i];
        if (!ep) continue;

        const item = document.createElement("div");
        item.className = "episode-item";
        const epNum = ep.title != null ? ep.title : eps.length - i;
        item.innerHTML = `<span>Episode ${epNum}</span>`;
        item.addEventListener("click", () => {
          if (!ep?.episodeId) return;
          location.href = `/anime/episode?slug=${encodeURIComponent(ep.episodeId)}`;
        });
        frag.appendChild(item);
      }
      episodeList.appendChild(frag);
    }

    // seasons
    loadSeasons(d, animeSlug);

    document.title = `AniKuy - ${titleMain}`;

    hideRecommendations();
  }

  // ========= init =========
  document.addEventListener("DOMContentLoaded", () => {
    if (!slug) return toast("Slug anime tidak ditemukan");

    hideRecommendations(); // ✅ remove rekomendasi (termasuk tab season)

    if (tabEpisodes && tabSeasons && episodeList && seasonList) {
      tabEpisodes.addEventListener("click", () => setTab(true));
      tabSeasons.addEventListener("click", () => {
        setTab(false);
        hideRecommendations();
      });
      setTab(true);
    }

    loadDetail(slug);
  });
})();
