// assets/js/detail.js

const animeDetailContent = document.getElementById("animeDetailContent");
const episodeList = document.getElementById("episodeList");
const seasonList = document.getElementById("seasonList");
const recommendationGrid = document.getElementById("recommendationGrid");

const tabEpisodes = document.getElementById("tabEpisodes");
const tabSeasons = document.getElementById("tabSeasons");

const detailParams = new URLSearchParams(window.location.search);
const detailSlugFromUrl = detailParams.get("slug");

// =========================
//  HELPER UNTUK SEASON
// =========================

// Ambil judul dasar untuk search season
// - buang teks setelah "Season"
// - buang teks setelah "Episode"
// - buang teks setelah "Subtitle"
function getBaseTitleForSeasonSearch(title) {
  if (!title) return "";

  let t = title;

  t = t.replace(/season.*$/i, "");
  t = t.replace(/episode.*$/i, "");
  t = t.replace(/subtitle.*$/i, "");

  t = t.trim();
  if (!t) return title.trim();
  return t;
}

// Normalisasi untuk perbandingan longgar
function normalizeTitleForCompare(t) {
  if (!t) return "";
  return t
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // buang isi dalam kurung
    .replace(/[\s\W_]+/g, " ")
    .trim();
}

// Bersihkan judul untuk tampilan di list season
// - hilangkan "(Episode 1 - xx)"
// - hilangkan "Subtitle Indonesia" dan sejenisnya
function makeSeasonDisplayTitle(rawTitle, baseTitle) {
  if (!rawTitle) return baseTitle || "";

  let t = rawTitle;

  // buang info episode di dalam kurung
  t = t.replace(/\(.*?episode.*?\)/gi, "");
  t = t.replace(/\(episode.*?\)/gi, "");

  // buang "Episode 1 - xx" walau tanpa kurung
  t = t.replace(/episode\s*\d+\s*[-–]\s*\d+/gi, "");

  // buang "Subtitle ..." di akhir
  t = t.replace(/subtitle.+$/i, "");

  t = t.trim();

  if (!t) return baseTitle || rawTitle;

  return t;
}

// cek apakah dua judul (sudah dinormalisasi) kemungkinan besar satu franchise
function isSameFranchise(baseNorm, otherNorm) {
  if (!baseNorm || !otherNorm) return false;

  if (baseNorm === otherNorm) return true;

  const baseWords = baseNorm.split(" ");
  const otherWords = otherNorm.split(" ");

  const baseFirst = baseWords[0] || "";
  const otherFirst = otherWords[0] || "";

  const baseFirst2 = baseWords.slice(0, 2).join(" ");
  const otherFirst2 = otherWords.slice(0, 2).join(" ");

  if (baseFirst && baseFirst === otherFirst) return true;
  if (baseFirst2 && baseFirst2 === otherFirst2) return true;

  if (otherNorm.startsWith(baseNorm + " ")) return true;
  if (baseNorm.startsWith(otherNorm + " ")) return true;

  return false;
}

// format tanggal "YYYY-MM-DD" => "03 Des"
function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const bulan = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const day = String(d.getDate()).padStart(2, "0");
  const month = bulan[d.getMonth()] || "";
  return `${day} ${month}`;
}

// Tampilkan tab Episode
function showEpisodeTab() {
  if (episodeList) {
    episodeList.style.display = "flex";
  }
  if (seasonList) {
    seasonList.style.display = "none";
  }
  if (tabEpisodes) tabEpisodes.classList.add("active");
  if (tabSeasons) tabSeasons.classList.remove("active");
}

// Tampilkan tab Season
function showSeasonTab() {
  if (episodeList) {
    episodeList.style.display = "none";
  }
  if (seasonList) {
    seasonList.style.display = "grid";
  }
  if (tabEpisodes) tabEpisodes.classList.remove("active");
  if (tabSeasons) tabSeasons.classList.add("active");
}

// Load daftar season lain yang punya judul dasar sama
async function loadSeasonList(animeData) {
  if (!seasonList || !animeData || !animeData.title) return;

  seasonList.innerHTML = "";

  const baseTitle = getBaseTitleForSeasonSearch(animeData.title || "");
  if (!baseTitle) return;

  const baseNorm = normalizeTitleForCompare(baseTitle);
  const currentFullNorm = normalizeTitleForCompare(animeData.title || "");

  let json;
  try {
    const enc = encodeURIComponent(baseTitle);
    json = await apiGet(`/anime/search/${enc}`);
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const listRaw = json.data || [];

  const list = listRaw.filter((a) => {
    if (!a) return false;

    // 1) jangan masukkan anime yang sedang dipilih berdasarkan slug
    if (a.slug && animeData.slug && a.slug === animeData.slug) return false;

    const otherBase = getBaseTitleForSeasonSearch(a.title || "");
    const otherNormBase = normalizeTitleForCompare(otherBase);
    if (!otherNormBase || !baseNorm) return false;

    const otherFullNorm = normalizeTitleForCompare(a.title || "");

    // 2) kalau judul 100% sama dan TIDAK ada kata "season" -> itu anime yang sama (season 1), skip
    const sameExactTitle =
      currentFullNorm && otherFullNorm && currentFullNorm === otherFullNorm;
    const hasSeasonWord = /season\s*\d*/i.test(a.title || "");

    if (sameExactTitle && !hasSeasonWord) return false;

    // 3) sisanya harus satu franchise
    return isSameFranchise(baseNorm, otherNormBase);
  });

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "season-item season-empty";
    empty.textContent = "Season belum ada";
    seasonList.appendChild(empty);
    return;
  }

  // bikin kartu season (poster, badge eps, judul, tanggal)
  list.forEach((a) => {
    const item = document.createElement("div");
    item.className = "season-item";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "season-thumb";

    const img = document.createElement("img");
    img.src = a.poster || animeData.poster || "";
    img.alt = a.title || baseTitle;
    thumbWrap.appendChild(img);

    const epsCount = a.episode_count || a.episode || "";
    if (epsCount) {
      const badge = document.createElement("div");
      badge.className = "season-ep-badge";
      badge.textContent = `Eps ${epsCount}`;
      thumbWrap.appendChild(badge);
    }

    const infoWrap = document.createElement("div");
    infoWrap.className = "season-info";

    const titleSpan = document.createElement("div");
    titleSpan.className = "season-title";
    titleSpan.textContent = makeSeasonDisplayTitle(a.title || "", baseTitle);

    infoWrap.appendChild(titleSpan);

    const dateText = formatShortDate(a.release_date);
    if (dateText) {
      const dateSpan = document.createElement("div");
      dateSpan.className = "season-date";
      dateSpan.textContent = dateText;
      infoWrap.appendChild(dateSpan);
    }

    item.appendChild(thumbWrap);
    item.appendChild(infoWrap);

    item.addEventListener("click", () => {
      if (!a.slug) return;
      const url = `/anime/detail?slug=${encodeURIComponent(a.slug)}`;
      window.location.href = url;
    });

    seasonList.appendChild(item);
  });
}

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
  const detailSlug = d.slug || slug;

  animeDetailContent.innerHTML = "";

  // ================== KARTU UTAMA (DALAM BOX) ==================
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

  // ================== TOMBOL PLAY + FAVORIT ==================
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
    if (isFavorite(detailSlug)) {
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
      slug: detailSlug,
      title: d.title,
      poster: d.poster,
      rating: d.rating || "",
      episode_count: d.episode_count || "",
      status: d.status || "",
    };
    if (isFavorite(detailSlug)) {
      removeFavorite(detailSlug);
    } else {
      addFavorite(favData);
    }
    refreshFavBtn();
  });

  actionWrap.appendChild(playBtn);
  actionWrap.appendChild(favBtn);

  animeDetailContent.appendChild(actionWrap);

  // ================== SINOPSIS ==================
  const syn = document.createElement("p");
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

  // ================== EPISODE LIST (baru -> lama) ==================
  if (episodeList) {
    episodeList.innerHTML = "";

    const eps = (d.episode_lists || []).slice().reverse();
    const total = eps.length;

    eps.forEach((ep, index) => {
      const item = document.createElement("div");
      item.className = "episode-item";

      const displayNumber = total - index;

      const left = document.createElement("span");
      left.textContent = `Episode ${displayNumber}`;
      item.appendChild(left);

      item.addEventListener("click", () => {
        if (!ep.slug) return;
        const url = `/anime/episode?slug=${encodeURIComponent(ep.slug)}`;
        window.location.href = url;
      });

      episodeList.appendChild(item);
    });
  }

  // ================== SEASON LIST ==================
  await loadSeasonList(d);

  // rekomendasi
  if (recommendationGrid) {
    recommendationGrid.innerHTML = "";
    (d.recommendations || []).forEach((a) => {
      const card = createAnimeCard(a, { meta: "" });
      recommendationGrid.appendChild(card);
    });
  }

  document.title = `AniKuy - ${d.title}`;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!detailSlugFromUrl) {
    showToast("Slug anime tidak ditemukan");
    return;
  }

  if (tabEpisodes && tabSeasons) {
    tabEpisodes.addEventListener("click", showEpisodeTab);
    tabSeasons.addEventListener("click", showSeasonTab);
  }

  showEpisodeTab();
  loadAnimeDetail(detailSlugFromUrl);
});
