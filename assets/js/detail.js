const animeDetailContent = document.getElementById("animeDetailContent");
const episodeList = document.getElementById("episodeList");
const seasonList = document.getElementById("seasonList");

const tabEpisodes = document.getElementById("tabEpisodes");
const tabSeasons = document.getElementById("tabSeasons");

const detailParams = new URLSearchParams(window.location.search);
const detailSlugFromUrl = detailParams.get("slug");

let episodeSearchWrap = null;

// ======================
// HELPERS
// ======================
function pickFirstString(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizeTitle(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

function safeSetImg(imgEl, url, altText) {
  if (!imgEl) return;
  imgEl.alt = altText || "Poster";
  imgEl.src = url || "/assets/img/placeholder-poster.png";
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = "/assets/img/placeholder-poster.png";
  };
}

function getPosterFromDetail(d) {
  return pickFirstString(
    d?.poster,
    d?.posterUrl,
    d?.image,
    d?.thumbnail,
    d?.thumb,
    d?.cover,
    d?.banner
  );
}

function normalizeConnections(raw) {
  const out = [];
  const arr = Array.isArray(raw) ? raw : [];

  arr.forEach((c) => {
    if (!c) return;

    const animeId = pickFirstString(
      c.animeId,
      c.slug,
      c.id,
      c?.anime?.animeId,
      c?.anime?.slug
    );

    const title = pickFirstString(c.title, c.name, c.animeTitle, c?.anime?.title);

    out.push({
      animeId: animeId || "",
      title: title || "",
    });
  });

  return out.filter((x) => x.animeId || x.title);
}

function extractConnections(detailData) {
  const candidates = [
    detailData?.connections,
    detailData?.connectionList,
    detailData?.relatedList,
    detailData?.relatedAnimeList,
    detailData?.related,
    detailData?.relationList,
    detailData?.relations,
    detailData?.synopsis?.connections,
    detailData?.synopsis?.connectionList,
    detailData?.synopsis?.related,
  ];

  for (const c of candidates) {
    const norm = normalizeConnections(c);
    if (norm.length) return norm;
  }
  return [];
}

// ======================
// SEARCH (endpoint baru) + CACHE
// ======================
const searchCache = new Map(); // key: normalizedQuery -> animeList[]

async function samehadakuSearch(q) {
  const key = normalizeTitle(q);
  if (!key) return [];

  if (searchCache.has(key)) return searchCache.get(key);

  let json;
  try {
    json = await apiGet(`/anime/samehadaku/search?q=${encodeURIComponent(q)}`);
  } catch {
    searchCache.set(key, []);
    return [];
  }

  if (!json || json.status !== "success" || !json.data) {
    searchCache.set(key, []);
    return [];
  }

  const list = Array.isArray(json.data.animeList) ? json.data.animeList : [];
  searchCache.set(key, list);
  return list;
}

function findBestMatchFromSearch(list, targetAnimeId, targetTitle) {
  if (!Array.isArray(list) || !list.length) return null;

  const tid = String(targetAnimeId || "").trim();
  const tnorm = normalizeTitle(targetTitle);

  if (tid) {
    const byId = list.find((x) => String(x?.animeId || "").trim() === tid);
    if (byId) return byId;
  }

  if (tnorm) {
    const byTitle = list.find((x) => normalizeTitle(x?.title) === tnorm);
    if (byTitle) return byTitle;

    const byContains = list.find((x) => {
      const nx = normalizeTitle(x?.title);
      return nx.includes(tnorm) || tnorm.includes(nx);
    });
    if (byContains) return byContains;
  }

  return list[0] || null;
}

async function resolvePosterViaSearch(title, animeId) {
  const q = String(title || "").trim();
  if (!q) return "";

  const list = await samehadakuSearch(q);
  const match = findBestMatchFromSearch(list, animeId, title);
  return match?.poster || "";
}

async function resolveAnimeIdViaSearch(title, animeIdFallback) {
  const q = String(title || "").trim();
  if (!q) return animeIdFallback || "";

  const list = await samehadakuSearch(q);
  const match = findBestMatchFromSearch(list, animeIdFallback, title);
  return match?.animeId || animeIdFallback || "";
}

// ======================
// TAB EPISODE / SEASON
// ======================
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

// ======================
// SEASON LIST
// ======================
async function renderSeasonList(detailData, detailSlug) {
  if (!seasonList) return;
  seasonList.innerHTML = "";

  const connections = extractConnections(detailData).filter((c) => {
    const id = String(c.animeId || "").trim();
    return c && (id ? id !== detailSlug : true);
  });

  if (!connections.length) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  const items = [];

  for (const c of connections) {
    const title = String(c.title || "").trim();
    if (!title && !c.animeId) continue;

    const item = document.createElement("div");
    item.className = "season-item";

    const thumb = document.createElement("div");
    thumb.className = "season-thumb";

    const img = document.createElement("img");
    safeSetImg(img, "", title || "Poster");
    thumb.appendChild(img);

    const info = document.createElement("div");
    info.className = "season-info";

    const titleEl = document.createElement("div");
    titleEl.className = "season-title";
    // ✅ jangan tambahin "Season ..." => title asli aja
    titleEl.textContent = title || "-";
    info.appendChild(titleEl);

    item.appendChild(thumb);
    item.appendChild(info);

    item.addEventListener("click", async () => {
      const finalId =
        (c.animeId && String(c.animeId).trim()) ||
        (await resolveAnimeIdViaSearch(title, "")) ||
        "";
      if (!finalId) return;

      window.location.href = `/anime/detail?slug=${encodeURIComponent(finalId)}`;
    });

    seasonList.appendChild(item);
    items.push({ c, imgEl: img, title });
  }

  // ✅ ambil poster season dari endpoint search (judul sama)
  for (const it of items) {
    const { c, imgEl, title } = it;
    const poster = await resolvePosterViaSearch(title, c.animeId);
    if (poster) safeSetImg(imgEl, poster, title || "Poster");
  }

  if (!seasonList.children.length) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
  }
}

// ======================
// LOAD DETAIL
// ======================
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

  // ✅ FIX: karena d.title bisa kosong, urutan fallback:
  // title -> english -> synonyms -> slug
  const titleMain =
    pickFirstString(d?.title) ||
    pickFirstString(d?.english) ||
    pickFirstString(d?.synonyms) ||
    apiSlug;

  // ✅ Judul bawah: japanese (kalau ada & beda dari judul utama)
  const jp = pickFirstString(d?.japanese);
  const titleSub =
    jp && normalizeTitle(jp) !== normalizeTitle(titleMain) ? jp : "";

  // poster utama: dari detail dulu, kalau kosong baru search
  let posterUrl = getPosterFromDetail(d);
  if (!posterUrl) posterUrl = await resolvePosterViaSearch(titleMain, apiSlug);

  animeDetailContent.innerHTML = "";

  // ===== KARTU UTAMA =====
  const card = document.createElement("div");
  card.className = "anime-detail-card";

  if (posterUrl) card.style.setProperty("--detail-bg", `url("${posterUrl}")`);

  const posterCol = document.createElement("div");
  posterCol.className = "detail-poster";

  const img = document.createElement("img");
  safeSetImg(img, posterUrl, titleMain);
  posterCol.appendChild(img);

  const metaCol = document.createElement("div");

  const titleEl = document.createElement("div");
  titleEl.className = "detail-main-title";
  titleEl.textContent = titleMain;
  metaCol.appendChild(titleEl);

  if (titleSub) {
    const sub = document.createElement("div");
    sub.className = "detail-sub";
    sub.textContent = titleSub;
    metaCol.appendChild(sub);
  }

  const scoreVal =
    d?.score && d.score.value != null
      ? String(d.score.value)
      : (d?.score ? String(d.score) : "N/A");

  const info = document.createElement("div");
  info.className = "detail-meta";
  info.innerHTML = `
    <div><span class="label">Rating:</span> ${scoreVal || "N/A"}</div>
    <div><span class="label">Tipe:</span> ${d?.type || "-"}</div>
    <div><span class="label">Status:</span> ${d?.status || "-"}</div>
    <div><span class="label">Episode:</span> ${d?.episodes != null ? d.episodes : "?"}</div>
    <div><span class="label">Rilis:</span> ${d?.aired || d?.releaseDate || "-"}</div>
    <div><span class="label">Studio:</span> ${d?.studios || d?.studio || "-"}</div>
  `;
  metaCol.appendChild(info);

  const genresWrap = document.createElement("div");
  genresWrap.className = "detail-genres";

  const genres = Array.isArray(d?.genreList) ? d.genreList : [];
  genres.forEach((g) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "genre-pill";
    chip.textContent = g?.title || "-";
    chip.addEventListener("click", () => {
      if (!g?.genreId) return;
      const url = `/anime/genre?slug=${encodeURIComponent(g.genreId)}&name=${encodeURIComponent(g.title || "")}`;
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
    const eps = Array.isArray(d?.episodeList) ? d.episodeList : [];
    if (!eps.length || !eps[0]?.episodeId) return;
    window.location.href = `/anime/episode?slug=${encodeURIComponent(eps[0].episodeId)}`;
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
      poster: posterUrl || "",
      rating: scoreVal && scoreVal !== "N/A" ? String(scoreVal) : "",
      episode_count: d?.episodes != null ? String(d.episodes) : "",
      status: d?.status || "",
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
    d?.synopsis && Array.isArray(d.synopsis.paragraphs) ? d.synopsis.paragraphs : [];

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
    const eps = Array.isArray(d?.episodeList) ? d.episodeList : [];

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

      const epNum = ep.title != null ? ep.title : eps.length - i;

      const left = document.createElement("span");
      left.textContent = `Episode ${epNum}`;
      item.appendChild(left);

      item.addEventListener("click", () => {
        if (!ep.episodeId) return;
        window.location.href = `/anime/episode?slug=${encodeURIComponent(ep.episodeId)}`;
      });

      episodeList.appendChild(item);
    }
  }

  // ===== SEASON LIST =====
  await renderSeasonList(d, apiSlug);

  document.title = `AniKuy - ${titleMain}`;
}

// ======================
// INIT
// ======================
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
