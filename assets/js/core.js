// ====== core.js (global utils) ======

const BASE_URL = "https://www.sankavollerei.com";

// ========== TOAST ==========
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ========== FETCH API ==========
async function apiGet(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat data");
    throw err;
  }
}

// ---------------- UTIL DATA (support beberapa bentuk JSON) ----------------

function getAnimeSlug(item) {
  if (!item) return "";
  return item.slug || item.animeId || item.anime_id || item.id || "";
}

function getAnimeTitle(item) {
  if (!item) return "";
  return item.title || item.anime_name || item.name || "";
}

function getAnimePoster(item) {
  if (!item) return "";
  return item.poster || item.image || item.thumbnail || "";
}

function getAnimeRating(item) {
  if (!item) return "";
  if (item.rating != null) return item.rating;

  // samehadaku detail: score: { value, users }
  if (item.score != null) {
    if (typeof item.score === "object" && item.score.value != null)
      return item.score.value;
    return item.score;
  }

  // top10: score: "8.73"
  if (item.score != null) return item.score;

  return "";
}

// ---------------- FAVORITES (MY LIST) ----------------

const FAVORITE_KEY = "anikuy_favorites";

function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFavorites(list) {
  try {
    localStorage.setItem(FAVORITE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error(err);
  }
}

function isFavorite(slug) {
  if (!slug) return false;
  return getFavorites().some((a) => a.slug === slug);
}

function addFavorite(anime) {
  const slug = getAnimeSlug(anime);
  if (!anime || !slug) return;
  if (isFavorite(slug)) return;

  const fav = {
    slug,
    title: getAnimeTitle(anime),
    poster: getAnimePoster(anime),
    rating: getAnimeRating(anime),
    episode_count:
      anime.episode_count != null
        ? anime.episode_count
        : anime.episodes != null
        ? anime.episodes
        : "",
    status: anime.status || "",
  };

  const favorites = getFavorites();
  favorites.push(fav);
  setFavorites(favorites);
  showToast("Ditambahkan ke Favorit");
}

function removeFavorite(slug) {
  if (!slug) return;
  const favorites = getFavorites().filter((a) => a.slug !== slug);
  setFavorites(favorites);
  showToast("Dihapus dari Favorit");
}

// ---------------- UI HELPERS ----------------

function formatEpisodeLabel(episodes) {
  if (episodes == null || episodes === "") return "";
  return `Eps ${episodes}`;
}

function createAnimeCard(item, opts = {}) {
  const card = document.createElement("div");
  card.className = "anime-card";

  const posterSrc = getAnimePoster(item) || "/assets/img/placeholder-poster.png";
  const titleText = getAnimeTitle(item) || "-";

  // Poster
  const imgWrap = document.createElement("div");
  imgWrap.className = "anime-poster-wrap";

  const img = document.createElement("img");
  img.src = posterSrc;
  img.alt = titleText;

  imgWrap.appendChild(img);

  // Badge top
  if (opts.badgeTop) {
    const badgeTop = document.createElement("div");
    badgeTop.className = "badge badge-top";
    badgeTop.textContent = opts.badgeTop;
    imgWrap.appendChild(badgeTop);
  }

  // Badge bottom
  if (opts.badgeBottom) {
    const badgeBottom = document.createElement("div");
    badgeBottom.className = "badge badge-bottom";
    badgeBottom.textContent = opts.badgeBottom;
    imgWrap.appendChild(badgeBottom);
  }

  card.appendChild(imgWrap);

  // Title
  const titleEl = document.createElement("div");
  titleEl.className = "anime-title";
  titleEl.textContent = titleText;
  card.appendChild(titleEl);

  // Meta (optional)
  if (opts.meta) {
    const meta = document.createElement("div");
    meta.className = "anime-meta";
    meta.textContent = opts.meta;
    card.appendChild(meta);
  }

  // Rating (optional)
  if (opts.rating) {
    const rating = document.createElement("div");
    rating.className = "anime-rating";
    rating.textContent = `⭐ ${opts.rating}`;
    card.appendChild(rating);
  }

  // Click -> detail
  card.addEventListener("click", () => {
    const slug = getAnimeSlug(item);
    if (!slug) return;
    const url = `/anime/detail?slug=${encodeURIComponent(slug)}`;
    window.location.href = url;
  });

  return card;
}
