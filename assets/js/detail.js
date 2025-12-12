// assets/js/detail.js

const animeDetailContent = document.getElementById("animeDetailContent");
const episodeList = document.getElementById("episodeList");
const seasonList = document.getElementById("seasonList");

const tabEpisodes = document.getElementById("tabEpisodes");
const tabSeasons = document.getElementById("tabSeasons");

const detailParams = new URLSearchParams(window.location.search);
const detailSlugFromUrl = detailParams.get("slug");

let episodeSearchWrap = null;

// =====================================================
// UTIL: TITLE / SEASON (biar season work dari search)
// =====================================================

function cleanTextBasic(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // buang (...) termasuk subtitle
    .replace(/subtitle indonesia/gi, " ")
    .replace(/\s+eps?\.?\s*\d+.*/gi, " ") // buang "Eps 12 ..."
    .replace(/\s+/g, " ")
    .trim();
}

// base full: hapus season/part tapi masih menyisakan subtitle kalau ada (kecuali yg di (...))
function normalizeBaseTitleFull(title) {
  if (!title) return "";
  let t = cleanTextBasic(title);

  // hapus pola season & part
  t = t
    .replace(/season\s*\d+(\s*part\s*\d+)?/gi, " ")
    .replace(/\d+(st|nd|rd|th)\s*season/gi, " ")
    .replace(/\bpart\s*\d+\b/gi, " ");

  // rapihin simbol/punct: "dr. stone:" => "dr stone"
  t = t.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  return t;
}

// base root: ambil 2-3 kata awal sebagai "kunci franchise"
function normalizeBaseTitleRoot(title) {
  const full = normalizeBaseTitleFull(title);
  if (!full) return "";

  const words = full.split(" ").filter(Boolean);
  if (words.length >= 3) return `${words[0]} ${words[1]} ${words[2]}`.trim();
  if (words.length >= 2) return `${words[0]} ${words[1]}`.trim();
  return full;
}

function hasSeasonKeyword(title) {
  if (!title) return false;
  const t = String(title).toLowerCase();
  if (/season\s*\d+/.test(t)) return true;
  if (/\d+(st|nd|rd|th)\s*season/.test(t)) return true;
  if (/part\s*\d+/.test(t)) return true;
  return false;
}

function getSeasonSearchQuery(title) {
  // pakai yang paling "root" biar hasil search luas (contoh: dr stone)
  const root = normalizeBaseTitleRoot(title);
  return root || normalizeBaseTitleFull(title) || String(title || "").trim();
}

function extractSeasonNumber(title) {
  if (!title) return 1;
  const t = String(title).toLowerCase();

  let m = t.match(/season\s*(\d+)/);
  if (m && m[1]) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  m = t.match(/(\d+)(st|nd|rd|th)\s*season/);
  if (m && m[1]) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  return 1;
}

function formatSeasonTitle(title) {
  if (!title) return "";
  return String(title)
    .replace(/\(.*?\)/g, "")
    .replace(/subtitle indonesia/gi, "")
    .replace(/\s+eps?\.?\s*\d+.*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// TAB EPISODE / SEASON
// =====================================================

function showEpisodeTab() {
  if (!episodeList || !seasonList || !tabEpisodes || !tabSeasons) return;
  tabEpisodes.classList.add("active");
  tabSeasons.classList.remove("active");
  episodeList.classList.remove("hidden");
  seasonList.classList.add("hidden");

  if (episodeSearchWrap) episodeSearchWrap.classList.remove("hidden");
}

function showSeasonTab() {
  if (!episodeList || !seasonList || !tabEpisodes || !tabSeasons) return;
  tabEpisodes.classList.remove("active");
  tabSeasons.classList.add("active");
  episodeList.classList.add("hidden");
  seasonList.classList.remove("hidden");

  if (episodeSearchWrap) episodeSearchWrap.classList.add("hidden");
}

// =====================================================
// LOAD SEASON LIST (pakai endpoint search baru)
// =====================================================

async function loadSeasonListForAnime(detailData, detailSlug) {
  if (!seasonList) return;

  seasonList.innerHTML = "";

  // Judul yang dipakai buat season: utamakan english/synonyms (karena title bisa kosong)
  const titleForSeason =
    (detailData && String(detailData.english || "").trim()) ||
    (detailData && String(detailData.synonyms || "").trim()) ||
    (detailData && String(detailData.title || "").trim()) ||
    "";

  if (!titleForSeason) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  const searchQuery = getSeasonSearchQuery(titleForSeason);
  if (!searchQuery) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  let json;
  try {
    json = await apiGet(
      `/anime/samehadaku/search?q=${encodeURIComponent(searchQuery)}`
    );
  } catch {
    return;
  }

  if (!json || json.status !== "success" || !json.data) return;

  const list = Array.isArray(json.data.animeList) ? json.data.animeList : [];

  const currentFull = normalizeBaseTitleFull(titleForSeason);
  const currentRoot = normalizeBaseTitleRoot(titleForSeason);

  const relatedAll = [];
  let hasSeasonLike = hasSeasonKeyword(titleForSeason);

  list.forEach((a) => {
    if (!a || !a.animeId || !a.title) return;

    const otherFull = normalizeBaseTitleFull(a.title);
    const otherRoot = normalizeBaseTitleRoot(a.title);

    const matchFull = currentFull && otherFull && otherFull === currentFull;
    const matchRoot =
      currentRoot &&
      otherRoot &&
      otherRoot === currentRoot &&
      currentRoot.split(" ").length >= 2; // minimal 2 kata biar gak ngawur

    if (!matchFull && !matchRoot) return;

    relatedAll.push(a);
    if (hasSeasonKeyword(a.title)) hasSeasonLike = true;
  });

  // kalau memang ga ada item "season-like", anggap season belum ada
  if (!hasSeasonLike) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  const seasons = [];

  relatedAll.forEach((a) => {
    if (a.animeId === detailSlug) return; // jangan tampilkan yang sedang dibuka

    seasons.push({
      slug: a.animeId,
      title: formatSeasonTitle(a.title), // ✅ judul asli saja
      poster: a.poster || "",
      seasonNumber: extractSeasonNumber(a.title),
      // bonus: biar stable urutannya kalau seasonNumber sama
      rawTitle: String(a.title || ""),
    });
  });

  if (!seasons.length) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  seasons.sort((a, b) => {
    const an = a.seasonNumber || 0;
    const bn = b.seasonNumber || 0;
    if (an !== bn) return an - bn;
    return (a.rawTitle || "").localeCompare(b.rawTitle || "");
  });

  seasons.forEach((s) => {
    const item = document.createElement("div");
    item.className = "season-item";

    const thumb = document.createElement("div");
    thumb.className = "season-thumb";

    const img = document.createElement("img");
    img.src = s.poster || "/assets/img/placeholder-poster.png"; // ✅ poster dari search
    img.alt = s.title || "Season";
    img.onerror = () => {
      img.onerror = null;
      img.src = "/assets/img/placeholder-poster.png";
    };

    thumb.appendChild(img);
    item.appendChild(thumb);

    const info = document.createElement("div");
    info.className = "season-info";

    const titleEl = document.createElement("div");
    titleEl.className = "season-title";
    titleEl.textContent = s.title || "-";
    info.appendChild(titleEl);

    item.appendChild(info);

    item.addEventListener("click", () => {
      window.location.href = `/anime/detail?slug=${encodeURIComponent(s.slug)}`;
    });

    seasonList.appendChild(item);
  });
}

// =====================================================
// LOAD DETAIL (endpoint baru)
// =====================================================

async function loadAnimeDetail(slug) {
  if (!animeDetailContent) return;

  let json;
  try {
    json = await apiGet(`/anime/samehadaku/anime/${encodeURIComponent(slug)}`);
  } catch {
    return;
  }

  if (!json || json.status !== "success" || !json.data) return;

  const d = json.data;
  const apiSlug = slug;

  // ✅ Title utama: english -> synonyms -> slug
  const titleMain =
    (d.english && String(d.english).trim()) ||
    (d.synonyms && String(d.synonyms).trim()) ||
    apiSlug;

  // ✅ Title bawah: japanese
  const titleJapanese =
    d.japanese && String(d.japanese).trim() ? String(d.japanese).trim() : "";

  const poster = d.poster || "/assets/img/placeholder-poster.png";

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
  img.src = poster;
  img.alt = titleMain;
  img.onerror = () => {
    img.onerror = null;
    img.src = "/assets/img/placeholder-poster.png";
  };
  posterCol.appendChild(img);

  const metaCol = document.createElement("div");

  const titleEl = document.createElement("div");
  titleEl.className = "detail-main-title";
  titleEl.textContent = titleMain;
  metaCol.appendChild(titleEl);

  if (titleJapanese) {
    const jp = document.createElement("div");
    jp.className = "detail-sub";
    jp.textContent = titleJapanese;
    metaCol.appendChild(jp);
  }

  const scoreVal =
    d.score && d.score.value != null ? String(d.score.value) : "N/A";

  const info = document.createElement("div");
  info.className = "detail-meta";
  info.innerHTML = `
    <div><span class="label">Rating:</span> ${scoreVal}</div>
    <div><span class="label">Tipe:</span> ${d.type || "-"}</div>
    <div><span class="label">Status:</span> ${d.status || "-"}</div>
    <div><span class="label">Episode:</span> ${
      d.episodes != null ? d.episodes : "?"
    }</div>
    <div><span class="label">Rilis:</span> ${d.aired || "-"}</div>
    <div><span class="label">Studio:</span> ${d.studios || "-"}</div>
  `;
  metaCol.appendChild(info);

  const genresWrap = document.createElement("div");
  genresWrap.className = "detail-genres";

  (Array.isArray(d.genreList) ? d.genreList : []).forEach((g) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "genre-pill";
    chip.textContent = g.title || "-";
    chip.addEventListener("click", () => {
      if (!g.genreId) return;
      window.location.href = `/anime/genre?slug=${encodeURIComponent(
        g.genreId
      )}&name=${encodeURIComponent(g.title || "")}`;
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

  const playIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  playIcon.setAttribute("viewBox", "0 0 24 24");
  const playPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  playPath.setAttribute("d", "M8 5v14l11-7z");
  playPath.setAttribute("fill", "currentColor");
  playIcon.appendChild(playPath);

  const playText = document.createElement("span");
  playText.textContent = "Putar";

  playBtn.appendChild(playIcon);
  playBtn.appendChild(playText);

  playBtn.addEventListener("click", () => {
    const eps = Array.isArray(d.episodeList) ? d.episodeList : [];
    if (!eps.length || !eps[0].episodeId) return;
    window.location.href = `/anime/episode?slug=${encodeURIComponent(
      eps[0].episodeId
    )}`;
  });

  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "btn-fav";

  const favIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  favIcon.setAttribute("viewBox", "0 0 24 24");
  const favPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  favPath.setAttribute(
    "d",
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4 8.04 4 9.54 4.81 10.35 6.09 11.16 4.81 12.66 4 14.2 4 16.7 4 18.7 6 18.7 8.5c0 3.78-3.4 6.86-8.55 11.54z"
  );
  favPath.setAttribute("fill", "currentColor");
  favIcon.appendChild(favPath);

  const favText = document.createElement("span");

  function refreshFavBtn() {
    favText.textContent = isFavorite(apiSlug) ? "Hapus dari Favorit" : "Favorit";
  }

  refreshFavBtn();
  favBtn.appendChild(favIcon);
  favBtn.appendChild(favText);

  favBtn.addEventListener("click", () => {
    const favData = {
      slug: apiSlug,
      title: titleMain,
      poster: d.poster || "",
      rating: scoreVal !== "N/A" ? scoreVal : "",
      episode_count: d.episodes != null ? String(d.episodes) : "",
      status: d.status || "",
    };

    if (isFavorite(apiSlug)) removeFavorite(apiSlug);
    else addFavorite(favData);

    refreshFavBtn();
  });

  actionWrap.appendChild(playBtn);
  actionWrap.appendChild(favBtn);
  animeDetailContent.appendChild(actionWrap);

  // ===== SINOPSIS =====
  const syn = document.createElement("p");
  syn.id = "synopsisText";
  syn.className = "synopsis";

  const paragraphs =
    d.synopsis && Array.isArray(d.synopsis.paragraphs) ? d.synopsis.paragraphs : [];
  let cleanSynopsis = paragraphs
    .map((s) => String(s || "").trim())
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
    const eps = Array.isArray(d.episodeList) ? d.episodeList : [];

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

    // dari terakhir ke awal (feel lama)
    for (let i = eps.length - 1; i >= 0; i--) {
      const ep = eps[i];
      if (!ep) continue;

      const item = document.createElement("div");
      item.className = "episode-item";

      const epNum = ep.title != null ? ep.title : eps.length - i;

      const left = document.createElement("span");
      left.textContent = `Episode ${epNum}`;
      item.appendChild(left);

      item.addEventListener("click", () => {
        if (!ep.episodeId) return;
        window.location.href = `/anime/episode?slug=${encodeURIComponent(
          ep.episodeId
        )}`;
      });

      episodeList.appendChild(item);
    }
  }

  // ===== SEASON LIST (dari search) =====
  loadSeasonListForAnime(d, apiSlug);

  document.title = `AniKuy - ${titleMain}`;
}

// =====================================================
// INIT
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  if (!detailSlugFromUrl) {
    if (typeof showToast === "function") showToast("Slug anime tidak ditemukan");
    return;
  }

  if (tabEpisodes && tabSeasons && episodeList && seasonList) {
    tabEpisodes.addEventListener("click", showEpisodeTab);
    tabSeasons.addEventListener("click", showSeasonTab);
    showEpisodeTab();
  }

  loadAnimeDetail(detailSlugFromUrl);
});
```0
