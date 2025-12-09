const BASE_URL = "https://www.sankavollerei.com";
const LS_KEY_FAVORITES = "anikuy_favorites";
const LS_KEY_THEME = "anikuy_theme";
const LS_KEY_WATCH_HISTORY = "anikuy_watch_history";

const THEME_DARK = "dark";
const THEME_LIGHT = "light";

function applyTheme(theme) {
  const body = document.body;
  if (!body) return;
  body.classList.remove("theme-dark", "theme-light");
  const t = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
  body.classList.add(t === THEME_LIGHT ? "theme-light" : "theme-dark");
}

function initThemeFromStorage() {
  try {
    const saved = localStorage.getItem(LS_KEY_THEME);
    const theme = saved === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
    applyTheme(theme);
    return theme;
  } catch (e) {
    applyTheme(THEME_DARK);
    return THEME_DARK;
  }
}

/**
 * Kontrol tema (dipakai di halaman Settings)
 * - Tombol pill: #themeToggle
 * - Bottom sheet: #themeSheet
 *   - overlay: #themeSheetOverlay
 *   - tombol Tutup: #themeSheetClose
 *   - radio: input[name="theme-option"]
 */
function bindThemeControls(currentTheme) {
  const radios = document.querySelectorAll('input[name="theme-option"]');

  const themeToggle = document.getElementById("themeToggle");
  const currentLabelEl = document.getElementById("currentThemeLabel");

  const themeSheet = document.getElementById("themeSheet");
  const themeSheetClose = document.getElementById("themeSheetClose");
  const themeSheetOverlay = document.getElementById("themeSheetOverlay");

  function labelText(theme) {
    return theme === THEME_LIGHT
      ? "Putih & Hitam"
      : "Biru & Hitam (Default)";
  }

  function updateCurrentLabel(theme) {
    if (currentLabelEl) {
      currentLabelEl.textContent = labelText(theme);
    }
  }

  updateCurrentLabel(currentTheme);

  function openSheet() {
    if (!themeSheet) return;
    themeSheet.classList.add("show");
    themeSheet.setAttribute("aria-hidden", "false");
    if (themeToggle) {
      themeToggle.setAttribute("aria-expanded", "true");
    }
  }

  function closeSheet() {
    if (!themeSheet) return;
    themeSheet.classList.remove("show");
    themeSheet.setAttribute("aria-hidden", "true");
    if (themeToggle) {
      themeToggle.setAttribute("aria-expanded", "false");
    }
  }

  // buka / tutup bottom sheet dari tombol pill
  if (themeToggle && themeSheet) {
    themeToggle.addEventListener("click", () => {
      const isOpen = themeSheet.classList.contains("show");
      if (isOpen) {
        closeSheet();
      } else {
        openSheet();
      }
    });
  }

  // tutup dari tombol dan overlay
  if (themeSheetClose) {
    themeSheetClose.addEventListener("click", closeSheet);
  }
  if (themeSheetOverlay) {
    themeSheetOverlay.addEventListener("click", closeSheet);
  }

  // kalau tidak ada radio, selesai
  if (!radios.length) return;

  // set radio & handle perubahan tema
  radios.forEach((radio) => {
    radio.checked = radio.value === currentTheme;
    radio.addEventListener("change", (e) => {
      const value = e.target.value === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
      localStorage.setItem(LS_KEY_THEME, value);
      applyTheme(value);
      updateCurrentLabel(value);
      if (typeof showToast === "function") {
        showToast("Tema berhasil diubah");
      }
      closeSheet();
    });
  });
}

// TOAST
function showToast(msg) {
  const toastEl = document.getElementById("toast");
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1600);
}

// FETCH API SANKA
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

/* ========================
 * FAVORITES (My List)
 * ===================== */
function loadFavoritesFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY_FAVORITES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let favorites = loadFavoritesFromStorage();

function saveFavorites() {
  try {
    localStorage.setItem(LS_KEY_FAVORITES, JSON.stringify(favorites || []));
  } catch {
    // abaikan
  }
}

function getFavorites() {
  return Array.isArray(favorites) ? favorites.slice() : [];
}

function isFavorite(slug) {
  if (!slug) return false;
  return getFavorites().some((a) => a.slug === slug);
}

function addFavorite(anime) {
  if (!anime || !anime.slug) return;
  if (isFavorite(anime.slug)) return;

  const fav = {
    slug: anime.slug,
    title: anime.title || "",
    poster: anime.poster || "",
    rating: anime.rating || "",
    episode_count: anime.episode_count || "",
    status: anime.status || "",
  };

  favorites.push(fav);
  saveFavorites();

  if (typeof showToast === "function") {
    showToast("Ditambahkan ke My List");
  }
}

function removeFavorite(slug) {
  if (!slug) return;
  favorites = getFavorites().filter((a) => a.slug !== slug);
  saveFavorites();

  if (typeof showToast === "function") {
    showToast("Dihapus dari My List");
  }
}

/* ========================
 * WATCH HISTORY (riwayat + progress)
 * ===================== */

function loadWatchHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY_WATCH_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let watchHistory = loadWatchHistoryFromStorage();

function saveWatchHistory() {
  try {
    localStorage.setItem(
      LS_KEY_WATCH_HISTORY,
      JSON.stringify(watchHistory || [])
    );
  } catch {
    // abaikan
  }
}

function getWatchHistory() {
  if (!Array.isArray(watchHistory)) return [];
  return watchHistory
    .slice()
    .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
}

function findWatchHistoryByEpisodeSlug(slug) {
  if (!slug || !Array.isArray(watchHistory)) return null;
  return watchHistory.find((h) => h.episode_slug === slug) || null;
}

function updateWatchHistoryProgress(payload) {
  if (!payload) return;
  const {
    anime_slug,
    anime_title,
    anime_poster,
    episode_slug,
    episode_title,
    current_time,
    duration,
  } = payload;

  if (!episode_slug) return;

  const time = Number(current_time) || 0;
  if (time <= 0) return;

  if (!Array.isArray(watchHistory)) watchHistory = [];

  const idx = watchHistory.findIndex((h) => h.episode_slug === episode_slug);
  const now = Date.now();

  const entry = {
    anime_slug: anime_slug || "",
    anime_title: anime_title || "",
    anime_poster: anime_poster || "",
    episode_slug,
    episode_title: episode_title || "",
    last_time: time,
    duration: Number(duration) || 0,
    updated_at: now,
  };

  if (idx >= 0) {
    watchHistory.splice(idx, 1);
  }
  watchHistory.unshift(entry);

  // batasin history biar nggak kebanyakan
  if (watchHistory.length > 50) {
    watchHistory.length = 50;
  }

  saveWatchHistory();
}

function clearWatchHistoryForEpisode(episodeSlug) {
  if (!episodeSlug || !Array.isArray(watchHistory)) return;
  watchHistory = watchHistory.filter((h) => h.episode_slug !== episodeSlug);
  saveWatchHistory();
}

// tracking progress di player episode (HTML5 <video>)
let currentWatchTracker = null;

function setupWatchProgressTracking(meta) {
  const video = document.getElementById("episodePlayer");
  if (!video || typeof video.currentTime !== "number") return;

  // lepas handler lama
  if (currentWatchTracker && currentWatchTracker.handler) {
    video.removeEventListener("timeupdate", currentWatchTracker.handler);
    window.removeEventListener("beforeunload", currentWatchTracker.handler);
  }

  const safeMeta = {
    anime_slug: meta && meta.animeSlug ? meta.animeSlug : "",
    anime_title: meta && meta.animeTitle ? meta.animeTitle : "",
    anime_poster: meta && meta.animePoster ? meta.animePoster : "",
    episode_slug: meta && meta.episodeSlug ? meta.episodeSlug : "",
    episode_title: meta && meta.episodeTitle ? meta.episodeTitle : "",
  };

  function handler() {
    if (!video || typeof video.currentTime !== "number") return;

    const currentTime = Number(video.currentTime) || 0;
    const duration = Number(video.duration) || 0;

    // jangan simpan kalau belum nonton beneran
    if (!duration || currentTime < 10) return;

    // kalau hampir tamat, anggap selesai → hapus dari history
    if (duration && currentTime >= duration - 5) {
      clearWatchHistoryForEpisode(safeMeta.episode_slug);
      return;
    }

    updateWatchHistoryProgress({
      ...safeMeta,
      current_time: currentTime,
      duration,
    });
  }

  video.addEventListener("timeupdate", handler);
  window.addEventListener("beforeunload", handler);

  currentWatchTracker = { handler, meta: safeMeta };
}

// apply auto-resume ketika episode dibuka
function applyResumeTimeForEpisode(episodeSlug) {
  const video = document.getElementById("episodePlayer");
  if (!video || typeof video.currentTime !== "number") return;

  const entry = findWatchHistoryByEpisodeSlug(episodeSlug);
  if (!entry || !entry.last_time) return;

  const resumeTime = Number(entry.last_time) || 0;
  if (!resumeTime) return;

  const seek = () => {
    const duration = Number(video.duration) || 0;
    // kalau sudah hampir selesai, nggak usah resume
    if (duration && resumeTime >= duration - 5) return;
    try {
      video.currentTime = resumeTime;
    } catch (e) {}
  };

  if (video.readyState >= 1) {
    seek();
  } else {
    const onMeta = () => {
      video.removeEventListener("loadedmetadata", onMeta);
      seek();
    };
    video.addEventListener("loadedmetadata", onMeta);
  }
}

/* ========================
 * BIKIN KARTU ANIME
 * ===================== */
function createAnimeCard(item, opts = {}) {
  const card = document.createElement("div");
  card.className = "anime-card";

  const thumb = document.createElement("div");
  thumb.className = "anime-thumb";

  const img = document.createElement("img");
  img.src = item.poster;
  img.alt = item.title;
  thumb.appendChild(img);

  if (opts.badgeTop) {
    const b = document.createElement("div");
    b.className = "badge-top-left";
    b.textContent = opts.badgeTop;
    thumb.appendChild(b);
  }

  if (opts.badgeBottom) {
    const b = document.createElement("div");
    b.className = "badge-bottom-left";
    b.textContent = opts.badgeBottom;
    thumb.appendChild(b);
  }

  if (opts.rating) {
    const rate = document.createElement("div");
    rate.className = "badge-rating";
    const star = document.createElement("span");
    star.className = "star";
    star.textContent = "★";
    const val = document.createElement("span");
    val.textContent = opts.rating;
    rate.appendChild(star);
    rate.appendChild(val);
    thumb.appendChild(rate);
  }

  card.appendChild(thumb);

  const title = document.createElement("div");
  title.className = "anime-title";
  title.textContent = item.title;
  card.appendChild(title);

  if (opts.meta) {
    const m = document.createElement("div");
    m.className = "anime-meta";
    m.textContent = opts.meta;
    card.appendChild(m);
  }

  card.addEventListener("click", () => {
    let url = null;

    if (opts.href) {
      url = typeof opts.href === "function" ? opts.href(item) : opts.href;
    } else if (item.slug) {
      url = `/anime/detail?slug=${encodeURIComponent(item.slug)}`;
    }

    if (url) {
      window.location.href = url;
    }
  });

  return card;
}

/* ========================
 * GLOBAL UI
 * ===================== */
document.addEventListener("DOMContentLoaded", () => {
  const currentTheme = initThemeFromStorage();
  bindThemeControls(currentTheme);

  const backButton = document.getElementById("backButton");
  const searchButton = document.getElementById("searchButton");
  const settingsButton = document.getElementById("settingsButton");
  const pageType = document.body.dataset.page || "";
  const basePages = new Set(["home", "explore", "my-list", "profile"]);

  // klik logo -> home
  const logoWrap = document.querySelector(".logo-wrap");
  if (logoWrap) {
    logoWrap.style.cursor = "pointer";
    logoWrap.addEventListener("click", () => {
      window.location.href = "/";
    });
  }

  if (backButton) {
    backButton.style.visibility = basePages.has(pageType)
      ? "hidden"
      : "visible";

    backButton.addEventListener("click", () => {
      const customHref = backButton.dataset.href;
      if (customHref) {
        window.location.href = customHref;
      } else {
        window.history.back();
      }
    });
  }

  if (searchButton) {
    searchButton.addEventListener("click", () => {
      window.location.href = "/search";
    });
  }

  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      window.location.href = "/settings";
    });
  }

  const mainContent = document.getElementById("mainContent");
  const bottomNav = document.querySelector(".bottom-nav");
  if (mainContent && bottomNav) {
    let lastScrollY = 0;
    let navHidden = false;

    mainContent.addEventListener("scroll", () => {
      const current = mainContent.scrollTop;

      if (current > lastScrollY + 10 && !navHidden) {
        bottomNav.classList.add("hide");
        navHidden = true;
      } else if (current < lastScrollY - 10 && navHidden) {
        bottomNav.classList.remove("hide");
        navHidden = false;
      }

      lastScrollY = current;
    });
  }

  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
  document.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (
      (e.ctrlKey && ["s", "u", "p"].includes(key)) ||
      (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) ||
      key === "f12"
    ) {
      e.preventDefault();
    }
  });
});
