const BASE_URL = "https://www.sankavollerei.com";
const LS_KEY_FAVORITES = "anikuy_favorites";
const LS_KEY_WATCH_HISTORY = "anikuy_watch_history";
const LS_KEY_THEME = "anikuy_theme";
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

// FAVORITES (My List / Favorit)
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

// WATCH HISTORY (riwayat nonton)
function loadWatchHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY_WATCH_HISTORY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

let watchHistory = loadWatchHistoryFromStorage();

function getWatchHistory() {
  return Object.assign({}, watchHistory);
}

function saveWatchHistory() {
  try {
    localStorage.setItem(LS_KEY_WATCH_HISTORY, JSON.stringify(watchHistory));
  } catch {
    // abaikan
  }
}

/**
 * entry = {
 *   animeSlug: string,
 *   animeTitle?: string,
 *   poster?: string,
 *   episodeSlug: string,
 *   episodeTitle?: string,
 *   positionSec?: number
 * }
 */
function updateWatchHistory(entry) {
  if (!entry || !entry.animeSlug || !entry.episodeSlug) return;

  const pos =
    typeof entry.positionSec === "number" && entry.positionSec >= 0
      ? entry.positionSec
      : 0;

  watchHistory[entry.animeSlug] = {
    animeSlug: entry.animeSlug,
    animeTitle: entry.animeTitle || "",
    poster: entry.poster || "",
    episodeSlug: entry.episodeSlug,
    episodeTitle: entry.episodeTitle || "",
    positionSec: pos,
    updatedAt: Date.now(),
  };

  saveWatchHistory();
}

// BIKIN KARTU ANIME (dipakai di semua page)
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
    if (!item.slug) return;
    const url = `/anime/detail?slug=${encodeURIComponent(item.slug)}`;
    window.location.href = url;
  });

  return card;
}

// GLOBAL UI
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
