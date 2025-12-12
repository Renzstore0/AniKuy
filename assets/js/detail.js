// assets/js/detail.js
(() => {
  "use strict";

  // ========= DOM helpers =========
  const $id = (id) => document.getElementById(id);
  const $ = (sel) => document.querySelector(sel);
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
  const toast = (msg) =>
    typeof window.showToast === "function" && window.showToast(msg);

  const isFav =
    typeof window.isFavorite === "function" ? window.isFavorite : () => false;
  const addFav =
    typeof window.addFavorite === "function" ? window.addFavorite : () => {};
  const rmFav =
    typeof window.removeFavorite === "function"
      ? window.removeFavorite
      : () => {};

  let episodeSearchWrap = null;

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
    /season\s*\d+|\d+(st|nd|rd|th)\s*season|\bpart\s*\d+\b/i.test(
      String(t || "")
    );

  const seasonNo = (t) => {
    const s = String(t || "").toLowerCase();
    const m =
      s.match(/season\s*(\d+)/) || s.match(/(\d+)(st|nd|rd|th)\s*season/);
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
  const setTab = (showEpisodes) => {
    if (!episodeList || !seasonList || !tabEpisodes || !tabSeasons) return;
    tabEpisodes.classList.toggle("active", showEpisodes);
    tabSeasons.classList.toggle("active", !showEpisodes);
    episodeList.classList.toggle("hidden", !showEpisodes);
    seasonList.classList.toggle("hidden", showEpisodes);
    episodeSearchWrap?.classList.toggle("hidden", !showEpisodes);
  };

  // ========= Load seasons =========
  async function loadSeasons(detail, detailSlug) {
    if (!seasonList) return;

    const setEmpty = (msg = "Season belum ada") => {
      seasonList.innerHTML = "";
      const div = document.createElement("div");
      div.className = "season-empty";
      div.textContent = msg;
      seasonList.appendChild(div);
    };

    seasonList.innerHTML = "";

    const title =
      [detail?.english, detail?.synonyms, detail?.title]
        .map((v) => String(v || "").trim())
        .find(Boolean) || "";

    if (!title) return setEmpty();

    const q = normRoot(title) || normFull(title) || title;
    if (!q) return setEmpty();

    let json;
    try {
      json = await apiGet(
        `/anime/samehadaku/search?q=${encodeURIComponent(q)}`
      );
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
    if (!seasonLike) return setEmpty();

    const seasons = related
      .filter((a) => a.animeId !== detailSlug)
      .map((a) => ({
        slug: a.animeId,
        title: seasonTitle(a.title),
        poster: a.poster || "",
        n: seasonNo(a.title),
        raw: String(a.title || ""),
      }));

    if (!seasons.length) return setEmpty();

    seasons.sort((a, b) => (a.n - b.n) || a.raw.localeCompare(b.raw));

    const frag = document.createDocumentFragment();
    for (const s of seasons) {
      const item = document.createElement("div");
      item.className = "season-item";
      item.innerHTML = `
        <div class="season-thumb"><img alt=""></div>
        <div class="season-info"><div class="season-title"></div></div>
      `;

      const img = item.querySelector("img");
      img.src = s.poster || "/assets/img/placeholder-poster.png";
      img.alt = s.title || "Season";
      img.onerror = () => {
        img.onerror = null;
        img.src = "/assets/img/placeholder-poster.png";
      };

      item.querySelector(".season-title").textContent = s.title || "-";
      item.addEventListener("click", () => {
        location.href = `/anime/detail?slug=${encodeURIComponent(s.slug)}`;
      });

      frag.appendChild(item);
    }
    seasonList.appendChild(frag);
  }

  // ========= Load detail =========
  async function loadDetail(animeSlug) {
    if (!animeDetailContent)
      return toast('Element detail tidak ketemu (id "animeDetailContent").');

    let json;
    try {
      json = await apiGet(
        `/anime/samehadaku/anime/${encodeURIComponent(animeSlug)}`
      );
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

    const titleJapanese =
      d.japanese && String(d.japanese).trim() ? String(d.japanese).trim() : "";

    const scoreVal = d.score?.value != null ? String(d.score.value) : "N/A";
    const eps = Array.isArray(d.episodeList) ? d.episodeList : [];

    animeDetailContent.innerHTML = `
      <div class="anime-detail-card">
        <div class="detail-poster"><img></div>
        <div>
          <div class="detail-main-title"></div>
          ${titleJapanese ? `<div class="detail-sub"></div>` : ""}
          <div class="detail-meta"></div>
          <div class="detail-genres"></div>
        </div>
      </div>

      <div class="detail-actions">
        <button type="button" class="btn-play">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"></path></svg>
          <span>Putar</span>
        </button>

        <button type="button" class="btn-fav">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4 8.04 4 9.54 4.81 10.35 6.09 11.16 4.81 12.66 4 14.2 4 16.7 4 18.7 6 18.7 8.5c0 3.78-3.4 6.86-8.55 11.54z" fill="currentColor"></path></svg>
          <span class="fav-text"></span>
        </button>
      </div>

      <p id="synopsisText" class="synopsis"></p>
    `;

    const card = animeDetailContent.querySelector(".anime-detail-card");
    if (d.poster) card?.style.setProperty("--detail-bg", `url("${d.poster}")`);

    const posterImg = animeDetailContent.querySelector(".detail-poster img");
    posterImg.src = d.poster || "/assets/img/placeholder-poster.png";
    posterImg.alt = titleMain;
    posterImg.onerror = () => {
      posterImg.onerror = null;
      posterImg.src = "/assets/img/placeholder-poster.png";
    };

    animeDetailContent.querySelector(".detail-main-title").textContent = titleMain;
    if (titleJapanese)
      animeDetailContent.querySelector(".detail-sub").textContent = titleJapanese;

    animeDetailContent.querySelector(".detail-meta").innerHTML = `
      <div><span class="label">Rating:</span> ${scoreVal}</div>
      <div><span class="label">Tipe:</span> ${d.type || "-"}</div>
      <div><span class="label">Status:</span> ${d.status || "-"}</div>
      <div><span class="label">Episode:</span> ${d.episodes != null ? d.episodes : "?"}</div>
      <div><span class="label">Rilis:</span> ${d.aired || "-"}</div>
      <div><span class="label">Studio:</span> ${d.studios || "-"}</div>
    `;

    // genres
    const genresWrap = animeDetailContent.querySelector(".detail-genres");
    const genreList = Array.isArray(d.genreList) ? d.genreList : [];
    if (genreList.length) {
      const frag = document.createDocumentFragment();
      for (const g of genreList) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "genre-pill";
        btn.textContent = g?.title || "-";
        btn.addEventListener("click", () => {
          if (!g?.genreId) return;
          location.href = `/anime/genre?slug=${encodeURIComponent(
            g.genreId
          )}&name=${encodeURIComponent(g.title || "")}`;
        });
        frag.appendChild(btn);
      }
      genresWrap.appendChild(frag);
    }

    // play
    animeDetailContent.querySelector(".btn-play")?.addEventListener("click", () => {
      const firstEp = eps[0];
      if (!firstEp?.episodeId) return;
      location.href = `/anime/episode?slug=${encodeURIComponent(firstEp.episodeId)}`;
    });

    // favorite
    const favText = animeDetailContent.querySelector(".fav-text");
    const refreshFav = () => {
      favText.textContent = isFav(animeSlug) ? "Hapus dari Favorit" : "Favorit";
    };
    refreshFav();

    animeDetailContent.querySelector(".btn-fav")?.addEventListener("click", () => {
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

    // synopsis
    const synopsis = animeDetailContent.querySelector("#synopsisText");
    const paragraphs = Array.isArray(d.synopsis?.paragraphs)
      ? d.synopsis.paragraphs
      : [];
    const text =
      paragraphs.map((s) => String(s || "").trim()).filter(Boolean).join(" ") ||
      "Tidak ada sinopsis.";
    synopsis.textContent = text;

    if (text !== "Tidak ada sinopsis.") {
      const btn = document.createElement("button");
      btn.id = "synopsisToggle";
      btn.type = "button";
      btn.className = "synopsis-toggle";
      btn.textContent = "Baca selengkapnya";
      btn.addEventListener("click", () => {
        const expanded = synopsis.classList.toggle("expanded");
        btn.textContent = expanded ? "Tutup" : "Baca selengkapnya";
      });
      animeDetailContent.appendChild(btn);
    }

    // episodes + search
    if (episodeList) {
      episodeList.innerHTML = "";

      const old = $id("episodeSearchWrap");
      if (old?.parentNode) old.parentNode.removeChild(old);
      episodeSearchWrap = null;

      if (eps.length) {
        const wrap = document.createElement("div");
        wrap.id = "episodeSearchWrap";
        wrap.className = "episode-search-wrap";
        wrap.innerHTML = `<input class="episode-search-input" type="text" placeholder="Cari episode... (misal: 5 atau 12)">`;

        const input = wrap.querySelector("input");
        input.addEventListener("input", () => {
          const q = input.value.trim().toLowerCase();
          episodeList.querySelectorAll(".episode-item").forEach((it) => {
            it.style.display =
              (it.textContent || "").toLowerCase().includes(q) ? "" : "none";
          });
        });

        episodeList.parentNode?.insertBefore(wrap, episodeList);
        episodeSearchWrap = wrap;
        if (tabSeasons?.classList.contains("active")) wrap.classList.add("hidden");
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
  }

  // ========= init =========
  document.addEventListener("DOMContentLoaded", () => {
    if (!slug) return toast("Slug anime tidak ditemukan");

    if (tabEpisodes && tabSeasons && episodeList && seasonList) {
      tabEpisodes.addEventListener("click", () => setTab(true));
      tabSeasons.addEventListener("click", () => setTab(false));
      setTab(true);
    }

    loadDetail(slug);
  });
})();
