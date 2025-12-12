const animeDetailContent = document.getElementById("animeDetailContent");
const episodeList = document.getElementById("episodeList");
const seasonList = document.getElementById("seasonList");
const recommendationGrid = document.getElementById("recommendationGrid");

const tabEpisodes = document.getElementById("tabEpisodes");
const tabSeasons = document.getElementById("tabSeasons");

const detailParams = new URLSearchParams(window.location.search);
const detailSlugFromUrl = detailParams.get("slug");

let episodeSearchWrap = null;

// ---------- TAB EPISODE / SEASON ----------
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

// ---------- SEASON LIST (pakai synopsis.connections) ----------
function loadSeasonListFromConnections(detailData, detailSlug) {
  if (!seasonList) return;
  seasonList.innerHTML = "";

  const connections =
    detailData &&
    detailData.synopsis &&
    Array.isArray(detailData.synopsis.connections)
      ? detailData.synopsis.connections
      : [];

  if (!connections.length) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  connections.forEach((c) => {
    if (!c || !c.animeId) return;
    if (c.animeId === detailSlug) return;

    const item = document.createElement("div");
    item.className = "season-item";

    const thumb = document.createElement("div");
    thumb.className = "season-thumb";
    const img = document.createElement("img");
    img.src = "/assets/img/placeholder-poster.png";
    img.alt = c.title || "Season";
    thumb.appendChild(img);
    item.appendChild(thumb);

    const info = document.createElement("div");
    info.className = "season-info";

    const titleEl = document.createElement("div");
    titleEl.className = "season-title";
    titleEl.textContent = c.title || "Season";
    info.appendChild(titleEl);

    item.appendChild(info);

    item.addEventListener("click", () => {
      const url = `/anime/detail?slug=${encodeURIComponent(c.animeId)}`;
      window.location.href = url;
    });

    seasonList.appendChild(item);
  });

  // kalau ternyata semua koneksi kosong
  if (!seasonList.children.length) {
    const empty = document.createElement("div");
    empty.className = "season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
  }
}

// ---------- LOAD DETAIL ----------
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

  // title kadang kosong, jadi fallback:
  const titleMain =
    (d.title && String(d.title).trim()) ||
    (d.english && String(d.english).trim()) ||
    (d.japanese && String(d.japanese).trim()) ||
    apiSlug;

  animeDetailContent.innerHTML = "";

  // ===== KARTU UTAMA =====
  const card = document.createElement("div");
  card.className = "anime-detail-card";

  if (d.poster) card.style.setProperty("--detail-bg", `url("${d.poster}")`);

  const posterCol = document.createElement("div");
  posterCol.className = "detail-poster";
  const img = document.createElement("img");
  img.src = d.poster || "/assets/img/placeholder-poster.png";
  img.alt = titleMain;
  posterCol.appendChild(img);

  const metaCol = document.createElement("div");

  const titleEl = document.createElement("div");
  titleEl.className = "detail-main-title";
  titleEl.textContent = titleMain;
  metaCol.appendChild(titleEl);

  if (d.japanese) {
    const jp = document.createElement("div");
    jp.className = "detail-sub";
    jp.textContent = d.japanese;
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
    <div><span class="label">Episode:</span> ${d.episodes != null ? d.episodes : "?"}</div>
    <div><span class="label">Rilis:</span> ${d.aired || "-"}</div>
    <div><span class="label">Studio:</span> ${d.studios || "-"}</div>
  `;
  metaCol.appendChild(info);

  const genresWrap = document.createElement("div");
  genresWrap.className = "detail-genres";
  (d.genreList || []).forEach((g) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "genre-pill";
    chip.textContent = g.title || "-";
    chip.addEventListener("click", () => {
      if (!g.genreId) return;
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
    const eps = d.episodeList || [];
    if (!eps.length || !eps[0].episodeId) return;
    const url = `/anime/episode?slug=${encodeURIComponent(eps[0].episodeId)}`;
    window.location.href = url;
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
  let cleanSynopsis = paragraphs.map((s) => String(s || "").trim()).filter(Boolean).join(" ");
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
    const eps = d.episodeList || [];

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

    // tampilkan dari episode terakhir ke awal (biar sama feel lama)
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
        const url = `/anime/episode?slug=${encodeURIComponent(ep.episodeId)}`;
        window.location.href = url;
      });

      episodeList.appendChild(item);
    }
  }

  // ===== SEASON LIST =====
  loadSeasonListFromConnections(d, apiSlug);

  // ===== REKOMENDASI ===== (data tidak ada di response -> aman tetap kosong)
  if (recommendationGrid) recommendationGrid.innerHTML = "";

  document.title = `AniKuy - ${titleMain}`;
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
