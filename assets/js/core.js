// assets/js/core.js

const BASE_URL = "https://www.sankavollerei.com";
const LS_KEY_FAVORITES = "anikuy_favorites";
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

function bindThemeControls(currentTheme) {
  const radios = document.querySelectorAll('input[name="theme-option"]');
  if (!radios.length) return;
  radios.forEach((radio) => {
    radio.checked = radio.value === currentTheme;
    radio.addEventListener("change", (e) => {
      const value = e.target.value === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
      localStorage.setItem(LS_KEY_THEME, value);
      applyTheme(value);
      if (typeof showToast === "function") {
        showToast("Tema berhasil diubah");
      }
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

// FAVORITES (My List)
function loadFavoritesFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY_FAVORITES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

let favorites = loadFavoritesFromStorage();

function saveFavorites() {
  try {
    localStorage.setItem(LS_KEY_FAVORITES, JSON.stringify(favorites));
  } catch {
    // ignore
  }
}

function isFavorite(slug) {
  return favorites.some((a) => a.slug === slug);
}

function addFavorite(anime) {
  if (!anime || !anime.slug) return;
  if (isFavorite(anime.slug)) return;
  favorites.push(anime);
  saveFavorites();
  showToast("Ditambahkan ke My List");
}

function removeFavorite(slug) {
  favorites = favorites.filter((a) => a.slug !== slug);
  saveFavorites();
  showToast("Dihapus dari My List");
}

function getFavorites() {
  return favorites.slice();
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

  // pindah ke halaman detail
  card.addEventListener("click", () => {
    if (!item.slug) return;
    const url = `/anime/detail?slug=${encodeURIComponent(item.slug)}`;
    window.location.href = url;
  });

  return card;
}

// GLOBAL UI (back button, search, navbar scroll, anti copy)
document.addEventListener("DOMContentLoaded", () => {
  const currentTheme = initThemeFromStorage();
  bindThemeControls(currentTheme);

  const backButton = document.getElementById("backButton");
  const searchButton = document.getElementById("searchButton");
  const pageType = document.body.dataset.page || "";
  const basePages = new Set(["home", "explore", "my-list", "profile"]);

  // tombol back (disembunyiin di base pages)
  if (backButton) {
    backButton.style.visibility = basePages.has(pageType)
      ? "hidden"
      : "visible";

    backButton.addEventListener("click", () => {
      window.history.back();
    });
  }

  // tombol search → halaman /search
  if (searchButton) {
    searchButton.addEventListener("click", () => {
      window.location.href = "/search";
    });
  }

  // navbar hide/show saat scroll
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

  // anti copy / devtools
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
