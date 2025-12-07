// assets/js/detail.js

const animeDetailContent = document.getElementById("animeDetailContent");
const episodeList = document.getElementById("episodeList");
const seasonList = document.getElementById("seasonList");
const recommendationGrid = document.getElementById("recommendationGrid");

const tabEpisodes = document.getElementById("tabEpisodes");
const tabSeasons = document.getElementById("tabSeasons");

const detailParams = new URLSearchParams(window.location.search);
const detailSlugFromUrl = detailParams.get("slug");

let episodeSearchWrap = null;

// ---------- UTIL SEASON ----------

function normalizeBaseTitle(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/season\s*\d+(\s*part\s*\d+)?/gi, "")
    .replace(/\(.*?\)/g, "")
    .replace(/subtitle indonesia/gi, "")
    .replace(/\s+eps?\.?\s*\d+.*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSeasonKeyword(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  if (/season\s*\d+/.test(t)) return true;
  if (/\d+(st|nd|rd|th)\s*season/.test(t)) return true;
  return false;
}

function getSeasonSearchQuery(title) {
  const base = normalizeBaseTitle(title);
  return base || title || "";
}

function extractSeasonNumber(title) {
  if (!title) return 1;
  const m = title.toLowerCase().match(/season\s*(\d+)/);
  if (m && m[1]) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 1;
}

function formatSeasonTitle(title) {
  if (!title) return "";
  return title
    .replace(/\(.*?\)/g, "")
    .replace(/subtitle indonesia/gi, "")
    .replace(/\s+eps?\.?\s*\d+.*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- TAB EPISODE / SEASON ----------

function showEpisodeTab() {
  if (!episodeList || !seasonList || !tabEpisodes || !tabSeasons) return;
  tabEpisodes.classList.add("active");
  tabSeasons.classList.remove("active");
  episodeList.classList.remove("hidden");
  seasonList.classList.add("hidden");

  if (episodeSearchWrap) {
    episodeSearchWrap.classList.remove("hidden");
  }
}

function showSeasonTab() {
  if (!episodeList || !seasonList || !tabEpisodes || !tabSeasons) return;
  tabEpisodes.classList.remove("active");
  tabSeasons.classList.add("active");
  episodeList.classList.add("hidden");
  seasonList.classList.remove("hidden");

  if (episodeSearchWrap) {
    episodeSearchWrap.classList.add("hidden");
  }
}

// ---------- LOAD SEASON LIST ----------

async function loadSeasonListForAnime(detailData, detailSlug) {
  if (!seasonList || !detailData || !detailData.title) return;

  seasonList.innerHTML = "";

  const searchQuery = getSeasonSearchQuery(detailData.title);
  if (!searchQuery) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  let json;
  try {
    json = await apiGet(`/anime/search/${encodeURIComponent(searchQuery)}`);
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const list = json.data || [];
  const currentBase = normalizeBaseTitle(detailData.title);

  const relatedAll = [];
  let hasSeasonLike = hasSeasonKeyword(detailData.title);

  list.forEach((a) => {
    if (!a || !a.slug || !a.title) return;

    const base = normalizeBaseTitle(a.title);
    if (!base || base !== currentBase) return;

    relatedAll.push(a);
    if (hasSeasonKeyword(a.title)) {
      hasSeasonLike = true;
    }
  });

  if (!hasSeasonLike) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  const seasons = [];

  relatedAll.forEach((a) => {
    if (a.slug === detailSlug) return;

    const seasonNumber = extractSeasonNumber(a.title);
    seasons.push({
      slug: a.slug,
      title: formatSeasonTitle(a.title),
      poster: a.poster || a.image || "",
      seasonNumber,
    });
  });

  if (!seasons.length) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  seasons.sort((a, b) => (a.seasonNumber || 0) - (b.seasonNumber || 0));

  seasons.forEach((s) => {
    const item = document.createElement("div");
    item.className = "season-item";

    const thumb = document.createElement("div");
    thumb.className = "season-thumb";
    const img = document.createElement("img");
    img.src = s.poster || "/assets/img/placeholder-poster.png";
    img.alt = s.title;
    thumb.appendChild(img);
    item.appendChild(thumb);

    const info = document.createElement("div");
    info.className = "season-info";

    const titleEl = document.createElement("div");
    titleEl.className = "season-title";
    titleEl.textContent = s.title;
    info.appendChild(titleEl);

    item.appendChild(info);

    item.addEventListener("click", () => {
      const url = `/anime/detail?slug=${encodeURIComponent(s.slug)}`;
      window.location.href = url;
    });

    seasonList.appendChild(item);
  });
}

// ---------- LOAD DETAIL ----------

async function loadAnimeDetail(slug) {
  if (!animeDetailContent) return;

  let json;
  try {
    json = await apiGet(`/anime/anime/${slug}`);
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const d = json.data;
  const apiSlug = slug; // slug dari URL, dipakai untuk My List

  animeDetailContent.innerHTML = "";

  // ===== KARTU UTAMA =====
  const card = document.createElement("div");
  card.className = "anime-detail-card";

  if (d.poster) {
    card.style.setProperty("--detail-bg", `url("${d.poster}")`);
  }

  const posterCol = document.createElement("div");
  posterCol.className = "detail-poster";
  const img = document.createElement("img");
  img.src = d.poster;
  img.alt = d.title;
  posterCol.appendChild(img);

  const metaCol = document.createElement("div");

  const titleEl = document.createElement("div");
  titleEl.className = "detail-main-title";
  titleEl.textContent = d.title;
  metaCol.appendChild(titleEl);

  if (d.japanese_title) {
    const jp = document.createElement("div");
    jp.className = "detail-sub";
    jp.textContent = d.japanese_title;
    metaCol.appendChild(jp);
  }

  const info = document.createElement("div");
  info.className = "detail-meta";
  info.innerHTML = `
    <div><span class="label">Rating:</span> ${d.rating || "N/A"}</div>
    <div><span class="label">Tipe:</span> ${d.type || "-"}</div>
    <div><span class="label">Status:</span> ${d.status || "-"}</div>
    <div><span class="label">Episode:</span> ${d.episode_count || "?"}</div>
    <div><span class="label">Rilis:</span> ${d.release_date || "-"}</div>
    <div><span class="label">Studio:</span> ${d.studio || "-"}</div>
  `;
  metaCol.appendChild(info);

  const genresWrap = document.createElement("div");
  genresWrap.className = "detail-genres";
  (d.genres || []).forEach((g) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "genre-pill";
    chip.textContent = g.name;
    chip.addEventListener("click", () => {
      if (!g.slug) return;
      const url = `/anime/genre?slug=${encodeURIComponent(
        g.slug
      )}&name=${encodeURIComponent(g.name)}`;
      window.location.href = url;
    });
    genresWrap.appendChild(chip);
  });
  metaCol.appendChild(genresWrap);

  card.appendChild(posterCol);
  card.appendChild(metaCol);

  animeDetailContent.appendChild(card);

  // ===== TOMBOL PLAY + FAVORIT =====
  const actionWrap = document.createElement("div");
  actionWrap.className = "detail-actions";

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "btn-play";

  const playIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  playIcon.setAttribute("viewBox", "0 0 24 24");
  const playPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  playPath.setAttribute("d", "M8 5v14l11-7z");
  playPath.setAttribute("fill", "currentColor");
  playIcon.appendChild(playPath);

  const playText = document.createElement("span");
  playText.textContent = "Putar";

  playBtn.appendChild(playIcon);
  playBtn.appendChild(playText);

  playBtn.addEventListener("click", () => {
    const eps = d.episode_lists || [];
    if (!eps.length || !eps[0].slug) return;
    const url = `/anime/episode?slug=${encodeURIComponent(eps[0].slug)}`;
    window.location.href = url;
  });

  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "btn-fav";

  const favIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  favIcon.setAttribute("viewBox", "0 0 24 24");
  const favPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  favPath.setAttribute(
    "d",
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4 8.04 4 9.54 4.81 10.35 6.09 11.16 4.81 12.66 4 14.2 4 16.7 4 18.7 6 18.7 8.5c0 3.78-3.4 6.86-8.55 11.54z"
  );
  favPath.setAttribute("fill", "currentColor");
  favIcon.appendChild(favPath);

  const favText = document.createElement("span");

  function refreshFavBtn() {
    if (isFavorite(apiSlug)) {
      favText.textContent = "Hapus dari Favorit";
    } else {
      favText.textContent = "Favorit";
    }
  }

  refreshFavBtn();
  favBtn.appendChild(favIcon);
  favBtn.appendChild(favText);

  favBtn.addEventListener("click", () => {
    const favData = {
      slug: apiSlug, // pakai slug dari URL
      title: d.title,
      poster: d.poster,
      rating: d.rating || "",
      episode_count: d.episode_count || "",
      status: d.status || "",
    };
    if (isFavorite(apiSlug)) {
      removeFavorite(apiSlug);
    } else {
      addFavorite(favData);
    }
    refreshFavBtn();
  });

  actionWrap.appendChild(playBtn);
  actionWrap.appendChild(favBtn);
  animeDetailContent.appendChild(actionWrap);

  // ===== SINOPSIS =====
  const syn = document.createElement("p");
  syn.id = "synopsisText";
  syn.className = "synopsis";

  let cleanSynopsis = (d.synopsis || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  if (!cleanSynopsis) cleanSynopsis = "Tidak ada sinopsis.";
  syn.textContent = cleanSynopsis;
  animeDetailContent.appendChild(syn);

  if (cleanSynopsis && cleanSynopsis !== "Tidak ada sinopsis.") {
    const synToggle = document.createElement("button");
    synToggle.id = "synopsisToggle";
    synToggle.type = "button";
    synToggle.className = "synopsis-toggle";
    synToggle.textContent = "Baca selengkapnya";

    synToggle.addEventListener("click", () => {
      const expanded = syn.classList.toggle("expanded");
      synToggle.textContent = expanded ? "Tutup" : "Baca selengkapnya";
    });

    animeDetailContent.appendChild(synToggle);
  }

  // ===== EPISODE LIST + SEARCH =====
  if (episodeList) {
    const eps = d.episode_lists || [];

    const existingSearch = document.getElementById("episodeSearchWrap");
    if (existingSearch && existingSearch.parentNode) {
      existingSearch.parentNode.removeChild(existingSearch);
    }
    episodeSearchWrap = null;

    if (eps.length) {
      const searchWrap = document.createElement("div");
      searchWrap.id = "episodeSearchWrap";
      searchWrap.className = "episode-search-wrap";

      const input = document.createElement("input");
      input.type = "text";
      input.id = "episodeSearchInput";
      input.className = "episode-search-input";
      input.placeholder = "Cari episode... (misal: 5 atau 12)";

      searchWrap.appendChild(input);

      if (episodeList.parentNode) {
        episodeList.parentNode.insertBefore(searchWrap, episodeList);
      }

      episodeSearchWrap = searchWrap;

      if (tabSeasons && tabSeasons.classList.contains("active")) {
        episodeSearchWrap.classList.add("hidden");
      }

      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        const items = episodeList.querySelectorAll(".episode-item");
        items.forEach((item) => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(q) ? "" : "none";
        });
      });
    }

    episodeList.innerHTML = "";
    for (let i = eps.length - 1; i >= 0; i--) {
      const ep = eps[i];
      if (!ep) continue;

      const item = document.createElement("div");
      item.className = "episode-item";

      const epNum =
        ep.episode_number != null ? ep.episode_number : ep.episode ?? i + 1;

      const left = document.createElement("span");
      left.textContent = `Episode ${epNum}`;
      item.appendChild(left);

      item.addEventListener("click", () => {
        if (!ep.slug) return;
        const url = `/anime/episode?slug=${encodeURIComponent(ep.slug)}`;
        window.location.href = url;
      });

      episodeList.appendChild(item);
    }
  }

  // ===== SEASON LIST =====
  loadSeasonListForAnime(d, apiSlug);

  // ===== REKOMENDASI =====
  if (recommendationGrid) {
    recommendationGrid.innerHTML = "";
    (d.recommendations || []).forEach((a) => {
      const card = createAnimeCard(a, { meta: "" });
      recommendationGrid.appendChild(card);
    });
  }

  document.title = `AniKuy - ${d.title}`;
}

// ---------- INIT ----------

document.addEventListener("DOMContentLoaded", () => {
  if (!detailSlugFromUrl) {
    showToast("Slug anime tidak ditemukan");
    return;
  }

  if (tabEpisodes && tabSeasons && episodeList && seasonList) {
    tabEpisodes.addEventListener("click", showEpisodeTab);
    tabSeasons.addEventListener("click", showSeasonTab);
    showEpisodeTab();
  }

  loadAnimeDetail(detailSlugFromUrl);
});
